import React from 'react';

/**
 * SidebarTools Component
 * Sidebar tools panel containing AI Enhancement controls (Add Emojis & Audio Enhancement).
 *
 * Rules:
 * - Free users: 'Add Emojis' and 'Audio Enhancement' are disabled with a lock icon (🔒) and 'PRO' badge.
 * - Pro users: All tools unlocked and interactive.
 */
export function SidebarTools({
  user = { plan: 'free', credits: 10 },
  emojisEnabled = false,
  audioEnhanceEnabled = false,
  onToggleEmojis = () => {},
  onToggleAudioEnhance = () => {},
  onUpgrade = () => {},
}) {
  const isFree = user.plan === 'free';

  const handleToolClick = (toolName, toggleFn) => {
    if (isFree) {
      onUpgrade({
        feature: toolName,
        reason: `${toolName} is an exclusive Creator Pro feature. Upgrade your account to unlock AI audio enhancement and viral emojis!`,
      });
      return;
    }
    toggleFn();
  };

  return (
    <div className="w-full space-y-3 font-sans select-none text-xs">
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-wider">
          AI ENHANCEMENT SUITE
        </span>
        {isFree && (
          <span className="text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
            <span>🔒</span> PRO FEATURES
          </span>
        )}
      </div>

      {/* 1. Add Emojis Tool */}
      <div
        onClick={() => handleToolClick('Add Emojis', () => onToggleEmojis(!emojisEnabled))}
        className={`p-3 rounded-2xl border transition-all duration-150 flex items-center justify-between cursor-pointer ${
          isFree
            ? 'bg-[#10162A]/60 border-[#1E293B]/70 opacity-75 hover:opacity-100 hover:border-amber-500/40'
            : emojisEnabled
            ? 'bg-indigo-950/40 border-indigo-500/70 shadow-md'
            : 'bg-[#10162A] border-[#1E293B] hover:border-indigo-500/40'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-xl">✨</span>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white">Add Emojis</span>
              {isFree ? (
                <span className="text-[9px] font-black bg-amber-500/20 text-amber-400 px-1.5 py-0.2 rounded border border-amber-500/30">
                  PRO 🔒
                </span>
              ) : (
                <span className="text-[9px] font-bold text-emerald-400">Active</span>
              )}
            </div>
            <p className="text-[10px] text-slate-400">
              Auto-place viral emojis based on spoken words
            </p>
          </div>
        </div>

        {/* Switch / Lock */}
        {isFree ? (
          <span className="text-sm text-slate-500">🔒</span>
        ) : (
          <input
            type="checkbox"
            checked={emojisEnabled}
            onChange={(e) => {
              e.stopPropagation();
              onToggleEmojis(e.target.checked);
            }}
            className="w-4 h-4 accent-indigo-600 cursor-pointer"
          />
        )}
      </div>

      {/* 2. Audio Enhancement Tool */}
      <div
        onClick={() => handleToolClick('Audio Enhancement', () => onToggleAudioEnhance(!audioEnhanceEnabled))}
        className={`p-3 rounded-2xl border transition-all duration-150 flex items-center justify-between cursor-pointer ${
          isFree
            ? 'bg-[#10162A]/60 border-[#1E293B]/70 opacity-75 hover:opacity-100 hover:border-amber-500/40'
            : audioEnhanceEnabled
            ? 'bg-indigo-950/40 border-indigo-500/70 shadow-md'
            : 'bg-[#10162A] border-[#1E293B] hover:border-indigo-500/40'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-xl">🔊</span>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white">Audio Enhancement</span>
              {isFree ? (
                <span className="text-[9px] font-black bg-amber-500/20 text-amber-400 px-1.5 py-0.2 rounded border border-amber-500/30">
                  PRO 🔒
                </span>
              ) : (
                <span className="text-[9px] font-bold text-emerald-400">Studio</span>
              )}
            </div>
            <p className="text-[10px] text-slate-400">
              Neural hiss removal & vocal presence boost
            </p>
          </div>
        </div>

        {/* Switch / Lock */}
        {isFree ? (
          <span className="text-sm text-slate-500">🔒</span>
        ) : (
          <input
            type="checkbox"
            checked={audioEnhanceEnabled}
            onChange={(e) => {
              e.stopPropagation();
              onToggleAudioEnhance(e.target.checked);
            }}
            className="w-4 h-4 accent-indigo-600 cursor-pointer"
          />
        )}
      </div>

      {/* Free Plan Upgrade Callout */}
      {isFree && (
        <div className="p-3 bg-gradient-to-r from-indigo-900/30 to-purple-900/30 border border-indigo-500/30 rounded-2xl space-y-1.5 mt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white">Unlock Creator Pro</span>
            <span className="text-[10px] text-amber-400 font-extrabold">All-Access</span>
          </div>
          <p className="text-[10px] text-slate-300">
            Get 1080p/4K exports, AI Emojis, Audio Cleaner, and monthly rendering credits.
          </p>
          <button
            onClick={() => onUpgrade({ feature: 'Creator Pro', reason: 'Upgrade to unlock all features.' })}
            className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] rounded-xl transition shadow-md mt-1"
          >
            Upgrade to Pro ⚡
          </button>
        </div>
      )}
    </div>
  );
}

export default SidebarTools;
