import { useState } from 'react';
import { Loader2, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  type ConciergeConfig,
  type ConciergeOrder,
  type ConciergeUpload,
  saveConciergeIntake,
  submitConciergeIntake,
  uploadConciergeFile,
} from '@/lib/concierge/api';
import VisibilityLabel from '@/components/common/VisibilityLabel';

const CATEGORIES = [
  { value: 'food_truck', label: 'Food truck' },
  { value: 'food_trailer', label: 'Food trailer' },
  { value: 'ghost_kitchen', label: 'Ghost kitchen' },
  { value: 'vendor_lot', label: 'Vendor lot' },
  { value: 'vendor_space', label: 'Vendor space' },
];

const VEHICLE_CATEGORIES = new Set(['food_truck', 'food_trailer']);
const SPACE_CATEGORIES = new Set(['ghost_kitchen', 'vendor_lot', 'vendor_space']);

type IntakeState = Record<string, string | boolean>;

interface ConciergeIntakeFormProps {
  order: ConciergeOrder;
  config: ConciergeConfig;
  userId: string;
  onSaved: (order: ConciergeOrder) => void;
}

/**
 * Abbreviated, category-aware concierge intake. Everything is optional-friendly
 * ("Not sure" is always acceptable) so a seller is never blocked, and only the
 * questions that match their category are shown.
 */
