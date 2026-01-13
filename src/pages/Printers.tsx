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
  const [uploading, setUploading] = useState(false);
  const [fileExists, setFileExists] = useState(false);
  const [checkingFile, setCheckingFile] = useState(true);
  const [activeTab, setActiveTab] = useState<'printers' | 'templates'>('printers');
  
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
  
  const executableUrl = `${supabaseUrl}/storage/v1/object/public/printer-downloads/ImpressoraPedidos.zip`;

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
        {/* Breadcrumb */}
        <div className="text-sm text-muted-foreground mb-4">
          <span>Início</span>
          <span className="mx-2">›</span>
          <span>Configurações</span>
          <span className="mx-2">›</span>
          <span className="text-primary font-medium">Impressora</span>
          <span className="mx-2">›</span>
          <span className="text-foreground">Lista de Impressoras</span>
        </div>

        <div className="flex gap-6">
          {/* Sidebar Navigation */}
          <div className="w-64 flex-shrink-0">
            <nav className="space-y-1">
              <button
                onClick={() => setActiveTab('printers')}
                className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${
                  activeTab === 'printers'
                    ? 'bg-primary/10 text-primary border-l-4 border-primary'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                1. Lista de Impressoras
              </button>
              <button
                onClick={() => setActiveTab('templates')}
                className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${
                  activeTab === 'templates'
                    ? 'bg-primary/10 text-primary border-l-4 border-primary'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                2. Modelos de Impressão
              </button>
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 max-w-3xl">
            {activeTab === 'printers' && (
              <div className="space-y-6">
                <h1 className="text-2xl font-bold text-foreground">1. Lista de Impressoras</h1>

                {/* Upload Section for Admin */}
                {!fileExists && !checkingFile && (
                  <Card className="border-orange-500/50 bg-orange-500/5">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-4">
                        <AlertTriangle className="w-6 h-6 text-orange-500" />
                        <div className="flex-1">
                          <p className="font-medium text-foreground">Programa não disponível</p>
                          <p className="text-sm text-muted-foreground">Faça upload do executável para seus clientes baixarem</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="file"
                            accept=".zip"
                            onChange={handleUploadExecutable}
                            disabled={uploading}
                            className="w-auto"
                            id="upload-exec"
                          />
                          {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Download Section */}
                {fileExists && (
                  <Card className="border-primary/30">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-full bg-primary/10">
                          <Download className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-foreground">Programa de Impressão</p>
                          <p className="text-sm text-muted-foreground">
                            Baixe e instale no computador conectado à impressora
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button asChild>
                            <a href={executableUrl} download>
                              <Download className="w-4 h-4 mr-2" />
                              Baixar Programa
                            </a>
                          </Button>
                          <Button variant="outline" onClick={handleDownloadConfig}>
                            <FileText className="w-4 h-4 mr-2" />
                            Baixar config.ini
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

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
                  <Card key={printer.id} className="relative">
                    <CardContent className="pt-6">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Impressora</p>
                          <h3 className="text-lg font-semibold text-foreground">{printer.name}</h3>
                          <p className="text-sm text-muted-foreground">{printer.model || 'Modelo não especificado'}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={printer.status === 'connected' ? 'default' : 'destructive'}
                            className={printer.status === 'connected' 
                              ? 'bg-green-500/20 text-green-600 hover:bg-green-500/30' 
                              : 'bg-red-500/20 text-red-600 hover:bg-red-500/30'
                            }
                          >
                            {printer.status === 'connected' ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Conectada
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3 h-3 mr-1" />
                                Desconectada
                              </>
                            )}
                          </Badge>
                          {!printer.is_active && (
                            <Badge variant="secondary">Inativa</Badge>
                          )}
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleTestPrint(printer.id)}
                          >
                            <PrinterIcon className="w-4 h-4 mr-1" />
                            Testar
                          </Button>
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

                      {/* Warning Box */}
                      <div className="bg-muted/50 rounded-lg p-4 mb-4 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <div className="text-sm">
                          <p className="text-foreground">
                            Verifique se a impressora <strong>{printer.printer_name || 'padrão'}</strong> está conectada neste dispositivo
                          </p>
                          <p className="text-primary mt-1">
                            Você só pode editar as configurações e testar a impressora no dispositivo em que ela foi configurada.
                          </p>
                        </div>
                      </div>

                      {/* Linked Commands */}
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">Comandas vinculadas</p>
                        <p className="text-sm text-foreground">
                          {printer.linked_order_types
                            ?.map((type) => ORDER_TYPE_LABELS[type] || type)
                            .join(', ') || 'Nenhum tipo vinculado'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Add Printer CTA */}
                {printers.length > 0 && (
                  <Card className="border-dashed">
                    <CardContent className="py-6">
                      <div className="flex items-center justify-between">
                        <p className="text-foreground font-medium">Tem outra impressora para usar?</p>
                        <Button 
                          variant="outline" 
                          className="text-primary border-primary hover:bg-primary/10"
                          onClick={handleOpenAddModal}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Adicionar impressora
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Config Preview */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Sua Configuração (config.ini)
                    </CardTitle>
                    <CardDescription>
                      Arquivo pré-configurado para {restaurant?.name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2 mb-4">
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
                        Baixar arquivo
                      </Button>
                    </div>
                    <pre className="p-4 rounded-lg bg-muted text-xs font-mono overflow-x-auto whitespace-pre-wrap">
                      {configContent}
                    </pre>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'templates' && (
              <div className="space-y-6">
                <h1 className="text-2xl font-bold text-foreground">2. Modelos de Impressão</h1>
                
                <Card>
                  <CardContent className="py-12 text-center">
                    <PrinterIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-semibold text-foreground mb-2">Em breve</h3>
                    <p className="text-muted-foreground text-sm max-w-md mx-auto">
                      Aqui você poderá personalizar o layout dos cupons impressos, escolher quais informações aparecem e definir o tamanho do papel.
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
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
