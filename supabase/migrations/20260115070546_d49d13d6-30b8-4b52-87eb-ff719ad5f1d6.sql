-- Drop and recreate the view with new columns
DROP VIEW IF EXISTS public.admin_restaurant_metrics;

CREATE VIEW public.admin_restaurant_metrics AS
SELECT 
  r.id as restaurant_id,
  r.name as restaurant_name,
  r.slug,
  r.cnpj,
  r.phone,
  r.address,
  r.created_at as restaurant_created_at,
  r.is_active as account_active,
  r.suspended_at,
  r.suspended_reason,
  ss.is_open,
  ss.daily_order_counter,
  (SELECT COUNT(*) FROM public.orders o WHERE o.restaurant_id = r.id) as total_orders,
  (SELECT COUNT(*) FROM public.orders o WHERE o.restaurant_id = r.id AND o.created_at >= CURRENT_DATE) as orders_today,
  (SELECT COALESCE(SUM(o.total), 0) FROM public.orders o WHERE o.restaurant_id = r.id AND o.status = 'delivered') as total_revenue,
  (SELECT COALESCE(SUM(o.total), 0) FROM public.orders o WHERE o.restaurant_id = r.id AND o.status = 'delivered' AND o.created_at >= CURRENT_DATE) as revenue_today,
  (SELECT COUNT(*) FROM public.products p WHERE p.restaurant_id = r.id) as total_products,
  (SELECT COUNT(*) FROM public.tables t WHERE t.restaurant_id = r.id) as total_tables,
  (SELECT COUNT(*) FROM public.waiters w WHERE w.restaurant_id = r.id) as total_waiters,
  (SELECT COUNT(*) FROM public.categories c WHERE c.restaurant_id = r.id) as total_categories
FROM public.restaurants r
LEFT JOIN public.salon_settings ss ON ss.restaurant_id = r.id;