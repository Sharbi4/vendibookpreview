import { useState } from 'react';
import { z } from 'zod';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const schema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Confirm your new password'),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export default function ChangePasswordSheet({
  open,
  onOpenChange,
  email,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  email: string;
}) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showC, setShowC] = useState(false);
  const [showN, setShowN] = useState(false);
  const [showX, setShowX] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const reset = () => { setCurrent(''); setNext(''); setConfirm(''); setErrors({}); };

  const submit = async () => {
    const p = schema.safeParse({ currentPassword: current, newPassword: next, confirmPassword: confirm });
    if (!p.success) {
      const e: Record<string, string> = {};
      p.error.errors.forEach((x) => { if (x.path[0]) e[x.path[0] as string] = x.message; });
      setErrors(e);
      return;
    }
    setBusy(true);
    setErrors({});
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: current });
      if (signInError) { setErrors({ currentPassword: 'Current password is incorrect' }); setBusy(false); return; }
      const { error } = await supabase.auth.updateUser({ password: next });
      if (error) throw error;
      toast.success('Password updated');
      reset();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not change password');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-display">Change password</SheetTitle>
          <SheetDescription>Choose a strong password you don't use elsewhere.</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {([
            { id: 'cur', label: 'Current password', v: current, set: setCurrent, show: showC, tShow: setShowC, err: errors.currentPassword },
            { id: 'new', label: 'New password', v: next, set: setNext, show: showN, tShow: setShowN, err: errors.newPassword },
            { id: 'cnf', label: 'Confirm new password', v: confirm, set: setConfirm, show: showX, tShow: setShowX, err: errors.confirmPassword },
          ]).map((f) => (
            <div key={f.id} className="space-y-1.5">
              <Label htmlFor={f.id} className="text-sm">{f.label}</Label>
              <div className="relative">
                <Input
                  id={f.id}
                  type={f.show ? 'text' : 'password'}
                  value={f.v}
                  onChange={(e) => f.set(e.target.value)}
                  className="h-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => f.tShow(!f.show)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={f.show ? 'Hide' : 'Show'}
                >
                  {f.show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {f.err && <p className="text-xs text-destructive">{f.err}</p>}
            </div>
          ))}

          <div className="pt-2 flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
            <Button onClick={submit} disabled={busy}>
              {busy ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Updating</> : 'Update password'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
