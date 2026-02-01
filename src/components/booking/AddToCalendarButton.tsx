import React, { useState } from 'react';
import { CalendarPlus, Download, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  downloadICS,
  generateGoogleCalendarUrl,
  generateOutlookCalendarUrl,
} from '@/lib/calendarExport';
import { format } from 'date-fns';

interface AddToCalendarButtonProps {
  title: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  description?: string;
  size?: 'default' | 'sm' | 'lg' | 'icon';
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
}

export const AddToCalendarButton: React.FC<AddToCalendarButtonProps> = ({
  title,
  startDate,
  endDate,
  startTime,
  endTime,
  location,
  description,
  size = 'sm',
  variant = 'outline',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const calendarEvent = {
    title,
    startDate,
    endDate,
    startTime,
    endTime,
    location,
    description: description || `Rental booking for ${title} from ${format(new Date(startDate), 'MMM d')} to ${format(new Date(endDate), 'MMM d, yyyy')}`,
  };

  const handleGoogleCalendar = () => {
    window.open(generateGoogleCalendarUrl(calendarEvent), '_blank');
    setIsOpen(false);
  };

  const handleOutlookCalendar = () => {
    window.open(generateOutlookCalendarUrl(calendarEvent), '_blank');
    setIsOpen(false);
  };

  const handleDownloadICS = () => {
    downloadICS(calendarEvent);
    setIsOpen(false);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className="bg-card/80 backdrop-blur-sm">
          <CalendarPlus className="h-4 w-4 mr-1" />
          Add to Calendar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuItem onClick={handleGoogleCalendar}>
          <ExternalLink className="h-4 w-4 mr-2" />
          Google Calendar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleOutlookCalendar}>
          <ExternalLink className="h-4 w-4 mr-2" />
          Outlook Calendar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDownloadICS}>
          <Download className="h-4 w-4 mr-2" />
          Download .ics File
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default AddToCalendarButton;
