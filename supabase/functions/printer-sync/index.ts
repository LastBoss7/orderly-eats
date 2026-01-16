import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SystemPrinter {
  name: string;
  displayName?: string;
  description?: string;
  isDefault?: boolean;
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

    const url = new URL(req.url);
    const restaurantId = url.searchParams.get("restaurant_id");

    console.log(`[printer-sync] Restaurant: ${restaurantId}, Method: ${req.method}`);

    if (!restaurantId) {
      return new Response(
        JSON.stringify({ error: "restaurant_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (req.method === "POST") {
      // Sync printers from Electron app
      const body = await req.json();
      const printers: SystemPrinter[] = body.printers || [];
      const clientId: string = body.clientId || "unknown";

      console.log(`[printer-sync] Syncing ${printers.length} printers from client ${clientId}`);

      if (printers.length === 0) {
        return new Response(
          JSON.stringify({ success: true, message: "No printers to sync", synced: 0 }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get existing printers for this restaurant
      const { data: existingPrinters } = await supabase
        .from("printers")
        .select("id, printer_name")
        .eq("restaurant_id", restaurantId);

      const existingPrinterNames = new Set(
        (existingPrinters || []).map((p) => p.printer_name)
      );

      let syncedCount = 0;
      let registeredCount = 0;
      const errors: string[] = [];

      for (const printer of printers) {
        // Sync to available_printers table
        const { error: availableError } = await supabase
          .from("available_printers")
          .upsert(
            {
              restaurant_id: restaurantId,
              printer_name: printer.name,
              display_name: printer.displayName || printer.name,
              driver_name: printer.description || null,
              port_name: null,
              is_default: printer.isDefault || false,
              last_seen_at: new Date().toISOString(),
            },
            { onConflict: "restaurant_id,printer_name" }
          );

        if (availableError) {
          console.error(`[printer-sync] Error syncing available_printers: ${printer.name}`, availableError);
          errors.push(`available_printers: ${printer.name} - ${availableError.message}`);
        } else {
          syncedCount++;
        }

        // Auto-register in printers table if not already registered
        if (!existingPrinterNames.has(printer.name)) {
          const { error: printerError } = await supabase.from("printers").insert({
            restaurant_id: restaurantId,
            name: printer.displayName || printer.name,
            printer_name: printer.name,
            model: printer.description || "Impressora do Windows",
            paper_width: 48, // POS 80mm = 48 chars
            linked_order_types: ["counter", "table", "delivery"],
            linked_categories: null,
            is_active: true,
            status: "connected",
            last_seen_at: new Date().toISOString(),
          });

          if (printerError) {
            // Might be duplicate, ignore
            if (!printerError.message.includes("duplicate")) {
              console.error(`[printer-sync] Error registering printer: ${printer.name}`, printerError);
              errors.push(`printers: ${printer.name} - ${printerError.message}`);
            }
          } else {
            registeredCount++;
            existingPrinterNames.add(printer.name);
          }
        }
      }

      // Update last_seen_at for existing printers from this batch
      const printerNames = printers.map((p) => p.name);
      await supabase
        .from("printers")
        .update({ last_seen_at: new Date().toISOString(), status: "connected" })
        .eq("restaurant_id", restaurantId)
        .in("printer_name", printerNames);

      console.log(`[printer-sync] Synced: ${syncedCount}, Registered: ${registeredCount}, Errors: ${errors.length}`);

      return new Response(
        JSON.stringify({
          success: true,
          synced: syncedCount,
          registered: registeredCount,
          errors: errors.length > 0 ? errors : undefined,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GET - List printers for this restaurant
    const { data: printers, error: printersError } = await supabase
      .from("printers")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("name");

    if (printersError) {
      console.error("[printer-sync] Error fetching printers:", printersError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch printers", details: printersError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: availablePrinters } = await supabase
      .from("available_printers")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("printer_name");

    return new Response(
      JSON.stringify({
        printers: printers || [],
        available: availablePrinters || [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[printer-sync] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
