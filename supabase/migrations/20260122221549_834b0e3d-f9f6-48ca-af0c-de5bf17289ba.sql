-- ===========================================
-- SISTEMA DE ESTOQUE PREMIUM - GAMAKO
-- ===========================================

-- 1. Tabela de unidades de medida
CREATE TABLE public.measurement_units (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  abbreviation TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'unit', -- 'unit', 'weight', 'volume'
  base_conversion NUMERIC DEFAULT 1, -- conversão para unidade base (ex: 1000g = 1kg)
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Tabela de itens de estoque (ingredientes/insumos)
CREATE TABLE public.inventory_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  sku TEXT, -- código do produto
  unit_id UUID REFERENCES public.measurement_units(id),
  unit_name TEXT NOT NULL DEFAULT 'un', -- unidade simplificada
  current_stock NUMERIC NOT NULL DEFAULT 0,
  minimum_stock NUMERIC DEFAULT 0, -- estoque mínimo para alerta
  maximum_stock NUMERIC, -- estoque máximo
  cost_price NUMERIC DEFAULT 0, -- custo unitário
  supplier TEXT, -- fornecedor
  category TEXT, -- categoria do item
  is_active BOOLEAN DEFAULT true,
  last_restock_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Tabela de fichas técnicas (composição de produtos)
CREATE TABLE public.product_recipes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  product_size TEXT, -- para produtos com tamanhos: 'small', 'medium', 'large'
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL, -- quantidade do ingrediente usada
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(product_id, product_size, inventory_item_id)
);

-- 4. Tabela de movimentações de estoque (histórico)
CREATE TABLE public.stock_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL, -- 'in' (entrada), 'out' (saída), 'adjustment', 'waste', 'transfer'
  quantity NUMERIC NOT NULL, -- positivo para entrada, negativo para saída
  previous_stock NUMERIC NOT NULL,
  new_stock NUMERIC NOT NULL,
  reason TEXT, -- motivo da movimentação
  reference_type TEXT, -- 'order', 'manual', 'restock', 'waste', 'inventory'
  reference_id UUID, -- ID do pedido, compra, etc.
  cost_price NUMERIC, -- custo unitário no momento
  total_cost NUMERIC, -- custo total da movimentação
  performed_by UUID, -- quem realizou a ação
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Tabela de alertas de estoque
CREATE TABLE public.stock_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL, -- 'low_stock', 'out_of_stock', 'expiring'
  threshold NUMERIC, -- valor que disparou o alerta
  current_value NUMERIC NOT NULL,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  read_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. Índices para performance
CREATE INDEX idx_inventory_items_restaurant ON public.inventory_items(restaurant_id);
CREATE INDEX idx_inventory_items_active ON public.inventory_items(restaurant_id, is_active);
CREATE INDEX idx_inventory_items_low_stock ON public.inventory_items(restaurant_id) WHERE current_stock <= minimum_stock;
CREATE INDEX idx_product_recipes_product ON public.product_recipes(product_id);
CREATE INDEX idx_product_recipes_inventory ON public.product_recipes(inventory_item_id);
CREATE INDEX idx_stock_movements_item ON public.stock_movements(inventory_item_id);
CREATE INDEX idx_stock_movements_date ON public.stock_movements(created_at DESC);
CREATE INDEX idx_stock_alerts_unread ON public.stock_alerts(restaurant_id, is_read) WHERE is_read = false;

-- 7. Enable RLS
ALTER TABLE public.measurement_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_alerts ENABLE ROW LEVEL SECURITY;

-- 8. RLS Policies - measurement_units
CREATE POLICY "Users can view measurement units in their restaurant" 
  ON public.measurement_units FOR SELECT 
  USING (restaurant_id = get_user_restaurant_id(auth.uid()));

CREATE POLICY "Users can manage measurement units in their restaurant" 
  ON public.measurement_units FOR ALL 
  USING (restaurant_id = get_user_restaurant_id(auth.uid()));

-- 9. RLS Policies - inventory_items
CREATE POLICY "Users can view inventory items in their restaurant" 
  ON public.inventory_items FOR SELECT 
  USING (restaurant_id = get_user_restaurant_id(auth.uid()));

CREATE POLICY "Users can manage inventory items in their restaurant" 
  ON public.inventory_items FOR ALL 
  USING (restaurant_id = get_user_restaurant_id(auth.uid()));

-- 10. RLS Policies - product_recipes
CREATE POLICY "Users can view product recipes in their restaurant" 
  ON public.product_recipes FOR SELECT 
  USING (restaurant_id = get_user_restaurant_id(auth.uid()));

CREATE POLICY "Users can manage product recipes in their restaurant" 
  ON public.product_recipes FOR ALL 
  USING (restaurant_id = get_user_restaurant_id(auth.uid()));

