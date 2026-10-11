import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { draftFinishPath, isDueForNudge, isInternalEmail, isQaTitle } from './draftReminderPolicy.ts';

const DAY = 24 * 60 * 60 * 1000;
const now = Date.parse('2026-10-05T12:00:00Z');
const ago = (days: number) => new Date(now - days * DAY).toISOString();

Deno.test('never nudges drafts younger than a day or older than 60 days', () => {
  assertEquals(isDueForNudge(ago(0.5), null, now), false);
  assertEquals(isDueForNudge(ago(61), null, now), false);
  assertEquals(isDueForNudge(ago(45), null, now), true);
});

Deno.test('spaces nudges further apart as the draft ages', () => {
  assertEquals(isDueForNudge(ago(3), ago(1), now), false);
  assertEquals(isDueForNudge(ago(3), ago(2), now), true);
  assertEquals(isDueForNudge(ago(20), ago(6), now), false);
  assertEquals(isDueForNudge(ago(20), ago(7), now), true);
  assertEquals(isDueForNudge(ago(40), ago(13), now), false);
  assertEquals(isDueForNudge(ago(40), ago(14), now), true);
});

Deno.test('skips internal accounts and QA drafts', () => {
  assertEquals(isInternalEmail('qa+1@example.com'), true);
  assertEquals(isInternalEmail('team@vendibook.com'), true);
  assertEquals(isInternalEmail('owner@gmail.com'), false);
  assertEquals(isQaTitle('QA Cash Food Truck 123'), true);
  assertEquals(isQaTitle('Test Full Draft'), true);
  assertEquals(isQaTitle('Taco Truck for sale'), false);
});

Deno.test('routes drafts with photos to the one-screen finish page', () => {
  assertEquals(draftFinishPath('abc', 3), '/list/finish/abc');
  assertEquals(draftFinishPath('abc', 0), '/create-listing/abc');
});
