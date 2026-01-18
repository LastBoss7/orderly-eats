import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  ChevronRight,
  ArrowLeft,
  Loader2,
  Upload,
  Building2,
  Save,
  Trash2,
  ImageIcon,
  Copy,
  Check,
  Monitor,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface RestaurantData {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  cnpj: string | null;
  logo_url: string | null;
}

export default function RestaurantSettings() {
  const navigate = useNavigate();
  const { restaurant } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [restaurantData, setRestaurantData] = useState<RestaurantData | null>(null);

  useEffect(() => {
    if (restaurant?.id) {
      fetchData();
    }
  }, [restaurant?.id]);

  const fetchData = async () => {
    if (!restaurant?.id) return;

    try {
      const { data: restData, error: restError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', restaurant.id)
        .single();

      if (restError) throw restError;
      setRestaurantData(restData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !restaurant?.id) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem válida');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 2MB');
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${restaurant.id}/logo.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('restaurant-logos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('restaurant-logos')
        .getPublicUrl(fileName);

      const logoUrlWithCache = `${publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from('restaurants')
        .update({ logo_url: logoUrlWithCache })
        .eq('id', restaurant.id);

      if (updateError) throw updateError;

      setRestaurantData(prev => prev ? { ...prev, logo_url: logoUrlWithCache } : null);
      toast.success('Logo atualizado com sucesso!');
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('Erro ao fazer upload do logo');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!restaurant?.id || !restaurantData?.logo_url) return;

    setUploading(true);

    try {
      const { error: deleteError } = await supabase.storage
        .from('restaurant-logos')
        .remove([`${restaurant.id}/logo.png`, `${restaurant.id}/logo.jpg`, `${restaurant.id}/logo.jpeg`, `${restaurant.id}/logo.webp`]);

      const { error: updateError } = await supabase
        .from('restaurants')
        .update({ logo_url: null })
        .eq('id', restaurant.id);

      if (updateError) throw updateError;

      setRestaurantData(prev => prev ? { ...prev, logo_url: null } : null);
      toast.success('Logo removido com sucesso!');
    } catch (error) {
      console.error('Error removing logo:', error);
      toast.error('Erro ao remover logo');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveRestaurant = async () => {
    if (!restaurant?.id || !restaurantData) return;

    setSaving(true);

    try {
      const { error } = await supabase
        .from('restaurants')
        .update({
          name: restaurantData.name,
          phone: restaurantData.phone,
          address: restaurantData.address,
          cnpj: restaurantData.cnpj,
        })
        .eq('id', restaurant.id);

      if (error) throw error;
      toast.success('Dados do estabelecimento salvos!');
    } catch (error) {
      console.error('Error saving restaurant:', error);
      toast.error('Erro ao salvar dados');
    } finally {
      setSaving(false);
    }
  };

  const formatCNPJ = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .slice(0, 18);
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 10) {
      return numbers
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4})(\d)/, '$1-$2');
    }
    return numbers
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .slice(0, 15);
  };

  const handleCopyId = async () => {
    if (!restaurantData?.id) return;
    try {
      await navigator.clipboard.writeText(restaurantData.id);
      setCopied(true);
      toast.success('ID copiado para a área de transferência!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Erro ao copiar ID');
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <span>Início</span>
          <ChevronRight className="w-4 h-4" />
          <span className="text-foreground font-medium">Configurações do Estabelecimento</span>
        </div>

        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Configurações do Estabelecimento</h1>
            <p className="text-muted-foreground">
              Configure os dados do seu estabelecimento
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Electron Connection Card */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Monitor className="w-5 h-5" />
                Conexão com App de Impressão
              </CardTitle>
              <CardDescription>
                Use este ID para conectar o aplicativo Electron de impressão automática
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-background border rounded-lg px-4 py-3 font-mono text-sm select-all">
                  {restaurantData?.id || 'Carregando...'}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyId}
                  disabled={!restaurantData?.id}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                No app Electron: Arquivo → Configurações → cole este ID no campo "ID do Restaurante"
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Informações Básicas
              </CardTitle>
              <CardDescription>
                Configure os dados que aparecerão nas impressões e no sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Logo Upload */}
              <div className="space-y-4">
                <Label className="text-base font-medium">Logo do Estabelecimento</Label>
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <Avatar className="w-24 h-24 border-2 border-dashed border-muted-foreground/30">
                      <AvatarImage src={restaurantData?.logo_url || undefined} />
                      <AvatarFallback className="bg-muted">
                        <ImageIcon className="w-8 h-8 text-muted-foreground" />
                      </AvatarFallback>
                    </Avatar>
                    {uploading && (
                      <div className="absolute inset-0 bg-background/80 rounded-full flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoUpload}
                    />
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      Enviar Logo
                    </Button>
                    {restaurantData?.logo_url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveLogo}
                        disabled={uploading}
                        className="gap-2 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                        Remover
                      </Button>
                    )}
                    <p className="text-xs text-muted-foreground">
                      PNG, JPG ou WebP. Máximo 2MB.
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Restaurant Data */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Estabelecimento</Label>
                  <Input
                    id="name"
                    value={restaurantData?.name || ''}
                    onChange={(e) => setRestaurantData(prev => prev ? { ...prev, name: e.target.value } : null)}
                    placeholder="Nome do seu estabelecimento"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={restaurantData?.phone || ''}
                    onChange={(e) => setRestaurantData(prev => prev ? { ...prev, phone: formatPhone(e.target.value) } : null)}
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Endereço</Label>
                  <Input
                    id="address"
                    value={restaurantData?.address || ''}
                    onChange={(e) => setRestaurantData(prev => prev ? { ...prev, address: e.target.value } : null)}
                    placeholder="Rua, número, bairro, cidade - UF"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input
                    id="cnpj"
                    value={restaurantData?.cnpj || ''}
                    onChange={(e) => setRestaurantData(prev => prev ? { ...prev, cnpj: formatCNPJ(e.target.value) } : null)}
                    placeholder="00.000.000/0000-00"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveRestaurant} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Salvar Dados
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
