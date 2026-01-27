-- Adicionar campos para rastreamento e ciclo de vida completo do iFood
ALTER TABLE ifood_orders 
  ADD COLUMN IF NOT EXISTS driver_name text,
  ADD COLUMN IF NOT EXISTS driver_phone text,
  ADD COLUMN IF NOT EXISTS pickup_code text,
  ADD COLUMN IF NOT EXISTS tracking_available boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS order_timing text DEFAULT 'IMMEDIATE',
  ADD COLUMN IF NOT EXISTS preparation_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_by text,
  ADD COLUMN IF NOT EXISTS order_type text DEFAULT 'DELIVERY',
  ADD COLUMN IF NOT EXISTS scheduled_to timestamptz,
  ADD COLUMN IF NOT EXISTS preparation_start_datetime timestamptz;

-- Adicionar constraint para order_timing
ALTER TABLE ifood_orders 
  DROP CONSTRAINT IF EXISTS ifood_orders_order_timing_check;
ALTER TABLE ifood_orders 
  ADD CONSTRAINT ifood_orders_order_timing_check 
  CHECK (order_timing IN ('IMMEDIATE', 'SCHEDULED'));

-- Adicionar constraint para delivered_by
ALTER TABLE ifood_orders 
  DROP CONSTRAINT IF EXISTS ifood_orders_delivered_by_check;
ALTER TABLE ifood_orders 
  ADD CONSTRAINT ifood_orders_delivered_by_check 
  CHECK (delivered_by IS NULL OR delivered_by IN ('IFOOD', 'MERCHANT'));

-- Adicionar constraint para order_type
ALTER TABLE ifood_orders 
  DROP CONSTRAINT IF EXISTS ifood_orders_order_type_check;
ALTER TABLE ifood_orders 
  ADD CONSTRAINT ifood_orders_order_type_check 
  CHECK (order_type IS NULL OR order_type IN ('DELIVERY', 'TAKEOUT', 'DINE_IN'));