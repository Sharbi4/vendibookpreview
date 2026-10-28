import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { isPlausibleFullName, legalNameError } from "@/lib/legalName";

/**
 * Signed-in members whose profile name isn't a plausible full legal name
 * must enter one before continuing (trust & safety). Members who signed up
 * with Google confirm the name Google gave us once, since it may be a
 * nickname (name_parts_confirmed = false). Admins are exempt.
 */
export default function LegalNamePrompt({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // "confirm": the name looks complete but came from Google and hasn't been confirmed.
  const [mode, setMode] = useState<"fix" | "confirm">("fix");

  useEffect(() => {
    let current = true;
    setOpen(false);
    if (!user) return;
    (async () => {
      const [{ data: p }, { data: admin }] = await Promise.all([
        supabase.from("profiles").select("full_name, first_name, last_name, name_parts_confirmed").eq("id", user.id).maybeSingle(),
        supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }),
      ]);
      if (!current || !p || admin) return;
      const plausible = isPlausibleFullName(p.full_name, p.first_name, p.last_name);
      if (!plausible || p.name_parts_confirmed === false) {
        setMode(plausible ? "confirm" : "fix");
        // Google sign-ups often arrive with only "Gabriel" in full_name: start from it.
        const [guessFirst = "", ...rest] = (p.full_name ?? "").trim().split(/\s+/);
        setFirst(p.first_name || guessFirst);
        setLast(p.last_name || rest.join(" "));
        setOpen(true);
      }
    })().catch(() => {});
    return () => { current = false; };
  }, [user?.id]);

  const save = async (e?: FormEvent) => {
    e?.preventDefault();
    const err = legalNameError(first, last);
    if (err) return setError(err);
    if (!user) return;
    setSaving(true);
    const f = first.trim(), l = last.trim();
    const { error: saveError } = await supabase.from("profiles")
      .update({ first_name: f, last_name: l, full_name: `${f} ${l}`, legal_first_name: f, legal_last_name: l, name_parts_confirmed: true })
      .eq("id", user.id);
    setSaving(false);
    if (saveError) return setError(saveError.message?.startsWith("Please use your own name") ? saveError.message : "Couldn't save your name. Please try again.");
    setOpen(false);
  };

  return (
    <>
      {children}
      <Dialog open={open}>
        <DialogContent className="sm:max-w-md [&>button]:hidden" onEscapeKeyDown={(e) => e.preventDefault()} onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{mode === "confirm" ? "Is this your legal name?" : "Please confirm your full legal name"}</DialogTitle>
            <DialogDescription>
              {mode === "confirm"
                ? `${user?.app_metadata?.provider === "google" ? "We filled this in from your Google account." : "We split this from the name on your account."} If your legal name is different, change it here. It's used on your agreements, bills of sale and payouts; others only see your first name and last initial.`
                : "Trust and safety come first at Vendibook. Buyers, sellers and hosts need to know who they're dealing with, so every member uses their real first and last name."}
            </DialogDescription>
          </DialogHeader>
          {/* A form, not loose children: `[&>button]:hidden` (which hides the
              dialog's close X) also hid a direct-child Save button, leaving
              members stuck with no way to continue (support call 2026-10-28). */}
          <form onSubmit={save} className="grid gap-4" noValidate>
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
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          <Button type="submit" disabled={saving} className="w-full">{saving ? "Saving…" : mode === "confirm" ? "Confirm and continue" : "Save and continue"}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