-- 11. RLS Policies - stock_movements
CREATE POLICY "Users can view stock movements in their restaurant" 
  ON public.stock_movements FOR SELECT 
  USING (restaurant_id = get_user_restaurant_id(auth.uid()));

CREATE POLICY "Users can create stock movements in their restaurant" 
  ON public.stock_movements FOR INSERT 
  WITH CHECK (restaurant_id = get_user_restaurant_id(auth.uid()));

-- 12. RLS Policies - stock_alerts
CREATE POLICY "Users can view stock alerts in their restaurant" 
  ON public.stock_alerts FOR SELECT 
  USING (restaurant_id = get_user_restaurant_id(auth.uid()));

CREATE POLICY "Users can manage stock alerts in their restaurant" 
  ON public.stock_alerts FOR ALL 
  USING (restaurant_id = get_user_restaurant_id(auth.uid()));

-- 13. Trigger para atualizar updated_at
CREATE TRIGGER update_measurement_units_updated_at
  BEFORE UPDATE ON public.measurement_units
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_inventory_items_updated_at
  BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_product_recipes_updated_at
  BEFORE UPDATE ON public.product_recipes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 14. Função para dar baixa automática no estoque quando pedido é criado
CREATE OR REPLACE FUNCTION public.process_stock_deduction()
RETURNS TRIGGER AS $$
DECLARE
  recipe RECORD;
  current_item RECORD;
  deduction_qty NUMERIC;
BEGIN
  -- Só processa quando o pedido muda para status 'preparing' ou quando é criado com status 'preparing'
  IF (TG_OP = 'UPDATE' AND OLD.status != 'preparing' AND NEW.status = 'preparing') OR
     (TG_OP = 'INSERT' AND NEW.status = 'preparing') THEN
    
    -- Para cada item do pedido
    FOR current_item IN 
      SELECT oi.product_id, oi.quantity, oi.product_size
      FROM public.order_items oi
      WHERE oi.order_id = NEW.id AND oi.product_id IS NOT NULL
    LOOP
      -- Para cada ingrediente na ficha técnica do produto
      FOR recipe IN
        SELECT pr.inventory_item_id, pr.quantity as recipe_qty
        FROM public.product_recipes pr
        WHERE pr.product_id = current_item.product_id
          AND (pr.product_size IS NULL OR pr.product_size = current_item.product_size)
      LOOP
        deduction_qty := recipe.recipe_qty * current_item.quantity;
        
        -- Atualiza o estoque
        UPDATE public.inventory_items
        SET current_stock = current_stock - deduction_qty
        WHERE id = recipe.inventory_item_id;
        
        -- Registra a movimentação
        INSERT INTO public.stock_movements (
          restaurant_id, inventory_item_id, movement_type, quantity,
          previous_stock, new_stock, reason, reference_type, reference_id
        )
        SELECT 
          NEW.restaurant_id,
          recipe.inventory_item_id,
          'out',
          -deduction_qty,
          ii.current_stock + deduction_qty,
          ii.current_stock,
          'Baixa automática - Pedido #' || COALESCE(NEW.order_number::text, NEW.id::text),
          'order',
          NEW.id
        FROM public.inventory_items ii
        WHERE ii.id = recipe.inventory_item_id;
      END LOOP;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 15. Criar trigger para baixa automática
CREATE TRIGGER process_order_stock_deduction
  AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.process_stock_deduction();

-- 16. Função para verificar estoque baixo e criar alertas
CREATE OR REPLACE FUNCTION public.check_low_stock_alerts()
RETURNS TRIGGER AS $$
BEGIN
  -- Verifica se estoque está abaixo do mínimo
  IF NEW.current_stock <= NEW.minimum_stock AND NEW.minimum_stock > 0 THEN
    -- Verifica se já não existe alerta não lido para este item
    IF NOT EXISTS (
      SELECT 1 FROM public.stock_alerts 
      WHERE inventory_item_id = NEW.id 
        AND alert_type = CASE WHEN NEW.current_stock <= 0 THEN 'out_of_stock' ELSE 'low_stock' END
        AND is_read = false
    ) THEN
      INSERT INTO public.stock_alerts (
        restaurant_id, inventory_item_id, alert_type, threshold, current_value
      ) VALUES (
        NEW.restaurant_id,
        NEW.id,
        CASE WHEN NEW.current_stock <= 0 THEN 'out_of_stock' ELSE 'low_stock' END,
        NEW.minimum_stock,
        NEW.current_stock
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 17. Trigger para alertas de estoque baixo
CREATE TRIGGER check_inventory_low_stock
  AFTER UPDATE ON public.inventory_items
  FOR EACH ROW
  WHEN (NEW.current_stock IS DISTINCT FROM OLD.current_stock)
  EXECUTE FUNCTION public.check_low_stock_alerts();

-- 18. Enable realtime for inventory tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_alerts;