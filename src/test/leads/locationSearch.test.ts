import { describe, expect, it } from 'vitest';
import { parseLocationInput } from '../../../supabase/functions/_shared/locationSearch';

describe('parseLocationInput', () => {
  it('uses the locality before the state for full addresses and neighborhoods', () => {
    expect(parseLocationInput('TX-99, Houston, TX')).toMatchObject({ city: 'Houston', state: 'TX', kind: 'city_state' });
    expect(parseLocationInput('Midtown, Houston, TX')).toMatchObject({ city: 'Houston', state: 'TX' });
    expect(parseLocationInput('2700 Messina Ct, Las Vegas, NV 89117')).toMatchObject({ city: 'Las Vegas', state: 'NV', zip: '89117' });
  });

  it('keeps existing city/state, state-only and zip parsing', () => {
    expect(parseLocationInput('Tucson, AZ, USA')).toMatchObject({ city: 'Tucson', state: 'AZ', kind: 'city_state' });
    expect(parseLocationInput('Atlanta ga')).toMatchObject({ city: 'Atlanta', state: 'GA' });
    expect(parseLocationInput('Texas')).toMatchObject({ city: null, state: 'TX', kind: 'state' });
    expect(parseLocationInput('85719')).toMatchObject({ zip: '85719', kind: 'zip' });
    expect(parseLocationInput('Springfield, Nowhere')).toMatchObject({ city: 'Springfield, Nowhere', state: null, kind: 'city' });
  });
});
