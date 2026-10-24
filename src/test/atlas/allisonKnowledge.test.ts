import { expect, it } from 'vitest';
import { getAllisonKnowledge } from '@/lib/atlas/allisonKnowledge';
it('retrieves callback confirmation limits with source attribution', () => {
 const result = getAllisonKnowledge('callback phone time timezone');
 expect(result.answers[0].answer).toContain('not a reserved appointment');
 expect(result.answers[0].source).toContain('atlas-follow-up');
});
it('keeps live pricing authoritative over historical FAQ amounts', () => {
 expect(getAllisonKnowledge('Pro packages pricing').pricing_rule).toContain('Always call get_pricing');
});
it('does not invent an answer for unsupported queries', () => {
 expect(getAllisonKnowledge('xyzzyxyz')).toMatchObject({ missing: true, answers: [] });
});
it('never promises Calendly availability without an attached tool', () => {
 expect(getAllisonKnowledge('Calendly calendar appointment').answers[0].answer).toContain('never invent');
});
