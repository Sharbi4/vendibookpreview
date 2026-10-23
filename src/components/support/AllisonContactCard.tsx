import { startAllison } from '@/lib/atlas/allisonConfig';
export default function AllisonContactCard() {
  return <section className="mx-auto mb-10 max-w-3xl rounded-3xl border border-orange-200/30 bg-[#1c1b1a] p-7 text-left text-white shadow-xl md:p-9" aria-labelledby="allison-heading">
    <p className="mb-3 text-xs font-semibold uppercase tracking-[.16em] text-orange-300">Vendibook customer success</p>
    <h2 id="allison-heading" className="text-2xl font-semibold">Meet Allison. Let’s get it sorted.</h2>
    <p className="mt-3 text-white/75">Our AI support assistant can explain rentals and payments, help troubleshoot an issue, and arrange a request for our team. Need a real person? Ask for human support.</p>
    <div className="mt-5 flex flex-wrap gap-3"><button onClick={() => startAllison('voice')} className="rounded-xl bg-[#ff5124] px-5 py-3 font-semibold">Talk to Allison</button><button onClick={() => startAllison('text')} className="rounded-xl border border-white/25 px-5 py-3">Type to Allison</button></div>
    <p className="mt-4 text-xs text-white/60">AI assistance is separate from a live team member. Support forms and callback options remain available below.</p>
  </section>;
}
