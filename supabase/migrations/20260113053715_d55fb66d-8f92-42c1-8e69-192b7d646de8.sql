-- Create trigger function to automatically set table/tab to occupied when order is created
CREATE OR REPLACE FUNCTION public.auto_occupy_table_tab()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If order has table_id, set table to occupied
  IF NEW.table_id IS NOT NULL THEN
    UPDATE public.tables
    SET status = 'occupied'
    WHERE id = NEW.table_id AND status = 'available';
  END IF;

  -- If order has tab_id, set tab to occupied
  IF NEW.tab_id IS NOT NULL THEN
    UPDATE public.tabs
    SET status = 'occupied'
    WHERE id = NEW.tab_id AND status = 'available';
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on orders table
CREATE TRIGGER auto_occupy_on_order_insert
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_occupy_table_tab();