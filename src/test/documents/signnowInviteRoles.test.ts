import { describe, expect, it } from 'vitest';
import { buildEmbeddedInvites } from '../../../supabase/functions/_shared/signnowInviteRoles';

const ROLES = [
  { unique_id: 'role-buyer', name: 'Buyer', signing_order: '1' },
  { unique_id: 'role-seller', name: 'Seller', signing_order: '2' },
];
const SIGNERS = [
  { email: 'buyer@example.com', role_name: 'Buyer', order: 1, first_name: 'Bea' },
  { email: 'seller@example.com', role_name: 'Seller', order: 2 },
];

describe('SignNow embedded invite roles', () => {
  it('sends role and role_id from the document (never role_name)', () => {
    const invites = buildEmbeddedInvites(SIGNERS, ROLES);
    expect(invites).toEqual([
      { email: 'buyer@example.com', role: 'Buyer', role_id: 'role-buyer', order: 1, auth_method: 'none', first_name: 'Bea', last_name: undefined },
      { email: 'seller@example.com', role: 'Seller', role_id: 'role-seller', order: 2, auth_method: 'none', first_name: undefined, last_name: undefined },
    ]);
    for (const invite of invites) expect(invite).not.toHaveProperty('role_name');
  });

  it('matches role names case-insensitively and uses the document spelling', () => {
    const [invite] = buildEmbeddedInvites([{ ...SIGNERS[0], role_name: ' buyer ' }], [ROLES[0]]);
    expect(invite).toMatchObject({ role: 'Buyer', role_id: 'role-buyer' });
  });

  it('fails clearly when the document lacks a signer role', () => {
    expect(() => buildEmbeddedInvites(SIGNERS, [ROLES[0]])).toThrow('no "Seller" role (document roles: Buyer)');
  });

  it('fails clearly when a document role has no signer (SignNow rejects partial invites)', () => {
    expect(() => buildEmbeddedInvites([SIGNERS[0]], ROLES)).toThrow('left without a signer: Seller');
  });

  it('fails when the document has no roles at all', () => {
    expect(() => buildEmbeddedInvites(SIGNERS, [])).toThrow('document roles: none');
  });
});
