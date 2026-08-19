import { ListingDimensionsPrompt } from '@/components/dashboard/ListingDimensionsPrompt';
const base = { id: 'qa-1', status: 'published', mode: 'sale', category: 'food_trailer', length_inches: null, width_inches: null, height_inches: null } as any;
export default function DimQA() {
  return (
    <div className="dashboard-shell bg-background p-8 space-y-6">
      <div className="rounded-2xl border border-white/10 bg-card p-4"><ListingDimensionsPrompt listing={base} /></div>
      <div className="rounded-2xl border border-white/10 bg-card p-4">complete: <ListingDimensionsPrompt listing={{ ...base, length_inches: 240, height_inches: 132 }} /></div>
      <div className="rounded-2xl border border-white/10 bg-card p-4">rental: <ListingDimensionsPrompt listing={{ ...base, mode: 'rent' }} /></div>
      <div className="rounded-2xl border border-white/10 bg-card p-4">kitchen: <ListingDimensionsPrompt listing={{ ...base, category: 'ghost_kitchen' }} /></div>
      <div className="rounded-2xl border border-white/10 bg-card p-4">draft: <ListingDimensionsPrompt listing={{ ...base, status: 'draft' }} /></div>
    </div>
  );
}
