-- Grant execute permissions on RPC functions to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.get_customer_by_phone(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_customer_by_phone(uuid, text) TO authenticated;

-- Also grant on address functions for digital menu
GRANT EXECUTE ON FUNCTION public.get_customer_addresses(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_customer_addresses(uuid, uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.upsert_customer_address(uuid, uuid, uuid, text, text, text, text, text, text, text, text, boolean) TO anon;
GRANT EXECUTE ON FUNCTION public.upsert_customer_address(uuid, uuid, uuid, text, text, text, text, text, text, text, text, boolean) TO authenticated;

GRANT EXECUTE ON FUNCTION public.delete_customer_address(uuid, uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.delete_customer_address(uuid, uuid, uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.set_default_customer_address(uuid, uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.set_default_customer_address(uuid, uuid, uuid) TO authenticated;