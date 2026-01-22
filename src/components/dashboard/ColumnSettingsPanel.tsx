import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Settings2 } from 'lucide-react';

interface PrepTimeSettings {
  counter_min: number;
  counter_max: number;
  delivery_min: number;
  delivery_max: number;
}

interface ColumnSettingsPanelProps {
  prepTimes: PrepTimeSettings;
  autoAccept: boolean;
  onAutoAcceptChange: (value: boolean) => void;
  onEditPrepTimes: () => void;
}

export function ColumnSettingsPanel({
  prepTimes,
  autoAccept,
  onAutoAcceptChange,
  onEditPrepTimes,
}: ColumnSettingsPanelProps) {
  return (
    <div className="p-3 space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          <span className="font-medium text-foreground">Balcão:</span> {prepTimes.counter_min}-{prepTimes.counter_max}min
        </span>
        <button 
          className="text-primary hover:underline font-medium flex items-center gap-1"
          onClick={onEditPrepTimes}
        >
          <Settings2 className="w-3 h-3" />
          Editar
        </button>
      </div>
      <div className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Delivery:</span> {prepTimes.delivery_min}-{prepTimes.delivery_max}min
      </div>
      <div className="flex items-center gap-2 pt-2 border-t border-border/50">
        <Switch 
          checked={autoAccept} 
          onCheckedChange={onAutoAcceptChange}
          className="scale-90"
        />
        <span className="text-xs font-medium text-foreground">Auto-aceitar pedidos</span>
      </div>
    </div>
  );
}
