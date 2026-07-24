import { Link } from 'react-router-dom';
import {
  DollarSign, FileCheck, FileText, Rocket, Megaphone, Search, Wrench, Lightbulb, Building2, ArrowRight, Lock, CheckCircle2,
} from 'lucide-react';
import { useHostEntitlements } from '@/hooks/useHostEntitlements';
import { cn } from '@/lib/utils';

const tools = [
  { name: 'Startup Guide', description: 'A step-by-step launch checklist.', icon: Rocket, href: '/tools/startup-guide', minTier: 'free' as const },
  { name: 'PermitPath', description: 'Find every license required in your city.', icon: FileCheck, href: '/tools/permitpath', minTier: 'free' as const },
  { name: 'PricePilot', description: 'Set competitive rates to book faster.', icon: DollarSign, href: '/tools/pricepilot', minTier: 'starter' as const },
  { name: 'Listing Studio', description: 'Write listings that convert.', icon: FileText, href: '/tools/listing-studio', minTier: 'starter' as const },
  { name: 'Marketing Studio', description: 'Ad copy, social posts, launch kits.', icon: Megaphone, href: '/tools/marketing-studio', minTier: 'pro' as const },
  { name: 'Concept Lab', description: 'Validate menu and truck concepts.', icon: Lightbulb, href: '/tools/concept-lab', minTier: 'pro' as const },
  { name: 'Market Radar', description: 'See demand and competition in your area.', icon: Search, href: '/tools/market-radar', minTier: 'pro' as const },
  { name: 'BuildKit', description: 'Blueprints and vendor sourcing.', icon: Wrench, href: '/tools/buildkit', minTier: 'premium' as const },
  { name: 'Regulations Hub', description: 'State-by-state operating rules.', icon: Building2, href: '/tools/regulations-hub', minTier: 'free' as const },
];

const PremiumToolsTab = () => {
  const ent = useHostEntitlements();

  return (
    <div className="max-w-[1080px] mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-foreground">Premium Tools</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your plan: <span className="text-foreground font-medium">{ent.planLabel}</span>
          {ent.tier === 'free' && (
            <> · <Link to="/pricing" className="underline underline-offset-2">Upgrade to unlock more</Link></>
          )}
        </p>
      </header>

      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {tools.map((t) => {
          const unlocked = ent.hasAtLeast(t.minTier);
          const Icon = t.icon;
          const inner = (
            <div className={cn(
              'group h-full flex flex-col p-5 rounded-2xl border border-border bg-card hover:border-foreground/30 transition-colors',
              !unlocked && 'opacity-90',
            )}>
              <div className="flex items-start justify-between">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                  <Icon className="h-5 w-5 text-foreground" />
                </div>
                {unlocked ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600">
                    <CheckCircle2 className="h-3 w-3" /> Unlocked
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600">
                    <Lock className="h-3 w-3" /> {t.minTier === 'starter' ? 'Starter' : t.minTier === 'pro' ? 'Pro' : 'Premium'}
                  </span>
                )}
              </div>
              <h3 className="mt-4 text-base font-medium text-foreground">{t.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground flex-1">{t.description}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-foreground">
                {unlocked ? 'Open' : 'View'} <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </div>
          );
          return (
            <li key={t.href}>
              <Link to={unlocked ? t.href : '/pricing'} className="block h-full no-underline">{inner}</Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default PremiumToolsTab;
