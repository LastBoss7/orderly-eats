import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar as CalendarIcon, Clock, X } from 'lucide-react';
import { format, addDays, setHours, setMinutes, isToday, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ScheduleOrderPickerProps {
  scheduledAt: Date | null;
  onScheduleChange: (date: Date | null) => void;
}

export function ScheduleOrderPicker({ scheduledAt, onScheduleChange }: ScheduleOrderPickerProps) {
  const [isScheduled, setIsScheduled] = useState(!!scheduledAt);
  const [selectedDate, setSelectedDate] = useState<Date>(scheduledAt || new Date());
  const [selectedHour, setSelectedHour] = useState(
    scheduledAt ? format(scheduledAt, 'HH') : format(addDays(new Date(), 0), 'HH')
  );
  const [selectedMinute, setSelectedMinute] = useState(
    scheduledAt ? format(scheduledAt, 'mm') : '00'
  );
  const [calendarOpen, setCalendarOpen] = useState(false);

  const handleToggleSchedule = (checked: boolean) => {
    setIsScheduled(checked);
    if (!checked) {
      onScheduleChange(null);
    } else {
      // Set default to 1 hour from now
      const defaultTime = new Date();
      defaultTime.setHours(defaultTime.getHours() + 1);
      defaultTime.setMinutes(0);
      setSelectedDate(defaultTime);
      setSelectedHour(format(defaultTime, 'HH'));
      setSelectedMinute('00');
      onScheduleChange(defaultTime);
    }
  };

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      updateScheduledTime(date, selectedHour, selectedMinute);
      setCalendarOpen(false);
    }
  };

  const handleHourChange = (hour: string) => {
    setSelectedHour(hour);
    updateScheduledTime(selectedDate, hour, selectedMinute);
  };

  const handleMinuteChange = (minute: string) => {
    setSelectedMinute(minute);
    updateScheduledTime(selectedDate, selectedHour, minute);
  };

  const updateScheduledTime = (date: Date, hour: string, minute: string) => {
    const newDate = setMinutes(setHours(date, parseInt(hour)), parseInt(minute));
    onScheduleChange(newDate);
  };

  // Generate hour options (current hour to 23 for today, 0-23 for other days)
  const getHourOptions = () => {
    const hours = [];
    const startHour = isToday(selectedDate) ? new Date().getHours() : 0;
    for (let i = startHour; i <= 23; i++) {
      hours.push(String(i).padStart(2, '0'));
    }
    return hours;
  };

  // Generate minute options (0, 15, 30, 45)
  const minuteOptions = ['00', '15', '30', '45'];

  // Quick select options
  const quickOptions = [
    { label: 'Hoje', getValue: () => new Date() },
    { label: 'Amanhã', getValue: () => addDays(new Date(), 1) },
    { label: '+2 dias', getValue: () => addDays(new Date(), 2) },
  ];

  const formatDisplayDate = () => {
    if (!scheduledAt) return 'Selecionar data e hora';
    
    if (isToday(scheduledAt)) {
      return `Hoje às ${format(scheduledAt, 'HH:mm')}`;
    }
    return format(scheduledAt, "dd/MM 'às' HH:mm", { locale: ptBR });
  };

  return (
    <div className="space-y-3">
      {/* Toggle */}
      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-primary" />
          <Label htmlFor="schedule-toggle" className="text-sm font-medium cursor-pointer">
            Agendar pedido
          </Label>
        </div>
        <Switch
          id="schedule-toggle"
          checked={isScheduled}
          onCheckedChange={handleToggleSchedule}
        />
      </div>

      {/* Schedule picker */}
      {isScheduled && (
        <div className="p-3 border rounded-lg space-y-3 bg-background">
          {/* Quick select buttons */}
          <div className="flex gap-2">
            {quickOptions.map((option) => (
              <Button
                key={option.label}
                type="button"
                variant="outline"
                size="sm"
                className="flex-1 h-8 text-xs"
                onClick={() => {
                  const newDate = option.getValue();
                  setSelectedDate(newDate);
                  // Keep current time selection
                  updateScheduledTime(newDate, selectedHour, selectedMinute);
                }}
              >
                {option.label}
              </Button>
            ))}
          </div>

          {/* Date and time selectors */}
          <div className="flex gap-2">
            {/* Date picker */}
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 justify-start text-left font-normal h-9"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(selectedDate, 'dd/MM/yyyy', { locale: ptBR })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateChange}
                  disabled={(date) => isBefore(startOfDay(date), startOfDay(new Date()))}
                  locale={ptBR}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            {/* Time selectors */}
            <div className="flex items-center gap-1">
              <Select value={selectedHour} onValueChange={handleHourChange}>
                <SelectTrigger className="w-16 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getHourOptions().map((hour) => (
                    <SelectItem key={hour} value={hour}>
                      {hour}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-muted-foreground font-bold">:</span>
              <Select value={selectedMinute} onValueChange={handleMinuteChange}>
                <SelectTrigger className="w-16 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {minuteOptions.map((minute) => (
                    <SelectItem key={minute} value={minute}>
                      {minute}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Preview */}
          {scheduledAt && (
            <div className="flex items-center justify-between p-2 bg-primary/5 rounded-md">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-primary" />
                <span className="font-medium">{formatDisplayDate()}</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                onClick={() => handleToggleSchedule(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
