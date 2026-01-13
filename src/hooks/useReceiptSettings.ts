import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export interface ReceiptSettings {
  receipt_header: string | null;
  receipt_footer: string | null;
  show_address_on_receipt: boolean;
  show_phone_on_receipt: boolean;
  show_cnpj_on_receipt: boolean;
}

export interface RestaurantInfo {
  name: string;
  phone: string | null;
  address: string | null;
  cnpj: string | null;
  logo_url: string | null;
}

export function useReceiptSettings() {
  const { restaurant } = useAuth();
  const [settings, setSettings] = useState<ReceiptSettings>({
    receipt_header: null,
    receipt_footer: null,
    show_address_on_receipt: true,
    show_phone_on_receipt: true,
    show_cnpj_on_receipt: true,
  });
  const [restaurantInfo, setRestaurantInfo] = useState<RestaurantInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (restaurant?.id) {
      fetchSettings();
    }
  }, [restaurant?.id]);

  const fetchSettings = async () => {
    if (!restaurant?.id) return;

    try {
      // Fetch restaurant info
      const { data: restData } = await supabase
        .from('restaurants')
        .select('name, phone, address, cnpj, logo_url')
        .eq('id', restaurant.id)
        .single();

      if (restData) {
        setRestaurantInfo(restData);
      }

      // Fetch print settings
      const { data: salonData } = await supabase
        .from('salon_settings')
        .select('receipt_header, receipt_footer, show_address_on_receipt, show_phone_on_receipt, show_cnpj_on_receipt')
        .eq('restaurant_id', restaurant.id)
        .maybeSingle();

      if (salonData) {
        setSettings({
          receipt_header: salonData.receipt_header,
          receipt_footer: salonData.receipt_footer,
          show_address_on_receipt: salonData.show_address_on_receipt ?? true,
          show_phone_on_receipt: salonData.show_phone_on_receipt ?? true,
          show_cnpj_on_receipt: salonData.show_cnpj_on_receipt ?? true,
        });
      }
    } catch (error) {
      console.error('Error fetching receipt settings:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    settings,
    restaurantInfo,
    loading,
    refetch: fetchSettings,
  };
}
