import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  SpecValues,
  computeReadiness,
  sectionsForListing,
  ReadinessResult,
  READINESS_SCORE_VERSION,
} from '@/lib/listings/readiness';

// The generated Supabase types lag behind new tables; these tables are simple
// JSONB buckets so a loose client is safe here.
const db = supabase as unknown as {
  from: (table: string) => any;
};

interface UseListingSpecsArgs {
  listingId?: string | null;
  category?: string | null;
  mode?: string | null;
  /** Skip loading entirely (e.g. drafts). */
  enabled?: boolean;
}

export interface UseListingSpecsResult {
  values: SpecValues;
  confirmedSections: string[];
  readiness: ReadinessResult;
  loading: boolean;
  saving: boolean;
  /** Set when another session saved after this one loaded. */
  conflict: boolean;
  reload: () => Promise<void>;
  saveSection: (sectionKey: string, sectionValues: Record<string, unknown>) => Promise<boolean>;
}

/** Active (Phase 4) section buckets. */
const SECTION_KEYS = [
  'equipment_inventory', 'utilities', 'safety', 'vehicle', 'trailer', 'space',
  'dimensions', 'condition_details', 'inclusions', 'viewing', 'ownership_public',
];

/** Legacy buckets kept read-only; used to pre-fill the newer sections. */
const LEGACY_KEYS = [
  'cooking', 'refrigeration', 'electrical', 'propane', 'plumbing', 'hood',
  'mechanical', 'inspections', 'site',
];

/**
 * Seeds the Phase 4 sections from pre-Phase-4 data so existing listings never
 * look emptier than they are. Legacy columns are never written again.
 */
const seedFromLegacy = (row: Record<string, any>, next: SpecValues): SpecValues => {
  const legacy = (k: string) => (row[k] as Record<string, unknown>) ?? {};
  const isEmpty = (o: Record<string, unknown>) => Object.keys(o ?? {}).length === 0;

  if (isEmpty(next.utilities)) {
    const el = legacy('electrical');
    const pr = legacy('propane');
    const pl = legacy('plumbing');
    next.utilities = {
      ...(el.shore_power ? { shore_power: el.shore_power } : {}),
      ...(el.generator ? { generator_present: true, generator_model: el.generator } : {}),
      ...(el.inverter_battery ? { solar_battery: el.inverter_battery } : {}),
      ...(pr.tank_count ? { propane_tank_count: pr.tank_count } : {}),
      ...(pr.tank_size_lbs ? { propane_tank_size: `${pr.tank_size_lbs} lb` } : {}),
      ...(pl.fresh_water_gal ? { fresh_water_gal: pl.fresh_water_gal } : {}),
      ...(pl.grey_water_gal ? { grey_water_gal: pl.grey_water_gal } : {}),
      ...(pl.water_heater ? { water_heater: pl.water_heater } : {}),
      ...(pl.sinks ? { sink_configuration: pl.sinks } : {}),
    };
  }
  if (isEmpty(next.safety)) {
    const h = legacy('hood');
    next.safety = {
      ...(h.hood_type ? { hood_type: h.hood_type } : {}),
      ...(h.suppression_system ? { suppression_system: h.suppression_system } : {}),
    };
  }
  if (isEmpty(next.vehicle)) {
    const m = legacy('mechanical');
    next.vehicle = {
      ...(m.engine ? { engine: m.engine } : {}),
      ...(m.transmission ? { transmission: m.transmission } : {}),
      ...(m.tire_condition ? { tires_brakes: m.tire_condition } : {}),
    };
  }
  if (isEmpty(next.trailer)) {
    const m = legacy('mechanical');
    next.trailer = {
      ...(m.axles ? { axles: m.axles } : {}),
      ...(m.hitch_type ? { hitch_type: m.hitch_type } : {}),
      ...(m.tire_condition ? { tire_age_condition: m.tire_condition } : {}),
    };
  }
  if (isEmpty(next.space)) {
    const s = legacy('site');
    next.space = {
      ...(s.power_available ? { utilities_available: s.power_available } : {}),
      ...(s.restrooms !== undefined ? { restroom: s.restrooms } : {}),
    };
  }
  if (isEmpty(next.condition_details)) {
    const i = legacy('inspections');
    next.condition_details = {
      ...(i.fire_inspection ? { last_service_date: i.fire_inspection } : {}),
    };
  }
  return next;
};

export const useListingSpecs = ({
  listingId,
  category,
  mode,
  enabled = true,
}: UseListingSpecsArgs): UseListingSpecsResult => {
  const [values, setValues] = useState<SpecValues>({});
  const [confirmedSections, setConfirmedSections] = useState<string[]>([]);
  const [revision, setRevision] = useState(0);
  const [conflict, setConflict] = useState(false);
  const [loading, setLoading] = useState(Boolean(listingId && enabled));
  const [saving, setSaving] = useState(false);

  const sections = sectionsForListing(category, mode);

  const load = useCallback(async () => {
    if (!listingId || !enabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await db
      .from('listing_specs')
      .select('*')
      .eq('listing_id', listingId)
      .maybeSingle();
    if (data) {
      let next: SpecValues = {};
      for (const key of [...SECTION_KEYS, ...LEGACY_KEYS]) {
        next[key] = (data[key] as Record<string, unknown>) ?? {};
      }
      next = seedFromLegacy(data, next);
      setValues(next);
      setConfirmedSections((data.confirmed_sections as string[]) ?? []);
      setRevision((data.revision as number) ?? 0);
    }
    setConflict(false);
    setLoading(false);
  }, [listingId, enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveSection = useCallback(
    async (sectionKey: string, sectionValues: Record<string, unknown>) => {
      if (!listingId) return false;
      setSaving(true);

      // Conflict check: another session may have saved since we loaded.
      const { data: current } = await db
        .from('listing_specs')
        .select('revision')
        .eq('listing_id', listingId)
        .maybeSingle();
      if (current && typeof current.revision === 'number' && current.revision > revision) {
        setSaving(false);
        setConflict(true);
        return false;
      }

      const nextConfirmed = confirmedSections.includes(sectionKey)
        ? confirmedSections
        : [...confirmedSections, sectionKey];

      const { error } = await db.from('listing_specs').upsert(
        {
          listing_id: listingId,
          [sectionKey]: sectionValues,
          confirmed_sections: nextConfirmed,
          revision: revision + 1,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'listing_id' },
      );
      setSaving(false);
      if (error) return false;

      const nextValues = { ...values, [sectionKey]: sectionValues };
      setValues(nextValues);
      setConfirmedSections(nextConfirmed);
      setRevision((r) => r + 1);

      const readiness = computeReadiness(sections, nextValues);
      await db.from('listing_completeness').upsert(
        {
          listing_id: listingId,
          score: readiness.score,
          readiness_level: readiness.level,
          missing_sections: readiness.missingSections,
          score_version: READINESS_SCORE_VERSION,
          computed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'listing_id' },
      );
      return true;
    },
    [listingId, confirmedSections, values, sections, revision],
  );

  return {
    values,
    confirmedSections,
    readiness: computeReadiness(sections, values),
    loading,
    saving,
    conflict,
    reload: load,
    saveSection,
  };
};
