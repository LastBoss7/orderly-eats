import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface HeartbeatPayload {
  restaurant_id: string;
  client_id: string;
  client_name?: string;
  client_version?: string;
  platform?: string;
  printers_count?: number;
  is_printing?: boolean;
  pending_orders?: number;
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

    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload: HeartbeatPayload = await req.json();
    
    if (!payload.restaurant_id || !payload.client_id) {
      return new Response(
        JSON.stringify({ error: "restaurant_id and client_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify restaurant exists
    const { data: restaurant, error: restError } = await supabase
      .from("restaurants")
      .select("id")
      .eq("id", payload.restaurant_id)
      .maybeSingle();

    if (restError || !restaurant) {
      return new Response(
        JSON.stringify({ error: "Restaurant not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Upsert heartbeat using service role (bypasses RLS)
    const { data, error } = await supabase
      .from("printer_heartbeats")
      .upsert(
        {
          restaurant_id: payload.restaurant_id,
          client_id: payload.client_id,
          client_name: payload.client_name || "Gamako Print Service",
          client_version: payload.client_version || "1.0.0",
          platform: payload.platform || "windows",
          printers_count: payload.printers_count || 0,
          is_printing: payload.is_printing || false,
          pending_orders: payload.pending_orders || 0,
          last_heartbeat_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "restaurant_id,client_id" }
      )
      .select()
      .single();

    if (error) {
      console.error("[printer-heartbeat] Error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to save heartbeat", details: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, heartbeat: data }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[printer-heartbeat] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
