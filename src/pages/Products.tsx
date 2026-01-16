import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Plus, Loader2, Package, Pencil, ImagePlus, X, Image } from 'lucide-react';

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
    setShowDialog(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (4MB limit)
    if (file.size > 4 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'Arquivo muito grande',
        description: 'O tamanho máximo é 4MB.',
      });
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast({
        variant: 'destructive',
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
      toast({ title: 'Imagem carregada!' });
    } catch (error: any) {
      toast({
        variant: 'destructive',
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
      toast({
        variant: 'destructive',
        title: 'Campo obrigatório',
        description: 'Preencha o nome do produto.',
      });
      return;
    }

    // Validate prices based on hasSizes
    if (hasSizes) {
      if (!priceSmall && !priceMedium && !priceLarge) {
        toast({
          variant: 'destructive',
          title: 'Preços obrigatórios',
          description: 'Defina pelo menos um preço de tamanho.',
        });
        return;
      }
    } else {
      if (!price) {
        toast({
          variant: 'destructive',
          title: 'Campo obrigatório',
          description: 'Preencha o preço do produto.',
        });
        return;
      }
    }

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

      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);

        if (error) throw error;
        toast({ title: 'Produto atualizado!' });
      } else {
        const { error } = await supabase.from('products').insert(productData);
        if (error) throw error;
        toast({ title: 'Produto criado!' });
      }

      setShowDialog(false);
      resetForm();
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

  const toggleAvailability = async (product: Product) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_available: !product.is_available })
        .eq('id', product.id);

      if (error) throw error;
      fetchData();
    } catch (error: any) {
      toast({
        variant: 'destructive',
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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Produtos</h1>
            <p className="text-muted-foreground">
              Gerencie o cardápio do restaurante
            </p>
          </div>
          <Dialog
            open={showDialog}
            onOpenChange={(open) => {
              setShowDialog(open);
              if (!open) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Novo Produto
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingProduct ? 'Editar Produto' : 'Novo Produto'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4 max-h-[70vh] overflow-y-auto">
                {/* Image Upload */}
                <div className="space-y-2">
                  <Label>Foto do Produto</Label>
                  <div className="flex items-start gap-4">
                    {imageUrl ? (
                      <div className="relative">
                        <img 
                          src={imageUrl} 
                          alt="Produto" 
                          className="w-24 h-24 object-cover rounded-lg border"
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute -top-2 -right-2 h-6 w-6"
                          onClick={removeImage}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="w-24 h-24 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center bg-muted/50">
                        <Image className="w-8 h-8 text-muted-foreground/50" />
                      </div>
                    )}
                    <div className="flex-1">
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageUpload}
                          disabled={uploadingImage}
                        />
                        <div className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-muted transition-colors">
                          {uploadingImage ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <ImagePlus className="w-4 h-4" />
                          )}
                          <span className="text-sm">
                            {uploadingImage ? 'Enviando...' : 'Enviar foto'}
                          </span>
                        </div>
                      </label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Máximo 4MB. JPG, PNG ou WebP.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Nome *</Label>
                  <Input
                    placeholder="Ex: X-Burger"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Input
                    placeholder="Descrição do produto"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                {/* Size Variation Toggle */}
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <Label className="font-medium">Variação de tamanho</Label>
                    <p className="text-xs text-muted-foreground">
                      P, M, G com preços diferentes
                    </p>
                  </div>
                  <Switch
                    checked={hasSizes}
                    onCheckedChange={setHasSizes}
                  />
                </div>

                {/* Price Section */}
                {hasSizes ? (
                  <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
                    <Label className="font-medium">Preços por tamanho</Label>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Pequeno (P)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={priceSmall}
                          onChange={(e) => setPriceSmall(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Médio (M)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={priceMedium}
                          onChange={(e) => setPriceMedium(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Grande (G)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={priceLarge}
                          onChange={(e) => setPriceLarge(e.target.value)}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Deixe em branco os tamanhos que não deseja oferecer
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Preço *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select value={categoryId || "none"} onValueChange={(val) => setCategoryId(val === "none" ? "" : val)}>
                    <SelectTrigger>
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
                <div className="flex items-center justify-between">
                  <Label>Disponível para venda</Label>
                  <Switch
                    checked={isAvailable}
                    onCheckedChange={setIsAvailable}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : editingProduct ? (
                    'Salvar Alterações'
                  ) : (
                    'Criar Produto'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Products Table */}
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
            <Package className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-lg">Nenhum produto cadastrado</p>
            <p className="text-sm">Clique em "Novo Produto" para começar</p>
          </div>
        ) : (
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Foto</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Disponível</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      {product.image_url ? (
                        <img 
                          src={product.image_url} 
                          alt={product.name}
                          className="w-12 h-12 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                          <Package className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {product.name}
                        {product.has_sizes && (
                          <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                            P/M/G
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getCategoryName(product.category_id)}</TableCell>
                    <TableCell>
                      {product.has_sizes ? (
                        <div className="text-xs space-y-0.5">
                          {product.price_small != null && (
                            <div>P: {formatCurrency(product.price_small)}</div>
                          )}
                          {product.price_medium != null && (
                            <div>M: {formatCurrency(product.price_medium)}</div>
                          )}
                          {product.price_large != null && (
                            <div>G: {formatCurrency(product.price_large)}</div>
                          )}
                        </div>
                      ) : (
                        formatCurrency(product.price)
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={product.is_available}
                        onCheckedChange={() => toggleAvailability(product)}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(product)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
