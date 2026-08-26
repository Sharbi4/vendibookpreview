import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check, ImagePlus, Loader2, Send, X, Wrench, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import LivePreviewPanel from '@/components/ai-listing/LivePreviewPanel';
import vendibookFavicon from '@/assets/vendibook-favicon.png';
import {
  buildListingPayload, getPublishBlockers, nextQuestion, progressPercent,
  Question, VendiDraft,
} from '@/lib/vendi-listing/script';
import { isSkip } from '@/lib/vendi-listing/extract';

type Msg = { id: string; role: 'vendi' | 'user'; content: string };

interface LocalPhoto { id: string; file: File; url: string }

const STORAGE_KEY = 'vendibook_list_with_vendi_v1';

const emptyDraft: VendiDraft = {
  title: null, description: null, category: null, mode: null,
};

interface PersistedState {
  draft: VendiDraft;
  answered: string[];
  messages: Msg[];
}

const uid = () => Math.random().toString(36).slice(2);

const VendiListingBuilder: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [draft, setDraft] = useState<VendiDraft>(emptyDraft);
  const [answered, setAnswered] = useState<string[]>([]);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [photos, setPhotos] = useState<LocalPhoto[]>([]);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const [reviewing, setReviewing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const current: Question | null = useMemo(
    () => (reviewing ? null : nextQuestion(draft, answered)),
    [draft, answered, reviewing],
  );

  // Restore anonymous progress
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as PersistedState;
        if (parsed?.draft) {
          setDraft(parsed.draft);
          setAnswered(parsed.answered ?? []);
          setMessages(parsed.messages ?? []);
        }
      }
    } catch { /* ignore corrupt state */ }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ draft, answered, messages }));
    } catch { /* quota — non-fatal */ }
  }, [draft, answered, messages, hydrated]);

  // Ask the first / next question
  useEffect(() => {
    if (!hydrated || reviewing) return;
    const q = nextQuestion(draft, answered);
    if (!q) { setReviewing(true); return; }
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      const prompt = q.prompt(draft);
      if (last?.role === 'vendi' && last.content === prompt) return prev;
      return [...prev, { id: uid(), role: 'vendi', content: prompt }];
    });
  }, [draft, answered, hydrated, reviewing]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, reviewing]);

  const say = (role: Msg['role'], content: string) =>
    setMessages((prev) => [...prev, { id: uid(), role, content }]);

  const submitAnswer = useCallback((raw: string) => {
    const q = current;
    if (!q) return;
    const text = raw.trim();
    if (!text) return;
    say('user', text);
    setInput('');

    if (q.optional && isSkip(text)) {
      setAnswered((prev) => [...prev, q.id]);
      return;
    }

    const result = q.apply(draft, text);
    if (result.error) { say('vendi', result.error); return; }
    setDraft((prev) => ({ ...prev, ...(result.patch ?? {}) }));
    setAnswered((prev) => [...prev, q.id]);
  }, [current, draft]);

  const handlePhotos = (files: FileList | null) => {
    if (!files?.length) return;
    const accepted = Array.from(files).filter((f) => f.type.startsWith('image/') && f.size <= 15 * 1024 * 1024);
    if (accepted.length !== files.length) toast.error('Some files were skipped (images up to 15MB only).');
    setPhotos((prev) => [...prev, ...accepted.map((file) => ({ id: uid(), file, url: URL.createObjectURL(file) }))].slice(0, 12));
  };

  const removePhoto = (id: string) => setPhotos((prev) => prev.filter((p) => p.id !== id));

  const previewImages = uploadedUrls.length ? uploadedUrls : photos.map((p) => p.url);
  const blockers = getPublishBlockers(draft, previewImages.length);

  const uploadPhotos = async (listingId: string, userId: string): Promise<string[]> => {
    const urls: string[] = [];
    for (const photo of photos) {
      const ext = photo.file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${userId}/${listingId}/${Date.now()}-${uid()}.${ext}`;
      const { error } = await supabase.storage.from('listing-images').upload(path, photo.file, {
        cacheControl: '3600', upsert: true, contentType: photo.file.type || 'image/jpeg',
      });
      if (error) throw new Error(`Photo upload failed: ${error.message}`);
      const { data } = supabase.storage.from('listing-images').getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    return urls;
  };

  const handlePublish = async () => {
    if (blockers.length) return;
    if (!user) {
      toast.info('Create your free account to publish — your answers are saved.');
      navigate('/auth?redirect=/list-with-vendi');
      return;
    }
    setPublishing(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error('Please sign in again to publish.');

      const { data: created, error: draftError } = await supabase.functions.invoke('create-listing-draft', {
        headers: { Authorization: `Bearer ${accessToken}` },
        body: {
          mode: draft.mode === 'sale' ? 'sale' : 'rent',
          category: draft.category,
          city: draft.city ?? null,
          state: draft.state ?? null,
          zipCode: draft.zip_code ?? null,
          location: draft.address ?? null,
        },
      });
      if (draftError) throw draftError;
      const listingId = (created as { id?: string } | null)?.id;
      if (!listingId) throw new Error('We could not start your draft. Please try again.');

      const imageUrls = uploadedUrls.length ? uploadedUrls : await uploadPhotos(listingId, user.id);
      setUploadedUrls(imageUrls);

      const payload = buildListingPayload(draft, imageUrls);
      const { error: updateError } = await supabase.from('listings').update(payload as never).eq('id', listingId);
      if (updateError) throw updateError;

      const { error: publishError } = await supabase
        .from('listings')
        .update({ status: 'published', published_at: new Date().toISOString() } as never)
        .eq('id', listingId);

      localStorage.removeItem(STORAGE_KEY);

      if (publishError) {
        toast.message('Draft saved — a few details still need review before it can go live.', {
          description: publishError.message,
        });
        navigate(`/create-listing/${listingId}`);
        return;
      }

      toast.success('Your listing is live.');
      navigate(`/listing/${listingId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong.';
      toast.error(message);
    } finally {
      setPublishing(false);
    }
  };

  const startOver = () => {
    localStorage.removeItem(STORAGE_KEY);
    setDraft(emptyDraft); setAnswered([]); setMessages([]); setPhotos([]); setUploadedUrls([]); setReviewing(false);
  };

  const progress = progressPercent(draft, answered);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Go back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <img src={vendibookFavicon} alt="" className="h-7 w-7 rounded-lg" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-semibold">List with Vendi</h1>
            <p className="truncate text-xs text-muted-foreground">Free guided listing builder — {progress}% complete</p>
          </div>
          <Button variant="ghost" size="sm" className="hidden sm:inline-flex" onClick={() => navigate('/list')}>
            <Wrench className="mr-2 h-4 w-4" /> Build it myself
          </Button>
          <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setShowMobilePreview((v) => !v)}>
            <Eye className="mr-2 h-4 w-4" /> Preview
          </Button>
        </div>
        <div className="h-0.5 w-full bg-muted">
          <motion.div className="h-full bg-primary" animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[1fr_380px]">
        <section className="flex min-h-[60vh] flex-col">
          <div className="flex-1 space-y-4">
            <AnimatePresence initial={false}>
              {messages.map((m) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-border/70 bg-card text-foreground'
                  }`}>
                    {m.content}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {current?.kind === 'choice' && (
              <div className="flex flex-wrap gap-2">
                {(current.options?.(draft) ?? []).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => submitAnswer(opt.value)}
                    className="rounded-xl border border-border/70 bg-card px-4 py-2 text-left text-sm transition hover:border-primary hover:bg-primary/5"
                  >
                    <span className="font-medium">{opt.label}</span>
                    {opt.description && <span className="block text-xs text-muted-foreground">{opt.description}</span>}
                  </button>
                ))}
              </div>
            )}

            {current?.kind === 'yesno' && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => submitAnswer('yes')}>Yes</Button>
                <Button variant="outline" onClick={() => submitAnswer('no')}>No</Button>
              </div>
            )}

            {current?.kind === 'photos' && (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {photos.map((p) => (
                    <div key={p.id} className="relative h-20 w-20 overflow-hidden rounded-xl border border-border/70">
                      <img src={p.url} alt="Listing photo" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        aria-label="Remove photo"
                        onClick={() => removePhoto(p.id)}
                        className="absolute right-1 top-1 rounded-full bg-background/90 p-1"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="flex h-20 w-20 items-center justify-center rounded-xl border border-dashed border-border text-muted-foreground hover:border-primary"
                    aria-label="Add photos"
                  >
                    <ImagePlus className="h-5 w-5" />
                  </button>
                </div>
                <Button onClick={() => submitAnswer('done')} disabled={!photos.length}>
                  Continue with {photos.length} photo{photos.length === 1 ? '' : 's'}
                </Button>
              </div>
            )}

            {reviewing && (
              <div className="rounded-2xl border border-border/70 bg-card p-5">
                <h2 className="text-base font-semibold">Review and publish</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Everything below came straight from your answers. Nothing was added for you.
                </p>
                {blockers.length > 0 && (
                  <ul className="mt-4 space-y-1 text-sm text-destructive">
                    {blockers.map((b) => <li key={b}>• {b}</li>)}
                  </ul>
                )}
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button onClick={handlePublish} disabled={publishing || blockers.length > 0}>
                    {publishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                    Publish listing
                  </Button>
                  <Button variant="outline" onClick={() => { setReviewing(false); setAnswered((prev) => prev.slice(0, -1)); }}>
                    Make changes
                  </Button>
                  <Button variant="ghost" onClick={startOver}>Start over</Button>
                </div>
              </div>
            )}

            <div ref={endRef} />
          </div>

          {current && !['choice', 'yesno', 'photos'].includes(current.kind) && (
            <form
              className="sticky bottom-0 mt-4 flex items-end gap-2 border-t border-border/60 bg-background/90 py-3 backdrop-blur"
              onSubmit={(e) => { e.preventDefault(); submitAnswer(input); }}
            >
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitAnswer(input); }
                }}
                rows={1}
                placeholder={current.placeholder ?? 'Type your answer…'}
                aria-label={current.prompt(draft)}
                className="min-h-[48px] flex-1 resize-none rounded-xl border border-border bg-card px-4 py-3 text-base outline-none focus:border-primary"
              />
              {current.optional && (
                <Button type="button" variant="ghost" onClick={() => submitAnswer('skip')}>Skip</Button>
              )}
              <Button type="submit" size="icon" aria-label="Send answer"><Send className="h-4 w-4" /></Button>
            </form>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => { handlePhotos(e.target.files); e.target.value = ''; }}
          />
        </section>

        <aside className={`${showMobilePreview ? 'block' : 'hidden'} lg:block`}>
          <div className="sticky top-24 h-[70vh] overflow-hidden rounded-2xl border border-border/70 bg-card">
            <LivePreviewPanel preview={draft} images={previewImages} ready={blockers.length === 0} />
          </div>
        </aside>
      </div>
    </div>
  );
};

export default VendiListingBuilder;
