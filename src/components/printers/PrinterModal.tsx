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
import { Loader2, Printer, Settings, Link2, Info, Tag } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface Category {
  id: string;
  name: string;
  icon: string | null;
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
  const { restaurant } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  
  const [formData, setFormData] = useState<Omit<PrinterData, 'id'>>({
    name: '',
    model: '',
    printer_name: '',
    paper_width: 48,
    linked_order_types: ['counter', 'table', 'delivery'],
    linked_categories: null,
    is_active: true,
  });
  const [activeTab, setActiveTab] = useState('basic');
  const [paperSize, setPaperSize] = useState<58 | 80>(80);
  const [customModel, setCustomModel] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [filterByCategory, setFilterByCategory] = useState(false);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      if (!restaurant?.id) return;
      
      setLoadingCategories(true);
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('id, name, icon')
          .eq('restaurant_id', restaurant.id)
          .order('sort_order', { ascending: true });

        if (error) throw error;
        setCategories(data || []);
      } catch (err) {
        console.error('Erro ao buscar categorias:', err);
      } finally {
        setLoadingCategories(false);
      }
    };

    if (open) {
      fetchCategories();
    }
  }, [open, restaurant?.id]);

  useEffect(() => {
    if (printer) {
      setFormData({
        name: printer.name || '',
        model: printer.model || '',
        printer_name: printer.printer_name || '',
        paper_width: printer.paper_width || 48,
        linked_order_types: printer.linked_order_types || ['counter', 'table', 'delivery'],
        linked_categories: printer.linked_categories,
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

      // Check if filtering by category
      setFilterByCategory(printer.linked_categories !== null && printer.linked_categories.length > 0);
    } else {
      setFormData({
        name: '',
        model: '',
        printer_name: '',
        paper_width: 48,
        linked_order_types: ['counter', 'table', 'delivery'],
        linked_categories: null,
        is_active: true,
      });
      setActiveTab('basic');
      setPaperSize(80);
      setSelectedModel('');
      setCustomModel('');
      setFilterByCategory(false);
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
      linked_categories: filterByCategory ? formData.linked_categories : null,
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

  const toggleCategory = (categoryId: string) => {
    setFormData((prev) => {
      const current = prev.linked_categories || [];
      const updated = current.includes(categoryId)
        ? current.filter((id) => id !== categoryId)
        : [...current, categoryId];
      return { ...prev, linked_categories: updated };
    });
  };

  const handleFilterByCategoryChange = (checked: boolean) => {
    setFilterByCategory(checked);
    if (!checked) {
      setFormData(prev => ({ ...prev, linked_categories: null }));
    } else if (!formData.linked_categories) {
      setFormData(prev => ({ ...prev, linked_categories: [] }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh]">
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
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic" className="gap-1.5 text-xs sm:text-sm">
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Básico</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-1.5 text-xs sm:text-sm">
                <Settings className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Config</span>
              </TabsTrigger>
              <TabsTrigger value="types" className="gap-1.5 text-xs sm:text-sm">
                <Link2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tipos</span>
              </TabsTrigger>
              <TabsTrigger value="categories" className="gap-1.5 text-xs sm:text-sm">
                <Tag className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Categorias</span>
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

            <TabsContent value="categories" className="space-y-4 mt-4">
              <div className="space-y-2">
                <div className="flex items-center space-x-3 p-3 rounded-lg border bg-card">
                  <Checkbox
                    id="filter_by_category"
                    checked={filterByCategory}
                    onCheckedChange={(checked) => handleFilterByCategoryChange(checked === true)}
                  />
                  <div className="flex-1">
                    <label
                      htmlFor="filter_by_category"
                      className="text-sm font-medium leading-none cursor-pointer"
                    >
                      Filtrar por categoria
                    </label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Imprimir apenas itens de categorias específicas (ex: bebidas no bar, comidas na cozinha)
                    </p>
                  </div>
                </div>
              </div>

              {filterByCategory && (
                <div className="space-y-2">
                  <Label>Categorias vinculadas</Label>
                  <p className="text-xs text-muted-foreground mb-3">
                    Selecione quais categorias de produtos serão impressas nesta impressora
                  </p>
                  
                  {loadingCategories ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : categories.length === 0 ? (
                    <div className="p-4 rounded-md bg-muted/50 text-center">
                      <p className="text-sm text-muted-foreground">
                        Nenhuma categoria cadastrada. Cadastre categorias no menu Produtos → Categorias.
                      </p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[200px] rounded-md border p-2">
                      <div className="grid gap-2">
                        {categories.map((category) => (
                          <div
                            key={category.id}
                            onClick={() => toggleCategory(category.id)}
                            className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                              formData.linked_categories?.includes(category.id)
                                ? 'border-primary bg-primary/5'
                                : 'border-muted hover:bg-muted/50'
                            }`}
                          >
                            <Checkbox
                              id={`category-${category.id}`}
                              checked={formData.linked_categories?.includes(category.id) || false}
                              onCheckedChange={() => toggleCategory(category.id)}
                            />
                            <span className="text-xl">{category.icon || '📦'}</span>
                            <label
                              htmlFor={`category-${category.id}`}
                              className="flex-1 font-medium cursor-pointer"
                            >
                              {category.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}

                  {filterByCategory && formData.linked_categories?.length === 0 && (
                    <div className="p-3 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 text-sm">
                      ⚠️ Selecione pelo menos uma categoria ou desative o filtro
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-start gap-2 p-3 rounded-md bg-blue-500/10">
                <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  <strong>Exemplo de uso:</strong> Configure uma impressora "Bar" para imprimir 
                  apenas itens da categoria "Bebidas", e outra impressora "Cozinha" para 
                  imprimir itens das categorias "Pratos" e "Porções".
                </p>
              </div>
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
