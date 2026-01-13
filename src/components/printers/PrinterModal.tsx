import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';

interface PrinterData {
  id?: string;
  name: string;
  model: string;
  printer_name: string;
  paper_width: number;
  linked_order_types: string[];
  is_active: boolean;
}

interface PrinterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  printer?: PrinterData | null;
  onSave: (data: Omit<PrinterData, 'id'>) => Promise<void>;
  loading?: boolean;
}

const ORDER_TYPE_OPTIONS = [
  { value: 'counter', label: 'Pedidos de balcão' },
  { value: 'table', label: 'Pedidos de mesa' },
  { value: 'delivery', label: 'Pedidos de entrega' },
];

export function PrinterModal({
  open,
  onOpenChange,
  printer,
  onSave,
  loading = false,
}: PrinterModalProps) {
  const [formData, setFormData] = useState<Omit<PrinterData, 'id'>>({
    name: '',
    model: '',
    printer_name: '',
    paper_width: 48,
    linked_order_types: ['counter', 'table', 'delivery'],
    is_active: true,
  });

  useEffect(() => {
    if (printer) {
      setFormData({
        name: printer.name || '',
        model: printer.model || '',
        printer_name: printer.printer_name || '',
        paper_width: printer.paper_width || 48,
        linked_order_types: printer.linked_order_types || ['counter', 'table', 'delivery'],
        is_active: printer.is_active ?? true,
      });
    } else {
      setFormData({
        name: '',
        model: '',
        printer_name: '',
        paper_width: 48,
        linked_order_types: ['counter', 'table', 'delivery'],
        is_active: true,
      });
    }
  }, [printer, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(formData);
  };

  const toggleOrderType = (type: string) => {
    setFormData((prev) => ({
      ...prev,
      linked_order_types: prev.linked_order_types.includes(type)
        ? prev.linked_order_types.filter((t) => t !== type)
        : [...prev.linked_order_types, type],
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {printer ? 'Editar Impressora' : 'Adicionar Impressora'}
            </DialogTitle>
            <DialogDescription>
              Configure os dados da impressora para impressão automática de pedidos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da impressora *</Label>
              <Input
                id="name"
                placeholder="Ex: Cozinha, Balcão, Bar..."
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <p className="text-xs text-muted-foreground">
                Nome para identificar esta impressora no sistema
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="model">Modelo/Marca</Label>
              <Input
                id="model"
                placeholder="Ex: Epson TM-T20, Elgin i9..."
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="printer_name">Nome no Windows</Label>
              <Input
                id="printer_name"
                placeholder="Deixe vazio para usar a padrão"
                value={formData.printer_name}
                onChange={(e) => setFormData({ ...formData, printer_name: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Nome exato da impressora como aparece no Windows
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paper_width">Largura do papel (caracteres)</Label>
              <Input
                id="paper_width"
                type="number"
                min={32}
                max={80}
                value={formData.paper_width}
                onChange={(e) => setFormData({ ...formData, paper_width: parseInt(e.target.value) || 48 })}
              />
              <p className="text-xs text-muted-foreground">
                48 para papel 58mm, 42 para papel 80mm
              </p>
            </div>

            <div className="space-y-3">
              <Label>Tipos de pedido vinculados</Label>
              {ORDER_TYPE_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`order-type-${option.value}`}
                    checked={formData.linked_order_types.includes(option.value)}
                    onCheckedChange={() => toggleOrderType(option.value)}
                  />
                  <label
                    htmlFor={`order-type-${option.value}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {option.label}
                  </label>
                </div>
              ))}
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_active: checked === true })
                }
              />
              <label
                htmlFor="is_active"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Impressora ativa
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !formData.name}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {printer ? 'Salvar' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
