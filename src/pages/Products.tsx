import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Plus, Loader2, Package, Pencil, Sparkles, CirclePlus, LayoutGrid, List, AlertTriangle, Ruler, FolderOpen, ShoppingBag, DollarSign, ChevronDown, ChevronRight, Search, Filter } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { MenuImportModal } from '@/components/products/MenuImportModal';
import { ProductAddonLinker } from '@/components/products/ProductAddonLinker';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  PremiumDialog, 
  PremiumFormSection, 
  PremiumInputGroup,
  PremiumToggleRow,
  PremiumImageUpload 
} from '@/components/ui/premium-dialog';

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
  is_available: boolean;
  has_sizes: boolean | null;
  price_small: number | null;
  price_medium: number | null;
  price_large: number | null;
  image_url: string | null;
}

export default function Products() {
  const { restaurant } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [isAvailable, setIsAvailable] = useState(true);
  const [hasSizes, setHasSizes] = useState(false);
  const [priceSmall, setPriceSmall] = useState('');
  const [priceMedium, setPriceMedium] = useState('');
  const [priceLarge, setPriceLarge] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedAddonGroups, setSelectedAddonGroups] = useState<string[]>([]);
  const [productAddonCounts, setProductAddonCounts] = useState<Record<string, number>>({});
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  // Group products by category
  const productsByCategory = useMemo(() => {
    let filtered = products;
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply category filter
    if (categoryFilter !== 'all') {
      if (categoryFilter === 'uncategorized') {
        filtered = filtered.filter(p => !p.category_id);
      } else {
        filtered = filtered.filter(p => p.category_id === categoryFilter);
      }
    }
    
    // Group by category
    const grouped: Record<string, { category: Category | null; products: Product[] }> = {};
    
    filtered.forEach(product => {
      const catId = product.category_id || 'uncategorized';
      if (!grouped[catId]) {
        const category = categories.find(c => c.id === catId) || null;
        grouped[catId] = { category, products: [] };
      }
      grouped[catId].products.push(product);
    });
    
    // Sort: categories first (alphabetically), uncategorized last
    const sortedKeys = Object.keys(grouped).sort((a, b) => {
      if (a === 'uncategorized') return 1;
      if (b === 'uncategorized') return -1;
      const catA = grouped[a].category?.name || '';
      const catB = grouped[b].category?.name || '';
      return catA.localeCompare(catB);
    });
    
    return sortedKeys.map(key => ({
      id: key,
      ...grouped[key]
    }));
  }, [products, categories, searchTerm, categoryFilter]);

  const toggleCategoryCollapse = (categoryId: string) => {
    setCollapsedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const fetchData = async () => {
    if (!restaurant?.id) return;

    try {
      const [productsRes, categoriesRes] = await Promise.all([
        supabase.from('products').select('*').eq('restaurant_id', restaurant.id).order('name'),
        supabase.from('categories').select('*').eq('restaurant_id', restaurant.id).order('name'),
      ]);

      const productsData = productsRes.data || [];
      setProducts(productsData);
      setCategories(categoriesRes.data || []);
      
      const productIds = productsData.map(p => p.id);
      let addonCounts: Record<string, number> = {};
      
      if (productIds.length > 0) {
        const { data: addonLinksData } = await supabase
          .from('product_addon_groups')
          .select('product_id, addon_group_id')
          .in('product_id', productIds);
        
        (addonLinksData || []).forEach(link => {
          addonCounts[link.product_id] = (addonCounts[link.product_id] || 0) + 1;
        });
      }
      
      setProductAddonCounts(addonCounts);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [restaurant?.id]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setPrice('');
    setCategoryId('');
    setIsAvailable(true);
    setHasSizes(false);
    setPriceSmall('');
    setPriceMedium('');
    setPriceLarge('');
    setImageUrl(null);
    setEditingProduct(null);
    setSelectedAddonGroups([]);
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setName(product.name);
    setDescription(product.description || '');
    setPrice(product.price.toString());
    setCategoryId(product.category_id || '');
    setIsAvailable(product.is_available);
    setHasSizes(product.has_sizes || false);
    setPriceSmall(product.price_small?.toString() || '');
    setPriceMedium(product.price_medium?.toString() || '');
    setPriceLarge(product.price_large?.toString() || '');
    setImageUrl(product.image_url);
    setSelectedAddonGroups([]);
    setShowDialog(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      toast.error({
        title: 'Arquivo muito grande',
        description: 'O tamanho máximo é 4MB.',
      });
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error({
        title: 'Tipo inválido',
        description: 'Apenas imagens são permitidas.',
      });
      return;
    }

    setUploadingImage(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${restaurant?.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      setImageUrl(publicUrl);
      toast.success({ title: 'Imagem carregada!' });
    } catch (error: any) {
      toast.error({
        title: 'Erro ao enviar imagem',
        description: error.message,
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = () => {
    setImageUrl(null);
  };

  const handleSave = async () => {
    if (!name) {
      toast.error({
        title: 'Campo obrigatório',
        description: 'Preencha o nome do produto.',
      });
      return;
    }

    if (hasSizes) {
      if (!priceSmall && !priceMedium && !priceLarge) {
        toast.error({
          title: 'Preços obrigatórios',
          description: 'Defina pelo menos um preço de tamanho.',
        });
        return;
      }
    } else {
      if (!price) {
        toast.error({
          title: 'Campo obrigatório',
          description: 'Preencha o preço do produto.',
        });
        return;
      }
    }

    const showCategoryWarning = !categoryId;
    setSaving(true);

    try {
      const productData = {
        restaurant_id: restaurant?.id,
        name,
        description: description || null,
        price: hasSizes ? 0 : parseFloat(price),
        category_id: categoryId || null,
        is_available: isAvailable,
        has_sizes: hasSizes,
        price_small: hasSizes && priceSmall ? parseFloat(priceSmall) : null,
        price_medium: hasSizes && priceMedium ? parseFloat(priceMedium) : null,
        price_large: hasSizes && priceLarge ? parseFloat(priceLarge) : null,
        image_url: imageUrl,
      };

      let productId: string;

      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);

        if (error) throw error;
        productId = editingProduct.id;
      } else {
        const { data, error } = await supabase
          .from('products')
          .insert(productData)
          .select('id')
          .single();

        if (error) throw error;
        productId = data.id;
      }

      await supabase
        .from('product_addon_groups')
        .delete()
        .eq('product_id', productId);

      if (selectedAddonGroups.length > 0) {
        const links = selectedAddonGroups.map(groupId => ({
          product_id: productId,
          addon_group_id: groupId,
        }));

        const { error: linkError } = await supabase
          .from('product_addon_groups')
          .insert(links);

        if (linkError) throw linkError;
      }

      toast.success({ title: editingProduct ? 'Produto atualizado!' : 'Produto criado!' });
      
      if (showCategoryWarning) {
        setTimeout(() => {
          toast.warning({
            title: 'Atenção: Produto sem categoria',
            description: 'A impressão por categoria pode não funcionar corretamente para este produto.',
          });
        }, 500);
      }
      
      setShowDialog(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast.error({
        title: 'Erro ao salvar',
        description: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleAvailability = async (product: Product) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_available: !product.is_available })
        .eq('id', product.id);

      if (error) throw error;
      fetchData();
    } catch (error: any) {
      toast.error({
        title: 'Erro ao atualizar',
        description: error.message,
      });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return '-';
    const category = categories.find(c => c.id === categoryId);
    return category?.name || '-';
  };

  return (
    <DashboardLayout>
      <div className="p-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gestor de Cardápio</h1>
            <p className="text-muted-foreground">
              {products.length} produtos • {categories.length} categorias
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <ToggleGroup 
              type="single" 
              value={viewMode} 
              onValueChange={(value) => value && setViewMode(value as 'grid' | 'list')}
              className="border rounded-lg p-1 bg-muted/30"
            >
              <ToggleGroupItem 
                value="grid" 
                aria-label="Visualização em grade"
                className="data-[state=on]:bg-background data-[state=on]:shadow-sm px-3"
              >
                <LayoutGrid className="w-4 h-4" />
              </ToggleGroupItem>
              <ToggleGroupItem 
                value="list" 
                aria-label="Visualização em lista"
                className="data-[state=on]:bg-background data-[state=on]:shadow-sm px-3"
              >
                <List className="w-4 h-4" />
              </ToggleGroupItem>
            </ToggleGroup>
            
            <Button variant="outline" onClick={() => setShowImportModal(true)}>
              <Sparkles className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Importar com IA</span>
              <span className="sm:hidden">IA</span>
            </Button>
            <Button onClick={() => setShowDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Novo Produto</span>
              <span className="sm:hidden">Novo</span>
            </Button>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar produtos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-11"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-[200px] h-11">
              <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Filtrar por categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              <SelectItem value="uncategorized">⚠️ Sem categoria</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Premium Product Dialog */}
        <PremiumDialog
          open={showDialog}
          onOpenChange={(open) => {
            setShowDialog(open);
            if (!open) resetForm();
          }}
          title={editingProduct ? 'Editar Produto' : 'Novo Produto'}
          description={editingProduct 
            ? 'Atualize as informações do produto'
            : 'Adicione um novo item ao seu cardápio'
          }
          icon={<ShoppingBag className="w-6 h-6" />}
          className="sm:max-w-[560px]"
        >
          <div className="space-y-5 pt-4 max-h-[65vh] overflow-y-auto pr-1">
            {/* Image Upload */}
            <PremiumFormSection title="Foto do produto">
              <PremiumImageUpload
                imageUrl={imageUrl}
                onImageChange={setImageUrl}
                uploading={uploadingImage}
                onUpload={handleImageUpload}
                onRemove={removeImage}
              />
            </PremiumFormSection>

            {/* Basic Info */}
            <PremiumFormSection>
              <PremiumInputGroup 
                label="Nome do produto" 
                required
                hint="Ex: X-Burger, Coca-Cola 350ml"
              >
                <Input
                  placeholder="Digite o nome..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-11"
                />
              </PremiumInputGroup>

              <PremiumInputGroup label="Descrição">
                <Input
                  placeholder="Descrição breve do produto..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="h-11"
                />
              </PremiumInputGroup>
            </PremiumFormSection>

            {/* Size Variation Toggle */}
            <PremiumToggleRow
              label="Variação de tamanho"
              description="P, M, G com preços diferentes"
              icon={<Ruler className="w-5 h-5" />}
            >
              <Switch
                checked={hasSizes}
                onCheckedChange={setHasSizes}
              />
            </PremiumToggleRow>

            {/* Price Section */}
            {hasSizes ? (
              <PremiumFormSection 
                variant="highlighted"
                title="Preços por tamanho"
                description="Defina o preço para cada tamanho disponível"
              >
                <div className="grid grid-cols-3 gap-3">
                  <PremiumInputGroup label="Pequeno (P)">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">R$</span>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={priceSmall}
                        onChange={(e) => setPriceSmall(e.target.value)}
                        className="h-11 pl-9"
                      />
                    </div>
                  </PremiumInputGroup>
                  <PremiumInputGroup label="Médio (M)">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">R$</span>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={priceMedium}
                        onChange={(e) => setPriceMedium(e.target.value)}
                        className="h-11 pl-9"
                      />
                    </div>
                  </PremiumInputGroup>
                  <PremiumInputGroup label="Grande (G)">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">R$</span>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={priceLarge}
                        onChange={(e) => setPriceLarge(e.target.value)}
                        className="h-11 pl-9"
                      />
                    </div>
                  </PremiumInputGroup>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Deixe em branco os tamanhos que não deseja oferecer
                </p>
              </PremiumFormSection>
            ) : (
              <PremiumFormSection>
                <PremiumInputGroup label="Preço" required>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="h-12 pl-14 text-lg font-semibold"
                    />
                  </div>
                </PremiumInputGroup>
              </PremiumFormSection>
            )}

            {/* Category */}
            <PremiumFormSection>
              <PremiumInputGroup 
                label="Categoria" 
                hint="Organize seus produtos em categorias"
              >
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                    <FolderOpen className="w-5 h-5" />
                  </div>
                  <Select value={categoryId || "none"} onValueChange={(val) => setCategoryId(val === "none" ? "" : val)}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem categoria</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </PremiumInputGroup>
            </PremiumFormSection>

            {/* Availability */}
            <PremiumToggleRow
              label="Disponível para venda"
              description="Mostrar este produto no cardápio"
              icon={<Package className="w-5 h-5" />}
            >
              <Switch
                checked={isAvailable}
                onCheckedChange={setIsAvailable}
              />
            </PremiumToggleRow>

            {/* Addon Groups */}
            <PremiumFormSection 
              variant="highlighted"
              title="Grupos de Adicionais"
              description="Selecione os adicionais disponíveis para este produto"
            >
              <div className="flex items-start gap-2">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent flex-shrink-0 mt-1">
                  <CirclePlus className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <ProductAddonLinker
                    productId={editingProduct?.id || null}
                    restaurantId={restaurant?.id || ''}
                    selectedGroups={selectedAddonGroups}
                    onSelectionChange={setSelectedAddonGroups}
                  />
                </div>
              </div>
            </PremiumFormSection>

            {/* Save Button */}
            <Button
              className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : editingProduct ? (
                <>
                  <Pencil className="w-5 h-5 mr-2" />
                  Salvar Alterações
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5 mr-2" />
                  Criar Produto
                </>
              )}
            </Button>
          </div>
        </PremiumDialog>

        {/* Products Display */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center space-y-4">
              <div className="relative inline-flex">
                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
              </div>
              <p className="text-muted-foreground animate-pulse">Carregando produtos...</p>
            </div>
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <div className="w-20 h-20 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
              <Package className="w-10 h-10 opacity-50" />
            </div>
            <p className="text-lg font-medium">Nenhum produto cadastrado</p>
            <p className="text-sm">Clique em "Novo Produto" para começar</p>
          </div>
        ) : productsByCategory.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <div className="w-20 h-20 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
              <Search className="w-10 h-10 opacity-50" />
            </div>
            <p className="text-lg font-medium">Nenhum produto encontrado</p>
            <p className="text-sm">Tente ajustar sua busca ou filtro</p>
          </div>
        ) : (
          <div className="space-y-6">
            {productsByCategory.map((group) => (
              <Collapsible 
                key={group.id}
                open={!collapsedCategories.has(group.id)}
                onOpenChange={() => toggleCategoryCollapse(group.id)}
              >
                {/* Category Header - Compact */}
                <CollapsibleTrigger className="w-full">
                  <div className={`flex items-center justify-between p-2.5 rounded-lg border transition-all cursor-pointer hover:border-primary/30 ${
                    group.id === 'uncategorized' 
                      ? 'bg-warning/5 border-warning/20' 
                      : 'bg-card border-border hover:bg-muted/50'
                  }`}>
                    <div className="flex items-center gap-2">
                      {collapsedCategories.has(group.id) ? (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-primary" />
                      )}
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                        group.id === 'uncategorized' 
                          ? 'bg-warning/10' 
                          : 'bg-primary/10'
                      }`}>
                        {group.id === 'uncategorized' ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-warning" />
                        ) : (
                          <FolderOpen className="w-3.5 h-3.5 text-primary" />
                        )}
                      </div>
                      <div className="text-left">
                        <h3 className="font-medium text-sm">
                          {group.category?.name || 'Sem Categoria'}
                        </h3>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {group.products.length} itens
                      </span>
                      <Badge variant={group.id === 'uncategorized' ? 'outline' : 'secondary'} className="text-[10px] h-5">
                        {group.products.filter(p => p.is_available).length} disp.
                      </Badge>
                    </div>
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="mt-2 ml-3 pl-3 border-l border-primary/20">
                    {viewMode === 'grid' ? (
                      /* Grid View - Compact */
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 py-2">
                        {group.products.map((product) => (
                          <div 
                            key={product.id} 
                            className={`group relative bg-card rounded-lg border overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 ${
                              !product.is_available ? 'opacity-50' : ''
                            }`}
                          >
                            {/* Product Image - Compact */}
                            <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-muted to-muted/50">
                              {product.image_url ? (
                                <img 
                                  src={product.image_url} 
                                  alt={product.name}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Package className="w-6 h-6 text-muted-foreground/30" />
                                </div>
                              )}
                              
                              {/* Compact badges */}
                              <div className="absolute top-1 left-1 flex flex-wrap gap-0.5">
                                {product.has_sizes && (
                                  <span className="text-[10px] font-medium bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">
                                    P/M/G
                                  </span>
                                )}
                                {productAddonCounts[product.id] > 0 && (
                                  <span className="text-[10px] font-medium bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                    <CirclePlus className="w-2.5 h-2.5" />
                                    {productAddonCounts[product.id]}
                                  </span>
                                )}
                              </div>

                              {/* Availability indicator */}
                              <div className="absolute top-1 right-1">
                                <div 
                                  className={`w-2 h-2 rounded-full shadow-sm ${
                                    product.is_available 
                                      ? 'bg-success' 
                                      : 'bg-destructive'
                                  }`}
                                />
                              </div>

                              {/* Edit button overlay */}
                              <button
                                onClick={() => openEditDialog(product)}
                                className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100"
                              >
                                <Pencil className="w-4 h-4 text-white" />
                              </button>
                            </div>

                            {/* Product Info - Compact */}
                            <div className="p-2 space-y-1">
                              <h3 className="text-xs font-medium text-foreground line-clamp-1">
                                {product.name}
                              </h3>

                              <div className="flex items-center justify-between gap-1">
                                {product.has_sizes ? (
                                  <span className="text-xs font-semibold text-primary">
                                    {formatCurrency(product.price_small || product.price_medium || product.price_large || 0)}+
                                  </span>
                                ) : (
                                  <span className="text-xs font-semibold text-primary">
                                    {formatCurrency(product.price)}
                                  </span>
                                )}
                                <Switch
                                  checked={product.is_available}
                                  onCheckedChange={() => toggleAvailability(product)}
                                  className="scale-75"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      /* List View - Compact */
                      <div className="bg-card rounded-lg border overflow-hidden my-2">
                        <div className="divide-y divide-border">
                          {group.products.map((product) => (
                            <div 
                              key={product.id} 
                              className={`group flex items-center gap-2 p-2 hover:bg-muted/50 transition-colors ${
                                !product.is_available ? 'opacity-50' : ''
                              }`}
                            >
                              {/* Product Image */}
                              <div className="relative flex-shrink-0 w-10 h-10 rounded-md overflow-hidden bg-gradient-to-br from-muted to-muted/50">
                                {product.image_url ? (
                                  <img 
                                    src={product.image_url} 
                                    alt={product.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Package className="w-4 h-4 text-muted-foreground/30" />
                                  </div>
                                )}
                                <div className="absolute top-0 right-0">
                                  <div 
                                    className={`w-1.5 h-1.5 rounded-full ${
                                      product.is_available 
                                        ? 'bg-success' 
                                        : 'bg-destructive'
                                    }`}
                                  />
                                </div>
                              </div>

                              {/* Product Info */}
                              <div className="flex-1 min-w-0 flex items-center gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <h3 className="text-sm font-medium text-foreground truncate">
                                      {product.name}
                                    </h3>
                                    {product.has_sizes && (
                                      <span className="text-[10px] font-medium bg-primary/10 text-primary px-1 py-0.5 rounded">
                                        P/M/G
                                      </span>
                                    )}
                                    {productAddonCounts[product.id] > 0 && (
                                      <span className="text-[10px] font-medium bg-secondary/50 text-secondary-foreground px-1 py-0.5 rounded flex items-center gap-0.5">
                                        <CirclePlus className="w-2.5 h-2.5" />
                                        {productAddonCounts[product.id]}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Price */}
                              <div className="flex-shrink-0 text-right">
                                {product.has_sizes ? (
                                  <span className="text-sm font-semibold text-primary">
                                    {formatCurrency(product.price_small || product.price_medium || product.price_large || 0)}+
                                  </span>
                                ) : (
                                  <span className="text-sm font-semibold text-primary">
                                    {formatCurrency(product.price)}
                                  </span>
                                )}
                              </div>

                              {/* Actions */}
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <Switch
                                  checked={product.is_available}
                                  onCheckedChange={() => toggleAvailability(product)}
                                  className="scale-75"
                                />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openEditDialog(product)}
                                  className="opacity-50 hover:opacity-100 hover:bg-primary/10 hover:text-primary h-7 w-7"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        )}

        {/* Menu Import Modal */}
        <MenuImportModal
          open={showImportModal}
          onOpenChange={setShowImportModal}
          restaurantId={restaurant?.id || ''}
          categories={categories}
          onSuccess={fetchData}
        />
      </div>
    </DashboardLayout>
  );
}
