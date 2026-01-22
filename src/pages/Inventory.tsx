import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  Search,
  Package,
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  Pencil,
  Trash2,
  History,
  TrendingDown,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';

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
  is_active: boolean | null;
  last_restock_at: string | null;
}

interface StockMovement {
  id: string;
  inventory_item_id: string;
  movement_type: string;
  quantity: number;
  previous_stock: number;
  new_stock: number;
  reason: string | null;
  notes: string | null;
  created_at: string;
  inventory_items?: { name: string };
}

interface StockAlert {
  id: string;
  inventory_item_id: string;
  alert_type: string;
  current_value: number;
  threshold: number | null;
  is_read: boolean | null;
  created_at: string;
  inventory_items?: { name: string; unit_name: string };
}

interface MeasurementUnit {
  id: string;
  name: string;
  abbreviation: string;
  type: string;
}

const defaultUnits = [
  { name: 'Unidade', abbreviation: 'un', type: 'unit' },
  { name: 'Quilograma', abbreviation: 'kg', type: 'weight' },
  { name: 'Grama', abbreviation: 'g', type: 'weight' },
  { name: 'Litro', abbreviation: 'L', type: 'volume' },
  { name: 'Mililitro', abbreviation: 'ml', type: 'volume' },
];

export default function Inventory() {
  const { restaurant } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [units, setUnits] = useState<MeasurementUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  
  // Modal states
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [movementType, setMovementType] = useState<'in' | 'out' | 'adjustment'>('in');
  
  // Form states
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
  
  const [movementData, setMovementData] = useState({
    quantity: 0,
    reason: '',
    notes: '',
    cost_price: 0,
  });

  // Fetch data
  useEffect(() => {
    if (!restaurant?.id) return;
    fetchData();
  }, [restaurant?.id]);

  const fetchData = async () => {
    if (!restaurant?.id) return;
    setLoading(true);

    try {
      // Fetch inventory items
      const { data: itemsData, error: itemsError } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .order('name');

      if (itemsError) throw itemsError;
      setItems(itemsData || []);

      // Fetch stock movements (last 100)
      const { data: movementsData, error: movementsError } = await supabase
        .from('stock_movements')
        .select('*, inventory_items(name)')
        .eq('restaurant_id', restaurant.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (movementsError) throw movementsError;
      setMovements(movementsData || []);

      // Fetch unread alerts
      const { data: alertsData, error: alertsError } = await supabase
        .from('stock_alerts')
        .select('*, inventory_items(name, unit_name)')
        .eq('restaurant_id', restaurant.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false });

      if (alertsError) throw alertsError;
      setAlerts(alertsData || []);

      // Fetch or create measurement units
      const { data: unitsData, error: unitsError } = await supabase
        .from('measurement_units')
        .select('*')
        .eq('restaurant_id', restaurant.id);

      if (unitsError) throw unitsError;
      
      if (!unitsData || unitsData.length === 0) {
        // Create default units
        const { data: newUnits, error: createError } = await supabase
          .from('measurement_units')
          .insert(defaultUnits.map(u => ({ ...u, restaurant_id: restaurant.id })))
          .select();
        
        if (!createError && newUnits) {
          setUnits(newUnits);
        }
      } else {
        setUnits(unitsData);
      }
    } catch (error) {
      console.error('Error fetching inventory data:', error);
      toast.error('Erro ao carregar dados do estoque');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveItem = async () => {
    if (!restaurant?.id) return;
    if (!formData.name.trim()) {
      toast.error('Nome do item é obrigatório');
      return;
    }

    try {
      const itemData = {
        restaurant_id: restaurant.id,
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
      };

      if (editingItem) {
        const { error } = await supabase
          .from('inventory_items')
          .update(itemData)
          .eq('id', editingItem.id);

        if (error) throw error;
        toast.success('Item atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('inventory_items')
          .insert(itemData);

        if (error) throw error;
        toast.success('Item adicionado com sucesso!');
      }

      setIsItemModalOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving item:', error);
      toast.error('Erro ao salvar item');
    }
  };

  const handleDeleteItem = async (item: InventoryItem) => {
    if (!confirm(`Tem certeza que deseja excluir "${item.name}"?`)) return;

    try {
      const { error } = await supabase
        .from('inventory_items')
        .delete()
        .eq('id', item.id);

      if (error) throw error;
      toast.success('Item excluído com sucesso!');
      fetchData();
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Erro ao excluir item');
    }
  };

  const handleSaveMovement = async () => {
    if (!restaurant?.id || !selectedItem) return;
    if (movementData.quantity <= 0) {
      toast.error('Quantidade deve ser maior que zero');
      return;
    }

    try {
      const previousStock = selectedItem.current_stock;
      let newStock = previousStock;
      let movementTypeDb = movementType;

      switch (movementType) {
        case 'in':
          newStock = previousStock + movementData.quantity;
          break;
        case 'out':
          newStock = previousStock - movementData.quantity;
          if (newStock < 0) {
            toast.error('Estoque não pode ficar negativo');
            return;
          }
          break;
        case 'adjustment':
          newStock = movementData.quantity;
          break;
      }

      // Create movement record
      const { error: movementError } = await supabase
        .from('stock_movements')
        .insert({
          restaurant_id: restaurant.id,
          inventory_item_id: selectedItem.id,
          movement_type: movementTypeDb,
          quantity: movementData.quantity,
          previous_stock: previousStock,
          new_stock: newStock,
          reason: movementData.reason || null,
          notes: movementData.notes || null,
          cost_price: movementType === 'in' ? movementData.cost_price || null : null,
          total_cost: movementType === 'in' ? (movementData.cost_price || 0) * movementData.quantity : null,
        });

      if (movementError) throw movementError;

      // Update inventory item
      const updateData: { current_stock: number; last_restock_at?: string; cost_price?: number } = {
        current_stock: newStock,
      };

      if (movementType === 'in') {
        updateData.last_restock_at = new Date().toISOString();
        if (movementData.cost_price > 0) {
          updateData.cost_price = movementData.cost_price;
        }
      }

      const { error: updateError } = await supabase
        .from('inventory_items')
        .update(updateData)
        .eq('id', selectedItem.id);

      if (updateError) throw updateError;

      toast.success('Movimentação registrada com sucesso!');
      setIsMovementModalOpen(false);
      resetMovementForm();
      fetchData();
    } catch (error) {
      console.error('Error saving movement:', error);
      toast.error('Erro ao registrar movimentação');
    }
  };

  const handleDismissAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('stock_alerts')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', alertId);

      if (error) throw error;
      setAlerts(alerts.filter(a => a.id !== alertId));
    } catch (error) {
      console.error('Error dismissing alert:', error);
    }
  };

  const openEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      sku: item.sku || '',
      description: item.description || '',
      category: item.category || '',
      unit_name: item.unit_name,
      current_stock: item.current_stock,
      minimum_stock: item.minimum_stock || 0,
      maximum_stock: item.maximum_stock || 0,
      cost_price: item.cost_price || 0,
      supplier: item.supplier || '',
    });
    setIsItemModalOpen(true);
  };

  const openMovementModal = (item: InventoryItem, type: 'in' | 'out' | 'adjustment') => {
    setSelectedItem(item);
    setMovementType(type);
    setMovementData({
      quantity: type === 'adjustment' ? item.current_stock : 0,
      reason: '',
      notes: '',
      cost_price: item.cost_price || 0,
    });
    setIsMovementModalOpen(true);
  };

  const resetForm = () => {
    setEditingItem(null);
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
  };

  const resetMovementForm = () => {
    setSelectedItem(null);
    setMovementData({
      quantity: 0,
      reason: '',
      notes: '',
      cost_price: 0,
    });
  };

  // Filter items
  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Get unique categories
  const categories = [...new Set(items.map(i => i.category).filter(Boolean))];

  // Stats
  const lowStockItems = items.filter(i => i.minimum_stock && i.current_stock <= i.minimum_stock);
  const totalValue = items.reduce((acc, i) => acc + (i.current_stock * (i.cost_price || 0)), 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getMovementTypeLabel = (type: string) => {
    switch (type) {
      case 'in': return 'Entrada';
      case 'out': return 'Saída';
      case 'adjustment': return 'Ajuste';
      case 'order_deduction': return 'Pedido';
      default: return type;
    }
  };

  const getMovementTypeColor = (type: string) => {
    switch (type) {
      case 'in': return 'bg-success text-success-foreground';
      case 'out': return 'bg-destructive text-destructive-foreground';
      case 'adjustment': return 'bg-warning text-warning-foreground';
      case 'order_deduction': return 'bg-primary text-primary-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Controle de Estoque</h1>
            <p className="text-muted-foreground">Gerencie seu inventário e movimentações</p>
          </div>
          <Button onClick={() => { resetForm(); setIsItemModalOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Item
          </Button>
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <Card className="border-warning bg-warning/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2 text-warning">
                <AlertTriangle className="w-5 h-5" />
                Alertas de Estoque ({alerts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {alerts.slice(0, 5).map(alert => (
                  <div key={alert.id} className="flex items-center justify-between p-2 bg-background rounded-lg">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="w-4 h-4 text-warning" />
                      <span className="font-medium">{alert.inventory_items?.name}</span>
                      <span className="text-sm text-muted-foreground">
                        - Estoque: {alert.current_value} {alert.inventory_items?.unit_name}
                        {alert.threshold && ` (Mínimo: ${alert.threshold})`}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDismissAlert(alert.id)}
                    >
                      Dispensar
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Package className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total de Itens</p>
                  <p className="text-2xl font-bold">{items.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Estoque Baixo</p>
                  <p className="text-2xl font-bold">{lowStockItems.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Valor em Estoque</p>
                  <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <History className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Movimentações (7d)</p>
                  <p className="text-2xl font-bold">
                    {movements.filter(m => 
                      new Date(m.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                    ).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="items" className="space-y-4">
          <TabsList>
            <TabsTrigger value="items">
              <Package className="w-4 h-4 mr-2" />
              Itens
            </TabsTrigger>
            <TabsTrigger value="movements">
              <History className="w-4 h-4 mr-2" />
              Movimentações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="items" className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas categorias</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat!}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={fetchData}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Atualizar
              </Button>
            </div>

            {/* Items Table */}
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-right">Estoque</TableHead>
                      <TableHead className="text-right">Mínimo</TableHead>
                      <TableHead className="text-right">Custo Unit.</TableHead>
                      <TableHead className="text-right">Valor Total</TableHead>
                      <TableHead className="text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          Carregando...
                        </TableCell>
                      </TableRow>
                    ) : filteredItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          Nenhum item encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredItems.map(item => {
                        const isLowStock = item.minimum_stock && item.current_stock <= item.minimum_stock;
                        return (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{item.name}</p>
                                {item.sku && (
                                  <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {item.category && (
                                <Badge variant="secondary">{item.category}</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                {isLowStock && (
                                  <AlertTriangle className="w-4 h-4 text-warning" />
                                )}
                                <span className={isLowStock ? 'text-warning font-semibold' : ''}>
                                  {item.current_stock} {item.unit_name}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {item.minimum_stock || '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              {item.cost_price ? formatCurrency(item.cost_price) : '-'}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(item.current_stock * (item.cost_price || 0))}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-success"
                                  onClick={() => openMovementModal(item, 'in')}
                                  title="Entrada"
                                >
                                  <ArrowDownCircle className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive"
                                  onClick={() => openMovementModal(item, 'out')}
                                  title="Saída"
                                >
                                  <ArrowUpCircle className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => openEditModal(item)}
                                  title="Editar"
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive"
                                  onClick={() => handleDeleteItem(item)}
                                  title="Excluir"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="movements" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Movimentações</CardTitle>
                <CardDescription>Últimas 100 movimentações do estoque</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Quantidade</TableHead>
                      <TableHead className="text-right">Estoque Anterior</TableHead>
                      <TableHead className="text-right">Novo Estoque</TableHead>
                      <TableHead>Motivo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          Nenhuma movimentação registrada
                        </TableCell>
                      </TableRow>
                    ) : (
                      movements.map(movement => (
                        <TableRow key={movement.id}>
                          <TableCell className="text-sm">
                            {formatDate(movement.created_at)}
                          </TableCell>
                          <TableCell className="font-medium">
                            {movement.inventory_items?.name}
                          </TableCell>
                          <TableCell>
                            <Badge className={getMovementTypeColor(movement.movement_type)}>
                              {getMovementTypeLabel(movement.movement_type)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {movement.movement_type === 'in' ? '+' : movement.movement_type === 'out' ? '-' : ''}
                            {movement.quantity}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {movement.previous_stock}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {movement.new_stock}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {movement.reason || '-'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Item Modal - Enhanced */}
        <Dialog open={isItemModalOpen} onOpenChange={setIsItemModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="pb-4 border-b">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${editingItem ? 'bg-primary/10' : 'bg-success/10'}`}>
                  <Package className={`w-6 h-6 ${editingItem ? 'text-primary' : 'text-success'}`} />
                </div>
                <div>
                  <DialogTitle className="text-xl">
                    {editingItem ? 'Editar Item' : 'Novo Item de Estoque'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingItem ? 'Atualize as informações do item' : 'Cadastre um novo insumo no seu estoque'}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Seção: Informações Básicas */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">1</span>
                  Informações Básicas
                </div>
                
                <div className="grid gap-4 pl-8">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Nome do Item *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ex: Carne moída, Queijo mussarela, Coca-Cola..."
                      className="h-11"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Categoria</Label>
                      <Select
                        value={formData.category || 'none'}
                        onValueChange={(value) => setFormData({ ...formData, category: value === 'none' ? '' : value })}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Selecione uma categoria" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sem categoria</SelectItem>
                          <SelectItem value="Carnes">🥩 Carnes</SelectItem>
                          <SelectItem value="Laticínios">🧀 Laticínios</SelectItem>
                          <SelectItem value="Bebidas">🥤 Bebidas</SelectItem>
                          <SelectItem value="Vegetais">🥬 Vegetais</SelectItem>
                          <SelectItem value="Grãos">🌾 Grãos</SelectItem>
                          <SelectItem value="Temperos">🌶️ Temperos</SelectItem>
                          <SelectItem value="Embalagens">📦 Embalagens</SelectItem>
                          <SelectItem value="Limpeza">🧹 Limpeza</SelectItem>
                          <SelectItem value="Outros">📋 Outros</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">SKU / Código</Label>
                      <Input
                        value={formData.sku}
                        onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                        placeholder="Ex: CM001"
                        className="h-11 uppercase"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Seção: Unidade e Quantidades */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">2</span>
                  Unidade e Quantidades
                </div>
                
                <div className="grid gap-4 pl-8">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Unidade de Medida *</Label>
                    <div className="grid grid-cols-5 gap-2">
                      {[
                        { value: 'un', label: 'Unidade', icon: '📦' },
                        { value: 'kg', label: 'Quilo', icon: '⚖️' },
                        { value: 'g', label: 'Grama', icon: '🔬' },
                        { value: 'L', label: 'Litro', icon: '🧴' },
                        { value: 'ml', label: 'Mililitro', icon: '💧' },
                      ].map((unit) => (
                        <button
                          key={unit.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, unit_name: unit.value })}
                          className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                            formData.unit_name === unit.value
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border hover:border-primary/50 hover:bg-muted'
                          }`}
                        >
                          <span className="text-lg mb-1">{unit.icon}</span>
                          <span className="text-xs font-medium">{unit.label}</span>
                          <span className="text-[10px] text-muted-foreground">({unit.value})</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        Estoque Atual
                        <Badge variant="secondary" className="text-[10px]">
                          {formData.unit_name}
                        </Badge>
                      </Label>
                      <Input
                        type="number"
                        value={formData.current_stock || ''}
                        onChange={(e) => setFormData({ ...formData, current_stock: parseFloat(e.target.value) || 0 })}
                        min="0"
                        step="0.01"
                        placeholder="0"
                        className="h-11 text-center text-lg font-semibold"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <AlertTriangle className="w-3 h-3 text-warning" />
                        Mínimo
                      </Label>
                      <Input
                        type="number"
                        value={formData.minimum_stock || ''}
                        onChange={(e) => setFormData({ ...formData, minimum_stock: parseFloat(e.target.value) || 0 })}
                        min="0"
                        step="0.01"
                        placeholder="0"
                        className="h-11 text-center"
                      />
                      <p className="text-[10px] text-muted-foreground text-center">Alerta quando atingir</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <TrendingUp className="w-3 h-3 text-success" />
                        Máximo
                      </Label>
                      <Input
                        type="number"
                        value={formData.maximum_stock || ''}
                        onChange={(e) => setFormData({ ...formData, maximum_stock: parseFloat(e.target.value) || 0 })}
                        min="0"
                        step="0.01"
                        placeholder="0"
                        className="h-11 text-center"
                      />
                      <p className="text-[10px] text-muted-foreground text-center">Capacidade máxima</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Seção: Custos e Fornecedor */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">3</span>
                  Custos e Fornecedor
                </div>
                
                <div className="grid gap-4 pl-8">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Custo Unitário</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">R$</span>
                        <Input
                          type="number"
                          value={formData.cost_price || ''}
                          onChange={(e) => setFormData({ ...formData, cost_price: parseFloat(e.target.value) || 0 })}
                          min="0"
                          step="0.01"
                          placeholder="0,00"
                          className="h-11 pl-10"
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground">Preço por {formData.unit_name}</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Fornecedor</Label>
                      <Input
                        value={formData.supplier}
                        onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                        placeholder="Ex: Distribuidora XYZ"
                        className="h-11"
                      />
                    </div>
                  </div>

                  {formData.current_stock > 0 && formData.cost_price > 0 && (
                    <Card className="bg-muted/50 border-dashed">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Valor total em estoque:</span>
                          <span className="text-lg font-bold text-primary">
                            {formatCurrency(formData.current_stock * formData.cost_price)}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Observações</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Informações adicionais sobre o item..."
                      rows={2}
                      className="resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-4 border-t gap-2">
              <Button variant="outline" onClick={() => setIsItemModalOpen(false)} className="flex-1 sm:flex-none">
                Cancelar
              </Button>
              <Button 
                onClick={handleSaveItem} 
                className="flex-1 sm:flex-none min-w-[140px]"
                disabled={!formData.name.trim()}
              >
                {editingItem ? (
                  <>
                    <Pencil className="w-4 h-4 mr-2" />
                    Salvar Alterações
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Item
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Movement Modal */}
        <Dialog open={isMovementModalOpen} onOpenChange={setIsMovementModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader className="pb-4 border-b">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  movementType === 'in' ? 'bg-success/10' : 
                  movementType === 'out' ? 'bg-destructive/10' : 'bg-warning/10'
                }`}>
                  {movementType === 'in' ? (
                    <ArrowDownCircle className="w-6 h-6 text-success" />
                  ) : movementType === 'out' ? (
                    <ArrowUpCircle className="w-6 h-6 text-destructive" />
                  ) : (
                    <RefreshCw className="w-6 h-6 text-warning" />
                  )}
                </div>
                <div>
                  <DialogTitle className="text-xl">
                    {movementType === 'in' && 'Entrada de Estoque'}
                    {movementType === 'out' && 'Saída de Estoque'}
                    {movementType === 'adjustment' && 'Ajuste de Estoque'}
                  </DialogTitle>
                  <DialogDescription>
                    {selectedItem?.name}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Current stock info */}
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Estoque atual:</span>
                    <span className="text-2xl font-bold">
                      {selectedItem?.current_stock} <span className="text-sm font-normal text-muted-foreground">{selectedItem?.unit_name}</span>
                    </span>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {movementType === 'adjustment' ? 'Novo Estoque' : 'Quantidade'} *
                </Label>
                <Input
                  type="number"
                  value={movementData.quantity || ''}
                  onChange={(e) => setMovementData({ ...movementData, quantity: parseFloat(e.target.value) || 0 })}
                  min="0"
                  step="0.01"
                  placeholder="0"
                  className="h-14 text-center text-2xl font-bold"
                  autoFocus
                />
                {movementType !== 'adjustment' && selectedItem && movementData.quantity > 0 && (
                  <div className={`text-center p-2 rounded-lg ${
                    movementType === 'in' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                  }`}>
                    <span className="text-sm font-medium">
                      Novo estoque: {movementType === 'in'
                        ? selectedItem.current_stock + movementData.quantity
                        : selectedItem.current_stock - movementData.quantity
                      } {selectedItem.unit_name}
                    </span>
                  </div>
                )}
              </div>

              {movementType === 'in' && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Custo Unitário</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">R$</span>
                    <Input
                      type="number"
                      value={movementData.cost_price || ''}
                      onChange={(e) => setMovementData({ ...movementData, cost_price: parseFloat(e.target.value) || 0 })}
                      min="0"
                      step="0.01"
                      placeholder="0,00"
                      className="h-11 pl-10"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-sm font-medium">Motivo</Label>
                <Select
                  value={movementData.reason}
                  onValueChange={(value) => setMovementData({ ...movementData, reason: value })}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Selecione um motivo" />
                  </SelectTrigger>
                  <SelectContent>
                    {movementType === 'in' && (
                      <>
                        <SelectItem value="purchase">🛒 Compra</SelectItem>
                        <SelectItem value="return">↩️ Devolução</SelectItem>
                        <SelectItem value="transfer">🔄 Transferência</SelectItem>
                        <SelectItem value="production">🏭 Produção</SelectItem>
                        <SelectItem value="other">📝 Outro</SelectItem>
                      </>
                    )}
                    {movementType === 'out' && (
                      <>
                        <SelectItem value="sale">💰 Venda</SelectItem>
                        <SelectItem value="waste">🗑️ Desperdício</SelectItem>
                        <SelectItem value="expired">⏰ Vencido</SelectItem>
                        <SelectItem value="transfer">🔄 Transferência</SelectItem>
                        <SelectItem value="other">📝 Outro</SelectItem>
                      </>
                    )}
                    {movementType === 'adjustment' && (
                      <>
                        <SelectItem value="inventory_count">📋 Contagem de Inventário</SelectItem>
                        <SelectItem value="correction">✏️ Correção</SelectItem>
                        <SelectItem value="system_error">⚠️ Erro de Sistema</SelectItem>
                        <SelectItem value="other">📝 Outro</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Observações</Label>
                <Textarea
                  value={movementData.notes}
                  onChange={(e) => setMovementData({ ...movementData, notes: e.target.value })}
                  placeholder="Detalhes adicionais..."
                  rows={2}
                  className="resize-none"
                />
              </div>
            </div>

            <DialogFooter className="pt-4 border-t gap-2">
              <Button variant="outline" onClick={() => setIsMovementModalOpen(false)} className="flex-1">
                Cancelar
              </Button>
              <Button 
                onClick={handleSaveMovement} 
                className={`flex-1 ${
                  movementType === 'in' ? 'bg-success hover:bg-success/90' : 
                  movementType === 'out' ? 'bg-destructive hover:bg-destructive/90' : ''
                }`}
                disabled={movementData.quantity <= 0}
              >
                Confirmar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
