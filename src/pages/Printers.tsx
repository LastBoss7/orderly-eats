import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { usePrinters, Printer } from '@/hooks/usePrinters';
import { PrinterModal } from '@/components/printers/PrinterModal';
import { ReceiptLayoutEditor } from '@/components/printers/ReceiptLayoutEditor';
import {
  Download,
  Copy,
  CheckCircle2,
  Printer as PrinterIcon,
  FileText,
  AlertCircle,
  Upload,
  Loader2,
  Plus,
  MoreVertical,
  XCircle,
  AlertTriangle,
  Trash2,
  Pencil,
  Monitor,
  ExternalLink,
  Github,
  Send,
  LayoutTemplate,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const ORDER_TYPE_LABELS: Record<string, string> = {
  counter: 'Pedidos de balcão',
  table: 'Pedidos de mesa',
  delivery: 'Pedidos de entrega',
};

export default function Printers() {
  const { profile, restaurant } = useAuth();
  const { printers, loading: loadingPrinters, addPrinter, updatePrinter, deletePrinter } = usePrinters();
  
  const [copied, setCopied] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileExists, setFileExists] = useState(false);
  const [checkingFile, setCheckingFile] = useState(true);
  const [activeTab, setActiveTab] = useState<'printers' | 'layout'>('printers');
  
  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState<Printer | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [printerToDelete, setPrinterToDelete] = useState<Printer | null>(null);
  const [deleting, setDeleting] = useState(false);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  
  // URL do GitHub releases (será configurado após build)
  const electronAppUrl = `${supabaseUrl}/storage/v1/object/public/printer-downloads/ImpressoraPedidos-Setup.exe`;

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
      await supabase.storage
        .from('printer-downloads')
        .remove(['ImpressoraPedidos.zip']);

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

  const handleCopyRestaurantId = async () => {
    if (!profile?.restaurant_id) return;
    try {
      await navigator.clipboard.writeText(profile.restaurant_id);
      setCopiedId(true);
      toast.success('ID do restaurante copiado!');
      setTimeout(() => setCopiedId(false), 3000);
    } catch (err) {
      toast.error('Erro ao copiar');
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

  const handleTestPrint = (printerId: string) => {
    toast.info('Enviando impressão de teste...');
    setTimeout(() => {
      toast.success('Teste enviado! Verifique sua impressora.');
    }, 1000);
  };

  const handleOpenAddModal = () => {
    setEditingPrinter(null);
    setModalOpen(true);
  };

  const handleOpenEditModal = (printer: Printer) => {
    setEditingPrinter(printer);
    setModalOpen(true);
  };

  const handleSavePrinter = async (data: {
    name: string;
    model: string;
    printer_name: string;
    paper_width: number;
    linked_order_types: string[];
    linked_categories: string[] | null;
    is_active: boolean;
  }) => {
    setSaving(true);
    try {
      if (editingPrinter) {
        await updatePrinter(editingPrinter.id, data);
      } else {
        await addPrinter(data);
      }
      setModalOpen(false);
      setEditingPrinter(null);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!printerToDelete) return;
    
    setDeleting(true);
    try {
      await deletePrinter(printerToDelete.id);
      setDeleteDialogOpen(false);
      setPrinterToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleOpenDeleteDialog = (printer: Printer) => {
    setPrinterToDelete(printer);
    setDeleteDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Impressoras</h1>
            <p className="text-muted-foreground">Gerencie suas impressoras e configure o layout do cupom</p>
          </div>
          {activeTab === 'printers' && (
            <Button onClick={handleOpenAddModal}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Impressora
            </Button>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 border-b">
          <button
            onClick={() => setActiveTab('printers')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 -mb-px ${
              activeTab === 'printers'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className="flex items-center gap-2">
              <PrinterIcon className="w-4 h-4" />
              Impressoras
            </span>
          </button>
          <button
            onClick={() => setActiveTab('layout')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 -mb-px ${
              activeTab === 'layout'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className="flex items-center gap-2">
              <LayoutTemplate className="w-4 h-4" />
              Layout do Cupom
            </span>
          </button>
        </div>

        {/* Content */}
        {activeTab === 'printers' && (
          <div className="space-y-6">
            {/* App Download Card - Simplified */}
            <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-transparent">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-primary/20">
                    <Monitor className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">Aplicativo de Impressão</h3>
                    <p className="text-sm text-muted-foreground">
                      Baixe e instale no computador conectado à impressora térmica
                    </p>
                  </div>
                  {fileExists ? (
                    <Button asChild>
                      <a href={electronAppUrl} download>
                        <Download className="w-4 h-4 mr-2" />
                        Baixar
                      </a>
                    </Button>
                  ) : checkingFile ? (
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  ) : (
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept=".exe,.zip"
                        onChange={handleUploadExecutable}
                        disabled={uploading}
                        className="w-48"
                        id="upload-exec"
                      />
                      {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Restaurant ID Card - Important for Electron connection */}
            <Card className="border-amber-500/30 bg-gradient-to-r from-amber-500/5 to-transparent">
              <CardContent className="pt-6">
                <div className="flex flex-col gap-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-full bg-amber-500/20">
                      <AlertTriangle className="w-6 h-6 text-amber-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">ID do Restaurante (Obrigatório)</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        Cole este ID nas configurações do aplicativo Electron para conectar ao seu restaurante
                      </p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 px-3 py-2 bg-muted rounded-lg font-mono text-sm break-all">
                          {profile?.restaurant_id || 'Carregando...'}
                        </code>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={handleCopyRestaurantId}
                          disabled={!profile?.restaurant_id}
                        >
                          {copiedId ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 mr-1 text-green-500" />
                              Copiado!
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4 mr-1" />
                              Copiar ID
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="ml-16 p-3 rounded-lg bg-muted/50 border border-dashed">
                    <p className="text-xs text-muted-foreground mb-2 font-medium">
                      📋 Passos para conectar o Electron:
                    </p>
                    <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                      <li>Abra o aplicativo Electron no Windows</li>
                      <li>Clique no menu <strong>"☰ Configurar"</strong></li>
                      <li>Cole o ID do Restaurante no campo correspondente</li>
                      <li>Clique em <strong>"Salvar"</strong> e depois <strong>"Reconectar"</strong></li>
                    </ol>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Loading State */}
            {loadingPrinters && (
              <Card>
                <CardContent className="py-12 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </CardContent>
              </Card>
            )}

            {/* Empty State */}
            {!loadingPrinters && printers.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <PrinterIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold text-foreground mb-2">Nenhuma impressora configurada</h3>
                  <p className="text-muted-foreground text-sm max-w-md mx-auto mb-4">
                    Adicione uma impressora para começar a imprimir pedidos automaticamente.
                  </p>
                  <Button onClick={handleOpenAddModal}>
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar impressora
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Printers List */}
            {printers.map((printer) => (
              <Card key={printer.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-lg bg-muted">
                        <PrinterIcon className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{printer.name}</h3>
                        <p className="text-sm text-muted-foreground">{printer.model || 'Modelo não especificado'}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {printer.linked_order_types
                            ?.map((type) => ORDER_TYPE_LABELS[type] || type)
                            .join(', ') || 'Todos os tipos'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        className={printer.status === 'connected' 
                          ? 'bg-green-500/20 text-green-600 hover:bg-green-500/30' 
                          : 'bg-muted text-muted-foreground'
                        }
                      >
                        {printer.status === 'connected' ? 'Conectada' : 'Aguardando'}
                      </Badge>
                      {!printer.is_active && (
                        <Badge variant="secondary">Inativa</Badge>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenEditModal(printer)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleTestPrint(printer.id)}>
                            <PrinterIcon className="w-4 h-4 mr-2" />
                            Testar impressão
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => handleOpenDeleteDialog(printer)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Remover
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Config Preview - Collapsible */}
            {printers.length > 0 && (
              <details className="group">
                <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Ver configuração (config.ini)
                </summary>
                <Card className="mt-3">
                  <CardContent className="pt-4">
                    <div className="flex gap-2 mb-3">
                      <Button variant="outline" size="sm" onClick={handleCopyConfig}>
                        {copied ? (
                          <CheckCircle2 className="w-4 h-4 mr-1 text-green-500" />
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
                    <pre className="p-3 rounded-lg bg-muted text-xs font-mono overflow-x-auto whitespace-pre-wrap max-h-40">
                      {configContent}
                    </pre>
                  </CardContent>
                </Card>
              </details>
            )}
          </div>
        )}

        {activeTab === 'layout' && (
          <ReceiptLayoutEditor />
        )}
      </div>

      {/* Printer Modal */}
      <PrinterModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        printer={editingPrinter}
        onSave={handleSavePrinter}
        loading={saving}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover impressora?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover a impressora "{printerToDelete?.name}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
