import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { AtlasMenuConcept } from '@/lib/atlas/atlasMenu';
export default function AtlasMenuPreview({ concept, onClose, onFollowUp }: { concept: AtlasMenuConcept | null; onClose: () => void; onFollowUp: () => void }) {
  return <Dialog open={!!concept} onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent className="max-h-[85dvh] max-w-2xl overflow-y-auto rounded-3xl bg-[#fffdf9] p-0 text-[#252525]">
      {concept && <>
        <div className="bg-[#202724] p-6 text-white">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[.18em] text-[#ffae83]">Atlas · menu concept</p>
          <DialogHeader><DialogTitle className="text-2xl">Picture your menu here</DialogTitle><DialogDescription className="text-white/70">Ideas based on equipment described in {concept.listingTitle}.</DialogDescription></DialogHeader>
        </div>
        <div className="space-y-5 p-6">
          {concept.photo && <img src={concept.photo} alt={concept.listingTitle} className="h-36 w-full rounded-2xl object-cover" />}
          <div className="grid gap-3 sm:grid-cols-2">{concept.items.map(item => <article key={item.name} className="rounded-2xl border border-[#e6e1d8] bg-white p-4">
            <h3 className="font-semibold">{item.name}</h3><p className="mt-2 text-sm text-[#626660]">{item.description}</p>
            <p className="mt-3 text-xs font-medium text-[#a43f18]">Listed equipment: {item.equipment.join(', ')}</p>
          </article>)}</div>
          <p className="text-xs leading-relaxed text-[#626660]">{concept.note}</p>
          <div className="flex flex-wrap gap-3"><Link to={`/listing/${concept.listingId}`} onClick={onClose} className="rounded-full border px-5 py-3 text-sm font-semibold">View this listing</Link><button onClick={onFollowUp} className="rounded-full bg-[#ff5124] px-5 py-3 text-sm font-semibold text-white">Discuss this concept with our team</button></div>
        </div>
      </>}
    </DialogContent>
  </Dialog>;
}
