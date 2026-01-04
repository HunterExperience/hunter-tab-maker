
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import Fretboard from './components/Fretboard';
import TabEditor from './components/TabEditor';
import { TabBlock, TabColumn, TabNote } from './types';
import { SYMBOLS, ICONS, STRING_NAMES, NOTES, SCALES } from './constants';

const INITIAL_COLS = 60;
const HISTORY_LIMIT = 20;

const App: React.FC = () => {
  const [songInfo, setSongInfo] = useState({ title: "", artist: "" });
  const [blocks, setBlocks] = useState<TabBlock[]>([
    { id: crypto.randomUUID(), columns: Array.from({ length: INITIAL_COLS }, () => Array(6).fill(null)), cursorPosition: 0, title: "" }
  ]);
  const [activeBlockIndex, setActiveBlockIndex] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [lastStringIndex, setLastStringIndex] = useState(0);
  const [selection, setSelection] = useState<[number, number] | null>(null);
  const [isFretboardVisible, setIsFretboardVisible] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  
  const [tabFontSize, setTabFontSize] = useState(12);
  const [selectedKey, setSelectedKey] = useState(4); 
  const [selectedScaleIndex, setSelectedScaleIndex] = useState(-1);

  const highlightedNotes = useMemo(() => {
    if (selectedScaleIndex === -1) return null;
    const scale = SCALES[selectedScaleIndex];
    const notesSet = new Set<number>();
    scale.intervals.forEach(interval => {
      notesSet.add((selectedKey + interval) % 12);
    });
    return notesSet;
  }, [selectedKey, selectedScaleIndex]);

  const saveState = useCallback((currentBlocks: TabBlock[]) => {
    const stateString = JSON.stringify({ blocks: currentBlocks, songInfo });
    setHistory(prev => {
      const next = [...prev, stateString];
      if (next.length > HISTORY_LIMIT) return next.slice(1);
      return next;
    });
    setRedoStack([]); 
  }, [songInfo]);

  const updateActiveBlock = useCallback((updater: (block: TabBlock) => TabBlock) => {
    saveState(blocks);
    setBlocks(prev => {
      const next = [...prev];
      next[activeBlockIndex] = updater(next[activeBlockIndex]);
      return next;
    });
  }, [blocks, activeBlockIndex, saveState]);

  const handleTitleChange = (index: number, newTitle: string) => {
    setBlocks(prev => {
      const next = [...prev];
      next[index] = { ...next[index], title: newTitle };
      return next;
    });
  };

  const handleTitleClick = (e: React.MouseEvent<HTMLInputElement>, index: number) => {
    const input = e.currentTarget;
    const rect = input.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const charWidth = (tabFontSize * 0.6); 
    const targetIdx = Math.floor(clickX / charWidth);
    const currentTitle = blocks[index].title || "";
    if (currentTitle.length < targetIdx) {
      const paddedTitle = currentTitle.padEnd(targetIdx, " ");
      handleTitleChange(index, paddedTitle);
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(targetIdx, targetIdx);
      }, 0);
    }
  };

  const addNote = useCallback((stringIndex: number, fretValue: string, isFromFretboard: boolean = false) => {
    setLastStringIndex(stringIndex);
    updateActiveBlock(block => {
      const newCols = [...block.columns];
      const colIdx = block.cursorPosition;
      if (colIdx >= newCols.length) {
        newCols.push(Array(6).fill(null));
      }
      const newCol = [...newCols[colIdx]];
      const currentNote = newCol[stringIndex];
      
      let finalValue = fretValue;
      let shouldAdvance = isFromFretboard;

      if (!isFromFretboard) {
        if (currentNote && !isNaN(Number(currentNote.fret)) && !isNaN(Number(fretValue))) {
           const combined = currentNote.fret + fretValue;
           if (Number(combined) <= 24) {
             finalValue = combined;
             shouldAdvance = true; 
           } else {
             finalValue = fretValue;
           }
        }
      }

      newCol[stringIndex] = { fret: finalValue };
      newCols[colIdx] = newCol;

      return { 
        ...block, 
        columns: newCols, 
        cursorPosition: shouldAdvance ? block.cursorPosition + 1 : block.cursorPosition 
      };
    });
  }, [updateActiveBlock]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') return;

      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        addNote(lastStringIndex, e.key, false);
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        updateActiveBlock(block => {
          const newCols = [...block.columns];
          const newCol = [...newCols[block.cursorPosition]];
          newCol[lastStringIndex] = null;
          newCols[block.cursorPosition] = newCol;
          return { ...block, columns: newCols };
        });
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        updateActiveBlock(b => ({...b, cursorPosition: Math.max(0, b.cursorPosition - 1)}));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        updateActiveBlock(b => ({...b, cursorPosition: b.cursorPosition + 1}));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setLastStringIndex(s => Math.max(0, s - 1));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setLastStringIndex(s => Math.min(5, s + 1));
      } else if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lastStringIndex, activeBlockIndex, blocks, addNote, updateActiveBlock]);

  const handleUndo = () => {
    if (history.length > 0) {
      const currentState = JSON.stringify({ blocks, songInfo });
      const prevStateString = history[history.length - 1];
      const prevState = JSON.parse(prevStateString);
      setRedoStack(prev => [...prev, currentState]);
      setBlocks(prevState.blocks);
      setSongInfo(prevState.songInfo);
      setHistory(history.slice(0, -1));
    }
  };

  const handleRedo = () => {
    if (redoStack.length > 0) {
      const currentState = JSON.stringify({ blocks, songInfo });
      const nextStateString = redoStack[redoStack.length - 1];
      const nextState = JSON.parse(nextStateString);
      setHistory(prev => [...prev, currentState]);
      setBlocks(nextState.blocks);
      setSongInfo(nextState.songInfo);
      setRedoStack(redoStack.slice(0, -1));
    }
  };

  const transpose = (delta: number) => {
    saveState(blocks);
    setBlocks(blocks.map(block => ({
      ...block,
      columns: block.columns.map(col => col.map(note => {
        if (note && !isNaN(parseInt(note.fret))) {
          const newVal = parseInt(note.fret) + delta;
          return newVal >= 0 && newVal <= 24 ? { ...note, fret: newVal.toString() } : note;
        }
        return note;
      }))
    })));
  };

  const insertBarLine = () => {
    updateActiveBlock(block => {
      const newCols = [...block.columns];
      newCols[block.cursorPosition] = Array(6).fill({ fret: '|' });
      return { ...block, columns: newCols, cursorPosition: block.cursorPosition + 1 };
    });
  };

  const handleClearAll = () => {
    if (window.confirm('Limpar todas as tablaturas?')) {
      saveState(blocks);
      setBlocks([{ id: crypto.randomUUID(), columns: Array.from({ length: INITIAL_COLS }, () => Array(6).fill(null)), cursorPosition: 0, title: "" }]);
      setSongInfo({ title: "", artist: "" });
      setActiveBlockIndex(0);
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const lines = content.split('\n');
      const newBlocks: TabBlock[] = [];
      let currentPartCols: TabColumn[] = [];
      let currentTitle = "";
      let stringsFound = 0;
      let importedSongInfo = { title: "", artist: "" };
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.startsWith('Título Música:')) {
          importedSongInfo.title = line.replace('Título Música:', '').trim();
          continue;
        }
        if (line.startsWith('Artista:')) {
          importedSongInfo.artist = line.replace('Artista:', '').trim();
          continue;
        }
        if (line.startsWith('Parte')) { 
          stringsFound = 0; 
          currentPartCols = []; 
          continue;
        }
        if (line.startsWith('Título:')) {
          currentTitle = line.replace('Título:', '').trim();
          continue;
        }
        const match = line.match(/^([eBGDAE])\s\|\s*(.*)$/);
        if (match) {
          const stringIdx = STRING_NAMES.indexOf(match[1] as any);
          const tabContent = match[2];
          // Cada nota ocupa 2 caracteres (número ou símbolo + traço/espaço)
          const numCols = Math.floor(tabContent.length / 2);
          if (currentPartCols.length === 0) {
            currentPartCols = Array.from({ length: numCols }, () => Array(6).fill(null));
          }
          for (let c = 0; c < numCols; c++) {
            let chunk = tabContent.substring(c * 2, c * 2 + 2).trim().replace(/-/g, '');
            if (chunk !== "") {
              currentPartCols[c][stringIdx] = { fret: chunk };
            }
          }
          stringsFound++;
          if (stringsFound === 6) {
            newBlocks.push({ 
              id: crypto.randomUUID(), 
              columns: currentPartCols, 
              cursorPosition: 0, 
              title: currentTitle 
            });
            currentTitle = "";
          }
        }
      }
      if (newBlocks.length > 0) { 
        saveState(blocks); 
        setBlocks(newBlocks); 
        setSongInfo(importedSongInfo);
        setActiveBlockIndex(0); 
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const exportTab = () => {
    let output = "Hunter Tab Maker - Composição\n";
    if (songInfo.title) output += `Título Música: ${songInfo.title}\n`;
    if (songInfo.artist) output += `Artista: ${songInfo.artist}\n`;
    output += "\n";
    
    blocks.forEach((block, bIdx) => {
      output += `Parte ${bIdx + 1}\n`;
      if (block.title) output += `Título: ${block.title}\n`;
      for (let s = 0; s < 6; s++) {
        let line = `${STRING_NAMES[s]} |`;
        block.columns.forEach((col) => {
          const note = col[s];
          line += note ? note.fret.padEnd(2, '-') : '--';
        });
        output += line + "\n";
      }
      output += "\n";
    });

    const element = document.createElement("a");
    const file = new Blob([output], { type: 'text/plain' });
    
    // Define o nome do arquivo baseado no título da música, ou fallback se vazio
    const sanitizedTitle = songInfo.title.trim().replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const fileName = sanitizedTitle ? `${sanitizedTitle}.txt` : "hunter_tab.txt";
    
    element.href = URL.createObjectURL(file);
    element.download = fileName;
    element.click();
  };

  return (
    <div className="min-h-screen flex flex-col font-sans p-4 md:p-8 bg-background pb-40">
      <header className="max-w-7xl mx-auto w-full mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-contrast flex items-center gap-2">
          <span className="bg-[#bf616a] text-background px-2 py-1 rounded">Hunter</span> Tab Maker 🪶
        </h1>
        
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-bgDark rounded-lg p-1 border border-foreground/20">
            <button onClick={() => transpose(1)} className="px-3 py-1 bg-background hover:bg-contrast hover:text-background text-contrast font-bold rounded border border-foreground/10">+</button>
            <span className="px-1 text-[10px] text-foreground font-bold uppercase">Tom</span>
            <button onClick={() => transpose(-1)} className="px-3 py-1 bg-background hover:bg-contrast hover:text-background text-contrast font-bold rounded border border-foreground/10">-</button>
          </div>

          <div className="flex items-center gap-1 bg-bgDark rounded-lg p-1 border border-foreground/20">
            <button onClick={() => setTabFontSize(s => Math.max(8, s - 1))} className="p-1.5 bg-background hover:bg-contrast rounded text-contrast"><ICONS.Minimize /></button>
            <span className="px-1 text-[10px] text-foreground font-bold uppercase">Fonte</span>
            <button onClick={() => setTabFontSize(s => Math.min(24, s + 1))} className="p-1.5 bg-background hover:bg-contrast rounded text-contrast"><ICONS.Maximize /></button>
          </div>

          <div className="flex items-center gap-1 bg-bgDark p-1 rounded-lg border border-foreground/20">
            <button onClick={handleUndo} disabled={history.length === 0} className="p-1.5 bg-background hover:bg-contrast disabled:opacity-20 text-contrast rounded"><ICONS.Undo /></button>
            <button onClick={handleRedo} disabled={redoStack.length === 0} className="p-1.5 bg-background hover:bg-contrast disabled:opacity-20 text-contrast rounded"><ICONS.Redo /></button>
          </div>

          <input type="file" ref={fileInputRef} onChange={handleImport} accept=".txt" className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-strings hover:bg-contrast hover:text-background text-background rounded-lg transition-colors font-bold shadow-md">Importar</button>
          <button onClick={exportTab} className="px-4 py-2 bg-definitions hover:bg-contrast hover:text-background text-background rounded-lg transition-colors font-bold shadow-lg">Exportar</button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto w-full space-y-4 flex-1">
        <section className="bg-bgDark p-5 rounded-xl border border-foreground/10 flex flex-wrap items-center gap-8 shadow-sm">
           <div className="flex items-center gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-foreground/50 uppercase">TOM</label>
                <select className="bg-background text-contrast border border-foreground/20 rounded px-2 py-1 outline-none text-xs font-bold h-[30px]" value={selectedKey} onChange={(e) => setSelectedKey(parseInt(e.target.value))}>
                  {NOTES.map((note, idx) => <option key={note} value={idx}>{note}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-foreground/50 uppercase">Escala</label>
                <select className="bg-background text-contrast border border-foreground/20 rounded px-2 py-1 outline-none text-xs font-bold h-[30px]" value={selectedScaleIndex} onChange={(e) => setSelectedScaleIndex(parseInt(e.target.value))}>
                  <option value="-1">Nenhuma</option>
                  {SCALES.map((scale, idx) => <option key={scale.name} value={idx}>{scale.name}</option>)}
                </select>
              </div>
           </div>

           <div className="h-10 w-[1px] bg-foreground/10 hidden md:block" />

           <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-foreground/50 uppercase">Técnicas</label>
              <div className="flex gap-1.5">
                {SYMBOLS.map(s => (
                  <button key={s.label} onClick={() => addNote(lastStringIndex, s.label, true)} className="w-8 h-8 flex items-center justify-center bg-background hover:bg-contrast hover:text-background text-foreground rounded border border-foreground/10 transition-all font-bold text-sm">{s.label}</button>
                ))}
                <button onClick={insertBarLine} className="w-8 h-8 flex items-center justify-center bg-background hover:bg-contrast hover:text-background text-foreground rounded border border-foreground/10 font-bold text-sm">|</button>
              </div>
           </div>

           <div className="ml-auto">
              <button onClick={handleClearAll} className="px-4 py-2 bg-[#bf616a]/10 hover:bg-[#bf616a] hover:text-background text-[#bf616a] rounded transition-colors font-bold border border-[#bf616a]/30 text-[10px] uppercase">Limpar Tudo</button>
           </div>
        </section>

        {/* Global Song Info Section */}
        <section className="px-8 space-y-4">
           <div className="flex flex-col md:flex-row gap-8">
              <input 
                type="text" 
                placeholder="Título da Música..." 
                value={songInfo.title}
                onChange={(e) => setSongInfo(prev => ({ ...prev, title: e.target.value }))}
                style={{ fontSize: `${tabFontSize}px` }}
                className="flex-1 bg-transparent border-b border-foreground/10 focus:border-contrast/30 text-contrast font-bold py-1 outline-none placeholder:text-foreground/20 font-mono"
              />
              <input 
                type="text" 
                placeholder="Artista / Outras informações..." 
                value={songInfo.artist}
                onChange={(e) => setSongInfo(prev => ({ ...prev, artist: e.target.value }))}
                style={{ fontSize: `${tabFontSize}px` }}
                className="flex-1 bg-transparent border-b border-foreground/10 focus:border-contrast/30 text-contrast font-bold py-1 outline-none placeholder:text-foreground/20 font-mono"
              />
           </div>
        </section>

        <section className="space-y-6">
          {blocks.map((block, index) => {
            const isHovered = hoveredIndex === index;
            return (
              <div 
                key={block.id} 
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                className={`p-4 rounded-xl transition-all ${isHovered ? 'bg-bgDark ring-1 ring-contrast/20 shadow-xl' : (activeBlockIndex === index ? 'bg-bgDark/60' : 'bg-bgDark/40')}`}
                onClick={() => setActiveBlockIndex(index)}
              >
                <div className="mb-4 px-8 flex items-center gap-4">
                    <input 
                      type="text" 
                      placeholder="Clique em qualquer lugar para inserir texto..." 
                      value={block.title || ""} 
                      onMouseDown={(e) => handleTitleClick(e, index)}
                      onChange={(e) => handleTitleChange(index, e.target.value)}
                      style={{ fontSize: `${tabFontSize}px` }}
                      className="flex-1 bg-transparent border-b border-foreground/10 focus:border-contrast/30 text-contrast font-bold py-1 outline-none placeholder:text-foreground/30 placeholder:font-normal font-mono"
                    />
                    <button onClick={(e) => {
                      e.stopPropagation();
                      const next = [...blocks];
                      next.splice(index + 1, 0, { id: crypto.randomUUID(), columns: Array.from({ length: INITIAL_COLS }, () => Array(6).fill(null)), cursorPosition: 0, title: "" });
                      setBlocks(next);
                      setActiveBlockIndex(index + 1);
                    }} title="Nova Parte" className="p-1.5 bg-background hover:bg-contrast rounded text-contrast flex-shrink-0 transition-colors">
                      <ICONS.Plus width="16" height="16" />
                    </button>
                </div>

                <TabEditor 
                  columns={block.columns} 
                  cursorPosition={block.cursorPosition} 
                  activeStringIndex={lastStringIndex}
                  selection={activeBlockIndex === index ? selection : null}
                  onSelectionChange={setSelection}
                  onCursorMove={(pos) => updateActiveBlock(b => ({...b, cursorPosition: pos}))} 
                  onStringSelect={setLastStringIndex}
                  fontSize={tabFontSize} 
                  onCopy={() => {}}
                  onCut={() => {}}
                  onPaste={() => {}}
                  isHovered={isHovered}
                />
              </div>
            );
          })}
        </section>
      </main>

      {isFretboardVisible && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-full max-w-6xl px-4 animate-in slide-in-from-bottom-10 fade-in duration-300">
           <div className="bg-bgDark/90 backdrop-blur-xl p-2 rounded-2xl border border-contrast/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
              <div className="flex justify-end mb-1 px-2">
                 <button onClick={() => setIsFretboardVisible(false)} className="text-foreground/40 hover:text-contrast transition-colors"><ICONS.Minimize width="12" height="12" /></button>
              </div>
              <Fretboard onFretClick={(s, f) => addNote(s, f.toString(), true)} highlightedNotes={highlightedNotes} />
           </div>
        </div>
      )}

      <button 
        onClick={() => setIsFretboardVisible(!isFretboardVisible)}
        className={`fixed bottom-8 right-8 z-[110] p-4 rounded-full shadow-2xl transition-all transform hover:scale-110 active:scale-95 ${isFretboardVisible ? 'bg-contrast text-background' : 'bg-highlight text-background'}`}
      >
        <span className="font-bold flex items-center gap-2">
          {isFretboardVisible ? <ICONS.Minimize /> : <ICONS.Maximize />}
          <span className="text-xs uppercase hidden md:inline">{isFretboardVisible ? 'Ocultar' : 'Braço'}</span>
        </span>
      </button>

      <footer className="max-w-7xl mx-auto w-full mt-auto pt-8 text-center text-foreground/20 text-[9px] uppercase tracking-[0.2em]">
        <p>Hunter Tab Maker • 2024</p>
      </footer>
    </div>
  );
};

export default App;
