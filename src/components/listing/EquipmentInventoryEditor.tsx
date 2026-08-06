import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  EQUIPMENT_GROUPS,
  EQUIPMENT_CONDITION_LABELS,
  EQUIPMENT_FUEL_LABELS,
  EquipmentCondition,
  EquipmentFuel,
  EquipmentGroup,
  EquipmentItem,
  groupLabel,
  newEquipmentItem,
  readInventory,
} from '@/lib/listings/equipment';

interface Props {
  value: Record<string, unknown>;
  saving: boolean;
  onSave: (value: Record<string, unknown>) => Promise<boolean>;
  onDirtyChange?: (dirty: boolean) => void;
}

const ItemRow: React.FC<{
  item: EquipmentItem;
  presets: string[];
  onChange: (patch: Partial<EquipmentItem>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}> = ({ item, presets, onChange, onRemove, onMove }) => (
  <div className="rounded-lg border border-border/60 bg-background/40 p-3 space-y-3">
    <div className="flex items-start gap-2">
      <div className="flex-1 space-y-2">
        <Select
          value={presets.includes(item.name) ? item.name : item.name ? 'Other' : undefined}
          onValueChange={(v) => onChange({ name: v === 'Other' ? '' : v })}
        >
          <SelectTrigger className="text-base"><SelectValue placeholder="Choose equipment" /></SelectTrigger>
          <SelectContent>
            {presets.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        {!presets.includes(item.name) && (
          <Input
            className="text-base"
            placeholder="Equipment name"
            value={item.name ?? ''}
            onChange={(e) => onChange({ name: e.target.value })}
          />
        )}
      </div>
      <div className="flex flex-col gap-1">
        <Button type="button" variant="ghost" size="icon" aria-label="Move up" onClick={() => onMove(-1)}>
          <ChevronUp className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" aria-label="Move down" onClick={() => onMove(1)}>
          <ChevronDown className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" aria-label="Remove item" onClick={onRemove}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>

    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1">
        <Label className="text-xs">Quantity</Label>
        <Input
          className="text-base" type="number" inputMode="numeric" min={1}
          value={item.quantity ?? ''}
          onChange={(e) => onChange({ quantity: e.target.value === '' ? null : Number(e.target.value) })}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Brand</Label>
        <Input className="text-base" value={item.brand ?? ''} onChange={(e) => onChange({ brand: e.target.value })} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Model</Label>
        <Input className="text-base" value={item.model ?? ''} onChange={(e) => onChange({ model: e.target.value })} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Size</Label>
        <Input className="text-base" placeholder='e.g. 36"' value={item.size ?? ''} onChange={(e) => onChange({ size: e.target.value })} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Gas or electric</Label>
        <Select value={item.fuel ?? 'not_sure'} onValueChange={(v) => onChange({ fuel: v as EquipmentFuel })}>
          <SelectTrigger className="text-base"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(EQUIPMENT_FUEL_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Condition</Label>
        <Select value={item.condition ?? 'not_sure'} onValueChange={(v) => onChange({ condition: v as EquipmentCondition })}>
          <SelectTrigger className="text-base"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(EQUIPMENT_CONDITION_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Approximate install or purchase year</Label>
        <Input className="text-base" placeholder="Not sure is fine" value={item.year ?? ''} onChange={(e) => onChange({ year: e.target.value })} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Known issue</Label>
        <Input className="text-base" value={item.known_issue ?? ''} onChange={(e) => onChange({ known_issue: e.target.value })} />
      </div>
      <div className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2 sm:col-span-2">
        <Label className="text-xs">Included in the sale or rental</Label>
        <Switch checked={item.included !== false} onCheckedChange={(v) => onChange({ included: v })} />
      </div>
    </div>
  </div>
);

/**
 * Structured equipment inventory. Saves independently; nothing is public until
 * the seller saves the section.
 */
export const EquipmentInventoryEditor: React.FC<Props> = ({ value, saving, onSave, onDirtyChange }) => {
  const [items, setItems] = useState<EquipmentItem[]>(() => readInventory(value));
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const markDirty = (next: EquipmentItem[]) => {
    setItems(next);
    setDirty(true);
    onDirtyChange?.(true);
  };

  const byGroup = useMemo(() => {
    const map = new Map<EquipmentGroup, EquipmentItem[]>();
    for (const item of items) {
      map.set(item.group, [...(map.get(item.group) ?? []), item]);
    }
    return map;
  }, [items]);

  const update = (id: string, patch: Partial<EquipmentItem>) =>
    markDirty(items.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const move = (id: string, dir: -1 | 1) => {
    const index = items.findIndex((i) => i.id === id);
    const target = index + dir;
    if (index < 0 || target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    markDirty(next);
  };

  const save = async () => {
    setError(null);
    const cleaned = items.filter((i) => i.name.trim());
    const ok = await onSave({ items: cleaned });
    if (!ok) {
      setError('We could not save your equipment list. Check your connection and try again.');
      return;
    }
    setItems(cleaned);
    setDirty(false);
    onDirtyChange?.(false);
  };

  return (
    <div className="space-y-4">
      {EQUIPMENT_GROUPS.map((group) => (
        <div key={group.key} className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium text-foreground">{group.label}</h4>
              {(byGroup.get(group.key)?.length ?? 0) > 0 && (
                <Badge variant="secondary">{byGroup.get(group.key)!.length}</Badge>
              )}
            </div>
            <Button
              type="button" variant="ghost" size="sm"
              onClick={() => markDirty([...items, newEquipmentItem(group.key)])}
            >
              <Plus className="mr-1 h-4 w-4" /> Add
            </Button>
          </div>
          <div className="space-y-2">
            {(byGroup.get(group.key) ?? []).map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                presets={group.presets}
                onChange={(patch) => update(item.id, patch)}
                onRemove={() => markDirty(items.filter((i) => i.id !== item.id))}
                onMove={(dir) => move(item.id, dir)}
              />
            ))}
          </div>
        </div>
      ))}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="sticky bottom-0 -mx-1 flex items-center justify-between gap-3 border-t border-border/60 bg-background/95 px-1 py-3 backdrop-blur">
        <p className="text-xs text-muted-foreground">
          {dirty ? 'Unsaved changes' : `${items.length} item${items.length === 1 ? '' : 's'} saved`}
        </p>
        <Button type="button" onClick={save} disabled={saving || !dirty}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {error ? 'Retry save' : 'Save equipment'}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Grouped as {EQUIPMENT_GROUPS.map((g) => groupLabel(g.key)).join(', ')}.
      </p>
    </div>
  );
};

export default EquipmentInventoryEditor;
