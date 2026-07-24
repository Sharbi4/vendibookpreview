import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, ExternalLink, Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';

export interface PrivacyFlags {
  show_full_name: boolean;
  show_public_location: boolean;
  show_verified_badge: boolean;
  show_member_since: boolean;
  show_listings_count: boolean;
}

const DEFAULTS: PrivacyFlags = {
  show_full_name: false,
  show_public_location: true,
  show_verified_badge: true,
  show_member_since: true,
  show_listings_count: true,
};

const ROWS: Array<{
  key: keyof PrivacyFlags;
  label: string;
  description: string;
}> = [
  {
    key: 'show_full_name',
    label: 'Show my full name',
    description:
      'Off shows first name + last initial (e.g. "Jane D.") to buyers.',
  },
  {
    key: 'show_public_location',
    label: 'Show city and state',
    description: 'Helps local buyers know where you operate.',
  },
  {
    key: 'show_verified_badge',
    label: 'Show Verified badge',
    description: 'The badge appears once your ID is verified.',
  },
  {
    key: 'show_member_since',
    label: 'Show member-since date',
    description: 'Adds trust for buyers reviewing your storefront.',
  },
  {
    key: 'show_listings_count',
    label: 'Show number of listings',
    description: 'Displays a live count on your public storefront.',
  },
];

interface Props {
  userId: string;
  username?: string | null;
}

const PrivacySharingSection = ({ userId, username }: Props) => {
  const { profile, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const [flags, setFlags] = useState<PrivacyFlags>(DEFAULTS);
  const [savingKey, setSavingKey] = useState<keyof PrivacyFlags | null>(null);

  useEffect(() => {
    const p = profile as unknown as Partial<PrivacyFlags> | null;
    if (!p) return;
    setFlags({
      show_full_name: p.show_full_name ?? DEFAULTS.show_full_name,
      show_public_location:
        p.show_public_location ?? DEFAULTS.show_public_location,
      show_verified_badge:
        p.show_verified_badge ?? DEFAULTS.show_verified_badge,
      show_member_since: p.show_member_since ?? DEFAULTS.show_member_since,
      show_listings_count:
        p.show_listings_count ?? DEFAULTS.show_listings_count,
    });
  }, [profile]);

  const toggle = async (key: keyof PrivacyFlags, next: boolean) => {
    const prev = flags[key];
    setFlags((f) => ({ ...f, [key]: next }));
    setSavingKey(key);
    const { error } = await supabase
      .from('profiles')
      .update({ [key]: next })
      .eq('id', userId);
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

  const previewHref = `/u/${username || userId}`;

  return (
    <section className="rounded-lg border border-border bg-card p-5 md:p-6">
      <div className="flex items-start justify-between gap-4 mb-1">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Privacy &amp; sharing
          </h2>
          <p className="text-sm text-foreground/70 mt-1">
            Choose what appears on your public storefront.
          </p>
        </div>
        <Link
          to={previewHref}
          className="shrink-0 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80"
        >
          <Eye className="h-4 w-4" />
          Preview
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      <div className="mt-4 divide-y divide-border">
        {ROWS.map((row) => (
          <div
            key={row.key}
            className="flex items-start justify-between gap-4 py-4"
          >
            <div className="min-w-0 flex-1">
              <Label
                htmlFor={`priv-${row.key}`}
                className="text-sm font-medium text-foreground"
              >
                {row.label}
              </Label>
              <p className="text-xs text-foreground/60 mt-1 leading-relaxed">
                {row.description}
              </p>
            </div>
            <div className="flex items-center gap-2 pt-0.5">
              {savingKey === row.key && (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-foreground/50" />
              )}
              <Switch
                id={`priv-${row.key}`}
                checked={flags[row.key]}
                onCheckedChange={(v) => toggle(row.key, v)}
                disabled={savingKey === row.key}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default PrivacySharingSection;
