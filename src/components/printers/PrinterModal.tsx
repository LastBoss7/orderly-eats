import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface AvailablePrinter {
  id: string;
  printer_name: string;
  display_name: string | null;
  driver_name: string | null;
  is_default: boolean;
  last_seen_at: string;
}

interface PrinterData {
  id?: string;
  name: string;
  model: string;
  printer_name: string;
  paper_width: number;
  linked_order_types: string[];
  linked_categories: string[] | null;
  is_active: boolean;
}

interface PrinterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  printer?: PrinterData | null;
  onSave: (data: Omit<PrinterData, 'id'>) => Promise<void>;
  loading?: boolean;
}

export function PrinterModal({
  open,
  onOpenChange,
  printer,
  onSave,
  loading = false,
}: PrinterModalProps) {
  const { restaurant } = useAuth();
  const [availablePrinters, setAvailablePrinters] = useState<AvailablePrinter[]>([]);
  const [loadingPrinters, setLoadingPrinters] = useState(false);
  
  const [name, setName] = useState('');
  const [printerName, setPrinterName] = useState('');

  // Fetch available printers from Electron app
  const fetchAvailablePrinters = async () => {
    if (!restaurant?.id) return;
    
    setLoadingPrinters(true);
    try {
      const { data, error } = await supabase
        .from('available_printers')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .order('is_default', { ascending: false })
        .order('printer_name', { ascending: true });

      if (error) throw error;
      setAvailablePrinters(data || []);
    } catch (err) {
      console.error('Erro ao buscar impressoras disponíveis:', err);
    } finally {
      setLoadingPrinters(false);
    }
  };

  useEffect(() => {
    if (open && restaurant?.id) {
      fetchAvailablePrinters();
    }
  }, [open, restaurant?.id]);

  useEffect(() => {
    if (printer) {
      setName(printer.name || '');
      setPrinterName(printer.printer_name || '');
    } else {
      setName('');
      setPrinterName('');
    }
  }, [printer, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await onSave({
      name,
      model: 'Impressora Térmica',
      printer_name: printerName,
      paper_width: 48,
      linked_order_types: ['counter', 'table', 'delivery'],
      linked_categories: null,
      is_active: true,
    });
  };

  // Sample receipt preview following new schema
  const generatePreview = () => {
    const width = 46;
    const thinDivider = '-'.repeat(width);
    const lines: string[] = [];

    const center = (text: string) => {
      if (text.length >= width) return text.slice(0, width);
      const padding = Math.floor((width - text.length) / 2);
      return ' '.repeat(padding) + text;
    };

    const alignBoth = (left: string, right: string) => {
      const totalLen = left.length + right.length;
      if (totalLen >= width) return left + right;
      const padding = width - totalLen;
      return left + ' '.repeat(padding) + right;
    };

    // Header
    const now = new Date();
    lines.push(center(`${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`));
    lines.push(center(restaurant?.name || 'Restaurante'));
    lines.push(thinDivider);
    lines.push(center('Pedido 0'));
    lines.push('');

    // Items
    lines.push('Itens:');
    
    // Item 1
    lines.push(alignBoth('(1) Item Teste', 'R$ 10,00'));
    lines.push('  OBS: Observação');
    lines.push(thinDivider);
    
    // Item 2
    lines.push(alignBoth('(1) Item Teste 2', 'R$ 20,00'));
    lines.push(thinDivider);
    
    // Item 3 with addon
    lines.push(alignBoth('(1) Item Teste 3', 'R$ 30,00'));
    lines.push(alignBoth('  (1) Adicional', 'R$ 40,00'));
    lines.push(thinDivider);
    
    // Item 4 with combos
    lines.push(alignBoth('(1) Item Teste 4', 'R$ 40,00'));
    lines.push(alignBoth('  (1) Combo Teste 1', 'R$ 5,00'));
    lines.push(alignBoth('  (1) Combo Teste 2', 'R$ 10,00'));
    lines.push(alignBoth('  (1) Combo Teste 3', 'R$ 25,00'));
    lines.push('');

    // Customer info
    lines.push('Cliente: Teste');
    lines.push('Telefone: (99) 9 9999-9999');
    lines.push('Entrega: Vem buscar no local pra levar');
    lines.push('');

    // Payment
    lines.push(thinDivider);
    lines.push('Forma de Pagamento: Cartão (Teste)');
    lines.push('');

    // Totals
    lines.push(thinDivider);
    lines.push(alignBoth('Subtotal:', 'R$ 100,00'));
    lines.push(alignBoth('Total:', 'R$ 100,00'));
    lines.push('');
    lines.push(thinDivider);

    // Footer
    lines.push(center('Powered By: Gamako'));
    lines.push(center('Acesse: https://gamako.com.br'));

    return lines.join('\n');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Configuração de impressora</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {/* Left side - Form */}
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium mb-4">Configurações básicas</h3>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Apelido *</Label>
                    <Input
                      id="name"
                      placeholder="Balcão 1"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Apelido único para identificar essa impressora.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="printer">Impressora *</Label>
                    {loadingPrinters ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <Select value={printerName} onValueChange={setPrinterName}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma impressora" />
                        </SelectTrigger>
                        <SelectContent>
                          {availablePrinters.length === 0 ? (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                              Nenhuma impressora detectada.
                              <br />
                              <span className="text-xs">
                                Abra o aplicativo Electron para sincronizar.
                              </span>
                            </div>
                          ) : (
                            availablePrinters.map((ap) => (
                              <SelectItem key={ap.id} value={ap.printer_name}>
                                {ap.display_name || ap.printer_name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right side - Receipt Preview */}
            <div>
              <ScrollArea className="h-[400px] rounded-lg border bg-amber-50 dark:bg-amber-950/20">
                <pre className="p-4 font-mono text-xs text-amber-900 dark:text-amber-100 whitespace-pre">
                  {generatePreview()}
                </pre>
              </ScrollArea>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !name || !printerName}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
