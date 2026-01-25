import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useIFoodIntegration } from '@/hooks/useIFoodIntegration';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Copy, 
  Check, 
  Clock, 
  AlertTriangle,
  ExternalLink,
  Zap,
  Settings2,
  Shield,
  History
} from 'lucide-react';
import logoIfood from '@/assets/logo-ifood.png';

export default function IFoodSettings() {
  const { restaurant } = useAuth();
  const { 
    settings, 
    pendingOrders,
    isLoading, 
    isConnecting,
    saveSettings, 
    connect, 
    testConnection,
    pollOrders,
  } = useIFoodIntegration();

  const [merchantId, setMerchantId] = useState('');
  const [autoAccept, setAutoAccept] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Update local state when settings load
  useEffect(() => {
    if (settings) {
      setMerchantId(settings.merchant_id || '');
      setAutoAccept(settings.auto_accept_orders || false);
      setIsEnabled(settings.is_enabled || false);
    }
  }, [settings]);

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ifood-webhook`;

  const handleSave = async () => {
    setIsSaving(true);
    const success = await saveSettings({
      merchant_id: merchantId || null,
      auto_accept_orders: autoAccept,
      is_enabled: isEnabled,
    });
    setIsSaving(false);
  };

  const handleConnect = async () => {
    await connect();
  };

  const handleTest = async () => {
    setIsTesting(true);
    await testConnection();
    setIsTesting(false);
  };

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    toast.success('URL copiada!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePoll = async () => {
    toast.info('Sincronizando pedidos...');
    await pollOrders();
  };

  const getStatusBadge = () => {
    if (!settings) return null;
    
    switch (settings.sync_status) {
      case 'connected':
        return (
          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
            <Wifi className="w-3 h-3 mr-1" />
            Conectado
          </Badge>
        );
      case 'token_expired':
        return (
          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Token expirado
          </Badge>
        );
      case 'error':
        return (
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
            <WifiOff className="w-3 h-3 mr-1" />
            Erro
          </Badge>
        );
      default:
        return (
          <Badge className="bg-muted text-muted-foreground">
            <WifiOff className="w-3 h-3 mr-1" />
            Desconectado
          </Badge>
        );
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('pt-BR');
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-6 space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <img src={logoIfood} alt="iFood" className="w-10 h-10 rounded-lg object-cover" />
              Integração iFood
            </h1>
            <p className="text-muted-foreground mt-1">
              Receba pedidos do iFood diretamente no seu painel
            </p>
          </div>
          {getStatusBadge()}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                Status da Conexão
              </CardTitle>
              <CardDescription>
                Informações sobre a conexão com o iFood
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                {getStatusBadge()}
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Última sincronização</span>
                <span className="text-sm font-medium flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDate(settings?.last_sync_at || null)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Pedidos pendentes</span>
                <Badge variant={pendingOrders.length > 0 ? "default" : "secondary"}>
                  {pendingOrders.length}
                </Badge>
              </div>

              <Separator />

              <div className="flex gap-2">
                <Button 
                  onClick={handleConnect} 
                  disabled={isConnecting}
                  className="flex-1"
                >
                  {isConnecting ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Wifi className="w-4 h-4 mr-2" />
                  )}
                  {settings?.access_token ? 'Reconectar' : 'Conectar'}
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={handleTest}
                  disabled={isTesting || !settings?.access_token}
                >
                  {isTesting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                </Button>

                <Button 
                  variant="outline" 
                  onClick={handlePoll}
                  disabled={!settings?.access_token}
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Credentials Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Credenciais
              </CardTitle>
              <CardDescription>
                Configure sua integração com o iFood Developer
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="merchant">Merchant ID (ID da Loja)</Label>
                <Input 
                  id="merchant"
                  placeholder="Ex: abc123-def456-..."
                  value={merchantId}
                  onChange={(e) => setMerchantId(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Encontre no Portal iFood Developer → Merchants
                </p>
              </div>

              <Separator />

              <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Client ID e Secret configurados via ambiente
                </p>
                <p className="text-xs text-muted-foreground/70">
                  As credenciais foram adicionadas nos secrets do projeto
                </p>
              </div>

              <Button 
                onClick={handleSave} 
                disabled={isSaving}
                className="w-full"
              >
                {isSaving ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Salvar Credenciais
              </Button>
            </CardContent>
          </Card>

          {/* Webhook Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ExternalLink className="w-5 h-5 text-primary" />
                Webhook
              </CardTitle>
              <CardDescription>
                Configure o webhook no Portal iFood Developer
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>URL do Webhook</Label>
                <div className="flex gap-2">
                  <Input 
                    value={webhookUrl}
                    readOnly
                    className="font-mono text-xs"
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={handleCopyWebhook}
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-xs text-blue-400">
                  <strong>Instruções:</strong> No Portal iFood Developer, vá em sua aplicação → 
                  Webhooks → Adicione esta URL para receber eventos de pedidos em tempo real.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Settings Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-primary" />
                Configurações
              </CardTitle>
              <CardDescription>
                Personalize o comportamento da integração
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Integração Ativa</Label>
                  <p className="text-xs text-muted-foreground">
                    Habilita o recebimento de pedidos
                  </p>
                </div>
                <Switch 
                  checked={isEnabled}
                  onCheckedChange={setIsEnabled}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Aceite Automático</Label>
                  <p className="text-xs text-muted-foreground">
                    Aceitar pedidos automaticamente
                  </p>
                </div>
                <Switch 
                  checked={autoAccept}
                  onCheckedChange={setAutoAccept}
                />
              </div>

              {!autoAccept && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <p className="text-xs text-amber-400">
                    ⏱️ Você terá 10 minutos para aceitar cada pedido antes que expire
                  </p>
                </div>
              )}

              <Button 
                onClick={handleSave} 
                disabled={isSaving}
                className="w-full"
              >
                {isSaving ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Salvar Configurações
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Orders */}
        {pendingOrders.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                Pedidos Pendentes ({pendingOrders.length})
              </CardTitle>
              <CardDescription>
                Pedidos aguardando aceite
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {pendingOrders.slice(0, 5).map((order) => {
                  const orderData = order.order_data as { customer?: { name?: string }; total?: { orderAmount?: number } };
                  return (
                    <div 
                      key={order.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div>
                        <span className="font-medium">#{order.ifood_display_id || order.ifood_order_id.slice(0, 8)}</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          {orderData?.customer?.name || 'Cliente'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-green-500">
                          R$ {(orderData?.total?.orderAmount || 0).toFixed(2)}
                        </span>
                        <Badge variant="outline" className="text-amber-500 border-amber-500/30">
                          Pendente
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
              {pendingOrders.length > 5 && (
                <p className="text-xs text-muted-foreground text-center mt-3">
                  +{pendingOrders.length - 5} pedidos pendentes
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
