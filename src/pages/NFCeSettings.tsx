import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ChevronRight,
  ArrowLeft,
  Loader2,
  Save,
  Receipt,
  Settings,
  FileText,
  Upload,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface NFCeSettings {
  id?: string;
  is_enabled: boolean;
  environment: 'homologation' | 'production';
  inscricao_estadual: string;
  regime_tributario: number;
  csc_id: string;
  csc_token: string;
  serie_nfce: number;
  numero_atual: number;
  certificado_url: string | null;
  certificado_validade: string | null;
  auto_print_nfce: boolean;
  printer_id: string | null;
}

interface NFCeInvoice {
  id: string;
  numero: number;
  serie: number;
  chave_acesso: string | null;
  status: string;
  status_sefaz: string | null;
  motivo_sefaz: string | null;
  valor_total: number;
  cpf_consumidor: string | null;
  nome_consumidor: string | null;
  danfe_url: string | null;
  created_at: string;
  order_id: string | null;
}

interface Printer {
  id: string;
  name: string;
}

export default function NFCeSettings() {
  const navigate = useNavigate();
  const { restaurant } = useAuth();
  const certInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingCert, setUploadingCert] = useState(false);
  
  const [settings, setSettings] = useState<NFCeSettings>({
    is_enabled: false,
    environment: 'homologation',
    inscricao_estadual: '',
    regime_tributario: 1,
    csc_id: '',
    csc_token: '',
    serie_nfce: 1,
    numero_atual: 0,
    certificado_url: null,
    certificado_validade: null,
    auto_print_nfce: true,
    printer_id: null,
  });

  const [invoices, setInvoices] = useState<NFCeInvoice[]>([]);
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  useEffect(() => {
    if (restaurant?.id) {
      fetchData();
    }
  }, [restaurant?.id]);

  const fetchData = async () => {
    if (!restaurant?.id) return;

    try {
      // Fetch NFC-e settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('nfce_settings')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .maybeSingle();

      if (settingsError) throw settingsError;

      if (settingsData) {
        setSettings({
          id: settingsData.id,
          is_enabled: settingsData.is_enabled ?? false,
          environment: settingsData.environment as 'homologation' | 'production',
          inscricao_estadual: settingsData.inscricao_estadual || '',
          regime_tributario: settingsData.regime_tributario || 1,
          csc_id: settingsData.csc_id || '',
          csc_token: settingsData.csc_token || '',
          serie_nfce: settingsData.serie_nfce || 1,
          numero_atual: settingsData.numero_atual || 0,
          certificado_url: settingsData.certificado_url,
          certificado_validade: settingsData.certificado_validade,
          auto_print_nfce: settingsData.auto_print_nfce ?? true,
          printer_id: settingsData.printer_id,
        });
      }

      // Fetch printers
      const { data: printersData } = await supabase
        .from('printers')
        .select('id, name')
        .eq('restaurant_id', restaurant.id)
        .eq('is_active', true);

      if (printersData) {
        setPrinters(printersData);
      }

      // Fetch recent invoices
      await fetchInvoices();

    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoices = async () => {
    if (!restaurant?.id) return;

    setLoadingInvoices(true);
    try {
      const { data, error } = await supabase
        .from('nfce_invoices')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoadingInvoices(false);
    }
  };

  const handleSave = async () => {
    if (!restaurant?.id) return;

    setSaving(true);

    try {
      const dataToSave = {
        restaurant_id: restaurant.id,
        is_enabled: settings.is_enabled,
        environment: settings.environment,
        inscricao_estadual: settings.inscricao_estadual,
        regime_tributario: settings.regime_tributario,
        csc_id: settings.csc_id,
        csc_token: settings.csc_token,
        serie_nfce: settings.serie_nfce,
        numero_atual: settings.numero_atual,
        auto_print_nfce: settings.auto_print_nfce,
        printer_id: settings.printer_id,
      };

      if (settings.id) {
        const { error } = await supabase
          .from('nfce_settings')
          .update(dataToSave)
          .eq('id', settings.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('nfce_settings')
          .insert(dataToSave)
          .select()
          .single();

        if (error) throw error;
        setSettings(prev => ({ ...prev, id: data.id }));
      }

      toast.success('Configurações salvas com sucesso!');
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error('Erro ao salvar: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCertificateUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !restaurant?.id) return;

    if (!file.name.endsWith('.pfx') && !file.name.endsWith('.p12')) {
      toast.error('Arquivo deve ser .pfx ou .p12');
      return;
    }

    setUploadingCert(true);

    try {
      const fileName = `${restaurant.id}/certificate.pfx`;

      const { error: uploadError } = await supabase.storage
        .from('certificates')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('certificates')
        .getPublicUrl(fileName);

      // Update settings with certificate URL
      if (settings.id) {
        await supabase
          .from('nfce_settings')
          .update({ certificado_url: publicUrl })
          .eq('id', settings.id);
      }

      setSettings(prev => ({ ...prev, certificado_url: publicUrl }));
      toast.success('Certificado enviado com sucesso!');
    } catch (error: any) {
      console.error('Error uploading certificate:', error);
      toast.error('Erro ao enviar certificado: ' + error.message);
    } finally {
      setUploadingCert(false);
    }
  };

  const checkInvoiceStatus = async (invoiceId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('nfce-status', {
        body: { invoice_id: invoiceId },
      });

      if (error) throw error;

      if (data.success) {
        toast.success('Status atualizado');
        fetchInvoices();
      } else {
        toast.error(data.error || 'Erro ao consultar status');
      }
    } catch (error: any) {
      toast.error('Erro ao consultar status');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'authorized':
        return <Badge className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />Autorizada</Badge>;
      case 'cancelled':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Cancelada</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejeitada</Badge>;
      case 'processing':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Processando</Badge>;
      case 'contingency':
        return <Badge className="bg-orange-500"><AlertTriangle className="w-3 h-3 mr-1" />Contingência</Badge>;
      default:
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
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
      <div className="p-6 max-w-5xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <span>Início</span>
          <ChevronRight className="w-4 h-4" />
          <span className="text-foreground font-medium">Configurações NFC-e</span>
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
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">Nota Fiscal Eletrônica (NFC-e)</h1>
            <p className="text-muted-foreground">
              Configure a emissão de NFC-e integrada ao Focus NFe
            </p>
          </div>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar
          </Button>
        </div>

        {/* Development Banner */}
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <div>
            <p className="font-medium text-amber-600 dark:text-amber-400">Funcionalidade em Desenvolvimento</p>
            <p className="text-sm text-muted-foreground">
              A integração com NFC-e está em fase de desenvolvimento. Algumas funcionalidades podem não estar disponíveis ainda.
            </p>
          </div>
        </div>

        <Tabs defaultValue="config" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="config" className="gap-2">
              <Settings className="w-4 h-4" />
              Configurações
            </TabsTrigger>
            <TabsTrigger value="fiscal" className="gap-2">
              <Receipt className="w-4 h-4" />
              Dados Fiscais
            </TabsTrigger>
            <TabsTrigger value="notas" className="gap-2">
              <FileText className="w-4 h-4" />
              Notas Emitidas
            </TabsTrigger>
          </TabsList>

          {/* Configurações */}
          <TabsContent value="config" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Ativar NFC-e
                  <Switch
                    checked={settings.is_enabled}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, is_enabled: checked }))}
                  />
                </CardTitle>
                <CardDescription>
                  Habilita a emissão de Nota Fiscal de Consumidor Eletrônica
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ambiente</CardTitle>
                <CardDescription>
                  Use homologação para testes sem valor fiscal
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <Button
                    variant={settings.environment === 'homologation' ? 'default' : 'outline'}
                    onClick={() => setSettings(prev => ({ ...prev, environment: 'homologation' }))}
                    className="flex-1"
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Homologação (Testes)
                  </Button>
                  <Button
                    variant={settings.environment === 'production' ? 'default' : 'outline'}
                    onClick={() => setSettings(prev => ({ ...prev, environment: 'production' }))}
                    className="flex-1"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Produção
                  </Button>
                </div>
                {settings.environment === 'production' && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="text-sm text-destructive font-medium">
                      ⚠️ Atenção: Notas emitidas em produção têm valor fiscal!
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Certificado Digital A1</CardTitle>
                <CardDescription>
                  Certificado necessário para assinar as notas fiscais
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <input
                    ref={certInputRef}
                    type="file"
                    accept=".pfx,.p12"
                    className="hidden"
                    onChange={handleCertificateUpload}
                  />
                  <Button
                    variant="outline"
                    onClick={() => certInputRef.current?.click()}
                    disabled={uploadingCert}
                    className="gap-2"
                  >
                    {uploadingCert ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    Enviar Certificado (.pfx)
                  </Button>
                  {settings.certificado_url && (
                    <Badge variant="secondary" className="gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Certificado configurado
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  O certificado é armazenado de forma segura e usado apenas para assinatura das notas.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Impressão Automática</CardTitle>
                <CardDescription>
                  Configure a impressão automática do DANFE
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Imprimir DANFE automaticamente</Label>
                  <Switch
                    checked={settings.auto_print_nfce}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, auto_print_nfce: checked }))}
                  />
                </div>
                {settings.auto_print_nfce && (
                  <div className="space-y-2">
                    <Label>Impressora</Label>
                    <Select
                      value={settings.printer_id || ''}
                      onValueChange={(value) => setSettings(prev => ({ ...prev, printer_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma impressora" />
                      </SelectTrigger>
                      <SelectContent>
                        {printers.map((printer) => (
                          <SelectItem key={printer.id} value={printer.id}>
                            {printer.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Dados Fiscais */}
          <TabsContent value="fiscal" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Dados do Emitente</CardTitle>
                <CardDescription>
                  Informações fiscais da empresa
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ie">Inscrição Estadual</Label>
                    <Input
                      id="ie"
                      value={settings.inscricao_estadual}
                      onChange={(e) => setSettings(prev => ({ 
                        ...prev, 
                        inscricao_estadual: e.target.value.replace(/\D/g, '') 
                      }))}
                      placeholder="000000000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="regime">Regime Tributário</Label>
                    <Select
                      value={String(settings.regime_tributario)}
                      onValueChange={(value) => setSettings(prev => ({ 
                        ...prev, 
                        regime_tributario: parseInt(value) 
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Simples Nacional</SelectItem>
                        <SelectItem value="2">Simples Nacional - Excesso</SelectItem>
                        <SelectItem value="3">Regime Normal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>CSC (Código de Segurança do Contribuinte)</CardTitle>
                <CardDescription>
                  Obrigatório para emissão de NFC-e. Obtenha na SEFAZ do seu estado.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="csc_id">ID do CSC</Label>
                    <Input
                      id="csc_id"
                      value={settings.csc_id}
                      onChange={(e) => setSettings(prev => ({ ...prev, csc_id: e.target.value }))}
                      placeholder="000001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="csc_token">Token CSC</Label>
                    <Input
                      id="csc_token"
                      type="password"
                      value={settings.csc_token}
                      onChange={(e) => setSettings(prev => ({ ...prev, csc_token: e.target.value }))}
                      placeholder="Token de segurança"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Numeração</CardTitle>
                <CardDescription>
                  Série e número da última nota emitida
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="serie">Série NFC-e</Label>
                    <Input
                      id="serie"
                      type="number"
                      value={settings.serie_nfce}
                      onChange={(e) => setSettings(prev => ({ 
                        ...prev, 
                        serie_nfce: parseInt(e.target.value) || 1 
                      }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="numero">Último Número</Label>
                    <Input
                      id="numero"
                      type="number"
                      value={settings.numero_atual}
                      onChange={(e) => setSettings(prev => ({ 
                        ...prev, 
                        numero_atual: parseInt(e.target.value) || 0 
                      }))}
                    />
                    <p className="text-xs text-muted-foreground">
                      Próxima nota: #{settings.numero_atual + 1}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notas Emitidas */}
          <TabsContent value="notas" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Notas Fiscais Emitidas</CardTitle>
                    <CardDescription>
                      Histórico das últimas 50 notas emitidas
                    </CardDescription>
                  </div>
                  <Button variant="outline" onClick={fetchInvoices} disabled={loadingInvoices}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${loadingInvoices ? 'animate-spin' : ''}`} />
                    Atualizar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {invoices.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma nota emitida ainda</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {invoices.map((invoice) => (
                      <div 
                        key={invoice.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              NFC-e #{invoice.numero} (Série {invoice.serie})
                            </span>
                            {getStatusBadge(invoice.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(invoice.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            {invoice.cpf_consumidor && ` • CPF: ${invoice.cpf_consumidor}`}
                          </p>
                          {invoice.motivo_sefaz && (
                            <p className="text-xs text-muted-foreground">
                              {invoice.motivo_sefaz}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">
                            R$ {invoice.valor_total.toFixed(2)}
                          </span>
                          {invoice.status === 'processing' && (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => checkInvoiceStatus(invoice.id)}
                            >
                              <RefreshCw className="w-4 h-4" />
                            </Button>
                          )}
                          {invoice.danfe_url && (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              asChild
                            >
                              <a href={invoice.danfe_url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
