import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { isPlausibleFullName, legalNameError } from "@/lib/legalName";

/**
 * Signed-in members whose profile name isn't a plausible full legal name
 * must enter one before continuing (trust & safety). Admins are exempt.
 */
export default function LegalNamePrompt({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let current = true;
    setOpen(false);
    if (!user) return;
    (async () => {
      const [{ data: p }, { data: admin }] = await Promise.all([
        supabase.from("profiles").select("full_name, first_name, last_name").eq("id", user.id).maybeSingle(),
        supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }),
      ]);
      if (!current || !p || admin) return;
      if (!isPlausibleFullName(p.full_name, p.first_name, p.last_name)) {
        setFirst(p.first_name ?? "");
        setLast(p.last_name ?? "");
        setOpen(true);
      }
    })().catch(() => {});
    return () => { current = false; };
  }, [user?.id]);

  const save = async () => {
    const err = legalNameError(first, last);
    if (err) return setError(err);
    if (!user) return;
    setSaving(true);
    const f = first.trim(), l = last.trim();
    const { error: e } = await supabase.from("profiles")
      .update({ first_name: f, last_name: l, full_name: `${f} ${l}` }).eq("id", user.id);
    setSaving(false);
    if (e) return setError("Couldn't save your name. Please try again.");
    setOpen(false);
  };

  return (
    <>
      {children}
      <Dialog open={open}>
        <DialogContent className="sm:max-w-md [&>button]:hidden" onEscapeKeyDown={(e) => e.preventDefault()} onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Please confirm your full legal name</DialogTitle>
            <DialogDescription>
              Trust and safety come first at Vendibook. Buyers, sellers and hosts need to know who they're dealing with, so every member uses their real first and last name.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="lnp-first">Legal first name</Label>
              <Input id="lnp-first" autoComplete="given-name" className="text-base" value={first} onChange={(e) => { setFirst(e.target.value); setError(null); }} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="lnp-last">Legal last name</Label>
              <Input id="lnp-last" autoComplete="family-name" className="text-base" value={last} onChange={(e) => { setLast(e.target.value); setError(null); }} />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button onClick={save} disabled={saving} className="w-full">{saving ? "Saving…" : "Save and continue"}</Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
