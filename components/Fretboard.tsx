
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
    <div className="bg-bgDark p-6 pt-12 rounded-xl shadow-2xl overflow-x-auto border border-foreground/10">
      <div className="relative inline-flex min-w-max">
        {/* Cabeçote / Cordas Soltas */}
        <div className="flex flex-col justify-between pr-2 border-r-4 border-contrast">
          {strings.map((s) => {
            const noteIdx = getNoteIndex(s, 0);
            const isHighlighted = highlightedNotes?.has(noteIdx);
            return (
              <button 
                key={`open-${s}`} 
                onClick={() => onFretClick(s, 0)} 
                className={`w-10 h-10 flex items-center justify-center font-bold relative transition-colors group overflow-hidden`}
              >
                <div className={`absolute inset-0 bg-contrast transition-opacity opacity-0 group-hover:opacity-10`} />
                {isHighlighted && (
                  <div className="absolute w-7 h-7 rounded-full bg-comment/80 z-0 ring-2 ring-comment flex items-center justify-center shadow-lg">
                    <span className="text-[10px] font-bold text-background leading-none">{NOTES[noteIdx]}</span>
                  </div>
                )}
                <span className={`relative z-10 ${isHighlighted ? 'opacity-0' : 'text-foreground'}`}>{STRING_NAMES[s]}</span>
              </button>
            );
          })}
        </div>

        {/* Braço / Trastes */}
        <div className="flex">
          {frets.slice(1).map((f) => (
            <div key={`fret-col-${f}`} className="relative group">
              {/* Números e Marcações das Casas (Invertidos) */}
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex flex-col items-center min-w-[30px]">
                {/* Número em cima */}
                <span className="text-[10px] text-foreground font-bold mb-1.5">{f}</span>
                
                {/* Pontos embaixo do número */}
                {isDoubleMarked(f) ? (
                  <div className="flex flex-row gap-1">
                    <div className="w-2 h-2 rounded-full bg-keywords" />
                    <div className="w-2 h-2 rounded-full bg-keywords" />
                  </div>
                ) : (
                  isMarked(f) && <div className="w-2 h-2 rounded-full bg-foreground/40" />
                )}
              </div>

              {/* Linha do Traste */}
              <div className="absolute right-0 h-full w-[2px] bg-foreground/20 group-last:hidden" />
              
              <div className="flex flex-col justify-between h-full px-1">
                {strings.map((s) => {
                  const noteIdx = getNoteIndex(s, f);
                  const isHighlighted = highlightedNotes?.has(noteIdx);
                  return (
                    <button 
                      key={`fret-${f}-str-${s}`} 
                      onClick={() => onFretClick(s, f)} 
                      className="w-12 h-10 flex items-center justify-center relative transition-all rounded"
                    >
                      {/* Linha da Corda */}
                      <div className="absolute w-full h-[1px] bg-foreground/30 left-0 top-1/2 -translate-y-1/2 pointer-events-none" />
                      
                      {/* Nota da Escala */}
                      {isHighlighted && (
                        <div className="absolute w-7 h-7 rounded-full bg-comment/80 z-20 ring-2 ring-comment flex items-center justify-center shadow-lg">
                          <span className="text-[10px] font-bold text-background leading-none">
                            {NOTES[noteIdx]}
                          </span>
                        </div>
                      )}
                      
                      {/* Highlight de Hover */}
                      <div className="opacity-0 hover:opacity-100 absolute inset-0 bg-contrast/20 z-10 transition-opacity" />
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
