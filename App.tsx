
import React, { useState, useCallback, useMemo, useRef } from 'react';
import Fretboard from './components/Fretboard';
import TabEditor from './components/TabEditor';
import { TabBlock, TabColumn, TabNote } from './types';
import { SYMBOLS, ICONS, STRING_NAMES, NOTES, SCALES } from './constants';

const INITIAL_COLS = 40;
const HISTORY_LIMIT = 15;

const App: React.FC = () => {
  const [blocks, setBlocks] = useState<TabBlock[]>([
    { id: crypto.randomUUID(), columns: Array.from({ length: INITIAL_COLS }, () => Array(6).fill(null)), cursorPosition: 0, title: "" }
  ]);
  const [activeBlockIndex, setActiveBlockIndex] = useState(0);
  const [lastStringIndex, setLastStringIndex] = useState(0);
  const [selection, setSelection] = useState<[number, number] | null>(null);
  const [clipboard, setClipboard] = useState<TabColumn[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [history, setHistory] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  
  const [tabFontSize, setTabFontSize] = useState(14);
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
    const stateString = JSON.stringify(currentBlocks);
    setHistory(prev => {
      const next = [...prev, stateString];
      if (next.length > HISTORY_LIMIT) return next.slice(1);
      return next;
    });
    setRedoStack([]); 
  }, []);

  const handleUndo = () => {
    if (history.length > 0) {
      const currentState = JSON.stringify(blocks);
      const prevStateString = history[history.length - 1];
      setRedoStack(prev => [...prev, currentState]);
      const restored = JSON.parse(prevStateString);
      setBlocks(restored);
      setHistory(history.slice(0, -1));
      if (activeBlockIndex >= restored.length) {
        setActiveBlockIndex(Math.max(0, restored.length - 1));
      }
    }
  };

  const handleRedo = () => {
    if (redoStack.length > 0) {
      const currentState = JSON.stringify(blocks);
      const nextStateString = redoStack[redoStack.length - 1];
      setHistory(prev => [...prev, currentState]);
      setBlocks(JSON.parse(nextStateString));
      setRedoStack(redoStack.slice(0, -1));
    }
  };

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
    
    // Medição aproximada de caractere mono para fonte 14px (~8.4px por caractere)
    const charWidth = 8.41; 
    const targetIdx = Math.floor(clickX / charWidth);
    
    const currentTitle = blocks[index].title || "";
    if (currentTitle.length < targetIdx) {
      // Preenche com espaços até onde o usuário clicou
      const paddedTitle = currentTitle.padEnd(targetIdx, " ");
      handleTitleChange(index, paddedTitle);
      
      // Força o cursor para o final após a renderização
      setTimeout(() => {
        input.setSelectionRange(targetIdx, targetIdx);
      }, 0);
    }
  };

  const addNote = useCallback((stringIndex: number, fretValue: string, autoAdvance = true) => {
    setLastStringIndex(stringIndex);
    updateActiveBlock(block => {
      const newCols = [...block.columns];
      if (block.cursorPosition >= newCols.length - 1) {
        newCols.push(Array(6).fill(null));
      }
      const newCol = [...newCols[block.cursorPosition]];
      newCol[stringIndex] = { fret: fretValue };
      newCols[block.cursorPosition] = newCol;
      return { ...block, columns: newCols, cursorPosition: autoAdvance ? block.cursorPosition + 1 : block.cursorPosition };
    });
  }, [updateActiveBlock]);

  const transpose = (delta: number) => {
    let canTranspose = true;
    blocks.forEach(block => {
      block.columns.forEach(col => {
        col.forEach(note => {
          if (note && !isNaN(parseInt(note.fret))) {
            if (parseInt(note.fret) + delta < 0) canTranspose = false;
          }
        });
      });
    });

    if (!canTranspose) {
      alert("A transposição não pode ser realizada abaixo da corda solta.");
      return;
    }

    saveState(blocks);
    setBlocks(blocks.map(block => ({
      ...block,
      columns: block.columns.map(col => col.map(note => {
        if (note && !isNaN(parseInt(note.fret))) {
          return { ...note, fret: (parseInt(note.fret) + delta).toString() };
        }
        return note;
      }))
    })));
  };

  const insertBarLine = () => {
    updateActiveBlock(block => {
      const newCols = [...block.columns];
      if (block.cursorPosition >= newCols.length - 1) newCols.push(Array(6).fill(null));
      newCols[block.cursorPosition] = Array(6).fill({ fret: '|' });
      return { ...block, columns: newCols, cursorPosition: block.cursorPosition + 1 };
    });
  };

  const insertSpace = () => {
    updateActiveBlock(block => {
      const newCols = [...block.columns];
      const insertPos = selection ? selection[0] : block.cursorPosition;
      newCols.splice(insertPos, 0, Array(6).fill(null));
      return { ...block, columns: newCols, cursorPosition: selection ? block.cursorPosition : block.cursorPosition + 1 };
    });
  };

  const handleCopy = () => {
    if (!selection) return;
    const block = blocks[activeBlockIndex];
    const range = block.columns.slice(selection[0], selection[1] + 1);
    setClipboard(JSON.parse(JSON.stringify(range)));
  };

  const handleCut = () => {
    if (!selection) return;
    handleCopy();
    updateActiveBlock(block => {
      const newCols = [...block.columns];
      for (let i = selection[0]; i <= selection[1]; i++) {
        newCols[i] = Array(6).fill(null);
      }
      return { ...block, columns: newCols };
    });
    setSelection(null);
  };

  const handlePaste = () => {
    if (!clipboard) return;
    updateActiveBlock(block => {
      const newCols = [...block.columns];
      newCols.splice(block.cursorPosition, 0, ...clipboard);
      return { ...block, columns: newCols, cursorPosition: block.cursorPosition + clipboard.length };
    });
    setSelection(null);
  };

  const addBlockBelow = () => {
    saveState(blocks);
    const newBlock: TabBlock = {
      id: crypto.randomUUID(),
      columns: Array.from({ length: INITIAL_COLS }, () => Array(6).fill(null)),
      cursorPosition: 0,
      title: ""
    };
    const nextBlocks = [...blocks];
    nextBlocks.splice(activeBlockIndex + 1, 0, newBlock);
    setBlocks(nextBlocks);
    setActiveBlockIndex(activeBlockIndex + 1);
  };

  const duplicateBlock = (index: number) => {
    saveState(blocks);
    const blockToCopy = blocks[index];
    const newBlock: TabBlock = {
      ...blockToCopy,
      id: crypto.randomUUID(),
      columns: JSON.parse(JSON.stringify(blockToCopy.columns)),
      title: blockToCopy.title ? `${blockToCopy.title} (Cópia)` : ""
    };
    const nextBlocks = [...blocks];
    nextBlocks.splice(index + 1, 0, newBlock);
    setBlocks(nextBlocks);
    setActiveBlockIndex(index + 1);
  };

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === blocks.length - 1)) return;
    saveState(blocks);
    const nextBlocks = [...blocks];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [nextBlocks[index], nextBlocks[targetIndex]] = [nextBlocks[targetIndex], nextBlocks[index]];
    setBlocks(nextBlocks);
    setActiveBlockIndex(targetIndex);
  };

  const removeSelectedBlock = () => {
    if (blocks.length <= 1) return;
    if (window.confirm('Excluir esta parte selecionada da tablatura?')) {
      saveState(blocks);
      const nextBlocks = blocks.filter((_, i) => i !== activeBlockIndex);
      setBlocks(nextBlocks);
      setActiveBlockIndex(Math.max(0, activeBlockIndex - 1));
    }
  };

  const handleClearAll = () => {
    if (window.confirm('Limpar todas as tablaturas? Isso removerá todas as partes.')) {
      saveState(blocks);
      setBlocks([{ id: crypto.randomUUID(), columns: Array.from({ length: INITIAL_COLS }, () => Array(6).fill(null)), cursorPosition: 0, title: "" }]);
      setActiveBlockIndex(0);
      setSelection(null);
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
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.startsWith('Parte')) { 
          stringsFound = 0; 
          currentPartCols = []; 
          currentTitle = "";
        }
        if (line.startsWith('Título:')) {
          currentTitle = line.replace('Título:', '').trim();
        }
        const match = line.match(/^([eBGDAE])\s\|\s*(.*)$/);
        if (match) {
          const stringIdx = STRING_NAMES.indexOf(match[1] as any);
          const tabContent = match[2];
          const numCols = Math.floor(tabContent.length / 2);
          if (currentPartCols.length === 0) currentPartCols = Array.from({ length: numCols }, () => Array(6).fill(null));
          for (let c = 0; c < numCols; c++) {
            let chunk = tabContent.substring(c * 2, c * 2 + 2).trim().replace(/-/g, '');
            if (chunk !== "") currentPartCols[c][stringIdx] = { fret: chunk };
          }
          stringsFound++;
          if (stringsFound === 6) newBlocks.push({ id: crypto.randomUUID(), columns: currentPartCols, cursorPosition: 0, title: currentTitle });
        }
      }
      if (newBlocks.length > 0) { saveState(blocks); setBlocks(newBlocks); setActiveBlockIndex(0); }
      else alert("Arquivo inválido.");
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const exportTab = () => {
    let output = "Hunter Tab Maker - Composição\n\n";
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
    element.href = URL.createObjectURL(file);
    element.download = "hunter_tab.txt";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="min-h-screen flex flex-col font-sans p-4 md:p-8 bg-background">
      <header className="max-w-7xl mx-auto w-full mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-contrast flex items-center gap-2">
            <span className="bg-[#bf616a] text-background px-2 py-1 rounded">Hunter</span> Tab Maker 🪶
          </h1>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-bgDark rounded-lg p-1 border border-foreground/20 mr-2">
            <button onClick={() => transpose(1)} className="px-3 py-1 bg-background hover:bg-contrast hover:text-background text-contrast font-bold rounded transition-colors border border-foreground/10">+</button>
            <span className="px-1 text-[10px] text-foreground font-bold uppercase">Tom</span>
            <button onClick={() => transpose(-1)} className="px-3 py-1 bg-background hover:bg-contrast hover:text-background text-contrast font-bold rounded transition-colors border border-foreground/10">-</button>
          </div>

          <div className="flex items-center gap-1 bg-bgDark rounded-lg p-1 border border-foreground/20 mr-2">
            <button onClick={() => setTabFontSize(s => Math.max(10, s - 2))} className="p-1.5 bg-background hover:bg-contrast hover:text-background rounded text-contrast border border-foreground/10"><ICONS.Minimize /></button>
            <span className="px-1 text-[10px] text-foreground font-bold uppercase">Fonte</span>
            <button onClick={() => setTabFontSize(s => Math.min(32, s + 2))} className="p-1.5 bg-background hover:bg-contrast hover:text-background rounded text-contrast border border-foreground/10"><ICONS.Maximize /></button>
          </div>

          <div className="flex items-center gap-1 bg-bgDark p-1 rounded-lg border border-foreground/20 mr-2">
            <button onClick={handleUndo} disabled={history.length === 0} className="p-1.5 bg-background hover:bg-contrast hover:text-background disabled:opacity-20 text-contrast rounded transition-colors border border-foreground/10"><ICONS.Undo /></button>
            <button onClick={handleRedo} disabled={redoStack.length === 0} className="p-1.5 bg-background hover:bg-contrast hover:text-background disabled:opacity-20 text-contrast rounded transition-colors border border-foreground/10"><ICONS.Redo /></button>
          </div>

          <input type="file" ref={fileInputRef} onChange={handleImport} accept=".txt" className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-strings hover:bg-contrast hover:text-background text-background rounded-lg transition-colors font-bold shadow-md">Importar</button>
          <button onClick={exportTab} className="flex items-center gap-2 px-4 py-2 bg-definitions hover:bg-contrast hover:text-background text-background rounded-lg transition-colors font-bold shadow-lg">Exportar</button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto w-full space-y-8 flex-1 pb-20">
        <section className="bg-bgDark p-4 rounded-xl border border-foreground/10 flex flex-wrap items-end gap-6 shadow-sm">
           <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider">Tom de Referência</label>
              <div className="flex flex-wrap gap-1">
                {NOTES.map((note, idx) => (
                  <button key={note} onClick={() => setSelectedKey(idx)} className={`px-3 py-1.5 text-xs font-bold rounded transition-all border ${selectedKey === idx ? 'bg-contrast text-background border-contrast' : 'bg-background text-foreground border-foreground/20 hover:border-contrast'}`}>{note}</button>
                ))}
              </div>
           </div>
           <div className="flex flex-col gap-2 flex-1 min-w-[200px]">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider">Escala</label>
              <select className="bg-background text-foreground border border-foreground/20 rounded-lg px-3 py-1.5 outline-none focus:border-contrast text-sm h-[32px]" value={selectedScaleIndex} onChange={(e) => setSelectedScaleIndex(parseInt(e.target.value))}>
                <option value="-1">Nenhuma Selecionada</option>
                {SCALES.map((scale, idx) => <option key={scale.name} value={idx}>{scale.name}</option>)}
              </select>
           </div>
           <button onClick={handleClearAll} className="px-4 h-[32px] bg-[#bf616a]/10 hover:bg-[#bf616a] hover:text-background text-[#bf616a] rounded-lg transition-colors font-bold border border-[#bf616a]/30 text-xs flex items-center">Limpar Tudo</button>
        </section>

        <section className="space-y-6">
          <div className="flex items-center justify-between mb-2">
             <span className="text-sm font-bold text-foreground uppercase tracking-widest">Partes da Composição</span>
             <button onClick={removeSelectedBlock} className="flex items-center gap-2 px-3 py-1 bg-[#bf616a] hover:bg-contrast hover:text-background text-background rounded text-xs font-bold transition-all shadow-md">
               <ICONS.Delete width="14" height="14" /> Excluir Parte Selecionada
             </button>
          </div>
          
          <div className="space-y-4">
            {blocks.map((block, index) => (
              <div 
                key={block.id} 
                className={`p-4 rounded-xl transition-all cursor-pointer ${activeBlockIndex === index ? 'bg-bgDark shadow-2xl' : 'bg-bgDark/40 hover:bg-bgDark/60 shadow-sm'}`} 
                onClick={() => setActiveBlockIndex(index)}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-tighter ${activeBlockIndex === index ? 'bg-contrast text-background' : 'bg-background text-foreground'}`}>P{index + 1}</span>
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                       <button onClick={() => moveBlock(index, 'up')} title="Mover para Cima" className="p-1 bg-background hover:bg-contrast rounded text-contrast disabled:opacity-10 border border-foreground/10" disabled={index === 0}><ICONS.ArrowUp width="14" height="14" /></button>
                       <button onClick={() => moveBlock(index, 'down')} title="Mover para Baixo" className="p-1 bg-background hover:bg-contrast rounded text-contrast disabled:opacity-10 border border-foreground/10" disabled={index === blocks.length - 1}><ICONS.ArrowDown width="14" height="14" /></button>
                       <button onClick={() => duplicateBlock(index)} title="Duplicar Parte" className="p-1 bg-background hover:bg-contrast rounded text-contrast border border-foreground/10 ml-2"><ICONS.Duplicate width="14" height="14" /></button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                     <button onClick={() => updateActiveBlock(b => ({...b, cursorPosition: Math.max(0, b.cursorPosition - 1)}))} className="p-1 bg-background hover:bg-contrast rounded text-contrast border border-foreground/10"><ICONS.ChevronLeft width="16" height="16" /></button>
                     <span className="font-mono text-contrast text-[11px] font-bold w-12 text-center">COL {block.cursorPosition + 1}</span>
                     <button onClick={() => updateActiveBlock(b => ({...b, cursorPosition: b.cursorPosition + 1}))} className="p-1 bg-background hover:bg-contrast rounded text-contrast border border-foreground/10"><ICONS.ChevronRight width="16" height="16" /></button>
                  </div>
                </div>

                <div className="mb-2 px-8" onClick={e => e.stopPropagation()}>
                  <input 
                    type="text" 
                    placeholder="Clique aqui para inserir texto explicativo..." 
                    value={block.title || ""} 
                    onMouseDown={(e) => handleTitleClick(e, index)}
                    onChange={(e) => handleTitleChange(index, e.target.value)}
                    className="w-full bg-transparent border-b border-foreground/10 focus:border-contrast/30 text-contrast text-sm font-bold py-1 outline-none placeholder:text-foreground/30 placeholder:font-normal font-mono"
                  />
                </div>

                <TabEditor 
                  columns={block.columns} 
                  cursorPosition={block.cursorPosition} 
                  selection={activeBlockIndex === index ? selection : null}
                  onSelectionChange={setSelection}
                  onCopy={handleCopy}
                  onCut={handleCut}
                  onPaste={handlePaste}
                  onCursorMove={(pos) => { setActiveBlockIndex(index); updateActiveBlock(b => ({...b, cursorPosition: pos})); }} 
                  fontSize={tabFontSize} 
                />
              </div>
            ))}
          </div>
          
          <button onClick={addBlockBelow} className="w-full py-3 border-2 border-dashed border-contrast/30 hover:bg-contrast/10 text-contrast hover:text-foreground rounded-xl flex items-center justify-center gap-2 transition-all font-bold text-sm">
            <ICONS.Plus /> Adicionar Nova Parte
          </button>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2 px-2">
            <span className="text-sm font-bold text-foreground uppercase tracking-wider">Braço do Instrumento</span>
            <div className="h-[1px] w-24 bg-foreground/20" />
            {selectedScaleIndex !== -1 && (
              <span className="text-[10px] bg-comment/20 text-comment px-2 py-0.5 rounded-full font-bold">
                Escala Ativa: {NOTES[selectedKey]} {SCALES[selectedScaleIndex].name}
              </span>
            )}
          </div>
          <Fretboard onFretClick={(s, f) => addNote(s, f.toString())} highlightedNotes={highlightedNotes} />
        </section>

        <section className="space-y-4 bg-bgDark p-6 rounded-xl border border-foreground/10 shadow-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col gap-3">
              <span className="text-xs font-bold text-foreground uppercase tracking-wider">Técnicas</span>
              <div className="flex flex-wrap gap-2">
                {SYMBOLS.map((s) => (
                  <button key={s.label} onClick={() => addNote(lastStringIndex, s.label)} className="w-10 h-10 flex flex-col items-center justify-center bg-background hover:bg-contrast hover:text-background text-foreground font-bold rounded-lg transition-all border border-foreground/10 shadow-sm">
                    <span className="text-lg">{s.label}</span>
                    <span className="text-[8px] opacity-50 uppercase">{STRING_NAMES[lastStringIndex]}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <span className="text-xs font-bold text-foreground uppercase tracking-wider">Estrutura</span>
              <div className="flex gap-2">
                <button onClick={insertBarLine} className="w-10 h-10 flex items-center justify-center bg-background hover:bg-contrast hover:text-background text-foreground font-bold rounded-lg border border-foreground/10 transition-all shadow-sm">
                  <span className="text-xl">|</span>
                </button>
                <button onClick={insertSpace} title="Mover toda essa parte pra frente (Inserir Espaço)" className="w-10 h-10 flex items-center justify-center bg-background hover:bg-contrast hover:text-background text-foreground font-bold rounded-lg border border-foreground/10 transition-all shadow-sm">
                  <ICONS.Space width="20" height="20" />
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-3">
               <span className="text-xs font-bold text-foreground uppercase tracking-wider">Editor Rápido</span>
               <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => addNote(lastStringIndex, '-', false)} className="py-2 bg-background hover:bg-[#bf616a] hover:text-background text-foreground text-xs font-bold rounded border border-foreground/10 transition-all">Limpar Nota</button>
                  <button onClick={() => updateActiveBlock(b => ({...b, cursorPosition: b.cursorPosition + 1}))} className="py-2 bg-background hover:bg-contrast hover:text-background text-foreground text-xs font-bold rounded border border-foreground/10 transition-all">Avançar Cursor</button>
               </div>
               <p className="text-[10px] text-foreground/60 italic uppercase tracking-tighter">PARTE {activeBlockIndex + 1}, CORDA {STRING_NAMES[lastStringIndex]}.</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="max-w-7xl mx-auto w-full mt-auto pt-8 border-t border-foreground/10 text-center text-foreground/40 text-[10px] uppercase tracking-widest pb-8">
        <p>&copy; 2024 Hunter Tab Maker • Shades of Purple 🪶</p>
      </footer>
    </div>
  );
};

export default App;
