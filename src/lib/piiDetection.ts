// PII Detection utilities for blocking phone numbers and emails

// Email regex - standard format
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/gi;

// Obfuscated email regex - handles "at" and "dot" variations
const OBFUSCATED_EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+\s*(?:\(|\[)?\s*(?:at|@)\s*(?:\)|\])?\s*[A-Za-z0-9.-]+\s*(?:\(|\[)?\s*(?:dot|\.)\s*(?:\)|\])?\s*[A-Za-z]{2,}\b/gi;

// Phone regex - handles various formats
const PHONE_REGEX = /(?<!\d)(?:\+?1[\s.-]?)?(?:\(\s*\d{3}\s*\)|\d{3})[\s.-]?\d{3}[\s.-]?\d{4}(?!\d)/g;

// Obfuscated phone - handles "dot" variations
const OBFUSCATED_PHONE_REGEX = /\b\d{3}\s*(?:dot|\.)\s*\d{3}\s*(?:dot|\.)\s*\d{4}\b/gi;

export interface PIIDetectionResult {
  hasPII: boolean;
  hasEmail: boolean;
  hasPhone: boolean;
  emails: string[];
  phones: string[];
}

/**
 * Detects if a message contains PII (email addresses or phone numbers)
 */
export function detectPII(message: string): PIIDetectionResult {
  const emails: string[] = [];
  const phones: string[] = [];

  // Check for standard emails
  const standardEmails = message.match(EMAIL_REGEX) || [];
  emails.push(...standardEmails);

  // Check for obfuscated emails
  const obfuscatedEmails = message.match(OBFUSCATED_EMAIL_REGEX) || [];
  emails.push(...obfuscatedEmails);

  // Check for standard phones
  const standardPhones = message.match(PHONE_REGEX) || [];
  phones.push(...standardPhones);

  // Check for obfuscated phones
  const obfuscatedPhones = message.match(OBFUSCATED_PHONE_REGEX) || [];
  phones.push(...obfuscatedPhones);

  // Dedupe
  const uniqueEmails = [...new Set(emails)];
  const uniquePhones = [...new Set(phones)];

  return {
    hasPII: uniqueEmails.length > 0 || uniquePhones.length > 0,
    hasEmail: uniqueEmails.length > 0,
    hasPhone: uniquePhones.length > 0,
    emails: uniqueEmails,
    phones: uniquePhones,
  };
}

/**
 * Masks PII in a message (alternative to blocking)
 */
export function maskPII(message: string): string {
  let masked = message;

  // Mask standard emails
  masked = masked.replace(EMAIL_REGEX, (match) => {
    const [local, domain] = match.split('@');
    const maskedLocal = local.charAt(0) + '***';
    const domainParts = domain.split('.');
    const maskedDomain = domainParts[0].charAt(0) + '***.' + domainParts.slice(1).join('.');
    return `${maskedLocal}@${maskedDomain}`;
  });

  // Mask phones
  masked = masked.replace(PHONE_REGEX, '(***) ***-****');
  masked = masked.replace(OBFUSCATED_PHONE_REGEX, '*** dot *** dot ****');

  return masked;
}

export const PII_BLOCK_MESSAGE = "To protect the community, phone numbers and personal emails can't be shared in messages. Please keep communication on Vendibook.";
