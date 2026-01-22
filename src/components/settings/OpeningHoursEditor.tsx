import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock } from 'lucide-react';

export interface DaySchedule {
  day: number;
  name: string;
  enabled: boolean;
  open: string;
  close: string;
}

interface OpeningHoursEditorProps {
  hours: DaySchedule[];
  onChange: (hours: DaySchedule[]) => void;
  useOpeningHours: boolean;
  onToggleUse: (use: boolean) => void;
}

export function OpeningHoursEditor({
  hours,
  onChange,
  useOpeningHours,
  onToggleUse,
}: OpeningHoursEditorProps) {
  const handleDayChange = (dayIndex: number, field: keyof DaySchedule, value: string | boolean) => {
    const updated = hours.map((h) =>
      h.day === dayIndex ? { ...h, [field]: value } : h
    );
    onChange(updated);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Horário de Funcionamento
            </CardTitle>
            <CardDescription>
              Configure quando seu estabelecimento está aberto para pedidos
            </CardDescription>
          </div>
          <Switch
            checked={useOpeningHours}
            onCheckedChange={onToggleUse}
          />
        </div>
      </CardHeader>
      
      {useOpeningHours && (
        <CardContent className="border-t pt-4">
          <div className="space-y-3">
            {hours.map((day) => (
              <div
                key={day.day}
                className={`flex items-center gap-4 p-3 rounded-lg border transition-colors ${
                  day.enabled ? 'bg-background' : 'bg-muted/50 opacity-60'
                }`}
              >
                <div className="w-24 flex items-center gap-2">
                  <Switch
                    checked={day.enabled}
                    onCheckedChange={(enabled) => handleDayChange(day.day, 'enabled', enabled)}
                    className="scale-90"
                  />
                  <Label className="text-sm font-medium">{day.name}</Label>
                </div>
                
                {day.enabled ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      type="time"
                      value={day.open}
                      onChange={(e) => handleDayChange(day.day, 'open', e.target.value)}
                      className="w-28 h-8 text-sm"
                    />
                    <span className="text-muted-foreground text-sm">até</span>
                    <Input
                      type="time"
                      value={day.close}
                      onChange={(e) => handleDayChange(day.day, 'close', e.target.value)}
                      className="w-28 h-8 text-sm"
                    />
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Fechado</span>
                )}
              </div>
            ))}
          </div>
          
          <p className="text-xs text-muted-foreground mt-4">
            O cardápio digital mostrará se o estabelecimento está aberto ou fechado com base nestes horários.
          </p>
        </CardContent>
      )}
    </Card>
  );
}

// Helper to check if restaurant is currently open
export function isRestaurantOpen(hours: DaySchedule[], useOpeningHours: boolean): { isOpen: boolean; message: string } {
  if (!useOpeningHours) {
    return { isOpen: true, message: 'Aberto' };
  }

  const now = new Date();
  const currentDay = now.getDay();
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

  const todaySchedule = hours.find((h) => h.day === currentDay);

  if (!todaySchedule || !todaySchedule.enabled) {
    // Find next open day
    const nextOpenDay = findNextOpenDay(hours, currentDay);
    if (nextOpenDay) {
      return { isOpen: false, message: `Fechado • Abre ${nextOpenDay.name} às ${nextOpenDay.open}` };
    }
    return { isOpen: false, message: 'Fechado' };
  }

  // Check if current time is within opening hours
  if (currentTime >= todaySchedule.open && currentTime <= todaySchedule.close) {
    return { isOpen: true, message: `Aberto • Fecha às ${todaySchedule.close}` };
  }

  // Before opening time
  if (currentTime < todaySchedule.open) {
    return { isOpen: false, message: `Fechado • Abre hoje às ${todaySchedule.open}` };
  }

  // After closing time
  const nextOpenDay = findNextOpenDay(hours, currentDay);
  if (nextOpenDay) {
    if (nextOpenDay.day === (currentDay + 1) % 7) {
      return { isOpen: false, message: `Fechado • Abre amanhã às ${nextOpenDay.open}` };
    }
    return { isOpen: false, message: `Fechado • Abre ${nextOpenDay.name} às ${nextOpenDay.open}` };
  }

  return { isOpen: false, message: 'Fechado' };
}

function findNextOpenDay(hours: DaySchedule[], currentDay: number): DaySchedule | null {
  for (let i = 1; i <= 7; i++) {
    const nextDay = (currentDay + i) % 7;
    const schedule = hours.find((h) => h.day === nextDay);
    if (schedule && schedule.enabled) {
      return schedule;
    }
  }
  return null;
}

// Default opening hours
export const defaultOpeningHours: DaySchedule[] = [
  { day: 0, name: 'Domingo', enabled: false, open: '09:00', close: '22:00' },
  { day: 1, name: 'Segunda', enabled: true, open: '09:00', close: '22:00' },
  { day: 2, name: 'Terça', enabled: true, open: '09:00', close: '22:00' },
  { day: 3, name: 'Quarta', enabled: true, open: '09:00', close: '22:00' },
  { day: 4, name: 'Quinta', enabled: true, open: '09:00', close: '22:00' },
  { day: 5, name: 'Sexta', enabled: true, open: '09:00', close: '22:00' },
  { day: 6, name: 'Sábado', enabled: true, open: '09:00', close: '22:00' },
];
