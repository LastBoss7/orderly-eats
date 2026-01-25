-- ==============================================
-- INTEGRAÇÃO IFOOD: TABELAS E CONFIGURAÇÕES
-- ==============================================

-- Criar tabela de configurações iFood por restaurante
CREATE TABLE public.ifood_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  is_enabled boolean NOT NULL DEFAULT false,
  merchant_id text,
  access_token text,
  refresh_token text,
  token_expires_at timestamp with time zone,
  auto_accept_orders boolean NOT NULL DEFAULT false,
  sync_status text NOT NULL DEFAULT 'disconnected',
  webhook_secret text,
  last_sync_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(restaurant_id)
);

-- Criar tabela de pedidos iFood
CREATE TABLE public.ifood_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  ifood_order_id text NOT NULL,
  ifood_display_id text,
  order_data jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  local_order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  expires_at timestamp with time zone,
  rejection_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(restaurant_id, ifood_order_id)
);

-- Habilitar RLS
ALTER TABLE public.ifood_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ifood_orders ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para ifood_settings
CREATE POLICY "Restaurant owners can manage ifood settings"
  ON public.ifood_settings
  FOR ALL
  USING (restaurant_id = get_user_restaurant_id(auth.uid()));

CREATE POLICY "Restaurant owners can view ifood settings"
  ON public.ifood_settings
  FOR SELECT
  USING (restaurant_id = get_user_restaurant_id(auth.uid()));

-- Políticas RLS para ifood_orders
CREATE POLICY "Restaurant owners can manage ifood orders"
  ON public.ifood_orders
  FOR ALL
  USING (restaurant_id = get_user_restaurant_id(auth.uid()));

CREATE POLICY "Restaurant owners can view ifood orders"
  ON public.ifood_orders
  FOR SELECT
  USING (restaurant_id = get_user_restaurant_id(auth.uid()));

-- Políticas para Edge Functions (webhook público)
CREATE POLICY "Public can insert ifood orders via webhook"
  ON public.ifood_orders
  FOR INSERT
  WITH CHECK (
    restaurant_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM restaurants
      WHERE restaurants.id = ifood_orders.restaurant_id
      AND restaurants.is_active = true
    )
  );

CREATE POLICY "Public can update ifood orders via edge function"
  ON public.ifood_orders
  FOR UPDATE
  USING (
    restaurant_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM restaurants
      WHERE restaurants.id = ifood_orders.restaurant_id
      AND restaurants.is_active = true
    )
  );

-- Triggers para updated_at
CREATE TRIGGER update_ifood_settings_updated_at
  BEFORE UPDATE ON public.ifood_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ifood_orders_updated_at
  BEFORE UPDATE ON public.ifood_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_ifood_orders_restaurant_status ON public.ifood_orders(restaurant_id, status);
CREATE INDEX idx_ifood_orders_ifood_order_id ON public.ifood_orders(ifood_order_id);
CREATE INDEX idx_ifood_orders_created_at ON public.ifood_orders(created_at DESC);

-- Habilitar Realtime para ifood_orders
ALTER PUBLICATION supabase_realtime ADD TABLE public.ifood_orders;

-- Adicionar 'ifood' como tipo de pedido válido (se ainda não existir)
-- Verificar constraint atual e atualizar
DO $$
BEGIN
  -- Tentar remover constraint antiga se existir
  ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_order_type_check;
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END $$;

-- Adicionar nova constraint com 'ifood'
ALTER TABLE orders ADD CONSTRAINT orders_order_type_check 
  CHECK (order_type IN ('table', 'tab', 'counter', 'delivery', 'takeaway', 'ifood', 'conference', 'closing', 'test'));