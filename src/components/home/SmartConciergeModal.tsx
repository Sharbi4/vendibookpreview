import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Home, Store, Truck, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import confetti from 'canvas-confetti';
import conciergeImage from '@/assets/concierge-kitchen.jpg';

type Intent = 'rent' | 'host' | 'sell';
type Step = 'segment' | 'form' | 'success';

const STORAGE_KEY = 'smart_concierge_dismissed';
const DELAY_MS = 24000;

const budgetOptions = [
  { label: 'Under $500', min: 0, max: 500 },
  { label: '$500 – $1,000', min: 500, max: 1000 },
  { label: '$1,000 – $2,500', min: 1000, max: 2500 },
  { label: '$2,500+', min: 2500, max: null },
];

const SmartConciergeModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<Step>('segment');
  const [intent, setIntent] = useState<Intent | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [zipCode, setZipCode] = useState('');
  const [budget, setBudget] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [sellItem, setSellItem] = useState('');

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return;
    const t = setTimeout(() => {
      if (document.querySelector('[data-newsletter-popup]')) return;
      setIsOpen(true);
    }, DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  const dismiss = useCallback(() => {
    setIsOpen(false);
    localStorage.setItem(STORAGE_KEY, 'true');
  }, []);

  const selectIntent = (i: Intent) => {
    setIntent(i);
    setStep('form');
  };

  const fireConfetti = () => {
    confetti({ particleCount: 80, spread: 60, origin: { y: 0.55 } });
  };

  const handleSubmit = async () => {
    if (!intent || !fullName.trim() || !email.trim()) return;
    setSubmitting(true);

    try {
      const budgetEntry = budgetOptions.find((b) => b.label === budget);

      const payload: Record<string, unknown> = {
        asset_type: intent === 'rent' ? 'rental' : intent === 'host' ? 'hosting' : 'sale',
        email: email.trim(),
        city: intent === 'rent' ? zipCode.trim() : '',
        budget_min: budgetEntry?.min ?? null,
        budget_max: budgetEntry?.max ?? null,
        notes:
          intent === 'host'
            ? `Address: ${address.trim()}\nName: ${fullName.trim()}`
            : intent === 'sell'
            ? `Selling: ${sellItem.trim()}\nName: ${fullName.trim()}`
            : `Name: ${fullName.trim()}`,
        status: 'new',
      };

      await supabase.from('asset_requests').insert(payload as any);

      supabase.functions.invoke('send-admin-notification', {
        body: {
          type: 'new_booking',
          data: {
            listing_title: `Concierge Lead (${intent})`,
            start_date: new Date().toLocaleDateString(),
            end_date: '',
            total_price: budget || 'N/A',
            shopper_id: email.trim(),
            host_id: 'concierge-modal',
            message: payload.notes,
          },
        },
      });

      setStep('success');
      fireConfetti();
      setTimeout(dismiss, 5000);
    } catch {
      // Silently fail
    } finally {
      setSubmitting(false);
    }
  };

  const isFormValid = () => {
    if (!fullName.trim() || !email.trim()) return false;
    if (intent === 'rent' && !zipCode.trim()) return false;
    if (intent === 'host' && !address.trim()) return false;
    if (intent === 'sell' && !sellItem.trim()) return false;
    return true;
  };

  const glassInputClass =
    'h-10 bg-white/[0.06] border-white/[0.12] text-white placeholder:text-white/40 focus-visible:ring-[#FF5124]/40 focus-visible:border-white/20 rounded-lg';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-md px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={dismiss}
        >
          <motion.div
            className="relative w-full max-w-sm overflow-hidden rounded-2xl shadow-2xl"
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'linear-gradient(145deg, rgba(20,20,25,0.88) 0%, rgba(15,15,18,0.92) 100%)',
              backdropFilter: 'blur(40px)',
              WebkitBackdropFilter: 'blur(40px)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 25px 60px -12px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
            }}
          >
            {/* Hero image */}
            <div className="relative h-32 w-full overflow-hidden">
              <img
                src={conciergeImage}
                alt="Commercial kitchen space"
                className="w-full h-full object-cover"
              />
              <div
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(to bottom, transparent 30%, rgba(15,15,18,0.95) 100%)',
                }}
              />
              {/* Gradient accent line at top */}
              <div
                className="absolute top-0 left-0 h-[2px] w-full"
                style={{
                  background: 'linear-gradient(90deg, #FF5124, #E64A19, #FFB800)',
                }}
              />
            </div>

            {/* Close button */}
            <button
              onClick={dismiss}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-black/40 backdrop-blur-sm hover:bg-black/60 transition-colors z-10"
              aria-label="Close"
            >
              <X className="w-4 h-4 text-white/70" />
            </button>

            <div className="p-6">
              {/* STEP 1: Segmentation */}
              {step === 'segment' && (
                <div className="space-y-4">
                  <div className="text-center space-y-1">
                    <h3 className="text-lg font-semibold text-white">How can we help you today?</h3>
                    <p className="text-sm text-white/50">Select an option to get started.</p>
                  </div>

                  <div className="space-y-2.5 pt-2">
                    {[
                      { id: 'rent' as Intent, icon: Home, label: 'I want to Rent', desc: 'Finding a Kitchen or Parking' },
                      { id: 'host' as Intent, icon: Store, label: 'I want to Host', desc: 'Listing my Space' },
                      { id: 'sell' as Intent, icon: Truck, label: 'I want to Sell', desc: 'Selling a Truck or Equipment' },
                    ].map(({ id, icon: Icon, label, desc }) => (
                      <button
                        key={id}
                        onClick={() => selectIntent(id)}
                        className="w-full flex items-center gap-3 p-3.5 rounded-xl transition-all text-left group hover:scale-[1.01]"
                        style={{
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.08)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                        }}
                      >
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                          style={{
                            background: 'linear-gradient(135deg, rgba(255,81,36,0.15), rgba(255,184,0,0.1))',
                            border: '1px solid rgba(255,81,36,0.2)',
                          }}
                        >
                          <Icon className="w-5 h-5 text-[#FF5124]" />
                        </div>
                        <div>
                          <span className="font-medium text-white text-sm">{label}</span>
                          <p className="text-xs text-white/40">{desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 2: Data Capture */}
              {step === 'form' && intent && (
                <div className="space-y-4">
                  <div className="text-center space-y-1">
                    <h3 className="text-lg font-semibold text-white">
                      {intent === 'rent' && 'Find your perfect spot.'}
                      {intent === 'host' && 'List your space.'}
                      {intent === 'sell' && 'Sell your equipment.'}
                    </h3>
                  </div>

                  <div className="space-y-3 pt-1">
                    {intent === 'rent' && (
                      <>
                        <Input
                          placeholder="Zip Code"
                          value={zipCode}
                          onChange={(e) => setZipCode(e.target.value)}
                          className={glassInputClass}
                          maxLength={10}
                        />
                        <select
                          value={budget}
                          onChange={(e) => setBudget(e.target.value)}
                          className="flex h-10 w-full rounded-lg bg-white/[0.06] border border-white/[0.12] px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5124]/40 focus-visible:ring-offset-0"
                          style={{ colorScheme: 'dark' }}
                        >
                          <option value="" className="bg-[#1a1a1e] text-white/50">Monthly Budget</option>
                          {budgetOptions.map((b) => (
                            <option key={b.label} value={b.label} className="bg-[#1a1a1e] text-white">
                              {b.label}
                            </option>
                          ))}
                        </select>
                      </>
                    )}

                    {intent === 'host' && (
                      <Input
                        placeholder="Address of your space"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className={glassInputClass}
                      />
                    )}

                    {intent === 'sell' && (
                      <Input
                        placeholder="What are you selling?"
                        value={sellItem}
                        onChange={(e) => setSellItem(e.target.value)}
                        className={glassInputClass}
                      />
                    )}

                    <Input
                      placeholder="Full Name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className={glassInputClass}
                    />
                    <Input
                      type="email"
                      placeholder="Email Address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={glassInputClass}
                    />
                  </div>

                  <button
                    onClick={handleSubmit}
                    disabled={!isFormValid() || submitting}
                    className="w-full h-11 rounded-lg font-medium text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed mt-1 text-white"
                    style={{
                      background: !isFormValid() || submitting
                        ? 'rgba(255,255,255,0.08)'
                        : 'linear-gradient(135deg, #FF5124, #E64A19, #FFB800)',
                      boxShadow: isFormValid() && !submitting
                        ? '0 4px 20px -4px rgba(255,81,36,0.4)'
                        : 'none',
                    }}
                  >
                    {submitting
                      ? 'Submitting…'
                      : intent === 'rent'
                      ? 'Find Matches'
                      : intent === 'host'
                      ? 'Start Listing'
                      : 'Get an Offer'}
                  </button>

                  <button
                    onClick={() => { setStep('segment'); setIntent(null); }}
                    className="w-full text-center text-xs text-white/30 hover:text-white/60 transition-colors"
                  >
                    ← Back
                  </button>
                </div>
              )}

              {/* STEP 3: Success */}
              {step === 'success' && (
                <div className="space-y-4 text-center py-2">
                  <motion.div
                    className="mx-auto w-14 h-14 rounded-full flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255,81,36,0.2), rgba(255,184,0,0.15))',
                      border: '1px solid rgba(255,81,36,0.3)',
                    }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                  >
                    <Check className="w-7 h-7 text-[#FF5124]" />
                  </motion.div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-white">We're on it.</h3>
                    <p className="text-sm text-white/60 leading-relaxed">
                      {intent === 'rent'
                        ? `Thanks! Our team is now manually scouting ${zipCode || 'your area'} for spaces${budget ? ` within your ${budget} budget` : ''}. Expect a text or email within 24 hours.`
                        : 'Thanks! An expert will review your details and reach out shortly to verify your spot.'}
                    </p>
                  </div>

                  <p className="text-xs text-white/30 italic">
                    You've been assigned to a dedicated agent. No bots here.
                  </p>

                  <div className="space-y-2 pt-1">
                    <button
                      onClick={dismiss}
                      className="w-full h-10 rounded-lg font-medium text-sm transition-all text-white"
                      style={{
                        background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.1)',
                      }}
                    >
                      Back to Browsing
                    </button>
                    <a
                      href="https://wa.me/18778836342"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-xs text-[#FF5124] hover:text-[#FFB800] transition-colors"
                    >
                      Chat now on WhatsApp →
                    </a>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SmartConciergeModal;
