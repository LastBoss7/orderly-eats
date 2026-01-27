import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const IFOOD_API_BASE = "https://merchant-api.ifood.com.br";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const body = await req.json().catch(() => ({}));
    
    const { restaurant_id, ifood_order_id, reason, cancellation_code, pickup_code } = body;

    if (!restaurant_id) {
      return new Response(
        JSON.stringify({ error: "Missing restaurant_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get settings and access token
    const { data: settings, error: settingsError } = await supabase
      .from("ifood_settings")
      .select("*")
      .eq("restaurant_id", restaurant_id)
      .maybeSingle();

    if (settingsError || !settings?.access_token) {
      return new Response(
        JSON.stringify({ error: "iFood not configured or token missing" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const accessToken = settings.access_token;

    // Check token expiration and refresh if needed
    if (settings.token_expires_at && new Date(settings.token_expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Token expired, refresh required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    switch (action) {
      case "accept":
        return await acceptOrder(supabase, accessToken, restaurant_id, ifood_order_id);

      case "reject":
        return await rejectOrder(supabase, accessToken, restaurant_id, ifood_order_id, reason);

      case "startPreparation":
        return await startPreparation(supabase, accessToken, restaurant_id, ifood_order_id);

      case "ready":
        return await markOrderReady(accessToken, ifood_order_id);

      case "dispatch":
        return await dispatchOrder(accessToken, ifood_order_id);

      case "fetch":
        return await fetchOrderDetails(accessToken, ifood_order_id);

      case "getCancellationReasons":
        return await getCancellationReasons(accessToken, ifood_order_id);

      case "requestCancellation":
        return await requestCancellation(supabase, accessToken, restaurant_id, ifood_order_id, cancellation_code, reason);

      case "getTracking":
        return await getTracking(accessToken, ifood_order_id);

      case "validatePickupCode":
        return await validatePickupCode(accessToken, ifood_order_id, pickup_code);

      case "polling":
        return await pollEvents(supabase, accessToken, restaurant_id, settings.merchant_id);

      default:
        return new Response(
          JSON.stringify({ error: "Invalid action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (err) {
    const error = err as Error;
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function acceptOrder(
  supabase: SupabaseClient,
  accessToken: string,
  restaurantId: string,
  ifoodOrderId: string
) {
  const { data: ifoodOrder, error: orderError } = await supabase
    .from("ifood_orders")
    .select("*")
    .eq("ifood_order_id", ifoodOrderId)
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  if (orderError || !ifoodOrder) {
    return new Response(
      JSON.stringify({ error: "Order not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const confirmResponse = await fetch(
    `${IFOOD_API_BASE}/order/v1.0/orders/${ifoodOrderId}/confirm`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!confirmResponse.ok) {
    const errorText = await confirmResponse.text();
    console.error("iFood confirm error:", errorText);
    return new Response(
      JSON.stringify({ error: "Failed to confirm order on iFood", details: errorText }),
      { status: confirmResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const orderData = ifoodOrder.order_data as Record<string, unknown>;
  const localOrder = await convertToLocalOrder(supabase, restaurantId, orderData, ifoodOrder.ifood_display_id);

  if (!localOrder) {
    return new Response(
      JSON.stringify({ error: "Failed to create local order" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  await supabase
    .from("ifood_orders")
    .update({
      status: "confirmed",
      local_order_id: localOrder.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ifoodOrder.id);

  return new Response(
    JSON.stringify({ success: true, localOrderId: localOrder.id }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function rejectOrder(
  supabase: SupabaseClient,
  accessToken: string,
  restaurantId: string,
  ifoodOrderId: string,
  reason?: string
) {
  const rejectResponse = await fetch(
    `${IFOOD_API_BASE}/order/v1.0/orders/${ifoodOrderId}/reject`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        reason: reason || "RESTAURANT_CANCELLED",
        cancellationCode: "501",
      }),
    }
  );

  if (!rejectResponse.ok) {
    const errorText = await rejectResponse.text();
    return new Response(
      JSON.stringify({ error: "Failed to reject order", details: errorText }),
      { status: rejectResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  await supabase
    .from("ifood_orders")
    .update({
      status: "rejected",
      rejection_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq("ifood_order_id", ifoodOrderId)
    .eq("restaurant_id", restaurantId);

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// NEW: Start Preparation
async function startPreparation(
  supabase: SupabaseClient,
  accessToken: string,
  restaurantId: string,
  ifoodOrderId: string
) {
  const response = await fetch(
    `${IFOOD_API_BASE}/order/v1.0/orders/${ifoodOrderId}/startPreparation`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    return new Response(
      JSON.stringify({ error: "Failed to start preparation", details: errorText }),
      { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Update local record
  await supabase
    .from("ifood_orders")
    .update({
      status: "preparing",
      preparation_started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("ifood_order_id", ifoodOrderId)
    .eq("restaurant_id", restaurantId);

  // Also update local order if exists
  const { data: ifoodOrder } = await supabase
    .from("ifood_orders")
    .select("local_order_id")
    .eq("ifood_order_id", ifoodOrderId)
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  if (ifoodOrder?.local_order_id) {
    await supabase
      .from("orders")
      .update({ status: "preparing" })
      .eq("id", ifoodOrder.local_order_id);
  }

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function markOrderReady(accessToken: string, ifoodOrderId: string) {
  const readyResponse = await fetch(
    `${IFOOD_API_BASE}/order/v1.0/orders/${ifoodOrderId}/readyToPickup`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!readyResponse.ok) {
    const errorText = await readyResponse.text();
    return new Response(
      JSON.stringify({ error: "Failed to mark order ready", details: errorText }),
      { status: readyResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function dispatchOrder(accessToken: string, ifoodOrderId: string) {
  const dispatchResponse = await fetch(
    `${IFOOD_API_BASE}/order/v1.0/orders/${ifoodOrderId}/dispatch`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!dispatchResponse.ok) {
    const errorText = await dispatchResponse.text();
    return new Response(
      JSON.stringify({ error: "Failed to dispatch order", details: errorText }),
      { status: dispatchResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function fetchOrderDetails(accessToken: string, ifoodOrderId: string) {
  const orderResponse = await fetch(
    `${IFOOD_API_BASE}/order/v1.0/orders/${ifoodOrderId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!orderResponse.ok) {
    return new Response(
      JSON.stringify({ error: "Failed to fetch order" }),
      { status: orderResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const orderData = await orderResponse.json();
  return new Response(
    JSON.stringify(orderData),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// NEW: Get Cancellation Reasons
async function getCancellationReasons(accessToken: string, ifoodOrderId: string) {
  const response = await fetch(
    `${IFOOD_API_BASE}/order/v1.0/orders/${ifoodOrderId}/cancellationReasons`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    if (response.status === 204) {
      return new Response(
        JSON.stringify({ reasons: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const errorText = await response.text();
    return new Response(
      JSON.stringify({ error: "Failed to get cancellation reasons", details: errorText }),
      { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const reasons = await response.json();
  return new Response(
    JSON.stringify({ reasons }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// NEW: Request Cancellation
async function requestCancellation(
  supabase: SupabaseClient,
  accessToken: string,
  restaurantId: string,
  ifoodOrderId: string,
  cancellationCode: string,
  reason?: string
) {
  const response = await fetch(
    `${IFOOD_API_BASE}/order/v1.0/orders/${ifoodOrderId}/requestCancellation`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        cancellationCode,
        reason: reason || "",
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    return new Response(
      JSON.stringify({ error: "Failed to request cancellation", details: errorText }),
      { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Update local record - status will be updated via webhook when confirmed
  await supabase
    .from("ifood_orders")
    .update({
      status: "cancellation_requested",
      rejection_reason: `${cancellationCode}: ${reason || ""}`,
      updated_at: new Date().toISOString(),
    })
    .eq("ifood_order_id", ifoodOrderId)
    .eq("restaurant_id", restaurantId);

  return new Response(
    JSON.stringify({ success: true, message: "Cancellation requested - awaiting confirmation" }),
    { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// NEW: Get Tracking
async function getTracking(accessToken: string, ifoodOrderId: string) {
  const response = await fetch(
    `${IFOOD_API_BASE}/order/v1.0/orders/${ifoodOrderId}/tracking`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    if (response.status === 404) {
      return new Response(
        JSON.stringify({ error: "Tracking not available yet", available: false }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const errorText = await response.text();
    return new Response(
      JSON.stringify({ error: "Failed to get tracking", details: errorText }),
      { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const tracking = await response.json();
  return new Response(
    JSON.stringify({ ...tracking, available: true }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// NEW: Validate Pickup Code
async function validatePickupCode(accessToken: string, ifoodOrderId: string, code: string) {
  const response = await fetch(
    `${IFOOD_API_BASE}/order/v1.0/orders/${ifoodOrderId}/validatePickupCode`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    return new Response(
      JSON.stringify({ error: "Invalid pickup code", valid: false, details: errorText }),
      { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ valid: true }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function pollEvents(
  supabase: SupabaseClient,
  accessToken: string,
  restaurantId: string,
  merchantId: string
) {
  if (!merchantId) {
    return new Response(
      JSON.stringify({ error: "Merchant ID not configured" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const pollingResponse = await fetch(
    `${IFOOD_API_BASE}/order/v1.0/events:polling`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!pollingResponse.ok) {
    return new Response(
      JSON.stringify({ error: "Polling failed" }),
      { status: pollingResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const events = await pollingResponse.json() as Array<{ 
    id: string; 
    code: string; 
    orderId: string;
    metadata?: Record<string, unknown>;
  }>;
  
  let processed = 0;
  const eventIds: Array<{ id: string }> = [];

  for (const event of events) {
    eventIds.push({ id: event.id });

    if (event.code === "PLC" || event.code === "PLACED") {
      const { data: existing } = await supabase
        .from("ifood_orders")
        .select("id")
        .eq("ifood_order_id", event.orderId)
        .maybeSingle();

      if (!existing) {
        const orderResponse = await fetch(
          `${IFOOD_API_BASE}/order/v1.0/orders/${event.orderId}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );

        if (orderResponse.ok) {
          const orderData = await orderResponse.json() as { 
            displayId?: string;
            orderTiming?: string;
            orderType?: string;
            delivery?: { deliveredBy?: string };
            scheduling?: { scheduledDateTimeStart?: string };
            preparationStartDateTime?: string;
            pickupCode?: string;
          };
          
          await supabase.from("ifood_orders").insert({
            restaurant_id: restaurantId,
            ifood_order_id: event.orderId,
            ifood_display_id: orderData.displayId || "",
            order_data: orderData,
            status: "pending",
            expires_at: new Date(Date.now() + 8 * 60 * 1000).toISOString(), // 8 minutes
            order_timing: orderData.orderTiming || "IMMEDIATE",
            order_type: orderData.orderType || "DELIVERY",
            delivered_by: orderData.delivery?.deliveredBy || null,
            scheduled_to: orderData.scheduling?.scheduledDateTimeStart || null,
            preparation_start_datetime: orderData.preparationStartDateTime || null,
            pickup_code: orderData.pickupCode || null,
          });
          processed++;
        }
      }
    }
  }

  // Batch acknowledge all events
  if (eventIds.length > 0) {
    await fetch(
      `${IFOOD_API_BASE}/order/v1.0/events/acknowledgment`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventIds),
      }
    );
  }

  await supabase
    .from("ifood_settings")
    .update({ last_sync_at: new Date().toISOString() })
    .eq("restaurant_id", restaurantId);

  return new Response(
    JSON.stringify({ success: true, events: events.length, processed }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

interface LocalOrder {
  id: string;
}

async function convertToLocalOrder(
  supabase: SupabaseClient,
  restaurantId: string,
  orderData: Record<string, unknown>,
  displayId: string
): Promise<LocalOrder | null> {
  try {
    const customer = (orderData.customer || {}) as Record<string, unknown>;
    const delivery = (orderData.delivery || {}) as Record<string, unknown>;
    const payments = (orderData.payments || []) as Array<{ method?: string }>;
    const total = (orderData.total || {}) as { orderAmount?: number; deliveryFee?: number };

    let paymentMethod = "other";
    if (payments.length > 0) {
      const method = payments[0].method?.toLowerCase() || "";
      if (method.includes("credit")) paymentMethod = "credit";
      else if (method.includes("debit")) paymentMethod = "debit";
      else if (method.includes("pix")) paymentMethod = "pix";
      else if (method.includes("cash") || method.includes("dinheiro")) paymentMethod = "cash";
    }

    const deliveryAddress = (delivery.deliveryAddress || {}) as Record<string, string>;
    const formattedAddress = [
      deliveryAddress.streetName,
      deliveryAddress.streetNumber,
      deliveryAddress.complement,
      deliveryAddress.neighborhood,
      deliveryAddress.city,
    ].filter(Boolean).join(", ");

    const { data: orderNumber } = await supabase.rpc("get_next_order_number", {
      _restaurant_id: restaurantId,
    });

    const customerPhone = customer.phone as { number?: string } | string | undefined;
    const phoneNumber = typeof customerPhone === "object" ? customerPhone?.number : customerPhone;

    const { data: newOrder, error: orderError } = await supabase
      .from("orders")
      .insert({
        restaurant_id: restaurantId,
        order_type: "ifood",
        status: "pending",
        order_number: orderNumber || parseInt(displayId) || null,
        customer_name: (customer.name as string) || "Cliente iFood",
        delivery_phone: phoneNumber || null,
        delivery_address: formattedAddress || null,
        delivery_fee: total.deliveryFee || 0,
        total: total.orderAmount || 0,
        payment_method: paymentMethod,
        notes: (orderData.additionalInfo as string) || null,
        print_status: "pending",
      })
      .select("id")
      .single();

    if (orderError || !newOrder) {
      console.error("Error creating order:", orderError);
      return null;
    }

    const items = (orderData.items || []) as Array<{
      name?: string;
      unitPrice?: number;
      totalPrice?: number;
      quantity?: number;
      observations?: string;
    }>;
    
    const orderItems = items.map((item) => ({
      restaurant_id: restaurantId,
      order_id: newOrder.id,
      product_name: item.name || "Item iFood",
      product_price: item.unitPrice || item.totalPrice || 0,
      quantity: item.quantity || 1,
      notes: item.observations || null,
    }));

    if (orderItems.length > 0) {
      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) {
        console.error("Error creating order items:", itemsError);
      }
    }

    return newOrder;
  } catch (error) {
    console.error("Error converting order:", error);
    return null;
  }
}
