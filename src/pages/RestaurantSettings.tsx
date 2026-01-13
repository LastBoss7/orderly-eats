import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  ChevronRight,
  ArrowLeft,
  Loader2,
  Upload,
  Building2,
  Printer,
  Save,
  Trash2,
  ImageIcon,
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

interface PrintSettings {
  receipt_header: string | null;
  receipt_footer: string | null;
  show_address_on_receipt: boolean;
  show_phone_on_receipt: boolean;
  show_cnpj_on_receipt: boolean;
}

export default function RestaurantSettings() {
  const navigate = useNavigate();
  const { restaurant } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [restaurantData, setRestaurantData] = useState<RestaurantData | null>(null);
  const [printSettings, setPrintSettings] = useState<PrintSettings>({
    receipt_header: '',
    receipt_footer: '',
    show_address_on_receipt: true,
    show_phone_on_receipt: true,
    show_cnpj_on_receipt: true,
  });

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
        .select('*')
        .eq('id', restaurant.id)
        .single();

      if (restError) throw restError;
      setRestaurantData(restData);

      // Fetch salon settings for print config
      const { data: salonData, error: salonError } = await supabase
        .from('salon_settings')
        .select('receipt_header, receipt_footer, show_address_on_receipt, show_phone_on_receipt, show_cnpj_on_receipt')
        .eq('restaurant_id', restaurant.id)
        .maybeSingle();

      if (salonError) throw salonError;
      
      if (salonData) {
        setPrintSettings({
          receipt_header: salonData.receipt_header || '',
          receipt_footer: salonData.receipt_footer || '',
          show_address_on_receipt: salonData.show_address_on_receipt ?? true,
          show_phone_on_receipt: salonData.show_phone_on_receipt ?? true,
          show_cnpj_on_receipt: salonData.show_cnpj_on_receipt ?? true,
        });
      }
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

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem válida');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 2MB');
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${restaurant.id}/logo.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('restaurant-logos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('restaurant-logos')
        .getPublicUrl(fileName);

      // Add cache busting parameter
      const logoUrlWithCache = `${publicUrl}?t=${Date.now()}`;

      // Update restaurant record
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
      // Remove from storage
      const { error: deleteError } = await supabase.storage
        .from('restaurant-logos')
        .remove([`${restaurant.id}/logo.png`, `${restaurant.id}/logo.jpg`, `${restaurant.id}/logo.jpeg`, `${restaurant.id}/logo.webp`]);

      // Update restaurant record
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

  const handleSavePrintSettings = async () => {
    if (!restaurant?.id) return;

    setSaving(true);

    try {
      // Check if salon_settings exists
      const { data: existing } = await supabase
        .from('salon_settings')
        .select('id')
        .eq('restaurant_id', restaurant.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('salon_settings')
          .update({
            receipt_header: printSettings.receipt_header,
            receipt_footer: printSettings.receipt_footer,
            show_address_on_receipt: printSettings.show_address_on_receipt,
            show_phone_on_receipt: printSettings.show_phone_on_receipt,
            show_cnpj_on_receipt: printSettings.show_cnpj_on_receipt,
          })
          .eq('restaurant_id', restaurant.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('salon_settings')
          .insert({
            restaurant_id: restaurant.id,
            receipt_header: printSettings.receipt_header,
            receipt_footer: printSettings.receipt_footer,
            show_address_on_receipt: printSettings.show_address_on_receipt,
            show_phone_on_receipt: printSettings.show_phone_on_receipt,
            show_cnpj_on_receipt: printSettings.show_cnpj_on_receipt,
          });

        if (error) throw error;
      }

      toast.success('Configurações de impressão salvas!');
    } catch (error) {
      console.error('Error saving print settings:', error);
      toast.error('Erro ao salvar configurações');
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
              Configure os dados do seu estabelecimento e personalize suas impressões
            </p>
          </div>
        </div>

        <Tabs defaultValue="dados" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="dados" className="gap-2">
              <Building2 className="w-4 h-4" />
              Dados do Estabelecimento
            </TabsTrigger>
            <TabsTrigger value="impressao" className="gap-2">
              <Printer className="w-4 h-4" />
              Configurações de Impressão
            </TabsTrigger>
          </TabsList>

          {/* Dados do Estabelecimento */}
          <TabsContent value="dados">
            <Card>
              <CardHeader>
                <CardTitle>Informações Básicas</CardTitle>
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
          </TabsContent>

          {/* Configurações de Impressão */}
          <TabsContent value="impressao">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Configurações */}
              <Card>
                <CardHeader>
                  <CardTitle>Personalização das Impressões</CardTitle>
                  <CardDescription>
                    Configure o que aparece nas comandas e cupons impressos
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Header personalizado */}
                  <div className="space-y-2">
                    <Label htmlFor="header">Cabeçalho Personalizado</Label>
                    <Textarea
                      id="header"
                      value={printSettings.receipt_header || ''}
                      onChange={(e) => setPrintSettings(prev => ({ ...prev, receipt_header: e.target.value }))}
                      placeholder="Texto que aparece no topo da impressão (ex: Bem-vindo ao nosso estabelecimento!)"
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground">
                      Este texto aparecerá no início de todas as impressões
                    </p>
                  </div>

                  {/* Footer personalizado */}
                  <div className="space-y-2">
                    <Label htmlFor="footer">Rodapé Personalizado</Label>
                    <Textarea
                      id="footer"
                      value={printSettings.receipt_footer || ''}
                      onChange={(e) => setPrintSettings(prev => ({ ...prev, receipt_footer: e.target.value }))}
                      placeholder="Texto que aparece no final da impressão (ex: Obrigado pela preferência! Volte sempre!)"
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground">
                      Este texto aparecerá no final de todas as impressões
                    </p>
                  </div>

                  <Separator />

                  {/* Switches para mostrar/ocultar informações */}
                  <div className="space-y-4">
                    <Label className="text-base font-medium">Informações a exibir nas impressões</Label>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Mostrar Endereço</Label>
                          <p className="text-sm text-muted-foreground">
                            Exibir o endereço do estabelecimento
                          </p>
                        </div>
                        <Switch
                          checked={printSettings.show_address_on_receipt}
                          onCheckedChange={(checked) => setPrintSettings(prev => ({ ...prev, show_address_on_receipt: checked }))}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Mostrar Telefone</Label>
                          <p className="text-sm text-muted-foreground">
                            Exibir o telefone do estabelecimento
                          </p>
                        </div>
                        <Switch
                          checked={printSettings.show_phone_on_receipt}
                          onCheckedChange={(checked) => setPrintSettings(prev => ({ ...prev, show_phone_on_receipt: checked }))}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Mostrar CNPJ</Label>
                          <p className="text-sm text-muted-foreground">
                            Exibir o CNPJ do estabelecimento
                          </p>
                        </div>
                        <Switch
                          checked={printSettings.show_cnpj_on_receipt}
                          onCheckedChange={(checked) => setPrintSettings(prev => ({ ...prev, show_cnpj_on_receipt: checked }))}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={handleSavePrintSettings} disabled={saving} className="gap-2">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Salvar Configurações
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Preview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Printer className="w-5 h-5" />
                    Preview da Impressão
                  </CardTitle>
                  <CardDescription>
                    Visualize como ficará a impressão com as configurações atuais
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-white border-2 border-dashed rounded-lg p-4 font-mono text-xs text-black max-w-[300px] mx-auto shadow-inner">
                    {/* Receipt Paper Effect */}
                    <div className="space-y-2">
                      {/* Logo placeholder */}
                      {restaurantData?.logo_url && (
                        <div className="flex justify-center pb-2">
                          <img 
                            src={restaurantData.logo_url} 
                            alt="Logo" 
                            className="w-16 h-16 object-contain"
                          />
                        </div>
                      )}

                      {/* Restaurant Name */}
                      <div className="text-center font-bold text-sm border-b border-dashed pb-2">
                        {restaurantData?.name || 'Nome do Estabelecimento'}
                      </div>

                      {/* Custom Header */}
                      {printSettings.receipt_header && (
                        <div className="text-center text-[10px] italic border-b border-dashed pb-2 whitespace-pre-wrap">
                          {printSettings.receipt_header}
                        </div>
                      )}

                      {/* Address, Phone, CNPJ */}
                      <div className="text-center text-[10px] space-y-0.5 border-b border-dashed pb-2">
                        {printSettings.show_address_on_receipt && (
                          <div>{restaurantData?.address || 'Endereço não informado'}</div>
                        )}
                        {printSettings.show_phone_on_receipt && (
                          <div>Tel: {restaurantData?.phone || '(00) 00000-0000'}</div>
                        )}
                        {printSettings.show_cnpj_on_receipt && (
                          <div>CNPJ: {restaurantData?.cnpj || '00.000.000/0000-00'}</div>
                        )}
                      </div>

                      {/* Order Info Sample */}
                      <div className="border-b border-dashed pb-2">
                        <div className="flex justify-between font-bold">
                          <span>PEDIDO #001</span>
                          <span>BALCÃO</span>
                        </div>
                        <div className="text-[10px] text-gray-600">
                          {new Date().toLocaleString('pt-BR')}
                        </div>
                      </div>

                      {/* Items Sample */}
                      <div className="space-y-1 border-b border-dashed pb-2">
                        <div className="flex justify-between">
                          <span>2x X-Burguer</span>
                          <span>R$ 35,00</span>
                        </div>
                        <div className="flex justify-between">
                          <span>1x Batata Frita</span>
                          <span>R$ 12,00</span>
                        </div>
                        <div className="flex justify-between">
                          <span>2x Refrigerante</span>
                          <span>R$ 10,00</span>
                        </div>
                      </div>

                      {/* Total */}
                      <div className="border-b border-dashed pb-2">
                        <div className="flex justify-between font-bold">
                          <span>TOTAL</span>
                          <span>R$ 57,00</span>
                        </div>
                        <div className="flex justify-between text-[10px]">
                          <span>Pagamento</span>
                          <span>PIX</span>
                        </div>
                      </div>

                      {/* Custom Footer */}
                      {printSettings.receipt_footer && (
                        <div className="text-center text-[10px] italic pt-1 whitespace-pre-wrap">
                          {printSettings.receipt_footer}
                        </div>
                      )}

                      {/* Default footer if no custom */}
                      {!printSettings.receipt_footer && (
                        <div className="text-center text-[10px] pt-1">
                          Obrigado pela preferência!
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground text-center mt-4">
                    Este é um exemplo de como a impressão aparecerá. O conteúdo real pode variar.
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
