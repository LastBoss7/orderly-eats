import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Plus, 
  Minus, 
  HelpCircle,
  ChevronRight,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface SalonSettings {
  id?: string;
  has_dining_room: boolean;
  table_count: number;
  order_tab_count: number;
  has_waiters: boolean;
  operation_type: string | null;
  service_table: boolean;
  service_individual: boolean;
  service_counter: boolean;
  service_self: boolean;
}

export default function SalonData() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { restaurant } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [settings, setSettings] = useState<SalonSettings>({
    has_dining_room: false,
    table_count: 0,
    order_tab_count: 0,
    has_waiters: false,
    operation_type: null,
    service_table: false,
    service_individual: false,
    service_counter: false,
    service_self: false,
  });

  useEffect(() => {
    fetchSettings();
  }, [restaurant?.id]);

  const fetchSettings = async () => {
    if (!restaurant?.id) return;

    try {
      const { data, error } = await supabase
        .from('salon_settings')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings({
          id: data.id,
          has_dining_room: data.has_dining_room || false,
          table_count: data.table_count || 0,
          order_tab_count: data.order_tab_count || 0,
          has_waiters: data.has_waiters || false,
          operation_type: data.operation_type,
          service_table: data.service_table || false,
          service_individual: data.service_individual || false,
          service_counter: data.service_counter || false,
          service_self: data.service_self || false,
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTableCountChange = (delta: number) => {
    setSettings(prev => ({ ...prev, table_count: Math.max(0, prev.table_count + delta) }));
  };

  const handleOrderTabCountChange = (delta: number) => {
    setSettings(prev => ({ ...prev, order_tab_count: Math.max(0, prev.order_tab_count + delta) }));
  };

  const handleSave = async () => {
    if (!restaurant?.id) return;

    setSaving(true);

    try {
      const payload = {
        restaurant_id: restaurant.id,
        has_dining_room: settings.has_dining_room,
        table_count: settings.table_count,
        order_tab_count: settings.order_tab_count,
        has_waiters: settings.has_waiters,
        operation_type: settings.operation_type,
        service_table: settings.service_table,
        service_individual: settings.service_individual,
        service_counter: settings.service_counter,
        service_self: settings.service_self,
      };

      if (settings.id) {
        // Update existing
        const { error } = await supabase
          .from('salon_settings')
          .update(payload)
          .eq('id', settings.id);

        if (error) throw error;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('salon_settings')
          .insert(payload)
          .select()
          .single();

        if (error) throw error;
        setSettings(prev => ({ ...prev, id: data.id }));
      }

      toast({
        title: 'Configurações salvas',
        description: 'As configurações do salão foram atualizadas com sucesso.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: error.message,
      });
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
      <div className="p-6 max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <span>Início</span>
          <ChevronRight className="w-4 h-4" />
          <span 
            className="cursor-pointer hover:text-foreground"
            onClick={() => navigate('/salon-settings')}
          >
            Gestão do Salão
          </span>
          <ChevronRight className="w-4 h-4" />
          <span className="text-foreground font-medium">Dados do Salão</span>
        </div>

        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/salon-settings')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dados do Salão</h1>
            <p className="text-muted-foreground">
              Defina informações da sua operação no Salão.
            </p>
          </div>
        </div>

        {/* Main Card */}
        <Card>
          <CardContent className="pt-6 space-y-8">
            {/* Atendimento de Salão */}
            <div className="space-y-4">
              <fieldset className="border rounded-lg p-4">
                <legend className="text-sm font-medium text-muted-foreground px-2">
                  Atendimento de Salão
                </legend>
                <div className="space-y-3">
                  <Label className="text-base font-medium">
                    Você tem atendimento de salão no seu estabelecimento? *
                  </Label>
                  <RadioGroup 
                    value={settings.has_dining_room ? 'yes' : 'no'} 
                    onValueChange={(v) => setSettings(prev => ({ ...prev, has_dining_room: v === 'yes' }))}
                    className="flex gap-6"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="dining-yes" />
                      <Label htmlFor="dining-yes">Sim</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="dining-no" />
                      <Label htmlFor="dining-no">Não</Label>
                    </div>
                  </RadioGroup>
                </div>
              </fieldset>
            </div>

            {settings.has_dining_room && (
              <>
                {/* Estrutura e Modelo de Negócio */}
                <fieldset className="border rounded-lg p-4">
                  <legend className="text-sm font-medium text-muted-foreground px-2">
                    Estrutura e Modelo de Negócio
                  </legend>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Quantidade de mesas */}
                    <div className="space-y-3">
                      <Label className="text-base font-medium">Quantidade de mesas</Label>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => handleTableCountChange(-1)}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <div className="w-16 text-center text-xl font-semibold">
                          {settings.table_count}
                        </div>
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => handleTableCountChange(1)}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Mesas no seu estabelecimento
                      </p>
                    </div>

                    {/* Quantidade de comandas */}
                    <div className="space-y-3">
                      <Label className="text-base font-medium">Quantidade de comandas</Label>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => handleOrderTabCountChange(-1)}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <div className="w-16 text-center text-xl font-semibold">
                          {settings.order_tab_count}
                        </div>
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => handleOrderTabCountChange(1)}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Comandas no estabelecimento
                      </p>
                    </div>

                    {/* Possui Garçons */}
                    <div className="space-y-3">
                      <Label className="text-base font-medium">Possui Garçons? *</Label>
                      <RadioGroup 
                        value={settings.has_waiters ? 'yes' : 'no'} 
                        onValueChange={(v) => setSettings(prev => ({ ...prev, has_waiters: v === 'yes' }))}
                        className="flex gap-6"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="yes" id="waiters-yes" />
                          <Label htmlFor="waiters-yes">Sim</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="no" id="waiters-no" />
                          <Label htmlFor="waiters-no">Não</Label>
                        </div>
                      </RadioGroup>
                      <p className="text-sm text-muted-foreground">
                        Garçons do seu estabelecimento
                      </p>
                    </div>
                  </div>
                </fieldset>

                <Separator />

                {/* Como você opera? */}
                <div className="space-y-4">
                  <Label className="text-base font-medium">
                    Como você opera? * (Selecione apenas 1 opção, considere a principal)
                  </Label>
                  <RadioGroup 
                    value={settings.operation_type || ''} 
                    onValueChange={(v) => setSettings(prev => ({ ...prev, operation_type: v }))}
                    className="grid grid-cols-1 md:grid-cols-3 gap-4"
                  >
                    <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <RadioGroupItem value="a-la-carte" id="op-alacarte" className="mt-1" />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="op-alacarte" className="font-medium cursor-pointer">
                            À la carte
                          </Label>
                          <Tooltip>
                            <TooltipTrigger>
                              <HelpCircle className="w-4 h-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              Cardápio com itens individuais para escolha
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Cardápio físico ou digital
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <RadioGroupItem value="buffet" id="op-buffet" className="mt-1" />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="op-buffet" className="font-medium cursor-pointer">
                            Buffet/Self Service
                          </Label>
                          <Tooltip>
                            <TooltipTrigger>
                              <HelpCircle className="w-4 h-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              Cliente se serve sozinho
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Preço único ou por quilo (Kg)
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <RadioGroupItem value="rodizio" id="op-rodizio" className="mt-1" />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="op-rodizio" className="font-medium cursor-pointer">
                            Rodízio
                          </Label>
                          <Tooltip>
                            <TooltipTrigger>
                              <HelpCircle className="w-4 h-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              Garçons servem variedades continuamente
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Garçons oferecem variedades
                        </p>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                <Separator />

                {/* Como você atende seu cliente */}
                <div className="space-y-4">
                  <Label className="text-base font-medium">
                    Como você atende o seu cliente no salão? * (Selecione 1 opção ou mais)
                  </Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <Checkbox 
                        id="service-table" 
                        checked={settings.service_table}
                        onCheckedChange={(checked) => setSettings(prev => ({ ...prev, service_table: !!checked }))}
                      />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="service-table" className="font-medium cursor-pointer">
                            Em mesa
                          </Label>
                          <Tooltip>
                            <TooltipTrigger>
                              <HelpCircle className="w-4 h-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              Garçom vai até a mesa do cliente
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Garçom se dirige ao cliente nas mesas
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <Checkbox 
                        id="service-individual" 
                        checked={settings.service_individual}
                        onCheckedChange={(checked) => setSettings(prev => ({ ...prev, service_individual: !!checked }))}
                      />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="service-individual" className="font-medium cursor-pointer">
                            Comanda individual
                          </Label>
                          <Tooltip>
                            <TooltipTrigger>
                              <HelpCircle className="w-4 h-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              Cada cliente tem sua própria comanda
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Registra o consumo de cada cliente
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <Checkbox 
                        id="service-counter" 
                        checked={settings.service_counter}
                        onCheckedChange={(checked) => setSettings(prev => ({ ...prev, service_counter: !!checked }))}
                      />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="service-counter" className="font-medium cursor-pointer">
                            No Balcão
                          </Label>
                          <Tooltip>
                            <TooltipTrigger>
                              <HelpCircle className="w-4 h-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              Cliente faz pedido diretamente no balcão
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Cliente se dirige ao balcão
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <Checkbox 
                        id="service-self" 
                        checked={settings.service_self}
                        onCheckedChange={(checked) => setSettings(prev => ({ ...prev, service_self: !!checked }))}
                      />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="service-self" className="font-medium cursor-pointer">
                            Auto atendimento
                          </Label>
                          <Tooltip>
                            <TooltipTrigger>
                              <HelpCircle className="w-4 h-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              Cliente faz pedido por dispositivo
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Cliente pede através de dispositivo eletrônico
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Action Buttons */}
            <div className="flex justify-center gap-4 pt-6">
              <Button 
                variant="outline" 
                className="min-w-[120px]"
                onClick={() => navigate('/salon-settings')}
              >
                Cancelar
              </Button>
              <Button 
                className="min-w-[120px]"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
