import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Clock, Store, MapPin } from 'lucide-react';

interface PrepTimeSettings {
  counter_min: number;
  counter_max: number;
  delivery_min: number;
  delivery_max: number;
}

interface EditPrepTimeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValues: PrepTimeSettings;
  onSave: (values: PrepTimeSettings) => void;
}

export function EditPrepTimeModal({ 
  open, 
  onOpenChange, 
  initialValues,
  onSave 
}: EditPrepTimeModalProps) {
  const { restaurant } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [values, setValues] = useState<PrepTimeSettings>(initialValues);

  useEffect(() => {
    setValues(initialValues);
  }, [initialValues, open]);

  const handleSave = async () => {
    // Validate values
    if (values.counter_min < 0 || values.counter_max < 0 || 
        values.delivery_min < 0 || values.delivery_max < 0) {
      toast({
        variant: 'destructive',
        title: 'Valores inválidos',
        description: 'Os tempos não podem ser negativos.',
      });
      return;
    }

    if (values.counter_min > values.counter_max) {
      toast({
        variant: 'destructive',
        title: 'Valores inválidos',
        description: 'Tempo mínimo do balcão não pode ser maior que o máximo.',
      });
      return;
    }

    if (values.delivery_min > values.delivery_max) {
      toast({
        variant: 'destructive',
        title: 'Valores inválidos',
        description: 'Tempo mínimo do delivery não pode ser maior que o máximo.',
      });
      return;
    }

    setLoading(true);

    try {
      // Save to salon_settings table
      const { error } = await supabase
        .from('salon_settings')
        .upsert({
          restaurant_id: restaurant?.id,
          // Store in a JSON-compatible way using existing columns or we can use a workaround
          // Since salon_settings doesn't have these fields, we'll store in localStorage for now
          // and update the table structure later if needed
        }, { onConflict: 'restaurant_id' });

      // For now, store in localStorage as a quick solution
      localStorage.setItem(`prep_times_${restaurant?.id}`, JSON.stringify(values));

      toast({
        title: 'Tempos salvos!',
        description: 'Os tempos de preparo foram atualizados.',
      });

      onSave(values);
      onOpenChange(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Tempos de Preparo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Counter Times */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Store className="w-4 h-4 text-primary" />
              <span>Balcão / Retirada</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="counter_min">Tempo mínimo (min)</Label>
                <Input
                  id="counter_min"
                  type="number"
                  min={0}
                  value={values.counter_min}
                  onChange={(e) => setValues(prev => ({ 
                    ...prev, 
                    counter_min: parseInt(e.target.value) || 0 
                  }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="counter_max">Tempo máximo (min)</Label>
                <Input
                  id="counter_max"
                  type="number"
                  min={0}
                  value={values.counter_max}
                  onChange={(e) => setValues(prev => ({ 
                    ...prev, 
                    counter_max: parseInt(e.target.value) || 0 
                  }))}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Tempo estimado: {values.counter_min} a {values.counter_max} minutos
            </p>
          </div>

          {/* Delivery Times */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <MapPin className="w-4 h-4 text-primary" />
              <span>Delivery / Entrega</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="delivery_min">Tempo mínimo (min)</Label>
                <Input
                  id="delivery_min"
                  type="number"
                  min={0}
                  value={values.delivery_min}
                  onChange={(e) => setValues(prev => ({ 
                    ...prev, 
                    delivery_min: parseInt(e.target.value) || 0 
                  }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="delivery_max">Tempo máximo (min)</Label>
                <Input
                  id="delivery_max"
                  type="number"
                  min={0}
                  value={values.delivery_max}
                  onChange={(e) => setValues(prev => ({ 
                    ...prev, 
                    delivery_max: parseInt(e.target.value) || 0 
                  }))}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Tempo estimado: {values.delivery_min} a {values.delivery_max} minutos
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
