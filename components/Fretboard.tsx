
import React from 'react';
import { NUM_STRINGS, NUM_FRETS, STRING_NAMES, NOTES } from '../constants';

interface FretboardProps {
  onFretClick: (stringIndex: number, fret: number) => void;
  highlightedNotes: Set<number> | null;
}

const Fretboard: React.FC<FretboardProps> = ({ onFretClick, highlightedNotes }) => {
  const frets = Array.from({ length: NUM_FRETS + 1 }, (_, i) => i);
  const strings = Array.from({ length: NUM_STRINGS }, (_, i) => i);
  const STRING_BASES = [4, 11, 7, 2, 9, 4]; // e, B, G, D, A, E

  const isMarked = (f: number) => [3, 5, 7, 9, 15, 17, 19, 21].includes(f);
  const isDoubleMarked = (f: number) => f === 12 || f === 24;
  const getNoteIndex = (sIdx: number, fIdx: number) => (STRING_BASES[sIdx] + fIdx) % 12;

  return (
    <div className="bg-bgDark/40 p-1 pt-6 rounded-xl overflow-hidden border border-foreground/5">
      <div className="relative inline-flex min-w-full justify-center">
        {/* Cabeçote */}
        <div className="flex flex-col justify-between pr-2 border-r-2 border-contrast/30">
          {strings.map((s) => {
            const noteIdx = getNoteIndex(s, 0);
            const isHighlighted = highlightedNotes?.has(noteIdx);
            return (
              <button 
                key={`open-${s}`} 
                onClick={() => onFretClick(s, 0)} 
                className={`w-7 h-[26px] flex items-center justify-center font-bold text-[10px] relative transition-colors group`}
              >
                <div className={`absolute inset-0 bg-contrast transition-opacity opacity-0 group-hover:opacity-10`} />
                {isHighlighted && (
                  <div className="absolute w-5 h-5 rounded-full bg-comment/70 z-0 ring-1 ring-comment flex items-center justify-center shadow-lg">
                    <span className="text-[8px] font-bold text-contrast leading-none">{NOTES[noteIdx]}</span>
                  </div>
                )}
                <span className={`relative z-10 ${isHighlighted ? 'opacity-0' : 'text-foreground/80'}`}>{STRING_NAMES[s]}</span>
              </button>
            );
          })}
        </div>

        {/* Braço */}
        <div className="flex">
          {frets.slice(1).map((f) => (
            <div key={`fret-col-${f}`} className="relative group">
              {/* Números das Casas */}
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex flex-col items-center min-w-[28px]">
                <span className="text-[9px] text-foreground/40 font-bold">{f}</span>
                {isDoubleMarked(f) ? (
                  <div className="flex flex-row gap-0.5">
                    <div className="w-1 h-1 rounded-full bg-keywords" />
                    <div className="w-1 h-1 rounded-full bg-keywords" />
                  </div>
                ) : (
                  isMarked(f) && <div className="w-1 h-1 rounded-full bg-foreground/20" />
                )}
              </div>

              {/* Traste */}
              <div className="absolute right-0 h-full w-[1px] bg-foreground/10 group-last:hidden" />
              
              <div className="flex flex-col justify-between h-full px-0.5">
                {strings.map((s) => {
                  const noteIdx = getNoteIndex(s, f);
                  const isHighlighted = highlightedNotes?.has(noteIdx);
                  return (
                    <button 
                      key={`fret-${f}-str-${s}`} 
                      onClick={() => onFretClick(s, f)} 
                      className="w-[28px] h-[26px] flex items-center justify-center relative transition-all rounded"
                    >
                      {/* Corda */}
                      <div className="absolute w-full h-[1px] bg-foreground/15 left-0 top-1/2 -translate-y-1/2 pointer-events-none" />
                      
                      {/* Nota */}
                      {isHighlighted && (
                        <div className="absolute w-5 h-5 rounded-full bg-comment/80 z-20 ring-1 ring-comment flex items-center justify-center shadow-sm">
                          <span className="text-[8px] font-bold text-contrast leading-none">
                            {NOTES[noteIdx]}
                          </span>
                        </div>
                      )}
                      
                      <div className="opacity-0 hover:opacity-100 absolute inset-0 bg-contrast/5 z-10 transition-opacity rounded" />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Fretboard;
