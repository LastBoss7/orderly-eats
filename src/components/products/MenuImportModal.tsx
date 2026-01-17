import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Camera, Upload, Loader2, ImageIcon, Check, X, Sparkles, AlertCircle, Plus } from "lucide-react";

interface ExtractedProduct {
  name: string;
  description?: string;
  price?: number;
  category: string;
  selected?: boolean;
  has_sizes?: boolean;
  price_small?: number | null;
  price_medium?: number | null;
  price_large?: number | null;
}

interface MenuImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurantId: string;
  categories: { id: string; name: string }[];
  onSuccess: () => void;
}

export function MenuImportModal({ 
  open, 
  onOpenChange, 
  restaurantId, 
  categories,
  onSuccess 
}: MenuImportModalProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<"upload" | "review" | "importing">("upload");
  const [isExtracting, setIsExtracting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [extractedProducts, setExtractedProducts] = useState<ExtractedProduct[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [localCategories, setLocalCategories] = useState<{ id: string; name: string }[]>(categories);
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione uma imagem (JPG, PNG, etc.)",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O tamanho máximo é 10MB",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setImagePreview(base64);
      await extractMenuFromImage(base64);
    };
    reader.readAsDataURL(file);
  };

  const extractMenuFromImage = async (imageBase64: string) => {
    setIsExtracting(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("extract-menu", {
        body: { imageBase64 },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.success) {
        throw new Error(data.error || "Falha ao extrair produtos");
      }

      const products = data.products.map((p: any) => ({
        ...p,
        selected: true,
        has_sizes: p.has_sizes || false,
        price: p.has_sizes ? undefined : (typeof p.price === "string" ? parseFloat(String(p.price).replace(",", ".")) : (p.price || 0)),
        price_small: p.has_sizes ? (typeof p.price_small === "string" ? parseFloat(String(p.price_small).replace(",", ".")) : p.price_small) : null,
        price_medium: p.has_sizes ? (typeof p.price_medium === "string" ? parseFloat(String(p.price_medium).replace(",", ".")) : p.price_medium) : null,
        price_large: p.has_sizes ? (typeof p.price_large === "string" ? parseFloat(String(p.price_large).replace(",", ".")) : p.price_large) : null,
      }));

      setExtractedProducts(products);
      setStep("review");

      const sizesCount = products.filter((p: ExtractedProduct) => p.has_sizes).length;
      toast({
        title: "Cardápio analisado!",
        description: `${products.length} produtos encontrados${sizesCount > 0 ? ` (${sizesCount} com tamanhos P/M/G)` : ""}. Revise antes de importar.`,
      });
    } catch (error) {
      console.error("Error extracting menu:", error);
      toast({
        title: "Erro ao analisar cardápio",
        description: error instanceof Error ? error.message : "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setIsExtracting(false);
    }
  };

  const toggleProduct = (index: number) => {
    setExtractedProducts(prev => 
      prev.map((p, i) => i === index ? { ...p, selected: !p.selected } : p)
    );
  };

  const updateProduct = (index: number, field: keyof ExtractedProduct, value: string | number | boolean | null) => {
    setExtractedProducts(prev => 
      prev.map((p, i) => i === index ? { ...p, [field]: value } : p)
    );
  };

  const toggleSizes = (index: number) => {
    setExtractedProducts(prev => 
      prev.map((p, i) => {
        if (i !== index) return p;
        if (p.has_sizes) {
          // Converting from sizes to single price - use smallest price
          return { 
            ...p, 
            has_sizes: false, 
            price: p.price_small || p.price_medium || p.price_large || 0,
            price_small: null,
            price_medium: null,
            price_large: null,
          };
        } else {
          // Converting from single to sizes
          return { 
            ...p, 
            has_sizes: true, 
            price_small: p.price || 0,
            price_medium: null,
            price_large: null,
            price: undefined,
          };
        }
      })
    );
  };

  const selectAll = () => {
    setExtractedProducts(prev => prev.map(p => ({ ...p, selected: true })));
  };

  const deselectAll = () => {
    setExtractedProducts(prev => prev.map(p => ({ ...p, selected: false })));
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const importProducts = async () => {
    const selectedProducts = extractedProducts.filter(p => p.selected);
    
    if (selectedProducts.length === 0) {
      toast({
        title: "Nenhum produto selecionado",
        description: "Selecione pelo menos um produto para importar",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    setStep("importing");

    try {
      // Get or create categories
      const uniqueCategories = [...new Set(selectedProducts.map(p => p.category))];
      const categoryMap: Record<string, string> = {};

      for (const catName of uniqueCategories) {
        const existingCat = categories.find(c => 
          c.name.toLowerCase() === catName.toLowerCase()
        );

        if (existingCat) {
          categoryMap[catName] = existingCat.id;
        } else {
          const { data: newCat, error } = await supabase
            .from("categories")
            .insert({ name: catName, restaurant_id: restaurantId })
            .select("id")
            .single();

          if (error) {
            console.error("Error creating category:", error);
            continue;
          }
          categoryMap[catName] = newCat.id;
        }
      }

      // Insert products with size support
      const productsToInsert = selectedProducts.map(p => ({
        name: p.name,
        description: p.description || null,
        price: p.has_sizes ? (p.price_small || p.price_medium || p.price_large || 0) : (p.price || 0),
        has_sizes: p.has_sizes || false,
        price_small: p.has_sizes ? p.price_small : null,
        price_medium: p.has_sizes ? p.price_medium : null,
        price_large: p.has_sizes ? p.price_large : null,
        category_id: categoryMap[p.category] || null,
        restaurant_id: restaurantId,
        is_available: true,
      }));

      const { error: insertError } = await supabase
        .from("products")
        .insert(productsToInsert);

      if (insertError) {
        throw insertError;
      }

      const sizesCount = selectedProducts.filter(p => p.has_sizes).length;
      toast({
        title: "Produtos importados!",
        description: `${selectedProducts.length} produtos adicionados${sizesCount > 0 ? ` (${sizesCount} com tamanhos)` : ""}.`,
      });

      onSuccess();
      handleClose();
    } catch (error) {
      console.error("Error importing products:", error);
      toast({
        title: "Erro ao importar",
        description: error instanceof Error ? error.message : "Tente novamente",
        variant: "destructive",
      });
      setStep("review");
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setStep("upload");
    setImagePreview(null);
    setExtractedProducts([]);
    onOpenChange(false);
  };

  const selectedCount = extractedProducts.filter(p => p.selected).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Importar Cardápio com IA
          </DialogTitle>
          <DialogDescription>
            {step === "upload" && "Tire uma foto ou faça upload do cardápio físico"}
            {step === "review" && "Revise os produtos encontrados antes de importar"}
            {step === "importing" && "Importando produtos..."}
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            <div 
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {isExtracting ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-12 h-12 text-primary animate-spin" />
                  <p className="text-sm text-muted-foreground">
                    Analisando cardápio com IA...
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Detectando produtos e tamanhos (P/M/G)
                  </p>
                </div>
              ) : imagePreview ? (
                <div className="space-y-3">
                  <img 
                    src={imagePreview} 
                    alt="Preview do cardápio" 
                    className="max-h-48 mx-auto rounded-lg"
                  />
                  <p className="text-sm text-muted-foreground">
                    Clique para trocar a imagem
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Clique para fazer upload</p>
                    <p className="text-sm text-muted-foreground">
                      ou arraste uma imagem do cardápio
                    </p>
                  </div>
                  <div className="flex gap-2 text-xs text-muted-foreground">
                    <span className="px-2 py-1 bg-muted rounded">JPG</span>
                    <span className="px-2 py-1 bg-muted rounded">PNG</span>
                    <span className="px-2 py-1 bg-muted rounded">HEIC</span>
                  </div>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileSelect}
            />

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.removeAttribute("capture");
                    fileInputRef.current.click();
                  }
                }}
                disabled={isExtracting}
              >
                <Upload className="w-4 h-4 mr-2" />
                Fazer Upload
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.setAttribute("capture", "environment");
                    fileInputRef.current.click();
                  }
                }}
                disabled={isExtracting}
              >
                <Camera className="w-4 h-4 mr-2" />
                Tirar Foto
              </Button>
            </div>

            <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-foreground">Dicas para melhor resultado:</p>
                  <ul className="list-disc list-inside mt-1 space-y-0.5">
                    <li>Use boa iluminação</li>
                    <li>Certifique-se que os preços estejam legíveis</li>
                    <li>Produtos com tamanhos P/M/G serão detectados automaticamente</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === "review" && (
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
              <div className="text-sm text-muted-foreground">
                {selectedCount} de {extractedProducts.length} produtos selecionados
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={selectAll}>
                  Selecionar todos
                </Button>
                <Button variant="ghost" size="sm" onClick={deselectAll}>
                  Desmarcar todos
                </Button>
              </div>
            </div>

            {/* Quick category filter/add */}
            <div className="flex gap-2 items-center mb-3">
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Nova categoria..."
                className="flex-1 h-8 text-sm"
              />
              <Button
                variant="outline"
                size="sm"
                disabled={!newCategoryName.trim()}
                onClick={() => {
                  const name = newCategoryName.trim();
                  if (name && !localCategories.find(c => c.name.toLowerCase() === name.toLowerCase())) {
                    const tempId = `temp-${Date.now()}`;
                    setLocalCategories(prev => [...prev, { id: tempId, name }]);
                  }
                  setNewCategoryName("");
                }}
              >
                <Plus className="w-4 h-4 mr-1" />
                Criar
              </Button>
            </div>

            <ScrollArea className="flex-1 max-h-[300px] pr-4 mb-4">
              <div className="space-y-3">
                {extractedProducts.map((product, index) => (
                  <div 
                    key={index}
                    className={`p-3 rounded-lg border ${
                      product.selected 
                        ? "border-primary/50 bg-primary/5" 
                        : "border-muted bg-muted/30 opacity-60"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={product.selected}
                        onCheckedChange={() => toggleProduct(index)}
                        className="mt-1"
                      />
                      <div className="flex-1 space-y-2">
                        {/* Row 1: Name + Size Toggle */}
                        <div className="flex items-center gap-2">
                          <Input
                            value={product.name}
                            onChange={(e) => updateProduct(index, "name", e.target.value)}
                            placeholder="Nome do produto"
                            className="flex-1 h-8"
                          />
                          <button
                            type="button"
                            onClick={() => toggleSizes(index)}
                            className={`px-2 py-1 text-xs rounded-md font-medium transition-colors whitespace-nowrap ${
                              product.has_sizes 
                                ? "bg-primary/20 text-primary border border-primary/30" 
                                : "bg-muted text-muted-foreground border border-border hover:bg-muted/80"
                            }`}
                          >
                            {product.has_sizes ? "P/M/G" : "Único"}
                          </button>
                        </div>
                        
                        {/* Row 2: Prices */}
                        {product.has_sizes ? (
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <label className="text-xs text-muted-foreground">P</label>
                              <Input
                                type="number"
                                step="0.01"
                                value={product.price_small || ""}
                                onChange={(e) => updateProduct(index, "price_small", e.target.value ? parseFloat(e.target.value) : null)}
                                placeholder="0,00"
                                className="h-8"
                              />
                            </div>
                            <div className="flex-1">
                              <label className="text-xs text-muted-foreground">M</label>
                              <Input
                                type="number"
                                step="0.01"
                                value={product.price_medium || ""}
                                onChange={(e) => updateProduct(index, "price_medium", e.target.value ? parseFloat(e.target.value) : null)}
                                placeholder="0,00"
                                className="h-8"
                              />
                            </div>
                            <div className="flex-1">
                              <label className="text-xs text-muted-foreground">G</label>
                              <Input
                                type="number"
                                step="0.01"
                                value={product.price_large || ""}
                                onChange={(e) => updateProduct(index, "price_large", e.target.value ? parseFloat(e.target.value) : null)}
                                placeholder="0,00"
                                className="h-8"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={product.price || ""}
                              onChange={(e) => updateProduct(index, "price", parseFloat(e.target.value) || 0)}
                              placeholder="Preço"
                              className="w-28 h-8"
                            />
                            <Input
                              value={product.description || ""}
                              onChange={(e) => updateProduct(index, "description", e.target.value)}
                              placeholder="Descrição (opcional)"
                              className="flex-1 h-8 text-sm"
                            />
                          </div>
                        )}
                        
                        {/* Row 3: Description (for sizes) + Category */}
                        <div className="flex gap-2">
                          {product.has_sizes && (
                            <Input
                              value={product.description || ""}
                              onChange={(e) => updateProduct(index, "description", e.target.value)}
                              placeholder="Descrição (opcional)"
                              className="flex-1 h-8 text-sm"
                            />
                          )}
                          <Select
                            value={product.category}
                            onValueChange={(value) => updateProduct(index, "category", value)}
                          >
                            <SelectTrigger className={`h-8 text-sm ${product.has_sizes ? "w-40" : "flex-1"}`}>
                              <SelectValue placeholder="Categoria" />
                            </SelectTrigger>
                            <SelectContent>
                              {[...new Set([
                                ...localCategories.map(c => c.name),
                                ...extractedProducts.map(p => p.category).filter(Boolean)
                              ])].map((catName) => (
                                <SelectItem key={catName} value={catName}>
                                  {catName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Action buttons - always visible at bottom */}
            <div className="flex gap-2 pt-3 border-t">
              <Button
                variant="outline"
                onClick={() => setStep("upload")}
                className="flex-1"
              >
                <X className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              <Button
                onClick={importProducts}
                disabled={selectedCount === 0}
                className="flex-1"
              >
                <Check className="w-4 h-4 mr-2" />
                Importar {selectedCount} produtos
              </Button>
            </div>
          </div>
        )}

        {step === "importing" && (
          <div className="py-12 text-center">
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
            <p className="mt-4 text-muted-foreground">
              Importando {selectedCount} produtos...
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
