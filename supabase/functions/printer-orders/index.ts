import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  notes: string | null;
  product_price: number;
  product_size: string | null;
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
  print_status: string | null;
  print_count: number | null;
  waiter_id: string | null;
  created_by: string | null;
  order_number: number | null;
  payment_method: string | null;
  restaurant_id: string;
  order_items: OrderItem[];
  tables: { number: number }[] | null;
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

    console.log(`[printer-orders] Action: ${action}, Restaurant: ${restaurantId}`);

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
          print_count,
          waiter_id,
          created_by,
          order_number,
          payment_method,
          restaurant_id,
          order_items (
            id,
            product_name,
            quantity,
            notes,
            product_price,
            product_size,
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

      // Fetch profiles for created_by users separately (no FK relationship)
      // created_by contains user_id from auth.users
      const createdByIds = (orders || [])
        .map((o: Order) => o.created_by)
        .filter((id): id is string => !!id);
      
      const profilesMap = new Map<string, string>();
      if (createdByIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", createdByIds);
        
        if (profiles) {
          for (const p of profiles) {
            if (p.full_name && p.user_id) {
              profilesMap.set(p.user_id, p.full_name);
            }
          }
        }
      }

      if (error) {
        console.error("Error fetching orders:", error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[printer-orders] Found ${orders?.length || 0} pending orders`);

      // Fetch all products for category lookup fallback (when product_id is null)
      const { data: allProducts } = await supabase
        .from("products")
        .select("id, name, category_id")
        .eq("restaurant_id", restaurantId);

      // Create a map for quick product name lookup
      const productNameToCategoryMap = new Map<string, string>();
      if (allProducts) {
        for (const product of allProducts) {
          if (product.category_id) {
            // Store with normalized name (lowercase, trimmed, without size suffix)
            const normalizedName = product.name.toLowerCase().trim();
            productNameToCategoryMap.set(normalizedName, product.category_id);
          }
        }
      }

      // Helper function to find category by product name (fuzzy match)
      const findCategoryByName = (productName: string): string | null => {
        if (!productName) return null;
        
        // Remove size suffixes like (P), (M), (G) and normalize
        const cleanName = productName
          .replace(/\s*\([PMG]\)\s*$/i, '')
          .toLowerCase()
          .trim();
        
        // Try exact match first
        if (productNameToCategoryMap.has(cleanName)) {
          return productNameToCategoryMap.get(cleanName)!;
        }
        
        // Try partial match
        for (const [name, categoryId] of productNameToCategoryMap.entries()) {
          if (cleanName.includes(name) || name.includes(cleanName)) {
            return categoryId;
          }
        }
        
        return null;
      };

      // Format orders for Electron
      const formattedOrders = (orders as Order[]).map((order) => {
        // Get the creator name - from profile map or waiter
        // Handle waiter - can be object or array depending on Supabase response
        const waiterName = Array.isArray(order.waiters) 
          ? order.waiters[0]?.name 
          : (order.waiters as { id: string; name: string } | null)?.name || null;
        
        const creatorName = order.created_by ? profilesMap.get(order.created_by) || null : null;
        
        // Handle table - can be object or array depending on Supabase response
        const tableNumber = Array.isArray(order.tables)
          ? order.tables[0]?.number
          : (order.tables as { number: number } | null)?.number || null;
        
        console.log(`[printer-orders] Order ${order.order_number}: table_id=${order.table_id}, table=${tableNumber}, waiter=${waiterName}, creator=${creatorName}`);
        
        return {
        id: order.id,
        order_number: order.order_number,
        created_at: order.created_at,
        customer_name: order.customer_name,
        order_type: order.order_type,
        status: order.status,
        total: order.total,
        notes: order.notes,
        delivery_address: order.delivery_address,
        delivery_phone: order.delivery_phone,
        delivery_fee: order.delivery_fee,
        table_number: tableNumber,
        waiter_name: waiterName,
        created_by_name: creatorName,
        print_count: order.print_count || 0,
        payment_method: order.payment_method,
        order_items: order.order_items.map((item) => {
          // Priority for category_id:
          // 1. Direct category_id on order_item (new column)
          // 2. category_id from joined products table (can be object or array depending on Supabase response)
          // 3. Fallback: lookup by product name
          const productsCategoryId = Array.isArray(item.products) 
            ? item.products[0]?.category_id 
            : (item.products as { category_id: string | null } | null)?.category_id;
          
          let categoryId = item.category_id || productsCategoryId || null;
          
          console.log(`[printer-orders] Item "${item.product_name}": item.category_id=${item.category_id}, products=${JSON.stringify(item.products)}, resolved=${categoryId}`);
          
          // If still no category, try to find by product name
          if (!categoryId && item.product_name) {
            categoryId = findCategoryByName(item.product_name);
            console.log(`[printer-orders] Item "${item.product_name}" - category lookup by name: ${categoryId || 'NOT FOUND'}`);
          }
          
          return {
            id: item.id,
            product_name: item.product_name,
            quantity: item.quantity,
            notes: item.notes,
            product_price: item.product_price,
            product_size: item.product_size,
            category_id: categoryId,
          };
        }),
      };
      });

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

      // Fetch current print_count to increment
      const { data: currentOrders } = await supabase
        .from("orders")
        .select("id, print_count")
        .in("id", orderIds);

      // Update each order
      for (const order of currentOrders || []) {
        await supabase
          .from("orders")
          .update({
            print_status: "printed",
            printed_at: new Date().toISOString(),
            print_count: (order.print_count || 0) + 1,
          })
          .eq("id", order.id);
      }

      console.log(`[printer-orders] Marked ${orderIds.length} orders as printed`);

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

      console.log(`[printer-orders] Set order ${orderId} to reprint`);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST clear all pending orders (mark as printed without printing)
    if (req.method === "POST" && action === "clear-pending") {
      const { data: pendingOrders, error: fetchError } = await supabase
        .from("orders")
        .select("id")
        .eq("restaurant_id", restaurantId)
        .eq("print_status", "pending");

      if (fetchError) {
        console.error("Error fetching pending orders:", fetchError);
        return new Response(
          JSON.stringify({ error: fetchError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const count = pendingOrders?.length || 0;

      if (count > 0) {
        const { error: updateError } = await supabase
          .from("orders")
          .update({
            print_status: "skipped",
            printed_at: new Date().toISOString(),
          })
          .eq("restaurant_id", restaurantId)
          .eq("print_status", "pending");

        if (updateError) {
          console.error("Error clearing pending orders:", updateError);
          return new Response(
            JSON.stringify({ error: updateError.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      console.log(`[printer-orders] Cleared ${count} pending orders for restaurant ${restaurantId}`);

      return new Response(
        JSON.stringify({ success: true, cleared: count }),
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