import { describe, it, expect } from 'vitest';
import { normalizeNanpToE164, isValidNanp, formatDisplayUsPhone } from './phone';

describe('normalizeNanpToE164', () => {
  it('accepts 10-digit US numbers', () => {
    expect(normalizeNanpToE164('7257559598')).toBe('+17257559598');
  });
  it('accepts formatted 10-digit', () => {
    expect(normalizeNanpToE164('(725) 755-9598')).toBe('+17257559598');
  });
  it('accepts 11-digit with leading 1', () => {
    expect(normalizeNanpToE164('17257559598')).toBe('+17257559598');
  });
  it('accepts existing +1 E.164', () => {
    expect(normalizeNanpToE164('+17257559598')).toBe('+17257559598');
  });
  it('rejects short numbers', () => {
    expect(normalizeNanpToE164('12345')).toBeNull();
  });
  it('rejects empty', () => {
    expect(normalizeNanpToE164('')).toBeNull();
    expect(normalizeNanpToE164('   ')).toBeNull();
  });
  it('rejects non-NANP country codes', () => {
    expect(normalizeNanpToE164('+447700900000')).toBeNull();
  });
});

describe('isValidNanp', () => {
  it('is true for valid US number', () => {
    expect(isValidNanp('7257559598')).toBe(true);
  });
  it('is false for garbage', () => {
    expect(isValidNanp('abc')).toBe(false);
  });
});

describe('formatDisplayUsPhone', () => {
  it('formats E.164 for display', () => {
    expect(formatDisplayUsPhone('+17257559598')).toBe('(725) 755-9598');
  });
  it('returns empty for null', () => {
    expect(formatDisplayUsPhone(null)).toBe('');
  });
});
