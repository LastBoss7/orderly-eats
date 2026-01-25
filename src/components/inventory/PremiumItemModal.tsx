import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Package,
  Plus,
  Loader2,
  DollarSign,
  Archive,
  Tag,
  Ruler,
} from "lucide-react";

interface InventoryItem {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  category: string | null;
  unit_name: string;
  current_stock: number;
  minimum_stock: number | null;
  maximum_stock: number | null;
  cost_price: number | null;
  supplier: string | null;
}

interface PremiumItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem: InventoryItem | null;
  categories: string[];
  onSave: (data: Omit<InventoryItem, 'id'>) => Promise<void>;
  onAddCategory: (name: string) => void;
}

const unitOptions = [
  { value: 'un', label: 'Unidade', icon: '📦' },
  { value: 'kg', label: 'Quilograma', icon: '⚖️' },
  { value: 'g', label: 'Grama', icon: '⚖️' },
  { value: 'L', label: 'Litro', icon: '🥤' },
  { value: 'ml', label: 'Mililitro', icon: '💧' },
];

export function PremiumItemModal({
  open,
  onOpenChange,
  editingItem,
  categories,
  onSave,
  onAddCategory,
}: PremiumItemModalProps) {
  const [saving, setSaving] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    description: '',
    category: '',
    unit_name: 'un',
    current_stock: 0,
    minimum_stock: 0,
    maximum_stock: 0,
    cost_price: 0,
    supplier: '',
  });

  useEffect(() => {
    if (editingItem) {
      setFormData({
        name: editingItem.name,
        sku: editingItem.sku || '',
        description: editingItem.description || '',
        category: editingItem.category || '',
        unit_name: editingItem.unit_name,
        current_stock: editingItem.current_stock,
        minimum_stock: editingItem.minimum_stock || 0,
        maximum_stock: editingItem.maximum_stock || 0,
        cost_price: editingItem.cost_price || 0,
        supplier: editingItem.supplier || '',
      });
    } else {
      setFormData({
        name: '',
        sku: '',
        description: '',
        category: '',
        unit_name: 'un',
        current_stock: 0,
        minimum_stock: 0,
        maximum_stock: 0,
        cost_price: 0,
        supplier: '',
      });
    }
  }, [editingItem, open]);

  const handleSave = async () => {
    if (!formData.name.trim()) return;
    
    setSaving(true);
    try {
      await onSave({
        name: formData.name.trim(),
        sku: formData.sku.trim() || null,
        description: formData.description.trim() || null,
        category: formData.category.trim() || null,
        unit_name: formData.unit_name,
        current_stock: formData.current_stock,
        minimum_stock: formData.minimum_stock || null,
        maximum_stock: formData.maximum_stock || null,
        cost_price: formData.cost_price || null,
        supplier: formData.supplier.trim() || null,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const handleAddCategory = () => {
    if (newCategory.trim()) {
      onAddCategory(newCategory.trim());
      setFormData({ ...formData, category: newCategory.trim() });
      setNewCategory('');
      setIsAddingCategory(false);
    }
  };

  const totalValue = formData.current_stock * formData.cost_price;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] p-0 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="relative px-6 py-5 bg-gradient-to-br from-primary/10 to-primary/5">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center shadow-lg",
                editingItem ? "bg-primary" : "bg-gradient-to-br from-emerald-500 to-emerald-600"
              )}>
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg">
                  {editingItem ? 'Editar Item' : 'Novo Item de Estoque'}
                </DialogTitle>
                <p className="text-sm text-muted-foreground">
                  {editingItem ? 'Atualize as informações do item' : 'Cadastre um novo insumo'}
                </p>
              </div>
            </div>
          </DialogHeader>
        </div>
        
        {/* Form */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Section 1: Basic Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px]">1</span>
              Informações Básicas
            </div>
            
            <div className="pl-8 space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-muted-foreground" />
                  Nome do Item <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Carne moída, Queijo mussarela, Coca-Cola..."
                  className="h-11"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  {isAddingCategory ? (
                    <div className="flex gap-2">
                      <Input
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        placeholder="Nome da categoria..."
                        className="h-10"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddCategory();
                          if (e.key === 'Escape') setIsAddingCategory(false);
                        }}
                      />
                      <Button size="sm" onClick={handleAddCategory} className="h-10">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Select
                        value={formData.category}
                        onValueChange={(v) => setFormData({ ...formData, category: v })}
                      >
                        <SelectTrigger className="h-10 flex-1">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-10"
                        onClick={() => setIsAddingCategory(true)}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label>SKU / Código</Label>
                  <Input
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="Opcional"
                    className="h-10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detalhes do item (opcional)"
                  rows={2}
                  className="resize-none"
                />
              </div>
            </div>
          </div>
          
          {/* Section 2: Stock & Unit */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px]">2</span>
              Estoque e Unidade
            </div>
            
            <div className="pl-8 space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Ruler className="w-4 h-4 text-muted-foreground" />
                  Unidade de Medida
                </Label>
                <div className="grid grid-cols-5 gap-2">
                  {unitOptions.map((unit) => (
                    <button
                      key={unit.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, unit_name: unit.value })}
                      className={cn(
                        "flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all",
                        formData.unit_name === unit.value
                          ? "border-primary bg-primary/5"
                          : "border-transparent bg-muted/50 hover:bg-muted"
                      )}
                    >
                      <span className="text-xl">{unit.icon}</span>
                      <span className="text-xs font-medium">{unit.value}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Archive className="w-4 h-4 text-muted-foreground" />
                    Estoque Inicial
                  </Label>
                  <Input
                    type="number"
                    value={formData.current_stock}
                    onChange={(e) => setFormData({ ...formData, current_stock: parseFloat(e.target.value) || 0 })}
                    min={0}
                    step="0.01"
                    className="h-10"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Estoque Mínimo</Label>
                  <Input
                    type="number"
                    value={formData.minimum_stock}
                    onChange={(e) => setFormData({ ...formData, minimum_stock: parseFloat(e.target.value) || 0 })}
                    min={0}
                    step="0.01"
                    className="h-10"
                    placeholder="Alerta"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Estoque Máximo</Label>
                  <Input
                    type="number"
                    value={formData.maximum_stock}
                    onChange={(e) => setFormData({ ...formData, maximum_stock: parseFloat(e.target.value) || 0 })}
                    min={0}
                    step="0.01"
                    className="h-10"
                    placeholder="Capacidade"
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* Section 3: Pricing */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px]">3</span>
              Custos
            </div>
            
            <div className="pl-8 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    Custo Unitário (R$)
                  </Label>
                  <Input
                    type="number"
                    value={formData.cost_price}
                    onChange={(e) => setFormData({ ...formData, cost_price: parseFloat(e.target.value) || 0 })}
                    min={0}
                    step="0.01"
                    className="h-10"
                    placeholder="0,00"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Fornecedor</Label>
                  <Input
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    placeholder="Opcional"
                    className="h-10"
                  />
                </div>
              </div>
              
              {/* Preview */}
              {formData.current_stock > 0 && formData.cost_price > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-emerald-700 dark:text-emerald-300">
                      Valor total em estoque:
                    </span>
                    <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}
                    </span>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t bg-muted/30 flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            className="flex-1"
            onClick={handleSave}
            disabled={saving || !formData.name.trim()}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : editingItem ? (
              <Package className="w-4 h-4 mr-2" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            {editingItem ? 'Salvar Alterações' : 'Adicionar Item'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
