import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/auth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { usePrinters, Printer } from '@/hooks/usePrinters';
import { PrinterModal } from '@/components/printers/PrinterModal';
import { ReceiptLayoutEditor } from '@/components/printers/ReceiptLayoutEditor';
import {
  Copy,
  CheckCircle2,
  Printer as PrinterIcon,
  Loader2,
  Plus,
  MoreVertical,
  AlertTriangle,
  Trash2,
  Pencil,
  LayoutTemplate,
  Activity,
} from 'lucide-react';
import { PrinterStatusPanel } from '@/components/printers/PrinterStatusPanel';
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
  const { profile } = useAuth();
  const { printers, loading: loadingPrinters, addPrinter, updatePrinter, deletePrinter } = usePrinters();
  
  const [copiedId, setCopiedId] = useState(false);
  const [activeTab, setActiveTab] = useState<'status' | 'printers' | 'layout'>('status');
  
  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState<Printer | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [printerToDelete, setPrinterToDelete] = useState<Printer | null>(null);
  const [deleting, setDeleting] = useState(false);

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
            onClick={() => setActiveTab('status')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 -mb-px ${
              activeTab === 'status'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Status
            </span>
          </button>
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
        {activeTab === 'status' && (
          <PrinterStatusPanel />
        )}

        {activeTab === 'printers' && (
          <div className="space-y-6">
            {/* Restaurant ID Card */}
            <Card className="border-amber-500/30 bg-gradient-to-r from-amber-500/5 to-transparent">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-full bg-amber-500/20">
                    <AlertTriangle className="w-6 h-6 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">ID do Restaurante</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Cole este ID no aplicativo Electron para conectar
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
                            Copiar
                          </>
                        )}
                      </Button>
                    </div>
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
                    As impressoras aparecerão aqui quando você conectar o aplicativo Electron.
                  </p>
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
                        <p className="text-sm text-muted-foreground">{printer.printer_name || 'Sem nome do sistema'}</p>
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
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleOpenDeleteDialog(printer)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {activeTab === 'layout' && (
          <ReceiptLayoutEditor />
        )}

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
              <AlertDialogTitle>Excluir impressora?</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir a impressora "{printerToDelete?.name}"? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={deleting}
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}