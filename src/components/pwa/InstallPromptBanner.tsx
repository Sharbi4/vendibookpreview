import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X, Download, Share, PlusSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'vendibook-install-banner-dismissed';
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const InstallPromptBanner = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed as standalone
    const standaloneCheck =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standaloneCheck);

    if (standaloneCheck) return; // Don't show if already installed

    // Check if banner was recently dismissed
    const dismissedAt = localStorage.getItem(DISMISSED_KEY);
    if (dismissedAt && Date.now() - parseInt(dismissedAt, 10) < DISMISS_DURATION_MS) {
      return;
    }

    // Detect iOS
    const ua = navigator.userAgent.toLowerCase();
    const isiOS = /iphone|ipad|ipod/.test(ua);
    setIsIOS(isiOS);

    // For iOS, show banner after a delay (since beforeinstallprompt doesn't fire)
    if (isiOS) {
      const timer = setTimeout(() => setShowBanner(true), 3000);
      return () => clearTimeout(timer);
    }

    // For Chrome/Edge - listen for the install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Show banner for desktop Chrome users after engagement
    const isDesktopChrome = /chrome/i.test(ua) && !/mobile/i.test(ua);
    if (isDesktopChrome) {
      const timer = setTimeout(() => setShowBanner(true), 5000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      };
    }

    // For Android Chrome, also show after delay if prompt hasn't fired
    const timer = setTimeout(() => setShowBanner(true), 5000);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowBanner(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, Date.now().toString());
    setShowBanner(false);
  };

  if (isStandalone || !showBanner) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
      >
        <div className="max-w-md mx-auto bg-card border border-border rounded-2xl shadow-lg p-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Download className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground text-sm">Install Vendibook</h3>
              {isIOS ? (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Tap <Share className="inline h-3 w-3" /> then "Add to Home Screen" <PlusSquare className="inline h-3 w-3" />
                </p>
              ) : deferredPrompt ? (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Get the full app experience
                </p>
              ) : (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Add to home screen for quick access
                </p>
              )}
            </div>
            <button
              onClick={handleDismiss}
              className="text-muted-foreground hover:text-foreground p-1 -m-1"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 flex gap-2">
            {deferredPrompt ? (
              <Button onClick={handleInstall} size="sm" className="flex-1">
                <Download className="h-4 w-4 mr-1" />
                Install Now
              </Button>
            ) : (
              <Button asChild size="sm" className="flex-1">
                <Link to="/install">
                  <Download className="h-4 w-4 mr-1" />
                  How to Install
                </Link>
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={handleDismiss}>
              Later
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default InstallPromptBanner;
