import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    console.log(`[printer-config] Restaurant: ${restaurantId}`);

    if (!restaurantId) {
      return new Response(
        JSON.stringify({ error: "restaurant_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch restaurant info
    const { data: restaurant, error: restError } = await supabase
      .from("restaurants")
      .select("id, name, phone, address, cnpj, logo_url")
      .eq("id", restaurantId)
      .single();

    if (restError) {
      console.error("Error fetching restaurant:", restError);
      return new Response(
        JSON.stringify({ error: "Restaurant not found", details: restError.message }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch salon settings with print layout
    const { data: salonSettings } = await supabase
      .from("salon_settings")
      .select("print_layout, receipt_header, receipt_footer, show_address_on_receipt, show_phone_on_receipt, show_cnpj_on_receipt")
      .eq("restaurant_id", restaurantId)
      .maybeSingle();

    // Fetch active printers for this restaurant
    const { data: printers } = await supabase
      .from("printers")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .eq("is_active", true);

    // Fetch categories (for printer filtering)
    const { data: categories } = await supabase
      .from("categories")
      .select("id, name")
      .eq("restaurant_id", restaurantId)
      .order("sort_order", { ascending: true });

    console.log(`[printer-config] Found: restaurant=${restaurant?.name}, printers=${printers?.length || 0}`);

    return new Response(
      JSON.stringify({
        restaurant: {
          id: restaurant.id,
          name: restaurant.name,
          phone: restaurant.phone,
          address: restaurant.address,
          cnpj: restaurant.cnpj,
          logoUrl: restaurant.logo_url,
        },
        settings: {
          printLayout: salonSettings?.print_layout || {},
          receiptHeader: salonSettings?.receipt_header,
          receiptFooter: salonSettings?.receipt_footer,
          showAddress: salonSettings?.show_address_on_receipt ?? true,
          showPhone: salonSettings?.show_phone_on_receipt ?? true,
          showCnpj: salonSettings?.show_cnpj_on_receipt ?? false,
        },
        printers: printers || [],
        categories: categories || [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
