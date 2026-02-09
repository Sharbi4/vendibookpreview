import React from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { normalizeScheduleKeys } from '@/lib/scheduleUtils';

interface TimeRange {
  start: string;
  end: string;
}

interface WeeklySchedule {
  mon: TimeRange[];
  tue: TimeRange[];
  wed: TimeRange[];
  thu: TimeRange[];
  fri: TimeRange[];
  sat: TimeRange[];
  sun: TimeRange[];
}

type DayKey = keyof WeeklySchedule;

interface WeeklyHoursDisplayProps {
  schedule: WeeklySchedule | null;
  className?: string;
}

const DAY_LABELS: Record<DayKey, string> = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun',
};

const DAY_ORDER: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

const formatTime = (time: string): string => {
  const hour = parseInt(time.split(':')[0]);
  if (hour === 0 || hour === 24) return '12 AM';
  if (hour === 12) return '12 PM';
  return hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
};

const formatRanges = (ranges: TimeRange[] | undefined | null): string => {
  if (!ranges || ranges.length === 0) return 'Closed';
  return ranges.map(r => `${formatTime(r.start)} – ${formatTime(r.end)}`).join(', ');
};

// Safely get ranges for a day, returning empty array if undefined
const getDayRanges = (schedule: WeeklySchedule, day: DayKey): TimeRange[] => {
  return Array.isArray(schedule[day]) ? schedule[day] : [];
};

const rangesAreEqual = (a: TimeRange[], b: TimeRange[]): boolean => {
  if (a.length !== b.length) return false;
  return a.every((range, i) => range.start === b[i].start && range.end === b[i].end);
};

interface GroupedDay {
  days: DayKey[];
  ranges: TimeRange[];
}

const groupConsecutiveDays = (schedule: WeeklySchedule): GroupedDay[] => {
  const groups: GroupedDay[] = [];
  let currentGroup: GroupedDay | null = null;

  DAY_ORDER.forEach((day) => {
    const ranges = getDayRanges(schedule, day);
    
    if (currentGroup && rangesAreEqual(currentGroup.ranges, ranges)) {
      currentGroup.days.push(day);
    } else {
      if (currentGroup) {
        groups.push(currentGroup);
      }
      currentGroup = { days: [day], ranges };
    }
  });

  if (currentGroup) {
    groups.push(currentGroup);
  }

  return groups;
};

const formatDayRange = (days: DayKey[]): string => {
  if (days.length === 1) {
    return DAY_LABELS[days[0]];
  }
  if (days.length === 7) {
    return 'Every day';
  }
  // Check for weekdays
  const weekdays = ['mon', 'tue', 'wed', 'thu', 'fri'];
  if (days.length === 5 && weekdays.every(d => days.includes(d as DayKey))) {
    return 'Mon – Fri';
  }
  // Check for weekends
  if (days.length === 2 && days.includes('sat') && days.includes('sun')) {
    return 'Sat – Sun';
  }
  // Otherwise show range
  return `${DAY_LABELS[days[0]]} – ${DAY_LABELS[days[days.length - 1]]}`;
};

export const WeeklyHoursDisplay: React.FC<WeeklyHoursDisplayProps> = ({
  schedule,
  className,
}) => {
  const raw = schedule;
  if (!raw || typeof raw !== 'object') return null;

  // Normalize keys (handles both "monday" and "mon" formats)
  const normalized = normalizeScheduleKeys(raw) as WeeklySchedule | null;
  if (!normalized) return null;

  // Check if schedule has any hours set (safely)
  const hasAnyHours = DAY_ORDER.some(day => {
    const ranges = getDayRanges(normalized, day);
    return ranges.length > 0;
  });
  if (!hasAnyHours) return null;

  const groups = groupConsecutiveDays(normalized);

  return (
    <div className={cn("space-y-4", className)}>
      <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
        <Clock className="h-5 w-5" />
        Operating Hours
      </h2>
      
      <div className="space-y-2">
        {groups.map((group, idx) => (
          <div 
            key={idx}
            className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30"
          >
            <span className="font-medium text-sm text-foreground min-w-[100px]">
              {formatDayRange(group.days)}
            </span>
            <span className={cn(
              "text-sm",
              group.ranges.length === 0 ? "text-muted-foreground" : "text-foreground"
            )}>
              {formatRanges(group.ranges)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Helper function to check if schedule has any hours configured
export const hasAnyScheduledHours = (schedule: WeeklySchedule | null | undefined): boolean => {
  if (!schedule || typeof schedule !== 'object') return false;
  return DAY_ORDER.some(day => {
    const ranges = Array.isArray(schedule[day]) ? schedule[day] : [];
    return ranges.length > 0;
  });
};

export default WeeklyHoursDisplay;
