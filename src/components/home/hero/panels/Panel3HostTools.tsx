import { Link } from 'react-router-dom';
import { CheckCircle2, Circle, FileText, Calendar, TrendingUp, MapPin } from 'lucide-react';
import HeroPanelShell from './HeroPanelShell';
import GlassCard from './GlassCard';
import { Button } from '@/components/ui/button';
import { trackLeadEvent } from '@/lib/leadTracking';
import hostToolsBg from '@/assets/hero-hosttools-bg.png.asset.json';

const CleaningCard = () => (
  <GlassCard rotate={-2} className="w-[230px]">
    <div className="text-[11px] font-bold text-neutral-900 mb-2">Cleaning workflow</div>
    <ul className="space-y-1.5 text-xs text-neutral-700">
      <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-orange-500" /> Pre-rental checklist</li>
      <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-orange-500" /> During rental</li>
      <li className="flex items-center gap-2"><Circle className="w-3.5 h-3.5 text-neutral-400" /> Post-rental cleanup</li>
    </ul>
  </GlassCard>
);

const DocsCard = () => (
  <GlassCard rotate={2} className="w-[240px]">
    <div className="flex items-center justify-between mb-2">
      <div className="text-[11px] font-bold text-neutral-900 flex items-center gap-1.5">
        <FileText className="w-3.5 h-3.5 text-orange-500" /> Document collection
      </div>
      <span className="text-[10px] font-semibold text-orange-600">4/4</span>
    </div>
    <ul className="space-y-1 text-xs text-neutral-700">
      <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-orange-500" /> COI Certificate</li>
      <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-orange-500" /> Business License</li>
      <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-orange-500" /> Driver's License</li>
      <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-orange-500" /> Health Permit</li>
    </ul>
  </GlassCard>
);

const BookingCard = () => (
  <GlassCard rotate={-1} className="w-[220px]">
    <div className="text-[11px] font-bold text-neutral-900 flex items-center gap-1.5 mb-2">
      <Calendar className="w-3.5 h-3.5 text-orange-500" /> Booking requests
    </div>
    <div className="text-xs text-neutral-700 font-medium">May 24 – May 26</div>
    <div className="text-xs text-neutral-600 flex items-center gap-1 mt-0.5">
      <MapPin className="w-3 h-3" /> Austin, TX
    </div>
    <span className="inline-block mt-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
      Pending review
    </span>
  </GlassCard>
);

const ApprovedCard = () => (
  <GlassCard rotate={3} className="w-[200px]">
    <div className="text-[11px] font-bold text-neutral-900 mb-1">Owner-approved rentals</div>
    <div className="flex items-end justify-between">
      <div>
        <div className="text-2xl font-extrabold text-neutral-900 leading-none">12</div>
        <div className="text-[10px] text-neutral-600 mt-0.5">This month</div>
      </div>
      <svg width="60" height="28" viewBox="0 0 60 28" fill="none" className="text-orange-500">
        <polyline points="0,22 12,18 22,20 32,10 44,12 60,3" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="60" cy="3" r="2.5" fill="currentColor" />
      </svg>
    </div>
    <TrendingUp className="hidden" />
  </GlassCard>
);

const HostToolsModules = () => (
  <>
    {/* Desktop: scattered around the right side */}
    <div className="hidden md:block absolute top-10 right-8 pointer-events-auto"><CleaningCard /></div>
    <div className="hidden md:block absolute top-36 right-[18rem] pointer-events-auto"><DocsCard /></div>
    <div className="hidden md:block absolute bottom-10 right-[16rem] pointer-events-auto"><BookingCard /></div>
    <div className="hidden md:block absolute bottom-16 right-8 pointer-events-auto"><ApprovedCard /></div>
    {/* Mobile: show 1 compact card lower-right */}
    <div className="md:hidden absolute bottom-6 right-4 pointer-events-auto scale-90 origin-bottom-right"><DocsCard /></div>
  </>
);

const Panel3HostTools = () => (
  <HeroPanelShell
    bgImage={hostToolsBg.url}
    glassModules={<HostToolsModules />}
    eyebrow="Tools for owners and hosts"
    headline={<>More than listings. Built for <span className="text-orange-600">food truck hosts.</span></>}
    supportingText="List your truck, manage renter interest, organize documents, support equipment care, and create a more structured rental process from one place."
    primaryCta={
      <Button
        asChild
        size="lg"
        className="flex-1 rounded-full bg-orange-500 hover:bg-orange-600 text-white shadow-md"
        onClick={() => trackLeadEvent('homepage_host_list_click' as any, { source: 'home_hero', route: '/' })}
      >
        <Link to="/tools?utm_source=homepage&utm_medium=hero&utm_campaign=host_tools&utm_content=explore_host_tools">
          Explore Host Tools
        </Link>
      </Button>
    }
    secondaryCta={
      <Button
        asChild
        size="lg"
        variant="outline"
        className="flex-1 rounded-full border-neutral-900/20 bg-white/70 text-neutral-900 hover:bg-white"
        onClick={() => trackLeadEvent('homepage_how_it_works_click' as any, { source: 'home_hero', route: '/' })}
      >
        <Link to="/how-it-works-host?utm_source=homepage&utm_medium=hero&utm_campaign=host_tools&utm_content=how_hosting_works">
          How Hosting Works
        </Link>
      </Button>
    }
  />
);

export default Panel3HostTools;