const ConciergeIntakeForm = ({ order, config, userId, onSaved }: ConciergeIntakeFormProps) => {
  const initial = (order.intake ?? {}) as IntakeState;
  const [form, setForm] = useState<IntakeState>({
    mode: (initial.mode as string) ?? 'sale',
    category: (initial.category as string) ?? 'food_truck',
    location: (initial.location as string) ?? '',
    desired_price: (initial.desired_price as string) ?? '',
    wants_pricing_guidance: initial.wants_pricing_guidance === true,
    timeline: (initial.timeline as string) ?? '',
    year: (initial.year as string) ?? '',
    make: (initial.make as string) ?? '',
    model: (initial.model as string) ?? '',
    build_year: (initial.build_year as string) ?? '',
    dimensions: (initial.dimensions as string) ?? '',
    operational_status: (initial.operational_status as string) ?? '',
    known_problems: (initial.known_problems as string) ?? '',
    title_status: (initial.title_status as string) ?? '',
    lien_status: (initial.lien_status as string) ?? '',
    equipment: (initial.equipment as string) ?? '',
    utilities: (initial.utilities as string) ?? '',
    tanks: (initial.tanks as string) ?? '',
    hood_fire: (initial.hood_fire as string) ?? '',
    inclusions: (initial.inclusions as string) ?? '',
    exclusions: (initial.exclusions as string) ?? '',
    handoff: (initial.handoff as string) ?? '',
    rental_terms: (initial.rental_terms as string) ?? '',
    notes: (initial.notes as string) ?? '',
  });
  const [uploads, setUploads] = useState<ConciergeUpload[]>(order.uploads ?? []);
  const [contactMethod, setContactMethod] = useState(order.contact_method ?? 'email');
  const [availability, setAvailability] = useState(order.contact_availability ?? '');
  const [wantsSpecialist, setWantsSpecialist] = useState(order.specialist_contact_requested);
  const [busy, setBusy] = useState<'idle' | 'saving' | 'uploading' | 'submitting'>('idle');

  const set = (k: string, v: string | boolean) => setForm((s) => ({ ...s, [k]: v }));
  const category = String(form.category);
  const isRent = form.mode === 'rent';

  const payload = () => ({
    intake: form as Record<string, unknown>,
    uploads,
    contact_method: contactMethod,
    contact_availability: availability,
    specialist_contact_requested: config.specialist_contact_enabled ? wantsSpecialist : false,
  });

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy('uploading');
    try {
      const added: ConciergeUpload[] = [];
      for (const file of Array.from(files).slice(0, 10)) {
        if (file.size > 50 * 1024 * 1024) {
          toast.error(`${file.name} is larger than 50MB.`);
          continue;
        }
        added.push(await uploadConciergeFile(order.id, userId, file));
      }
      const next = [...uploads, ...added].slice(0, 60);
      setUploads(next);
      const { order: saved } = await saveConciergeIntake(order.id, { ...payload(), uploads: next });
      onSaved(saved);
      if (added.length) toast.success(`${added.length} file(s) uploaded.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setBusy('idle');
    }
  };

  const save = async (announce = true) => {
    setBusy('saving');
    try {
      const { order: saved } = await saveConciergeIntake(order.id, payload());
      onSaved(saved);
      if (announce) toast.success('Saved. You can come back to this anytime.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save.');
    } finally {
      setBusy('idle');
    }
  };

  const submit = async () => {
    setBusy('submitting');
    try {
      await saveConciergeIntake(order.id, payload());
      const { order: saved } = await submitConciergeIntake(order.id);
      onSaved(saved);
      toast.success('Intake submitted — we’ll take it from here.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not submit.');
    } finally {
      setBusy('idle');
    }
  };

  const Field = ({
    id,
    label,
    placeholder,
    multiline,
  }: {
    id: string;
    label: string;
    placeholder?: string;
    multiline?: boolean;
  }) => (
    <div>
      <Label htmlFor={id}>{label}</Label>
      {multiline ? (
        <Textarea
          id={id}
          rows={3}
          value={String(form[id] ?? '')}
          placeholder={placeholder ?? 'Not sure is fine'}
          onChange={(e) => set(id, e.target.value)}
        />
      ) : (
        <Input
          id={id}
          value={String(form[id] ?? '')}
          placeholder={placeholder ?? 'Not sure is fine'}
          onChange={(e) => set(id, e.target.value)}
        />
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Are you selling or renting?</Label>
          <Select value={String(form.mode)} onValueChange={(v) => set('mode', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="sale">Selling</SelectItem>
              <SelectItem value="rent">Renting</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Category</Label>
          <Select value={category} onValueChange={(v) => set('category', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Field id="location" label="General location (city, state)" placeholder="Phoenix, AZ" />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="desired_price" label={isRent ? 'Desired rate' : 'Desired price'} />
        <Field id="timeline" label="Your timeline" placeholder="ASAP / 30 days / flexible" />
      </div>
      <label className="flex items-start gap-3 text-sm text-foreground">
        <Checkbox
          checked={form.wants_pricing_guidance === true}
          onCheckedChange={(c) => set('wants_pricing_guidance', c === true)}
        />
        I’d like pricing guidance instead of setting a price myself.
      </label>

      {VEHICLE_CATEGORIES.has(category) && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="year" label="Vehicle / trailer year" />
          <Field id="make" label="Make" />
          <Field id="model" label="Model" />
          <Field id="build_year" label="Kitchen build year" />
          <Field id="dimensions" label="Dimensions" placeholder="e.g. 18 ft box" />
          <Field id="operational_status" label="Operational status" placeholder="Drives / needs repair / not sure" />
        </div>
      )}

      {SPACE_CATEGORIES.has(category) && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="dimensions" label="Space size" placeholder="e.g. 400 sq ft, 20x30 lot" />
          <Field id="operational_status" label="Current condition" />
        </div>
      )}

      {!isRent && VEHICLE_CATEGORIES.has(category) && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="title_status" label="Title status" placeholder="Clean / salvage / not sure" />
          <Field id="lien_status" label="Loan or lien" placeholder="Paid off / lien / not sure" />
        </div>
      )}

      <Field id="known_problems" label="Known problems or repairs needed" multiline />
      <Field id="equipment" label="Equipment on board" placeholder="Griddle, fryer, refrigeration…" multiline />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="utilities" label="Power, water, propane" />
        <Field id="tanks" label="Fresh / grey water tanks" />
        <Field id="hood_fire" label="Hood and fire suppression" />
        <Field id="handoff" label={isRent ? 'Pickup or on-site use' : 'Pickup or delivery'} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="inclusions" label="What’s included" multiline />
        <Field id="exclusions" label="What’s NOT included" multiline />
      </div>

      {isRent && (
        <Field
          id="rental_terms"
          label="Rental terms"
          placeholder="Minimum rental period, deposit, who covers fuel or cleaning…"
          multiline
        />
      )}

      <Field id="notes" label="Anything else we should know" multiline />

      <div className="rounded-2xl border border-border/60 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-foreground">Photos, video and documents</p>
            <p className="text-xs text-muted-foreground">
              Stored privately. Only you and your assigned reviewer can open them.
            </p>
          </div>
          <Button variant="outline" size="sm" asChild disabled={busy === 'uploading'}>
            <label className="cursor-pointer">
              {busy === 'uploading'
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : <Upload className="mr-2 h-4 w-4" />}
              Upload
              <input
                type="file"
                multiple
                className="sr-only"
                onChange={(e) => handleFiles(e.target.files)}
              />
            </label>
          </Button>
        </div>
        {uploads.length > 0 && (
          <ul className="mt-4 space-y-1.5">
            {uploads.map((u) => (
              <li key={u.path} className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate text-foreground/90">{u.name}</span>
                <button
                  type="button"
                  aria-label={`Remove ${u.name}`}
                  onClick={() => setUploads((s) => s.filter((f) => f.path !== u.path))}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4">
          <VisibilityLabel kind="private" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Preferred follow-up</Label>
          <Select value={contactMethod} onValueChange={setContactMethod}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="text">Text message</SelectItem>
              <SelectItem value="phone">Phone call</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="availability">Good times to reach you</Label>
          <Input
            id="availability"
            value={availability}
            onChange={(e) => setAvailability(e.target.value)}
            placeholder="Weekday mornings"
          />
        </div>
      </div>

      {config.specialist_contact_enabled && (
        <label className="flex items-start gap-3 text-sm text-foreground">
          <Checkbox checked={wantsSpecialist} onCheckedChange={(c) => setWantsSpecialist(c === true)} />
          I would like a VendiBook listing specialist to contact me.
        </label>
      )}

      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={() => save()} disabled={busy !== 'idle'}>
          {busy === 'saving' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save and finish later
        </Button>
        <Button onClick={submit} disabled={busy !== 'idle'}>
          {busy === 'submitting' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Submit my information
        </Button>
      </div>
    </div>
  );
};

export default ConciergeIntakeForm;
