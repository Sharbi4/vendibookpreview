/**
 * Meetup requests are plain conversation messages with a recognisable first
 * line, so they stay inside normal messaging (and its PII rules) while still
 * being readable on the order page.
 */
export const MEETUP_REQUEST_PREFIX = 'Meetup request';

export interface MeetupRequestInput {
  date: string; // yyyy-mm-dd
  timeWindow: string;
  place: string;
  notes: string;
}

export interface ParsedMeetupRequest {
  date: string | null;
  timeWindow: string | null;
  place: string | null;
  notes: string | null;
}

export const MEETUP_TIME_WINDOWS = [
  'Morning (8am – 12pm)',
  'Afternoon (12pm – 5pm)',
  'Evening (5pm – 8pm)',
  'Flexible',
];

export const formatMeetupRequest = (input: MeetupRequestInput): string => {
  const lines = [`${MEETUP_REQUEST_PREFIX} — can we plan the handoff?`];
  if (input.date) lines.push(`Preferred date: ${formatMeetupDate(input.date)}`);
  if (input.timeWindow) lines.push(`Preferred time: ${input.timeWindow}`);
  if (input.place.trim()) lines.push(`Suggested meeting area: ${input.place.trim()}`);
  if (input.notes.trim()) lines.push(`Notes: ${input.notes.trim()}`);
  return lines.join('\n');
};

export const isMeetupRequest = (message: string | null | undefined): boolean =>
  !!message && message.trimStart().startsWith(MEETUP_REQUEST_PREFIX);

export const parseMeetupRequest = (message: string): ParsedMeetupRequest => {
  const pick = (label: string) => {
    const match = message.match(new RegExp(`^${label}:\\s*(.+)$`, 'mi'));
    return match ? match[1].trim() : null;
  };
  return {
    date: pick('Preferred date'),
    timeWindow: pick('Preferred time'),
    place: pick('Suggested meeting area'),
    notes: pick('Notes'),
  };
};

export const formatMeetupDate = (value: string): string => {
  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
};
