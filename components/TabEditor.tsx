
import React, { useRef, useEffect, useState } from 'react';
import { TabColumn } from '../types';
import { STRING_NAMES, NUM_STRINGS, ICONS } from '../constants';

interface TabEditorProps {
  columns: TabColumn[];
  cursorPosition: number;
  selection: [number, number] | null;
  onCursorMove: (pos: number) => void;
  onSelectionChange: (sel: [number, number] | null) => void;
  onCopy: () => void;
  onCut: () => void;
  onPaste: () => void;
  fontSize: number;
}

const TabEditor: React.FC<TabEditorProps> = ({ 
  columns, 
  cursorPosition, 
  selection, 
  onCursorMove, 
  onSelectionChange,
  onCopy,
  onCut,
  onPaste,
  fontSize 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragStart, setDragStart] = useState<number | null>(null);

  useEffect(() => {
    if (containerRef.current) {
      const activeCol = containerRef.current.querySelector(`[data-col-idx="${cursorPosition}"]`);
      if (activeCol) activeCol.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [cursorPosition]);

  const handleMouseDown = (idx: number) => {
    setDragStart(idx);
    onCursorMove(idx);
    onSelectionChange(null);
  };

  const handleMouseEnter = (idx: number) => {
    if (dragStart !== null) {
      const start = Math.min(dragStart, idx);
      const end = Math.max(dragStart, idx);
      onSelectionChange([start, end]);
    }
  };

  const handleMouseUp = () => {
    setDragStart(null);
  };

  const isSelected = (idx: number) => {
    if (!selection) return false;
    return idx >= selection[0] && idx <= selection[1];
  };

  return (
    <div 
      className="bg-bgDark/40 p-4 rounded-xl shadow-inner overflow-x-auto overflow-y-hidden relative scrollbar-none" 
      ref={containerRef}
      onMouseLeave={handleMouseUp}
      onMouseUp={handleMouseUp}
    >
      {/* Floating Action Menu */}
      {selection && (
        <div className="fixed z-[100] flex bg-background border border-contrast/30 rounded-lg shadow-xl p-1 gap-1 -translate-y-12 animate-in fade-in slide-in-from-bottom-2">
          <button onClick={(e) => { e.stopPropagation(); onCopy(); }} className="p-2 hover:bg-contrast hover:text-background text-contrast rounded transition-colors" title="Copiar"><ICONS.Copy width="16" height="16" /></button>
          <button onClick={(e) => { e.stopPropagation(); onCut(); }} className="p-2 hover:bg-contrast hover:text-background text-contrast rounded transition-colors" title="Recortar"><ICONS.Cut width="16" height="16" /></button>
          <button onClick={(e) => { e.stopPropagation(); onPaste(); }} className="p-2 hover:bg-contrast hover:text-background text-contrast rounded transition-colors" title="Colar"><ICONS.Paste width="16" height="16" /></button>
          <button onClick={(e) => { e.stopPropagation(); onSelectionChange(null); }} className="p-2 hover:bg-contrast hover:text-background text-contrast rounded transition-colors" title="Cancelar Seleção"><ICONS.Delete width="16" height="16" /></button>
        </div>
      )}

      <div className="inline-flex flex-col min-w-full">
        {Array.from({ length: NUM_STRINGS }).map((_, sIdx) => (
          <div key={`str-${sIdx}`} className="flex items-center font-mono select-none" style={{ fontSize: `${fontSize}px` }}>
            <div className="w-8 text-other font-bold sticky left-0 bg-background/80 backdrop-blur-sm z-10 border-r border-foreground/20 pr-2 flex justify-end" style={{ height: `${fontSize * 2}px`, lineHeight: `${fontSize * 2}px` }}>
              {STRING_NAMES[sIdx]}
            </div>
            <div className="flex items-center relative" style={{ height: `${fontSize * 2}px` }}>
              <div className="absolute left-0 right-0 h-[1px] bg-foreground/20 top-1/2 -translate-y-1/2 pointer-events-none" />
              {columns.map((col, cIdx) => {
                const note = col[sIdx];
                const isCursor = cursorPosition === cIdx;
                const selected = isSelected(cIdx);
                return (
                  <div 
                    key={`col-${cIdx}-str-${sIdx}`} 
                    data-col-idx={cIdx} 
                    onMouseDown={() => handleMouseDown(cIdx)}
                    onMouseEnter={() => handleMouseEnter(cIdx)}
                    className={`relative w-8 h-full flex items-center justify-center cursor-pointer transition-all ${isCursor ? 'bg-contrast/10' : selected ? 'bg-contrast/20' : 'hover:bg-contrast/5'}`}
                  >
                    {isCursor && sIdx === 0 && <div className="absolute top-0 bottom-[-2000px] left-0 right-0 border-x border-contrast bg-contrast/5 pointer-events-none z-0" />}
                    <span className={`z-10 bg-bgDark/20 px-1 font-bold ${isCursor ? 'text-contrast scale-125' : selected ? 'text-contrast underline decoration-contrast' : 'text-contrast'}`}>
                      {note ? note.fret : '-'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TabEditor;
