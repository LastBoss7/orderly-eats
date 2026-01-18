import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  ChevronRight,
  ArrowLeft,
  Loader2,
  Volume2,
  VolumeX,
  Bell,
  Truck,
  UtensilsCrossed,
  ShoppingBag,
  Store,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { playDoubleBell } from '@/lib/restaurantBell';

interface SoundSettings {
  id?: string;
  sound_enabled: boolean;
  sound_delivery: boolean;
  sound_table: boolean;
  sound_counter: boolean;
  sound_takeaway: boolean;
}

export default function SoundSettings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { restaurant } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [settings, setSettings] = useState<SoundSettings>({
    sound_enabled: true,
    sound_delivery: true,
    sound_table: true,
    sound_counter: true,
    sound_takeaway: true,
  });

  useEffect(() => {
    fetchSettings();
  }, [restaurant?.id]);

  const fetchSettings = async () => {
    if (!restaurant?.id) return;

    try {
      const { data, error } = await supabase
        .from('salon_settings')
        .select('id, sound_enabled, sound_delivery, sound_table, sound_counter, sound_takeaway')
        .eq('restaurant_id', restaurant.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings({
          id: data.id,
          sound_enabled: data.sound_enabled ?? true,
          sound_delivery: data.sound_delivery ?? true,
          sound_table: data.sound_table ?? true,
          sound_counter: data.sound_counter ?? true,
          sound_takeaway: data.sound_takeaway ?? true,
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key: keyof SoundSettings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const playTestSound = useCallback(() => {
    playDoubleBell(0.6);
    toast({
      title: '🔔 Som de teste',
      description: 'Este é o som que será tocado para novos pedidos.',
    });
  }, [toast]);

  const handleSave = async () => {
    if (!restaurant?.id) return;

    setSaving(true);

    try {
      const payload = {
        restaurant_id: restaurant.id,
        sound_enabled: settings.sound_enabled,
        sound_delivery: settings.sound_delivery,
        sound_table: settings.sound_table,
        sound_counter: settings.sound_counter,
        sound_takeaway: settings.sound_takeaway,
      };

      if (settings.id) {
        const { error } = await supabase
          .from('salon_settings')
          .update(payload)
          .eq('id', settings.id);

        if (error) throw error;
      } else {
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
        description: 'As configurações de som foram atualizadas.',
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

  const soundOptions = [
    {
      key: 'sound_delivery' as const,
      icon: Truck,
      title: 'Pedidos Delivery',
      description: 'Tocar som para novos pedidos de entrega',
      color: 'text-orange-500',
    },
    {
      key: 'sound_table' as const,
      icon: UtensilsCrossed,
      title: 'Pedidos Mesa',
      description: 'Tocar som para novos pedidos de mesa',
      color: 'text-blue-500',
    },
    {
      key: 'sound_counter' as const,
      icon: Store,
      title: 'Pedidos Balcão',
      description: 'Tocar som para novos pedidos de balcão',
      color: 'text-green-500',
    },
    {
      key: 'sound_takeaway' as const,
      icon: ShoppingBag,
      title: 'Pedidos Retirada',
      description: 'Tocar som para novos pedidos para retirar',
      color: 'text-purple-500',
    },
  ];

  return (
    <DashboardLayout>
      <div className="p-6 max-w-3xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <span>Início</span>
          <ChevronRight className="w-4 h-4" />
          <span className="text-foreground font-medium">Configurações de Som</span>
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
            <h1 className="text-2xl font-bold text-foreground">Configurações de Som</h1>
            <p className="text-muted-foreground">
              Configure notificações sonoras para novos pedidos
            </p>
          </div>
          <Button variant="outline" onClick={playTestSound} className="gap-2">
            <Bell className="w-4 h-4" />
            Testar Som
          </Button>
        </div>

        {/* Main Settings Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {settings.sound_enabled ? (
                  <Volume2 className="w-6 h-6 text-primary" />
                ) : (
                  <VolumeX className="w-6 h-6 text-muted-foreground" />
                )}
                <div>
                  <CardTitle>Sons de Notificação</CardTitle>
                  <CardDescription>
                    Ative ou desative todos os sons de notificação
                  </CardDescription>
                </div>
              </div>
              <Switch
                checked={settings.sound_enabled}
                onCheckedChange={() => handleToggle('sound_enabled')}
              />
            </div>
          </CardHeader>
        </Card>

        {/* Individual Sound Options */}
        <Card className={!settings.sound_enabled ? 'opacity-50 pointer-events-none' : ''}>
          <CardHeader>
            <CardTitle className="text-lg">Por Tipo de Pedido</CardTitle>
            <CardDescription>
              Escolha quais tipos de pedido devem tocar notificação sonora
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {soundOptions.map((option, index) => (
              <div key={option.key}>
                {index > 0 && <Separator className="my-4" />}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-muted ${option.color}`}>
                      <option.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <Label className="text-base font-medium">{option.title}</Label>
                      <p className="text-sm text-muted-foreground">{option.description}</p>
                    </div>
                  </div>
                  <Switch
                    checked={settings[option.key]}
                    onCheckedChange={() => handleToggle(option.key)}
                    disabled={!settings.sound_enabled}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end mt-6">
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Salvar Configurações
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
