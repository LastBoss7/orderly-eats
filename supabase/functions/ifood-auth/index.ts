import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const IFOOD_API_BASE = "https://merchant-api.ifood.com.br";

interface TokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  type: string;
}

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

    if (!action) {
      return new Response(
        JSON.stringify({ error: "Missing action parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get restaurant_id from request body
    const body = await req.json().catch(() => ({}));
    const { restaurant_id } = body;

    if (!restaurant_id) {
      return new Response(
        JSON.stringify({ error: "Missing restaurant_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get iFood settings for this restaurant
    const { data: settings, error: settingsError } = await supabase
      .from("ifood_settings")
      .select("*")
      .eq("restaurant_id", restaurant_id)
      .maybeSingle();

    if (settingsError) {
      console.error("Error fetching settings:", settingsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch settings" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const clientId = Deno.env.get("IFOOD_CLIENT_ID");
    const clientSecret = Deno.env.get("IFOOD_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      return new Response(
        JSON.stringify({ error: "iFood credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "token") {
      // Get new access token using client credentials
      const tokenResponse = await fetch(`${IFOOD_API_BASE}/authentication/v1.0/oauth/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          grantType: "client_credentials",
          clientId,
          clientSecret,
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error("iFood token error:", errorText);
        return new Response(
          JSON.stringify({ error: "Failed to authenticate with iFood", details: errorText }),
          { status: tokenResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const tokenData: TokenResponse = await tokenResponse.json();
      const expiresAt = new Date(Date.now() + tokenData.expiresIn * 1000);

      // Upsert settings with new token
      const { error: upsertError } = await supabase
        .from("ifood_settings")
        .upsert({
          restaurant_id,
          access_token: tokenData.accessToken,
          refresh_token: tokenData.refreshToken || null,
          token_expires_at: expiresAt.toISOString(),
          sync_status: "connected",
          last_sync_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "restaurant_id",
        });

      if (upsertError) {
        console.error("Error saving token:", upsertError);
        return new Response(
          JSON.stringify({ error: "Failed to save token" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          expiresAt: expiresAt.toISOString(),
          syncStatus: "connected",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "refresh") {
      // Check if we have a refresh token
      if (!settings?.refresh_token) {
        // Fall back to client credentials
        return new Response(
          JSON.stringify({ error: "No refresh token, use 'token' action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const refreshResponse = await fetch(`${IFOOD_API_BASE}/authentication/v1.0/oauth/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          grantType: "refresh_token",
          clientId,
          clientSecret,
          refreshToken: settings.refresh_token,
        }),
      });

      if (!refreshResponse.ok) {
        // If refresh fails, update status and return error
        await supabase
          .from("ifood_settings")
          .update({ sync_status: "token_expired" })
          .eq("restaurant_id", restaurant_id);

        return new Response(
          JSON.stringify({ error: "Token refresh failed, re-authenticate required" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const tokenData: TokenResponse = await refreshResponse.json();
      const expiresAt = new Date(Date.now() + tokenData.expiresIn * 1000);

      await supabase
        .from("ifood_settings")
        .update({
          access_token: tokenData.accessToken,
          refresh_token: tokenData.refreshToken || settings.refresh_token,
          token_expires_at: expiresAt.toISOString(),
          sync_status: "connected",
          last_sync_at: new Date().toISOString(),
        })
        .eq("restaurant_id", restaurant_id);

      return new Response(
        JSON.stringify({
          success: true,
          expiresAt: expiresAt.toISOString(),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "test") {
      // Test connection by fetching merchant info
      if (!settings?.access_token || !settings?.merchant_id) {
        return new Response(
          JSON.stringify({ error: "Token or Merchant ID not configured" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const merchantResponse = await fetch(
        `${IFOOD_API_BASE}/merchant/v1.0/merchants/${settings.merchant_id}`,
        {
          headers: {
            Authorization: `Bearer ${settings.access_token}`,
          },
        }
      );

      if (!merchantResponse.ok) {
        const status = merchantResponse.status === 401 ? "token_expired" : "error";
        await supabase
          .from("ifood_settings")
          .update({ sync_status: status })
          .eq("restaurant_id", restaurant_id);

        return new Response(
          JSON.stringify({ 
            error: "Failed to connect to iFood", 
            status: merchantResponse.status 
          }),
          { status: merchantResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const merchantData = await merchantResponse.json();

      await supabase
        .from("ifood_settings")
        .update({ 
          sync_status: "connected",
          last_sync_at: new Date().toISOString(),
        })
        .eq("restaurant_id", restaurant_id);

      return new Response(
        JSON.stringify({
          success: true,
          merchant: merchantData,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const error = err as Error;
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
