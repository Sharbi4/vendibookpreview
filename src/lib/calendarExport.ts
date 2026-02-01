import { format, parseISO } from 'date-fns';

interface CalendarEvent {
  title: string;
  description?: string;
  location?: string;
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  startTime?: string; // HH:mm format
  endTime?: string; // HH:mm format
}

/**
 * Format date for iCalendar format (YYYYMMDD or YYYYMMDDTHHmmssZ)
 */
const formatICalDate = (dateStr: string, timeStr?: string): string => {
  const date = parseISO(dateStr);
  if (timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    date.setHours(hours, minutes, 0, 0);
    return format(date, "yyyyMMdd'T'HHmmss");
  }
  return format(date, 'yyyyMMdd');
};

/**
 * Escape special characters for iCalendar format
 */
const escapeICalText = (text: string): string => {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
};

/**
 * Generate an iCalendar (.ics) file content
 */
export const generateICS = (event: CalendarEvent): string => {
  const startDate = formatICalDate(event.startDate, event.startTime);
  // For all-day events, end date should be the day after (iCal uses exclusive end)
  const endDateObj = parseISO(event.endDate);
  endDateObj.setDate(endDateObj.getDate() + 1);
  const endDate = event.endTime 
    ? formatICalDate(event.endDate, event.endTime)
    : format(endDateObj, 'yyyyMMdd');
  
  const uid = `booking-${Date.now()}@vendibook.com`;
  const now = format(new Date(), "yyyyMMdd'T'HHmmss'Z'");
  
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//VendiBook//Booking Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
  ];
  
  // Add start/end with proper format for all-day vs timed events
  if (event.startTime) {
    lines.push(`DTSTART:${startDate}`);
    lines.push(`DTEND:${endDate}`);
  } else {
    lines.push(`DTSTART;VALUE=DATE:${startDate}`);
    lines.push(`DTEND;VALUE=DATE:${endDate}`);
  }
  
  lines.push(`SUMMARY:${escapeICalText(event.title)}`);
  
  if (event.description) {
    lines.push(`DESCRIPTION:${escapeICalText(event.description)}`);
  }
  
  if (event.location) {
    lines.push(`LOCATION:${escapeICalText(event.location)}`);
  }
  
  lines.push('END:VEVENT');
  lines.push('END:VCALENDAR');
  
  return lines.join('\r\n');
};

/**
 * Download an ICS file
 */
export const downloadICS = (event: CalendarEvent): void => {
  const icsContent = generateICS(event);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `${event.title.replace(/[^a-zA-Z0-9]/g, '-')}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Generate Google Calendar URL
 */
export const generateGoogleCalendarUrl = (event: CalendarEvent): string => {
  const startDate = formatICalDate(event.startDate, event.startTime);
  const endDateObj = parseISO(event.endDate);
  if (!event.endTime) {
    endDateObj.setDate(endDateObj.getDate() + 1);
  }
  const endDate = event.endTime 
    ? formatICalDate(event.endDate, event.endTime)
    : format(endDateObj, 'yyyyMMdd');
  
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${startDate}/${endDate}`,
  });
  
  if (event.description) {
    params.set('details', event.description);
  }
  
  if (event.location) {
    params.set('location', event.location);
  }
  
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

/**
 * Generate Outlook Calendar URL (web version)
 */
export const generateOutlookCalendarUrl = (event: CalendarEvent): string => {
  const startDate = parseISO(event.startDate);
  const endDate = parseISO(event.endDate);
  
  if (event.startTime) {
    const [startHours, startMinutes] = event.startTime.split(':').map(Number);
    startDate.setHours(startHours, startMinutes, 0, 0);
  }
  
  if (event.endTime) {
    const [endHours, endMinutes] = event.endTime.split(':').map(Number);
    endDate.setHours(endHours, endMinutes, 0, 0);
  } else {
    endDate.setDate(endDate.getDate() + 1);
  }
  
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: event.title,
    startdt: startDate.toISOString(),
    enddt: endDate.toISOString(),
    allday: event.startTime ? 'false' : 'true',
  });
  
  if (event.description) {
    params.set('body', event.description);
  }
  
  if (event.location) {
    params.set('location', event.location);
  }
  
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
};
