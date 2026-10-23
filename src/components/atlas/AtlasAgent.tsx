import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useConversation } from '@elevenlabs/react';
import { ArrowUp, Keyboard, Loader2, MessageCircle, Mic, MicOff, Minus, Phone, PhoneOff, RotateCcw, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { invokeEdge } from '@/lib/edge/invokeFunction';
import { ATLAS_NAME } from '@/lib/atlas/atlasConfig';
import { ATLAS_PAGE_EVENT, pageOutline } from '@/lib/atlas/atlasPage';
import { createAtlasTools, liveListingIds, type AtlasListingCard, type AtlasOfferDraft, type AtlasSellerDraft } from '@/lib/atlas/atlasTools';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MakeOfferModal } from '@/components/offers/MakeOfferModal';
import { AuthGateOfferModal } from '@/components/offers/AuthGateOfferModal';
import MessageHostForm from '@/components/messaging/MessageHostForm';
import AtlasBuyerFollowUp, { type AtlasFollowUpDraft } from './AtlasBuyerFollowUp';
import AtlasMenuPreview from './AtlasMenuPreview';
import type { AtlasMenuConcept } from '@/lib/atlas/atlasMenu';
import { sendBuyerMessage } from '@/lib/atlas/atlasMessaging';
import { trackHostContacted } from '@/lib/analytics';
import { toast } from '@/hooks/use-toast';
import { ATLAS_START_EVENT, ATLAS_TOPIC_BRIEFINGS, type AtlasTopic } from '@/lib/atlas/atlasFlag';
import {
  ATLAS_RESUME_WINDOW_MS,
  buildResumeBriefing,
  clearAtlasMemory,
  loadAtlasMemory,
  saveAtlasMemory,
  type AtlasMemory,
  type AtlasTurn,
} from '@/lib/atlas/atlasMemory';
import './atlas.css';

// Production always uses the rate-limited server handoff. Direct public agent
// mode is available only with an explicit local-development override.
const AGENT_ID = import.meta.env.DEV ? ((import.meta.env.VITE_ATLAS_AGENT_ID as string | undefined) ?? '').trim() : '';
/** Set once "First message" overrides are allowed on the ElevenLabs agent. */
const CAN_OVERRIDE_FIRST_MESSAGE = import.meta.env.VITE_ATLAS_ALLOW_OVERRIDES === 'true';

type Phase = 'idle' | 'connecting' | 'live' | 'error';
type Mode = 'voice' | 'text';

/**
 * Atlas, the Vendibook sales agent. A voice call first: "Talk to Atlas" starts
 * the call, and a small call card shows who's talking and any
 * listings Atlas pulls up while he moves the buyer between pages. "Type
 * instead" is there for accessibility (and when the mic is blocked). A buyer
 * who leaves can pick the call back up within 30 minutes or start over.
 * ElevenLabs Conversational AI. App.tsx mounts it when the Atlas flag is
 * on (the public default). Page buttons start a call with
 * startAtlas() (src/lib/atlas/atlasFlag.ts).
 */
