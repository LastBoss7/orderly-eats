-- ===========================================
-- SECURITY FIX: Multi-tenant Data Isolation
-- ===========================================

-- 1. Fix printer_heartbeats - restrict to restaurant owner only
DROP POLICY IF EXISTS "Public read printer heartbeats" ON public.printer_heartbeats;
DROP POLICY IF EXISTS "Public update printer heartbeats" ON public.printer_heartbeats;
DROP POLICY IF EXISTS "Public insert printer heartbeats" ON public.printer_heartbeats;

-- Allow insert/update from Electron app (uses anon key with restaurant_id)
CREATE POLICY "Restaurant owner can view heartbeats"
ON public.printer_heartbeats FOR SELECT
USING (restaurant_id = get_user_restaurant_id(auth.uid()));

CREATE POLICY "Restaurant owner can update heartbeats"
ON public.printer_heartbeats FOR UPDATE
USING (restaurant_id = get_user_restaurant_id(auth.uid()));

-- Allow unauthenticated insert/update for Electron app (validates restaurant exists)
CREATE POLICY "Electron app can insert heartbeats"
ON public.printer_heartbeats FOR INSERT
WITH CHECK (
  restaurant_id IS NOT NULL 
  AND EXISTS (SELECT 1 FROM restaurants WHERE id = printer_heartbeats.restaurant_id AND is_active = true)
);

CREATE POLICY "Electron app can update heartbeats"
ON public.printer_heartbeats FOR UPDATE
USING (
  restaurant_id IS NOT NULL 
  AND EXISTS (SELECT 1 FROM restaurants WHERE id = printer_heartbeats.restaurant_id AND is_active = true)
);

-- 2. Fix print_logs - restrict to restaurant owner
DROP POLICY IF EXISTS "Anyone can insert print logs" ON public.print_logs;
DROP POLICY IF EXISTS "Anyone can read print logs" ON public.print_logs;
DROP POLICY IF EXISTS "Anyone can update print logs" ON public.print_logs;

CREATE POLICY "Restaurant owner can view print logs"
ON public.print_logs FOR SELECT
USING (restaurant_id = get_user_restaurant_id(auth.uid()));

CREATE POLICY "Restaurant owner can manage print logs"
ON public.print_logs FOR ALL
USING (restaurant_id = get_user_restaurant_id(auth.uid()));

-- Allow Electron app to insert/update (validates restaurant)
CREATE POLICY "Electron app can insert print logs"
ON public.print_logs FOR INSERT
WITH CHECK (
  restaurant_id IS NOT NULL 
  AND EXISTS (SELECT 1 FROM restaurants WHERE id = print_logs.restaurant_id AND is_active = true)
);

CREATE POLICY "Electron app can update print logs"
ON public.print_logs FOR UPDATE
USING (
  restaurant_id IS NOT NULL 
  AND EXISTS (SELECT 1 FROM restaurants WHERE id = print_logs.restaurant_id AND is_active = true)
);

-- 3. Fix available_printers - restrict to restaurant owner + Electron app
DROP POLICY IF EXISTS "Anyone can delete available printers" ON public.available_printers;
DROP POLICY IF EXISTS "Anyone can insert available printers" ON public.available_printers;
DROP POLICY IF EXISTS "Anyone can read available printers" ON public.available_printers;
DROP POLICY IF EXISTS "Anyone can update available printers" ON public.available_printers;

CREATE POLICY "Restaurant owner can view available printers"
ON public.available_printers FOR SELECT
USING (restaurant_id = get_user_restaurant_id(auth.uid()));

CREATE POLICY "Restaurant owner can manage available printers"
ON public.available_printers FOR ALL
USING (restaurant_id = get_user_restaurant_id(auth.uid()));

-- Allow Electron app access (validates restaurant)
CREATE POLICY "Electron app can manage available printers"
ON public.available_printers FOR ALL
USING (
  restaurant_id IS NOT NULL 
  AND EXISTS (SELECT 1 FROM restaurants WHERE id = available_printers.restaurant_id AND is_active = true)
);

-- 4. Remove super admin policies (no more admin panel)
DROP POLICY IF EXISTS "Admins can view all tables" ON public.tables;
DROP POLICY IF EXISTS "Admins can view all products" ON public.products;
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can view all daily closings" ON public.daily_closings;
DROP POLICY IF EXISTS "Admins can view all restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Admins can update all restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;

-- 5. Fix waiter_calls - restrict insert to authenticated users
DROP POLICY IF EXISTS "Valid restaurant can create waiter calls" ON public.waiter_calls;

-- Only allow waiter calls from authenticated waiters or via the public waiter app
CREATE POLICY "Waiters can create waiter calls"
ON public.waiter_calls FOR INSERT
WITH CHECK (
  restaurant_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM restaurants WHERE id = waiter_calls.restaurant_id AND is_active = true)
  AND (
    -- Authenticated user from the restaurant
    restaurant_id = get_user_restaurant_id(auth.uid())
    OR
    -- Public access via waiter app (table must exist)
    EXISTS (SELECT 1 FROM tables t WHERE t.id = waiter_calls.table_id AND t.restaurant_id = waiter_calls.restaurant_id)
  )
);

-- 6. Secure admin_restaurant_metrics view (drop it since admin panel is removed)
DROP VIEW IF EXISTS public.admin_restaurant_metrics;