import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Printer as PrinterIcon, ChevronDown, ChevronUp, Loader2, ChefHat, Wine, Receipt, Utensils, AlertCircle, Monitor, TestTube2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { usePrintToElectron } from '@/hooks/usePrintToElectron';

interface Category {
  id: string;
  name: string;
}

interface AvailablePrinter {
  id: string;
  printer_name: string;
  display_name: string | null;
  is_default: boolean | null;
}

interface PrinterConfigCardProps {
  printer: {
    id: string;
    name: string;
    printer_name: string | null;
    status: string | null;
    is_active: boolean | null;
    linked_order_types: string[] | null;
    linked_categories: string[] | null;
  };
  onUpdate: () => void;
}

const ORDER_TYPES = [
  { value: 'table', label: 'Consumo no local' },
  { value: 'counter', label: 'Retirada no local' },
  { value: 'delivery', label: 'Para entrega' },
];

// Presets para tipos de impressora (Cozinha, Bar, etc)
const PRINTER_PRESETS = [
  { 
    value: 'cashier', 
    label: 'Caixa / Geral', 
    icon: Receipt,
    description: 'Recebe TODOS os itens do pedido',
    color: 'bg-blue-500',
  },
  { 
    value: 'kitchen', 
    label: 'Cozinha', 
    icon: ChefHat,
    description: 'Apenas itens de cozinha',
    color: 'bg-orange-500',
  },
  { 
    value: 'bar', 
    label: 'Bar / Bebidas', 
    icon: Wine,
    description: 'Apenas bebidas e drinks',
    color: 'bg-purple-500',
  },
  { 
    value: 'custom', 
    label: 'Personalizado', 
    icon: Utensils,
    description: 'Escolher categorias manualmente',
    color: 'bg-gray-500',
  },
];

