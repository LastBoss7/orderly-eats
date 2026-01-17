import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/auth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { usePrinters, Printer } from '@/hooks/usePrinters';
import { PrinterModal } from '@/components/printers/PrinterModal';
import { PrinterConfigCard } from '@/components/printers/PrinterConfigCard';
import { ReceiptLayoutEditor } from '@/components/printers/ReceiptLayoutEditor';
import { SpecialPrinterSettings } from '@/components/printers/SpecialPrinterSettings';
import {
  Copy,
  CheckCircle2,
  Printer as PrinterIcon,
  Loader2,
  Plus,
  AlertTriangle,
  LayoutTemplate,
  Settings,
} from 'lucide-react';

export default function Printers() {
  const { profile } = useAuth();
  const { printers, loading: loadingPrinters, addPrinter, updatePrinter, deletePrinter, refetch } = usePrinters();
  
  const [copiedId, setCopiedId] = useState(false);
  const [activeTab, setActiveTab] = useState<'config' | 'layout'>('config');
  
  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

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
      await addPrinter(data);
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Impressoras</h1>
            <p className="text-muted-foreground">Configure quais pedidos cada impressora deve imprimir</p>
          </div>
          {activeTab === 'config' && (
            <Button onClick={() => setModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar
            </Button>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 border-b">
          <button
            onClick={() => setActiveTab('config')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 -mb-px ${
              activeTab === 'config'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
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
        {activeTab === 'config' && (
          <div className="space-y-4">
            {/* Restaurant ID Card - Compact */}
            <Card className="border-amber-500/30 bg-gradient-to-r from-amber-500/5 to-transparent">
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-amber-500/20">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground">
                      ID do Restaurante (cole no app Electron)
                    </p>
                    <code className="text-xs font-mono text-foreground break-all">
                      {profile?.restaurant_id || 'Carregando...'}
                    </code>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleCopyRestaurantId}
                    disabled={!profile?.restaurant_id}
                  >
                    {copiedId ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Info Card - Separação Automática */}
            {printers.length > 0 && (
              <Card className="border-blue-500/30 bg-gradient-to-r from-blue-500/5 to-transparent">
                <CardContent className="py-4">
                  <div className="flex gap-3">
                    <div className="p-2 rounded-full bg-blue-500/20 shrink-0 h-fit">
                      <PrinterIcon className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-foreground mb-1">
                        Separação automática por categoria
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Configure uma impressora para <strong>Cozinha</strong> e outra para <strong>Bar</strong>.
                        O sistema vai separar automaticamente os itens de cada pedido e enviar 
                        para a impressora correta baseado nas categorias selecionadas.
                      </p>
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
                    Conecte o aplicativo Electron para detectar impressoras automaticamente,
                    ou adicione uma impressora manualmente.
                  </p>
                  <Button onClick={() => setModalOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Impressora
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Printers List */}
            {printers.map((printer) => (
              <PrinterConfigCard
                key={printer.id}
                printer={printer}
                onUpdate={refetch}
              />
            ))}

            {/* Special Printer Settings */}
            {printers.length > 0 && (
              <SpecialPrinterSettings printers={printers} loading={loadingPrinters} />
            )}
          </div>
        )}

        {activeTab === 'layout' && (
          <ReceiptLayoutEditor />
        )}

        {/* Add Printer Modal */}
        <PrinterModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          printer={null}
          onSave={handleSavePrinter}
          loading={saving}
        />
      </div>
    </DashboardLayout>
  );
}