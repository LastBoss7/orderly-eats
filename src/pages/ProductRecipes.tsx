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
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Plus,
  Search,
  ChefHat,
  Trash2,
  Package,
  FileText,
  AlertCircle,
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  has_sizes: boolean | null;
  price: number;
  price_small: number | null;
  price_medium: number | null;
  price_large: number | null;
  category_id: string | null;
  categories?: { name: string } | null;
}

interface InventoryItem {
  id: string;
  name: string;
  unit_name: string;
  current_stock: number;
  cost_price: number | null;
}

interface ProductRecipe {
  id: string;
  product_id: string;
  inventory_item_id: string;
  product_size: string | null;
  quantity: number;
  inventory_items?: InventoryItem;
}

interface GroupedRecipes {
  [productId: string]: {
    product: Product;
    recipes: {
      [size: string]: ProductRecipe[];
    };
  };
}

export default function ProductRecipes() {
  const { restaurant } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [recipes, setRecipes] = useState<ProductRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  
  // Form states
  const [selectedIngredient, setSelectedIngredient] = useState('');
  const [ingredientQuantity, setIngredientQuantity] = useState(0);

  useEffect(() => {
    if (!restaurant?.id) return;
    fetchData();
  }, [restaurant?.id]);

  const fetchData = async () => {
    if (!restaurant?.id) return;
    setLoading(true);

    try {
      // Fetch products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*, categories(name)')
        .eq('restaurant_id', restaurant.id)
        .eq('is_available', true)
        .order('name');

      if (productsError) throw productsError;
      setProducts(productsData || []);

      // Fetch inventory items
      const { data: itemsData, error: itemsError } = await supabase
        .from('inventory_items')
        .select('id, name, unit_name, current_stock, cost_price')
        .eq('restaurant_id', restaurant.id)
        .eq('is_active', true)
        .order('name');

      if (itemsError) throw itemsError;
      setInventoryItems(itemsData || []);

      // Fetch recipes
      const { data: recipesData, error: recipesError } = await supabase
        .from('product_recipes')
        .select('*, inventory_items(id, name, unit_name, current_stock, cost_price)')
        .eq('restaurant_id', restaurant.id);

      if (recipesError) throw recipesError;
      setRecipes(recipesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleAddIngredient = async () => {
    if (!restaurant?.id || !selectedProduct || !selectedIngredient || ingredientQuantity <= 0) {
      toast.error('Preencha todos os campos');
      return;
    }

    try {
      // Check if this ingredient already exists for this product/size
      const existingRecipe = recipes.find(
        r => r.product_id === selectedProduct.id &&
          r.inventory_item_id === selectedIngredient &&
          r.product_size === selectedSize
      );

      if (existingRecipe) {
        // Update existing
        const { error } = await supabase
          .from('product_recipes')
          .update({ quantity: ingredientQuantity })
          .eq('id', existingRecipe.id);

        if (error) throw error;
        toast.success('Ingrediente atualizado!');
      } else {
        // Insert new
        const { error } = await supabase
          .from('product_recipes')
          .insert({
            restaurant_id: restaurant.id,
            product_id: selectedProduct.id,
            inventory_item_id: selectedIngredient,
            product_size: selectedSize,
            quantity: ingredientQuantity,
          });

        if (error) throw error;
        toast.success('Ingrediente adicionado!');
      }

      setSelectedIngredient('');
      setIngredientQuantity(0);
      fetchData();
    } catch (error) {
      console.error('Error adding ingredient:', error);
      toast.error('Erro ao adicionar ingrediente');
    }
  };

  const handleRemoveIngredient = async (recipeId: string) => {
    try {
      const { error } = await supabase
        .from('product_recipes')
        .delete()
        .eq('id', recipeId);

      if (error) throw error;
      toast.success('Ingrediente removido!');
      fetchData();
    } catch (error) {
      console.error('Error removing ingredient:', error);
      toast.error('Erro ao remover ingrediente');
    }
  };

  const openRecipeModal = (product: Product, size: string | null = null) => {
    setSelectedProduct(product);
    setSelectedSize(size);
    setSelectedIngredient('');
    setIngredientQuantity(0);
    setIsModalOpen(true);
  };

  // Group recipes by product
  const groupedRecipes: GroupedRecipes = {};
  recipes.forEach(recipe => {
    const product = products.find(p => p.id === recipe.product_id);
    if (!product) return;

    if (!groupedRecipes[recipe.product_id]) {
      groupedRecipes[recipe.product_id] = {
        product,
        recipes: {},
      };
    }

    const sizeKey = recipe.product_size || 'default';
    if (!groupedRecipes[recipe.product_id].recipes[sizeKey]) {
      groupedRecipes[recipe.product_id].recipes[sizeKey] = [];
    }
    groupedRecipes[recipe.product_id].recipes[sizeKey].push(recipe);
  });

  // Filter products
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Products without recipes
  const productsWithoutRecipes = filteredProducts.filter(
    p => !groupedRecipes[p.id]
  );

  // Products with recipes
  const productsWithRecipes = filteredProducts.filter(
    p => groupedRecipes[p.id]
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getSizeLabel = (size: string | null) => {
    switch (size) {
      case 'small': return 'Pequeno';
      case 'medium': return 'Médio';
      case 'large': return 'Grande';
      default: return 'Padrão';
    }
  };

  const calculateRecipeCost = (productRecipes: ProductRecipe[]) => {
    return productRecipes.reduce((total, recipe) => {
      const cost = recipe.inventory_items?.cost_price || 0;
      return total + (cost * recipe.quantity);
    }, 0);
  };

  // Get current product recipes in modal
  const currentRecipes = selectedProduct
    ? recipes.filter(r => r.product_id === selectedProduct.id && r.product_size === selectedSize)
    : [];

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Ficha Técnica</h1>
            <p className="text-muted-foreground">
              Defina a composição de ingredientes de cada produto
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar produtos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Package className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Produtos</p>
                  <p className="text-2xl font-bold">{products.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Com Ficha Técnica</p>
                  <p className="text-2xl font-bold">{Object.keys(groupedRecipes).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Sem Ficha Técnica</p>
                  <p className="text-2xl font-bold">{productsWithoutRecipes.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <div className="text-center py-12">Carregando...</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Products with recipes */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ChefHat className="w-5 h-5" />
                  Produtos com Ficha Técnica
                </CardTitle>
                <CardDescription>
                  Clique para editar os ingredientes
                </CardDescription>
              </CardHeader>
              <CardContent>
                {productsWithRecipes.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum produto com ficha técnica ainda
                  </p>
                ) : (
                  <Accordion type="multiple" className="space-y-2">
                    {productsWithRecipes.map(product => {
                      const productRecipes = groupedRecipes[product.id];
                      if (!productRecipes) return null;

                      return (
                        <AccordionItem key={product.id} value={product.id} className="border rounded-lg px-4">
                          <AccordionTrigger className="hover:no-underline">
                            <div className="flex items-center gap-3 flex-1">
                              <span className="font-medium">{product.name}</span>
                              {product.categories?.name && (
                                <Badge variant="secondary" className="text-xs">
                                  {product.categories.name}
                                </Badge>
                              )}
                              {product.has_sizes && (
                                <Badge variant="outline" className="text-xs">
                                  Tamanhos
                                </Badge>
                              )}
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pt-4">
                            {product.has_sizes ? (
                              <div className="space-y-4">
                                {['small', 'medium', 'large'].map(size => {
                                  const sizeRecipes = productRecipes.recipes[size] || [];
                                  const cost = calculateRecipeCost(sizeRecipes);
                                  const price = size === 'small' ? product.price_small :
                                    size === 'medium' ? product.price_medium :
                                      product.price_large;

                                  return (
                                    <div key={size} className="border rounded-lg p-3">
                                      <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium">{getSizeLabel(size)}</span>
                                          {price && (
                                            <span className="text-sm text-muted-foreground">
                                              (Venda: {formatCurrency(price)})
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-sm">
                                            Custo: <span className="font-semibold">{formatCurrency(cost)}</span>
                                          </span>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => openRecipeModal(product, size)}
                                          >
                                            <Plus className="w-4 h-4 mr-1" />
                                            Adicionar
                                          </Button>
                                        </div>
                                      </div>
                                      {sizeRecipes.length > 0 ? (
                                        <Table>
                                          <TableBody>
                                            {sizeRecipes.map(recipe => (
                                              <TableRow key={recipe.id}>
                                                <TableCell className="py-2">
                                                  {recipe.inventory_items?.name}
                                                </TableCell>
                                                <TableCell className="py-2 text-right">
                                                  {recipe.quantity} {recipe.inventory_items?.unit_name}
                                                </TableCell>
                                                <TableCell className="py-2 text-right text-muted-foreground">
                                                  {formatCurrency((recipe.inventory_items?.cost_price || 0) * recipe.quantity)}
                                                </TableCell>
                                                <TableCell className="py-2 w-10">
                                                  <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-7 w-7 text-destructive"
                                                    onClick={() => handleRemoveIngredient(recipe.id)}
                                                  >
                                                    <Trash2 className="w-4 h-4" />
                                                  </Button>
                                                </TableCell>
                                              </TableRow>
                                            ))}
                                          </TableBody>
                                        </Table>
                                      ) : (
                                        <p className="text-sm text-muted-foreground">
                                          Nenhum ingrediente cadastrado
                                        </p>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm">
                                    Custo: <span className="font-semibold">
                                      {formatCurrency(calculateRecipeCost(productRecipes.recipes['default'] || []))}
                                    </span>
                                    {' '}| Venda: {formatCurrency(product.price)}
                                  </span>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openRecipeModal(product, null)}
                                  >
                                    <Plus className="w-4 h-4 mr-1" />
                                    Adicionar
                                  </Button>
                                </div>
                                {(productRecipes.recipes['default'] || []).length > 0 ? (
                                  <Table>
                                    <TableBody>
                                      {(productRecipes.recipes['default'] || []).map(recipe => (
                                        <TableRow key={recipe.id}>
                                          <TableCell className="py-2">
                                            {recipe.inventory_items?.name}
                                          </TableCell>
                                          <TableCell className="py-2 text-right">
                                            {recipe.quantity} {recipe.inventory_items?.unit_name}
                                          </TableCell>
                                          <TableCell className="py-2 text-right text-muted-foreground">
                                            {formatCurrency((recipe.inventory_items?.cost_price || 0) * recipe.quantity)}
                                          </TableCell>
                                          <TableCell className="py-2 w-10">
                                            <Button
                                              size="icon"
                                              variant="ghost"
                                              className="h-7 w-7 text-destructive"
                                              onClick={() => handleRemoveIngredient(recipe.id)}
                                            >
                                              <Trash2 className="w-4 h-4" />
                                            </Button>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                ) : (
                                  <p className="text-sm text-muted-foreground">
                                    Nenhum ingrediente cadastrado
                                  </p>
                                )}
                              </div>
                            )}
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                )}
              </CardContent>
            </Card>

            {/* Products without recipes */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-warning">
                  <AlertCircle className="w-5 h-5" />
                  Produtos sem Ficha Técnica
                </CardTitle>
                <CardDescription>
                  Adicione ingredientes para controlar o estoque automaticamente
                </CardDescription>
              </CardHeader>
              <CardContent>
                {productsWithoutRecipes.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Todos os produtos têm ficha técnica! 🎉
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {productsWithoutRecipes.map(product => (
                      <Card
                        key={product.id}
                        className="cursor-pointer hover:border-primary transition-colors"
                        onClick={() => openRecipeModal(product, product.has_sizes ? 'medium' : null)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{product.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {formatCurrency(product.price)}
                              </p>
                            </div>
                            <Plus className="w-5 h-5 text-muted-foreground" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Add Ingredient Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                Adicionar Ingrediente
              </DialogTitle>
              <DialogDescription>
                {selectedProduct?.name}
                {selectedSize && ` - ${getSizeLabel(selectedSize)}`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Current ingredients */}
              {currentRecipes.length > 0 && (
                <div className="space-y-2">
                  <Label>Ingredientes atuais</Label>
                  <div className="border rounded-lg p-3 space-y-2 bg-muted/50">
                    {currentRecipes.map(recipe => (
                      <div key={recipe.id} className="flex items-center justify-between text-sm">
                        <span>{recipe.inventory_items?.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">
                            {recipe.quantity} {recipe.inventory_items?.unit_name}
                          </span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-destructive"
                            onClick={() => handleRemoveIngredient(recipe.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add new ingredient */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Ingrediente</Label>
                  <Select value={selectedIngredient} onValueChange={setSelectedIngredient}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um ingrediente" />
                    </SelectTrigger>
                    <SelectContent>
                      <ScrollArea className="h-[200px]">
                        {inventoryItems.map(item => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name} ({item.unit_name}) - Estoque: {item.current_stock}
                          </SelectItem>
                        ))}
                      </ScrollArea>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>
                    Quantidade
                    {selectedIngredient && (
                      <span className="text-muted-foreground ml-1">
                        ({inventoryItems.find(i => i.id === selectedIngredient)?.unit_name})
                      </span>
                    )}
                  </Label>
                  <Input
                    type="number"
                    value={ingredientQuantity}
                    onChange={(e) => setIngredientQuantity(parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.001"
                    placeholder="Ex: 0.150 (para 150g)"
                  />
                </div>

                <Button
                  onClick={handleAddIngredient}
                  disabled={!selectedIngredient || ingredientQuantity <= 0}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Ingrediente
                </Button>
              </div>

              {inventoryItems.length === 0 && (
                <p className="text-center text-muted-foreground text-sm py-4">
                  Nenhum item de estoque cadastrado.
                  <br />
                  Cadastre itens no <a href="/inventory" className="text-primary underline">Controle de Estoque</a> primeiro.
                </p>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
