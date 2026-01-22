import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimeRange {
  start: string;
  end: string;
}

export interface WeeklySchedule {
  mon: TimeRange[];
  tue: TimeRange[];
  wed: TimeRange[];
  thu: TimeRange[];
  fri: TimeRange[];
  sat: TimeRange[];
  sun: TimeRange[];
}

type DayKey = keyof WeeklySchedule;

interface HourlyScheduleGridProps {
  schedule: WeeklySchedule;
  onChange: (schedule: WeeklySchedule) => void;
  operatingStart?: string;
  operatingEnd?: string;
}

const DAY_LABELS: Record<DayKey, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};

const DAY_ORDER: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

const generateTimeOptions = (startHour: number = 0, endHour: number = 24): string[] => {
  const times: string[] = [];
  for (let h = startHour; h <= endHour; h++) {
    times.push(`${h.toString().padStart(2, '0')}:00`);
  }
  return times;
};

const formatTimeDisplay = (time: string): string => {
  const hour = parseInt(time.split(':')[0]);
  if (hour === 0) return '12:00 AM';
  if (hour === 12) return '12:00 PM';
  if (hour === 24) return '12:00 AM';
  return hour > 12 ? `${hour - 12}:00 PM` : `${hour}:00 AM`;
};

const formatRangeDisplay = (range: TimeRange): string => {
  return `${formatTimeDisplay(range.start)} – ${formatTimeDisplay(range.end)}`;
};

export const HourlyScheduleGrid: React.FC<HourlyScheduleGridProps> = ({
  schedule,
  onChange,
  operatingStart = '06:00',
  operatingEnd = '22:00',
}) => {
  const [addingToDay, setAddingToDay] = useState<DayKey | null>(null);
  const [newStart, setNewStart] = useState('08:00');
  const [newEnd, setNewEnd] = useState('18:00');

  const opStartHour = parseInt(operatingStart.split(':')[0]);
  const opEndHour = parseInt(operatingEnd.split(':')[0]);
  const timeOptions = generateTimeOptions(opStartHour, opEndHour);

  const addTimeRange = (day: DayKey) => {
    const startHour = parseInt(newStart.split(':')[0]);
    const endHour = parseInt(newEnd.split(':')[0]);
    
    if (endHour <= startHour) {
      return; // Invalid range
    }

    // Check for overlaps
    const existing = schedule[day];
    const hasOverlap = existing.some(range => {
      const existingStart = parseInt(range.start.split(':')[0]);
      const existingEnd = parseInt(range.end.split(':')[0]);
      return !(endHour <= existingStart || startHour >= existingEnd);
    });

    if (hasOverlap) {
      return; // Overlapping range
    }

    const newRange: TimeRange = { start: newStart, end: newEnd };
    const updatedDay = [...existing, newRange].sort((a, b) => 
      parseInt(a.start.split(':')[0]) - parseInt(b.start.split(':')[0])
    );

    onChange({
      ...schedule,
      [day]: updatedDay,
    });
    setAddingToDay(null);
    setNewStart('08:00');
    setNewEnd('18:00');
  };

  const removeTimeRange = (day: DayKey, index: number) => {
    const updated = schedule[day].filter((_, i) => i !== index);
    onChange({
      ...schedule,
      [day]: updated,
    });
  };

  const copyToAllDays = (sourceDay: DayKey) => {
    const sourceRanges = schedule[sourceDay];
    const newSchedule = { ...schedule };
    DAY_ORDER.forEach(day => {
      if (day !== sourceDay) {
        newSchedule[day] = [...sourceRanges];
      }
    });
    onChange(newSchedule);
  };

  const copyToWeekdays = (sourceDay: DayKey) => {
    const sourceRanges = schedule[sourceDay];
    const newSchedule = { ...schedule };
    ['mon', 'tue', 'wed', 'thu', 'fri'].forEach(day => {
      newSchedule[day as DayKey] = [...sourceRanges];
    });
    onChange(newSchedule);
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Weekly Schedule</Label>
      <p className="text-xs text-muted-foreground mb-2">
        Set available hours for each day. Leave empty for days you're not available for hourly bookings.
      </p>

      <div className="space-y-2">
        {DAY_ORDER.map(day => (
          <div 
            key={day} 
            className={cn(
              "p-3 rounded-lg border transition-colors",
              schedule[day].length > 0 
                ? "border-primary/30 bg-primary/5" 
                : "border-border bg-muted/30"
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground w-24">
                {DAY_LABELS[day]}
              </span>
              
              <div className="flex items-center gap-2 flex-1 justify-end">
                {schedule[day].length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap">
                    {schedule[day].map((range, idx) => (
                      <div 
                        key={idx}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-background rounded-md border border-border text-xs"
                      >
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span>{formatRangeDisplay(range)}</span>
                        <button
                          onClick={() => removeTimeRange(day, idx)}
                          className="text-muted-foreground hover:text-destructive ml-1"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {addingToDay !== day && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => setAddingToDay(day)}
                  >
                    <Plus className="h-3 w-3" />
                    Add hours
                  </Button>
                )}
              </div>
            </div>

            {/* Add time range form */}
            {addingToDay === day && (
              <div className="flex items-center gap-2 mt-2 p-2 bg-background rounded-md border border-border">
                <Select value={newStart} onValueChange={setNewStart}>
                  <SelectTrigger className="w-24 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.slice(0, -1).map(time => (
                      <SelectItem key={time} value={time}>
                        {formatTimeDisplay(time)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <span className="text-muted-foreground text-xs">to</span>
                
                <Select value={newEnd} onValueChange={setNewEnd}>
                  <SelectTrigger className="w-24 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.slice(1).map(time => (
                      <SelectItem key={time} value={time}>
                        {formatTimeDisplay(time)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => addTimeRange(day)}
                >
                  Add
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setAddingToDay(null)}
                >
                  Cancel
                </Button>
              </div>
            )}

            {/* Copy actions */}
            {schedule[day].length > 0 && addingToDay !== day && (
              <div className="flex gap-2 mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs text-muted-foreground"
                  onClick={() => copyToWeekdays(day)}
                >
                  Copy to weekdays
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs text-muted-foreground"
                  onClick={() => copyToAllDays(day)}
                >
                  Copy to all days
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export const EMPTY_SCHEDULE: WeeklySchedule = {
  mon: [],
  tue: [],
  wed: [],
  thu: [],
  fri: [],
  sat: [],
  sun: [],
};
