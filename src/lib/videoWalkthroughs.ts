export const WALKTHROUGH_TOPICS = [
  'Full walkthrough', 'Exterior', 'Kitchen/equipment', 'Generator/electrical',
  'Plumbing/water system', 'Engine/chassis', 'VIN/title/documentation', 'I just have questions',
] as const;

export const formatWalkthroughTime = (value: string) => new Intl.DateTimeFormat(undefined, {
  weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
}).format(new Date(value));

export function downloadWalkthroughIcs(w: { id: string; starts_at: string; ends_at: string; listing?: { title?: string } | null }) {
  const stamp = (v: string) => new Date(v).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const url = `${window.location.origin}/walkthrough/${w.id}`;
  const text = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Vendibook//Video Walkthrough//EN','BEGIN:VEVENT',
    `UID:${w.id}@vendibook.com`,`DTSTART:${stamp(w.starts_at)}`,`DTEND:${stamp(w.ends_at)}`,
    `SUMMARY:Vendibook video walkthrough — ${w.listing?.title || 'Listing'}`,
    `DESCRIPTION:Open your protected Vendibook walkthrough: ${url}`,`URL:${url}`,'END:VEVENT','END:VCALENDAR'].join('\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/calendar' }));
  a.download = 'vendibook-walkthrough.ics'; a.click(); URL.revokeObjectURL(a.href);
}