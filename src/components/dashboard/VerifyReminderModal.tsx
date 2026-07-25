import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

const VISIT_KEY = 'vb.verifyReminderVisits';
const SHOWN_KEY = 'vb.verifyReminderShown';

/**
 * After 3 dashboard visits without verifying, show a one-time centered modal
 * explaining the benefit. Never nags again after that.
 */
export const VerifyReminderModal = () => {
  const { isVerified, user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user || isVerified) return;
    try {
      if (localStorage.getItem(SHOWN_KEY) === '1') return;
      const visits = parseInt(localStorage.getItem(VISIT_KEY) || '0', 10) + 1;
      localStorage.setItem(VISIT_KEY, String(visits));
      if (visits >= 3) {
        setOpen(true);
        localStorage.setItem(SHOWN_KEY, '1');
      }
    } catch { /* noop */ }
    // Only run once per mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mx-auto h-12 w-12 rounded-full bg-amber-500/15 border border-amber-500/40 flex items-center justify-center mb-2">
            <ShieldAlert className="h-6 w-6 text-amber-500" />
          </div>
          <DialogTitle className="text-center">Verify to unlock everything</DialogTitle>
          <DialogDescription className="text-center">
            One-tap ID check unlocks publishing, higher-trust checkout, and
            faster payouts. It takes about 60 seconds and stays private.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-center gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Later</Button>
          <Button onClick={() => { setOpen(false); navigate('/verify-identity'); }}>
            Verify now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default VerifyReminderModal;
