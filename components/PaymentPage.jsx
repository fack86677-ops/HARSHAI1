import React, { useState } from 'react';

/**
 * PaymentPage Component
 * Full-page Manual UPI Checkout Page for Creator Pro Upgrade.
 */
export function PaymentPage({
  planName = 'Creator Pro',
  amount = 699,
  credits = 2500,
  onSuccess = () => {},
}) {
  const [utrId, setUtrId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const handleUtrChange = (e) => {
    const val = e.target.value.replace(/[^0-9a-zA-Z]/g, '').trim();
    setUtrId(val);
    if (errorMsg) setErrorMsg('');
  };

  const handleSubmitPayment = (e) => {
    e.preventDefault();

    if (!utrId) {
      setErrorMsg('Please enter the 12-digit UTR / Transaction ID.');
      return;
    }

    if (utrId.length < 8) {
      setErrorMsg('Transaction ID is too short. Standard UPI UTRs are 12 digits.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
      const successMsg = 'Payment details submitted! Your account will be upgraded shortly after verification.';
      setToastMessage(successMsg);

      onSuccess({ utr: utrId, plan: planName, amount });
    }, 800);
  };

  return (
    <div className="min-h-screen bg-[#030712] text-white flex flex-col items-center justify-center p-4 sm:p-6 font-sans relative overflow-hidden">
      {/* Aurora Ambient Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#6366F1]/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-[#EC4899]/15 rounded-full blur-3xl"></div>
      </div>

      {/* Floating Success Toast */}
      {toastMessage && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 bg-[#064E3B] border border-[#10B981] text-white font-bold text-xs sm:text-sm px-6 py-3.5 rounded-full shadow-2xl flex items-center gap-3 backdrop-blur-xl animate-bounce">
          <span className="text-lg">✅</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-md w-full bg-[#0B0F1E] border border-[#1E293B] rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 space-y-6">
        {/* Top Header */}
        <div className="text-center space-y-1 border-b border-[#1E293B] pb-4">
          <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
            Instant UPI Checkout
          </span>
          <h1 className="text-2xl font-black text-white pt-2">Upgrade to {planName}</h1>
          <p className="text-xs text-slate-400">Unlock 1080p/4K Video Export, AI Emojis & Studio Voice</p>
        </div>

        {/* Pricing Summary */}
        <div className="p-4 rounded-2xl bg-[#10162A] border border-[#1E293B] flex items-center justify-between">
          <div>
            <div className="text-sm font-black text-white">{planName} Pack</div>
            <div className="text-xs text-slate-400">⚡ {credits.toLocaleString('en-IN')} AI Credits • Lifetime validity</div>
          </div>
          <div className="text-right">
            <div className="text-xl font-black text-[#10B981]">₹{amount}</div>
            <div className="text-[10px] text-slate-500">Includes all taxes</div>
          </div>
        </div>

        {/* Center QR Display */}
        <div className="p-5 rounded-2xl bg-[#06080F] border border-[#1E293B] text-center space-y-3">
          <div className="inline-block p-2 bg-black rounded-2xl border border-white/15 shadow-2xl">
            <img
              src="/my-qr.jpeg"
              alt="Scan UPI QR Code"
              className="w-48 h-48 sm:w-52 sm:h-52 object-contain rounded-xl mx-auto bg-black"
              onError={(e) => {
                if (!e.target.dataset.triedStatic) {
                  e.target.dataset.triedStatic = 'true';
                  e.target.src = '/static/my-qr.jpeg';
                }
              }}
            />
          </div>

          <div className="flex items-center justify-center gap-2 pt-1">
            <span className="px-2 py-0.5 rounded bg-purple-950/60 border border-purple-500/40 text-purple-300 text-[10px] font-bold">PhonePe</span>
            <span className="px-2 py-0.5 rounded bg-blue-950/60 border border-blue-500/40 text-blue-300 text-[10px] font-bold">GPay</span>
            <span className="px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 text-[10px] font-bold">Paytm</span>
            <span className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold">BHIM</span>
          </div>

          <p className="text-xs text-slate-300 font-medium px-2">
            Scan this QR code with any UPI App (PhonePe, GPay, Paytm) to upgrade to Pro.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmitPayment} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
              12-digit UTR / Transaction ID <span className="text-pink-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={utrId}
                onChange={handleUtrChange}
                placeholder="e.g. 423589102456"
                maxLength={20}
                className={`w-full px-4 py-3 rounded-xl bg-[#10162A] border text-white text-sm font-mono placeholder-slate-600 focus:outline-none transition ${
                  errorMsg ? 'border-red-500 ring-1 ring-red-500' : 'border-[#1E293B] focus:border-indigo-500'
                }`}
                disabled={isSubmitting || isSubmitted}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-mono">
                {utrId.length > 0 ? `${utrId.length} chars` : '12 Digits'}
              </span>
            </div>
            {errorMsg && (
              <p className="text-xs text-red-400 font-semibold mt-1">⚠️ {errorMsg}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting || isSubmitted}
            className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-xl transition-all duration-200 ${
              isSubmitted
                ? 'bg-emerald-600 text-white cursor-default'
                : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white cursor-pointer shadow-indigo-600/30'
            } disabled:opacity-60`}
          >
            {isSubmitting ? (
              <span>Submitting Details...</span>
            ) : isSubmitted ? (
              <span>✅ Submitted! Verifying Account...</span>
            ) : (
              <span>Submit Payment →</span>
            )}
          </button>

          <p className="text-[11px] text-center text-slate-500">
            🔒 Manual Verification: Account will be upgraded shortly after verification.
          </p>
        </form>
      </div>
    </div>
  );
}

export default PaymentPage;
