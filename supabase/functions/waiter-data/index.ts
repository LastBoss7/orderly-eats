import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const restaurantId = url.searchParams.get("restaurant_id");
    const action = url.searchParams.get("action") || "tables";

    if (!restaurantId) {
      return new Response(
        JSON.stringify({ error: "restaurant_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GET tables
    if (action === "tables") {
      const { data, error } = await supabase
        .from("tables")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("number");

      if (error) throw error;
      return new Response(
        JSON.stringify({ data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GET tabs
    if (action === "tabs") {
      const { data, error } = await supabase
        .from("tabs")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("number");

      if (error) throw error;
      return new Response(
        JSON.stringify({ data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GET categories
    if (action === "categories") {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("sort_order");

      if (error) throw error;
      return new Response(
        JSON.stringify({ data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GET products
    if (action === "products") {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .eq("is_available", true)
        .order("name");

      if (error) throw error;
      return new Response(
        JSON.stringify({ data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GET orders for a table
    if (action === "table-orders") {
      const tableId = url.searchParams.get("table_id");
      if (!tableId) {
        return new Response(
          JSON.stringify({ error: "table_id is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data, error } = await supabase
        .from("orders")
        .select(`*, order_items (*), waiters (id, name)`)
        .eq("restaurant_id", restaurantId)
        .eq("table_id", tableId)
        .in("status", ["pending", "preparing", "ready"])
        .order("created_at", { ascending: true });

      if (error) throw error;
      return new Response(
        JSON.stringify({ data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GET orders for a tab
    if (action === "tab-orders") {
      const tabId = url.searchParams.get("tab_id");
      if (!tabId) {
        return new Response(
          JSON.stringify({ error: "tab_id is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data, error } = await supabase
        .from("orders")
        .select(`*, order_items (*), waiters (id, name)`)
        .eq("restaurant_id", restaurantId)
        .eq("tab_id", tabId)
        .in("status", ["pending", "preparing", "ready"])
        .order("created_at", { ascending: true });

      if (error) throw error;
      return new Response(
        JSON.stringify({ data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GET ready orders for tables
    if (action === "ready-orders") {
      const { data, error } = await supabase
        .from("orders")
        .select("table_id, status")
        .eq("restaurant_id", restaurantId)
        .eq("status", "ready")
        .not("table_id", "is", null);

      if (error) throw error;
      return new Response(
        JSON.stringify({ data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GET table total
    if (action === "table-total") {
      const tableId = url.searchParams.get("table_id");
      if (!tableId) {
        return new Response(
          JSON.stringify({ error: "table_id is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data, error } = await supabase
        .from("orders")
        .select("total")
        .eq("restaurant_id", restaurantId)
        .eq("table_id", tableId)
        .in("status", ["pending", "preparing", "ready"]);

      if (error) throw error;
      const total = data?.reduce((sum: number, order: { total: number | null }) => sum + (order.total || 0), 0) || 0;
      return new Response(
        JSON.stringify({ total }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST create order
    if (req.method === "POST" && action === "create-order") {
      const body = await req.json();
      
      // Get next order number atomically using database function
      const { data: orderNumber, error: orderNumberError } = await supabase
        .rpc('get_next_order_number', { _restaurant_id: restaurantId });

      if (orderNumberError) throw orderNumberError;
      
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          restaurant_id: restaurantId,
          table_id: body.table_id || null,
          tab_id: body.tab_id || null,
          order_type: body.order_type,
          status: "pending",
          print_status: body.print_status || "pending",
          total: body.total,
          notes: body.notes || null,
          customer_id: body.customer_id || null,
          customer_name: body.customer_name || null,
          delivery_address: body.delivery_address || null,
          delivery_phone: body.delivery_phone || null,
          delivery_fee: body.delivery_fee || 0,
          waiter_id: body.waiter_id || null,
          order_number: orderNumber,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Insert order items
      if (body.items && body.items.length > 0) {
        const orderItems = body.items.map((item: any) => ({
          restaurant_id: restaurantId,
          order_id: order.id,
          product_id: item.product_id,
          product_name: item.product_name,
          product_price: item.product_price,
          quantity: item.quantity,
          notes: item.notes || null,
          product_size: item.product_size || null,
          category_id: item.category_id || null,
        }));

        const { error: itemsError } = await supabase
          .from("order_items")
          .insert(orderItems);

        if (itemsError) throw itemsError;
      }

      // Update table status if it's a table order
      if (body.table_id) {
        await supabase
          .from("tables")
          .update({ status: "occupied" })
          .eq("id", body.table_id);
      }

      // Update tab status if it's a tab order
      if (body.tab_id) {
        await supabase
          .from("tabs")
          .update({ status: "occupied" })
          .eq("id", body.tab_id);
      }

      return new Response(
        JSON.stringify({ success: true, order }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST update table status
    if (req.method === "POST" && action === "update-table") {
      const body = await req.json();
      
      const { error } = await supabase
        .from("tables")
        .update({ status: body.status })
        .eq("id", body.table_id)
        .eq("restaurant_id", restaurantId);

      if (error) throw error;
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST close orders (for table/tab closing)
    if (req.method === "POST" && action === "close-orders") {
      const body = await req.json();
      
      for (const orderId of body.order_ids) {
        await supabase
          .from("orders")
          .update({
            status: "delivered",
            payment_method: body.payment_method,
            cash_received: body.cash_received || null,
            change_given: body.change_given || null,
            closed_at: new Date().toISOString(),
          })
          .eq("id", orderId)
          .eq("restaurant_id", restaurantId);
      }

      // Update table status
      if (body.table_id) {
        await supabase
          .from("tables")
          .update({ status: "available" })
          .eq("id", body.table_id)
          .eq("restaurant_id", restaurantId);
      }

      // Update tab status
      if (body.tab_id) {
        await supabase
          .from("tabs")
          .update({ status: "available" })
          .eq("id", body.tab_id)
          .eq("restaurant_id", restaurantId);
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST update tab (for tab customer assignment)
    if (req.method === "POST" && action === "update-tab") {
      const body = await req.json();
      
      const { error } = await supabase
        .from("tabs")
        .update({
          status: body.status,
          customer_name: body.customer_name ?? null,
          customer_phone: body.customer_phone ?? null,
        })
        .eq("id", body.tab_id)
        .eq("restaurant_id", restaurantId);

      if (error) throw error;
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST create tab
    if (req.method === "POST" && action === "create-tab") {
      const body = await req.json();
      
      const { data: newTab, error } = await supabase
        .from("tabs")
        .insert({
          restaurant_id: restaurantId,
          number: body.number,
          customer_name: body.customer_name || null,
          customer_phone: body.customer_phone || null,
          status: body.status || 'occupied',
        })
        .select()
        .single();

      if (error) throw error;
      return new Response(
        JSON.stringify({ success: true, tab: newTab }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
