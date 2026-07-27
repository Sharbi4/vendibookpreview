import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { classifyKeyword, normalizeNanpToE164 } from './smsConsent.ts';

Deno.test('classifyKeyword recognizes STOP variants', () => {
  for (const kw of ['STOP', 'stop', 'Unsubscribe', 'END', 'quit', 'cancel', 'HALT']) {
    assertEquals(classifyKeyword(kw), 'opt_out', `expected opt_out for "${kw}"`);
  }
});

Deno.test('classifyKeyword recognizes START variants', () => {
  for (const kw of ['START', 'yes', 'UNSTOP']) {
    assertEquals(classifyKeyword(kw), 'opt_in');
  }
});

Deno.test('classifyKeyword recognizes HELP variants', () => {
  for (const kw of ['HELP', 'info', 'SUPPORT']) {
    assertEquals(classifyKeyword(kw), 'help');
  }
});

Deno.test('classifyKeyword returns other for unknown', () => {
  assertEquals(classifyKeyword('hello there'), 'other');
});

Deno.test('normalizeNanpToE164 basic', () => {
  assertEquals(normalizeNanpToE164('7257559598'), '+17257559598');
  assertEquals(normalizeNanpToE164('+17257559598'), '+17257559598');
  assertEquals(normalizeNanpToE164('12345'), null);
  assertEquals(normalizeNanpToE164(null), null);
});