export function PrinterConfigCard({ printer, onUpdate }: PrinterConfigCardProps) {
  const { restaurant } = useAuth();
  const { printCategoryTest } = usePrintToElectron();
  const [expanded, setExpanded] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [availablePrinters, setAvailablePrinters] = useState<AvailablePrinter[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingAvailablePrinters, setLoadingAvailablePrinters] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testingPrint, setTestingPrint] = useState(false);
  
  // Local state for editing
  const [isActive, setIsActive] = useState(printer.is_active ?? true);
  const [selectedPrinterName, setSelectedPrinterName] = useState<string>(printer.printer_name || '');
  const [selectedOrderTypes, setSelectedOrderTypes] = useState<string[]>(
    printer.linked_order_types || ['counter', 'table', 'delivery']
  );
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    printer.linked_categories || []
  );
  const [printerType, setPrinterType] = useState<string>('cashier');

  // Determine current printer type based on linked_categories
  useEffect(() => {
    if (printer.linked_categories === null || printer.linked_categories.length === 0) {
      setPrinterType('cashier');
    } else if (categories.length > 0 && printer.linked_categories.length === categories.length) {
      setPrinterType('cashier');
    } else {
      setPrinterType('custom');
    }
  }, [printer.linked_categories, categories.length]);

  // Fetch categories and available printers
  useEffect(() => {
    const fetchData = async () => {
      if (!restaurant?.id) return;
      
      setLoadingCategories(true);
      setLoadingAvailablePrinters(true);
      
      try {
        // Fetch categories
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('categories')
          .select('id, name')
          .eq('restaurant_id', restaurant.id)
          .order('sort_order', { ascending: true });

        if (categoriesError) throw categoriesError;
        setCategories(categoriesData || []);
        
        // Initialize selected categories
        if (printer.linked_categories === null) {
          setSelectedCategories(categoriesData?.map(c => c.id) || []);
        } else {
          setSelectedCategories(printer.linked_categories);
        }

        // Fetch available printers (synced from Electron app)
        const { data: printersData, error: printersError } = await supabase
          .from('available_printers')
          .select('id, printer_name, display_name, is_default')
          .eq('restaurant_id', restaurant.id)
          .order('is_default', { ascending: false });

        if (printersError) throw printersError;
        setAvailablePrinters(printersData || []);
        
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoadingCategories(false);
        setLoadingAvailablePrinters(false);
      }
    };

    if (expanded) {
      fetchData();
    }
  }, [expanded, restaurant?.id, printer.linked_categories]);

  // Compute if all categories are selected
  const allCategoriesSelected = useMemo(() => {
    return categories.length > 0 && selectedCategories.length === categories.length;
  }, [categories.length, selectedCategories.length]);

  // Get display info for current configuration
  const getConfigSummary = () => {
    if (printer.linked_categories === null || (categories.length > 0 && printer.linked_categories?.length === categories.length)) {
      return { label: 'Todos os itens', type: 'cashier' };
    }
    if (printer.linked_categories?.length === 0) {
      return { label: 'Nenhuma categoria', type: 'warning' };
    }
    return { label: `${printer.linked_categories?.length} categoria(s)`, type: 'custom' };
  };

  const configSummary = getConfigSummary();

  const handleToggleActive = async (active: boolean) => {
    setIsActive(active);
    await saveChanges({ is_active: active });
  };

  const handleOrderTypeChange = (type: string, checked: boolean) => {
    const newTypes = checked
      ? [...selectedOrderTypes, type]
      : selectedOrderTypes.filter(t => t !== type);
    
    setSelectedOrderTypes(newTypes);
  };

  const handleCategoryChange = (categoryId: string, checked: boolean) => {
    const newCategories = checked
      ? [...selectedCategories, categoryId]
      : selectedCategories.filter(c => c !== categoryId);
    
    setSelectedCategories(newCategories);
    setPrinterType('custom');
  };

  const handleSelectAllCategories = () => {
    setSelectedCategories(categories.map(c => c.id));
    setPrinterType('cashier');
  };

  const handleDeselectAllCategories = () => {
    setSelectedCategories([]);
    setPrinterType('custom');
  };

  const handlePresetChange = (preset: string) => {
    setPrinterType(preset);
    
    if (preset === 'cashier') {
      // Select all categories
      setSelectedCategories(categories.map(c => c.id));
    } else if (preset === 'kitchen') {
      // Try to find kitchen-related categories
      const kitchenKeywords = ['prato', 'refeic', 'lanche', 'porca', 'sobremesa', 'comida', 'pizza', 'hambur', 'hot dog', 'salgad', 'massa', 'carne', 'frango', 'peixe'];
      const kitchenCategories = categories.filter(c => 
        kitchenKeywords.some(kw => c.name.toLowerCase().includes(kw))
      );
      
      if (kitchenCategories.length > 0) {
        setSelectedCategories(kitchenCategories.map(c => c.id));
      } else {
        // If no matches, keep current selection but mark as custom
        setPrinterType('custom');
        toast.info('Selecione manualmente as categorias de cozinha');
      }
    } else if (preset === 'bar') {
      // Try to find bar-related categories
      const barKeywords = ['bebida', 'drink', 'suco', 'cerveja', 'vinho', 'refri', 'agua', 'café', 'cha', 'milk', 'shake', 'coquet', 'dose', 'whisky', 'vodka'];
      const barCategories = categories.filter(c => 
        barKeywords.some(kw => c.name.toLowerCase().includes(kw))
      );
      
      if (barCategories.length > 0) {
        setSelectedCategories(barCategories.map(c => c.id));
      } else {
        // If no matches, keep current selection but mark as custom
        setPrinterType('custom');
        toast.info('Selecione manualmente as categorias de bar');
      }
    }
    // For 'custom', keep current selection
  };

  const saveChanges = async (overrides: Partial<{
    is_active: boolean;
    linked_order_types: string[];
    linked_categories: string[] | null;
    printer_name: string | null;
  }> = {}) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('printers')
        .update({
          is_active: overrides.is_active ?? isActive,
          linked_order_types: overrides.linked_order_types ?? selectedOrderTypes,
          linked_categories: allCategoriesSelected ? null : selectedCategories,
          printer_name: overrides.printer_name ?? (selectedPrinterName || null),
        })
        .eq('id', printer.id);

      if (error) throw error;
      toast.success('Configuração salva!');
      onUpdate();
    } catch (err: any) {
      toast.error('Erro ao salvar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    saveChanges();
  };

  const handleTestPrint = async () => {
    if (!printer.printer_name) {
      toast.error('Vincule uma impressora do Windows antes de testar');
      return;
    }

    setTestingPrint(true);
    try {
      await printCategoryTest({
        printerName: printer.name,
        printerId: printer.id,
        categories: categories,
        linkedCategories: selectedCategories.length === categories.length ? null : selectedCategories,
        orderTypes: selectedOrderTypes,
      });
    } finally {
      setTestingPrint(false);
    }
  };

  // Get icon for current type
  const getCurrentTypeIcon = () => {
    const preset = PRINTER_PRESETS.find(p => p.value === printerType);
    const Icon = preset?.icon || Receipt;
    return <Icon className="w-4 h-4" />;
  };

  return (
    <Card className={cn("transition-all", !isActive && "opacity-60")}>
      <CardContent className="pt-4">
        {/* Header Row */}
        <div className="flex items-center gap-4">
          <Switch
            checked={isActive}
            onCheckedChange={handleToggleActive}
            disabled={saving}
          />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <PrinterIcon className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="font-medium truncate">{printer.name}</span>
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {printer.printer_name || 'Impressora não vinculada'}
            </p>
          </div>

          {/* Config Summary Badge */}
          <Badge 
            variant="outline"
            className={cn(
              "shrink-0",
              configSummary.type === 'warning' && "border-amber-500 text-amber-600"
            )}
          >
            {configSummary.type === 'warning' && <AlertCircle className="w-3 h-3 mr-1" />}
            {configSummary.label}
          </Badge>

          <Badge 
            className={cn(
              "shrink-0",
              printer.status === 'connected' 
                ? 'bg-green-500 text-white hover:bg-green-600' 
                : 'bg-muted text-muted-foreground'
            )}
          >
            {printer.status === 'connected' ? '✓ Conectada' : 'Aguardando'}
          </Badge>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Expanded Content */}
        {expanded && (
          <div className="mt-6 pt-4 border-t space-y-6">
            {/* Printer Selection from Windows */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Monitor className="w-4 h-4" />
                Impressora do Windows
              </Label>
              <p className="text-sm text-muted-foreground">
                Selecione a impressora do Windows que será usada (sincronizada pelo app Electron)
              </p>
              
              {loadingAvailablePrinters ? (
                <div className="flex items-center gap-2 py-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Carregando impressoras...</span>
                </div>
              ) : availablePrinters.length === 0 ? (
                <div className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/20 p-3 rounded">
                  ⚠ Nenhuma impressora encontrada. Execute o app Electron para sincronizar as impressoras do Windows.
                </div>
              ) : (
                <Select
                  value={selectedPrinterName}
                  onValueChange={setSelectedPrinterName}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione uma impressora..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePrinters.map((ap) => (
                      <SelectItem key={ap.id} value={ap.printer_name}>
                        <div className="flex items-center gap-2">
                          {ap.is_default && <Badge variant="secondary" className="text-xs py-0">Padrão</Badge>}
                          {ap.display_name || ap.printer_name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Printer Type Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Tipo de Impressora</Label>
              <p className="text-sm text-muted-foreground">
                Escolha o tipo para separar automaticamente os itens do pedido
              </p>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                {PRINTER_PRESETS.map((preset) => {
                  const Icon = preset.icon;
                  const isSelected = printerType === preset.value;
                  
                  return (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => handlePresetChange(preset.value)}
                      className={cn(
                        "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
                        "hover:bg-accent/50",
                        isSelected 
                          ? "border-primary bg-primary/5" 
                          : "border-border"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center",
                        preset.color,
                        "text-white"
                      )}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="font-medium text-sm">{preset.label}</span>
                      <span className="text-xs text-muted-foreground text-center line-clamp-2">
                        {preset.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Order Types */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Modalidade de pedido *</Label>
              <div className="flex flex-wrap gap-4">
                {ORDER_TYPES.map((type) => (
                  <div key={type.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`${printer.id}-${type.value}`}
                      checked={selectedOrderTypes.includes(type.value)}
                      onCheckedChange={(checked) => 
                        handleOrderTypeChange(type.value, checked as boolean)
                      }
                    />
                    <Label 
                      htmlFor={`${printer.id}-${type.value}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {type.label}
                    </Label>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Ao menos uma modalidade de pedido deverá ser selecionada.
              </p>
            </div>

            {/* Categories - Only show if custom type or for review */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Categorias de itens</Label>
                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={handleSelectAllCategories}
                    disabled={allCategoriesSelected}
                  >
                    Selecionar todos
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={handleDeselectAllCategories}
                    disabled={selectedCategories.length === 0}
                  >
                    Limpar
                  </Button>
                </div>
              </div>
              
              {loadingCategories ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Info about selection */}
                  {allCategoriesSelected && (
                    <p className="text-sm text-green-600 bg-green-50 dark:bg-green-950/20 p-2 rounded">
                      ✓ Todos os itens serão impressos nesta impressora
                    </p>
                  )}
                  
                  {selectedCategories.length === 0 && (
                    <p className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/20 p-2 rounded">
                      ⚠ Nenhuma categoria selecionada - esta impressora não receberá pedidos
                    </p>
                  )}

                  {/* Category Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                    {categories.map((category) => (
                      <div key={category.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`${printer.id}-cat-${category.id}`}
                          checked={selectedCategories.includes(category.id)}
                          onCheckedChange={(checked) => 
                            handleCategoryChange(category.id, checked as boolean)
                          }
                        />
                        <Label 
                          htmlFor={`${printer.id}-cat-${category.id}`}
                          className="text-sm font-normal cursor-pointer truncate"
                        >
                          {category.name}
                        </Label>
                      </div>
                    ))}
                  </div>

                  {categories.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Nenhuma categoria cadastrada. Cadastre categorias em "Categorias" para poder filtrar.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between pt-2">
              <Button 
                variant="outline"
                onClick={handleTestPrint} 
                disabled={testingPrint || !printer.printer_name || selectedCategories.length === 0}
              >
                {testingPrint ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <TestTube2 className="w-4 h-4 mr-2" />
                )}
                Testar Impressão
              </Button>
              <Button onClick={handleSave} disabled={saving || selectedOrderTypes.length === 0}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Salvar Configuração
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
