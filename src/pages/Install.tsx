import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Download,
  Smartphone,
  Zap,
  Wifi,
  Bell,
  Shield,
  Share,
  PlusSquare,
  MoreVertical,
  CheckCircle2,
  ArrowRight,
  Apple,
  Chrome,
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    // Detect platform
    const ua = navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(ua));
    setIsAndroid(/android/.test(ua));

    // Check if already installed
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
      setIsStandalone(isStandaloneMode);
      setIsInstalled(isStandaloneMode);
    };
    checkStandalone();

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const benefits = [
    {
      icon: <Zap className="h-6 w-6" />,
      title: 'Lightning Fast',
      description: 'Loads instantly, even on slow connections',
    },
    {
      icon: <Wifi className="h-6 w-6" />,
      title: 'Works Offline',
      description: 'Browse listings without internet',
    },
    {
      icon: <Bell className="h-6 w-6" />,
      title: 'Push Notifications',
      description: 'Get notified about bookings & messages',
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: 'Secure & Private',
      description: 'Your data stays on your device',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="py-16 md:py-24 bg-gradient-to-br from-primary/10 via-background to-vendibook-cream">
          <div className="container">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 text-primary mb-6">
                <Download className="h-10 w-10" />
              </div>

              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                Install Vendibook
              </h1>
              <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
                Add Vendibook to your home screen for a faster, app-like experience with offline
                access and push notifications.
              </p>

              {isInstalled || isStandalone ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-6 py-3 rounded-full">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-medium">Vendibook is installed!</span>
                  </div>
                  <Button asChild size="lg">
                    <Link to="/">
                      Go to Home
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                </div>
              ) : deferredPrompt ? (
                <Button size="lg" onClick={handleInstallClick} className="text-lg px-8">
                  <Download className="mr-2 h-5 w-5" />
                  Install Now
                </Button>
              ) : (
                <div className="text-muted-foreground">
                  See instructions below for your device
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-16 bg-white">
          <div className="container">
            <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-12">
              Why Install?
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
              {benefits.map((benefit, i) => (
                <Card key={i} className="text-center card-hover">
                  <CardContent className="p-6">
                    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary mx-auto mb-4">
                      {benefit.icon}
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">{benefit.title}</h3>
                    <p className="text-sm text-muted-foreground">{benefit.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Installation Instructions */}
        {!isInstalled && !isStandalone && (
          <section className="py-16 bg-vendibook-cream">
            <div className="container">
              <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-4">
                How to Install
              </h2>
              <p className="text-center text-muted-foreground mb-12">
                Follow the steps for your device
              </p>

              <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                {/* iOS Instructions */}
                <Card className={isIOS ? 'ring-2 ring-primary' : ''}>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center text-white">
                        <Apple className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">iPhone & iPad</h3>
                        <p className="text-sm text-muted-foreground">Safari browser</p>
                      </div>
                      {isIOS && (
                        <span className="ml-auto text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                          Your device
                        </span>
                      )}
                    </div>

                    <ol className="space-y-4">
                      <li className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium shrink-0">
                          1
                        </div>
                        <div>
                          <p className="font-medium text-foreground">Tap the Share button</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Share className="h-4 w-4" /> at the bottom of Safari
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium shrink-0">
                          2
                        </div>
                        <div>
                          <p className="font-medium text-foreground">Scroll and tap "Add to Home Screen"</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <PlusSquare className="h-4 w-4" /> in the share menu
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium shrink-0">
                          3
                        </div>
                        <div>
                          <p className="font-medium text-foreground">Tap "Add"</p>
                          <p className="text-sm text-muted-foreground">
                            Vendibook will appear on your home screen
                          </p>
                        </div>
                      </li>
                    </ol>
                  </CardContent>
                </Card>

                {/* Android Instructions */}
                <Card className={isAndroid ? 'ring-2 ring-primary' : ''}>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white">
                        <Chrome className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">Android</h3>
                        <p className="text-sm text-muted-foreground">Chrome browser</p>
                      </div>
                      {isAndroid && (
                        <span className="ml-auto text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                          Your device
                        </span>
                      )}
                    </div>

                    <ol className="space-y-4">
                      <li className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium shrink-0">
                          1
                        </div>
                        <div>
                          <p className="font-medium text-foreground">Tap the menu button</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <MoreVertical className="h-4 w-4" /> three dots in Chrome
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium shrink-0">
                          2
                        </div>
                        <div>
                          <p className="font-medium text-foreground">Tap "Install app" or "Add to Home screen"</p>
                          <p className="text-sm text-muted-foreground">
                            Option may appear as a banner too
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium shrink-0">
                          3
                        </div>
                        <div>
                          <p className="font-medium text-foreground">Confirm installation</p>
                          <p className="text-sm text-muted-foreground">
                            Vendibook will appear in your app drawer
                          </p>
                        </div>
                      </li>
                    </ol>
                  </CardContent>
                </Card>
              </div>

              {/* Desktop Note */}
              {!isMobile && (
                <div className="mt-8 text-center">
                  <p className="text-muted-foreground">
                    <Smartphone className="inline h-4 w-4 mr-1" />
                    Visit this page on your phone for the best install experience
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="py-16 bg-white">
          <div className="container">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-2xl font-bold text-foreground mb-4">
                Ready to get started?
              </h2>
              <p className="text-muted-foreground mb-6">
                Browse food trucks, trailers, and spaces near you.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg">
                  <Link to="/search">Browse Listings</Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link to="/list">List Your Asset</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Install;
