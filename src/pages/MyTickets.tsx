/**
 * /account/support — My Tickets
 *
 * Customer-facing surface backed by the native support_tickets table. All reads
 * are RLS-scoped by (user_id = auth.uid()); anonymous users are redirected to
 * /auth. Replies use the existing "Users can reply on their tickets" RLS
 * policy on support_ticket_messages, which requires author_id = auth.uid()
 * and is_internal_note = false — clients cannot forge admin notes.
 *
 * Attachments upload to the private "support-ticket-attachments" bucket and
 * are surfaced via short-lived signed URLs; the bucket is never public.
 */
import { useEffect, useMemo, useState, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import {
  ArrowLeft,
  MessageSquare,
  Loader2,
  Paperclip,
  Send,
  Download,
  AlertCircle,
  CheckCircle2,
  Clock,
  Inbox,
  ShieldCheck,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { usePageTracking } from '@/hooks/usePageTracking';

type Ticket = {
  id: string;
  reference_code: string;
  title: string;
  description: string;
  category: string;
  feature_area: string;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  status: string;
  is_blocking: boolean;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  closed_at: string | null;
  first_response_at: string | null;
};

type Msg = {
  id: string;
  ticket_id: string;
  author_role: 'user' | 'admin' | 'system';
  is_internal_note: boolean;
  body: string;
  created_at: string;
};

type Attachment = {
  id: string;
  storage_path: string;
  file_name: string;
  content_type: string | null;
  size_bytes: number | null;
  created_at: string;
};

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIMES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/heic',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);
const ALLOWED_EXTS = /\.(png|jpe?g|webp|gif|heic|pdf|txt|csv|xlsx|docx)$/i;

function sanitizeFileName(name: string): string {
  // strip path separators, control chars, and collapse whitespace; keep it safe for storage keys
  const base = name.replace(/[\\/]/g, '').replace(/[\x00-\x1f<>:"|?*]/g, '').trim();
  const capped = base.slice(0, 120) || 'attachment';
  return capped.replace(/\s+/g, '_');
}

function priorityStyles(p: Ticket['priority']) {
  switch (p) {
    case 'urgent':
      return 'bg-red-500/15 text-red-500 border-red-500/30';
    case 'high':
      return 'bg-orange-500/15 text-orange-500 border-orange-500/30';
    case 'low':
      return 'bg-muted text-muted-foreground border-border';
    default:
      return 'bg-primary/10 text-primary border-primary/30';
  }
}

function statusStyles(s: string) {
  if (s === 'resolved' || s === 'closed') return 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30';
  if (s === 'in_progress' || s === 'waiting_user') return 'bg-blue-500/15 text-blue-500 border-blue-500/30';
  return 'bg-muted text-foreground/80 border-border';
}

function formatBytes(n: number | null | undefined) {
  if (!n) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

const MyTickets = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();
  usePageTracking();

  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(params.get('ticket'));
  const [messages, setMessages] = useState<Msg[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attachmentUrls, setAttachmentUrls] = useState<Record<string, string>>({});
  const [detailLoading, setDetailLoading] = useState(false);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth?redirectTo=/account/support', { replace: true });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('support_tickets')
        .select(
          'id, reference_code, title, description, category, feature_area, priority, status, is_blocking, created_at, updated_at, resolved_at, closed_at, first_response_at',
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) {
        toast({ title: "Couldn't load your tickets", description: error.message, variant: 'destructive' });
      } else {
        setTickets((data as Ticket[]) ?? []);
        if (!selectedId && data && data.length > 0) {
          setSelectedId(data[0].id);
        }
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const selected = useMemo(
    () => tickets.find((t) => t.id === selectedId) ?? null,
    [tickets, selectedId],
  );

  useEffect(() => {
    if (!selected) {
      setMessages([]);
      setAttachments([]);
      setAttachmentUrls({});
      return;
    }
    // reflect selection in URL for shareable deep links (owner-only via RLS)
    if (params.get('ticket') !== selected.id) {
      setParams({ ticket: selected.id }, { replace: true });
    }
    (async () => {
      setDetailLoading(true);
      const [{ data: msgs }, { data: atts }] = await Promise.all([
        supabase
          .from('support_ticket_messages')
          .select('id, ticket_id, author_role, is_internal_note, body, created_at')
          .eq('ticket_id', selected.id)
          .eq('is_internal_note', false)
          .order('created_at', { ascending: true }),
        supabase
          .from('support_ticket_attachments')
          .select('id, storage_path, file_name, content_type, size_bytes, created_at')
          .eq('ticket_id', selected.id)
          .order('created_at', { ascending: true }),
      ]);
      setMessages((msgs as Msg[]) ?? []);
      const rows = (atts as Attachment[]) ?? [];
      setAttachments(rows);
      // sign each in parallel; keep URLs in state, refresh on demand
      if (rows.length) {
        const signed = await Promise.all(
          rows.map((a) =>
            supabase.storage
              .from('support-ticket-attachments')
              .createSignedUrl(a.storage_path, 60 * 5) // 5-minute link, private bucket
              .then((r) => [a.id, r.data?.signedUrl ?? ''] as const),
          ),
        );
        setAttachmentUrls(Object.fromEntries(signed));
      } else {
        setAttachmentUrls({});
      }
      setDetailLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  async function submitReply() {
    if (!user || !selected || !reply.trim()) return;
    setSending(true);
    // RLS-safe insert; author_role is fixed to 'user' and is_internal_note=false
    const { data, error } = await supabase
      .from('support_ticket_messages')
      .insert({
        ticket_id: selected.id,
        author_id: user.id,
        author_role: 'user',
        is_internal_note: false,
        body: reply.trim().slice(0, 5000),
      })
      .select()
      .single();
    setSending(false);
    if (error) {
      toast({ title: "Couldn't send your reply", description: error.message, variant: 'destructive' });
      return;
    }
    setMessages((prev) => [...prev, data as Msg]);
    setReply('');
    toast({ title: 'Reply sent', description: "Support has been notified. You'll see updates here." });
  }

  async function handleAttachmentUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !user || !selected) return;

    if (file.size > MAX_ATTACHMENT_BYTES) {
      toast({ title: 'File too large', description: 'Max 10 MB per attachment.', variant: 'destructive' });
      return;
    }
    if (file.type && !ALLOWED_MIMES.has(file.type) && !ALLOWED_EXTS.test(file.name)) {
      toast({
        title: 'File type not allowed',
        description: 'Allowed: images (png/jpg/webp/gif/heic), PDF, TXT, CSV, XLSX, DOCX.',
        variant: 'destructive',
      });
      return;
    }
    setUploadingFile(true);
    // key includes user_id to align with common storage RLS patterns and prevents cross-user overwrites
    const safeName = sanitizeFileName(file.name);
    const key = `${user.id}/${selected.id}/${Date.now()}-${safeName}`;
    const { error: upErr } = await supabase.storage
      .from('support-ticket-attachments')
      .upload(key, file, { contentType: file.type || 'application/octet-stream', upsert: false });
    if (upErr) {
      setUploadingFile(false);
      toast({ title: "Couldn't upload file", description: upErr.message, variant: 'destructive' });
      return;
    }
    const { data: row, error: rowErr } = await supabase
      .from('support_ticket_attachments')
      .insert({
        ticket_id: selected.id,
        uploaded_by: user.id,
        storage_path: key,
        file_name: safeName,
        content_type: file.type || null,
        size_bytes: file.size,
      })
      .select()
      .single();
    setUploadingFile(false);
    if (rowErr) {
      toast({ title: 'Upload metadata failed', description: rowErr.message, variant: 'destructive' });
      return;
    }
    setAttachments((prev) => [...prev, row as Attachment]);
    const { data: signed } = await supabase.storage
      .from('support-ticket-attachments')
      .createSignedUrl(key, 60 * 5);
    if (signed?.signedUrl) {
      setAttachmentUrls((prev) => ({ ...prev, [(row as Attachment).id]: signed.signedUrl }));
    }
    toast({ title: 'Attached', description: safeName });
  }

  const canReply = selected && selected.status !== 'closed';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        <div className="flex items-center gap-2 mb-6">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/account"><ArrowLeft className="h-4 w-4 mr-1" /> Account</Link>
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="font-display text-3xl font-semibold tracking-tight">My tickets</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Every issue you've reported, plus the conversation with our team.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : tickets.length === 0 ? (
          <Card className="p-12 text-center">
            <Inbox className="mx-auto h-10 w-10 text-muted-foreground/60 mb-4" />
            <h2 className="font-display text-lg font-semibold mb-2">No tickets yet</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
              If something isn't working, use the Report an Issue button anywhere in the app.
              Your ticket will show up here with every reply from our team.
            </p>
            <Button asChild variant="outline">
              <Link to="/">Back to app</Link>
            </Button>
          </Card>
        ) : (
          <div className="grid md:grid-cols-[320px_1fr] gap-6">
            {/* List */}
            <div className="space-y-2 md:max-h-[70vh] md:overflow-auto md:pr-2">
              {tickets.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedId(t.id)}
                  className={`w-full text-left rounded-lg border p-3 transition ${
                    selectedId === t.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-card hover:border-primary/30'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[10px] font-mono tracking-wide text-muted-foreground">
                      {t.reference_code}
                    </span>
                    <Badge variant="outline" className={`${statusStyles(t.status)} text-[10px]`}>
                      {t.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  <div className="text-sm font-medium line-clamp-2">{t.title}</div>
                  <div className="mt-1.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                    {(t.priority === 'urgent' || t.priority === 'high') && (
                      <span className={`inline-flex px-1.5 py-0.5 rounded border ${priorityStyles(t.priority)}`}>
                        {t.priority}
                      </span>
                    )}
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(t.updated_at), { addSuffix: true })}
                  </div>
                </button>
              ))}
            </div>

            {/* Detail */}
            <div>
              {!selected ? (
                <Card className="p-8 text-center text-muted-foreground text-sm">
                  Select a ticket to see its conversation.
                </Card>
              ) : (
                <Card className="p-0 overflow-hidden">
                  <div className="p-5 border-b border-border">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <div className="text-[11px] font-mono text-muted-foreground">{selected.reference_code}</div>
                        <h2 className="font-display text-xl font-semibold mt-1">{selected.title}</h2>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge variant="outline" className={statusStyles(selected.status)}>
                          {selected.status.replace(/_/g, ' ')}
                        </Badge>
                        {(selected.priority === 'urgent' || selected.priority === 'high') && (
                          <Badge variant="outline" className={priorityStyles(selected.priority)}>
                            {selected.priority}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-foreground/80 whitespace-pre-wrap">{selected.description}</p>
                    <div className="mt-3 flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span>Opened {formatDistanceToNow(new Date(selected.created_at), { addSuffix: true })}</span>
                      <span>·</span>
                      <span>{selected.feature_area.replace(/_/g, ' ')}</span>
                      {selected.first_response_at && (
                        <>
                          <span>·</span>
                          <span className="inline-flex items-center gap-1 text-emerald-600">
                            <CheckCircle2 className="h-3 w-3" /> First reply sent
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="p-5 space-y-4 max-h-[45vh] overflow-y-auto">
                    {detailLoading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="text-sm text-muted-foreground text-center py-6">
                        No replies yet. We usually respond within one business day.
                      </div>
                    ) : (
                      messages.map((m) => (
                        <div
                          key={m.id}
                          className={`flex ${m.author_role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                              m.author_role === 'user'
                                ? 'bg-primary text-primary-foreground rounded-br-sm'
                                : 'bg-muted text-foreground rounded-bl-sm'
                            }`}
                          >
                            <div className="whitespace-pre-wrap">{m.body}</div>
                            <div className="text-[10px] opacity-70 mt-1">
                              {m.author_role === 'admin' && (
                                <ShieldCheck className="inline h-3 w-3 mr-0.5" />
                              )}
                              {m.author_role === 'admin' ? 'Support' : 'You'} ·{' '}
                              {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                            </div>
                          </div>
                        </div>
                      ))
                    )}

                    {attachments.length > 0 && (
                      <div className="pt-2 border-t border-border">
                        <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                          Attachments
                        </div>
                        <div className="space-y-1.5">
                          {attachments.map((a) => (
                            <a
                              key={a.id}
                              href={attachmentUrls[a.id] || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 rounded-md bg-muted/50 hover:bg-muted px-3 py-2 text-sm transition"
                            >
                              <Download className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="flex-1 truncate">{a.file_name}</span>
                              <span className="text-[11px] text-muted-foreground shrink-0">
                                {formatBytes(a.size_bytes)}
                              </span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {canReply ? (
                    <div className="p-4 border-t border-border bg-muted/30">
                      <Textarea
                        placeholder="Reply to support…"
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                        rows={3}
                        maxLength={5000}
                        className="mb-2 bg-background"
                      />
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            accept="image/*,.pdf,.txt,.csv,.xlsx,.docx,.heic"
                            onChange={handleAttachmentUpload}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingFile}
                          >
                            {uploadingFile ? (
                              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                            ) : (
                              <Paperclip className="h-4 w-4 mr-1.5" />
                            )}
                            Attach
                          </Button>
                        </div>
                        <Button
                          onClick={submitReply}
                          disabled={!reply.trim() || sending}
                          size="sm"
                        >
                          {sending ? (
                            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4 mr-1.5" />
                          )}
                          Send reply
                        </Button>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-2">
                        Files up to 10 MB — images, PDF, TXT, CSV, XLSX, or DOCX. Private storage.
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 border-t border-border bg-muted/30 text-sm text-muted-foreground flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      This ticket is closed. Open a new ticket if you need more help.
                    </div>
                  )}
                </Card>
              )}
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default MyTickets;
