
-- =====================================================
-- CORREÇÃO FINAL - VIEWS SECURITY DEFINER
-- =====================================================

-- 1. Remover view restaurants_public que está com SECURITY DEFINER
DROP VIEW IF EXISTS public.restaurants_public;

-- 2. Corrigir view admin_restaurant_metrics para SECURITY INVOKER
DROP VIEW IF EXISTS public.admin_restaurant_metrics;

CREATE VIEW public.admin_restaurant_metrics
WITH (security_invoker = true) AS
SELECT 
  r.id as restaurant_id,
  r.name as restaurant_name,
  r.slug,
  r.cnpj,
  r.phone,
  r.address,
  r.is_active as account_active,
  r.suspended_at,
  r.suspended_reason,
  r.created_at as restaurant_created_at,
  ss.is_open,
  ss.daily_order_counter,
  (SELECT COUNT(*) FROM orders o WHERE o.restaurant_id = r.id) as total_orders,
  (SELECT COALESCE(SUM(o.total), 0) FROM orders o WHERE o.restaurant_id = r.id AND o.status = 'delivered') as total_revenue,
  (SELECT COUNT(*) FROM orders o WHERE o.restaurant_id = r.id AND o.created_at::date = CURRENT_DATE) as orders_today,
  (SELECT COALESCE(SUM(o.total), 0) FROM orders o WHERE o.restaurant_id = r.id AND o.status = 'delivered' AND o.created_at::date = CURRENT_DATE) as revenue_today,
  (SELECT COUNT(*) FROM products p WHERE p.restaurant_id = r.id) as total_products,
  (SELECT COUNT(*) FROM categories c WHERE c.restaurant_id = r.id) as total_categories,
  (SELECT COUNT(*) FROM tables t WHERE t.restaurant_id = r.id) as total_tables,
  (SELECT COUNT(*) FROM waiters w WHERE w.restaurant_id = r.id) as total_waiters
FROM restaurants r
LEFT JOIN salon_settings ss ON ss.restaurant_id = r.id;

-- 3. Garantir RLS na view (views herdam RLS das tabelas base com security_invoker)
-- A política "Admins can view all restaurants" já garante acesso correto
