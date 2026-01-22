import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronRight,
  ArrowLeft,
  Loader2,
  Save,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { OpeningHoursEditor, DaySchedule, defaultOpeningHours, isRestaurantOpen } from '@/components/settings/OpeningHoursEditor';

export default function OpeningHoursSettings() {
  const navigate = useNavigate();
  const { restaurant } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [openingHours, setOpeningHours] = useState<DaySchedule[]>(defaultOpeningHours);
  const [useOpeningHours, setUseOpeningHours] = useState(false);

  const openStatus = isRestaurantOpen(openingHours, useOpeningHours);

  useEffect(() => {
    if (restaurant?.id) {
      fetchData();
    }
  }, [restaurant?.id]);

  const fetchData = async () => {
    if (!restaurant?.id) return;

    try {
      const { data: salonData } = await supabase
        .from('salon_settings')
        .select('opening_hours, use_opening_hours')
        .eq('restaurant_id', restaurant.id)
        .maybeSingle();

      if (salonData) {
        setOpeningHours((salonData.opening_hours as unknown as DaySchedule[]) ?? defaultOpeningHours);
        setUseOpeningHours(salonData.use_opening_hours ?? false);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!restaurant?.id) return;

    setSaving(true);

    try {
      const { data: existingSettings } = await supabase
        .from('salon_settings')
        .select('id')
        .eq('restaurant_id', restaurant.id)
        .maybeSingle();

      const updateData = {
        opening_hours: openingHours as unknown as Record<string, unknown>[],
        use_opening_hours: useOpeningHours,
      };

      if (existingSettings) {
        const { error } = await supabase
          .from('salon_settings')
          .update(updateData as any)
          .eq('restaurant_id', restaurant.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('salon_settings')
          .insert({
            restaurant_id: restaurant.id,
            ...updateData,
          } as any);

        if (error) throw error;
      }

      toast.success('Horários salvos com sucesso!');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Erro ao salvar horários');
    } finally {
      setSaving(false);
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
      <div className="p-6 max-w-3xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <span>Início</span>
          <ChevronRight className="w-4 h-4" />
          <span className="text-foreground font-medium">Horário de Funcionamento</span>
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
            <h1 className="text-2xl font-bold text-foreground">Horário de Funcionamento</h1>
            <p className="text-muted-foreground">
              Configure quando seu estabelecimento está aberto
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Current Status */}
          <Card className={useOpeningHours ? (openStatus.isOpen ? 'border-success/50 bg-success/5' : 'border-destructive/50 bg-destructive/5') : ''}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="w-5 h-5" />
                Status Atual
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Badge 
                  variant="outline" 
                  className={`text-sm px-3 py-1 ${
                    !useOpeningHours 
                      ? 'border-muted-foreground text-muted-foreground' 
                      : openStatus.isOpen 
                        ? 'border-success text-success bg-success/10' 
                        : 'border-destructive text-destructive bg-destructive/10'
                  }`}
                >
                  {!useOpeningHours ? 'Horário não configurado' : openStatus.isOpen ? 'Aberto' : 'Fechado'}
                </Badge>
                {useOpeningHours && (
                  <span className="text-sm text-muted-foreground">
                    {openStatus.message}
                  </span>
                )}
              </div>
              {!useOpeningHours && (
                <p className="text-sm text-muted-foreground mt-3">
                  Ative o horário de funcionamento abaixo para controlar quando seu estabelecimento aceita pedidos.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Opening Hours Editor */}
          <OpeningHoursEditor
            hours={openingHours}
            onChange={setOpeningHours}
            useOpeningHours={useOpeningHours}
            onToggleUse={setUseOpeningHours}
          />

          {/* Info Card */}
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <Clock className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    <strong>Como funciona:</strong>
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Quando ativado, o cardápio digital mostrará se você está aberto ou fechado</li>
                    <li>Clientes não poderão finalizar pedidos fora do horário de funcionamento</li>
                    <li>O horário é baseado no fuso horário do Brasil (Brasília)</li>
                    <li>Desative dias específicos para feriados ou folgas</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar Horários
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
