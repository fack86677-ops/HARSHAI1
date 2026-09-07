import React, { useState } from 'react';

/**
 * CheckoutPage Component
 * Full-page Manual UPI QR Code Checkout & Verification
 */
export function CheckoutPage({
  plan = 'Creator Pro',
  amount = 699,
  onPaymentSuccess = () => {},
}) {
  const [utr, setUtr] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanUtr = utr.trim();
    if (!cleanUtr) {
      setErrorMessage('Please enter your 12-digit UTR / Transaction ID.');
      return;
    }
    if (!/^\d{12}$/.test(cleanUtr)) {
      setErrorMessage('UTR / Transaction ID must be exactly 12 numeric digits.');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      const paymentRecord = {
        utr: cleanUtr,
        plan,
        amount,
        status: 'pending_verification',
        timestamp: new Date().toISOString(),
      };
      try {
        const history = JSON.parse(localStorage.getItem('hcg_pending_payments') || '[]');
        history.push(paymentRecord);
        localStorage.setItem('hcg_pending_payments', JSON.stringify(history));
      } catch (_) {}

      setToastMessage('Payment details submitted! Your account will be upgraded shortly after verification.');
      onPaymentSuccess(paymentRecord);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-[#030712] text-white flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans">
      {/* Aurora Ambient Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-indigo-600/15 via-purple-600/15 to-pink-600/15 rounded-full blur-[120px]"></div>
      </div>

      <div className="relative z-10 max-w-lg w-full bg-[#0B0F1E] border border-[#1E293B] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Title */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-black uppercase">
            <span>⚡</span> Pro Membership Upgrade
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Manual UPI Checkout</h1>
          <p className="text-xs text-slate-400">Complete payment via UPI QR code for instant manual activation.</p>
        </div>

        {/* Plan Summary */}
        <div className="p-4 rounded-2xl bg-[#10162A] border border-[#1E293B] flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-white">{plan} Lifetime License</div>
            <div className="text-xs text-slate-400">1080p, 4K, AI Emojis & Studio Audio included</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black text-emerald-400">₹{amount}</div>
            <div className="text-[10px] text-slate-500">Tax inclusive</div>
          </div>
        </div>

        {/* QR Code Container */}
        <div className="p-6 rounded-3xl bg-[#080C1B] border border-[#1E293B] text-center space-y-4">
          <div className="inline-block p-3 bg-white rounded-2xl shadow-xl">
            <img
              src="/my-qr.jpeg"
              alt="UPI QR Code"
              className="w-56 h-56 sm:w-64 sm:h-64 object-contain rounded-xl mx-auto"
            />
          </div>

          <p className="text-xs font-medium text-slate-300">
            Scan this QR code with any UPI App (PhonePe, GPay, Paytm) to upgrade to Pro.
          </p>

          <div className="flex justify-center gap-2">
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-purple-300">PhonePe</span>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-blue-300">GPay</span>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-cyan-300">Paytm</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
              12-digit UTR / Transaction ID
            </label>
            <input
              type="text"
              maxLength={12}
              value={utr}
              onChange={(e) => {
                setUtr(e.target.value.replace(/\D/g, ''));
                if (errorMessage) setErrorMessage('');
              }}
              placeholder="e.g. 423589102456"
              className="w-full px-4 py-3 rounded-xl bg-[#10162A] border border-[#1E293B] focus:border-indigo-500 text-white font-mono text-sm outline-none"
            />
            {errorMessage && (
              <p className="text-xs text-rose-400 font-medium">⚠️ {errorMessage}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting || utr.length !== 12}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:opacity-95 text-white font-extrabold text-sm uppercase tracking-wider transition disabled:opacity-50"
          >
            {isSubmitting ? 'Verifying...' : 'Submit Payment'}
          </button>
        </form>

        {toastMessage && (
          <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-500/60 text-emerald-200 text-xs font-bold text-center">
            {toastMessage}
          </div>
        )}
      </div>
    </div>
  );
}

export default CheckoutPage;
