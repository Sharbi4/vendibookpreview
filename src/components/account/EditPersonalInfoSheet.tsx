import { useState } from 'react';
import { z } from 'zod';
import { Eye, EyeOff, Loader2, Lock } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string;
  initial: { full_name: string; email: string; phone_number: string };
  onSaved: () => Promise<void> | void;
}

const NAME_RE = /^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ'’.-]*(?: [A-Za-zÀ-ÖØ-öø-ÿ'’.-]+)*$/;

const schema = z.object({
  email: z.string().trim().email('Enter a valid email').max(255),
  firstName: z
    .string()
    .trim()
    .min(2, 'Enter your legal first name')
    .max(50, 'First name is too long')
    .regex(NAME_RE, 'Use letters only for your first name'),
  lastName: z
    .string()
    .trim()
    .min(2, 'Enter your legal last name')
    .max(50, 'Last name is too long')
    .regex(NAME_RE, 'Use letters only for your last name'),
});

function splitName(full: string) {
  const parts = (full || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: '', last: '' };
  return { first: parts[0], last: parts.slice(1).join(' ') };
}

function maskPhone(p: string) {
  const digits = p.replace(/\D/g, '');
  if (digits.length < 4) return p ? '•••' : '';
  return `••• ••• ${digits.slice(-4)}`;
}

export default function EditPersonalInfoSheet({ open, onOpenChange, userId, initial, onSaved }: Props) {
  const initialName = splitName(initial.full_name);
  const [email, setEmail] = useState(initial.email);
  const [firstName, setFirstName] = useState(initialName.first);
  const [lastName, setLastName] = useState(initialName.last);
  const [saving, setSaving] = useState(false);
  const [showPhone, setShowPhone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [nameErr, setNameErr] = useState<string | null>(null);

  const nextFullName = `${firstName.trim()} ${lastName.trim()}`.trim();
  const dirty = email.trim() !== initial.email.trim() || nextFullName !== initial.full_name.trim();

  const save = async () => {
    setErr(null);
    setNameErr(null);
    const parsed = schema.safeParse({ email, firstName, lastName });
    if (!parsed.success) {
      const issue = parsed.error.errors[0];
      if (issue?.path[0] === 'email') setErr(issue.message);
      else setNameErr(issue?.message ?? 'Invalid input');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ email: email.trim(), full_name: nextFullName })
        .eq('id', userId);
      if (error) throw error;
      await onSaved();
      toast.success('Personal info updated');
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-display">Personal info</SheetTitle>
          <SheetDescription>
            These details are private. They're used for verification, receipts, and payouts.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          <div className="space-y-1.5">
            <Label className="text-sm">Legal name</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                id="acc-first-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                aria-label="First name"
                autoComplete="given-name"
                maxLength={50}
                className="h-10"
              />
              <Input
                id="acc-last-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
                aria-label="Last name"
                autoComplete="family-name"
                maxLength={50}
                className="h-10"
              />
            </div>
            {nameErr && <p className="text-xs text-destructive">{nameErr}</p>}
            <p className="text-xs text-muted-foreground">
              Use your real legal name — it's used for verification and payouts. Need help?{' '}
              <Link to="/contact" className="underline">Contact support</Link>.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="acc-email" className="text-sm">Email</Label>
            <Input
              id="acc-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10"
              autoComplete="email"
            />
            {err && <p className="text-xs text-destructive">{err}</p>}
            <p className="text-xs text-muted-foreground">Used for receipts and account recovery.</p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Phone number</Label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPhone((v) => !v)}
                  className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                >
                  {showPhone ? <><EyeOff className="h-3.5 w-3.5" />Hide</> : <><Eye className="h-3.5 w-3.5" />Reveal</>}
                </button>
                <Badge variant="outline" className="text-[10px] h-4 px-1.5"><Lock className="h-2.5 w-2.5 mr-0.5" />Locked</Badge>
              </div>
            </div>
            <Input
              value={showPhone ? initial.phone_number : maskPhone(initial.phone_number)}
              disabled
              className="h-10 bg-muted/50 tabular"
            />
            <p className="text-xs text-muted-foreground">
              Locked for security. <Link to="/contact" className="underline">Contact support</Link> to change.
            </p>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving || !dirty}>
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving</> : 'Save changes'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
