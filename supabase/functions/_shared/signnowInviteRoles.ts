// Map Vendibook signers onto the roles of a SignNow document.
//
// SignNow's embedded-invite endpoint identifies each signer's role by `role`
// (the role's name in the document) and/or `role_id` (its unique_id). It does
// not read `role_name`; sending only that left every invite without a role and
// SignNow rejected all of them. Every role in the document must be invited,
// and an unknown role is an error, so both are checked here before calling
// SignNow. Pure: no I/O, so it can be unit-tested.

export interface SignNowDocumentRole {
  unique_id?: string;
  name?: string;
  signing_order?: string | number;
}

export interface InviteSignerInput {
  email: string;
  role_name: string;
  order: number;
  auth_method?: string;
  first_name?: string;
  last_name?: string;
}

export interface EmbeddedInvitePayload {
  email: string;
  role: string;
  role_id: string;
  order: number;
  auth_method: string;
  first_name?: string;
  last_name?: string;
}

const norm = (s: string) => s.trim().toLowerCase();

export function buildEmbeddedInvites(
  signers: InviteSignerInput[],
  roles: SignNowDocumentRole[],
): EmbeddedInvitePayload[] {
  const usable = roles.filter((r) => r?.unique_id && r?.name);
  const available = usable.map((r) => r.name).join(', ') || 'none';

  const invites = signers.map((s) => {
    const role = usable.find((r) => norm(String(r.name)) === norm(s.role_name));
    if (!role) {
      throw new Error(`SignNow document has no "${s.role_name}" role (document roles: ${available})`);
    }
    return {
      email: s.email,
      role: String(role.name),
      role_id: String(role.unique_id),
      order: s.order,
      auth_method: s.auth_method ?? 'none',
      first_name: s.first_name,
      last_name: s.last_name,
    };
  });

  const invited = new Set(invites.map((i) => i.role_id));
  const missing = usable.filter((r) => !invited.has(String(r.unique_id))).map((r) => r.name);
  if (missing.length) {
    throw new Error(`SignNow document role(s) left without a signer: ${missing.join(', ')}`);
  }
  return invites;
}
