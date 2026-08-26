import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check, CloudUpload, ImagePlus, Loader2, Send, X, Wrench, Eye, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import LivePreviewPanel from '@/components/ai-listing/LivePreviewPanel';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import vendibookFavicon from '@/assets/vendibook-favicon.png';
import VendiAuthGate from '@/components/vendi-listing/VendiAuthGate';
import {
  buildListingPayload, getPublishBlockers, nextQuestion,
  promptText, resumeMessage, VENDI_WELCOME,
  Question, VendiDraft,
} from '@/lib/vendi-listing/script';
import {
  rankedNextQuestion, readinessProgress, remainingQuestionIds, READY_MESSAGE,
} from '@/lib/vendi-listing/prioritize';
import { parseCommand } from '@/lib/vendi-listing/commands';

import type { DocumentType } from '@/types/documents';
import { isSkip } from '@/lib/vendi-listing/extract';
import { publishVendiListing } from '@/lib/vendi-listing/publishVendiListing';
import {
  ActiveVendiDraft, adoptVendiSessionKey, createOrResumeVendiDraft, resolveVendiResume,
  loadRequiredDocuments, getVendiSessionKey, rotateVendiSessionKey, VendiSessionRetiredError,
} from '@/lib/vendi-listing/session';
import { deriveAnsweredFromDraft, mergeServerDraft } from '@/lib/vendi-listing/hydrate';
import { trackVendi } from '@/lib/vendi-listing/telemetry';


import {
  ATTESTATIONS,
  publishAcceptanceText,
} from '@/components/listing-wizard/stages/PublishAttestations';
import {
  CONSENT_TRIGGERS, CURRENT_VERSIONS, DOCUMENT_SLUGS, DOCUMENT_TYPES,
} from '@/lib/legalDocuments';
import { useLegalDocument } from '@/hooks/useLegalDocument';
import { useRecordConsent } from '@/hooks/useRecordConsent';
import { cn } from '@/lib/utils';


type Msg = { id: string; role: 'vendi' | 'user'; content: string };

interface LocalPhoto { id: string; file: File; url: string; kind: 'image' | 'video' }

const storageKeyFor = (userId: string) => `vendibook_list_with_vendi_v1:${userId}`;

const emptyDraft: VendiDraft = {
  title: null, description: null, category: null, mode: null,
};

interface PersistedState {
  draft: VendiDraft;
  answered: string[];
  /** Question ids already spoken aloud — prevents a prompt being asked twice. */
  asked?: string[];
  messages: Msg[];
  draftId?: string | null;
  consentId?: string | null;
  uploadedUrls?: string[];
  uploadedVideoUrls?: string[];
}


const uid = () => Math.random().toString(36).slice(2);




