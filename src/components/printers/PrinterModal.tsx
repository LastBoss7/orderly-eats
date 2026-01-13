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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Printer, Settings, Link2, Monitor, Usb, Info } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

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
  { value: 'counter', label: 'Balcão', icon: '🛒' },
  { value: 'table', label: 'Mesa', icon: '🪑' },
  { value: 'delivery', label: 'Entrega', icon: '🛵' },
];

const PAPER_SIZE_OPTIONS = [
  { value: 58, label: '58mm (32 caracteres)', chars: 32 },
  { value: 80, label: '80mm (48 caracteres)', chars: 48 },
];

const PRINTER_MODELS = [
  { value: 'epson-tm-t20', label: 'Epson TM-T20' },
  { value: 'epson-tm-t88', label: 'Epson TM-T88' },
  { value: 'elgin-i9', label: 'Elgin i9' },
  { value: 'elgin-i7', label: 'Elgin i7' },
  { value: 'bematech-mp-4200', label: 'Bematech MP-4200' },
  { value: 'daruma-dr800', label: 'Daruma DR800' },
  { value: 'other', label: 'Outro modelo' },
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
  const [activeTab, setActiveTab] = useState('basic');
  const [paperSize, setPaperSize] = useState<58 | 80>(80);
  const [customModel, setCustomModel] = useState('');
  const [selectedModel, setSelectedModel] = useState('');

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
      
      // Determine paper size
      if (printer.paper_width && printer.paper_width <= 32) {
        setPaperSize(58);
      } else {
        setPaperSize(80);
      }
      
      // Check if model matches predefined
      const foundModel = PRINTER_MODELS.find(m => m.label === printer.model);
      if (foundModel) {
        setSelectedModel(foundModel.value);
        setCustomModel('');
      } else {
        setSelectedModel('other');
        setCustomModel(printer.model || '');
      }
    } else {
      setFormData({
        name: '',
        model: '',
        printer_name: '',
        paper_width: 48,
        linked_order_types: ['counter', 'table', 'delivery'],
        is_active: true,
      });
      setActiveTab('basic');
      setPaperSize(80);
      setSelectedModel('');
      setCustomModel('');
    }
  }, [printer, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Set model based on selection
    let model = '';
    if (selectedModel === 'other') {
      model = customModel;
    } else {
      const found = PRINTER_MODELS.find(m => m.value === selectedModel);
      model = found?.label || '';
    }
    
    await onSave({
      ...formData,
      model,
      paper_width: paperSize === 58 ? 32 : 48,
    });
  };

  const toggleOrderType = (type: string) => {
    setFormData((prev) => ({
      ...prev,
      linked_order_types: prev.linked_order_types.includes(type)
        ? prev.linked_order_types.filter((t) => t !== type)
        : [...prev.linked_order_types, type],
    }));
  };

  const isBasicComplete = formData.name.trim().length > 0;
  const isSettingsComplete = selectedModel.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="w-5 h-5" />
              {printer ? 'Editar Impressora' : 'Adicionar Impressora'}
            </DialogTitle>
            <DialogDescription>
              Configure os dados da impressora para impressão automática de pedidos.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic" className="gap-1.5">
                <Printer className="w-3.5 h-3.5" />
                Básico
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-1.5">
                <Settings className="w-3.5 h-3.5" />
                Configuração
              </TabsTrigger>
              <TabsTrigger value="types" className="gap-1.5">
                <Link2 className="w-3.5 h-3.5" />
                Vinculação
              </TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da impressora *</Label>
                <Input
                  id="name"
                  placeholder="Ex: Cozinha, Balcão, Bar..."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="h-11"
                />
                <p className="text-xs text-muted-foreground">
                  Nome para identificar esta impressora no sistema
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="printer_name">Impressora do Windows</Label>
                <Input
                  id="printer_name"
                  placeholder="Ex: EPSON TM-T20X (deixe vazio para padrão)"
                  value={formData.printer_name}
                  onChange={(e) => setFormData({ ...formData, printer_name: e.target.value })}
                  className="h-11"
                />
                <div className="flex items-start gap-2 p-3 rounded-md bg-muted/50">
                  <Info className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    O nome exato da impressora será selecionado no aplicativo desktop. 
                    Deixe em branco aqui se ainda não souber o nome.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 rounded-lg border bg-card">
                <Checkbox
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_active: checked === true })
                  }
                />
                <div className="flex-1">
                  <label
                    htmlFor="is_active"
                    className="text-sm font-medium leading-none cursor-pointer"
                  >
                    Impressora ativa
                  </label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Desative para pausar impressões temporariamente
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Modelo da impressora</Label>
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Selecione o modelo" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRINTER_MODELS.map((model) => (
                      <SelectItem key={model.value} value={model.value}>
                        {model.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedModel === 'other' && (
                <div className="space-y-2">
                  <Label htmlFor="custom_model">Nome do modelo</Label>
                  <Input
                    id="custom_model"
                    placeholder="Digite o modelo da impressora"
                    value={customModel}
                    onChange={(e) => setCustomModel(e.target.value)}
                    className="h-11"
                  />
                </div>
              )}

              <div className="space-y-3">
                <Label>Largura do papel</Label>
                <RadioGroup
                  value={String(paperSize)}
                  onValueChange={(val) => setPaperSize(parseInt(val) as 58 | 80)}
                  className="grid grid-cols-2 gap-3"
                >
                  {PAPER_SIZE_OPTIONS.map((option) => (
                    <div key={option.value}>
                      <RadioGroupItem
                        value={String(option.value)}
                        id={`paper-${option.value}`}
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor={`paper-${option.value}`}
                        className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-colors"
                      >
                        <span className="text-lg font-semibold">{option.value}mm</span>
                        <span className="text-xs text-muted-foreground">{option.chars} caracteres</span>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            </TabsContent>

            <TabsContent value="types" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Tipos de pedido vinculados</Label>
                <p className="text-xs text-muted-foreground mb-3">
                  Selecione quais tipos de pedido serão impressos nesta impressora
                </p>
                <div className="grid gap-2">
                  {ORDER_TYPE_OPTIONS.map((option) => (
                    <div
                      key={option.value}
                      onClick={() => toggleOrderType(option.value)}
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                        formData.linked_order_types.includes(option.value)
                          ? 'border-primary bg-primary/5'
                          : 'border-muted hover:bg-muted/50'
                      }`}
                    >
                      <Checkbox
                        id={`order-type-${option.value}`}
                        checked={formData.linked_order_types.includes(option.value)}
                        onCheckedChange={() => toggleOrderType(option.value)}
                      />
                      <span className="text-xl">{option.icon}</span>
                      <label
                        htmlFor={`order-type-${option.value}`}
                        className="flex-1 font-medium cursor-pointer"
                      >
                        {option.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {formData.linked_order_types.length === 0 && (
                <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                  ⚠️ Selecione pelo menos um tipo de pedido
                </div>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6 gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !formData.name || formData.linked_order_types.length === 0}
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {printer ? 'Salvar' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
