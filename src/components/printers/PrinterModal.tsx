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

  // Sample receipt preview
  const receiptPreview = `========================================
            CONSUMO NO LOCAL
========================================
        ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
    ${restaurant?.name || 'Restaurante'}
            Suzano
========================================
            Pedido 2193
----------------------------------------
Itens

(1) Água                               -
  - Escolha o sua bebida!
    (1) Água Mineral       R$     7,90
        Acqualia Com Gás
        Crystal 500ml
                              --------
(1) Smash Burguer         R$    23,00
  - Escolha um molho adicional
    grátis!
    (1) Molho Mostarda e Mel       -
                              --------
(1) Batata Frita          R$     9,90
    Crocante
                              --------
(1) Batata Frita          R$     9,90
    Crocante
----------------------------------------
Cliente

Nome: Cliente Teste
Telefone: (00) 0000-0000
Quantidade de pedidos: 06
----------------------------------------
Pagamento

Forma de Pagamento: Dinheiro`;

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
                <pre className="p-4 font-mono text-xs text-amber-900 dark:text-amber-100 whitespace-pre-wrap">
                  {receiptPreview}
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
