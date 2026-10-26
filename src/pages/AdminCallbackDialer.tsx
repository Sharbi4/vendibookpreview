import { useEffect, useRef, useState } from "react";
import { FunctionsHttpError } from "@supabase/supabase-js";
import type { Call, Device } from "@twilio/voice-sdk";
import { Mic, MicOff, Phone, PhoneOff, RefreshCw, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AdminSectionNav from "@/components/admin/AdminSectionNav";
import SEO from "@/components/SEO";
import { BUSINESS_CALLER_LABEL, validateDestination } from "../../supabase/functions/_shared/callbackDialer";

type Phase = "idle" | "checking-mic" | "connecting" | "ringing" | "in-call" | "ended" | "error";
type Readiness = { ready: boolean; missing: string[]; voice_url: string };
type HistoryRow = { id: string; to_number: string; status: string; duration_seconds: number | null; created_at: string };

async function call<T>(body: object): Promise<T> {
  const { data, error } = await supabase.functions.invoke("callback-dialer", { body });
  if (error) {
    let msg = error.message;
    if (error instanceof FunctionsHttpError) {
      try { msg = (await error.context.json()).error ?? msg; } catch { /* keep generic */ }
    }
    throw new Error(msg);
  }
  return data as T;
}

const PHASE_LABEL: Record<Phase, string> = {
  idle: "Ready", "checking-mic": "Checking microphone…", connecting: "Connecting…", ringing: "Ringing…",
  "in-call": "On the call", ended: "Call ended", error: "Something went wrong",
};

const AdminCallbackDialer = () => {
  const [to, setTo] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState("");
  const [muted, setMuted] = useState(false);
  const [mic, setMic] = useState<"unknown" | "granted" | "denied">("unknown");
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [denied, setDenied] = useState(false);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const deviceRef = useRef<Device | null>(null);
  const callRef = useRef<Call | null>(null);

  const load = async () => {
    try {
      setReadiness(await call<Readiness>({ action: "readiness" }));
      setHistory((await call<{ calls: HistoryRow[] }>({ action: "history" })).calls);
    } catch (e) {
      const m = e instanceof Error ? e.message : "";
      if (/administrator/i.test(m)) setDenied(true); else setMessage(m || "Couldn't load dialer status.");
    }
  };
  useEffect(() => { load(); return () => { callRef.current?.disconnect(); deviceRef.current?.destroy(); }; }, []);

  const checkMic = async () => {
    setPhase("checking-mic"); setMessage("");
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      s.getTracks().forEach((t) => t.stop());
      setMic("granted"); setPhase("idle"); return true;
    } catch {
      setMic("denied"); setPhase("error");
      setMessage("Microphone access is blocked. Allow the microphone in your browser's address bar, then try again.");
      return false;
    }
  };

  const valid = validateDestination(to);
  const busy = ["checking-mic", "connecting", "ringing", "in-call"].includes(phase);

  const startCall = async () => {
    if (!valid.ok || busy) return;
    if (!window.confirm(`Call ${valid.number} from ${BUSINESS_CALLER_LABEL}?`)) return;
    if (!(await checkMic())) return;
    setPhase("connecting"); setMuted(false);
    try {
      const { token } = await call<{ token: string }>({ action: "token" });
      const { intent } = await call<{ intent: string }>({ action: "intent", to: valid.number });
      const { Device } = await import("@twilio/voice-sdk");
      deviceRef.current?.destroy();
      const device = new Device(token, { closeProtection: true, codecPreferences: ["opus", "pcmu"] as never });
      deviceRef.current = device;
      device.on("error", (err: { message?: string }) => { setPhase("error"); setMessage(err?.message || "Calling service error."); });
      const c = await device.connect({ params: { To: valid.number, intent } });
      callRef.current = c;
      c.on("ringing", () => setPhase("ringing"));
      c.on("accept", () => setPhase("in-call"));
      c.on("disconnect", () => { setPhase("ended"); load(); });
      c.on("cancel", () => { setPhase("ended"); load(); });
      c.on("reject", () => { setPhase("ended"); load(); });
      c.on("error", (err: { message?: string }) => { setPhase("error"); setMessage(err?.message || "The call failed."); });
    } catch (e) {
      setPhase("error"); setMessage(e instanceof Error ? e.message : "The call could not start.");
    }
  };

  const hangUp = () => { callRef.current?.disconnect(); deviceRef.current?.disconnectAll(); setPhase("ended"); };
  const toggleMute = () => { const c = callRef.current; if (!c) return; c.mute(!muted); setMuted(!muted); };

  if (denied) {
    return <div className="container mx-auto px-4 py-10"><p className="text-muted-foreground">Administrator access required.</p></div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <SEO title="Callback dialer | Vendibook Admin" description="Admin-only browser callback dialer." noindex />
      <AdminSectionNav />
      <h1 className="text-2xl font-semibold text-foreground">Callback dialer</h1>
      <p className="text-sm text-muted-foreground mt-1">Call one customer back from your computer. You talk, not an AI. Recording is off.</p>

      {readiness && !readiness.ready && (
        <div className="mt-5 rounded-lg border border-border bg-muted/40 p-4 text-sm">
          <p className="font-medium text-foreground">Browser calling isn't switched on yet</p>
          <p className="text-muted-foreground mt-1">Twilio setup still needed: {readiness.missing.join(", ") || "signing key"}. Calls are disabled until then.</p>
        </div>
      )}

      <section className="mt-6 rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm">
          <ShieldCheck className="h-4 w-4 text-primary" aria-hidden />
          <span className="text-foreground">From: <strong>{BUSINESS_CALLER_LABEL}</strong></span>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dial-to">Customer number</Label>
          <Input id="dial-to" inputMode="tel" autoComplete="off" placeholder="+16025551234" value={to}
            onChange={(e) => setTo(e.target.value.replace(/[^\d+]/g, "").slice(0, 12))} disabled={busy} className="text-base" />
          {to && !valid.ok && <p className="text-xs text-destructive">{"reason" in valid ? valid.reason : null}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={startCall} disabled={!valid.ok || busy || !readiness?.ready}>
            <Phone className="h-4 w-4 mr-1.5" aria-hidden />Call
          </Button>
          <Button variant="outline" onClick={toggleMute} disabled={phase !== "in-call"}>
            {muted ? <MicOff className="h-4 w-4 mr-1.5" /> : <Mic className="h-4 w-4 mr-1.5" />}{muted ? "Unmute" : "Mute"}
          </Button>
          <Button variant="destructive" onClick={hangUp} disabled={!["connecting", "ringing", "in-call"].includes(phase)}>
            <PhoneOff className="h-4 w-4 mr-1.5" aria-hidden />Hang up
          </Button>
          <Button variant="ghost" onClick={checkMic} disabled={busy}>Test microphone</Button>
        </div>
        <div role="status" aria-live="polite" className="text-sm">
          <span className="font-medium text-foreground">{PHASE_LABEL[phase]}</span>
          {mic !== "unknown" && <span className="text-muted-foreground"> · Microphone {mic === "granted" ? "allowed" : "blocked"}</span>}
          {message && <p className="text-destructive mt-1">{message}</p>}
        </div>
      </section>

      <section className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-foreground">Your recent callbacks</h2>
          <Button variant="ghost" size="sm" onClick={load}><RefreshCw className="h-4 w-4" aria-label="Refresh" /></Button>
        </div>
        {history.length === 0 ? <p className="text-sm text-muted-foreground mt-2">No calls yet.</p> : (
          <ul className="mt-2 divide-y divide-border rounded-lg border border-border">
            {history.map((h) => (
              <li key={h.id} className="flex justify-between px-4 py-2 text-sm">
                <span className="text-foreground">{h.to_number}</span>
                <span className="text-muted-foreground">{h.status}{h.duration_seconds != null ? ` · ${h.duration_seconds}s` : ""} · {new Date(h.created_at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default AdminCallbackDialer;