const VendiListingBuilder: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();

  const [draft, setDraft] = useState<VendiDraft>(emptyDraft);
  const [answered, setAnswered] = useState<string[]>([]);
  // Question ids Vendi has already spoken. Survives hydration so a restored
  // conversation never replays a prompt the seller is already looking at.
  const [asked, setAsked] = useState<string[]>([]);
  // Bumped by "Start over" so the opening runs again from a clean slate.
  const [sessionSeq, setSessionSeq] = useState(0);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [photos, setPhotos] = useState<LocalPhoto[]>([]);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const [uploadedVideoUrls, setUploadedVideoUrls] = useState<string[]>([]);
  const [reviewing, setReviewing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [consentId, setConsentId] = useState<string | null>(null);
  const [attesting, setAttesting] = useState(false);
  const [attestInput, setAttestInput] = useState('');
  const [attestError, setAttestError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [savingManually, setSavingManually] = useState(false);
  /** Server lookup for an unfinished Vendi draft has completed. */
  const [resumeChecked, setResumeChecked] = useState(false);
  /** Unfinished Vendi drafts on this account that belong to another session. */
  const [resumeOffers, setResumeOffers] = useState<ActiveVendiDraft[]>([]);

  /** Per-item media state so a retry only re-sends what actually failed. */
  const [mediaStatus, setMediaStatus] = useState<Record<string, 'pending' | 'uploading' | 'done' | 'error'>>({});
  /** Field-level history for "undo that" — the last few confirmed drafts. */
  const [history, setHistory] = useState<VendiDraft[]>([]);

  const creatingDraftRef = useRef(false);
  const resolvingRef = useRef(false);
  const publishInFlightRef = useRef(false);
  /** Durable idempotency key — one key means one listing row, server-side. */
  const sessionKeyRef = useRef<string>('');
  /** Which account the current session key belongs to (account-switch safety). */
  const sessionOwnerRef = useRef<string | null>(null);
  /** Synchronous mirror of `asked` — effects can run twice before a re-render. */
  const askedRef = useRef<Set<string>>(new Set());
  /** local media id → uploaded URL. Makes uploads dedupe-safe and resumable. */
  const uploadedByItemRef = useRef<Map<string, { url: string; kind: 'image' | 'video' }>>(new Map());
  const uploadingMediaRef = useRef(false);
  /** "Ready to publish" is announced exactly once per session. */
  const readyAnnouncedRef = useRef(false);
  const startedAnnouncedRef = useRef(false);



  const disclosureShownRef = useRef(false);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const storageKey = user ? storageKeyFor(user.id) : null;
  // Re-mint on account switch: a session key is only ever valid for its owner.
  if (user && (!sessionKeyRef.current || sessionOwnerRef.current !== user.id)) {
    sessionKeyRef.current = getVendiSessionKey(user.id);
    sessionOwnerRef.current = user.id;
  }


  // Same document + acceptance wording the step-by-step wizard records.
  const documentType = draft.mode === 'rent'
    ? DOCUMENT_TYPES.RENTER_TERMS
    : DOCUMENT_TYPES.SELLER_TERMS;
  const { data: legalDoc } = useLegalDocument(documentType);
  const recordConsent = useRecordConsent();
  const acceptanceText = publishAcceptanceText(draft.mode);

  const current: Question | null = useMemo(
    () => (reviewing ? null : nextQuestion(draft, answered)),
    [draft, answered, reviewing],
  );

  // Single opening path. A fresh seller gets exactly one welcome; a returning
  // seller gets exactly one resume line. Nothing is replayed after hydration.
  useEffect(() => {
    if (!storageKey) return;
    let restoredSession = false;
    try {
      const raw = localStorage.getItem(storageKey);
      const parsed = raw ? (JSON.parse(raw) as PersistedState) : null;
      if (parsed?.draft) {
        restoredSession = true;
        const restoredDraft = parsed.draft;
        const restoredAnswered = parsed.answered ?? [];
        const history = parsed.messages ?? [];
        const askedSet = new Set(parsed.asked ?? []);

        // If the saved conversation ends on an unanswered prompt, drop that
        // trailing bubble so the resume line reads first and the question is
        // re-stated once underneath it — never duplicated.
        const pending = nextQuestion(restoredDraft, restoredAnswered);
        const tail = history[history.length - 1];
        const trimmed =
          pending && tail?.role === 'vendi' && tail.content === promptText(pending, restoredDraft)
            ? history.slice(0, -1)
            : history;
        if (pending) askedSet.delete(pending.id);

        setDraft(restoredDraft);
        setAnswered(restoredAnswered);
        setUploadedUrls(parsed.uploadedUrls ?? []);
        setUploadedVideoUrls(parsed.uploadedVideoUrls ?? []);
        setDraftId(parsed.draftId ?? null);
        setConsentId(parsed.consentId ?? null);
        askedRef.current = askedSet;
        setAsked(Array.from(askedSet));
        setMessages([
          ...trimmed,
          { id: uid(), role: 'vendi' as const, content: resumeMessage(restoredDraft, restoredAnswered) },
        ]);
      }
    } catch { /* ignore corrupt state */ }

    if (!restoredSession) {
      askedRef.current = new Set();
      setAsked([]);
      setMessages([{ id: uid(), role: 'vendi', content: VENDI_WELCOME }]);
    }
    setHydrated(true);
  }, [storageKey, sessionSeq]);

  useEffect(() => {
    if (!hydrated || !storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        draft,
        answered,
        asked,
        messages,
        draftId,
        consentId,
        uploadedUrls,
        uploadedVideoUrls,
      }));
    } catch { /* quota — non-fatal */ }
  }, [draft, answered, asked, messages, draftId, consentId, uploadedUrls, uploadedVideoUrls, hydrated, storageKey]);




  // SERVER-AUTHORITATIVE RESUME. Before this can ever create a row, ask the
  // server which unfinished Vendi drafts this owner has. Missing/cleared/stale
  // browser state must never be read as "this seller has no draft yet" — that
  // is what produced duplicate listings. The saved row is hydrated in FULL
  // (every Vendi-supported column, media and required documents) and the
  // answered ledger is derived from it, so nothing already saved is re-asked.
  useEffect(() => {
    if (!hydrated || !user || draftId || resolvingRef.current) return;
    resolvingRef.current = true;
    let cancelled = false;
    void (async () => {
      try {
        const { session, others, retired } = await resolveVendiResume(user.id, sessionKeyRef.current);
        if (cancelled) return;

        if (retired) {
          // This browser's key belongs to a listing that already went live or
          // was archived. Never autosave onto it — start a clean session.
          trackVendi('vendi_session_retired', { userId: user.id, sessionKey: sessionKeyRef.current });
          sessionKeyRef.current = rotateVendiSessionKey(user.id);
        }

        if (session) {
          const docs = session.mode === 'rent' ? await loadRequiredDocuments(session.id) : [];
          if (cancelled) return;
          setDraftId(session.id);
          setDraft((prev) => mergeServerDraft(
            prev,
            { ...session.draft, ...(docs.length ? { required_documents: docs } : {}) },
          ));
          setAnswered((prev) => Array.from(new Set([
            ...prev,
            ...deriveAnsweredFromDraft(session.draft, { hasMedia: !!session.image_urls?.length }),
          ])));
          setUploadedUrls((prev) => (prev.length ? prev : session.image_urls ?? []));
          setUploadedVideoUrls((prev) => (prev.length ? prev : session.video_urls ?? []));
          trackVendi('vendi_session_resumed', {
            userId: user.id, listingId: session.id, sessionKey: sessionKeyRef.current,
          });
        } else if (others.length) {
          // Cross-device / cleared-storage arrival: offer an explicit choice
          // instead of silently adopting a draft or starting a second listing.
          setResumeOffers(others);
          trackVendi('vendi_resume_choice_shown', {
            userId: user.id, metadata: { drafts: others.length },
          });
        }
      } catch {
        /* resume is best-effort; creation stays blocked until it settles */
      } finally {
        if (!cancelled) resolvingRef.current = false;
        setResumeChecked(true);
      }
    })();
    return () => { cancelled = true; };
  }, [hydrated, user, draftId]);

  // Create the owned draft row as soon as we know mode + category, so every
  // later answer and upload is autosaved against the seller's account. The
  // sessionKey makes this idempotent server-side: repeated effects, StrictMode
  // double-invocations, remounts and second tabs all resolve to one row.
  useEffect(() => {
    if (!hydrated || !user || draftId || creatingDraftRef.current) return;
    if (!resumeChecked || resumeOffers.length) return;
    if (!draft.mode || !draft.category) return;
    creatingDraftRef.current = true;
    void (async () => {
      try {
        const id = await createOrResumeVendiDraft({
          sessionKey: sessionKeyRef.current,
          mode: draft.mode === 'sale' ? 'sale' : 'rent',
          category: draft.category as string,
          city: draft.city ?? null,
          state: draft.state ?? null,
          zipCode: draft.zip_code ?? null,
          location: draft.address ?? null,
        });
        setDraftId(id);
        trackVendi('vendi_draft_created', {
          userId: user.id, listingId: id, sessionKey: sessionKeyRef.current,
          metadata: { mode: draft.mode ?? null, category: draft.category ?? null },
        });
      } catch (error) {
        creatingDraftRef.current = false;
        if (error instanceof VendiSessionRetiredError) {
          // Old tab whose listing already published: mint a clean session and
          // let the next pass create a genuinely new draft.
          sessionKeyRef.current = rotateVendiSessionKey(user.id);
          trackVendi('vendi_session_retired', { userId: user.id, sessionKey: sessionKeyRef.current });
        } else {
          trackVendi('vendi_save_failed', { userId: user.id, metadata: { stage: 'create' } });
        }
      }
    })();
  }, [hydrated, user, draftId, resumeChecked, resumeOffers.length, draft.mode, draft.category, draft.city, draft.state, draft.zip_code, draft.address]);


  // Debounced autosave of collected answers onto the owned draft. The row stays
  // status=draft until the owner explicitly publishes. It never runs before the
  // server resume settles, so a stale browser payload can't overwrite newer
  // server values, and it never runs while a resume choice is pending.
  useEffect(() => {
    if (!draftId || !hydrated || !resumeChecked || resumeOffers.length) return;
    setSaveState('saving');
    const timer = window.setTimeout(() => {
      const payload = buildListingPayload(draft, uploadedUrls, uploadedVideoUrls);
      void supabase
        .from('listings')
        .update(payload as never)
        .eq('id', draftId)
        .eq('status', 'draft') // never write over a listing that already went live
        .then(({ error }) => {
          setSaveState(error ? 'error' : 'saved');
          if (error) trackVendi('vendi_save_failed', { userId: user?.id, listingId: draftId, metadata: { stage: 'autosave' } });
        });
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [draft, uploadedUrls, uploadedVideoUrls, draftId, hydrated, resumeChecked, resumeOffers.length, user?.id]);

  // Ask the next unanswered question — once, and only once per question.
  useEffect(() => {
    if (!hydrated || reviewing) return;
    const q = nextQuestion(draft, answered);
    if (!q) { setReviewing(true); return; }
    if (askedRef.current.has(q.id)) return;
    askedRef.current.add(q.id);
    setAsked((prev) => (prev.includes(q.id) ? prev : [...prev, q.id]));
    const prompt = promptText(q, draft);
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last?.role === 'vendi' && last.content === prompt) return prev;
      return [...prev, { id: uid(), role: 'vendi', content: prompt }];
    });
  }, [draft, answered, hydrated, reviewing]);


  // Final publish gate: present the same seller disclosure the step-by-step
  // wizard shows, in the chat, before publishing can unlock.
  useEffect(() => {
    if (!reviewing || consentId || disclosureShownRef.current) return;
    disclosureShownRef.current = true;
    setMessages((prev) => [
      ...prev,
      {
        id: uid(),
        role: 'vendi',
        content:
          'One last legal step before this can go live. Please read the disclosure below — it is the same attestation used in the standard listing wizard. ' +
          'When you have read it, type YES (in capitals) to affirm it.',
      },
    ]);
  }, [reviewing, consentId]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, reviewing]);


  const say = (role: Msg['role'], content: string) =>
    setMessages((prev) => [...prev, { id: uid(), role, content }]);

  const submitAnswer = useCallback((raw: string, display?: string) => {
    const q = current;
    if (!q) return;
    const text = raw.trim();
    if (!text) return;
    const echo = display ?? (text.length > 420 ? `${text.slice(0, 420)}…` : text);
    say('user', echo);
    setInput('');

    if (q.optional && isSkip(text)) {
      setAnswered((prev) => [...prev, q.id]);
      return;
    }

    const result = q.apply(draft, text);
    if (result.error) { say('vendi', result.error); return; }
    setDraft((prev) => ({ ...prev, ...(result.patch ?? {}) }));
    setAnswered((prev) => [...prev, q.id, ...(result.answeredIds ?? [])]);
    if (result.say) say('vendi', result.say);
  }, [current, draft]);


  const handlePhotos = (files: FileList | null) => {
    if (!files?.length) return;
    const accepted = Array.from(files).filter((f) => {
      if (f.type.startsWith('image/')) return f.size <= 15 * 1024 * 1024;
      if (f.type.startsWith('video/')) return f.size <= 100 * 1024 * 1024;
      return false;
    });
    if (accepted.length !== files.length) {
      toast.error('Some files were skipped (images up to 15MB, video up to 100MB).');
    }
    setPhotos((prev) => [
      ...prev,
      ...accepted.map((file) => ({
        id: uid(),
        file,
        url: URL.createObjectURL(file),
        kind: (file.type.startsWith('video/') ? 'video' : 'image') as 'image' | 'video',
      })),
    ].slice(0, 12));
  };

  const removePhoto = (id: string) => setPhotos((prev) => prev.filter((p) => p.id !== id));

  const localImages = photos.filter((p) => p.kind === 'image');
  const localVideos = photos.filter((p) => p.kind === 'video');
  const previewImages = uploadedUrls.length ? uploadedUrls : localImages.map((p) => p.url);
  const blockers = getPublishBlockers(draft, previewImages.length);

  /**
   * Upload any local media that is not already stored.
   *
   * Deduplicated and resumable: each local item's uploaded URL is remembered,
   * so adding a photo later APPENDS instead of re-uploading the set, a retry
   * after a failure only re-sends what actually failed, and the returned lists
   * always describe the full current media set (server-restored URLs included).
   */
  const uploadMedia = async (
    listingId: string,
    userId: string,
  ): Promise<{ images: string[]; videos: string[] }> => {
    let failed = 0;
    for (const item of photos) {
      if (uploadedByItemRef.current.has(item.id)) continue;
      const isVideo = item.kind === 'video';
      const bucket = isVideo ? 'listing-videos' : 'listing-images';
      const ext = item.file.name.split('.').pop()?.toLowerCase() || (isVideo ? 'mp4' : 'jpg');
      const path = `${userId}/${listingId}/${Date.now()}-${uid()}.${ext}`;
      const { error } = await supabase.storage.from(bucket).upload(path, item.file, {
        cacheControl: '3600',
        upsert: true,
        contentType: item.file.type || (isVideo ? 'video/mp4' : 'image/jpeg'),
      });
      if (error) {
        failed += 1;
        trackVendi('vendi_media_upload_failed', { userId, listingId, metadata: { kind: item.kind } });
        continue; // keep the successful uploads; this item is retried later
      }
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      uploadedByItemRef.current.set(item.id, { url: data.publicUrl, kind: item.kind });
    }

    const stored = Array.from(uploadedByItemRef.current.values());
    const images = [...uploadedUrls, ...stored.filter((s) => s.kind === 'image').map((s) => s.url)];
    const videos = [...uploadedVideoUrls, ...stored.filter((s) => s.kind === 'video').map((s) => s.url)];
    const dedupe = (list: string[]) => Array.from(new Set(list));
    if (failed && !stored.length) throw new Error('Upload failed. Please try again.');
    return { images: dedupe(images), videos: dedupe(videos) };
  };

  /** Rental screening documents live in their own table, same as the wizard. */
  const syncRequiredDocuments = async (listingId: string) => {
    const docs = (draft.required_documents ?? []) as DocumentType[];
    if (draft.mode !== 'rent') return;
    await supabase.from('listing_required_documents').delete().eq('listing_id', listingId);
    if (!docs.length) return;
    await supabase.from('listing_required_documents').insert(
      docs.map((document_type) => ({
        listing_id: listingId,
        document_type,
        is_required: true,
        deadline_type: 'before_approval' as const,
      })),
    );
  };

  // Persist media to the owner's draft as soon as both exist, so photos survive
  // a closed tab just like the answers do. Runs again whenever media is added
  // or a previous upload failed — never re-uploading what already succeeded.
  useEffect(() => {
    if (!draftId || !user) return;
    const pending = photos.some((p) => !uploadedByItemRef.current.has(p.id));
    if (!pending || uploadingMediaRef.current) return;
    uploadingMediaRef.current = true;
    let cancelled = false;
    void (async () => {
      try {
        const { images, videos } = await uploadMedia(draftId, user.id);
        if (!cancelled) { setUploadedUrls(images); setUploadedVideoUrls(videos); }
      } catch {
        /* keep local previews; publish retries the upload */
      } finally {
        uploadingMediaRef.current = false;
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId, user, photos]);


  /**
   * Explicit "Save draft" — flushes the debounce immediately, persists pending
   * media, and keeps local recovery state intact either way.
   */
  const handleSaveDraft = async () => {
    if (!user || savingManually) return;
    setSavingManually(true);
    setSaveState('saving');
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error('Please sign in again to save.');

      let listingId = draftId;
      if (!listingId) {
        if (!draft.mode || !draft.category) {
          toast.message('Nothing to save yet — tell me what you’re listing first.');
          setSaveState('idle');
          return;
        }
        listingId = await createOrResumeVendiDraft({
          sessionKey: sessionKeyRef.current,
          mode: draft.mode === 'sale' ? 'sale' : 'rent',
          category: draft.category as string,
          city: draft.city ?? null,
          state: draft.state ?? null,
          zipCode: draft.zip_code ?? null,
          location: draft.address ?? null,
        });
        setDraftId(listingId);
      }

      let images = uploadedUrls;
      let videos = uploadedVideoUrls;
      if (photos.some((p) => !uploadedByItemRef.current.has(p.id))) {
        const uploaded = await uploadMedia(listingId, user.id);
        images = uploaded.images; videos = uploaded.videos;
        setUploadedUrls(images); setUploadedVideoUrls(videos);
      }

      const { error: updateError } = await supabase
        .from('listings')
        .update(buildListingPayload(draft, images, videos) as never)
        .eq('id', listingId);
      if (updateError) throw updateError;
      await syncRequiredDocuments(listingId);

      setSaveState('saved');
      toast.success('Draft saved.', {
        description: 'You can pick up right where you left off from your dashboard.',
        action: { label: 'Go to dashboard', onClick: () => navigate('/dashboard') },
      });
    } catch (error) {
      setSaveState('error');
      toast.error(
        error instanceof Error ? error.message : 'We could not save your draft.',
        { description: 'Your answers are still here — try again in a moment.' },
      );
    } finally {
      setSavingManually(false);
    }
  };


  /**
   * Exactly `YES` — uppercase, no surrounding punctuation, no extra words.
   * Partial matches ("YE", "YES."), lowercase, and any auto-filled variant are
   * rejected, and the Affirm control stays disabled until the value matches, so
   * a button click alone can never satisfy the acknowledgment.
   */
  const isExactYes = attestInput === 'YES';

  /**
   * Typed acknowledgment of the publish disclosure. Only an exact, capitalised
   * `YES` counts — no inferred or button-only consent — and it is written
   * through the same `record_user_consent` audit path as the wizard's
   * ConsentModal before the Publish action unlocks.
   */
  const handleAttest = async (raw: string) => {
    const text = raw;
    if (attesting || consentId) return;
    if (text !== 'YES') {
      const reason = !text.trim()
        ? 'Type YES to affirm the disclosure.'
        : text.trim().toUpperCase() === 'YES'
          ? 'Use capital letters with no extra spaces or punctuation: YES.'
          : 'That does not match. Type exactly YES (capital letters, nothing else).';
      setAttestError(reason);
      say('vendi', `${reason} Nothing is published until then.`);
      return;
    }
    setAttestError(null);
    say('user', text);
    setAttestInput('');

    setAttesting(true);
    try {
      const id = await recordConsent.mutateAsync({
        documentType,
        documentVersion: legalDoc?.version ?? CURRENT_VERSIONS[documentType],
        trigger: CONSENT_TRIGGERS.PUBLISH_LISTING,
        acceptanceText: `${acceptanceText} ${ATTESTATIONS.map((a) => a.text).join(' ')} Acknowledged by typing YES in the List with Vendi builder.`,
        relatedIds: draftId ? { listing_id: draftId } : undefined,
      });
      setConsentId(id);
      say('vendi', 'Recorded and dated. Publish Listing is now unlocked — publishing is still your explicit action.');
    } catch (error) {
      setAttestError('We could not record your acknowledgment. Type YES again to retry.');
      say('vendi', 'I could not record your acknowledgment. Please try typing YES again, or contact support@vendibook.com.');
      toast.error(error instanceof Error ? error.message : 'Could not record your acceptance.');

    } finally {
      setAttesting(false);
    }
  };

  /**
   * Publish. The listing only goes live through the SAME canonical publisher the
   * step-by-step wizard uses, and the seller is only told they're live — and
   * their local recovery state only cleared — after the server row has been
   * re-read and verified.
   */
  const handlePublish = async () => {
    if (blockers.length) return;
    if (!user || !consentId) return;
    if (publishing || publishInFlightRef.current) return; // double-click guard
    publishInFlightRef.current = true;
    setPublishing(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error('Please sign in again to publish.');

      let listingId = draftId;
      if (!listingId) {
        listingId = await createOrResumeVendiDraft({
          sessionKey: sessionKeyRef.current,
          mode: draft.mode === 'sale' ? 'sale' : 'rent',
          category: draft.category as string,
          city: draft.city ?? null,
          state: draft.state ?? null,
          zipCode: draft.zip_code ?? null,
          location: draft.address ?? null,
        });
        setDraftId(listingId);
      }

      // 1. Flush media + fields and AWAIT them. Never race the debounced autosave.
      let imageUrls = uploadedUrls;
      let videoUrls = uploadedVideoUrls;
      if (photos.some((p) => !uploadedByItemRef.current.has(p.id))) {
        const uploaded = await uploadMedia(listingId, user.id);
        imageUrls = uploaded.images.length ? uploaded.images : imageUrls;
        videoUrls = uploaded.videos.length ? uploaded.videos : videoUrls;
      }
      setUploadedUrls(imageUrls);
      setUploadedVideoUrls(videoUrls);

      const payload = buildListingPayload(draft, imageUrls, videoUrls);
      const { error: updateError } = await supabase.from('listings').update(payload as never).eq('id', listingId);
      if (updateError) throw updateError;
      await syncRequiredDocuments(listingId);

      // 2. Canonical publish + authoritative verification.
      const verified = await publishVendiListing({
        listingId,
        userId: user.id,
        fields: payload as Record<string, unknown>,
        expectedImages: imageUrls,
      });

      // 3. Only now is it safe to drop the local recovery state. The session
      //    key is retired too, so the next visit starts a genuinely new listing
      //    instead of resuming the one that just went live.
      if (storageKey) localStorage.removeItem(storageKey);
      trackVendi('vendi_published', { userId: user.id, listingId, sessionKey: sessionKeyRef.current });
      if (user) sessionKeyRef.current = rotateVendiSessionKey(user.id);
      toast.success('Your listing is live 🎉', {
        description: 'Buyers can find it now. You can keep editing it any time from your dashboard.',
      });
      navigate(verified.publicPath);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong.';
      const id = draftId;
      trackVendi('vendi_publish_failed', { userId: user?.id, listingId: id, metadata: { reason: message.slice(0, 80) } });
      // Recovery state is deliberately untouched: the seller keeps their draft.
      toast.error(message, {
        description: 'Your draft is saved — nothing was lost. You can try again or finish in the full editor.',
        ...(id
          ? { action: { label: 'Review in full editor', onClick: () => navigate(`/create-listing/${id}`) } }
          : {}),
      });
    } finally {
      publishInFlightRef.current = false;
      setPublishing(false);
    }
  };


  /**
   * Explicit "Start over" / "Start a new listing". The previous draft is NOT
   * deleted — it stays in the seller's dashboard drafts. We simply retire the
   * current Vendi session (new idempotency key) so the next create call makes a
   * genuinely new row, by deliberate user choice rather than lost storage.
   */
  const startOver = () => {
    if (storageKey) localStorage.removeItem(storageKey);
    if (user) {
      sessionKeyRef.current = rotateVendiSessionKey(user.id);
      trackVendi('vendi_session_started', { userId: user.id, sessionKey: sessionKeyRef.current, metadata: { reason: 'start_over' } });
    }
    setDraft(emptyDraft); setAnswered([]); setMessages([]); setPhotos([]); setUploadedUrls([]);
    setUploadedVideoUrls([]); setReviewing(false);
    setDraftId(null); creatingDraftRef.current = false; resolvingRef.current = false;
    setResumeOffers([]); setResumeChecked(true);
    setConsentId(null); setAttestInput(''); disclosureShownRef.current = false;
    setSaveState('idle');
    askedRef.current = new Set(); setAsked([]);
    // Re-run the opening effect against the now-empty storage: one clean welcome.
    setHydrated(false); setSessionSeq((n) => n + 1);
  };

  /**
   * "Continue listing" — adopt the chosen draft's session as this browser's and
   * hydrate every saved field, its media and its screening documents, so the
   * interview picks up exactly where the database left off.
   */
  const continueServerDraft = (offer: ActiveVendiDraft) => {
    if (!user) return;
    adoptVendiSessionKey(user.id, offer.session_key);
    sessionKeyRef.current = offer.session_key;
    setDraftId(offer.id);
    setResumeOffers([]);
    setDraft((prev) => mergeServerDraft(prev, offer.draft, { preferServer: true }));
    setAnswered((prev) => Array.from(new Set([
      ...prev,
      ...deriveAnsweredFromDraft(offer.draft, { hasMedia: !!offer.image_urls?.length }),
    ])));
    setUploadedUrls(offer.image_urls ?? []);
    setUploadedVideoUrls(offer.video_urls ?? []);
    trackVendi('vendi_session_resumed', {
      userId: user.id, listingId: offer.id, sessionKey: offer.session_key,
      metadata: { source: 'chooser' },
    });
    if (offer.mode === 'rent') {
      void loadRequiredDocuments(offer.id).then((docs) => {
        if (docs.length) setDraft((prev) => ({ ...prev, required_documents: docs }));
      });
    }
  };






  const progress = progressPercent(draft, answered);

  const previewPanel = (
    <LivePreviewPanel preview={draft} images={previewImages} ready={blockers.length === 0} />
  );

  // The interview never starts anonymously — the draft, answers and media must
  // belong to a real account from the very first question.
  if (authLoading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-[#08080a]">
        <Loader2 className="h-6 w-6 animate-spin text-white/50" />
      </div>
    );
  }
  if (!user) return <VendiAuthGate />;

  // Resolving server identity. Rendering the interview before this settles is
  // what let a stale browser cache look like "no draft yet".
  if (!resumeChecked && !draftId) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3 bg-[#08080a]">
        <Loader2 className="h-6 w-6 animate-spin text-white/50" />
        <p className="text-sm text-muted-foreground">Checking for a listing you already started…</p>
      </div>
    );
  }

  // Cross-device / cleared-storage arrival with unfinished Vendi drafts on the
  // account. Continuing is the primary action; a new listing is an explicit
  // choice, and an arbitrary draft is never adopted silently.
  if (resumeOffers.length) {
    const many = resumeOffers.length > 1;
    return (
      <div className="relative flex min-h-[80vh] items-center justify-center bg-[#08080a] px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-foreground shadow-[0_30px_90px_-40px_rgba(0,0,0,0.9)] backdrop-blur-xl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="vendi-resume-title"
        >
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">List with Vendi</p>
          <h1 id="vendi-resume-title" className="mt-3 text-2xl font-semibold leading-snug">
            {many ? 'Welcome back — which listing should we finish?' : 'Welcome back — continue where you left off?'}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {many
              ? 'These unfinished listings are saved to your account. Pick one to continue — the others stay safe in your dashboard.'
              : 'You already have an unfinished listing saved to your account. Pick it back up right where you left off — nothing was lost.'}
          </p>
          <ul className="mt-6 space-y-3">
            {resumeOffers.map((offer) => (
              <li key={offer.id}>
                <button
                  type="button"
                  onClick={() => continueServerDraft(offer)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-left transition hover:border-white/20 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {offer.cover_image_url ? (
                    <img src={offer.cover_image_url} alt="" className="h-12 w-12 flex-none rounded-xl object-cover ring-1 ring-white/10" />
                  ) : (
                    <span className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-white/[0.06] ring-1 ring-white/10">
                      <ImagePlus className="h-5 w-5 text-white/40" aria-hidden />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {offer.title?.trim() || 'Untitled listing'}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {[offer.mode === 'sale' ? 'For sale' : 'For rent',
                        [offer.city, offer.state].filter(Boolean).join(', ')]
                        .filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  <span className="text-xs text-primary">Continue</span>
                </button>
              </li>
            ))}
          </ul>
          <Button variant="outline" className="mt-5 w-full border-white/15 bg-white/[0.03]" onClick={startOver}>
            Start a new listing
          </Button>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Starting a new listing keeps your saved drafts safe in your dashboard.
          </p>
        </motion.div>
      </div>
    );
  }


  return (

    <div className="dashboard-shell relative min-h-screen overflow-hidden bg-[#08080a] text-foreground">
      {/* Ambient depth — restrained, no loud gradients */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(90% 60% at 12% -10%, rgba(255,81,36,0.10), transparent 60%), radial-gradient(70% 50% at 100% 0%, rgba(255,255,255,0.05), transparent 65%)',
        }}
      />

      <header className="sticky top-0 z-30 border-b border-white/[0.07] bg-[#08080a]/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3.5 sm:px-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Go back" className="text-foreground/70 hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <img src={vendibookFavicon} alt="" className="h-7 w-7 rounded-lg ring-1 ring-white/10" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[15px] font-semibold tracking-[-0.01em]">List with Vendi</h1>
            <p className="truncate text-xs text-muted-foreground">
              {blockers.length === 0 ? 'Ready to publish' : `Guided listing builder · ${progress}%`}
              {saveState !== 'idle' && (
                <span className={cn('ml-2', saveState === 'error' && 'text-destructive')}>
                  ·{' '}
                  {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Draft saved' : 'Not saved'}
                </span>
              )}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => void handleSaveDraft()}
            disabled={savingManually}
          >
            {savingManually
              ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              : <CloudUpload className="mr-2 h-4 w-4" />}
            <span className="hidden xs:inline sm:inline">Save draft</span>
          </Button>
          <Button variant="ghost" size="sm" className="hidden text-muted-foreground hover:text-foreground sm:inline-flex" onClick={() => navigate('/list')}>
            <Wrench className="mr-2 h-4 w-4" /> Build it myself
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground lg:hidden"
            onClick={() => setShowMobilePreview(true)}
          >
            <Eye className="mr-2 h-4 w-4" /> Preview
          </Button>
        </div>
        <div className="h-px w-full bg-white/[0.06]">
          <motion.div
            className="h-full"
            style={{ background: 'linear-gradient(90deg, rgba(255,81,36,0.55), rgba(255,81,36,1))' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
          />
        </div>
      </header>

      <div className="relative mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_400px] lg:py-10">
        <section className="dash-glass flex min-h-[68vh] flex-col overflow-hidden p-0">
          {/* Keyed by session: "Start over" drops the old thread instantly
              instead of leaving exiting bubbles on screen. */}
          <div key={sessionSeq} className="flex-1 space-y-5 overflow-y-auto px-4 py-6 sm:px-7 sm:py-8">
            <AnimatePresence initial={false}>
              {messages.map((m) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[86%] px-4 py-3 text-[15px] leading-relaxed sm:max-w-[76%] ${
                      m.role === 'user'
                        ? 'rounded-[18px] rounded-br-[6px] border border-[rgba(255,81,36,0.28)] bg-[rgba(255,81,36,0.10)] text-foreground'
                        : 'rounded-[18px] rounded-bl-[6px] border border-white/[0.08] bg-white/[0.045] text-foreground/90'
                    }`}
                  >
                    {m.role === 'vendi' && (
                      <span className="mb-1 block text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                        Vendi
                      </span>
                    )}
                    <span className="whitespace-pre-line">{m.content}</span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {current?.kind === 'choice' && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-wrap gap-2.5 pt-1"
              >
                {(current.options?.(draft) ?? []).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => submitAnswer(opt.value, opt.label)}
                    className="group rounded-2xl border border-white/[0.09] bg-white/[0.035] px-4 py-3 text-left transition-all duration-200 hover:-translate-y-[1px] hover:border-[rgba(255,81,36,0.4)] hover:bg-white/[0.06]"
                  >
                    <span className="block text-sm font-medium text-foreground">{opt.label}</span>
                    {opt.description && (
                      <span className="mt-0.5 block text-xs text-muted-foreground">{opt.description}</span>
                    )}
                  </button>
                ))}
              </motion.div>
            )}

            {current?.kind === 'yesno' && (
              <div className="flex gap-2.5 pt-1">
                {(['yes', 'no'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => submitAnswer(v)}
                    className="rounded-full border border-white/[0.1] bg-white/[0.04] px-6 py-2.5 text-sm font-medium capitalize transition-all duration-200 hover:border-[rgba(255,81,36,0.4)] hover:bg-white/[0.07]"
                  >
                    {v}
                  </button>
                ))}
              </div>
            )}

            {/* Tap-to-add chips for list questions (equipment, screening docs) */}
            {current?.kind === 'list' && (current.options?.(draft)?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {(current.options?.(draft) ?? []).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setInput((prev) => (prev.trim() ? `${prev.replace(/,\s*$/, '')}, ${opt.label}` : opt.label))}
                    className="rounded-full border border-white/[0.1] bg-white/[0.035] px-3.5 py-1.5 text-xs text-foreground/85 transition hover:border-[rgba(255,81,36,0.4)] hover:bg-white/[0.07]"
                  >
                    + {opt.label}
                  </button>
                ))}
              </div>
            )}

            {/* One-tap suggestion built only from confirmed facts */}
            {current?.suggest?.(draft) && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => submitAnswer(current.suggest?.(draft) ?? '')}
                  className="rounded-full border border-[rgba(255,81,36,0.35)] bg-[rgba(255,81,36,0.09)] px-4 py-2 text-sm text-foreground transition hover:bg-[rgba(255,81,36,0.14)]"
                >
                  Use “{current.suggest?.(draft)}”
                </button>
              </div>
            )}

            {current?.kind === 'photos' && (
              <div className="space-y-4 pt-1">
                <div className="flex flex-wrap gap-2.5">
                  {photos.map((p) => (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, scale: 0.94 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="relative h-[86px] w-[86px] overflow-hidden rounded-2xl border border-white/[0.1]"
                    >
                      {p.kind === 'video' ? (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-white/[0.05] text-muted-foreground">
                          <Video className="h-5 w-5" />
                          <span className="text-[10px]">Video</span>
                        </div>
                      ) : (
                        <img src={p.url} alt="Listing photo" className="h-full w-full object-cover" />
                      )}
                      <button
                        type="button"
                        aria-label="Remove media"
                        onClick={() => removePhoto(p.id)}
                        className="absolute right-1.5 top-1.5 rounded-full border border-white/10 bg-black/65 p-1 backdrop-blur-md transition hover:bg-black/85"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </motion.div>
                  ))}
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="flex h-[86px] w-[86px] flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-white/15 text-muted-foreground transition hover:border-[rgba(255,81,36,0.45)] hover:text-foreground"
                    aria-label="Add photos or video"
                  >
                    <ImagePlus className="h-5 w-5" />
                    <span className="text-[10px] tracking-wide">Add</span>
                  </button>
                </div>
                <Button onClick={() => submitAnswer('done')} disabled={!localImages.length} className="rounded-full">
                  Continue with {localImages.length} photo{localImages.length === 1 ? '' : 's'}
                  {localVideos.length ? ` and ${localVideos.length} video${localVideos.length === 1 ? '' : 's'}` : ''}
                </Button>
              </div>
            )}


            {reviewing && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="dash-glass dash-glass-ember p-6"
              >
                <h2 className="text-lg font-semibold tracking-[-0.01em]">Review and publish</h2>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Everything below came straight from your answers. Nothing was added for you.
                </p>
                {blockers.length > 0 && (
                  <ul className="mt-4 space-y-1.5 text-sm text-destructive">
                    {blockers.map((b) => <li key={b}>• {b}</li>)}
                  </ul>
                )}

                {/* Seller disclosure — identical language to the standard wizard */}
                <div className="mt-6 rounded-2xl border border-white/[0.1] bg-white/[0.03] p-5">
                  <h3 className="text-sm font-semibold tracking-[-0.01em]">Before you publish</h3>
                  <ul className="mt-3 space-y-2 text-sm leading-relaxed text-foreground/85">
                    {ATTESTATIONS.map((a) => <li key={a.key}>• {a.text}</li>)}
                  </ul>
                  <p className="mt-4 text-sm leading-relaxed text-foreground/85">{acceptanceText}</p>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {legalDoc ? `Version ${legalDoc.version}` : `Version ${CURRENT_VERSIONS[documentType]}`} ·{' '}
                    <a
                      href={`/legal/${DOCUMENT_SLUGS[documentType]}`}
                      target="_blank"
                      rel="noreferrer"
                      className="underline underline-offset-4 hover:text-foreground"
                    >
                      {draft.mode === 'rent' ? 'Host / Renter Terms' : 'Seller Terms'}
                    </a>{' '}
                    ·{' '}
                    <a href="/terms" target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-foreground">
                      Terms of Service
                    </a>{' '}
                    ·{' '}
                    <a href="/privacy" target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-foreground">
                      Privacy Policy
                    </a>
                  </p>

                  {consentId ? (
                    <p className="mt-4 flex items-center gap-2 text-sm text-foreground/90">
                      <Check className="h-4 w-4 text-[rgb(255,81,36)]" aria-hidden />
                      Acknowledged and recorded. You can publish when you're ready.
                    </p>
                  ) : (
                    <form
                      className="mt-4 space-y-2"
                      onSubmit={(e) => { e.preventDefault(); void handleAttest(attestInput); }}
                    >
                      <label htmlFor="vendi-attest" className="block text-xs text-muted-foreground">
                        Type YES to affirm the disclosure above. This is your legal acknowledgment — it does not publish your listing.
                      </label>
                      <div
                        className={cn(
                          'flex items-center gap-2 rounded-[18px] border px-3 py-2',
                          attestError
                            ? 'border-destructive/60 bg-destructive/[0.06]'
                            : 'border-white/[0.1] bg-white/[0.04] focus-within:border-[rgba(255,81,36,0.45)]',
                        )}
                      >
                        <input
                          id="vendi-attest"
                          value={attestInput}
                          onChange={(e) => {
                            setAttestInput(e.target.value);
                            if (attestError) setAttestError(null);
                          }}
                          placeholder="Type YES"
                          autoComplete="off"
                          autoCorrect="off"
                          autoCapitalize="none"
                          spellCheck={false}
                          name="vendi-attest-no-autofill"
                          inputMode="text"
                          maxLength={12}
                          aria-invalid={attestError ? true : undefined}
                          aria-describedby={attestError ? 'vendi-attest-error' : undefined}
                          className="min-h-[40px] flex-1 border-0 bg-transparent px-1 text-base text-foreground outline-none placeholder:text-muted-foreground"
                        />
                        <Button type="submit" size="sm" disabled={attesting || !isExactYes} className="rounded-full">
                          {attesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          Affirm
                        </Button>
                      </div>
                      {attestError ? (
                        <p id="vendi-attest-error" role="alert" className="text-xs text-destructive">
                          {attestError}
                        </p>
                      ) : null}

                    </form>
                  )}
                </div>

                <div className="mt-6 flex flex-wrap gap-2.5">
                  <Button onClick={handlePublish} disabled={publishing || blockers.length > 0 || !consentId} className="rounded-full">
                    {publishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                    Publish listing
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-full border-white/12 bg-white/[0.04]"
                    onClick={() => {
                      setReviewing(false);
                      setAnswered((prev) => {
                        const reopened = prev[prev.length - 1];
                        // Reopening a question means Vendi may ask it again.
                        if (reopened) {
                          askedRef.current.delete(reopened);
                          setAsked((ids) => ids.filter((id) => id !== reopened));
                        }
                        return prev.slice(0, -1);
                      });
                    }}
                  >
                    Make changes
                  </Button>

                  <Button variant="ghost" className="rounded-full text-muted-foreground" onClick={startOver}>Start over</Button>
                </div>
              </motion.div>
            )}


            <div ref={endRef} />
          </div>

          {current && !['choice', 'yesno', 'photos'].includes(current.kind) && (
            <form
              className="sticky bottom-0 border-t border-white/[0.07] bg-[#0c0c0f]/80 px-4 py-3.5 backdrop-blur-xl sm:px-7"
              onSubmit={(e) => { e.preventDefault(); submitAnswer(input); }}
            >
              {current.kind === 'paste' && photos.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {photos.map((p) => (
                    <div key={p.id} className="relative h-14 w-14 overflow-hidden rounded-xl border border-white/[0.1]">
                      {p.kind === 'video' ? (
                        <div className="flex h-full w-full items-center justify-center bg-white/[0.05] text-muted-foreground">
                          <Video className="h-4 w-4" />
                        </div>
                      ) : (
                        <img src={p.url} alt="Attached" className="h-full w-full object-cover" />
                      )}

                      <button
                        type="button"
                        aria-label="Remove attachment"
                        onClick={() => removePhoto(p.id)}
                        className="absolute right-0.5 top-0.5 rounded-full bg-black/70 p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-end gap-2 rounded-[20px] border border-white/[0.09] bg-white/[0.04] px-3 py-2 transition focus-within:border-[rgba(255,81,36,0.45)]">
                {current.kind === 'paste' && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Attach photos from your other listing"
                    className="h-10 w-10 shrink-0 rounded-full text-muted-foreground"
                    onClick={() => fileRef.current?.click()}
                  >
                    <ImagePlus className="h-4 w-4" />
                  </Button>
                )}
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && current.kind !== 'paste') {
                      e.preventDefault(); submitAnswer(input);
                    }
                  }}
                  rows={current.kind === 'paste' ? 5 : 1}
                  placeholder={current.placeholder ?? 'Type your answer…'}
                  aria-label={current.prompt(draft)}
                  className="min-h-[44px] flex-1 resize-none border-0 bg-transparent px-2 py-2.5 text-base text-foreground outline-none placeholder:text-muted-foreground"
                />
                {current.optional && (
                  <Button type="button" variant="ghost" size="sm" className="rounded-full text-muted-foreground" onClick={() => submitAnswer('skip')}>
                    Skip
                  </Button>
                )}
                <Button type="submit" size="icon" aria-label="Send answer" className="h-10 w-10 shrink-0 rounded-full">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              {current.kind === 'paste' && (
                <p className="mt-2 px-1 text-[11px] leading-relaxed text-muted-foreground">
                  Paste your own text only — Vendi never pulls anything from Facebook Marketplace or other sites. Attached photos become your listing photos.
                </p>
              )}
            </form>
          )}


          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={(e) => { handlePhotos(e.target.files); e.target.value = ''; }}
          />
        </section>

        <aside className="hidden lg:block">
          <div className="dash-glass sticky top-28 h-[72vh] overflow-hidden p-0">
            {previewPanel}
          </div>
        </aside>
      </div>

      {/* Mobile: polished preview sheet */}
      <Sheet open={showMobilePreview} onOpenChange={setShowMobilePreview}>
        <SheetContent
          side="bottom"
          className="h-[85vh] rounded-t-[24px] border-white/[0.08] bg-[#0c0c0f]/95 p-0 backdrop-blur-2xl lg:hidden"
        >
          <SheetHeader className="border-b border-white/[0.07] px-5 py-4 text-left">
            <SheetTitle className="text-sm font-semibold text-foreground">Live preview</SheetTitle>
          </SheetHeader>
          <div className="h-[calc(85vh-64px)] overflow-hidden">{previewPanel}</div>
        </SheetContent>
      </Sheet>

      {/* Mobile: persistent preview control */}
      <button
        type="button"
        onClick={() => setShowMobilePreview(true)}
        className="fixed bottom-24 right-4 z-20 flex items-center gap-2 rounded-full border border-white/[0.12] bg-[#121215]/90 px-4 py-2.5 text-xs font-medium text-foreground shadow-[0_12px_30px_-12px_rgba(0,0,0,0.8)] backdrop-blur-xl lg:hidden"
      >
        <Eye className="h-4 w-4" /> Preview
      </button>
    </div>
  );
};

export default VendiListingBuilder;

