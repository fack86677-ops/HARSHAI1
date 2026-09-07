import React, { useState } from 'react';

/**
 * ExportModal Component
 * Handles video and subtitle export configuration with Tier-based UI Locks (Free vs. Pro).
 * 
 * Rules:
 * - Free users: Can only export in 720p. 1080p and 4K options are disabled with 'PRO' badges.
 * - Pro users: All resolutions unlocked. 1 credit deducted on export.
 */
export function ExportModal({
  isOpen = false,
  onClose = () => {},
  user = { plan: 'free', credits: 10 },
  onExport = () => {},
  onUpgrade = () => {},
}) {
  const isFree = user.plan === 'free';
  const [format, setFormat] = useState('mp4');
  const [resolution, setResolution] = useState(isFree ? '720p' : '1080p');
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const handleResolutionSelect = (res) => {
    if (isFree && (res === '1080p' || res === '4k')) {
      onUpgrade({
        feature: `${res.toUpperCase()} Export`,
        reason: `${res.toUpperCase()} resolution is reserved for Creator Pro users. Free users can export in 720p HD.`,
      });
      return;
    }
    setResolution(res);
  };

  const handleConfirmExport = async () => {
    if (isFree && (resolution === '1080p' || resolution === '4k')) {
      alert('1080p and 4K exports are locked on the Free plan. Please upgrade to Pro or choose 720p.');
      return;
    }

    if (!isFree && user.credits < 1) {
      alert('Insufficient AI credits to export. Please recharge your account.');
      onUpgrade({ feature: 'Credits Recharge', reason: 'You have 0 AI credits remaining.' });
      return;
    }

    setIsExporting(true);
    try {
      await onExport({ format, resolution, plan: user.plan, credits: user.credits });
      onClose();
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-[#0B0F1E] border border-[#1E293B] rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 text-white font-sans">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
          <div>
            <h3 className="text-base font-extrabold flex items-center gap-2">
              <span>🚀</span> Export Video & Captions
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                isFree 
                  ? 'bg-slate-800 text-slate-300 border-slate-700' 
                  : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
              }`}>
                {user.plan.toUpperCase()} PLAN
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                ⚡ {user.credits} credits left
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition"
          >
            ✕
          </button>
        </div>

        {/* Free Tier Notice Banner */}
        {isFree && (
          <div className="p-3 bg-indigo-950/40 border border-indigo-500/30 rounded-2xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span>🔒</span>
              <span className="text-slate-300">
                Free plan exports in <b>720p HD</b>.
              </span>
            </div>
            <button
              onClick={() => onUpgrade({ feature: 'Pro Plan', reason: 'Unlock 1080p & 4K exports' })}
              className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 underline"
            >
              Upgrade
            </button>
          </div>
        )}

        {/* Format Options */}
        <div className="space-y-2">
          <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
            EXPORT FORMAT
          </label>
          <div className="space-y-2">
            {[
              { id: 'mp4', name: 'Rendered Video (MP4)', desc: 'Burned-in animated captions', badge: 'Popular' },
              { id: 'srt', name: 'SubRip Subtitle (.SRT)', desc: 'Standard subtitle file', badge: '.srt' },
              { id: 'vtt', name: 'WebVTT Subtitle (.VTT)', desc: 'Web & streaming subtitles', badge: '.vtt' },
            ].map((f) => (
              <label
                key={f.id}
                className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition ${
                  format === f.id
                    ? 'bg-indigo-600/20 border-indigo-500 shadow-md'
                    : 'bg-[#10162A] border-[#1E293B] hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="export-format"
                    value={f.id}
                    checked={format === f.id}
                    onChange={() => setFormat(f.id)}
                    className="accent-indigo-600"
                  />
                  <div>
                    <div className="text-xs font-bold">{f.name}</div>
                    <div className="text-[10px] text-slate-400">{f.desc}</div>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-indigo-400">{f.badge}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Resolution Options (UI Locked for Free Users) */}
        <div className="space-y-2">
          <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>RENDER RESOLUTION</span>
            {isFree && <span className="text-amber-400 font-bold">1080p & 4K Locked</span>}
          </label>

          <div className="grid grid-cols-3 gap-2">
            {/* 720p HD - Always Unlocked */}
            <div
              onClick={() => handleResolutionSelect('720p')}
              className={`p-2.5 rounded-xl border text-center cursor-pointer transition flex flex-col items-center justify-center ${
                resolution === '720p'
                  ? 'bg-indigo-600/30 border-indigo-500 ring-1 ring-indigo-500'
                  : 'bg-[#10162A] border-[#1E293B] hover:border-slate-700'
              }`}
            >
              <span className="text-xs font-extrabold">720p HD</span>
              <span className="text-[10px] text-emerald-400 font-semibold mt-0.5">Free Unlocked</span>
            </div>

            {/* 1080p FHD - PRO ONLY */}
            <div
              onClick={() => handleResolutionSelect('1080p')}
              className={`relative p-2.5 rounded-xl border text-center cursor-pointer transition flex flex-col items-center justify-center ${
                isFree
                  ? 'bg-[#0E1322]/60 border-[#1E293B]/60 opacity-70 hover:opacity-100 hover:border-amber-500/50'
                  : resolution === '1080p'
                  ? 'bg-indigo-600/30 border-indigo-500 ring-1 ring-indigo-500'
                  : 'bg-[#10162A] border-[#1E293B] hover:border-slate-700'
              }`}
            >
              {isFree && (
                <span className="absolute -top-1.5 -right-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-black text-[9px] font-black px-1.5 py-0.2 rounded-full shadow">
                  PRO 🔒
                </span>
              )}
              <span className="text-xs font-extrabold">1080p FHD</span>
              <span className="text-[10px] text-slate-400 mt-0.5">Recommended</span>
            </div>

            {/* 4K Ultra - PRO ONLY */}
            <div
              onClick={() => handleResolutionSelect('4k')}
              className={`relative p-2.5 rounded-xl border text-center cursor-pointer transition flex flex-col items-center justify-center ${
                isFree
                  ? 'bg-[#0E1322]/60 border-[#1E293B]/60 opacity-70 hover:opacity-100 hover:border-amber-500/50'
                  : resolution === '4k'
                  ? 'bg-indigo-600/30 border-indigo-500 ring-1 ring-indigo-500'
                  : 'bg-[#10162A] border-[#1E293B] hover:border-slate-700'
              }`}
            >
              {isFree && (
                <span className="absolute -top-1.5 -right-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-black text-[9px] font-black px-1.5 py-0.2 rounded-full shadow">
                  PRO 🔒
                </span>
              )}
              <span className="text-xs font-extrabold">4K Ultra</span>
              <span className="text-[10px] text-slate-400 mt-0.5">Max Clarity</span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleConfirmExport}
          disabled={isExporting}
          className="w-full py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-600 disabled:opacity-50 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition duration-150"
        >
          {isExporting ? (
            <span>Rendering Video...</span>
          ) : (
            <>
              <span>Download ({resolution})</span>
              {!isFree && <span className="text-xs opacity-80 font-mono">(-1 Credit)</span>}
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default ExportModal;
