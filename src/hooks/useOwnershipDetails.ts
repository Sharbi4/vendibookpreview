import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const db = supabase as unknown as { from: (table: string) => any };

export interface OwnershipPrivateValues {
  titled_owner?: string | null;
  authority_to_sell?: boolean | null;
  title_name_type?: string | null;
  title_state?: string | null;
  title_status?: string | null;
  active_lien?: boolean | null;
  lien_holder_name?: string | null;
  lien_release_available?: boolean | null;
  vin_serial?: string | null;
  manufacturer_plate?: string | null;
  title_number?: string | null;
  documents_available?: boolean | null;
  ownership_notes?: string | null;
}

/**
 * Private ownership record. RLS restricts this row to the listing owner (and
 * admins) — nothing here is ever rendered publicly. Only the derived summary
 * written to listing_specs.ownership_public is buyer-facing.
 */
export const useOwnershipDetails = (listingId?: string | null, hostId?: string | null) => {
  const [values, setValues] = useState<OwnershipPrivateValues>({});
  const [loading, setLoading] = useState(Boolean(listingId));
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!listingId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await db
      .from('listing_ownership_details')
      .select('*')
      .eq('listing_id', listingId)
      .maybeSingle();
    if (data) {
      const { id, listing_id, host_id, created_at, updated_at, ...rest } = data;
      setValues(rest as OwnershipPrivateValues);
    }
    setLoading(false);
  }, [listingId]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = useCallback(
    async (next: OwnershipPrivateValues) => {
      if (!listingId) return false;
      setSaving(true);
      const { error } = await db.from('listing_ownership_details').upsert(
        {
          listing_id: listingId,
          ...(hostId ? { host_id: hostId } : {}),
          ...next,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'listing_id' },
      );
      setSaving(false);
      if (error) return false;
      setValues(next);
      return true;
    },
    [listingId, hostId],
  );

  return { values, loading, saving, save, reload: load };
};

const OWNERSHIP_BUCKET = 'listing-ownership-docs';

export interface OwnershipDoc {
  name: string;
  path: string;
}

/**
 * Sensitive ownership paperwork lives in a private bucket keyed by user id and
 * is only ever read through short-lived signed URLs.
 */
export const useOwnershipDocuments = (listingId?: string | null, userId?: string | null) => {
  const [docs, setDocs] = useState<OwnershipDoc[]>([]);
  const [busy, setBusy] = useState(false);

  const prefix = userId && listingId ? `${userId}/${listingId}` : null;

  const refresh = useCallback(async () => {
    if (!prefix) return;
    const { data } = await supabase.storage.from(OWNERSHIP_BUCKET).list(prefix, { limit: 50 });
    setDocs((data ?? []).map((f) => ({ name: f.name, path: `${prefix}/${f.name}` })));
  }, [prefix]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const upload = useCallback(
    async (file: File) => {
      if (!prefix) return false;
      setBusy(true);
      const safeName = file.name.replace(/[^\w.\-]+/g, '_');
      const { error } = await supabase.storage
        .from(OWNERSHIP_BUCKET)
        .upload(`${prefix}/${Date.now()}_${safeName}`, file, { upsert: false });
      setBusy(false);
      if (error) return false;
      await refresh();
      return true;
    },
    [prefix, refresh],
  );

  const remove = useCallback(
    async (path: string) => {
      setBusy(true);
      const { error } = await supabase.storage.from(OWNERSHIP_BUCKET).remove([path]);
      setBusy(false);
      if (error) return false;
      await refresh();
      return true;
    },
    [refresh],
  );

  const openSigned = useCallback(async (path: string) => {
    const { data } = await supabase.storage.from(OWNERSHIP_BUCKET).createSignedUrl(path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  }, []);

  return { docs, busy, upload, remove, openSigned, refresh };
};
