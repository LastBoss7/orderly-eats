import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, ClipboardCheck, Calculator, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { Printer } from '@/hooks/usePrinters';

interface SpecialPrinterSettingsProps {
  printers: Printer[];
  loading: boolean;
}

export function SpecialPrinterSettings({ printers, loading }: SpecialPrinterSettingsProps) {
  const { restaurant } = useAuth();
  const [conferencePrinterId, setConferencePrinterId] = useState<string>('');
  const [closingPrinterId, setClosingPrinterId] = useState<string>('');
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch current settings
  useEffect(() => {
    const fetchSettings = async () => {
      if (!restaurant?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('salon_settings')
          .select('conference_printer_id, closing_printer_id')
          .eq('restaurant_id', restaurant.id)
          .single();

        if (error && error.code !== 'PGRST116') throw error;
        
        if (data) {
          setConferencePrinterId(data.conference_printer_id || '');
          setClosingPrinterId(data.closing_printer_id || '');
        }
      } catch (err) {
        console.error('Error fetching special printer settings:', err);
      } finally {
        setLoadingSettings(false);
      }
    };

    fetchSettings();
  }, [restaurant?.id]);

  const handleSave = async () => {
    if (!restaurant?.id) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('salon_settings')
        .update({
          conference_printer_id: conferencePrinterId || null,
          closing_printer_id: closingPrinterId || null,
        })
        .eq('restaurant_id', restaurant.id);

      if (error) throw error;
      
      toast.success('Configurações salvas!');
    } catch (err: any) {
      console.error('Error saving special printer settings:', err);
      toast.error('Erro ao salvar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Get active printers only
  const activePrinters = printers.filter(p => p.is_active);

  if (loadingSettings || loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5" />
          Impressoras Especiais
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Configure quais impressoras serão usadas para imprimir conferências (contas de mesa/comanda) e relatórios de fechamento de caixa.
        </p>

        {activePrinters.length === 0 ? (
          <div className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/20 p-4 rounded-lg">
            ⚠ Nenhuma impressora ativa cadastrada. Configure uma impressora primeiro.
          </div>
        ) : (
          <>
            {/* Conference Printer */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 font-medium">
                <ClipboardCheck className="w-4 h-4 text-blue-500" />
                Impressora de Conferência
              </Label>
              <p className="text-xs text-muted-foreground">
                Usada para imprimir contas de mesa, comandas e conferências.
              </p>
              <Select
                value={conferencePrinterId || 'none'}
                onValueChange={(value) => setConferencePrinterId(value === 'none' ? '' : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma impressora..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma (usar padrão do sistema)</SelectItem>
                  {activePrinters.map((printer) => (
                    <SelectItem key={printer.id} value={printer.id}>
                      {printer.name}
                      {printer.printer_name && (
                        <span className="text-muted-foreground ml-2 text-xs">
                          ({printer.printer_name})
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Closing Report Printer */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 font-medium">
                <Calculator className="w-4 h-4 text-green-500" />
                Impressora de Fechamento
              </Label>
              <p className="text-xs text-muted-foreground">
                Usada para imprimir relatórios de fechamento de caixa diário.
              </p>
              <Select
                value={closingPrinterId || 'none'}
                onValueChange={(value) => setClosingPrinterId(value === 'none' ? '' : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma impressora..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma (usar padrão do sistema)</SelectItem>
                  {activePrinters.map((printer) => (
                    <SelectItem key={printer.id} value={printer.id}>
                      {printer.name}
                      {printer.printer_name && (
                        <span className="text-muted-foreground ml-2 text-xs">
                          ({printer.printer_name})
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Save Button */}
            <div className="pt-2">
              <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Salvar Configurações
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
