import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrderItem {
  id: string;
  product_name: string;
  product_size: string | null;
  quantity: number;
  notes: string | null;
  product_price: number;
  product_id: string | null;
  category_id: string | null;
  products: { category_id: string | null }[] | null;
}

interface Order {
  id: string;
  created_at: string;
  customer_name: string | null;
  order_type: string | null;
  status: string | null;
  total: number | null;
  notes: string | null;
  delivery_address: string | null;
  delivery_phone: string | null;
  delivery_fee: number | null;
  table_id: string | null;
  tab_id: string | null;
  print_status: string | null;
  waiter_id: string | null;
  order_number: number | null;
  order_items: OrderItem[];
  tables: { number: number }[] | null;
  tabs: { tab_number: string }[] | null;
  waiters: { id: string; name: string }[] | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const restaurantId = url.searchParams.get("restaurant_id");
    const action = url.searchParams.get("action") || "get";

    console.log(`[print-orders] Action: ${action}, Restaurant: ${restaurantId}`);

    if (!restaurantId) {
      return new Response(
        JSON.stringify({ error: "restaurant_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GET pending orders to print
    if (req.method === "GET" && action === "get") {
      const { data: orders, error } = await supabase
        .from("orders")
        .select(`
          id,
          created_at,
          customer_name,
          order_type,
          status,
          total,
          notes,
          delivery_address,
          delivery_phone,
          delivery_fee,
          table_id,
          print_status,
          waiter_id,
          order_number,
          tab_id,
          tabs (
            tab_number
          ),
          order_items (
            id,
            product_name,
            product_size,
            quantity,
            notes,
            product_price,
            product_id,
            category_id,
            products (
              category_id
            )
          ),
          tables (
            number
          ),
          waiters (
            id,
            name
          )
        `)
        .eq("restaurant_id", restaurantId)
        .eq("print_status", "pending")
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching orders:", error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[print-orders] Found ${orders?.length || 0} pending orders`);

      // Format orders for printing - USE SNAKE_CASE to match Electron app expectations
      const formattedOrders = (orders as Order[]).map((order) => ({
        id: order.id,
        order_number: order.order_number || order.id.slice(0, 4).toUpperCase(),
        created_at: order.created_at,
        customer_name: order.customer_name,
        order_type: order.order_type,
        status: order.status,
        total: order.total,
        notes: order.notes,
        delivery_address: order.delivery_address,
        delivery_phone: order.delivery_phone,
        delivery_fee: order.delivery_fee,
        table_number: order.tables?.[0]?.number || null,
        table_id: order.table_id,
        tab_number: order.tabs?.[0]?.tab_number || null,
        tab_id: order.tab_id,
        waiter_name: order.waiters?.[0]?.name || null,
        waiter_id: order.waiter_id,
        order_items: order.order_items.map((item) => {
          // Get category_id: first try from order_items directly, then fallback to products relation
          const categoryId = item.category_id || 
            (Array.isArray(item.products) ? item.products[0]?.category_id : (item.products as any)?.category_id) || 
            null;
          
          return {
            id: item.id,
            product_name: item.product_name,
            product_size: item.product_size,
            quantity: item.quantity,
            notes: item.notes,
            product_price: item.product_price,
            product_id: item.product_id,
            category_id: categoryId,
          };
        }),
      }));

      return new Response(
        JSON.stringify({ orders: formattedOrders, count: formattedOrders.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST mark orders as printed
    if (req.method === "POST" && action === "mark-printed") {
      const body = await req.json();
      const orderIds: string[] = body.order_ids;

      if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
        return new Response(
          JSON.stringify({ error: "order_ids array is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error } = await supabase
        .from("orders")
        .update({
          print_status: "printed",
          printed_at: new Date().toISOString(),
          print_count: 1,
        })
        .in("id", orderIds)
        .eq("restaurant_id", restaurantId);

      if (error) {
        console.error("Error marking orders as printed:", error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[print-orders] Marked ${orderIds.length} orders as printed`);

      return new Response(
        JSON.stringify({ success: true, marked: orderIds.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST reprint an order (set back to pending)
    if (req.method === "POST" && action === "reprint") {
      const body = await req.json();
      const orderId: string = body.order_id;

      if (!orderId) {
        return new Response(
          JSON.stringify({ error: "order_id is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error } = await supabase
        .from("orders")
        .update({ print_status: "pending" })
        .eq("id", orderId)
        .eq("restaurant_id", restaurantId);

      if (error) {
        console.error("Error setting reprint:", error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[print-orders] Set order ${orderId} to reprint`);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
