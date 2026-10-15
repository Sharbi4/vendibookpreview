/**
 * Team follow-up promise (owner, 2026-10-15): when someone asks Atlas for a
 * person, the Vendibook team follows up within 2 business hours, where
 * business hours are Monday–Friday 8 AM–8 PM Eastern. A request at 7:30 PM ET
 * on a Thursday is due 9:30 AM ET Friday; one on Saturday is due 10 AM ET
 * Monday. Pure (no Deno APIs) so the browser and tests can use it too.
 */
export const FOLLOW_UP_TZ = 'America/New_York';
export const FOLLOW_UP_OPEN_HOUR = 8;
export const FOLLOW_UP_CLOSE_HOUR = 20;
export const FOLLOW_UP_MINUTES = 120;

interface EtParts {
  weekday: number; // 0 Sunday … 6 Saturday
  minuteOfDay: number;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function etParts(d: Date): EtParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: FOLLOW_UP_TZ,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return {
    weekday: WEEKDAYS.indexOf(get('weekday')),
    minuteOfDay: Number(get('hour')) * 60 + Number(get('minute')),
  };
}

const OPEN = FOLLOW_UP_OPEN_HOUR * 60;
const CLOSE = FOLLOW_UP_CLOSE_HOUR * 60;
const isWeekday = (w: number) => w >= 1 && w <= 5;

/** True when the team is inside its follow-up hours at `at`. */
export function inFollowUpHours(at: Date): boolean {
  const p = etParts(at);
  return isWeekday(p.weekday) && p.minuteOfDay >= OPEN && p.minuteOfDay < CLOSE;
}

/** Next moment the follow-up hours open (8:00 AM ET on a weekday) at or after `at`. */
function nextOpening(at: Date): Date {
  let t = new Date(at.getTime());
  for (let i = 0; i < 8; i++) {
    const p = etParts(t);
    if (isWeekday(p.weekday) && p.minuteOfDay < OPEN) {
      t = new Date(t.getTime() + (OPEN - p.minuteOfDay) * 60_000);
    } else if (isWeekday(p.weekday) && p.minuteOfDay < CLOSE) {
      return t;
    } else {
      // Jump to midnight ET of the next day, then loop.
      t = new Date(t.getTime() + (24 * 60 - p.minuteOfDay) * 60_000);
    }
    // A DST change overnight can leave us an hour off 8:00; snap to it.
    const q = etParts(t);
    if (isWeekday(q.weekday) && Math.abs(q.minuteOfDay - OPEN) <= 60 && q.minuteOfDay !== OPEN && q.minuteOfDay < CLOSE) {
      t = new Date(t.getTime() + (OPEN - q.minuteOfDay) * 60_000);
    }
    if (inFollowUpHours(t)) return new Date(Math.floor(t.getTime() / 60_000) * 60_000);
  }
  return t;
}

/** When the follow-up is due: `minutes` business minutes after `from`. */
export function followUpDueAt(from: Date, minutes = FOLLOW_UP_MINUTES): Date {
  let t = new Date(Math.ceil(from.getTime() / 60_000) * 60_000);
  let left = minutes;
  for (let i = 0; i < 20 && left > 0; i++) {
    t = nextOpening(t);
    const room = CLOSE - etParts(t).minuteOfDay;
    const use = Math.min(room, left);
    t = new Date(t.getTime() + use * 60_000);
    left -= use;
  }
  return t;
}

/** "Thu 3:15 PM ET" style label for the due time. */
export function formatEt(d: Date): string {
  const s = new Intl.DateTimeFormat('en-US', {
    timeZone: FOLLOW_UP_TZ,
    weekday: 'long',
    hour: 'numeric',
    minute: '2-digit',
  }).format(d);
  return `${s} ET`;
}
