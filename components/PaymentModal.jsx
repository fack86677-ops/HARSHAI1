import React, { useState } from 'react';

/**
 * PaymentModal Component
 * Premium Manual UPI QR Code Checkout Modal for Creator Pro Upgrade.
 *
 * Features:
 * 1. Prominent UPI QR display using <img src="/my-qr.jpeg" />
 * 2. Clear instructions for PhonePe, GPay, Paytm, BHIM
 * 3. 12-digit UTR / Transaction ID input with validation
 * 4. Submit Payment button with confirmation toast/alert
 */
export function PaymentModal({
  isOpen = true,
  onClose = () => {},
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

  if (!isOpen) return null;

  const handleUtrChange = (e) => {
    // Clean input: remove spaces/non-alphanumeric, allow up to 20 chars (standard UPI UTR is 12 digits)
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

    // Simulate verification dispatch
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
      const successMsg = 'Payment details submitted! Your account will be upgraded shortly after verification.';
      setToastMessage(successMsg);

      // Save submission to localStorage for tracking
      try {
        const history = JSON.parse(localStorage.getItem('hcg_payment_submissions') || '[]');
        history.unshift({
          utr: utrId,
          plan: planName,
          amount,
          timestamp: new Date().toISOString(),
          status: 'pending_verification'
        });
        localStorage.setItem('hcg_payment_submissions', JSON.stringify(history));
      } catch (err) {
        console.warn('Storage error:', err);
      }

      onSuccess({ utr: utrId, plan: planName, amount });

      // Automatically close after 3 seconds or allow user to dismiss
      setTimeout(() => {
        onClose();
        setIsSubmitted(false);
        setUtrId('');
      }, 3200);
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fadeIn font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-[#064E3B] border border-[#10B981] text-white font-bold text-xs sm:text-sm px-6 py-3 rounded-full shadow-2xl flex items-center gap-2.5 backdrop-blur-md animate-bounce">
          <span className="text-base">✅</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Modal Card */}
      <div className="bg-[#0B0F1E] border border-[#1E293B] rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] text-white relative space-y-5 overflow-hidden">
        
        {/* Subtle Ambient Glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#6366F1]/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-[#EC4899]/15 rounded-full blur-3xl pointer-events-none"></div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1E293B] pb-3 relative z-10">
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-[#818CF8]">
              MANUAL UPI UPGRADE
            </div>
            <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <span>⚡</span> Upgrade to {planName}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#94A3B8] hover:text-white hover:bg-white/5 transition"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Plan Summary Banner */}
        <div className="p-3.5 rounded-2xl bg-[#10162A] border border-[#1E293B] flex items-center justify-between relative z-10">
          <div>
            <div className="text-xs font-black text-white">{planName} Pack</div>
            <div className="text-[10px] text-[#94A3B8]">
              {credits ? `⚡ ${credits.toLocaleString('en-IN')} AI Credits • ` : ''}1080p & 4K Unlocked
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-black text-[#10B981]">₹{amount}</div>
            <div className="text-[9px] text-[#64748B] font-medium">One-time payment</div>
          </div>
        </div>

        {/* Center UPI QR Code Display */}
        <div className="text-center p-4 sm:p-5 rounded-2xl bg-[#06080F] border border-[#1E293B] space-y-3 relative z-10">
          <div className="relative inline-block group">
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-[#6366F1] via-[#A855F7] to-[#EC4899] opacity-40 blur-md group-hover:opacity-75 transition duration-300"></div>
            
            {/* 1. UPI QR Code Image */}
            <div className="relative p-2 bg-black rounded-2xl border border-white/20 shadow-2xl flex items-center justify-center">
              <img
                src="/my-qr.jpeg"
                alt="UPI Payment QR Code"
                className="w-44 h-44 sm:w-48 sm:h-48 object-contain rounded-xl shadow-inner mx-auto bg-black"
                onError={(e) => {
                  // Graceful fallback to static path if root path differs
                  if (!e.target.dataset.triedStatic) {
                    e.target.dataset.triedStatic = 'true';
                    e.target.src = '/static/my-qr.jpeg';
                  }
                }}
              />
            </div>
          </div>

          {/* Supported UPI Apps Pills */}
          <div className="flex items-center justify-center gap-2 pt-1">
            <span className="px-2 py-0.5 rounded-md bg-[#5f259f]/20 border border-[#5f259f]/40 text-[#c084fc] text-[9px] font-black">
              PhonePe
            </span>
            <span className="px-2 py-0.5 rounded-md bg-[#4285F4]/20 border border-[#4285F4]/40 text-[#93c5fd] text-[9px] font-black">
              Google Pay
            </span>
            <span className="px-2 py-0.5 rounded-md bg-[#00BAF2]/20 border border-[#00BAF2]/40 text-[#7dd3fc] text-[9px] font-black">
              Paytm
            </span>
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[9px] font-black">
              BHIM UPI
            </span>
          </div>

          {/* 2. UPI Instructions */}
          <p className="text-xs text-[#CBD5E1] font-medium leading-relaxed max-w-xs mx-auto">
            Scan this QR code with any UPI App (PhonePe, GPay, Paytm) to upgrade to Pro.
          </p>
        </div>

        {/* 3. UTR Input & 4. Submit Button Form */}
        <form onSubmit={handleSubmitPayment} className="space-y-3 relative z-10">
          <div>
            <label
              htmlFor="utr-input"
              className="block text-[11px] font-extrabold text-[#94A3B8] uppercase tracking-wider mb-1.5"
            >
              12-digit UTR / Transaction ID <span className="text-[#EC4899]">*</span>
            </label>
            <div className="relative">
              <input
                id="utr-input"
                type="text"
                value={utrId}
                onChange={handleUtrChange}
                placeholder="e.g. 423589102456"
                maxLength={20}
                className={`w-full px-4 py-3 rounded-xl bg-[#10162A] border text-white text-xs sm:text-sm font-mono tracking-wider placeholder-[#475569] focus:outline-none transition ${
                  errorMsg
                    ? 'border-[#EF4444] focus:border-[#EF4444] ring-1 ring-[#EF4444]'
                    : 'border-[#1E293B] focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1]'
                }`}
                disabled={isSubmitting || isSubmitted}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[#64748B] font-mono">
                {utrId.length > 0 ? `${utrId.length} chars` : '12 Digits'}
              </span>
            </div>
            {errorMsg && (
              <p className="text-[11px] text-[#EF4444] font-bold mt-1 flex items-center gap-1">
                <span>⚠️</span> {errorMsg}
              </p>
            )}
          </div>

          {/* 4. Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || isSubmitted}
            className={`w-full py-3.5 rounded-xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl transition-all duration-200 ${
              isSubmitted
                ? 'bg-emerald-600 text-white cursor-default'
                : 'bg-gradient-to-r from-[#6366F1] via-[#8B5CF6] to-[#EC4899] hover:from-[#4F46E5] hover:to-[#DB2777] text-white shadow-indigo-600/30 hover:scale-[1.01] active:scale-[0.99] cursor-pointer'
            } disabled:opacity-60`}
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                <span>Submitting Details...</span>
              </>
            ) : isSubmitted ? (
              <>
                <span>✅ Submitted! Verifying Account...</span>
              </>
            ) : (
              <>
                <span>Submit Payment</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </>
            )}
          </button>

          {/* Trust Guarantee Note */}
          <p className="text-[10px] text-center text-[#64748B] pt-1">
            🔒 Manual Verification: Pro access and credits are enabled within 5–15 minutes after payment verification.
          </p>
        </form>

      </div>
    </div>
  );
}

export default PaymentModal;
