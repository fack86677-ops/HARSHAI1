import React, { useRef, useEffect } from 'react';

/**
 * CaptionSidebar Component
 * Sleek, scrollable numbered caption segment list (1, 2, 3...).
 * Features individual word tokens with Active Word Highlighting (subtle green pill background)
 * as the video plays.
 */
export function CaptionSidebar({
  captions = [],
  currentTime = 0,
  effectiveTime = 0,
  activeCaptionId = null,
  onSeek = () => {},
  onUpdateCaption = () => {},
  onSplitCaption = () => {},
  onDeleteCaption = () => {},
}) {
  const activeRowRef = useRef(null);

  // Auto-scroll the active caption row into view smoothly
  useEffect(() => {
    if (activeRowRef.current) {
      activeRowRef.current.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [activeCaptionId]);

  return (
    <aside className="w-80 h-full bg-[#080C1B] border-r border-[#1E293B] flex flex-col shrink-0 select-none">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-[#1E293B] flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
            <span>📝</span> Captions & Subtitles
          </h2>
          <p className="text-[11px] text-slate-400">
            {captions.length} segments • Word-level synced
          </p>
        </div>
      </div>

      {/* Numbered & Highlighted Scrollable List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {captions.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs flex flex-col items-center justify-center space-y-2">
            <span className="text-3xl">🎙️</span>
            <div className="font-semibold text-slate-400">No Captions Yet</div>
            <p className="text-[11px]">Upload a video and generate captions to start editing.</p>
          </div>
        ) : (
          captions.map((cap, idx) => {
            const isActive = activeCaptionId === cap.id || (
              effectiveTime >= (cap.startTime - 0.03) && effectiveTime <= (cap.endTime + 0.05)
            );

            const words = Array.isArray(cap.words) && cap.words.length > 0
              ? cap.words
              : (cap.text || '').split(/\s+/).filter(Boolean).map((w, i, arr) => {
                  const dur = Math.max(0.1, cap.endTime - cap.startTime);
                  const wDur = dur / arr.length;
                  return {
                    word: w,
                    start: cap.startTime + (i * wDur),
                    end: cap.startTime + ((i + 1) * wDur),
                  };
                });

            return (
              <div
                key={cap.id || idx}
                ref={isActive ? activeRowRef : null}
                onClick={() => onSeek(cap.startTime)}
                className={`group flex items-start gap-2.5 p-3 rounded-2xl border transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-indigo-950/40 border-indigo-500/70 shadow-[0_0_15px_rgba(99,102,241,0.15)]'
                    : 'bg-[#10162A]/70 hover:bg-[#151C24] border-[#1E293B]/70 hover:border-indigo-500/40'
                }`}
              >
                {/* 1. Sleek Numbered Badge (1, 2, 3...) */}
                <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-[#10162A] border border-[#1E293B] text-slate-400 group-hover:text-white group-hover:border-indigo-500/50 group-hover:bg-indigo-600/20 font-mono text-[11px] font-bold shrink-0 pt-0.5 select-none transition">
                  {idx + 1}
                </div>

                {/* 2. Caption Content Box */}
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  {/* Timestamp Range */}
                  <div className="text-[10px] font-mono text-slate-500 flex items-center gap-1.5">
                    <span className="text-emerald-400 font-semibold">{cap.startTime.toFixed(2)}s</span>
                    <span>→</span>
                    <span className="text-sky-400 font-semibold">{cap.endTime.toFixed(2)}s</span>
                    {cap.isEdited && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-400 font-sans font-bold">
                        edited
                      </span>
                    )}
                  </div>

                  {/* Word-level interactive text container */}
                  <div
                    className="flex flex-wrap gap-1 text-xs text-white leading-relaxed select-text font-medium mt-0.5"
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      const updated = prompt('Edit Caption Text:', cap.text);
                      if (updated !== null && updated.trim() !== '') {
                        const newWords = updated.trim().split(/\s+/).filter(Boolean);
                        const dur = Math.max(0.1, cap.endTime - cap.startTime);
                        const wDur = dur / Math.max(1, newWords.length);
                        cap.text = updated.trim();
                        cap.isEdited = true;
                        cap.words = newWords.map((token, tIdx) => ({
                          word: token,
                          start: cap.startTime + (tIdx * wDur),
                          end: cap.startTime + ((tIdx + 1) * wDur),
                        }));
                        onUpdateCaption(cap);
                      }
                    }}
                  >
                    {words.map((w, wIdx) => {
                      // Active word calculation using delay-compensated effectiveTime
                      const isWordActive = effectiveTime >= (w.start - 0.02) && effectiveTime <= (w.end + 0.04);

                      return (
                        <span
                          key={wIdx}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSeek(w.start);
                          }}
                          title={`Click to seek to ${w.start.toFixed(2)}s`}
                          className={`px-1.5 py-0.5 rounded-md transition-all duration-100 cursor-pointer ${
                            isWordActive
                              ? 'bg-green-900/40 text-green-400 font-bold border border-green-500/40 shadow-[0_0_8px_rgba(74,222,128,0.25)]'
                              : 'text-slate-200 hover:bg-white/10'
                          }`}
                        >
                          {w.word}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Quick Action Buttons */}
                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 shrink-0 transition text-slate-400 pt-0.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSplitCaption(cap.id);
                    }}
                    title="Split caption"
                    className="p-1 hover:text-amber-400 hover:bg-slate-800 rounded transition"
                  >
                    ✂️
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteCaption(cap.id);
                    }}
                    title="Delete caption"
                    className="p-1 hover:text-rose-400 hover:bg-slate-800 rounded transition"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}

export default CaptionSidebar;
