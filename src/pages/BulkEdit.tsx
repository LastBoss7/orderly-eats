import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Edit3, 
  Search, 
  Trash2, 
  Save,
  Filter,
  MoreVertical,
  Check,
  X,
  Percent,
  DollarSign,
  Tag,
  Eye,
  EyeOff,
  ChevronDown
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

// Mock data for demonstration
const mockProducts = [
  { id: '1', name: 'Pizza Margherita', category: 'Pizzas', price: 45.90, available: true },
  { id: '2', name: 'Pizza Calabresa', category: 'Pizzas', price: 48.90, available: true },
  { id: '3', name: 'Pizza Quatro Queijos', category: 'Pizzas', price: 52.90, available: false },
  { id: '4', name: 'Hambúrguer Classic', category: 'Hambúrgueres', price: 32.90, available: true },
  { id: '5', name: 'Hambúrguer Bacon', category: 'Hambúrgueres', price: 38.90, available: true },
  { id: '6', name: 'Salada Caesar', category: 'Saladas', price: 28.90, available: true },
  { id: '7', name: 'Refrigerante 350ml', category: 'Bebidas', price: 6.90, available: true },
  { id: '8', name: 'Suco Natural', category: 'Bebidas', price: 12.90, available: false },
];

const categories = ['Todas', 'Pizzas', 'Hambúrgueres', 'Saladas', 'Bebidas'];

export default function BulkEdit() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [products, setProducts] = useState(mockProducts);
  const [editingCell, setEditingCell] = useState<{id: string, field: string} | null>(null);
  const [editValue, setEditValue] = useState('');

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Todas' || product.category === selectedCategory;
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

  const startEditing = (id: string, field: string, currentValue: string | number) => {
    setEditingCell({ id, field });
    setEditValue(String(currentValue));
  };

  const saveEdit = () => {
    if (!editingCell) return;
    
    setProducts(prev => prev.map(p => {
      if (p.id === editingCell.id) {
        return {
          ...p,
          [editingCell.field]: editingCell.field === 'price' ? parseFloat(editValue) : editValue
        };
      }
      return p;
    }));
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
        return { ...p, price: Math.round(p.price * multiplier * 100) / 100 };
      }
      return p;
    }));
  };

  const bulkToggleAvailability = (available: boolean) => {
    setProducts(prev => prev.map(p => {
      if (selectedProducts.includes(p.id)) {
        return { ...p, available };
      }
      return p;
    }));
  };

  const bulkChangeCategory = (category: string) => {
    setProducts(prev => prev.map(p => {
      if (selectedProducts.includes(p.id)) {
        return { ...p, category };
      }
      return p;
    }));
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Edição em Massa</h1>
            <p className="text-muted-foreground">Edite vários produtos de uma vez</p>
          </div>
          <Button className="gap-2" disabled={selectedProducts.length === 0}>
            <Save className="w-4 h-4" />
            Salvar Alterações
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
              <CardTitle className="text-2xl text-success">{products.filter(p => p.available).length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Indisponíveis</CardDescription>
              <CardTitle className="text-2xl text-destructive">{products.filter(p => !p.available).length}</CardTitle>
            </CardHeader>
          </Card>
        </div>

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
                    {categories.filter(c => c !== 'Todas').map(cat => (
                      <DropdownMenuItem key={cat} onClick={() => bulkChangeCategory(cat)}>
                        {cat}
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

                <Button variant="destructive" size="sm" className="gap-2 ml-auto">
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
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Products Table */}
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
                      <Badge variant="secondary">{product.category}</Badge>
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
                        variant={product.available ? 'default' : 'destructive'}
                        className={product.available ? 'bg-success hover:bg-success/80' : ''}
                      >
                        {product.available ? 'Disponível' : 'Indisponível'}
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
                          <DropdownMenuItem className="text-destructive">
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

        {/* Empty State */}
        {filteredProducts.length === 0 && (
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
      </div>
    </DashboardLayout>
  );
}
