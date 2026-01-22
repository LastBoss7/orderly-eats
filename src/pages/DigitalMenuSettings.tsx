import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronRight,
  ArrowLeft,
  Loader2,
  Upload,
  Save,
  Trash2,
  ImageIcon,
  Copy,
  Check,
  ExternalLink,
  Eye,
  QrCode,
  Link as LinkIcon,
  Store,
  Truck,
  ShoppingBag,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface DigitalMenuSettings {
  digital_menu_enabled: boolean;
  digital_menu_banner_url: string | null;
  digital_menu_description: string | null;
  digital_menu_delivery_enabled: boolean;
  digital_menu_pickup_enabled: boolean;
  digital_menu_min_order_value: number;
}

interface RestaurantData {
  id: string;
  name: string;
  slug: string;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
}

export default function DigitalMenuSettings() {
  const navigate = useNavigate();
  const { restaurant } = useAuth();
  const bannerInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [restaurantData, setRestaurantData] = useState<RestaurantData | null>(null);
  const [settings, setSettings] = useState<DigitalMenuSettings>({
    digital_menu_enabled: false,
    digital_menu_banner_url: null,
    digital_menu_description: null,
    digital_menu_delivery_enabled: true,
    digital_menu_pickup_enabled: true,
    digital_menu_min_order_value: 0,
  });

  const menuUrl = restaurantData?.slug 
    ? `${window.location.origin}/menu/${restaurantData.slug}` 
    : '';

  useEffect(() => {
    if (restaurant?.id) {
      fetchData();
    }
  }, [restaurant?.id]);

  const fetchData = async () => {
    if (!restaurant?.id) return;

    try {
      // Fetch restaurant data
      const { data: restData, error: restError } = await supabase
        .from('restaurants')
        .select('id, name, slug, phone, address, logo_url')
        .eq('id', restaurant.id)
        .single();

      if (restError) throw restError;
      setRestaurantData(restData);

      // Fetch salon settings
      const { data: salonData } = await supabase
        .from('salon_settings')
        .select('digital_menu_enabled, digital_menu_banner_url, digital_menu_description, digital_menu_delivery_enabled, digital_menu_pickup_enabled, digital_menu_min_order_value')
        .eq('restaurant_id', restaurant.id)
        .maybeSingle();

      if (salonData) {
        setSettings({
          digital_menu_enabled: salonData.digital_menu_enabled ?? false,
          digital_menu_banner_url: salonData.digital_menu_banner_url,
          digital_menu_description: salonData.digital_menu_description,
          digital_menu_delivery_enabled: salonData.digital_menu_delivery_enabled ?? true,
          digital_menu_pickup_enabled: salonData.digital_menu_pickup_enabled ?? true,
          digital_menu_min_order_value: salonData.digital_menu_min_order_value ?? 0,
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleBannerUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !restaurant?.id) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem válida');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5MB');
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${restaurant.id}/banner.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('restaurant-logos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('restaurant-logos')
        .getPublicUrl(fileName);

      const bannerUrlWithCache = `${publicUrl}?t=${Date.now()}`;

      setSettings(prev => ({ ...prev, digital_menu_banner_url: bannerUrlWithCache }));
      toast.success('Banner atualizado com sucesso!');
    } catch (error) {
      console.error('Error uploading banner:', error);
      toast.error('Erro ao fazer upload do banner');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveBanner = async () => {
    if (!restaurant?.id) return;

    try {
      await supabase.storage
        .from('restaurant-logos')
        .remove([`${restaurant.id}/banner.png`, `${restaurant.id}/banner.jpg`, `${restaurant.id}/banner.jpeg`, `${restaurant.id}/banner.webp`]);

      setSettings(prev => ({ ...prev, digital_menu_banner_url: null }));
      toast.success('Banner removido!');
    } catch (error) {
      console.error('Error removing banner:', error);
    }
  };

  const handleSave = async () => {
    if (!restaurant?.id) return;

    setSaving(true);

    try {
      // Check if salon_settings exists
      const { data: existingSettings } = await supabase
        .from('salon_settings')
        .select('id')
        .eq('restaurant_id', restaurant.id)
        .maybeSingle();

      if (existingSettings) {
        const { error } = await supabase
          .from('salon_settings')
          .update({
            digital_menu_enabled: settings.digital_menu_enabled,
            digital_menu_banner_url: settings.digital_menu_banner_url,
            digital_menu_description: settings.digital_menu_description,
            digital_menu_delivery_enabled: settings.digital_menu_delivery_enabled,
            digital_menu_pickup_enabled: settings.digital_menu_pickup_enabled,
            digital_menu_min_order_value: settings.digital_menu_min_order_value,
          })
          .eq('restaurant_id', restaurant.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('salon_settings')
          .insert({
            restaurant_id: restaurant.id,
            digital_menu_enabled: settings.digital_menu_enabled,
            digital_menu_banner_url: settings.digital_menu_banner_url,
            digital_menu_description: settings.digital_menu_description,
            digital_menu_delivery_enabled: settings.digital_menu_delivery_enabled,
            digital_menu_pickup_enabled: settings.digital_menu_pickup_enabled,
            digital_menu_min_order_value: settings.digital_menu_min_order_value,
          });

        if (error) throw error;
      }

      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(menuUrl);
      setCopied(true);
      toast.success('Link copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Erro ao copiar link');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
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
      <div className="p-6 max-w-5xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <span>Início</span>
          <ChevronRight className="w-4 h-4" />
          <span className="text-foreground font-medium">Cardápio Digital</span>
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
            <h1 className="text-2xl font-bold text-foreground">Cardápio Digital</h1>
            <p className="text-muted-foreground">
              Configure e compartilhe seu cardápio online
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Settings Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status Card */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Store className="w-5 h-5" />
                      Status do Cardápio
                    </CardTitle>
                    <CardDescription>
                      Ative para disponibilizar seu cardápio online
                    </CardDescription>
                  </div>
                  <Switch
                    checked={settings.digital_menu_enabled}
                    onCheckedChange={(checked) => 
                      setSettings(prev => ({ ...prev, digital_menu_enabled: checked }))
                    }
                  />
                </div>
              </CardHeader>
              {settings.digital_menu_enabled && (
                <CardContent className="border-t pt-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-success/10 text-success border-success">
                      Ativo
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Seu cardápio está disponível para clientes
                    </span>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Link Generator Card */}
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <LinkIcon className="w-5 h-5" />
                  Link do Cardápio
                </CardTitle>
                <CardDescription>
                  Compartilhe este link com seus clientes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-background border rounded-lg px-4 py-3 font-mono text-sm select-all overflow-hidden">
                    <span className="truncate block">{menuUrl || 'Carregando...'}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyLink}
                    disabled={!menuUrl}
                    className="shrink-0"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-success" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => window.open(menuUrl, '_blank')}
                    disabled={!menuUrl}
                    className="shrink-0"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <QrCode className="w-4 h-4" />
                  <span>Dica: Use o link para criar um QR Code e colocar na sua loja</span>
                </div>
              </CardContent>
            </Card>

            {/* Banner Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" />
                  Banner do Cardápio
                </CardTitle>
                <CardDescription>
                  Imagem de destaque no topo do seu cardápio (recomendado: 1200x400px)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {settings.digital_menu_banner_url ? (
                  <div className="relative">
                    <img 
                      src={settings.digital_menu_banner_url} 
                      alt="Banner" 
                      className="w-full h-40 object-cover rounded-lg border"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleRemoveBanner}
                      className="absolute top-2 right-2"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Remover
                    </Button>
                  </div>
                ) : (
                  <div 
                    onClick={() => bannerInputRef.current?.click()}
                    className="border-2 border-dashed border-muted-foreground/30 rounded-lg h-40 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/50 transition-colors"
                  >
                    <Upload className="w-8 h-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Clique para enviar um banner</span>
                    <span className="text-xs text-muted-foreground">PNG, JPG ou WebP. Máximo 5MB.</span>
                  </div>
                )}
                <input
                  ref={bannerInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleBannerUpload}
                />
                {uploading && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Enviando...</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Order Types */}
            <Card>
              <CardHeader>
                <CardTitle>Tipos de Pedido</CardTitle>
                <CardDescription>
                  Configure quais tipos de pedido estão disponíveis no cardápio digital
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Truck className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Delivery</p>
                      <p className="text-sm text-muted-foreground">Entrega no endereço do cliente</p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.digital_menu_delivery_enabled}
                    onCheckedChange={(checked) => 
                      setSettings(prev => ({ ...prev, digital_menu_delivery_enabled: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <ShoppingBag className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Retirada</p>
                      <p className="text-sm text-muted-foreground">Cliente retira no estabelecimento</p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.digital_menu_pickup_enabled}
                    onCheckedChange={(checked) => 
                      setSettings(prev => ({ ...prev, digital_menu_pickup_enabled: checked }))
                    }
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="min_order">Valor mínimo do pedido</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                    <Input
                      id="min_order"
                      type="number"
                      min="0"
                      step="0.01"
                      value={settings.digital_menu_min_order_value}
                      onChange={(e) => 
                        setSettings(prev => ({ ...prev, digital_menu_min_order_value: parseFloat(e.target.value) || 0 }))
                      }
                      className="pl-10"
                      placeholder="0,00"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Deixe 0 para não ter valor mínimo
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Restaurant Info */}
            <Card>
              <CardHeader>
                <CardTitle>Informações da Loja</CardTitle>
                <CardDescription>
                  Dados exibidos no cardápio digital (editáveis em Configurações do Estabelecimento)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome</Label>
                    <Input 
                      value={restaurantData?.name || ''} 
                      disabled 
                      className="bg-muted"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefone/WhatsApp</Label>
                    <Input 
                      value={restaurantData?.phone || 'Não configurado'} 
                      disabled 
                      className="bg-muted"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Endereço</Label>
                  <Input 
                    value={restaurantData?.address || 'Não configurado'} 
                    disabled 
                    className="bg-muted"
                  />
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/restaurant-settings')}
                  className="gap-2"
                >
                  Editar informações
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar Configurações
              </Button>
            </div>
          </div>

          {/* Preview Column */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Eye className="w-5 h-5" />
                  Preview
                </CardTitle>
                <CardDescription>
                  Visualização do cardápio
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="border rounded-lg overflow-hidden mx-4 mb-4">
                  {/* Mini Preview */}
                  <div className="bg-background">
                    {/* Banner */}
                    {settings.digital_menu_banner_url ? (
                      <img 
                        src={settings.digital_menu_banner_url} 
                        alt="Banner" 
                        className="w-full h-20 object-cover"
                      />
                    ) : (
                      <div className="w-full h-20 bg-gradient-to-r from-primary/20 to-primary/10 flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    
                    {/* Header */}
                    <div className="p-3 border-b">
                      <div className="flex items-center gap-2">
                        {restaurantData?.logo_url ? (
                          <img 
                            src={restaurantData.logo_url} 
                            alt="Logo" 
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Store className="w-4 h-4 text-primary" />
                          </div>
                        )}
                        <div>
                          <p className="text-xs font-medium truncate max-w-[120px]">
                            {restaurantData?.name || 'Seu Restaurante'}
                          </p>
                          <div className="flex gap-1">
                            {settings.digital_menu_delivery_enabled && (
                              <Badge variant="outline" className="text-[8px] px-1 py-0">
                                Delivery
                              </Badge>
                            )}
                            {settings.digital_menu_pickup_enabled && (
                              <Badge variant="outline" className="text-[8px] px-1 py-0">
                                Retirada
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Mock Products */}
                    <div className="p-3 space-y-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex gap-2 p-2 border rounded">
                          <div className="w-10 h-10 bg-muted rounded flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="h-2 w-16 bg-muted rounded mb-1" />
                            <div className="h-2 w-10 bg-muted/50 rounded" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="px-4 pb-4">
                  <Button 
                    className="w-full gap-2"
                    onClick={() => window.open(menuUrl, '_blank')}
                    disabled={!menuUrl}
                  >
                    <ExternalLink className="w-4 h-4" />
                    Ver Cardápio Completo
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
