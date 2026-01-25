import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-ifood-signature",
};

interface IFoodEvent {
  code: string;
  orderId: string;
  merchantId: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse the webhook payload
    const bodyText = await req.text();
    let events: IFoodEvent[];
    
    try {
      events = JSON.parse(bodyText);
      if (!Array.isArray(events)) {
        events = [events];
      }
    } catch {
      console.error("Invalid JSON payload");
      return new Response(
        JSON.stringify({ error: "Invalid JSON" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Received ${events.length} events from iFood`);

    for (const event of events) {
      const { code, orderId, merchantId, createdAt, metadata } = event;

      if (!orderId || !merchantId) {
        console.warn("Missing orderId or merchantId in event:", event);
        continue;
      }

      // Find restaurant by merchant_id
      const { data: settings, error: settingsError } = await supabase
        .from("ifood_settings")
        .select("restaurant_id, is_enabled")
        .eq("merchant_id", merchantId)
        .maybeSingle();

      if (settingsError || !settings) {
        console.warn(`No settings found for merchant ${merchantId}`);
        continue;
      }

      if (!settings.is_enabled) {
        console.log(`Integration disabled for restaurant ${settings.restaurant_id}`);
        continue;
      }

      const restaurantId = settings.restaurant_id;

      // Handle different event types
      switch (code) {
        case "PLC": // PLACED - Novo pedido
        case "PLACED":
          await handlePlacedOrder(supabase, orderId, restaurantId, metadata);
          break;

        case "CFM": // CONFIRMED
        case "CONFIRMED":
          await updateOrderStatus(supabase, orderId, restaurantId, "confirmed");
          break;

        case "CAN": // CANCELLED
        case "CANCELLED":
          await updateOrderStatus(supabase, orderId, restaurantId, "cancelled");
          break;

        case "CCR": // CANCELLATION_REQUESTED
        case "CANCELLATION_REQUESTED":
          await updateOrderStatus(supabase, orderId, restaurantId, "cancellation_requested");
          break;

        case "RTP": // READY_TO_PICKUP
        case "READY_TO_PICKUP":
          await updateOrderStatus(supabase, orderId, restaurantId, "ready");
          break;

        case "DSP": // DISPATCHED
        case "DISPATCHED":
          await updateOrderStatus(supabase, orderId, restaurantId, "dispatched");
          break;

        case "CON": // CONCLUDED
        case "CONCLUDED":
          await updateOrderStatus(supabase, orderId, restaurantId, "concluded");
          break;

        default:
          console.log(`Unhandled event code: ${code} for order ${orderId}`);
      }
    }

    // iFood expects 202 Accepted for webhook acknowledgment
    return new Response(
      JSON.stringify({ success: true, processed: events.length }),
      { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const error = err as Error;
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function handlePlacedOrder(
  supabase: SupabaseClient,
  orderId: string,
  restaurantId: string,
  metadata?: Record<string, unknown>
) {
  console.log(`Processing new order ${orderId} for restaurant ${restaurantId}`);

  // Check if order already exists
  const { data: existingOrder } = await supabase
    .from("ifood_orders")
    .select("id")
    .eq("ifood_order_id", orderId)
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  if (existingOrder) {
    console.log(`Order ${orderId} already exists, skipping`);
    return;
  }

  // Get full order details from iFood API
  const { data: settings } = await supabase
    .from("ifood_settings")
    .select("access_token, auto_accept_orders")
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  let orderData: Record<string, unknown> = metadata || {};
  let displayId = "";
  let expiresAt = new Date(Date.now() + 10 * 60 * 1000); // Default 10 min

  if (settings?.access_token) {
    try {
      const orderResponse = await fetch(
        `https://merchant-api.ifood.com.br/order/v1.0/orders/${orderId}`,
        {
          headers: {
            Authorization: `Bearer ${settings.access_token}`,
          },
        }
      );

      if (orderResponse.ok) {
        orderData = await orderResponse.json();
        displayId = (orderData as { displayId?: string }).displayId || "";
        
        // iFood usually gives 10 minutes to accept
        const orderTiming = (orderData as { orderTiming?: { expiresAt?: string } }).orderTiming;
        if (orderTiming?.expiresAt) {
          expiresAt = new Date(orderTiming.expiresAt);
        }
      }
    } catch (error) {
      console.error("Error fetching order details:", error);
    }
  }

  // Insert the order
  const { error: insertError } = await supabase
    .from("ifood_orders")
    .insert({
      restaurant_id: restaurantId,
      ifood_order_id: orderId,
      ifood_display_id: displayId,
      order_data: orderData,
      status: "pending",
      expires_at: expiresAt.toISOString(),
    });

  if (insertError) {
    console.error("Error inserting order:", insertError);
    return;
  }

  console.log(`Order ${orderId} saved successfully`);
}

async function updateOrderStatus(
  supabase: SupabaseClient,
  orderId: string,
  restaurantId: string,
  newStatus: string
) {
  const { error } = await supabase
    .from("ifood_orders")
    .update({ 
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("ifood_order_id", orderId)
    .eq("restaurant_id", restaurantId);

  if (error) {
    console.error(`Error updating order ${orderId} status:`, error);
  } else {
    console.log(`Order ${orderId} status updated to ${newStatus}`);
  }
}
