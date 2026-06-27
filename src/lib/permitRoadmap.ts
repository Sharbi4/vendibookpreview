import {
  classifyPermit,
  getDependencyMap,
  PERMIT_PRO_TIPS,
  unlockReason,
  type PermitNodeKey,
} from './permitDependencies';
import type { DashboardResult } from '@/components/tools/permit-path/ResultsDashboard';

export type RoadmapStatus = 'done' | 'next' | 'available' | 'locked';
export type RequirementStatus = 'required' | 'conditional' | 'optional';

export interface RoadmapNode {
  id: string; // `${category}::${title}`
  category: string;
  title: string;
  issuer: string;
  level: string;
  cost_estimate: string;
  timeline_estimate: string;
  official_url: string;
  why_it_matters: string;
  pro_tip: string;
  commonly_missed: boolean;
  key: PermitNodeKey;
  status: RoadmapStatus;
  unlock_reason?: string;
  done: boolean;
  requirement_status: RequirementStatus;
  requirement_trigger?: string;
}

export interface RoadmapSummary {
  nodes: RoadmapNode[];
  total: number;
  done: number;
  pct: number;
  remaining_cost_low: number;
  remaining_cost_high: number;
  remaining_weeks_low: number;
  remaining_weeks_high: number;
  next_step_id: string | null;
}

// Parse "$300–$650", "$50/year", "Free", "verify with agency" → [low, high]
function parseCost(s?: string): [number, number] {
  if (!s) return [0, 0];
  const lower = s.toLowerCase();
  if (lower.includes('free') || lower.includes('no cost')) return [0, 0];
  const matches = s.match(/\$\s*([\d,]+(?:\.\d+)?)/g);
  if (!matches) return [0, 0];
  const nums = matches.map((m) => Number(m.replace(/[$,\s]/g, '')));
  if (nums.length === 0) return [0, 0];
  if (nums.length === 1) return [nums[0], nums[0]];
  return [Math.min(...nums), Math.max(...nums)];
}

// Parse "2–6 weeks", "1 week", "same day", "1–3 weeks", "1–2 weeks" → [low, high] in weeks
function parseWeeks(s?: string): [number, number] {
  if (!s) return [0, 0];
  const lower = s.toLowerCase();
  if (lower.includes('same day') || lower.includes('instant')) return [0, 0];
  const dayMatch = lower.match(/(\d+)\s*[-–]\s*(\d+)\s*day/);
  if (dayMatch) return [+dayMatch[1] / 7, +dayMatch[2] / 7];
  const weekRange = lower.match(/(\d+)\s*[-–]\s*(\d+)\s*week/);
  if (weekRange) return [+weekRange[1], +weekRange[2]];
  const weekSingle = lower.match(/(\d+)\s*week/);
  if (weekSingle) return [+weekSingle[1], +weekSingle[1]];
  return [0, 0];
}

