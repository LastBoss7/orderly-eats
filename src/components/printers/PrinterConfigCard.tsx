import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Printer as PrinterIcon, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

interface Category {
  id: string;
  name: string;
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

export function PrinterConfigCard({ printer, onUpdate }: PrinterConfigCardProps) {
  const { restaurant } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Local state for editing
  const [isActive, setIsActive] = useState(printer.is_active ?? true);
  const [selectedOrderTypes, setSelectedOrderTypes] = useState<string[]>(
    printer.linked_order_types || ['counter', 'table', 'delivery']
  );
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    printer.linked_categories || []
  );
  const [selectAllCategories, setSelectAllCategories] = useState(false);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      if (!restaurant?.id) return;
      
      setLoadingCategories(true);
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('id, name')
          .eq('restaurant_id', restaurant.id)
          .order('sort_order', { ascending: true });

        if (error) throw error;
        setCategories(data || []);
        
        // Check if all categories are selected
        if (printer.linked_categories === null || 
            (data && printer.linked_categories?.length === data.length)) {
          setSelectAllCategories(true);
          setSelectedCategories(data?.map(c => c.id) || []);
        }
      } catch (err) {
        console.error('Error fetching categories:', err);
      } finally {
        setLoadingCategories(false);
      }
    };

    if (expanded) {
      fetchCategories();
    }
  }, [expanded, restaurant?.id]);

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
    setSelectAllCategories(newCategories.length === categories.length);
  };

  const handleSelectAllCategories = (checked: boolean) => {
    setSelectAllCategories(checked);
    if (checked) {
      setSelectedCategories(categories.map(c => c.id));
    } else {
      setSelectedCategories([]);
    }
  };

  const saveChanges = async (overrides: Partial<{
    is_active: boolean;
    linked_order_types: string[];
    linked_categories: string[] | null;
  }> = {}) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('printers')
        .update({
          is_active: overrides.is_active ?? isActive,
          linked_order_types: overrides.linked_order_types ?? selectedOrderTypes,
          linked_categories: selectAllCategories ? null : selectedCategories,
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

  return (
    <Card className={`transition-all ${!isActive ? 'opacity-60' : ''}`}>
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

          <Badge 
            className={printer.status === 'connected' 
              ? 'bg-green-500 text-white hover:bg-green-600' 
              : 'bg-muted text-muted-foreground'
            }
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
            {/* Filter Section Header */}
            <div>
              <h4 className="font-medium text-foreground">Filtrar pedidos</h4>
              <p className="text-sm text-muted-foreground">
                Selecionar características dos pedidos que serão impressos nesta impressora
              </p>
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

            {/* Categories */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Categorias de itens</Label>
              
              {loadingCategories ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Select All */}
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`${printer.id}-all-categories`}
                      checked={selectAllCategories}
                      onCheckedChange={(checked) => 
                        handleSelectAllCategories(checked as boolean)
                      }
                    />
                    <Label 
                      htmlFor={`${printer.id}-all-categories`}
                      className="text-sm font-medium cursor-pointer"
                    >
                      Selecionar todos
                    </Label>
                  </div>

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
                      Nenhuma categoria cadastrada. Todas as categorias serão impressas.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-2">
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
