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
      const { code, orderId, merchantId, metadata } = event;

      if (!orderId || !merchantId) {
        console.warn("Missing orderId or merchantId in event:", event);
        continue;
      }

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

      // Handle all event types
      switch (code) {
        // New order
        case "PLC":
        case "PLACED":
          await handlePlacedOrder(supabase, orderId, restaurantId, metadata);
          break;

        // Order confirmed
        case "CFM":
        case "CONFIRMED":
          await updateOrderStatus(supabase, orderId, restaurantId, "confirmed");
          break;

        // Preparation started
        case "PRS":
        case "PREPARATION_STARTED":
          await handlePreparationStarted(supabase, orderId, restaurantId);
          break;

        // Ready for pickup
        case "RTP":
        case "READY_TO_PICKUP":
          await updateOrderStatus(supabase, orderId, restaurantId, "ready");
          break;

        // Dispatched
        case "DSP":
        case "DISPATCHED":
          await updateOrderStatus(supabase, orderId, restaurantId, "dispatched");
          break;

        // Concluded
        case "CON":
        case "CONCLUDED":
          await updateOrderStatus(supabase, orderId, restaurantId, "concluded");
          break;

        // Cancelled
        case "CAN":
        case "CANCELLED":
          await handleCancelled(supabase, orderId, restaurantId, metadata);
          break;

        // Cancellation requested by customer
        case "CCR":
        case "CANCELLATION_REQUESTED":
          await updateOrderStatus(supabase, orderId, restaurantId, "cancellation_requested");
          break;

        // Cancellation request failed
        case "CARF":
        case "CANCELLATION_REQUEST_FAILED":
          await handleCancellationFailed(supabase, orderId, restaurantId, metadata);
          break;

        // Driver assigned
        case "ADR":
        case "ASSIGN_DRIVER":
          await handleDriverAssigned(supabase, orderId, restaurantId, metadata);
          break;

        // Pickup code requested
        case "DELIVERY_PICKUP_CODE_REQUESTED":
          await handlePickupCodeRequested(supabase, orderId, restaurantId, metadata);
          break;

        // Order patched (partial cancellation)
        case "ORDER_PATCHED":
          await handleOrderPatched(supabase, orderId, restaurantId, metadata);
          break;

        // Delivery returning to origin
        case "DELIVERY_RETURNING_TO_ORIGIN":
          await updateOrderStatus(supabase, orderId, restaurantId, "returning");
          break;

        // Return code requested
        case "DELIVERY_RETURN_CODE_REQUESTED":
          await handleReturnCodeRequested(supabase, orderId, restaurantId, metadata);
          break;

        // Delivery returned
        case "DELIVERY_RETURNED_TO_ORIGIN":
          await updateOrderStatus(supabase, orderId, restaurantId, "returned");
          break;

        // Recommended start preparation (for intelligent prep)
        case "RECOMMENDED_START_PREPARATION":
          console.log(`Recommended start preparation for order ${orderId}`);
          // This is just a notification, no action needed
          break;

        default:
          console.log(`Unhandled event code: ${code} for order ${orderId}`);
      }
    }

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

  const { data: settings } = await supabase
    .from("ifood_settings")
    .select("access_token, auto_accept_orders")
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  let orderData: Record<string, unknown> = metadata || {};
  let displayId = "";
  let expiresAt = new Date(Date.now() + 8 * 60 * 1000); // 8 minutes (iFood requirement)
  let orderTiming = "IMMEDIATE";
  let orderType = "DELIVERY";
  let deliveredBy: string | null = null;
  let scheduledTo: string | null = null;
  let preparationStartDatetime: string | null = null;
  let pickupCode: string | null = null;

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
        
        // Extract order timing and scheduling info
        const timing = (orderData as { orderTiming?: string }).orderTiming;
        if (timing) orderTiming = timing;
        
        const type = (orderData as { orderType?: string }).orderType;
        if (type) orderType = type;
        
        const delivery = (orderData as { delivery?: { deliveredBy?: string } }).delivery;
        if (delivery?.deliveredBy) deliveredBy = delivery.deliveredBy;
        
        const scheduling = (orderData as { scheduling?: { scheduledDateTimeStart?: string } }).scheduling;
        if (scheduling?.scheduledDateTimeStart) {
          scheduledTo = scheduling.scheduledDateTimeStart;
        }
        
        const prepStart = (orderData as { preparationStartDateTime?: string }).preparationStartDateTime;
        if (prepStart) {
          preparationStartDatetime = prepStart;
          // For scheduled orders, expiration is 8 min after preparation start
          if (orderTiming === "SCHEDULED") {
            expiresAt = new Date(new Date(prepStart).getTime() + 8 * 60 * 1000);
          }
        }
        
        const pCode = (orderData as { pickupCode?: string }).pickupCode;
        if (pCode) pickupCode = pCode;

        // Check for expiration in orderTiming
        const orderTimingData = (orderData as { orderTiming?: { expiresAt?: string } }).orderTiming;
        if (typeof orderTimingData === "object" && orderTimingData?.expiresAt) {
          expiresAt = new Date(orderTimingData.expiresAt);
        }
      }
    } catch (error) {
      console.error("Error fetching order details:", error);
    }
  }

  const { error: insertError } = await supabase
    .from("ifood_orders")
    .insert({
      restaurant_id: restaurantId,
      ifood_order_id: orderId,
      ifood_display_id: displayId,
      order_data: orderData,
      status: "pending",
      expires_at: expiresAt.toISOString(),
      order_timing: orderTiming,
      order_type: orderType,
      delivered_by: deliveredBy,
      scheduled_to: scheduledTo,
      preparation_start_datetime: preparationStartDatetime,
      pickup_code: pickupCode,
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

async function handlePreparationStarted(
  supabase: SupabaseClient,
  orderId: string,
  restaurantId: string
) {
  const { error } = await supabase
    .from("ifood_orders")
    .update({ 
      status: "preparing",
      preparation_started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("ifood_order_id", orderId)
    .eq("restaurant_id", restaurantId);

  if (error) {
    console.error(`Error updating preparation status for ${orderId}:`, error);
  }

  // Also update local order
  const { data: ifoodOrder } = await supabase
    .from("ifood_orders")
    .select("local_order_id")
    .eq("ifood_order_id", orderId)
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  if (ifoodOrder?.local_order_id) {
    await supabase
      .from("orders")
      .update({ status: "preparing" })
      .eq("id", ifoodOrder.local_order_id);
  }
}

async function handleCancelled(
  supabase: SupabaseClient,
  orderId: string,
  restaurantId: string,
  metadata?: Record<string, unknown>
) {
  const reason = metadata?.reason as string || metadata?.cancellationCode as string || "";
  
  const { error } = await supabase
    .from("ifood_orders")
    .update({ 
      status: "cancelled",
      rejection_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq("ifood_order_id", orderId)
    .eq("restaurant_id", restaurantId);

  if (error) {
    console.error(`Error cancelling order ${orderId}:`, error);
  }

  // Also cancel local order if exists
  const { data: ifoodOrder } = await supabase
    .from("ifood_orders")
    .select("local_order_id")
    .eq("ifood_order_id", orderId)
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  if (ifoodOrder?.local_order_id) {
    await supabase
      .from("orders")
      .update({ status: "cancelled" })
      .eq("id", ifoodOrder.local_order_id);
  }
}

async function handleCancellationFailed(
  supabase: SupabaseClient,
  orderId: string,
  restaurantId: string,
  metadata?: Record<string, unknown>
) {
  const reason = metadata?.reason as string || "Cancellation request failed";
  
  // Revert to previous status (confirmed or preparing)
  const { data: order } = await supabase
    .from("ifood_orders")
    .select("preparation_started_at")
    .eq("ifood_order_id", orderId)
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  const newStatus = order?.preparation_started_at ? "preparing" : "confirmed";

  await supabase
    .from("ifood_orders")
    .update({ 
      status: newStatus,
      rejection_reason: `Cancellation failed: ${reason}`,
      updated_at: new Date().toISOString(),
    })
    .eq("ifood_order_id", orderId)
    .eq("restaurant_id", restaurantId);

  console.log(`Cancellation failed for order ${orderId}: ${reason}`);
}

async function handleDriverAssigned(
  supabase: SupabaseClient,
  orderId: string,
  restaurantId: string,
  metadata?: Record<string, unknown>
) {
  const driver = metadata?.driver as { name?: string; phone?: string } || {};
  
  const { error } = await supabase
    .from("ifood_orders")
    .update({ 
      driver_name: driver.name || null,
      driver_phone: driver.phone || null,
      tracking_available: true,
      updated_at: new Date().toISOString(),
    })
    .eq("ifood_order_id", orderId)
    .eq("restaurant_id", restaurantId);

  if (error) {
    console.error(`Error updating driver info for ${orderId}:`, error);
  } else {
    console.log(`Driver assigned to order ${orderId}: ${driver.name}`);
  }
}

async function handlePickupCodeRequested(
  supabase: SupabaseClient,
  orderId: string,
  restaurantId: string,
  metadata?: Record<string, unknown>
) {
  const pickupCode = metadata?.pickupCode as string;
  
  if (pickupCode) {
    await supabase
      .from("ifood_orders")
      .update({ 
        pickup_code: pickupCode,
        updated_at: new Date().toISOString(),
      })
      .eq("ifood_order_id", orderId)
      .eq("restaurant_id", restaurantId);
  }

  console.log(`Pickup code requested for order ${orderId}`);
}

async function handleOrderPatched(
  supabase: SupabaseClient,
  orderId: string,
  restaurantId: string,
  metadata?: Record<string, unknown>
) {
  const changeType = metadata?.changeType as string || "";
  const changes = metadata?.changes as Array<Record<string, unknown>> || [];
  
  console.log(`Order ${orderId} patched - Type: ${changeType}, Changes: ${JSON.stringify(changes)}`);

  // Get current order data and update it
  const { data: order } = await supabase
    .from("ifood_orders")
    .select("order_data")
    .eq("ifood_order_id", orderId)
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  if (order) {
    const updatedOrderData = {
      ...(order.order_data as Record<string, unknown>),
      _patched: true,
      _patchType: changeType,
      _patchChanges: changes,
    };

    await supabase
      .from("ifood_orders")
      .update({ 
        order_data: updatedOrderData,
        updated_at: new Date().toISOString(),
      })
      .eq("ifood_order_id", orderId)
      .eq("restaurant_id", restaurantId);
  }
}

async function handleReturnCodeRequested(
  supabase: SupabaseClient,
  orderId: string,
  restaurantId: string,
  metadata?: Record<string, unknown>
) {
  const returnCode = metadata?.returnCode as string;
  
  console.log(`Return code requested for order ${orderId}: ${returnCode}`);

  // Store return code in order data for display
  const { data: order } = await supabase
    .from("ifood_orders")
    .select("order_data")
    .eq("ifood_order_id", orderId)
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  if (order) {
    const updatedOrderData = {
      ...(order.order_data as Record<string, unknown>),
      _returnCode: returnCode,
    };

    await supabase
      .from("ifood_orders")
      .update({ 
        order_data: updatedOrderData,
        status: "return_code_requested",
        updated_at: new Date().toISOString(),
      })
      .eq("ifood_order_id", orderId)
      .eq("restaurant_id", restaurantId);
  }
}
