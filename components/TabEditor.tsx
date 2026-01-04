
import React, { useRef, useEffect, useState } from 'react';
import { TabColumn } from '../types';
import { STRING_NAMES, NUM_STRINGS, ICONS } from '../constants';

interface TabEditorProps {
  columns: TabColumn[];
  cursorPosition: number;
  activeStringIndex: number;
  selection: [number, number] | null;
  onCursorMove: (pos: number) => void;
  onStringSelect: (idx: number) => void;
  onSelectionChange: (sel: [number, number] | null) => void;
  onCopy: () => void;
  onCut: () => void;
  onPaste: () => void;
  fontSize: number;
  isHovered?: boolean;
}

const TabEditor: React.FC<TabEditorProps> = ({ 
  columns, 
  cursorPosition, 
  activeStringIndex,
  selection, 
  onCursorMove, 
  onStringSelect,
  onSelectionChange,
  onCopy,
  onCut,
  onPaste,
  fontSize,
  isHovered = true
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragStart, setDragStart] = useState<number | null>(null);

  useEffect(() => {
    if (containerRef.current) {
      const activeCol = containerRef.current.querySelector(`[data-col-idx="${cursorPosition}"]`);
      if (activeCol) {
        activeCol.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [cursorPosition]);

  const handleMouseDown = (cIdx: number, sIdx: number) => {
    setDragStart(cIdx);
    onCursorMove(cIdx);
    onStringSelect(sIdx);
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

  // Redução de 20px no total (6 cordas) = ~3.33px por linha para diminuir o spread vertical
  const rowHeightStyle = { 
    height: `calc(${fontSize * 2.2}px - 3.33px)`, 
    lineHeight: `calc(${fontSize * 2.2}px - 3.33px)` 
  };

  return (
    <div 
      className="bg-bgDark/20 p-2 rounded-lg overflow-x-auto overflow-y-visible relative custom-scrollbar select-none min-h-max" 
      ref={containerRef}
      onMouseLeave={handleMouseUp}
      onMouseUp={handleMouseUp}
    >
      <div className="inline-flex flex-col min-w-full h-full">
        {Array.from({ length: NUM_STRINGS }).map((_, sIdx) => {
          const isActiveRow = activeStringIndex === sIdx;
          return (
            <div 
              key={`str-${sIdx}`} 
              className={`flex items-center font-mono transition-colors ${isHovered && isActiveRow ? 'bg-contrast/5' : ''}`} 
              style={{ fontSize: `${fontSize}px` }}
            >
              {/* Nome da Corda */}
              <div 
                onClick={() => onStringSelect(sIdx)}
                className={`w-8 text-other font-bold sticky left-0 z-10 border-r border-foreground/10 pr-2 flex justify-end cursor-pointer hover:text-contrast transition-colors ${isHovered && isActiveRow ? 'text-contrast' : 'text-other/60'}`} 
                style={rowHeightStyle}
              >
                {STRING_NAMES[sIdx]}
              </div>

              {/* Linha da Tablatura */}
              <div className="flex items-center relative flex-1" style={{ height: rowHeightStyle.height }}>
                <div className={`absolute left-0 right-0 h-[1px] top-1/2 -translate-y-1/2 pointer-events-none ${isHovered && isActiveRow ? 'bg-contrast/30' : 'bg-foreground/10'}`} />
                
                {columns.map((col, cIdx) => {
                  const note = col[sIdx];
                  const isCursor = cursorPosition === cIdx;
                  const isCellActive = isCursor && isActiveRow;
                  const selected = isSelected(cIdx);
                  
                  return (
                    <div 
                      key={`col-${cIdx}-str-${sIdx}`} 
                      data-col-idx={cIdx} 
                      onMouseDown={() => handleMouseDown(cIdx, sIdx)}
                      onMouseEnter={() => handleMouseEnter(cIdx)}
                      className={`relative w-5 h-full flex items-center justify-center cursor-pointer transition-all 
                        ${isHovered && isCellActive ? 'bg-contrast/20 scale-110 z-20 rounded ring-1 ring-contrast' : ''} 
                        ${isHovered && isCursor && !isActiveRow ? 'bg-contrast/5' : ''} 
                        ${selected ? 'bg-contrast/20' : 'hover:bg-contrast/10'}`}
                    >
                      {/* Cursor Vertical */}
                      {isHovered && isCursor && sIdx === 0 && (
                        <div className="absolute top-0 bottom-[-1000px] left-0 right-0 border-x border-contrast/10 bg-contrast/5 pointer-events-none z-0" />
                      )}
                      
                      <span className={`z-10 px-0.5 font-bold ${isHovered && isCellActive ? 'text-contrast' : selected ? 'text-contrast underline' : 'text-contrast/80'}`}>
                        {note ? note.fret : '-'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TabEditor;
