-- Adicionar política SELECT para pedidos do cardápio digital (permite o .select() após insert)
CREATE POLICY "Public can view digital menu orders after creation"
ON public.orders
FOR SELECT
USING (
  order_type = 'digital_menu' 
  AND created_at > (now() - interval '5 minutes')
);

-- Adicionar política SELECT para order_items do cardápio digital
CREATE POLICY "Public can view digital menu order items"
ON public.order_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders o 
    WHERE o.id = order_items.order_id 
    AND o.order_type = 'digital_menu'
    AND o.created_at > (now() - interval '5 minutes')
  )
);