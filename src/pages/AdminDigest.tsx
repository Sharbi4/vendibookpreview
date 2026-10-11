import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Mail, Send, Eye, Loader2, CheckCircle2, CalendarClock, Plus, Trash2,
  Monitor, Smartphone, ShieldCheck, AlertTriangle, FlaskConical,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import Header from '@/components/layout/Header';
import { getRecentPosts } from '@/data/blogPosts';
import { cn } from '@/lib/utils';

// The table is new; generated types may lag one deploy cycle.
const digests = () => (supabase.from as any)('weekly_digests');

interface WhatsNewItem { title: string; body: string }
interface Digest {
  id: string;
  week_key: string;
  subject: string;
  preview_text: string;
  article_title: string;
  article_excerpt: string;
  article_image_url: string;
  article_url: string;
  whats_new: WhatsNewItem[];
  featured_listing_ids: string[];
  status: 'draft' | 'ready' | 'approved' | 'sent';
  sent_at: string | null;
  recipient_count: number | null;
}

interface ListingOption { id: string; title: string; city: string | null; state: string | null }

const STEPS = [
  { key: 'draft', label: 'Draft' },
  { key: 'ready', label: 'Ready for review' },
  { key: 'approved', label: 'Approved' },
  { key: 'sent', label: 'Sent' },
] as const;

