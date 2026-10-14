/** Masks a phone number to its last four digits. */
export function maskPhone(p?: string | null) {
  const d = (p ?? '').replace(/\D/g, '');
  if (!d) return null;
  return `••• ••• ${d.slice(-4)}`;
}
