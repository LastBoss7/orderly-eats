-- Permitir que o público veja taxas de entrega ativas de restaurantes ativos
CREATE POLICY "Public can view delivery fees of active restaurants"
ON public.delivery_fees
FOR SELECT
USING (
  is_active = true AND
  EXISTS (
    SELECT 1 FROM restaurants r 
    WHERE r.id = delivery_fees.restaurant_id 
    AND r.is_active = true
  )
);