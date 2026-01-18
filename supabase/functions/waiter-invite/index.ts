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
    const action = url.searchParams.get("action");

    // GET: Validate invite token
    if (req.method === "GET" && action === "validate") {
      const token = url.searchParams.get("token");
      
      if (!token) {
        return new Response(
          JSON.stringify({ error: "Token is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: invite, error } = await supabase
        .from("waiter_invites")
        .select(`
          *,
          restaurants (id, name, slug, logo_url),
          waiters (id, name, email, phone)
        `)
        .eq("token", token)
        .is("used_at", null)
        .gt("expires_at", new Date().toISOString())
        .single();

      if (error || !invite) {
        return new Response(
          JSON.stringify({ error: "Invalid or expired invite" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ 
          valid: true, 
          invite: {
            id: invite.id,
            restaurant: invite.restaurants,
            waiter: invite.waiters,
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST: Register waiter with invite
    if (req.method === "POST" && action === "register") {
      const { token, email, password, pin } = await req.json();

      if (!token || !email || !password) {
        return new Response(
          JSON.stringify({ error: "Token, email and password are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Validate invite
      const { data: invite, error: inviteError } = await supabase
        .from("waiter_invites")
        .select("*, waiters(*)")
        .eq("token", token)
        .is("used_at", null)
        .gt("expires_at", new Date().toISOString())
        .single();

      if (inviteError || !invite) {
        return new Response(
          JSON.stringify({ error: "Invalid or expired invite" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          waiter_id: invite.waiter_id,
          restaurant_id: invite.restaurant_id,
        }
      });

      if (authError) {
        return new Response(
          JSON.stringify({ error: authError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update waiter with user_id and email
      const updateData: Record<string, any> = {
        user_id: authData.user.id,
        email: email,
      };

      // Hash PIN if provided
      if (pin) {
        // Generate salt and hash PIN
        const encoder = new TextEncoder();
        const salt = crypto.randomUUID();
        const pinData = encoder.encode(pin + salt);
        const hashBuffer = await crypto.subtle.digest('SHA-256', pinData);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const pinHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        
        updateData.pin_hash = pinHash;
        updateData.pin_salt = salt;
        updateData.pin = null; // Clear legacy plain-text PIN
      }

      await supabase
        .from("waiters")
        .update(updateData)
        .eq("id", invite.waiter_id);

      // Mark invite as used
      await supabase
        .from("waiter_invites")
        .update({ used_at: new Date().toISOString() })
        .eq("id", invite.id);

      // Add waiter role
      await supabase
        .from("user_roles")
        .insert({
          user_id: authData.user.id,
          role: 'waiter'
        });

      return new Response(
        JSON.stringify({ 
          success: true, 
          user: authData.user,
          waiter: invite.waiters
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST: Generate invite link
    if (req.method === "POST" && action === "generate") {
      const { waiter_id, restaurant_id, created_by } = await req.json();

      if (!waiter_id || !restaurant_id) {
        return new Response(
          JSON.stringify({ error: "waiter_id and restaurant_id are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Generate secure token
      const tokenBytes = new Uint8Array(32);
      crypto.getRandomValues(tokenBytes);
      const token = Array.from(tokenBytes).map(b => b.toString(16).padStart(2, '0')).join('');

      // Delete any existing unused invites for this waiter
      await supabase
        .from("waiter_invites")
        .delete()
        .eq("waiter_id", waiter_id)
        .is("used_at", null);

      // Create new invite
      const { data: invite, error } = await supabase
        .from("waiter_invites")
        .insert({
          restaurant_id,
          waiter_id,
          token,
          created_by,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        })
        .select()
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, invite }),
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
