import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper to hash PIN
async function hashPin(pin: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const pinData = encoder.encode(pin + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', pinData);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
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

      // Check if this is a generic invite (no waiter linked yet)
      const isGenericInvite = !invite.waiter_id;

      return new Response(
        JSON.stringify({ 
          valid: true, 
          invite: {
            id: invite.id,
            restaurant: invite.restaurants,
            waiter: invite.waiters,
            isGenericInvite,
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST: Register waiter with invite
    if (req.method === "POST" && action === "register") {
      const { token, email, password, pin, name, phone } = await req.json();

      if (!token || !email || !password) {
        return new Response(
          JSON.stringify({ error: "Token, email and password are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Validate invite
      const { data: invite, error: inviteError } = await supabase
        .from("waiter_invites")
        .select("*, waiters(*), restaurants(slug)")
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

      const isGenericInvite = !invite.waiter_id;
      let waiterId = invite.waiter_id;

      // For generic invites, we need name
      if (isGenericInvite && !name) {
        return new Response(
          JSON.stringify({ error: "Name is required for registration" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create auth user first
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          restaurant_id: invite.restaurant_id,
        }
      });

      if (authError) {
        return new Response(
          JSON.stringify({ error: authError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // For generic invite, create the waiter record
      if (isGenericInvite) {
        const waiterData: Record<string, any> = {
          restaurant_id: invite.restaurant_id,
          name: name.trim(),
          email: email,
          phone: phone?.trim() || null,
          status: 'active',
          user_id: authData.user.id,
        };

        // Hash PIN if provided
        if (pin) {
          const salt = crypto.randomUUID();
          waiterData.pin_hash = await hashPin(pin, salt);
          waiterData.pin_salt = salt;
        }

        const { data: newWaiter, error: createError } = await supabase
          .from("waiters")
          .insert(waiterData)
          .select()
          .single();

        if (createError) {
          // Rollback: delete auth user
          await supabase.auth.admin.deleteUser(authData.user.id);
          return new Response(
            JSON.stringify({ error: createError.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        waiterId = newWaiter.id;
      } else {
        // For existing waiter, update their record
        const updateData: Record<string, any> = {
          user_id: authData.user.id,
          email: email,
        };

        if (pin) {
          const salt = crypto.randomUUID();
          updateData.pin_hash = await hashPin(pin, salt);
          updateData.pin_salt = salt;
          updateData.pin = null;
        }

        await supabase
          .from("waiters")
          .update(updateData)
          .eq("id", invite.waiter_id);
      }

      // Update auth user metadata with waiter_id
      await supabase.auth.admin.updateUserById(authData.user.id, {
        user_metadata: {
          waiter_id: waiterId,
          restaurant_id: invite.restaurant_id,
        }
      });

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

      // Get the created/updated waiter
      const { data: waiter } = await supabase
        .from("waiters")
        .select("*")
        .eq("id", waiterId)
        .single();

      return new Response(
        JSON.stringify({ 
          success: true, 
          user: authData.user,
          waiter,
          restaurantSlug: invite.restaurants?.slug,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST: Generate invite link (can be generic or for specific waiter)
    if (req.method === "POST" && action === "generate") {
      const { waiter_id, restaurant_id, created_by } = await req.json();

      if (!restaurant_id) {
        return new Response(
          JSON.stringify({ error: "restaurant_id is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Generate secure token
      const tokenBytes = new Uint8Array(32);
      crypto.getRandomValues(tokenBytes);
      const token = Array.from(tokenBytes).map(b => b.toString(16).padStart(2, '0')).join('');

      // If waiter_id is provided, delete any existing unused invites for this waiter
      if (waiter_id) {
        await supabase
          .from("waiter_invites")
          .delete()
          .eq("waiter_id", waiter_id)
          .is("used_at", null);
      }

      // Create new invite (waiter_id can be null for generic invites)
      const { data: invite, error } = await supabase
        .from("waiter_invites")
        .insert({
          restaurant_id,
          waiter_id: waiter_id || null,
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
