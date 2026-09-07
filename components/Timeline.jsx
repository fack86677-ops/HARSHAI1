import React, { useRef } from 'react';

/**
 * Timeline Component
 * Professional Video Editor Timeline with Word-Level Blocks.
 * Renders individual smaller blocks for every word/phrase on the timeline track
 * with precise start/end positioning and active playhead synchronization.
 */
export function Timeline({
  captions = [],
  duration = 15.0,
  currentTime = 0,
  onSeek = () => {},
  onUpdateCaption = () => {},
  zoom = 1.0,
}) {
  const trackRef = useRef(null);

  const safeDuration = Math.max(0.1, duration);

  const handleTrackClick = (e) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(ratio * safeDuration);
  };

  return (
    <div className="w-full bg-[#050814] border-t border-[#1E293B] flex flex-col select-none text-xs font-sans">
      {/* Track Header & Tools */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#080C1B] border-b border-[#1E293B] text-[#94A3B8]">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white text-[11px] flex items-center gap-1">
            <span className="text-indigo-400">✨</span> Word-Level Timeline Track
          </span>
          <span className="text-[10px] text-slate-500">
            ({captions.length} segments)
          </span>
        </div>
        <div className="text-[11px] font-mono text-emerald-400 font-bold">
          {currentTime.toFixed(2)}s / {safeDuration.toFixed(2)}s
        </div>
      </div>

      {/* Scrollable Timeline Area */}
      <div className="relative w-full overflow-x-auto overflow-y-hidden py-4 px-2 min-h-[90px]">
        <div
          ref={trackRef}
          onClick={handleTrackClick}
          className="relative h-14 bg-[#0B0F1E] rounded-xl border border-[#1E293B] cursor-pointer"
          style={{ minWidth: '100%', width: `${100 * zoom}%` }}
        >
          {/* Word-Level Blocks Mapping */}
          {captions.map((cap) => {
            const words = Array.isArray(cap.words) && cap.words.length > 0
              ? cap.words
              : (cap.text || '').split(/\s+/).filter(Boolean).map((w, i, arr) => {
                  const segDur = Math.max(0.1, cap.endTime - cap.startTime);
                  const wDur = segDur / arr.length;
                  return {
                    word: w,
                    start: cap.startTime + (i * wDur),
                    end: cap.startTime + ((i + 1) * wDur),
                  };
                });

            return words.map((w, wIdx) => {
              const leftPercent = (w.start / safeDuration) * 100;
              const widthPercent = Math.max(1.2, ((w.end - w.start) / safeDuration) * 100);
              const isWordActive = currentTime >= (w.start - 0.02) && currentTime <= (w.end + 0.05);

              return (
                <div
                  key={`${cap.id}_w_${wIdx}`}
                  style={{
                    left: `${leftPercent}%`,
                    width: `${widthPercent}%`,
                    position: 'absolute',
                    top: '8px',
                    bottom: '8px',
                  }}
                  title={`Word: "${w.word}" (${w.start.toFixed(2)}s - ${w.end.toFixed(2)}s)\n• Click to seek\n• Double click to edit`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSeek(w.start);
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    const newText = prompt('Edit Word Text:', w.word);
                    if (newText !== null && newText.trim() !== '') {
                      w.word = newText.trim();
                      cap.text = words.map((x) => x.word).join(' ');
                      onUpdateCaption(cap);
                    }
                  }}
                  className={`group relative flex items-center justify-center rounded-md px-1.5 cursor-pointer transition-all duration-100 ${
                    isWordActive
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 border-2 border-emerald-300 text-white font-black shadow-[0_0_12px_rgba(16,185,129,0.7)] scale-105 z-20'
                      : 'bg-indigo-600/35 hover:bg-indigo-600/60 border border-indigo-400/40 text-slate-200 font-semibold hover:text-white z-10'
                  }`}
                >
                  {/* Left Trim Indicator */}
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-transparent group-hover:bg-white/40 cursor-ew-resize rounded-l" />

                  {/* Word Content */}
                  <span className="truncate text-[10px] pointer-events-none select-none">
                    {w.word}
                  </span>

                  {/* Right Trim Indicator */}
                  <div className="absolute right-0 top-0 bottom-0 w-1 bg-transparent group-hover:bg-white/40 cursor-ew-resize rounded-r" />
                </div>
              );
            });
          })}

          {/* Red Playhead Scrubber */}
          <div
            className="absolute top-0 bottom-0 w-[2px] bg-rose-500 z-30 pointer-events-none shadow-[0_0_10px_#f43f5e]"
            style={{ left: `${(currentTime / safeDuration) * 100}%` }}
          >
            <div className="w-3 h-3 bg-rose-500 -top-1.5 -left-1.5 absolute rounded-full shadow-[0_0_8px_#f43f5e]" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Timeline;
