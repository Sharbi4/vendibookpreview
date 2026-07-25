import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Compass, LayoutDashboard, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Log dead URLs so we can find and fix broken links.
    console.error(
      '404 Error: User attempted to access non-existent route:',
      location.pathname + location.search,
    );
    try {
      // Best-effort structured log; ignore if the error logger isn't ready.
      void import('@/lib/errorLogger')
        .then((m: { logErrorEvent?: (e: unknown) => void }) => {
          m.logErrorEvent?.({
            kind: 'not_found',
            path: location.pathname + location.search,
            referrer: typeof document !== 'undefined' ? document.referrer : '',
          });
        })
        .catch(() => {
          /* logger optional */
        });
    } catch {
      /* noop */
    }
  }, [location.pathname, location.search]);

  const canGoBack =
    typeof window !== 'undefined' && window.history.length > 1;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Compass className="h-8 w-8 text-foreground/70" />
          </div>
          <h1 className="mt-5 text-2xl font-semibold text-foreground">
            We couldn't find that page
          </h1>
          <p className="mt-2 text-[15px] text-foreground/70 leading-relaxed">
            The link may be broken or the page may have moved. You can head
            back, browse listings, or return to your dashboard.
          </p>

          <div className="mt-6 flex flex-col gap-2">
            <Button
              size="lg"
              onClick={() => (canGoBack ? navigate(-1) : navigate('/dashboard'))}
              className="w-full"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go back
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" asChild>
                <Link to="/browse">
                  <Compass className="mr-2 h-4 w-4" />
                  Browse
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/dashboard">
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Dashboard
                </Link>
              </Button>
            </div>
          </div>

          <p className="mt-6 text-xs text-foreground/50 break-all">
            {location.pathname}
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default NotFound;
