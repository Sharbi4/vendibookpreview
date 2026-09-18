import { useState } from 'react';
import { Loader2, FileText, Download, PenLine, CheckCircle2, Clock, ExternalLink, RefreshCw, Eye } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  createSigningSession,
  getSignedPdfUrl,
  useTransactionDocuments,
  type DocumentRow,
  type DocumentScope,
} from '@/hooks/useTransactionDocuments';

const DOC_LABEL: Record<string, string> = {
  // Current package
  purchase_sale_agreement: 'Purchase & sale agreement',
  rental_agreement: 'Rental agreement',
  sale_handoff_condition_acknowledgment: 'Handoff & condition acknowledgment',
  rental_checkin_condition_report: 'Check-in condition report',
  rental_checkout_condition_report: 'Check-out condition report',
  transaction_amendment: 'Transaction amendment',
  delivery_handoff_acknowledgment: 'Delivery handoff acknowledgment',
  // Historical kinds kept so older transactions still read clearly
  bill_of_sale: 'Bill of sale',
  purchase_agreement: 'Purchase agreement',
  kitchen_agreement: 'Kitchen agreement',
  handoff_acknowledgment: 'Handoff acknowledgment',
};

const STATUS_LABEL: Record<DocumentRow['status'], string> = {
  draft: 'Being prepared',
  sent: 'Awaiting signatures',
  partially_signed: 'Partially signed',
  completed: 'Signed by both parties',
  voided: 'Voided',
};

const ROLE_LABEL: Record<string, string> = {
  host: 'Host', renter: 'Renter', seller: 'Seller', buyer: 'Buyer',
  party_a: 'First party', party_b: 'Second party', provider: 'Delivering party', recipient: 'Receiving party',
};

