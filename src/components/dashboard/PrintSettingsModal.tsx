import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2, Printer, Store, UtensilsCrossed, MapPin } from 'lucide-react';
import { PrintSettings } from '@/hooks/usePrintSettings';

interface PrintSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: PrintSettings;
  onSave: (settings: PrintSettings) => Promise<boolean>;
}

export function PrintSettingsModal({
  open,
  onOpenChange,
  settings,
  onSave,
}: PrintSettingsModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [localSettings, setLocalSettings] = useState<PrintSettings>(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings, open]);

  const handleSave = async () => {
    setLoading(true);
    const success = await onSave(localSettings);
    setLoading(false);

    if (success) {
      toast({
        title: 'Configurações salvas!',
        description: 'As configurações de impressão foram atualizadas.',
      });
      onOpenChange(false);
    } else {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar as configurações.',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="w-5 h-5" />
            Configurações de Impressão
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <p className="text-sm text-muted-foreground">
            Configure quais tipos de pedido devem ser impressos automaticamente quando criados.
          </p>

          {/* Counter */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Store className="w-5 h-5 text-primary" />
              </div>
              <div>
                <Label htmlFor="auto_print_counter" className="text-base font-medium">
                  Balcão / Retirada
                </Label>
                <p className="text-sm text-muted-foreground">
                  Pedidos para retirar no balcão
                </p>
              </div>
            </div>
            <Switch
              id="auto_print_counter"
              checked={localSettings.auto_print_counter}
              onCheckedChange={(checked) =>
                setLocalSettings((prev) => ({ ...prev, auto_print_counter: checked }))
              }
            />
          </div>

          {/* Table */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <UtensilsCrossed className="w-5 h-5 text-primary" />
              </div>
              <div>
                <Label htmlFor="auto_print_table" className="text-base font-medium">
                  Mesa
                </Label>
                <p className="text-sm text-muted-foreground">
                  Pedidos para consumo no local
                </p>
              </div>
            </div>
            <Switch
              id="auto_print_table"
              checked={localSettings.auto_print_table}
              onCheckedChange={(checked) =>
                setLocalSettings((prev) => ({ ...prev, auto_print_table: checked }))
              }
            />
          </div>

          {/* Delivery */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              <div>
                <Label htmlFor="auto_print_delivery" className="text-base font-medium">
                  Delivery
                </Label>
                <p className="text-sm text-muted-foreground">
                  Pedidos para entrega
                </p>
              </div>
            </div>
            <Switch
              id="auto_print_delivery"
              checked={localSettings.auto_print_delivery}
              onCheckedChange={(checked) =>
                setLocalSettings((prev) => ({ ...prev, auto_print_delivery: checked }))
              }
            />
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
