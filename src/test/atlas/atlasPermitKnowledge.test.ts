import { describe, expect, it } from 'vitest';
import { getPermitRequirements, PERMIT_MARKETS } from '@/lib/atlas/atlasPermitKnowledge';
import { ATLAS_TOOL_DEFINITIONS, ATLAS_SYSTEM_PROMPT } from '@/lib/atlas/atlasConfig';

const reviewed = new Date('2026-10-23T00:00:00Z');
describe('government permit guidance boundaries', () => {
  it('requires the actual jurisdiction and never substitutes a nearby city', () => {
    for (const input of [{ city: 'North Florida', state: 'FL' }, { city: 'Houston', state: 'AZ' }, { city: 'Unknown', state: 'TX' }]) {
      const result = getPermitRequirements(input, reviewed);
      expect(result.status).toBe('jurisdiction_needed');
      expect(result.next_question).toContain('county');
      expect(result.sources.some(s => s.authority === 'Houston Fire Department')).toBe(false);
    }
  });
  it('distinguishes state licensing from city and county site approval', () => {
    const texas = getPermitRequirements({ city: 'Houston', state: 'Texas' }, reviewed);
    expect(texas.status).toBe('curated_guidance');
    expect(texas.sources[0].scope).toContain('July 1, 2026');
    expect(texas.next_question).toContain('raw food');
    const miami = getPermitRequirements({ city: 'Miami', state: 'FL', operation: 'raw meat on a griddle' }, reviewed);
    expect(miami.sources.some(s => s.scope.includes('Unincorporated'))).toBe(true);
    expect(miami.unresolved.join(' ')).toContain('City of Miami');
    expect(miami.next_question).toContain('private site');
  });
  it('does not claim incomplete research is a complete checklist', () => {
    for (const city of ['pensacola', 'gainesville', 'ocala']) {
      const result = getPermitRequirements({ city, state: 'Florida' }, reviewed);
      expect(result.unresolved.join(' ')).toMatch(/confirm/i);
      expect(result.guardrails.join(' ')).toContain('not exemptions');
    }
  });
  it('marks aging notes for agency revalidation', () => {
    expect(getPermitRequirements({ city: 'Tucson', state: 'AZ' }, reviewed).refresh_required).toBe(false);
    expect(getPermitRequirements({ city: 'Tucson', state: 'AZ' }, new Date('2027-02-01')).refresh_required).toBe(true);
  });
  it('uses a curated government host allowlist and excludes drafts and old pilot pages', () => {
    const hosts = new Set(['www.dshs.texas.gov', 'houstontx.gov', 'content.civicplus.com', 'www.tucsonaz.gov', 'publichealth.lacounty.gov', 'business.lacity.gov', 'www2.myfloridalicense.com', 'www.miami.gov', 'www.miamidade.gov', 'dph.georgia.gov', 'www.atlantaga.gov', 'www.jacksonville.gov', 'citizenportal.talgov.com', 'www.cityofpensacola.com', 'www.citystaug.com', 'citystaug.com', 'www.lcfla.com', 'www.panamacity.gov', 'www.gainesvillefl.gov', 'www.ocalafl.gov']);
    for (const market of Object.values(PERMIT_MARKETS)) for (const source of market.sources) {
      expect(hosts.has(new URL(source.url).hostname), source.url).toBe(true);
      expect(source.url).not.toMatch(/proposed|archive\.|pilot/i);
    }
  });
  it('registers the runtime tool and mandates sourced answers', () => {
    expect(JSON.stringify(ATLAS_TOOL_DEFINITIONS)).toContain('get_permit_requirements');
    expect(ATLAS_SYSTEM_PROMPT).toContain('before answering any local licensing');
    expect(ATLAS_SYSTEM_PROMPT).toContain('never substitute a neighboring city');
  });
});
