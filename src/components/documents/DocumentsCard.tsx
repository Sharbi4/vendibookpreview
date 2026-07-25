import { useEffect, useState } from 'react';
import { Loader2, FileText, Download, PenLine, CheckCircle2, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

type Scope = { booking_id: string } | { transaction_id: string };

interface Signer {
  role: 'host' | 'renter' | 'seller' | 'buyer';
  user_id: string | null;
  email: string;
  first_name?: string;
  last_name?: string;
  signed_at?: string | null;
}

interface DocRow {
  id: string;
  document_type: string;
  status: 'draft' | 'sent' | 'partially_signed' | 'completed' | 'voided';
  signers: Signer[];
  signed_pdf_path: string | null;
  created_at: string;
}

const DOC_LABEL: Record<string, string> = {
  rental_agreement: 'Rental agreement',
  bill_of_sale: 'Bill of sale',
  purchase_agreement: 'Purchase agreement',
  kitchen_agreement: 'Kitchen agreement',
  handoff_acknowledgment: 'Handoff acknowledgment',
};

export function DocumentsCard({ scope, title = 'Documents' }: { scope: Scope; title?: string }) {
  const { user } = useAuth();
  const [docs, setDocs] = useState<DocRow[] | null>(null);
  const [signingUrl, setSigningUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    const query = supabase.from('documents').select('id,document_type,status,signers,signed_pdf_path,created_at').order('created_at', { ascending: false });
    const { data, error } = 'booking_id' in scope
      ? await query.eq('booking_id', scope.booking_id)
      : await query.eq('transaction_id', scope.transaction_id);
    if (error) { console.error(error); return; }
    setDocs((data ?? []) as unknown as DocRow[]);
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [JSON.stringify(scope)]);

  const openSigning = async (doc: DocRow) => {
    setBusy(doc.id);
    try {
      const { data, error } = await supabase.functions.invoke('signnow-create-embedded-session', {
        body: { document_id: doc.id },
      });
      if (error) throw error;
      setSigningUrl((data as any)?.url ?? null);
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not open signing session');
    } finally {
      setBusy(null);
    }
  };

  const downloadSigned = async (doc: DocRow) => {
    setBusy(doc.id);
    try {
      const { data, error } = await supabase.functions.invoke('signnow-download-signed', {
        body: { document_id: doc.id },
      });
      if (error) throw error;
      const url = (data as any)?.url;
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not download PDF');
    } finally {
      setBusy(null);
    }
  };

  if (docs === null) {
    return (
      <Card><CardContent className="p-6 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading documents…</CardContent></Card>
    );
  }
  if (!docs.length) return null;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> {title}</CardTitle>
          <p className="text-xs text-muted-foreground">Free e-signature included — protects both parties.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {docs.map((doc) => {
            const me = doc.signers?.find((s) => s.user_id === user?.id || s.email?.toLowerCase() === user?.email?.toLowerCase());
            const mySigned = !!me?.signed_at;
            const complete = doc.status === 'completed';
            return (
              <div key={doc.id} className="rounded-md border-[1.5px] border-border/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium">{DOC_LABEL[doc.document_type] ?? doc.document_type}</div>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs">
                      {doc.signers.map((s) => (
                        <span key={s.email} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 border-[1.5px] ${s.signed_at ? 'border-emerald-500/40 text-emerald-600 bg-emerald-500/5' : 'border-amber-500/40 text-amber-600 bg-amber-500/5'}`}>
                          {s.signed_at ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                          {s.role[0].toUpperCase() + s.role.slice(1)}: {s.signed_at ? 'Signed' : 'Awaiting signature'}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!complete && me && !mySigned && (
                      <Button size="sm" onClick={() => openSigning(doc)} disabled={busy === doc.id}>
                        {busy === doc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><PenLine className="h-4 w-4 mr-1" /> Review & sign</>}
                      </Button>
                    )}
                    {complete && (
                      <Button size="sm" variant="outline" onClick={() => downloadSigned(doc)} disabled={busy === doc.id}>
                        {busy === doc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Download className="h-4 w-4 mr-1" /> Signed PDF</>}
                      </Button>
                    )}
                  </div>
                </div>
                {!complete && (
                  <p className="mt-3 text-xs text-muted-foreground">Signing is encouraged but not required to proceed.</p>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Dialog open={!!signingUrl} onOpenChange={(o) => !o && setSigningUrl(null)}>
        <DialogContent className="max-w-4xl w-[95vw] h-[85vh] p-0 gap-0 overflow-hidden">
          <DialogHeader className="p-4 border-b-[1.5px]"><DialogTitle>Sign document</DialogTitle></DialogHeader>
          {signingUrl && (
            <iframe title="SignNow" src={signingUrl} className="w-full h-full" allow="camera; microphone" />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