export function DocumentsCard({
  scope,
  title = 'Documents',
  /** On a Documents tab the card stays visible and explains the empty state. */
  whenEmpty = 'show',
}: { scope: DocumentScope; title?: string; whenEmpty?: 'show' | 'hide' }) {
  const { user } = useAuth();
  const { docs, preparing, notice, kinds, reload, prepareKind, refreshAfterSigning } = useTransactionDocuments(scope);
  const [session, setSession] = useState<{ url: string; docId: string } | null>(null);
  const [preview, setPreview] = useState<{ url: string; label: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const openSigning = async (doc: DocumentRow) => {
    setBusy(doc.id);
    try {
      const url = await createSigningSession(doc.id);
      setSession({ url, docId: doc.id });
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not open the signing session');
    } finally {
      setBusy(null);
    }
  };

  const closeSigning = async () => {
    setSession(null);
    // The signature lands through SignNow's webhook, so poll briefly.
    await refreshAfterSigning();
  };

  const downloadSigned = async (doc: DocumentRow) => {
    setBusy(doc.id);
    try {
      window.open(await getSignedPdfUrl(doc.id), '_blank', 'noopener,noreferrer');
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not open the signed PDF');
    } finally {
      setBusy(null);
    }
  };

  /** Read the signed PDF in place. The link is short-lived and never stored. */
  const openPreview = async (doc: DocumentRow) => {
    setBusy(doc.id);
    try {
      const url = await getSignedPdfUrl(doc.id);
      setPreview({ url, label: DOC_LABEL[doc.document_type] ?? doc.document_type });
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not open the signed PDF');
    } finally {
      setBusy(null);
    }
  };

  if (docs === null) {
    return (
      <Card><CardContent className="p-6 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading documents…</CardContent></Card>
    );
  }

  // Nothing yet and nothing to say about it — stay out of the way when inline.
  if (!docs.length && !preparing && !notice && whenEmpty === 'hide') return null;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> {title}</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Documents are prepared from your transaction details and signed inside Vendibook. Signing records the agreement; it does not move any money.
              </p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="shrink-0"
              onClick={() => reload()}
              aria-label="Refresh document status"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {preparing && !docs.length && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Preparing your documents…
            </div>
          )}
          {!docs.length && !preparing && (
            <p className="text-sm text-muted-foreground">
              {notice ?? 'No documents have been prepared for this transaction yet.'}
            </p>
          )}

          {docs.map((doc) => {
            const me = doc.signers?.find((s) => s.user_id === user?.id || s.email?.toLowerCase() === user?.email?.toLowerCase());
            const mySigned = !!me?.signed_at;
            const complete = doc.status === 'completed';
            return (
              <div key={doc.id} className="rounded-md border-[1.5px] border-border/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium">
                      {DOC_LABEL[doc.document_type] ?? doc.document_type}
                      {doc.superseded_by_document_id && (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">(replaced by a newer version)</span>
                      )}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {STATUS_LABEL[doc.status]}
                      {(doc.template_version ?? doc.agreement_version) && ` · Version ${doc.template_version ?? doc.agreement_version}`}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs">
                      {doc.signers.map((s) => (
                        <span key={s.email} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 border-[1.5px] ${s.signed_at ? 'border-emerald-500/40 text-emerald-600 bg-emerald-500/5' : 'border-amber-500/40 text-amber-600 bg-amber-500/5'}`}>
                          {s.signed_at ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                          {ROLE_LABEL[s.role] ?? s.role}: {s.signed_at ? 'Signed' : 'Awaiting signature'}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!complete && me && !mySigned && doc.status !== 'voided' && (
                      <Button size="sm" onClick={() => openSigning(doc)} disabled={busy === doc.id}>
                        {busy === doc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><PenLine className="h-4 w-4 mr-1" /> Review & sign</>}
                      </Button>
                    )}
                    {!complete && me && mySigned && (
                      <span className="self-center text-xs text-muted-foreground">You have signed</span>
                    )}
                    {complete && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => openPreview(doc)} disabled={busy === doc.id}>
                          {busy === doc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Eye className="h-4 w-4 mr-1" /> Preview</>}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => downloadSigned(doc)} disabled={busy === doc.id}>
                          <Download className="h-4 w-4 mr-1" /> Download
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                {!complete && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    A completed copy is saved here once both parties have signed.
                  </p>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Dialog open={!!session} onOpenChange={(o) => { if (!o) void closeSigning(); }}>
        <DialogContent className="max-w-4xl w-[calc(100vw-1.5rem)] sm:w-[95vw] h-[90dvh] p-0 gap-0 overflow-hidden flex flex-col">
          <DialogHeader className="shrink-0 p-4 border-b-[1.5px]">
            <DialogTitle className="text-base">Review &amp; sign</DialogTitle>
            <p className="text-xs text-muted-foreground">
              This is a live signing session. Your signature is recorded when you finish; close this window afterwards to update the status.
            </p>
          </DialogHeader>
          {session && (
            <>
              <div className="flex-1 min-h-0 w-full overflow-hidden">
                <iframe
                  title="Vendibook document signing"
                  src={session.url}
                  className="block h-full w-full max-w-full border-0"
                  allow="camera; microphone"
                />
              </div>
              <div className="shrink-0 border-t-[1.5px] p-3 flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">Trouble loading? Open the session in a new tab.</p>
                <Button size="sm" variant="outline" onClick={() => window.open(session.url, '_blank', 'noopener,noreferrer')}>
                  <ExternalLink className="h-4 w-4 mr-1" /> Open in new tab
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!preview} onOpenChange={(o) => { if (!o) setPreview(null); }}>
        <DialogContent className="max-w-4xl w-[calc(100vw-1.5rem)] sm:w-[95vw] h-[90dvh] p-0 gap-0 overflow-hidden flex flex-col">
          <DialogHeader className="shrink-0 p-4 border-b-[1.5px]">
            <DialogTitle className="text-base">{preview?.label ?? 'Signed document'}</DialogTitle>
            <p className="text-xs text-muted-foreground">
              Signed copy. This preview link is private to you and expires after a few minutes.
            </p>
          </DialogHeader>
          {preview && (
            <>
              <div className="flex-1 min-h-0 w-full overflow-hidden bg-muted/30">
                <iframe
                  title={`${preview.label} preview`}
                  src={preview.url}
                  className="block h-full w-full max-w-full border-0"
                />
              </div>
              <div className="shrink-0 border-t-[1.5px] p-3 flex items-center justify-end">
                <Button size="sm" variant="outline" onClick={() => window.open(preview.url, '_blank', 'noopener,noreferrer')}>
                  <ExternalLink className="h-4 w-4 mr-1" /> Open in new tab
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
