import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useConversation } from '@elevenlabs/react';
import { Loader2, Mic, MicOff, PhoneOff, ArrowRight, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export const VENDI_VOICE_AGENT_ID = 'agent_0101kdmd2dn7exys7w22pnscqasf';

/**
 * Upsells Vendi Voice is allowed to surface.
 *
 * `href` is the default destination. Featured Boost is a one-time product, so
 * it opens the hosted PayPal product checkout for the seller's own listing
 * (`hostedSlug`). Vendibook Pro is a recurring subscription and must always go
 * through the /pricing hub first, where plan selection and the recurring
 * billing consent live — Vendi never starts a subscription by voice.
 */
const UPSELLS: Record<
  string,
  { title: string; body: string; cta: string; href: string; hostedSlug?: string }
> = {
  pro: {
    title: 'Vendibook Pro',
    body: 'Seller commission drops to 10.9%, PricePilot appraisals are included, and every billing period comes with a Featured Boost credit.',
    cta: 'See Pro plans',
    href: '/pricing',
  },
  featured: {
    title: 'Featured boost',
    body: 'Pin this listing to the top of search results in your city for 30 days. Paid securely with PayPal.',
    cta: 'Boost this listing',
    href: '/pricing',
    hostedSlug: 'boost-featured-30',
  },
  concierge: {
    title: 'Listing concierge',
    body: 'Our team writes, photographs, and polishes your listing for you.',
    cta: 'See concierge',
    href: '/pricing',
  },
  financing: {
    title: 'Buyer financing',
    body: 'Let qualified buyers apply for equipment financing on your listing.',
    cta: 'How financing works',
    href: '/financing',
  },
  freight: {
    title: 'Nationwide delivery',
    body: 'Offer shipping so buyers outside your state can commit.',
    cta: 'See freight',
    href: '/ship-your-food-truck',
  },
};

interface VendiVoiceAgentProps {
  /** Called with a spoken answer so the builder can run its normal extraction. */
  onAnswer: (text: string) => void;
  /** Plain-language context (current question + saved facts) for the agent. */
  context: string;
  disabled?: boolean;
  /** Outstanding publish blockers, spoken back on request. */
  blockers?: string[];
  /** Move the builder to the review-and-publish step. */
  onGoToReview?: () => void;
  /** True only once blockers are clear and typed-YES consent is recorded. */
  canPublish?: boolean;
  /** Runs the same publish action as the on-screen button. */
  onPublish?: () => void | Promise<void>;
  /** Opens the normal photo/video picker on screen. */
  onRequestMedia?: () => void;
  /** How many photos are already attached to the draft. */
  imageCount?: number;
  /** The seller's own listing/draft id, used to attach a Featured Boost purchase. */
  listingId?: string | null;
}

/**
 * Vendi Voice — the ElevenLabs conversational agent used inside the List with
 * Vendi chat. It only ever hands plain text back to the builder, which keeps
 * the existing explicit-facts-only extraction and publish gates in charge.
 */
const VendiVoiceAgent: React.FC<VendiVoiceAgentProps> = ({
  onAnswer,
  context,
  disabled,
  blockers = [],
  onGoToReview,
  canPublish = false,
  onPublish,
  onRequestMedia,
  imageCount = 0,
  listingId = null,
}) => {
  const navigate = useNavigate();
  const [connecting, setConnecting] = useState(false);
  const [muted, setMuted] = useState(false);
  const [upsell, setUpsell] = useState<string | null>(null);
  const answerRef = useRef(onAnswer);
  answerRef.current = onAnswer;
  // Live refs so the agent's tools always read current builder state.
  const stateRef = useRef({ blockers, canPublish, onGoToReview, onPublish, onRequestMedia, imageCount, listingId });
  stateRef.current = { blockers, canPublish, onGoToReview, onPublish, onRequestMedia, imageCount, listingId };

  /**
   * Where an upgrade card / voice checkout should send the seller.
   * One-time products (Featured Boost) open the hosted PayPal product checkout
   * scoped to this listing; Pro keeps routing through the /pricing hub.
   */
  const upsellHref = useCallback(
    (key: string) => {
      const target = UPSELLS[key];
      if (!target) return null;
      const id = stateRef.current.listingId;
      if (!target.hostedSlug || !id) return target.href;
      const params = new URLSearchParams({
        listing_id: id,
        success: `/listing/${id}`,
        cancel: '/list-with-vendi',
      });
      return `/checkout/product/${target.hostedSlug}?${params.toString()}`;
    },
    [],
  );

  const clientTools = useMemo(
    () => ({
      save_answer: ({ value }: { value: string }) => {
        const text = (value ?? '').trim();
        if (!text) return 'No answer captured.';
        answerRef.current(text);
        return 'Saved to the listing draft.';
      },
      list_missing: () => {
        const left = stateRef.current.blockers;
        return left.length
          ? `Still needed before publishing: ${left.join('; ')}.`
          : 'Nothing is missing — the listing is ready to review and publish.';
      },
      request_media_upload: () => {
        const { onRequestMedia: open, imageCount: count } = stateRef.current;
        if (!open) return 'The photo picker is not available on this step.';
        open();
        return count
          ? `Opened the photo and video picker on screen. ${count} photo${count === 1 ? '' : 's'} attached so far — new files are added, nothing is replaced.`
          : 'Opened the photo and video picker on screen. Choose photos or a short video and they attach to the draft.';
      },
      media_status: () => {
        const count = stateRef.current.imageCount;
        return count
          ? `${count} photo${count === 1 ? '' : 's'} attached to this listing.`
          : 'No photos attached yet — at least one photo is required to publish.';
      },
      go_to_review: () => {
        stateRef.current.onGoToReview?.();
        return 'Opened the review and publish step on screen.';
      },
      publish_listing: async () => {
        const { canPublish: ok, onPublish: run, blockers: left } = stateRef.current;
        if (left.length) return `Cannot publish yet. Missing: ${left.join('; ')}.`;
        if (!ok || !run) {
          stateRef.current.onGoToReview?.();
          return 'The seller must read the disclosure and type YES on screen before publishing. I opened the review step.';
        }
        await run();
        return 'Publish started. Confirmation appears on screen.';
      },
      open_checkout: ({ product }: { product: string }) => {
        const key = (product ?? '').toLowerCase();
        const target = UPSELLS[key];
        if (!target) return 'Unknown upgrade.';
        const href = upsellHref(key);
        if (!href) return 'Unknown upgrade.';
        navigate(href);
        if (key === 'featured') {
          return stateRef.current.listingId
            ? 'Opened the Featured Boost checkout for this listing. The seller reviews the price and pays with PayPal on screen — nothing is charged until they approve it there.'
            : 'Opened the boost options page. The listing has to be saved before a boost can be attached to it.';
        }
        if (key === 'pro') {
          return 'Opened the Vendibook Pro plans page. The seller picks a plan and approves the recurring PayPal billing there — I cannot start a subscription for them.';
        }
        return `Opened the ${target.title} page where payment is completed securely.`;
      },
      suggest_upgrade: ({ product }: { product: string }) => {
        const key = (product ?? '').toLowerCase();
        if (!UPSELLS[key]) return 'Unknown upgrade.';
        setUpsell(key);
        return `Showed the ${UPSELLS[key].title} card on screen.`;
      },
      dismiss_upgrade: () => {
        setUpsell(null);
        return 'Dismissed.';
      },
    }),
    [navigate, upsellHref],
  );


  // Tracks whether the seller ended the call on purpose, so an unexpected
  // drop can be explained instead of silently vanishing.
  const intentionalStopRef = useRef(false);
  const startingRef = useRef(false);

  const conversation = useConversation({
    clientTools,
    onDisconnect: (details: unknown) => {
      const reason =
        (details as { reason?: string; message?: string } | undefined)?.reason ??
        (details as { message?: string } | undefined)?.message;
      if (intentionalStopRef.current) {
        intentionalStopRef.current = false;
        return;
      }
      console.warn('Vendi Voice disconnected:', details);
      toast.message('Voice call ended', {
        description: reason
          ? `Vendi dropped the call (${reason}). Tap “Talk to Vendi” to reconnect — typing keeps working.`
          : 'Vendi dropped the call. Tap “Talk to Vendi” to reconnect — typing keeps working.',
      });
    },
    onError: (error: unknown) => {
      console.error('Vendi Voice error:', error);
      toast.error('Voice ended unexpectedly. You can keep typing.');
    },
  });

  const connected = conversation.status === 'connected';

  const start = useCallback(async () => {
    // A second startSession while one is in flight reuses a single-use token
    // and drops the freshly-opened call, so only one attempt may run.
    if (startingRef.current) return;
    startingRef.current = true;
    setConnecting(true);

    // Permission probe only — the SDK opens its own capture track, and leaving
    // this one live competes with it and can drop the call seconds later.
    try {
      const probe = await navigator.mediaDevices.getUserMedia({ audio: true });
      probe.getTracks().forEach((t) => t.stop());
    } catch {
      startingRef.current = false;
      setConnecting(false);
      toast.error('Allow microphone access to talk with Vendi.');
      return;
    }

    try {
      const [{ data: sessionData }, { data, error }] = await Promise.all([
        supabase.auth.getSession(),
        supabase.functions.invoke('elevenlabs-agent-token', {
          body: { agentId: VENDI_VOICE_AGENT_ID },
        }),
      ]);
      if (error || !data?.token) throw new Error('token');

      const accessToken = sessionData.session?.access_token;
      const userId = sessionData.session?.user?.id;
      // Vendi's tool server authenticates with this token. Without it the
      // agent's tool handshake fails and the platform tears the call down a
      // few seconds after it connects, so refuse to start instead.
      if (!accessToken || !userId) {
        toast.error('Your session expired — sign in again to use Vendi Voice.');
        return;
      }

      intentionalStopRef.current = false;
      await conversation.startSession({
        conversationToken: data.token,
        connectionType: 'webrtc',
        // ElevenLabs' MCP configuration API normalizes the configured variable
        // name to `{{access_token}}`. Send both representations so the current
        // MCP resolver and SDK clients can resolve the same short-lived session
        // token instead of terminating the call after the first message.
        dynamicVariables: {
          access_token: accessToken,
          '{{access_token}}': accessToken,
          user_id: userId,
        },
      });
      try {
        if (context) conversation.sendContextualUpdate(context);
      } catch (ctxErr) {
        console.warn('Vendi Voice context update skipped:', ctxErr);
      }
      setMuted(false);
    } catch (err) {
      console.error('Vendi Voice start failed:', err);
      toast.error('Voice is unavailable right now — typing still works perfectly.');
    } finally {
      startingRef.current = false;
      setConnecting(false);
    }
  }, [conversation, context]);

  const stop = useCallback(() => {
    intentionalStopRef.current = true;
    void conversation.endSession();
  }, [conversation]);

  // Keep the agent aware of where the seller is in the interview.
  useEffect(() => {
    if (!connected || !context) return;
    try {
      conversation.sendContextualUpdate(context);
    } catch (err) {
      console.warn('Vendi Voice context update skipped:', err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, context]);

  useEffect(() => () => {
    intentionalStopRef.current = true;
    void conversation.endSession();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps


  const toggleMute = useCallback(async () => {
    const next = !muted;
    await conversation.setVolume({ volume: next ? 0 : 1 });
    setMuted(next);
  }, [conversation, muted]);

  const card = upsell ? UPSELLS[upsell] : null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {!connected ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled || connecting}
            onClick={start}
            className="rounded-full border-white/12 bg-white/[0.04]"
          >
            {connecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mic className="mr-2 h-4 w-4" />}
            {connecting ? 'Connecting…' : 'Talk to Vendi'}
          </Button>
        ) : (
          <>
            <span
              className={cn(
                'flex items-center gap-2 rounded-full border border-[rgba(255,81,36,0.35)] bg-[rgba(255,81,36,0.1)] px-3 py-1.5 text-xs font-medium text-foreground',
              )}
            >
              <span
                className={cn(
                  'h-2 w-2 rounded-full bg-[rgb(255,81,36)]',
                  conversation.isSpeaking ? 'animate-pulse' : '',
                )}
              />
              {conversation.isSpeaking ? 'Vendi is speaking' : 'Listening…'}
            </span>
            <Button type="button" size="sm" variant="ghost" onClick={toggleMute} className="rounded-full text-muted-foreground">
              {muted ? <MicOff className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
              {muted ? 'Unmute' : 'Mute'}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={stop} className="rounded-full text-muted-foreground">
              <PhoneOff className="mr-2 h-4 w-4" /> End
            </Button>
          </>
        )}
      </div>

      <AnimatePresence>
        {card && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="rounded-[18px] border border-white/[0.09] bg-white/[0.04] p-4"
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-full bg-[rgba(255,81,36,0.12)] text-[rgb(255,81,36)]">
                <Rocket className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{card.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{card.body}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button asChild size="sm" className="rounded-full">
                    <Link to={(upsell && upsellHref(upsell)) || card.href}>
                      {card.cta} <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="rounded-full text-muted-foreground"
                    onClick={() => setUpsell(null)}
                  >
                    Not now
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VendiVoiceAgent;
