import { useState } from 'react';
import { Calendar, Clock, Phone, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, addDays, isBefore, startOfToday } from 'date-fns';

const timeSlots = [
  '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM',
  '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM',
];

const getAvailableDates = () => {
  const dates = [];
  const today = startOfToday();
  for (let i = 1; i <= 7; i++) {
    const date = addDays(today, i);
    const day = date.getDay();
    // Skip Sundays (0)
    if (day !== 0) {
      dates.push(date);
    }
  }
  return dates;
};

const CallbackScheduler = () => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();

  const availableDates = getAvailableDates();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    
    // Validate all fields present
    if (!trimmedName || !trimmedPhone || !selectedDate || !selectedTime) {
      toast({
        title: 'Missing information',
        description: 'Please fill out all fields to schedule a callback.',
        variant: 'destructive',
      });
      return;
    }
    
    // Validate name length
    if (trimmedName.length < 2 || trimmedName.length > 100) {
      toast({
        title: 'Invalid name',
        description: 'Name must be between 2 and 100 characters.',
        variant: 'destructive',
      });
      return;
    }
    
    // Validate phone format (US phone numbers)
    const phoneRegex = /^[\d\s\-\(\)\+]{10,20}$/;
    if (!phoneRegex.test(trimmedPhone)) {
      toast({
        title: 'Invalid phone number',
        description: 'Please enter a valid phone number (10-20 digits).',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.functions.invoke('schedule-callback', {
        body: {
          name: trimmedName,
          phone: trimmedPhone,
          scheduledDate: selectedDate,
          scheduledTime: selectedTime,
        },
      });

      if (error) throw error;

      setIsSuccess(true);
      toast({
        title: 'Callback scheduled!',
        description: `We'll call you on ${format(new Date(selectedDate), 'EEEE, MMMM d')} at ${selectedTime} EST.`,
      });
    } catch (error) {
      console.error('Callback scheduling error:', error);
      toast({
        title: 'Something went wrong',
        description: 'Please try again or call us directly.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4">
          <CheckCircle className="h-8 w-8" />
        </div>
        <h3 className="font-semibold text-foreground mb-2">Callback Scheduled!</h3>
        <p className="text-sm text-muted-foreground mb-4">
          We'll call you on {format(new Date(selectedDate), 'EEEE, MMMM d')} at {selectedTime} EST.
        </p>
        <Button variant="outline" onClick={() => {
          setIsSuccess(false);
          setName('');
          setPhone('');
          setSelectedDate('');
          setSelectedTime('');
        }}>
          Schedule Another
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
      <div className="flex items-start gap-3 mb-6">
        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
          <Calendar className="h-6 w-6" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Schedule a Callback</h3>
          <p className="text-sm text-muted-foreground">
            Pick a time that works for you and we'll call you
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="callback-name">Your Name</Label>
            <Input
              id="callback-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              disabled={isSubmitting}
              maxLength={100}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="callback-phone">Phone Number</Label>
            <Input
              id="callback-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
              disabled={isSubmitting}
              maxLength={20}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Preferred Date</Label>
            <Select value={selectedDate} onValueChange={setSelectedDate} disabled={isSubmitting}>
              <SelectTrigger>
                <SelectValue placeholder="Select date" />
              </SelectTrigger>
              <SelectContent>
                {availableDates.map((date) => (
                  <SelectItem key={date.toISOString()} value={date.toISOString()}>
                    {format(date, 'EEE, MMM d')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Preferred Time (EST)</Label>
            <Select value={selectedTime} onValueChange={setSelectedTime} disabled={isSubmitting}>
              <SelectTrigger>
                <SelectValue placeholder="Select time" />
              </SelectTrigger>
              <SelectContent>
                {timeSlots.map((time) => (
                  <SelectItem key={time} value={time}>
                    {time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Scheduling...
            </>
          ) : (
            <>
              <Phone className="h-4 w-4 mr-2" />
              Schedule Callback
            </>
          )}
        </Button>
      </form>
    </div>
  );
};

export default CallbackScheduler;
