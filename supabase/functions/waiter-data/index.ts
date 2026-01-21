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

    // GET restaurant by slug (public endpoint - no restaurant_id needed)
    if (action === "get-restaurant") {
      const slug = url.searchParams.get("slug");
      if (!slug) {
        return new Response(
          JSON.stringify({ error: "slug is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data, error } = await supabase
        .from("restaurants")
        .select("id, name, slug, logo_url")
        .eq("slug", slug)
        .single();

      if (error) {
        console.error("Restaurant fetch error:", error);
        return new Response(
          JSON.stringify({ error: "Restaurant not found", found: false }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ data, found: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    // GET products (with optional category filter for lazy loading)
    if (action === "products") {
      const categoryId = url.searchParams.get("category_id");
      
      let query = supabase
        .from("products")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .eq("is_available", true);
      
      if (categoryId) {
        query = query.eq("category_id", categoryId);
      }
      
      const { data, error } = await query.order("name");

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
      
      // Determine payment method for orders
      // If mixed payments, use 'mixed' as payment_method on orders
      const isMixedPayment = body.payments && body.payments.length > 0;
      const paymentMethodForOrders = isMixedPayment ? 'mixed' : body.payment_method;
      
      for (const orderId of body.order_ids) {
        await supabase
          .from("orders")
          .update({
            status: "delivered",
            payment_method: paymentMethodForOrders,
            cash_received: body.cash_received || null,
            change_given: body.change_given || null,
            split_people: body.split_count || null,
            closed_at: new Date().toISOString(),
          })
          .eq("id", orderId)
          .eq("restaurant_id", restaurantId);
      }

      // Save mixed payments to tab_payments table
      if (isMixedPayment && body.tab_id) {
        for (const payment of body.payments) {
          const changeGiven = payment.method === 'cash' && payment.cashReceived && payment.cashReceived > payment.amount
            ? payment.cashReceived - payment.amount
            : null;
            
          await supabase
            .from("tab_payments")
            .insert({
              restaurant_id: restaurantId,
              tab_id: body.tab_id,
              payment_method: payment.method,
              amount: payment.amount,
              cash_received: payment.cashReceived || null,
              change_given: changeGiven,
            });
        }
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

    // POST create customer
    if (req.method === "POST" && action === "create-customer") {
      const body = await req.json();
      
      const { data: newCustomer, error } = await supabase
        .from("customers")
        .insert({
          restaurant_id: restaurantId,
          name: body.name,
          phone: body.phone,
          address: body.address || null,
          number: body.number || null,
          complement: body.complement || null,
          neighborhood: body.neighborhood || null,
          city: body.city || null,
          cep: body.cep || null,
        })
        .select()
        .single();

      if (error) throw error;
      return new Response(
        JSON.stringify({ success: true, customer: newCustomer }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GET search customers
    if (action === "search-customers") {
      const search = url.searchParams.get("search") || "";
      
      if (search.length < 2) {
        return new Response(
          JSON.stringify({ data: [] }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .or(`phone.ilike.%${search}%,name.ilike.%${search}%`)
        .limit(10);

      if (error) throw error;
      return new Response(
        JSON.stringify({ data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GET tab total
    if (action === "tab-total") {
      const tabId = url.searchParams.get("tab_id");
      if (!tabId) {
        return new Response(
          JSON.stringify({ error: "tab_id is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data, error } = await supabase
        .from("orders")
        .select("total")
        .eq("restaurant_id", restaurantId)
        .eq("tab_id", tabId)
        .in("status", ["pending", "preparing", "ready"]);

      if (error) throw error;
      const total = data?.reduce((sum: number, order: { total: number | null }) => sum + (order.total || 0), 0) || 0;
      return new Response(
        JSON.stringify({ total }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST add order to existing (for adding more items to a table/tab)
    if (req.method === "POST" && action === "add-to-order") {
      const body = await req.json();
      
      // Get next order number atomically
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

      return new Response(
        JSON.stringify({ success: true, order }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST print conference (for printing table/tab receipt)
    if (req.method === "POST" && action === "print-conference") {
      const body = await req.json();
      
      // Create a temporary order for the conference print
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          restaurant_id: restaurantId,
          order_type: 'conference',
          customer_name: body.customer_name || `${body.entity_type === 'table' ? 'Mesa' : 'Comanda'} ${body.entity_number}`,
          total: body.total,
          service_charge: body.service_charge || null,
          status: 'conference',
          print_status: 'pending',
          notes: JSON.stringify({
            entityType: body.entity_type,
            entityNumber: body.entity_number,
            discount: body.discount || 0,
            addition: body.addition || 0,
            serviceCharge: body.service_charge || 0,
            splitCount: body.split_count || 1,
            isConference: !body.is_final_receipt,
            isFinalReceipt: body.is_final_receipt || false,
            payments: body.payments || [],
          }),
        })
        .select('id, order_number')
        .single();

      if (orderError) throw orderError;

      // Add items to the order
      if (body.items && body.items.length > 0) {
        const itemsToInsert = body.items.map((item: any) => ({
          order_id: order.id,
          restaurant_id: restaurantId,
          product_name: item.product_name,
          product_price: item.product_price,
          quantity: item.quantity,
        }));

        const { error: itemsError } = await supabase
          .from("order_items")
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;
      }

      // Log the conference print
      await supabase.from("print_logs").insert({
        restaurant_id: restaurantId,
        order_id: order.id,
        order_number: order.order_number?.toString() || null,
        event_type: 'print',
        status: 'pending',
        printer_name: 'Electron App',
        items_count: body.items?.length || 0,
      });

      return new Response(
        JSON.stringify({ success: true, order }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST reprint order
    if (req.method === "POST" && action === "reprint-order") {
      const body = await req.json();
      
      if (!body.order_id) {
        return new Response(
          JSON.stringify({ error: "order_id is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get current print count
      const { data: currentOrder, error: fetchError } = await supabase
        .from("orders")
        .select("print_count, order_number")
        .eq("id", body.order_id)
        .eq("restaurant_id", restaurantId)
        .single();

      if (fetchError) throw fetchError;

      const newPrintCount = (currentOrder?.print_count || 0) + 1;

      // Update order to pending print status
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          print_status: "pending",
          print_count: newPrintCount,
          printed_at: null,
        })
        .eq("id", body.order_id)
        .eq("restaurant_id", restaurantId);

      if (updateError) throw updateError;

      // Log the reprint request
      await supabase.from("print_logs").insert({
        restaurant_id: restaurantId,
        order_id: body.order_id,
        order_number: currentOrder?.order_number?.toString() || body.order_number || null,
        event_type: "reprint",
        status: "pending",
        printer_name: "Electron App",
      });

      return new Response(
        JSON.stringify({ success: true, print_count: newPrintCount }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST update order status (mark as served, delivered, etc.)
    if (req.method === "POST" && action === "update-order-status") {
      const body = await req.json();
      
      if (!body.order_id || !body.status) {
        return new Response(
          JSON.stringify({ error: "order_id and status are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Validate status
      const validStatuses = ["pending", "preparing", "ready", "served", "delivered", "cancelled"];
      if (!validStatuses.includes(body.status)) {
        return new Response(
          JSON.stringify({ error: "Invalid status" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const updateData: Record<string, any> = {
        status: body.status,
      };

      // Add closed_at timestamp if marking as delivered
      if (body.status === "delivered") {
        updateData.closed_at = new Date().toISOString();
      }

      // Add ready_at timestamp if marking as ready
      if (body.status === "ready") {
        updateData.ready_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", body.order_id)
        .eq("restaurant_id", restaurantId);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST bulk update order status (for closing table/tab)
    if (req.method === "POST" && action === "bulk-update-order-status") {
      const body = await req.json();
      
      if (!body.order_ids || !Array.isArray(body.order_ids) || !body.status) {
        return new Response(
          JSON.stringify({ error: "order_ids array and status are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const updateData: Record<string, any> = {
        status: body.status,
      };

      if (body.status === "delivered") {
        updateData.closed_at = new Date().toISOString();
      }

      for (const orderId of body.order_ids) {
        await supabase
          .from("orders")
          .update(updateData)
          .eq("id", orderId)
          .eq("restaurant_id", restaurantId);
      }

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
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
