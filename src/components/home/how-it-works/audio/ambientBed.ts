// Lightweight ambient "vibe" bed built with the Web Audio API.
// No external asset — a soft evolving pad (two detuned sines + slow LFO
// through a lowpass) that sits well under a voiceover. Volume defaults to
// a very quiet -22dB so it never fights the narrator.

export interface AmbientBed {
  start: () => Promise<void>;
  stop: () => void;
  setMuted: (muted: boolean) => void;
  setVolume: (v: number) => void;
}

export const createAmbientBed = (initialVolume = 0.08): AmbientBed => {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let nodes: Array<OscillatorNode | AudioNode> = [];
  let muted = false;
  let volume = initialVolume;

  const start = async () => {
    if (ctx) return;
    const AC = (window.AudioContext || (window as any).webkitAudioContext);
    if (!AC) return;
    ctx = new AC();
    if (ctx.state === "suspended") {
      try { await ctx.resume(); } catch { /* ignore */ }
    }

    master = ctx.createGain();
    master.gain.value = muted ? 0 : volume;
    master.connect(ctx.destination);

    // Soft lowpass so the pad stays "under" the voice.
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 900;
    lp.Q.value = 0.4;
    lp.connect(master);

    // Two detuned sine oscillators — a lush minor-6th interval (A2 + F3).
    const freqs = [110, 174.6];
    const oscs: OscillatorNode[] = [];
    for (const f of freqs) {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = 0.5;
      o.connect(g).connect(lp);
      o.start();
      oscs.push(o);
      nodes.push(o, g);
    }
    // Slow LFO on filter cutoff → gentle breathing motion.
    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 250;
    lfo.connect(lfoGain).connect(lp.frequency);
    lfo.start();
    nodes.push(lfo, lfoGain, lp);

    // Fade in.
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(0, now);
    master.gain.linearRampToValueAtTime(muted ? 0 : volume, now + 1.2);
  };

  const stop = () => {
    if (!ctx || !master) return;
    const now = ctx.currentTime;
    try {
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(0, now + 0.4);
    } catch { /* ignore */ }
    const local = ctx;
    setTimeout(() => {
      nodes.forEach((n) => {
        try { (n as OscillatorNode).stop?.(); } catch { /* ignore */ }
        try { (n as AudioNode).disconnect?.(); } catch { /* ignore */ }
      });
      try { local.close(); } catch { /* ignore */ }
    }, 500);
    ctx = null;
    master = null;
    nodes = [];
  };

  const setMuted = (m: boolean) => {
    muted = m;
    if (ctx && master) {
      const now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.linearRampToValueAtTime(m ? 0 : volume, now + 0.2);
    }
  };

  const setVolume = (v: number) => {
    volume = Math.max(0, Math.min(1, v));
    if (ctx && master && !muted) {
      const now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.linearRampToValueAtTime(volume, now + 0.2);
    }
  };

  return { start, stop, setMuted, setVolume };
};
