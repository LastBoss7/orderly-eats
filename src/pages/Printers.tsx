import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  Download,
  Copy,
  CheckCircle2,
  Printer,
  Settings,
  FileText,
  Monitor,
  Wifi,
  AlertCircle,
  Upload,
  Loader2,
} from 'lucide-react';

export default function Printers() {
  const { profile, restaurant } = useAuth();
  const [copied, setCopied] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileExists, setFileExists] = useState(false);
  const [checkingFile, setCheckingFile] = useState(true);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  
  // URL do executável no bucket de storage
  const executableUrl = `${supabaseUrl}/storage/v1/object/public/printer-downloads/ImpressoraPedidos.zip`;

  // Gera o conteúdo do config.ini com os dados do restaurante
  const configContent = `[GERAL]
# Configuração gerada automaticamente - NÃO EDITAR
SUPABASE_URL = ${supabaseUrl}
SUPABASE_KEY = ${supabaseKey}

[RESTAURANTE]
# ID do seu restaurante
ID = ${profile?.restaurant_id || 'SEU_RESTAURANT_ID'}

# Nome da impressora (deixe vazio para usar a padrão do Windows)
IMPRESSORA = 

[SISTEMA]
# Intervalo em segundos para verificar novos pedidos
INTERVALO = 5

# Largura do papel em caracteres (48 para 58mm, 42 para 80mm)
LARGURA_PAPEL = 48
`;

  // Verificar se o arquivo já existe no bucket
  useEffect(() => {
    const checkFileExists = async () => {
      try {
        const { data, error } = await supabase.storage
          .from('printer-downloads')
          .list('', { limit: 10 });
        
        if (!error && data) {
          const exists = data.some(file => file.name === 'ImpressoraPedidos.zip');
          setFileExists(exists);
        }
      } catch (err) {
        console.error('Erro ao verificar arquivo:', err);
      } finally {
        setCheckingFile(false);
      }
    };
    
    checkFileExists();
  }, []);

  const handleUploadExecutable = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.zip')) {
      toast.error('Por favor, envie um arquivo .zip');
      return;
    }

    setUploading(true);
    try {
      // Remove arquivo existente se houver
      await supabase.storage
        .from('printer-downloads')
        .remove(['ImpressoraPedidos.zip']);

      // Upload do novo arquivo
      const { error } = await supabase.storage
        .from('printer-downloads')
        .upload('ImpressoraPedidos.zip', file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (error) throw error;

      setFileExists(true);
      toast.success('Executável enviado com sucesso!');
    } catch (err: any) {
      console.error('Erro no upload:', err);
      toast.error('Erro ao enviar arquivo: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleCopyConfig = async () => {
    try {
      await navigator.clipboard.writeText(configContent);
      setCopied(true);
      toast.success('Configuração copiada!');
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      toast.error('Erro ao copiar');
    }
  };

  const handleDownloadConfig = () => {
    const blob = new Blob([configContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'config.ini';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Arquivo config.ini baixado!');
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Printer className="w-7 h-7" />
            Impressora de Pedidos
          </h1>
          <p className="text-muted-foreground">
            Configure a impressão automática de pedidos no seu computador
          </p>
        </div>

        {/* Status Card */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-full bg-primary/20">
                <Wifi className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">Status da Conexão</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Restaurante: <span className="font-medium text-foreground">{restaurant?.name}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1 font-mono">
                  ID: {profile?.restaurant_id?.slice(0, 8)}...
                </p>
              </div>
              <Badge className="bg-success/20 text-success">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Pronto
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Admin Upload Section */}
        {!fileExists && !checkingFile && (
          <Card className="border-warning/50 bg-warning/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-warning">
                <Upload className="w-5 h-5" />
                Ação Necessária: Upload do Executável
              </CardTitle>
              <CardDescription>
                O arquivo ImpressoraPedidos.zip ainda não foi enviado. Faça o upload para que seus clientes possam baixar.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Input
                  type="file"
                  accept=".zip"
                  onChange={handleUploadExecutable}
                  disabled={uploading}
                  className="flex-1"
                />
                {uploading && (
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Envie o arquivo ImpressoraPedidos.zip compilado do Python
              </p>
            </CardContent>
          </Card>
        )}

        {fileExists && (
          <Card className="border-green-500/50 bg-green-500/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-500" />
                <div>
                  <p className="font-medium text-foreground">Executável disponível para download</p>
                  <p className="text-sm text-muted-foreground">Os clientes podem baixar o programa normalmente</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content */}
        <Tabs defaultValue="setup" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="setup">Instalação</TabsTrigger>
            <TabsTrigger value="config">Configuração</TabsTrigger>
          </TabsList>

          <TabsContent value="setup" className="space-y-4">
            {/* Step 1 - Download */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                    1
                  </div>
                  <div>
                    <CardTitle className="text-lg">Baixar o Programa</CardTitle>
                    <CardDescription>Baixe o programa de impressão para Windows</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button className="flex-1" size="lg" asChild>
                    <a href={executableUrl} download>
                      <Download className="w-5 h-5 mr-2" />
                      Baixar ImpressoraPedidos.zip
                    </a>
                  </Button>
                </div>
                <div className="text-sm text-muted-foreground flex items-start gap-2">
                  <Monitor className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>Compatível com Windows 10/11. Não requer instalação.</span>
                </div>
              </CardContent>
            </Card>

            {/* Step 2 - Extract */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                    2
                  </div>
                  <div>
                    <CardTitle className="text-lg">Extrair e Configurar</CardTitle>
                    <CardDescription>Extraia o ZIP e baixe sua configuração</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  <li>Extraia o arquivo <code className="bg-muted px-1 py-0.5 rounded">ImpressoraPedidos.zip</code> em uma pasta</li>
                  <li>Clique no botão abaixo para baixar o arquivo de configuração</li>
                  <li>Coloque o <code className="bg-muted px-1 py-0.5 rounded">config.ini</code> na mesma pasta do programa</li>
                </ol>
                
                <Button variant="outline" size="lg" className="w-full" onClick={handleDownloadConfig}>
                  <FileText className="w-5 h-5 mr-2" />
                  Baixar config.ini
                </Button>
              </CardContent>
            </Card>

            {/* Step 3 - Run */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                    3
                  </div>
                  <div>
                    <CardTitle className="text-lg">Executar</CardTitle>
                    <CardDescription>Abra o programa e comece a imprimir</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  <li>Dê duplo clique em <code className="bg-muted px-1 py-0.5 rounded">ImpressoraPedidos.exe</code></li>
                  <li>O programa abrirá uma janela mostrando que está aguardando pedidos</li>
                  <li>Deixe a janela aberta enquanto trabalha - os pedidos serão impressos automaticamente!</li>
                </ol>

                <div className="p-3 rounded-lg bg-warning/10 border border-warning/20 flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-warning">Dica:</p>
                    <p className="text-muted-foreground">
                      Crie um atalho na Área de Trabalho para abrir rapidamente. 
                      Para iniciar com o Windows, coloque o atalho na pasta "Inicialização".
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="config" className="space-y-4">
            {/* Config Preview */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      Sua Configuração
                    </CardTitle>
                    <CardDescription>
                      Arquivo config.ini já preenchido com seus dados
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleCopyConfig}>
                      {copied ? (
                        <CheckCircle2 className="w-4 h-4 mr-1 text-success" />
                      ) : (
                        <Copy className="w-4 h-4 mr-1" />
                      )}
                      {copied ? 'Copiado!' : 'Copiar'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleDownloadConfig}>
                      <Download className="w-4 h-4 mr-1" />
                      Baixar
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <pre className="p-4 rounded-lg bg-muted text-sm font-mono overflow-x-auto whitespace-pre-wrap">
                  {configContent}
                </pre>
              </CardContent>
            </Card>

            {/* Advanced Config */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Configurações Avançadas</CardTitle>
                <CardDescription>Personalize conforme sua necessidade</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Nome da Impressora</Label>
                    <Input 
                      placeholder="Deixe vazio para usar a padrão" 
                      disabled
                    />
                    <p className="text-xs text-muted-foreground">
                      Edite diretamente no config.ini se precisar
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Intervalo de Verificação</Label>
                    <Input 
                      type="number" 
                      value="5" 
                      disabled
                    />
                    <p className="text-xs text-muted-foreground">
                      Tempo em segundos entre cada verificação
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Troubleshooting */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Problemas Comuns</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 text-sm">
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="font-medium">❌ "Windows SmartScreen bloqueou"</p>
                    <p className="text-muted-foreground mt-1">
                      Clique em "Mais informações" e depois "Executar assim mesmo"
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="font-medium">❌ "Nenhuma impressora encontrada"</p>
                    <p className="text-muted-foreground mt-1">
                      Verifique se a impressora está instalada no Windows e definida como padrão
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="font-medium">❌ "Erro de conexão"</p>
                    <p className="text-muted-foreground mt-1">
                      Verifique sua conexão com a internet e se o config.ini está correto
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
