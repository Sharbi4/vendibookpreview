import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Home, Store, Truck, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import confetti from 'canvas-confetti';

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

  // Form fields
  const [zipCode, setZipCode] = useState('');
  const [budget, setBudget] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [sellItem, setSellItem] = useState('');

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return;
    const t = setTimeout(() => {
      // Skip if newsletter popup is still showing
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

      // Fire admin notification (best-effort)
      supabase.functions.invoke('send-admin-notification', {
        body: {
          type: 'new_booking', // reuse existing type for admin alert
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

      // Auto-close after 5s
      setTimeout(dismiss, 5000);
    } catch {
      // Silently fail — don't block the user
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

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={dismiss}
        >
          <motion.div
            className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={dismiss}
              className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-gray-100 transition-colors z-10"
              aria-label="Close"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>

            <div className="p-6">
              {/* STEP 1: Segmentation */}
              {step === 'segment' && (
                <div className="space-y-4">
                  <div className="text-center space-y-1">
                    <h3 className="text-lg font-semibold text-gray-900">How can we help you today?</h3>
                    <p className="text-sm text-gray-500">Select an option to get started.</p>
                  </div>

                  <div className="space-y-2.5 pt-2">
                    <button
                      onClick={() => selectIntent('rent')}
                      className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all text-left group"
                    >
                      <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                        <Home className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <span className="font-medium text-gray-900 text-sm">I want to Rent</span>
                        <p className="text-xs text-gray-500">Finding a Kitchen or Parking</p>
                      </div>
                    </button>

                    <button
                      onClick={() => selectIntent('host')}
                      className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all text-left group"
                    >
                      <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                        <Store className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <span className="font-medium text-gray-900 text-sm">I want to Host</span>
                        <p className="text-xs text-gray-500">Listing my Space</p>
                      </div>
                    </button>

                    <button
                      onClick={() => selectIntent('sell')}
                      className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all text-left group"
                    >
                      <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
                        <Truck className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                        <span className="font-medium text-gray-900 text-sm">I want to Sell</span>
                        <p className="text-xs text-gray-500">Selling a Truck or Equipment</p>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: Data Capture */}
              {step === 'form' && intent && (
                <div className="space-y-4">
                  <div className="text-center space-y-1">
                    <h3 className="text-lg font-semibold text-gray-900">
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
                          className="h-10 border-gray-200 focus-visible:ring-blue-500"
                          maxLength={10}
                        />
                        <select
                          value={budget}
                          onChange={(e) => setBudget(e.target.value)}
                          className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                        >
                          <option value="">Monthly Budget</option>
                          {budgetOptions.map((b) => (
                            <option key={b.label} value={b.label}>
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
                        className="h-10 border-gray-200 focus-visible:ring-blue-500"
                      />
                    )}

                    {intent === 'sell' && (
                      <Input
                        placeholder="What are you selling?"
                        value={sellItem}
                        onChange={(e) => setSellItem(e.target.value)}
                        className="h-10 border-gray-200 focus-visible:ring-blue-500"
                      />
                    )}

                    <Input
                      placeholder="Full Name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="h-10 border-gray-200 focus-visible:ring-blue-500"
                    />
                    <Input
                      type="email"
                      placeholder="Email Address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-10 border-gray-200 focus-visible:ring-blue-500"
                    />
                  </div>

                  <button
                    onClick={handleSubmit}
                    disabled={!isFormValid() || submitting}
                    className="w-full h-11 bg-black text-white rounded-lg font-medium text-sm hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed mt-1"
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
                    className="w-full text-center text-xs text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    ← Back
                  </button>
                </div>
              )}

              {/* STEP 3: Success */}
              {step === 'success' && (
                <div className="space-y-4 text-center py-2">
                  <motion.div
                    className="mx-auto w-14 h-14 rounded-full bg-green-100 flex items-center justify-center"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                  >
                    <Check className="w-7 h-7 text-green-600" />
                  </motion.div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-gray-900">We're on it.</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {intent === 'rent'
                        ? `Thanks! Our team is now manually scouting ${zipCode || 'your area'} for spaces${budget ? ` within your ${budget} budget` : ''}. Expect a text or email within 24 hours.`
                        : 'Thanks! An expert will review your details and reach out shortly to verify your spot.'}
                    </p>
                  </div>

                  <p className="text-xs text-gray-400 italic">
                    You've been assigned to a dedicated agent. No bots here.
                  </p>

                  <div className="space-y-2 pt-1">
                    <button
                      onClick={dismiss}
                      className="w-full h-10 bg-black text-white rounded-lg font-medium text-sm hover:bg-gray-800 transition-colors"
                    >
                      Back to Browsing
                    </button>
                    <a
                      href="https://wa.me/18778836342"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-xs text-blue-600 hover:underline"
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
