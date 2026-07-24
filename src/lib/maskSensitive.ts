/**
 * Mask an email address for display, keeping the first character and the
 * full domain.  "jane@gmail.com" -> "j•••@gmail.com"
 */
export function maskEmail(email?: string | null): string {
  if (!email) return '';
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const first = local.charAt(0);
  return `${first}${'•'.repeat(3)}@${domain}`;
}

/**
 * Mask a phone number, revealing only the last four digits.
 * "+1 (555) 123-4567" -> "(•••) •••-4567"
 */
export function maskPhone(phone?: string | null): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '••••';
  const last4 = digits.slice(-4);
  return `(•••) •••-${last4}`;
}
