import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BadgeCheck, ExternalLink, Loader2, Phone, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  listActivePartners,
  PARTNER_CATEGORIES,
  type ServicePartner,
} from '@/lib/partners/partners';
import PartnerLeadForm from '@/components/partners/PartnerLeadForm';

const Partners = () => {
  const [params, setParams] = useSearchParams();
  const active = params.get('category') ?? 'all';
  const [partners, setPartners] = useState<ServicePartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ServicePartner | null>(null);
  const [dialog, setDialog] = useState(false);

  useEffect(() => {
    let alive = true;
    listActivePartners()
      .then((data) => {
        if (alive) setPartners(data);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Failed to load partners'))
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    if (active === 'all') return partners;
    return partners.filter((p) => p.category === active);
  }, [partners, active]);

  const handleTab = (v: string) => {
    if (v === 'all') params.delete('category');
    else params.set('category', v);
    setParams(params, { replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <section className="mx-auto max-w-6xl px-4 py-14">
        <p className="text-sm font-medium uppercase tracking-widest text-orange-400">
          Partners
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Services to help you launch and operate
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Vendibook-vetted partners for financing, insurance, inspections, transport, kitchens,
          builders, wraps, POS, fire suppression, cleaning, and repair. Vendibook only shares
          your info after you explicitly consent on the request form.
        </p>

        <Tabs value={active} onValueChange={handleTab} className="mt-8">
          <TabsList className="flex flex-wrap gap-1">
            <TabsTrigger value="all">All</TabsTrigger>
            {PARTNER_CATEGORIES.map((c) => (
              <TabsTrigger key={c.key} value={c.key}>
                {c.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {loading ? (
          <div className="mt-12 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-10 rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-muted-foreground">
            No partners listed here yet. Check back soon — Vendibook is onboarding vendors
            regularly. In the meantime, contact support@vendibook.com if you need a specific
            service.
          </div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <div
                key={p.id}
                className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-foreground">{p.company_name}</h3>
                    <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                      {PARTNER_CATEGORIES.find((c) => c.key === p.category)?.label ?? p.category}
                    </p>
                  </div>
                  {p.is_verified && (
                    <Badge variant="secondary" className="gap-1">
                      <BadgeCheck className="h-3 w-3" /> Verified
                    </Badge>
                  )}
                </div>
                {p.description && (
                  <p className="mt-3 text-sm text-muted-foreground">{p.description}</p>
                )}
                <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                  {p.service_area && (
                    <p className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {p.service_area}
                    </p>
                  )}
                  {p.phone && (
                    <p className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {p.phone}
                    </p>
                  )}
                </div>
                <div className="mt-4 flex-1" />
                <div className="mt-4 flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelected(p);
                      setDialog(true);
                    }}
                  >
                    Request info
                  </Button>
                  {p.website_url && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={p.website_url} target="_blank" rel="noreferrer noopener">
                        Website
                        <ExternalLink className="ml-1 h-3 w-3" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <PartnerLeadForm partner={selected} open={dialog} onOpenChange={setDialog} />
    </div>
  );
};

export default Partners;
