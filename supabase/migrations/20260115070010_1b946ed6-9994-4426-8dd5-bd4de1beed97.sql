-- Create a function to check if user is super admin (can see all restaurants)
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'
  )
$$;

-- Create a view for admin to see consolidated metrics across all restaurants
CREATE OR REPLACE VIEW public.admin_restaurant_metrics AS
SELECT 
  r.id as restaurant_id,
  r.name as restaurant_name,
  r.slug,
  r.cnpj,
  r.phone,
  r.address,
  r.created_at as restaurant_created_at,
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

-- Add RLS policy for admin to view all restaurants
CREATE POLICY "Admins can view all restaurants"
ON public.restaurants
FOR SELECT
USING (public.is_super_admin(auth.uid()));

-- Add RLS policy for admin to view all orders
CREATE POLICY "Admins can view all orders"
ON public.orders
FOR SELECT
USING (public.is_super_admin(auth.uid()));

-- Add RLS policy for admin to view all products
CREATE POLICY "Admins can view all products"
ON public.products
FOR SELECT
USING (public.is_super_admin(auth.uid()));

-- Add RLS policy for admin to view all tables
CREATE POLICY "Admins can view all tables"
ON public.tables
FOR SELECT
USING (public.is_super_admin(auth.uid()));

-- Add RLS policy for admin to view all daily_closings
CREATE POLICY "Admins can view all daily closings"
ON public.daily_closings
FOR SELECT
USING (public.is_super_admin(auth.uid()));

-- Add RLS policy for admin to view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.is_super_admin(auth.uid()));