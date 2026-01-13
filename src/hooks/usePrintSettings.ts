import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export interface PrintSettings {
  auto_print_counter: boolean;
  auto_print_table: boolean;
  auto_print_delivery: boolean;
}

const defaultSettings: PrintSettings = {
  auto_print_counter: true,
  auto_print_table: true,
  auto_print_delivery: true,
};

export function usePrintSettings() {
  const { restaurant } = useAuth();
  const [settings, setSettings] = useState<PrintSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    if (!restaurant?.id) return;

    const { data } = await supabase
      .from('salon_settings')
      .select('auto_print_counter, auto_print_table, auto_print_delivery')
      .eq('restaurant_id', restaurant.id)
      .maybeSingle();

    if (data) {
      setSettings({
        auto_print_counter: data.auto_print_counter ?? true,
        auto_print_table: data.auto_print_table ?? true,
        auto_print_delivery: data.auto_print_delivery ?? true,
      });
    }
    setLoading(false);
  }, [restaurant?.id]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = async (newSettings: Partial<PrintSettings>) => {
    if (!restaurant?.id) return false;

    const { data: existing } = await supabase
      .from('salon_settings')
      .select('id')
      .eq('restaurant_id', restaurant.id)
      .maybeSingle();

    const updatedSettings = { ...settings, ...newSettings };

    if (existing) {
      const { error } = await supabase
        .from('salon_settings')
        .update({
          auto_print_counter: updatedSettings.auto_print_counter,
          auto_print_table: updatedSettings.auto_print_table,
          auto_print_delivery: updatedSettings.auto_print_delivery,
        })
        .eq('restaurant_id', restaurant.id);

      if (error) return false;
    } else {
      const { error } = await supabase
        .from('salon_settings')
        .insert({
          restaurant_id: restaurant.id,
          auto_print_counter: updatedSettings.auto_print_counter,
          auto_print_table: updatedSettings.auto_print_table,
          auto_print_delivery: updatedSettings.auto_print_delivery,
        });

      if (error) return false;
    }

    setSettings(updatedSettings);
    return true;
  };

  const shouldAutoPrint = (orderType: string): boolean => {
    switch (orderType) {
      case 'counter':
        return settings.auto_print_counter;
      case 'table':
        return settings.auto_print_table;
      case 'delivery':
        return settings.auto_print_delivery;
      default:
        return true;
    }
  };

  return {
    settings,
    loading,
    updateSettings,
    shouldAutoPrint,
    refetch: fetchSettings,
  };
}