export function buildRoadmap(
  result: DashboardResult,
  completed: Record<string, boolean>,
): RoadmapSummary {
  const { sequence, deps } = getDependencyMap(
    result.businessType || result.location?.business_type,
  );

  // 1. Flatten + classify
  const raw = result.categories.flatMap((c) =>
    c.items.map((item) => {
      const id = `${c.name}::${item.title}`;
      const key = classifyPermit(item.title, c.name);
      return {
        id,
        category: c.name,
        title: item.title,
        issuer: item.issuer,
        level: item.level,
        cost_estimate: item.cost_estimate,
        timeline_estimate: item.timeline_estimate,
        official_url: item.official_url,
        why_it_matters: item.why_it_matters,
        pro_tip: (item as any).pro_tip || PERMIT_PRO_TIPS[key] || '',
        commonly_missed: !!item.commonly_missed,
        key,
        done: !!completed[id],
      };
    }),
  );

  // 2. Sort by sequence position (unknowns to the end)
  raw.sort((a, b) => {
    const ai = sequence.indexOf(a.key);
    const bi = sequence.indexOf(b.key);
    const aPos = ai === -1 ? sequence.length + 1 : ai;
    const bPos = bi === -1 ? sequence.length + 1 : bi;
    return aPos - bPos;
  });

  // 3. Build a lookup: key → first node that satisfies it
  const firstByKey = new Map<PermitNodeKey, typeof raw[number]>();
  for (const n of raw) {
    if (!firstByKey.has(n.key)) firstByKey.set(n.key, n);
  }

  // 4. Compute status with dependency locking
  let nextAssigned = false;
  const nodes: RoadmapNode[] = raw.map((n) => {
    if (n.done) {
      return { ...n, status: 'done' as RoadmapStatus };
    }
    // Check hard deps
    const requiredKeys = deps[n.key] || [];
    const blocking = requiredKeys
      .map((k) => firstByKey.get(k))
      .filter((dep) => dep && !dep.done && dep.id !== n.id);

    if (blocking.length > 0) {
      return {
        ...n,
        status: 'locked' as RoadmapStatus,
        unlock_reason: unlockReason(blocking.map((b) => b!.title)),
      };
    }
    // First non-done, non-locked = next step
    if (!nextAssigned) {
      nextAssigned = true;
      return { ...n, status: 'next' as RoadmapStatus };
    }
    return { ...n, status: 'available' as RoadmapStatus };
  });

  // 5. Aggregates
  const total = nodes.length;
  const done = nodes.filter((n) => n.done).length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  let costLow = 0, costHigh = 0, weeksLow = 0, weeksHigh = 0;
  for (const n of nodes) {
    if (n.done) continue;
    const [cl, ch] = parseCost(n.cost_estimate);
    costLow += cl;
    costHigh += ch;
    const [wl, wh] = parseWeeks(n.timeline_estimate);
    weeksLow = Math.max(weeksLow, wl);
    weeksHigh = Math.max(weeksHigh, wh);
  }

  const next = nodes.find((n) => n.status === 'next');

  return {
    nodes,
    total,
    done,
    pct,
    remaining_cost_low: Math.round(costLow),
    remaining_cost_high: Math.round(costHigh),
    remaining_weeks_low: Math.round(weeksLow),
    remaining_weeks_high: Math.round(weeksHigh),
    next_step_id: next?.id || null,
  };
}

/**
 * Build a downloadable .ics file body for a reminder on this permit.
 */
export function buildIcs(opts: {
  title: string;
  description: string;
  url?: string;
  daysFromNow: number;
}): string {
  const now = new Date();
  const start = new Date(now.getTime() + opts.daysFromNow * 24 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + 30 * 60 * 1000);
  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const uid = `${Date.now()}-${Math.random().toString(36).slice(2)}@vendibook.com`;
  const desc = (opts.description + (opts.url ? `\\n\\n${opts.url}` : '')).replace(/\n/g, '\\n');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Vendibook//PermitPath//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${fmt(now)}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${opts.title.replace(/,/g, '\\,')}`,
    `DESCRIPTION:${desc}`,
    opts.url ? `URL:${opts.url}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');
}

export function downloadIcs(filename: string, body: string) {
  const blob = new Blob([body], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Build a mailto: link the user can fire to email themselves the checklist.
 */
export function buildMailto(result: DashboardResult, roadmap: RoadmapSummary): string {
  const loc = result.location.city ? `${result.location.city}, ${result.location.state}` : result.location.state;
  const subject = `Your PermitPath checklist — ${loc}`;
  const lines: string[] = [];
  lines.push(`Your ${result.businessType || 'mobile food'} permit roadmap for ${loc}`);
  lines.push('');
  lines.push(`Progress: ${roadmap.done} of ${roadmap.total} complete (${roadmap.pct}%)`);
  if (roadmap.remaining_cost_high) {
    lines.push(`Remaining cost: $${roadmap.remaining_cost_low.toLocaleString()}–$${roadmap.remaining_cost_high.toLocaleString()}`);
  }
  lines.push('');
  for (const n of roadmap.nodes) {
    const box = n.done ? '[x]' : n.status === 'locked' ? '[ ] (locked)' : '[ ]';
    lines.push(`${box} ${n.title} — ${n.issuer}`);
    if (n.cost_estimate) lines.push(`     Cost: ${n.cost_estimate}`);
    if (n.timeline_estimate) lines.push(`     Timeline: ${n.timeline_estimate}`);
    if (n.official_url) lines.push(`     ${n.official_url}`);
    lines.push('');
  }
  lines.push('— Built with Vendibook PermitPath');
  lines.push('https://vendibook.com/tools/permitpath');
  const body = lines.join('\n');
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
