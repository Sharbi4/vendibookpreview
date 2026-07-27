/**
 * ConsentModal — reusable glass modal for every "please review and agree"
 * moment in the app (signup, publish, checkout final-review, featured
 * activation, cancellation, etc.).
 *
 * Loads the active document via the `current_legal_document` RPC, presents
 * a scrollable body with jump-to-bottom / back-to-top affordances, requires
 * a non-preselected checkbox, and calls `record_user_consent` server-side
 * on accept. The parent's onAccept callback only runs after the consent
 * write succeeds (spec §5.7–5.10).
 */
import * as React from 'react';
import ReactMarkdown from 'react-markdown';
import { ExternalLink, ArrowDown, ArrowUp, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';
import { useLegalDocument } from '@/hooks/useLegalDocument';
import { useRecordConsent } from '@/hooks/useRecordConsent';
import {
  CURRENT_VERSIONS,
  DOCUMENT_SLUGS,
  type ConsentTrigger,
  type DocumentType,
} from '@/lib/legalDocuments';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentType: DocumentType;
  trigger: ConsentTrigger;
  acceptanceText: string;
  relatedIds?: Record<string, string>;
  intro?: string;
  primaryLabel?: string;
  /** Optional trust mark or helper node rendered below the action row. */
  footerSlot?: React.ReactNode;
  onAccept: (consentId: string) => void | Promise<void>;
  onCancel?: () => void;
}

export const ConsentModal: React.FC<Props> = ({
  open,
  onOpenChange,
  documentType,
  trigger,
  acceptanceText,
  relatedIds,
  intro,
  primaryLabel = 'Accept and continue',
  footerSlot,
  onAccept,
  onCancel,
}) => {
  const [agreed, setAgreed] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const { data: doc, isLoading, error } = useLegalDocument(documentType);
  const record = useRecordConsent();

  // Reset agreement each time the modal reopens (never preselected).
  React.useEffect(() => {
    if (open) setAgreed(false);
  }, [open, documentType]);

  const version = doc?.version ?? CURRENT_VERSIONS[documentType];
  const slug = DOCUMENT_SLUGS[documentType];

  const scrollBy = (direction: 'top' | 'bottom') => {
    const el = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null;
    if (!el) return;
    el.scrollTo({ top: direction === 'bottom' ? el.scrollHeight : 0, behavior: 'smooth' });
  };

  const handleAccept = async () => {
    if (!agreed) return;
    try {
      const consentId = await record.mutateAsync({
        documentType,
        documentVersion: version,
        trigger,
        acceptanceText,
        relatedIds,
      });
      await onAccept(consentId);
      onOpenChange(false);
    } catch (err) {
      // Spec §5.9-10 + §33: never continue silently after a failed consent write.
      toast({
        title: 'Could not record your acceptance',
        description:
          err instanceof Error
            ? err.message
            : 'Please try again. If the problem continues, contact support@vendibook.com.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl p-0 gap-0 overflow-hidden border-white/10 bg-background/70 backdrop-blur-xl shadow-2xl"
        data-testid="consent-modal"
      >
        <DialogHeader className="p-6 pb-3">
          <DialogTitle className="text-xl font-semibold">
            {doc?.title ?? 'Review and accept'}
          </DialogTitle>
          {(intro || doc?.summary) && (
            <DialogDescription className="text-sm text-muted-foreground">
              {intro ?? doc?.summary}
            </DialogDescription>
          )}
          {doc && (
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span>Version {doc.version}</span>
              <span aria-hidden>·</span>
              <span>
                Effective {new Date(doc.effective_at).toLocaleDateString()}
              </span>
              <span aria-hidden>·</span>
              <a
                href={`/legal/${slug}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 underline underline-offset-4 hover:text-foreground"
              >
                Open full document
                <ExternalLink className="h-3 w-3" aria-hidden />
              </a>
            </div>
          )}
        </DialogHeader>

        <div ref={scrollRef} className="border-t border-white/10">
          <ScrollArea className="h-[45vh] px-6 py-4">
            {isLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Loading document…
              </div>
            )}
            {error && (
              <div className="text-sm text-destructive" role="alert">
                We couldn't load this document. Please close and try again.
              </div>
            )}
            {doc && (
              <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-semibold">
                <ReactMarkdown>{doc.body_markdown}</ReactMarkdown>
              </div>
            )}
          </ScrollArea>
          <div className="flex items-center justify-end gap-2 border-t border-white/10 px-4 py-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => scrollBy('bottom')}
              aria-label="Jump to bottom of document"
            >
              <ArrowDown className="h-3.5 w-3.5 mr-1" aria-hidden />
              Jump to bottom
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => scrollBy('top')}
              aria-label="Back to top of document"
            >
              <ArrowUp className="h-3.5 w-3.5 mr-1" aria-hidden />
              Back to top
            </Button>
          </div>
        </div>

        <div className="border-t border-white/10 bg-background/80 p-6 space-y-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={agreed}
              onCheckedChange={(v) => setAgreed(v === true)}
              aria-label={acceptanceText}
              data-testid="consent-modal-checkbox"
            />
            <span className="text-sm text-foreground leading-snug">
              {acceptanceText}
            </span>
          </label>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                onCancel?.();
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="dark-shine"
              disabled={!agreed || record.isPending || isLoading || !doc}
              onClick={handleAccept}
              data-testid="consent-modal-primary"
            >
              {record.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" aria-hidden />
              )}
              {primaryLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConsentModal;