function weekKey(d = new Date()): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export default function AdminDigest() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading } = useAuth();

  const { data: isAdmin = false, isLoading: roleLoading } = useQuery({
    queryKey: ['is-admin', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data } = await supabase.rpc('is_admin', { user_id: user.id });
      return !!data;
    },
    enabled: !!user?.id,
  });

  const currentWeek = useMemo(() => weekKey(), []);

  const { data: digest, isLoading: digestLoading } = useQuery<Digest | null>({
    queryKey: ['weekly-digest', currentWeek],
    queryFn: async () => {
      const { data, error } = await digests().select('*').eq('week_key', currentWeek).maybeSingle();
      if (error) throw error;
      if (data) return data as Digest;
      const { data: created, error: cErr } = await digests()
        .insert({ week_key: currentWeek, subject: `This week on Vendibook` })
        .select('*')
        .single();
      if (cErr) throw cErr;
      return created as Digest;
    },
    enabled: isAdmin,
  });

  const { data: lastSent } = useQuery<Digest | null>({
    queryKey: ['weekly-digest-last-sent'],
    queryFn: async () => {
      const { data } = await digests().select('*').eq('status', 'sent').order('sent_at', { ascending: false }).limit(1).maybeSingle();
      return (data as Digest) || null;
    },
    enabled: isAdmin,
  });

  const { data: listingOptions = [] } = useQuery<ListingOption[]>({
    queryKey: ['weekly-digest-listing-options'],
    queryFn: async () => {
      const { data } = await supabase
        .from('listings')
        .select('id,title,city,state')
        .eq('status', 'published')
        .is('deleted_at', null)
        .order('published_at', { ascending: false })
        .limit(12);
      return (data || []) as ListingOption[];
    },
    enabled: isAdmin,
  });

  // Local editor state mirrors the row
  const [form, setForm] = useState<Digest | null>(null);
  useEffect(() => { if (digest && !form) setForm(digest); }, [digest, form]);

  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<{ subject: string; html: string } | null>(null);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [audienceCount, setAudienceCount] = useState<number | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
    if (!authLoading && !roleLoading && user && !isAdmin) navigate('/');
  }, [authLoading, roleLoading, user, isAdmin, navigate]);

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['weekly-digest', currentWeek] });
    queryClient.invalidateQueries({ queryKey: ['weekly-digest-last-sent'] });
  }, [queryClient, currentWeek]);

  if (authLoading || roleLoading || !user || !isAdmin) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }
  if (digestLoading || !form) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  const locked = form.status === 'sent';
  const set = (patch: Partial<Digest>) => setForm((f) => (f ? { ...f, ...patch } : f));

  const save = async (status?: Digest['status']) => {
    setSaving(true);
    try {
      const patch: Record<string, unknown> = {
        subject: form.subject, preview_text: form.preview_text,
        article_title: form.article_title, article_excerpt: form.article_excerpt,
        article_image_url: form.article_image_url, article_url: form.article_url,
        whats_new: form.whats_new, featured_listing_ids: form.featured_listing_ids,
        updated_at: new Date().toISOString(),
      };
      if (status) {
        patch.status = status;
        if (status === 'approved') { patch.approved_by = user.id; patch.approved_at = new Date().toISOString(); }
      }
      const { error } = await digests().update(patch).eq('id', form.id);
      if (error) throw error;
      if (status) set({ status });
      toast.success(status === 'approved' ? 'Digest approved for send.' : status === 'ready' ? 'Marked ready for review.' : 'Draft saved.');
      refresh();
    } catch (e: any) {
      toast.error(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const loadPreview = async (mode: 'desktop' | 'mobile') => {
    setLoadingPreview(true);
    setPreviewMode(mode);
    try {
      await save();
      const { data, error } = await supabase.functions.invoke('send-marketplace-digest', { body: { action: 'render', digestId: form.id } });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Preview failed');
      setPreview(data);
    } catch (e: any) {
      toast.error(e.message || 'Preview failed');
    } finally {
      setLoadingPreview(false);
    }
  };

  const sendTest = async () => {
    if (!testEmail.trim()) { toast.error('Enter a test email address.'); return; }
    setSendingTest(true);
    try {
      await save();
      const { data, error } = await supabase.functions.invoke('send-marketplace-digest', { body: { action: 'test', digestId: form.id, email: testEmail.trim() } });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Test send failed');
      toast.success(`Test sent to ${data.sentTo}. The digest status was not changed.`);
    } catch (e: any) {
      toast.error(e.message || 'Test send failed');
    } finally {
      setSendingTest(false);
    }
  };

  const openConfirm = async () => {
    setConfirmOpen(true);
    setAudienceCount(null);
    try {
      const { data } = await supabase.functions.invoke('send-marketplace-digest', { body: { action: 'audience' } });
      if (data?.success) setAudienceCount(data.count);
    } catch { /* count stays null — shown as unavailable */ }
  };

  const sendNow = async () => {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-marketplace-digest', { body: { action: 'send', digestId: form.id } });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Send failed');
      toast.success(`Digest sent to ${data.recipientCount?.toLocaleString() ?? 'the'} subscribers.`);
      setConfirmOpen(false);
      setForm(null);
      refresh();
    } catch (e: any) {
      toast.error(e.message || 'Send failed');
    } finally {
      setSending(false);
    }
  };

  const recentPosts = getRecentPosts(12);
  const stepIndex = STEPS.findIndex((s) => s.key === form.status);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Mail className="h-7 w-7 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Weekly Digest</h1>
            <Badge variant="secondary">{form.week_key}</Badge>
          </div>
          <p className="text-muted-foreground">One weekly digest, reviewed and sent by hand. There is no automatic schedule.</p>
        </div>

        {/* Status stepper */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex items-center gap-2">
              <div className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border',
                i < stepIndex && 'border-emerald-500/40 text-emerald-500',
                i === stepIndex && 'border-primary bg-primary text-primary-foreground',
                i > stepIndex && 'border-border text-muted-foreground',
              )}>
                {i < stepIndex ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span>{i + 1}</span>}
                {s.label}
              </div>
              {i < STEPS.length - 1 && <span className="text-muted-foreground">→</span>}
            </div>
          ))}
        </div>

        {/* Editorial recommendation (not a schedule) */}
        <Card className="mb-6 border-primary/20">
          <CardContent className="pt-6 flex flex-col sm:flex-row gap-4 sm:items-center">
            <CalendarClock className="h-8 w-8 text-primary shrink-0" />
            <div>
              <div className="font-semibold text-foreground">Recommended send window: Tuesdays at 11:00 AM Eastern / 8:00 AM Pacific</div>
              <p className="text-sm text-muted-foreground mt-1">This is an editorial recommendation only. Digests are never sent automatically — sending requires your approval and a manual click below.</p>
            </div>
          </CardContent>
        </Card>

        {lastSent && (
          <div className="mb-6 text-sm text-muted-foreground flex flex-wrap items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            Last sent: <span className="font-medium text-foreground">{lastSent.week_key}</span>
            on {lastSent.sent_at ? new Date(lastSent.sent_at).toLocaleString() : '—'}
            {lastSent.recipient_count != null && <> · {lastSent.recipient_count.toLocaleString()} recipients</>}
          </div>
        )}

        {/* Editor */}
        <Card className="mb-6">
          <CardHeader><CardTitle>Digest content</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-2">
              <Label htmlFor="subject">Subject line</Label>
              <Input id="subject" value={form.subject} disabled={locked} onChange={(e) => set({ subject: e.target.value })} placeholder="This week on Vendibook" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="preview">Preview text (inbox snippet + email intro)</Label>
              <Textarea id="preview" rows={2} value={form.preview_text} disabled={locked} onChange={(e) => set({ preview_text: e.target.value })} placeholder="One or two sentences that summarize this week's digest." />
            </div>

            <div className="border-t border-border pt-5 space-y-4">
              <Label>Featured blog article (one)</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                disabled={locked}
                value=""
                onChange={(e) => {
                  const post = recentPosts.find((p) => p.slug === e.target.value);
                  if (post) set({
                    article_title: post.title,
                    article_excerpt: post.excerpt,
                    article_image_url: post.image || '',
                    article_url: `/blog/${post.slug}`,
                  });
                }}
              >
                <option value="">Fill from a recent article…</option>
                {recentPosts.map((p) => <option key={p.slug} value={p.slug}>{p.title}</option>)}
              </select>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input placeholder="Article title" value={form.article_title} disabled={locked} onChange={(e) => set({ article_title: e.target.value })} />
                <Input placeholder="Article URL (e.g. /blog/my-post)" value={form.article_url} disabled={locked} onChange={(e) => set({ article_url: e.target.value })} />
              </div>
              <Textarea rows={2} placeholder="Short excerpt" value={form.article_excerpt} disabled={locked} onChange={(e) => set({ article_excerpt: e.target.value })} />
              <Input placeholder="Hero image URL (optional)" value={form.article_image_url} disabled={locked} onChange={(e) => set({ article_image_url: e.target.value })} />
            </div>

            <div className="border-t border-border pt-5 space-y-3">
              <div className="flex items-center justify-between">
                <Label>What's new on Vendibook (up to 4 short items)</Label>
                {!locked && form.whats_new.length < 4 && (
                  <Button type="button" variant="outline" size="sm" onClick={() => set({ whats_new: [...form.whats_new, { title: '', body: '' }] })}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add item
                  </Button>
                )}
              </div>
              {form.whats_new.map((item, i) => (
                <div key={i} className="rounded-lg border border-border p-3 space-y-2">
                  <div className="flex gap-2">
                    <Input placeholder="Item title" value={item.title} disabled={locked}
                      onChange={(e) => set({ whats_new: form.whats_new.map((w, j) => (j === i ? { ...w, title: e.target.value } : w)) })} />
                    {!locked && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => set({ whats_new: form.whats_new.filter((_, j) => j !== i) })}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <Textarea rows={2} placeholder="One or two sentences" value={item.body} disabled={locked}
                    onChange={(e) => set({ whats_new: form.whats_new.map((w, j) => (j === i ? { ...w, body: e.target.value } : w)) })} />
                </div>
              ))}
            </div>

            <div className="border-t border-border pt-5 space-y-2">
              <Label>Featured listings (optional, up to 3)</Label>
              <div className="grid sm:grid-cols-2 gap-2">
                {listingOptions.map((l) => {
                  const checked = form.featured_listing_ids.includes(l.id);
                  return (
                    <label key={l.id} className={cn('flex items-center gap-2 rounded-lg border p-2.5 text-sm cursor-pointer', checked ? 'border-primary bg-primary/5' : 'border-border', locked && 'opacity-60 pointer-events-none')}>
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={locked || (!checked && form.featured_listing_ids.length >= 3)}
                        onChange={(e) => set({
                          featured_listing_ids: e.target.checked
                            ? [...form.featured_listing_ids, l.id]
                            : form.featured_listing_ids.filter((id) => id !== l.id),
                        })}
                      />
                      <span className="truncate">{l.title} <span className="text-muted-foreground">· {[l.city, l.state].filter(Boolean).join(', ')}</span></span>
                    </label>
                  );
                })}
              </div>
            </div>

            {!locked && (
              <Button variant="outline" onClick={() => save()} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Save draft
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Preview + test */}
        <Card className="mb-6">
          <CardHeader><CardTitle>Preview & test</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={() => loadPreview('desktop')} disabled={loadingPreview || locked}>
                {loadingPreview ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Monitor className="h-4 w-4 mr-2" />}
                Desktop preview
              </Button>
              <Button variant="outline" onClick={() => loadPreview('mobile')} disabled={loadingPreview || locked}>
                <Smartphone className="h-4 w-4 mr-2" /> Mobile preview
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <Input type="email" placeholder="Test email address" value={testEmail} disabled={locked} onChange={(e) => setTestEmail(e.target.value)} className="sm:max-w-xs" />
              <Button variant="outline" onClick={sendTest} disabled={sendingTest || locked}>
                {sendingTest ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FlaskConical className="h-4 w-4 mr-2" />}
                Send test
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Test sends go to one address with a TEST banner and never mark the digest as sent.</p>
            {preview && (
              <div className={cn('mx-auto transition-all', previewMode === 'mobile' ? 'max-w-[380px]' : 'w-full')}>
                <p className="text-sm text-muted-foreground mb-2">Subject: <span className="font-medium text-foreground">{preview.subject}</span></p>
                <iframe srcDoc={preview.html} title="Digest preview" className="w-full h-[640px] border border-border rounded-lg bg-white" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Workflow actions */}
        <Card>
          <CardHeader><CardTitle>Review & send</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {form.status === 'draft' && (
              <Button variant="outline" onClick={() => save('ready')} disabled={saving}>
                <Eye className="h-4 w-4 mr-2" /> Mark ready for review
              </Button>
            )}
            {form.status === 'ready' && (
              <Button variant="outline" onClick={() => save('approved')} disabled={saving}>
                <ShieldCheck className="h-4 w-4 mr-2" /> Approve for send
              </Button>
            )}
            {form.status === 'approved' && (
              <Button onClick={openConfirm} disabled={sending}>
                <Send className="h-4 w-4 mr-2" /> Send digest now
              </Button>
            )}
            {form.status === 'sent' && (
              <div className="flex items-center gap-2 text-sm text-emerald-500">
                <CheckCircle2 className="h-4 w-4" />
                Sent {form.sent_at ? new Date(form.sent_at).toLocaleString() : ''}
                {form.recipient_count != null && ` · ${form.recipient_count.toLocaleString()} recipients`}
              </div>
            )}
          </CardContent>
        </Card>

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-primary" /> Send the weekly digest now?
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-2">
                  <p>Subject: <span className="font-medium text-foreground">{form.subject}</span></p>
                  <p>Audience: {audienceCount == null ? 'count unavailable' : <span className="font-medium text-foreground">{audienceCount.toLocaleString()} subscribers</span>}</p>
                  <p className="font-medium">This will send the weekly Vendibook digest now. It cannot be automatically scheduled, and this digest cannot be sent twice.</p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={sending}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={sendNow} disabled={sending}>
                {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                Send now
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}
