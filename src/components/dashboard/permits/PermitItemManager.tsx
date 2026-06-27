import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarClock, BadgeCheck, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  mergeItemFields,
  type PermitItem,
  type PermitItemStatus,
} from '@/lib/permitsApi';
import PermitDocumentUploader from './PermitDocumentUploader';


interface Props {
  userId: string;
  roadmapId: string;
  itemKey: string;
  defaultIssuer?: string;
  initial?: PermitItem | null;
  onChange?: (item: PermitItem) => void;
}

const STATUS_OPTIONS: { value: PermitItemStatus; label: string }[] = [
  { value: 'not_started', label: 'Not started' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'approved', label: 'Approved' },
  { value: 'expired', label: 'Expired' },
];

const STATUS_CHIP: Record<PermitItemStatus, string> = {
  not_started: 'bg-white/[0.06] text-white/65 border-white/15',
  in_progress: 'bg-white/[0.10] text-white/85 border-white/20',
  submitted: 'bg-white/[0.10] text-white/85 border-white/25',
  approved: 'bg-white/[0.12] text-white border-white/30',
  expired: 'bg-amber-500/15 text-amber-200 border-amber-400/35',
};

const fieldClass =
  'w-full bg-white/[0.04] border border-white/15 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/35 outline-none focus:border-white/35 focus:bg-white/[0.06] [color-scheme:dark]';

const labelClass =
  'text-[10px] uppercase tracking-[0.18em] text-white/45 font-semibold mb-1.5';

export default function PermitItemManager({
  userId,
  roadmapId,
  itemKey,
  defaultIssuer,
  initial,
  onChange,
}: Props) {
  const [status, setStatus] = useState<PermitItemStatus>(initial?.status ?? 'not_started');
  const [permitNumber, setPermitNumber] = useState(initial?.permit_number ?? '');
  const [issuingAgency, setIssuingAgency] = useState(initial?.issuing_agency ?? defaultIssuer ?? '');
  const [issueDate, setIssueDate] = useState(initial?.issue_date ?? '');
  const [expiresOn, setExpiresOn] = useState(initial?.expires_on ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [saving, setSaving] = useState<'idle' | 'saving' | 'saved'>('idle');
  const firstRun = useRef(true);

  // Track the initial values we hydrated from, so we only send fields the
  // user actually touched on THIS device. Combined with the server's per-field
  // timestamps, this gives us per-field merge across devices.
  const baseline = useRef({
    status: initial?.status ?? 'not_started',
    permit_number: initial?.permit_number ?? '',
    issuing_agency: initial?.issuing_agency ?? (defaultIssuer ?? ''),
    issue_date: initial?.issue_date ?? '',
    expires_on: initial?.expires_on ?? '',
    notes: initial?.notes ?? '',
  });

  // Debounced save — per-field merge
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    setSaving('saving');
    const t = setTimeout(async () => {
      try {
        const patch: Record<string, string | null> = {};
        if (status !== baseline.current.status) patch.status = status;
        if (permitNumber !== baseline.current.permit_number)
          patch.permit_number = permitNumber.trim() || null;
        if (issuingAgency !== baseline.current.issuing_agency)
          patch.issuing_agency = issuingAgency.trim() || null;
        if (notes !== baseline.current.notes) patch.notes = notes.trim() || null;
        if (issueDate !== baseline.current.issue_date) patch.issue_date = issueDate || null;
        if (expiresOn !== baseline.current.expires_on) patch.expires_on = expiresOn || null;
        if (Object.keys(patch).length === 0) {
          setSaving('idle');
          return;
        }
        const next = await mergeItemFields(roadmapId, itemKey, patch as any);
        // Update baseline so unchanged fields aren't resent next tick.
        baseline.current = {
          status: next.status,
          permit_number: next.permit_number ?? '',
          issuing_agency: next.issuing_agency ?? '',
          issue_date: next.issue_date ?? '',
          expires_on: next.expires_on ?? '',
          notes: next.notes ?? '',
        };
        onChange?.(next);
        setSaving('saved');
        setTimeout(() => setSaving('idle'), 1200);
      } catch {
        setSaving('idle');
      }
    }, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, permitNumber, issuingAgency, issueDate, expiresOn, notes]);


  const expiryHint = (() => {
    if (!expiresOn) return null;
    const d = new Date(expiresOn);
    if (isNaN(d.getTime())) return null;
    const days = Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days < 0) return { tone: 'amber', text: `Expired ${Math.abs(days)}d ago` };
    if (days <= 60) return { tone: 'silver-warm', text: `Renews in ${days}d` };
    return { tone: 'silver', text: `${days}d until renewal` };
  })();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 rounded-xl border border-white/[0.12] bg-white/[0.025] p-4 space-y-4"
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-[10px] uppercase tracking-[0.18em] text-white/45 font-semibold inline-flex items-center gap-2">
          <BadgeCheck className="h-3.5 w-3.5 text-white/55" />
          Manage permit
        </div>
        <span
          className={cn(
            'text-[10px] uppercase tracking-[0.14em] font-semibold px-2 py-0.5 rounded-full border',
            STATUS_CHIP[status],
          )}
        >
          {STATUS_OPTIONS.find((s) => s.value === status)?.label}
        </span>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <div className={labelClass}>Status</div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as PermitItemStatus)}
            className={fieldClass}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value} className="bg-[#16161a]">
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <div className={labelClass}>Permit / license number</div>
          <input
            type="text"
            value={permitNumber}
            onChange={(e) => setPermitNumber(e.target.value)}
            placeholder="e.g. MFU-2026-00482"
            className={fieldClass}
            maxLength={120}
          />
        </div>
        <div>
          <div className={labelClass}>Issuing agency</div>
          <div className="relative">
            <Building2 className="h-3.5 w-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={issuingAgency}
              onChange={(e) => setIssuingAgency(e.target.value)}
              placeholder="Issuing department / agency"
              className={cn(fieldClass, 'pl-8')}
              maxLength={160}
            />
          </div>
        </div>
        <div>
          <div className={labelClass}>Issue date</div>
          <input
            type="date"
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
            className={fieldClass}
          />
        </div>
        <div>
          <div className={labelClass}>Expiration date</div>
          <div className="relative">
            <input
              type="date"
              value={expiresOn}
              onChange={(e) => setExpiresOn(e.target.value)}
              className={fieldClass}
            />
            {expiryHint && (
              <div
                className={cn(
                  'mt-1.5 inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full border',
                  expiryHint.tone === 'amber'
                    ? 'bg-amber-500/15 text-amber-200 border-amber-400/35'
                    : expiryHint.tone === 'silver-warm'
                      ? 'bg-white/[0.10] text-white/85 border-white/25'
                      : 'bg-white/[0.04] text-white/65 border-white/15',
                )}
              >
                <CalendarClock className="h-3 w-3" /> {expiryHint.text}
              </div>
            )}
          </div>
        </div>
        <div className="sm:col-span-2">
          <div className={labelClass}>Notes</div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Inspector name, confirmation number, login portal, etc."
            rows={2}
            maxLength={2000}
            className={cn(fieldClass, 'resize-none leading-relaxed')}
          />
        </div>
      </div>

      <PermitDocumentUploader userId={userId} roadmapId={roadmapId} itemKey={itemKey} />

      <div className="text-[11px] text-white/40 h-4">
        {saving === 'saving' && 'Saving…'}
        {saving === 'saved' && 'Saved to your dashboard'}
      </div>
    </motion.div>
  );
}
