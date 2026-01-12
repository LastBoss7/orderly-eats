import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { 
  Edit3, 
  Search, 
  Trash2, 
  Save,
  MoreVertical,
  Check,
  X,
  Percent,
  DollarSign,
  Tag,
  Eye,
  EyeOff,
  ChevronDown,
  Loader2,
  Package
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category_id: string | null;
  is_available: boolean | null;
}

interface PendingChange {
  id: string;
  field: string;
  oldValue: any;
  newValue: any;
}

export default function BulkEdit() {
  const { restaurant } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingCell, setEditingCell] = useState<{id: string, field: string} | null>(null);
  const [editValue, setEditValue] = useState('');
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    if (!restaurant?.id) return;

    try {
      const [productsRes, categoriesRes] = await Promise.all([
        supabase.from('products').select('*').order('name'),
        supabase.from('categories').select('*').order('name'),
      ]);

      setProducts(productsRes.data || []);
      setCategories(categoriesRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [restaurant?.id]);

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return 'Sem categoria';
    const category = categories.find(c => c.id === categoryId);
    return category?.name || 'Sem categoria';
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category_id === selectedCategory || 
      (selectedCategory === 'none' && !product.category_id);
    return matchesSearch && matchesCategory;
  });

  const toggleProductSelection = (id: string) => {
    setSelectedProducts(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedProducts.length === filteredProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(filteredProducts.map(p => p.id));
    }
  };

  const isSelected = (id: string) => selectedProducts.includes(id);

  const addPendingChange = (id: string, field: string, oldValue: any, newValue: any) => {
    setPendingChanges(prev => {
      // Remove existing change for same id and field
      const filtered = prev.filter(c => !(c.id === id && c.field === field));
      // Don't add if value is same as original
      if (oldValue === newValue) return filtered;
      return [...filtered, { id, field, oldValue, newValue }];
    });
  };

  const startEditing = (id: string, field: string, currentValue: string | number) => {
    setEditingCell({ id, field });
    setEditValue(String(currentValue));
  };

  const saveEdit = () => {
    if (!editingCell) return;
    
    const product = products.find(p => p.id === editingCell.id);
    if (!product) return;

    const newValue = editingCell.field === 'price' ? parseFloat(editValue) : editValue;
    const oldValue = product[editingCell.field as keyof Product];

    // Update local state
    setProducts(prev => prev.map(p => {
      if (p.id === editingCell.id) {
        return { ...p, [editingCell.field]: newValue };
      }
      return p;
    }));

    // Track change
    addPendingChange(editingCell.id, editingCell.field, oldValue, newValue);

    setEditingCell(null);
    setEditValue('');
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const bulkUpdatePrice = (type: 'increase' | 'decrease', percentage: number) => {
    setProducts(prev => prev.map(p => {
      if (selectedProducts.includes(p.id)) {
        const multiplier = type === 'increase' ? 1 + percentage / 100 : 1 - percentage / 100;
        const newPrice = Math.round(p.price * multiplier * 100) / 100;
        addPendingChange(p.id, 'price', p.price, newPrice);
        return { ...p, price: newPrice };
      }
      return p;
    }));
  };

  const bulkToggleAvailability = (available: boolean) => {
    setProducts(prev => prev.map(p => {
      if (selectedProducts.includes(p.id)) {
        addPendingChange(p.id, 'is_available', p.is_available, available);
        return { ...p, is_available: available };
      }
      return p;
    }));
  };

  const bulkChangeCategory = (categoryId: string) => {
    const newCategoryId = categoryId === 'none' ? null : categoryId;
    setProducts(prev => prev.map(p => {
      if (selectedProducts.includes(p.id)) {
        addPendingChange(p.id, 'category_id', p.category_id, newCategoryId);
        return { ...p, category_id: newCategoryId };
      }
      return p;
    }));
  };

  const saveAllChanges = async () => {
    if (pendingChanges.length === 0) {
      toast({ title: 'Nenhuma alteração para salvar' });
      return;
    }

    setSaving(true);

    try {
      // Group changes by product id
      const changesByProduct: Record<string, Record<string, any>> = {};
      pendingChanges.forEach(change => {
        if (!changesByProduct[change.id]) {
          changesByProduct[change.id] = {};
        }
        changesByProduct[change.id][change.field] = change.newValue;
      });

      // Execute all updates
      const updates = Object.entries(changesByProduct).map(([id, changes]) => 
        supabase.from('products').update(changes).eq('id', id)
      );

      await Promise.all(updates);

      toast({ 
        title: 'Alterações salvas!',
        description: `${pendingChanges.length} alteração(ões) aplicada(s) com sucesso.`
      });

      setPendingChanges([]);
      setSelectedProducts([]);
      fetchData();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const bulkDelete = async () => {
    setDeleting(true);

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .in('id', selectedProducts);

      if (error) throw error;

      toast({ 
        title: 'Produtos excluídos!',
        description: `${selectedProducts.length} produto(s) excluído(s) com sucesso.`
      });

      setSelectedProducts([]);
      setShowDeleteDialog(false);
      fetchData();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: error.message,
      });
    } finally {
      setDeleting(false);
    }
  };

  const hasChanges = pendingChanges.length > 0;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Edição em Massa</h1>
            <p className="text-muted-foreground">Edite vários produtos de uma vez</p>
          </div>
          <Button 
            className="gap-2" 
            disabled={!hasChanges || saving}
            onClick={saveAllChanges}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Salvar Alterações {hasChanges && `(${pendingChanges.length})`}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total de Produtos</CardDescription>
              <CardTitle className="text-2xl">{products.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Selecionados</CardDescription>
              <CardTitle className="text-2xl text-primary">{selectedProducts.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Disponíveis</CardDescription>
              <CardTitle className="text-2xl text-success">{products.filter(p => p.is_available).length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Indisponíveis</CardDescription>
              <CardTitle className="text-2xl text-destructive">{products.filter(p => !p.is_available).length}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Pending Changes Banner */}
        {hasChanges && (
          <Card className="border-warning/50 bg-warning/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-warning-foreground">
                  Você tem {pendingChanges.length} alteração(ões) não salva(s)
                </span>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setPendingChanges([]);
                      fetchData();
                    }}
                  >
                    Descartar
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={saveAllChanges}
                    disabled={saving}
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Agora'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bulk Actions */}
        {selectedProducts.length > 0 && (
          <Card className="border-primary/50 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-medium">
                  {selectedProducts.length} produto(s) selecionado(s)
                </span>
                <div className="h-4 w-px bg-border" />
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Percent className="w-4 h-4" />
                      Alterar Preços
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => bulkUpdatePrice('increase', 5)}>
                      Aumentar 5%
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => bulkUpdatePrice('increase', 10)}>
                      Aumentar 10%
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => bulkUpdatePrice('increase', 15)}>
                      Aumentar 15%
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => bulkUpdatePrice('decrease', 5)}>
                      Diminuir 5%
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => bulkUpdatePrice('decrease', 10)}>
                      Diminuir 10%
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => bulkUpdatePrice('decrease', 15)}>
                      Diminuir 15%
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Tag className="w-4 h-4" />
                      Alterar Categoria
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => bulkChangeCategory('none')}>
                      Sem categoria
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {categories.map(cat => (
                      <DropdownMenuItem key={cat.id} onClick={() => bulkChangeCategory(cat.id)}>
                        {cat.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-2"
                  onClick={() => bulkToggleAvailability(true)}
                >
                  <Eye className="w-4 h-4" />
                  Tornar Disponível
                </Button>

                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-2"
                  onClick={() => bulkToggleAvailability(false)}
                >
                  <EyeOff className="w-4 h-4" />
                  Tornar Indisponível
                </Button>

                <Button 
                  variant="destructive" 
                  size="sm" 
                  className="gap-2 ml-auto"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="w-4 h-4" />
                  Excluir
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar produtos..." 
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="none">Sem categoria</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Products Table */}
        {products.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg">Nenhum produto cadastrado</h3>
              <p className="text-muted-foreground text-center mt-1">
                Adicione produtos na página de Gestor de Cardápio
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox 
                        checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Preço</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow 
                      key={product.id}
                      className={isSelected(product.id) ? 'bg-primary/5' : ''}
                    >
                      <TableCell>
                        <Checkbox 
                          checked={isSelected(product.id)}
                          onCheckedChange={() => toggleProductSelection(product.id)}
                        />
                      </TableCell>
                      <TableCell>
                        {editingCell?.id === product.id && editingCell?.field === 'name' ? (
                          <div className="flex items-center gap-2">
                            <Input 
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="h-8"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEdit();
                                if (e.key === 'Escape') cancelEdit();
                              }}
                            />
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={saveEdit}>
                              <Check className="w-4 h-4 text-success" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={cancelEdit}>
                              <X className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        ) : (
                          <span 
                            className="cursor-pointer hover:text-primary"
                            onClick={() => startEditing(product.id, 'name', product.name)}
                          >
                            {product.name}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{getCategoryName(product.category_id)}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {editingCell?.id === product.id && editingCell?.field === 'price' ? (
                          <div className="flex items-center justify-end gap-2">
                            <Input 
                              type="number"
                              step="0.01"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="h-8 w-24 text-right"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEdit();
                                if (e.key === 'Escape') cancelEdit();
                              }}
                            />
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={saveEdit}>
                              <Check className="w-4 h-4 text-success" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={cancelEdit}>
                              <X className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        ) : (
                          <span 
                            className="cursor-pointer hover:text-primary font-medium"
                            onClick={() => startEditing(product.id, 'price', product.price)}
                          >
                            R$ {product.price.toFixed(2)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          variant={product.is_available ? 'default' : 'destructive'}
                          className={product.is_available ? 'bg-success hover:bg-success/80' : ''}
                        >
                          {product.is_available ? 'Disponível' : 'Indisponível'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => startEditing(product.id, 'name', product.name)}>
                              <Edit3 className="w-4 h-4 mr-2" />
                              Editar Nome
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => startEditing(product.id, 'price', product.price)}>
                              <DollarSign className="w-4 h-4 mr-2" />
                              Editar Preço
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => {
                                setSelectedProducts([product.id]);
                                setShowDeleteDialog(true);
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Empty State for filtered */}
        {products.length > 0 && filteredProducts.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Edit3 className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg">Nenhum produto encontrado</h3>
              <p className="text-muted-foreground text-center mt-1">
                Tente ajustar seus filtros de busca
              </p>
            </CardContent>
          </Card>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Você tem certeza que deseja excluir {selectedProducts.length} produto(s)? 
                Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={bulkDelete}
                disabled={deleting}
                className="bg-destructive hover:bg-destructive/90"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Excluir'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
