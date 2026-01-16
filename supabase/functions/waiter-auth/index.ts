import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple hash function using Web Crypto API
async function hashPin(pin: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + salt);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { action, restaurant_id, pin, waiter_id, new_pin } = await req.json();

    // Action: authenticate - verify waiter PIN
    if (action === "authenticate") {
      if (!restaurant_id || !pin) {
        return new Response(
          JSON.stringify({ error: "restaurant_id and pin are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get all active waiters for this restaurant
      const { data: waiters, error: fetchError } = await supabase
        .from("waiters")
        .select("id, name, status, restaurant_id, pin, pin_hash, pin_salt")
        .eq("restaurant_id", restaurant_id)
        .eq("status", "active");

      if (fetchError) {
        console.error("Error fetching waiters:", fetchError);
        return new Response(
          JSON.stringify({ error: "Database error" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Find waiter by PIN (check hashed first, then plain for migration)
      let foundWaiter = null;

      for (const waiter of waiters || []) {
        // Check hashed PIN first
        if (waiter.pin_hash && waiter.pin_salt) {
          const hashedInput = await hashPin(pin, waiter.pin_salt);
          if (hashedInput === waiter.pin_hash) {
            foundWaiter = waiter;
            break;
          }
        }
        // Fallback: check plain PIN (for migration)
        else if (waiter.pin === pin) {
          foundWaiter = waiter;
          
          // Migrate to hashed PIN
          const salt = crypto.randomUUID();
          const hashedPin = await hashPin(pin, salt);
          
          await supabase
            .from("waiters")
            .update({ 
              pin_hash: hashedPin, 
              pin_salt: salt,
              pin: null // Clear plain text PIN
            })
            .eq("id", waiter.id);
          
          console.log(`Migrated waiter ${waiter.id} to hashed PIN`);
          break;
        }
      }

      if (!foundWaiter) {
        return new Response(
          JSON.stringify({ error: "PIN não encontrado", authenticated: false }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Return waiter data (without sensitive fields)
      return new Response(
        JSON.stringify({
          authenticated: true,
          waiter: {
            id: foundWaiter.id,
            name: foundWaiter.name,
            status: foundWaiter.status,
            restaurant_id: foundWaiter.restaurant_id,
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: set_pin - create or update waiter PIN
    if (action === "set_pin") {
      if (!waiter_id || !new_pin) {
        return new Response(
          JSON.stringify({ error: "waiter_id and new_pin are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Generate salt and hash the PIN
      const salt = crypto.randomUUID();
      const hashedPin = await hashPin(new_pin, salt);

      // Check if PIN hash already exists for another waiter in the same restaurant
      const { data: waiterData } = await supabase
        .from("waiters")
        .select("restaurant_id")
        .eq("id", waiter_id)
        .single();

      if (!waiterData) {
        return new Response(
          JSON.stringify({ error: "Waiter not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get all other waiters to check for duplicate PIN
      const { data: otherWaiters } = await supabase
        .from("waiters")
        .select("id, pin, pin_hash, pin_salt")
        .eq("restaurant_id", waiterData.restaurant_id)
        .neq("id", waiter_id);

      for (const other of otherWaiters || []) {
        // Check hashed PIN
        if (other.pin_hash && other.pin_salt) {
          const hashedInput = await hashPin(new_pin, other.pin_salt);
          if (hashedInput === other.pin_hash) {
            return new Response(
              JSON.stringify({ error: "Este PIN já está em uso por outro garçom" }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
        // Check plain PIN
        if (other.pin === new_pin) {
          return new Response(
            JSON.stringify({ error: "Este PIN já está em uso por outro garçom" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      // Update waiter with hashed PIN
      const { error: updateError } = await supabase
        .from("waiters")
        .update({ 
          pin_hash: hashedPin, 
          pin_salt: salt,
          pin: null // Clear any existing plain text PIN
        })
        .eq("id", waiter_id);

      if (updateError) {
        console.error("Error updating PIN:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to update PIN" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
