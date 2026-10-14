import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { SettingsSection } from './SettingsKit';

/**
 * Storefront privacy switches. Same profile columns and write as
 * components/account/PrivacySharingSection, laid out as account rows.
 */
interface PrivacyFlags {
  show_public_location: boolean;
  show_verified_badge: boolean;
  show_member_since: boolean;
  show_listings_count: boolean;
}

const DEFAULTS: PrivacyFlags = {
  show_public_location: true,
  show_verified_badge: true,
  show_member_since: true,
  show_listings_count: true,
};

const ROWS: Array<{ key: keyof PrivacyFlags; label: string; description: string }> = [
  { key: 'show_public_location', label: 'City and state', description: 'Helps local buyers know where you operate.' },
  { key: 'show_verified_badge', label: 'Verified badge', description: 'Appears once your ID is verified.' },
  { key: 'show_member_since', label: 'Member-since date', description: 'Adds trust for buyers reviewing your storefront.' },
  { key: 'show_listings_count', label: 'Number of listings', description: 'A live count on your public storefront.' },
];

export default function PrivacySettings({ id = 'privacy', userId }: { id?: string; userId: string }) {
  const { profile, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const [flags, setFlags] = useState<PrivacyFlags>(DEFAULTS);
  const [savingKey, setSavingKey] = useState<keyof PrivacyFlags | null>(null);

  useEffect(() => {
    const p = profile as unknown as Partial<PrivacyFlags> | null;
    if (!p) return;
    setFlags({
      show_public_location: p.show_public_location ?? DEFAULTS.show_public_location,
      show_verified_badge: p.show_verified_badge ?? DEFAULTS.show_verified_badge,
      show_member_since: p.show_member_since ?? DEFAULTS.show_member_since,
      show_listings_count: p.show_listings_count ?? DEFAULTS.show_listings_count,
    });
  }, [profile]);

  const toggle = async (key: keyof PrivacyFlags, next: boolean) => {
    const prev = flags[key];
    setFlags((f) => ({ ...f, [key]: next }));
    setSavingKey(key);
    const { error } = await supabase.from('profiles').update({ [key]: next }).eq('id', userId);
    setSavingKey(null);
    if (error) {
      setFlags((f) => ({ ...f, [key]: prev }));
      toast.error('Could not save privacy setting');
      return;
    }
    await refreshProfile();
    queryClient.invalidateQueries({ queryKey: ['public-profile'] });
    toast.success('Privacy updated');
  };

  return (
    <SettingsSection id={id} title="Privacy" description="Choose what appears on your public storefront.">
      {ROWS.map((row) => (
        <li key={row.key} className="flex items-center justify-between gap-4 px-5 py-4 sm:gap-6 sm:px-6">
          <div className="min-w-0 flex-1">
            <label htmlFor={`priv-${row.key}`} className="block cursor-pointer text-[14px] font-semibold leading-5 text-[#1C1B1A]">{row.label}</label>
            <p className="mt-0.5 text-[13px] leading-5 text-[#8A847B]">{row.description}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {savingKey === row.key && <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin text-[#8A847B]" />}
            <Switch
              id={`priv-${row.key}`}
              checked={flags[row.key]}
              onCheckedChange={(v) => void toggle(row.key, v)}
              disabled={savingKey === row.key}
              className="data-[state=checked]:bg-[#1C1B1A] data-[state=unchecked]:bg-[#DCD5CB] [&>span]:bg-white [&>span]:shadow-[0_1px_2px_rgba(28,27,26,0.25)]"
            />
          </div>
        </li>
      ))}
    </SettingsSection>
  );
}