export default function AtlasAgent() {
  const navigate = useNavigate();
  const location = useLocation();
  const [phase, setPhase] = useState<Phase>('idle');
  const [mode, setMode] = useState<Mode>('voice');
  const [error, setError] = useState<{ text: string; offerTyping: boolean } | null>(null);
  // Compact named launcher by default, with the visitor's expansion remembered.
  const [minimized, setMinimizedState] = useState(() => {
    try {
      return localStorage.getItem('vb_atlas_min') !== '0';
    } catch {
      return true;
    }
  });
  const setMinimized = (v: boolean) => {
    setMinimizedState(v);
    try {
      localStorage.setItem('vb_atlas_min', v ? '1' : '0');
    } catch {
      /* private mode: just don't remember */
    }
  };
  // After Atlas points at something, the card shrinks for a few seconds so it doesn't cover it (phones).
  const [peek, setPeek] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [followUpDraft, setFollowUpDraft] = useState<AtlasFollowUpDraft | null>(null);
  const [menuConcept, setMenuConcept] = useState<AtlasMenuConcept | null>(null);
  const followUpOffered = useRef(false);
  useEffect(() => {
    let t = 0;
    const onAction = () => {
      setPeek(true);
      window.clearTimeout(t);
      t = window.setTimeout(() => setPeek(false), 7000);
    };
    window.addEventListener(ATLAS_PAGE_EVENT, onAction);
    return () => {
      window.removeEventListener(ATLAS_PAGE_EVENT, onAction);
      window.clearTimeout(t);
    };
  }, []);
  const [muted, setMuted] = useState(false);
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState('');
  const [turns, setTurns] = useState<AtlasTurn[]>([]);
  const [cards, setCards] = useState<AtlasListingCard[]>([]);
  const [saved, setSaved] = useState<AtlasMemory | null>(() => loadAtlasMemory());
  const { user } = useAuth();
  const [messageDraft, setMessageDraft] = useState<AtlasSellerDraft | null>(null);
  const [offerDraft, setOfferDraft] = useState<AtlasOfferDraft | null>(null);
  const [offerAuthGate, setOfferAuthGate] = useState(false);
  const userRef = useRef(user);
  userRef.current = user;
  const ringRef = useRef<HTMLSpanElement>(null);
  const resumeRef = useRef<AtlasMemory | null>(null);
  const goneRef = useRef<string[]>([]);
  const topicRef = useRef<AtlasTopic | null>(null);
  const pathRef = useRef(location.pathname);
  pathRef.current = location.pathname;

  // Re-check the 30-minute window while the page stays open.
  useEffect(() => {
    if (!saved) return;
    const left = saved.updatedAt + ATLAS_RESUME_WINDOW_MS - Date.now();
    const t = window.setTimeout(() => setSaved(loadAtlasMemory()), Math.max(0, left) + 1000);
    return () => window.clearTimeout(t);
  }, [saved]);

  const remember = useCallback((nextTurns: AtlasTurn[], nextCards: AtlasListingCard[]) => {
    saveAtlasMemory({ turns: nextTurns, cards: nextCards, lastPath: pathRef.current });
  }, []);

  const addTurn = useCallback((turn: AtlasTurn) => {
    setTurns((prev) => {
      const next = [...prev, turn];
      setCards((c) => { remember(next, c); return c; });
      return next;
    });
  }, [remember]);

  const tools = useMemo(
    () =>
      createAtlasTools({
        navigate: (to) => navigate(to),
        showResults: (next) => {
          setCards(next);
          setTurns((t) => { remember(t, next); return t; });
        },
        currentListingId: () => pathRef.current.match(/^\/listing\/([^/]+)/)?.[1] ?? null,
        openMessage: (d) => setMessageDraft(d),
        currentUserId: () => userRef.current?.id ?? null,
        showMenuConcept: setMenuConcept,
        openBuyerFollowUp: (draft) => {
          if (draft.declined) { followUpOffered.current = true; setFollowUpDraft(null); return false; }
          if (followUpOffered.current) return false;
          followUpOffered.current = true;
          setFollowUpDraft(draft);
          return true;
        },
        // Sends only after the buyer said yes to the draft on screen (enforced in atlasTools).
        sendSellerMessage: async (d) => {
          const buyerId = userRef.current?.id;
          if (!buyerId) throw new Error('not signed in');
          const conversationId = await sendBuyerMessage({ buyerId, listingId: d.listingId, hostId: d.hostId, body: d.message });
          trackHostContacted(d.listingId);
          setMessageDraft(null);
          toast({ title: `${ATLAS_NAME} sent your message`, description: 'The seller replies in your Vendibook inbox.' });
          return conversationId;
        },
        openOffer: (d) => {
          setOfferDraft(d);
          if (!userRef.current) setOfferAuthGate(true);
        },
      }),
    [navigate, remember],
  );

  // Every tool resolves to a string so Atlas always gets an answer.
  const clientTools = useMemo(() => {
    const wrapped: Record<string, (p: Record<string, unknown>) => Promise<string>> = {};
    for (const [name, fn] of Object.entries(tools)) {
      wrapped[name] = async (params) => {
        try {
          return await (fn as (p: Record<string, unknown>) => Promise<string>)(params ?? {});
        } catch {
          return 'That did not work just now. Apologize briefly and offer to try again or connect them with a person.';
        }
      };
    }
    return wrapped;
  }, [tools]);

  const conversation = useConversation({
    clientTools,
    micMuted: muted,
    onConnect: () => {
      setPhase('live');
      const resume = resumeRef.current;
      resumeRef.current = null;
      if (resume) window.setTimeout(() => conversation.sendContextualUpdate(buildResumeBriefing(resume, goneRef.current)), 50);
      const topic = topicRef.current;
      topicRef.current = null;
      if (topic) window.setTimeout(() => conversation.sendContextualUpdate(ATLAS_TOPIC_BRIEFINGS[topic]), 80);
    },
    onMessage: ({ source, message }) => {
      if (message?.trim()) addTurn({ from: source === 'ai' ? 'atlas' : 'you', text: message.trim() });
    },
    onError: () => {
      setError({ text: 'The call dropped. You can call Atlas again and pick up where you left off.', offerTyping: false });
      setPhase('error');
    },
    onDisconnect: () => setPhase((p) => (p === 'error' ? p : 'idle')),
  });

  const live = phase === 'live' && conversation.status === 'connected';

  // Keep Atlas aware of the page the buyer is looking at.
  useEffect(() => {
    if (!live) return;
    // Give the new page a moment to render, then tell Atlas what's on it.
    const t = window.setTimeout(() => {
      conversation.sendContextualUpdate(
        `The buyer is now viewing ${location.pathname}${location.search}. ${pageOutline()} Use look_at_page before pointing at anything.`,
      );
    }, 900);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search, live]);

  // Audio-reactive ring around Atlas's avatar (voice calls only).
  useEffect(() => {
    if (!live || mode !== 'voice') return;
    let frame = 0;
    const tick = () => {
      const level = conversation.isSpeaking ? conversation.getOutputVolume() : muted ? 0 : conversation.getInputVolume();
      ringRef.current?.style.setProperty('--atlas-level', String(Math.min(1, level * 2.2)));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [live, mode, muted, conversation]);

  const call = useCallback(
    async (opts: { mode: Mode; resume: boolean }) => {
      if (phase === 'connecting' || live) return;
      const remembered = opts.resume ? loadAtlasMemory() : null;
      // Re-check listings from the earlier call: one may have sold or been archived since.
      let memory = remembered;
      let goneTitles: string[] = [];
      if (remembered?.cards.length) {
        const live = await liveListingIds(remembered.cards.map((c) => c.id));
        goneTitles = remembered.cards.filter((c) => !live.has(c.id)).map((c) => c.title);
        memory = { ...remembered, cards: remembered.cards.filter((c) => live.has(c.id)) };
      }
      goneRef.current = goneTitles;
      if (!opts.resume) clearAtlasMemory();
      setSaved(null);
      setError(null);
      setMuted(false);
      setTyping(opts.mode === 'text');
      setMode(opts.mode);
      setTurns(memory?.turns ?? []);
      setCards(memory?.cards ?? []);
      resumeRef.current = memory;
      setPhase('connecting');
      const textOnly = opts.mode === 'text';
      const overrides = memory && CAN_OVERRIDE_FIRST_MESSAGE
        ? { agent: { firstMessage: 'Welcome back! Picking up right where we left off.' } }
        : undefined;
      try {
        // The SDK owns microphone permission and cleanup for voice sessions.
        if (AGENT_ID) {
          await conversation.startSession({ agentId: AGENT_ID, connectionType: textOnly ? 'websocket' : 'webrtc', textOnly, overrides });
        } else {
          const { data, error: edgeError } = await invokeEdge<{ token?: string; signedUrl?: string }>('atlas-agent-token', { body: { mode: opts.mode } }, { retries: 1, timeoutMs: 15000 });
          if (edgeError) throw new Error('unavailable');
          if (textOnly && data?.signedUrl) await conversation.startSession({ signedUrl: data.signedUrl, connectionType: 'websocket', textOnly: true, overrides });
          else if (!textOnly && data?.token) await conversation.startSession({ conversationToken: data.token, connectionType: 'webrtc', overrides });
          else throw new Error('unavailable');
        }
      } catch (e) {
        resumeRef.current = null;
        if (memory) setSaved(memory);
        const denied = e instanceof DOMException && (e.name === 'NotAllowedError' || e.name === 'NotFoundError');
        setError(
          denied
            ? { text: 'Atlas couldn’t use your microphone. You can allow it in your browser, or type to Atlas instead.', offerTyping: true }
            : { text: 'Atlas can’t take the call right now. Please try again in a moment.', offerTyping: false },
        );
        setPhase('error');
      }
    },
    [conversation, live, phase],
  );

  // Page buttons (e.g. /atlas "Help me list mine") start a call on a topic.
  const callRef = useRef(call);
  callRef.current = call;
  const liveRef = useRef(live);
  liveRef.current = live;
  useEffect(() => {
    const onStart = (e: Event) => {
      const { mode: m, topic } = (e as CustomEvent<{ mode: Mode; topic?: AtlasTopic }>).detail ?? {};
      if (liveRef.current) {
        if (topic) conversation.sendContextualUpdate(ATLAS_TOPIC_BRIEFINGS[topic]);
        return;
      }
      topicRef.current = topic ?? null;
      void callRef.current({ mode: m === 'text' ? 'text' : 'voice', resume: false });
    };
    window.addEventListener(ATLAS_START_EVENT, onStart);
    return () => window.removeEventListener(ATLAS_START_EVENT, onStart);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hangUp = () => {
    void conversation.endSession();
    setSaved(loadAtlasMemory());
    setPhase('idle');
  };

  const startOver = () => {
    clearAtlasMemory();
    setSaved(null);
    setTurns([]);
    setCards([]);
  };

  const send = (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !live) return;
    setDraft('');
    addTurn({ from: 'you', text });
    conversation.sendUserMessage(text);
  };

  // Development-only hook so the call card can be previewed and screenshotted
  // without a live call. Never present in production builds.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    (window as unknown as Record<string, unknown>).__atlasDemo = {
      live: (m: Mode = 'voice') => { setMode(m); setTyping(m === 'text'); setPhase('live'); },
      say: (text: string) => addTurn({ from: 'atlas', text }),
      you: (text: string) => addTurn({ from: 'you', text }),
      typeMode: (on: boolean) => setTyping(on),
      idle: () => { setPhase('idle'); setSaved(loadAtlasMemory()); },
      tool: (name: string, params: Record<string, unknown>) => clientTools[name]?.(params),
    };
  }, [clientTools, addTurn]);

  // Drafts Atlas opens for the buyer to review and send themselves.
  const drafts = (
    <>
      {menuConcept && <AtlasMenuPreview concept={menuConcept} onClose={() => setMenuConcept(null)} onFollowUp={() => {
        followUpOffered.current = true;
        setFollowUpDraft({ topic: 'Menu concept and buying help', summary: `Buyer wants to discuss ${menuConcept.listingTitle}. Menu ideas: ${menuConcept.items.map(i => i.name).join(', ')}. Equipment and operating approvals still need verification.` });
        setMenuConcept(null);
      }} />}
      {followUpDraft && <AtlasBuyerFollowUp draft={followUpDraft} cards={cards} onClose={() => setFollowUpDraft(null)} onSaved={(reference) => {
        if (live) conversation.sendContextualUpdate(`The buyer submitted their own consented email follow-up form. Saved reference ${reference}. A teammate will follow up; this is not a Calendly booking or newsletter enrollment.`);
      }} />}
      <Dialog open={Boolean(messageDraft)} onOpenChange={(o) => { if (!o) setMessageDraft(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Message the seller</DialogTitle>
          </DialogHeader>
          {messageDraft && (
            <MessageHostForm
              key={`${messageDraft.listingId}:${messageDraft.message}`}
              listingId={messageDraft.listingId}
              hostId={messageDraft.hostId}
              listingTitle={messageDraft.title}
              initialMessage={messageDraft.message}
            />
          )}
        </DialogContent>
      </Dialog>
      <AuthGateOfferModal
        open={offerAuthGate}
        onOpenChange={(o) => { setOfferAuthGate(o); if (!o && !userRef.current) setOfferDraft(null); }}
        onAuthSuccess={() => setOfferAuthGate(false)}
      />
      {offerDraft && (
        <MakeOfferModal
          open={!offerAuthGate && Boolean(user)}
          onOpenChange={(o) => { if (!o) setOfferDraft(null); }}
          listingId={offerDraft.listingId}
          sellerId={offerDraft.hostId}
          listingTitle={offerDraft.title}
          askingPrice={offerDraft.askingPrice}
          initialAmount={offerDraft.amount}
          initialMessage={offerDraft.message}
        />
      )}
    </>
  );

  const onListing = /^\/listing\//.test(location.pathname);
  const talking = live && mode === 'voice' && conversation.isSpeaking;

  if (phase === 'idle') {
    // The /atlas page has its own big call buttons; skip the corner widget there.
    if (location.pathname === '/atlas') return drafts;
    if (minimized && !saved) {
      return (
        <>{drafts}
        <button
          data-atlas-ui
          type="button"
          className={cn('atlas-orb-btn', onListing && 'is-raised')}
          onClick={() => setMinimized(false)}
          aria-label={`Open ${ATLAS_NAME}, Vendibook AI sales assistant`}
          aria-expanded={false}
        >
          <AtlasOrb size={42} /><span className="atlas-launcher-label">Ask {ATLAS_NAME}<small>AI sales assistant</small></span>
        </button>
        </>
      );
    }
    return (
      <>{drafts}
      {/* Phones and tablets: one small pill instead of the full card. */}
      <div data-atlas-ui className={cn('atlas-chip-wrap', onListing && 'is-raised')}>
        <button
          type="button"
          className="atlas-chip"
          onClick={() => void call({ mode: 'voice', resume: Boolean(saved) })}
          aria-label={saved ? `Resume your call with ${ATLAS_NAME}` : `Speak to ${ATLAS_NAME}, AI sales assistant`}
        >
          <AtlasOrb size={30} />
          <span className="atlas-chip-text">
            {saved ? `Resume ${ATLAS_NAME}` : <><b>{ATLAS_NAME}</b> · AI sales assistant</>}
          </span>
          <Phone className="atlas-chip-icon" aria-hidden="true" />
        </button>
        <button type="button" className="atlas-chip-x atlas-chip-chat" onClick={() => void call({ mode: 'text', resume: Boolean(saved) })} aria-label={`Chat with ${ATLAS_NAME} by typing instead`}><MessageCircle className="h-4 w-4" aria-hidden="true" /></button>
        {!saved && (
          <button type="button" className="atlas-chip-x" onClick={() => setMinimized(true)} aria-label={`Minimize ${ATLAS_NAME}`}>
            <Minus className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </div>
      <section data-atlas-ui className={cn('atlas-widget', onListing && 'is-raised')} aria-label={`Speak to our agent ${ATLAS_NAME}`}>
        <div className="atlas-widget-head">
          <AtlasOrb size={42} />
          <div className="min-w-0 flex-1">
            <p className="atlas-widget-title">{saved ? 'Pick up where you left off?' : `${ATLAS_NAME} · AI sales assistant`}</p>
            <p className="atlas-widget-sub">{saved ? `${ATLAS_NAME} remembers your call.` : 'Find, compare and negotiate by voice.'}</p>
          </div>
          {!saved && (
            <button type="button" className="atlas-widget-min" onClick={() => setMinimized(true)} aria-label={`Minimize ${ATLAS_NAME}`}>
              <Minus className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
        {saved ? (
          <div className="atlas-widget-actions">
            <button type="button" className="atlas-pill" onClick={() => void call({ mode: 'voice', resume: true })}>
              <Phone className="h-4 w-4" aria-hidden="true" /> Pick up
            </button>
            <button type="button" className="atlas-pill is-ghost" onClick={startOver}>Start over</button>
          </div>
        ) : (
          <div className="atlas-widget-actions">
            <button type="button" className="atlas-pill" onClick={() => void call({ mode: 'voice', resume: false })}>
              <Phone className="h-4 w-4" aria-hidden="true" /> Start a call
            </button>
            <button
              type="button"
              className="atlas-round"
              onClick={() => void call({ mode: 'text', resume: false })}
              aria-label={`Chat with ${ATLAS_NAME} by typing instead`}
              title="Chat by typing"
            >
              <MessageCircle className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        )}
      </section>
      </>
    );
  }

  const status =
    phase === 'connecting' ? (mode === 'voice' ? 'Calling Atlas…' : 'Connecting…')
      : phase === 'error' ? 'Call ended'
      : mode === 'text' ? 'Typing with Atlas'
      : muted ? 'You’re muted'
      : talking ? 'Atlas is talking'
      : 'Listening…';

  return (
    <>{drafts}
    <section data-atlas-ui className={cn('atlas-call', !expanded && 'is-compact', onListing && 'is-raised', peek && 'is-peek', (messageDraft || offerDraft || offerAuthGate || followUpDraft || menuConcept) && 'is-behind')} role="region" aria-label={`Call with ${ATLAS_NAME}`}>
      <div className="atlas-call-top">
        <span ref={ringRef} className={cn('atlas-ring', phase === 'live' && mode === 'voice' && 'is-on', talking && 'is-talking')}>
          <AtlasOrb size={52} active={talking} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="atlas-name">{ATLAS_NAME} <span className="atlas-role">· Vendibook sales</span></p>
          <p className="atlas-status" aria-live="polite">
            {phase === 'connecting' && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
            {phase === 'live' && <span className={cn('atlas-dot is-on', talking && 'is-talking')} aria-hidden="true" />}
            {status}
          </p>
        </div>
        <button type="button" className="atlas-x" onClick={() => { setExpanded(v => !v); setPeek(false); }} aria-label={expanded ? 'Minimize Atlas panel' : 'Expand Atlas panel'} aria-expanded={expanded}>{expanded ? <Minus className="h-4 w-4" /> : <span aria-hidden="true">↗</span>}</button>
        {phase === 'error' && (
          <button type="button" className="atlas-x" onClick={() => setPhase('idle')} aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {phase === 'error' && error && (
        <p role="alert" className="atlas-error">{error.text}</p>
      )}

      {expanded && !peek && cards.length > 0 && phase !== 'error' && (
        <div className="atlas-strip" aria-label="Listings Atlas found">
          {cards.map((c) => (
            <Link key={c.id} to={`/listing/${c.id}`} className="atlas-tile">
              <span className="atlas-tile-photo">{c.photo ? <img src={c.photo} alt="" loading="lazy" /> : null}</span>
              <span className="atlas-tile-title">{c.title}</span>
              <span className="atlas-tile-meta">{c.priceText}</span>
            </Link>
          ))}
        </div>
      )}

      {typing && phase === 'live' && (
        <form className="atlas-input" onSubmit={send}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Type to Atlas…"
            aria-label={`Type a message to ${ATLAS_NAME}`}
            maxLength={500}
            autoFocus
          />
          <button type="submit" aria-label="Send" disabled={!draft.trim()}>
            <ArrowUp className="h-4 w-4" />
          </button>
        </form>
      )}

      <div className="atlas-controls">
        {phase === 'error' ? (
          error?.offerTyping ? (
            <button type="button" className="atlas-btn is-call" onClick={() => void call({ mode: 'text', resume: Boolean(loadAtlasMemory()) })}>
              <Keyboard className="h-4 w-4" aria-hidden="true" /> Type to Atlas
            </button>
          ) : (
            <button type="button" className="atlas-btn is-call" onClick={() => void call({ mode: 'voice', resume: Boolean(loadAtlasMemory()) })}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" /> Call again
            </button>
          )
        ) : (
          <>
            {mode === 'voice' && (
              <button
                type="button"
                className={cn('atlas-btn', muted && 'is-active')}
                onClick={() => setMuted((m) => !m)}
                disabled={phase !== 'live'}
                aria-pressed={muted}
              >
                {muted ? <MicOff className="h-4 w-4" aria-hidden="true" /> : <Mic className="h-4 w-4" aria-hidden="true" />}
                {muted ? 'Unmute' : 'Mute'}
              </button>
            )}
            {mode === 'voice' && (
              <button
                type="button"
                className={cn('atlas-btn', typing && 'is-active')}
                onClick={() => setTyping((t) => !t)}
                disabled={phase !== 'live'}
                aria-pressed={typing}
              >
                <Keyboard className="h-4 w-4" aria-hidden="true" /> Type
              </button>
            )}
            <button type="button" className="atlas-btn is-end" onClick={() => {
              hangUp();
              if (cards.length && !followUpOffered.current) {
                followUpOffered.current = true;
                setFollowUpDraft({ topic: 'Continue my buying shortlist', summary: 'Buyer ended an Atlas conversation after viewing listings and may request an email follow-up using this form.' });
              }
            }}>
              <PhoneOff className="h-4 w-4" aria-hidden="true" /> End
            </button>
          </>
        )}
      </div>
      <p className="atlas-fine">Atlas is an AI sales assistant. Calls may be recorded to improve service.</p>
    </section>
    </>
  );
}

/** Animated flame-colored orb: Atlas's face on the widget and call card. */
function AtlasOrb({ size, active = false }: { size: number; active?: boolean }) {
  return <span className={cn('atlas-orb', active && 'is-active')} style={{ width: size, height: size }} aria-hidden="true" />;
}
