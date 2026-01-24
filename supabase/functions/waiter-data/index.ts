import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============= INPUT VALIDATION UTILITIES =============

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Slug validation regex (alphanumeric, hyphens, underscores)
const SLUG_REGEX = /^[a-z0-9_-]+$/i;

// Phone validation regex (digits, spaces, hyphens, parentheses, plus sign)
const PHONE_REGEX = /^[\d\s\-()+ ]{8,20}$/;

// CEP validation regex (Brazilian postal code)
const CEP_REGEX = /^[\d\-]{8,9}$/;

// Max lengths for text fields to prevent overflow attacks
const MAX_LENGTHS = {
  name: 200,
  phone: 30,
  address: 500,
  notes: 2000,
  customerName: 200,
  slug: 100,
  search: 100,
  city: 100,
  neighborhood: 100,
  complement: 200,
  number: 20,
  cep: 10,
  orderType: 50,
  status: 50,
  paymentMethod: 50,
} as const;

// Allowed order types
const VALID_ORDER_TYPES = ['table', 'tab', 'delivery', 'takeaway', 'counter', 'conference', 'closing'];

// Allowed statuses
const VALID_ORDER_STATUSES = ['pending', 'preparing', 'ready', 'served', 'delivered', 'cancelled', 'conference', 'closing'];

// Allowed table/tab statuses
const VALID_TABLE_STATUSES = ['available', 'occupied', 'closing'];

// Allowed payment methods
const VALID_PAYMENT_METHODS = ['cash', 'credit', 'debit', 'pix', 'mixed'];

// Allowed print statuses
const VALID_PRINT_STATUSES = ['pending', 'printed', 'error'];

// Allowed actions
const VALID_ACTIONS = [
  'get-restaurant', 'tables', 'tabs', 'categories', 'products', 
  'product-addons', 'table-orders', 'tab-orders', 'ready-orders',
  'pending-totals', 'table-total', 'tab-total', 'search-customers',
  'create-order', 'update-table', 'close-orders', 'update-tab',
  'create-tab', 'create-customer', 'add-to-order', 'print-conference',
  'reprint-order', 'update-order-status', 'bulk-update-order-status'
];

interface ValidationResult {
  valid: boolean;
  error?: string;
}

// Validates UUID format
function isValidUUID(value: unknown): value is string {
  return typeof value === 'string' && UUID_REGEX.test(value);
}

// Validates slug format
function isValidSlug(value: unknown): value is string {
  return typeof value === 'string' && SLUG_REGEX.test(value) && value.length <= MAX_LENGTHS.slug;
}

// Sanitize string input - removes dangerous characters and trims
function sanitizeString(value: unknown, maxLength: number): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return null;
  
  // Trim and limit length
  let sanitized = value.trim().slice(0, maxLength);
  
  // Remove null bytes and control characters (except newlines/tabs for notes)
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  return sanitized || null;
}

// Sanitize and validate phone number
function sanitizePhone(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return null;
  
  const sanitized = value.trim().slice(0, MAX_LENGTHS.phone);
  // Only allow digits, spaces, hyphens, parentheses, plus sign
  const cleaned = sanitized.replace(/[^\d\s\-()+ ]/g, '');
  
  if (!cleaned || cleaned.length < 8) return null;
  return cleaned;
}

// Validate and sanitize number
function sanitizeNumber(value: unknown, min: number = 0, max: number = 1000000): number | null {
  if (value === null || value === undefined) return null;
  
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (typeof num !== 'number' || isNaN(num)) return null;
  if (num < min || num > max) return null;
  
  return num;
}

// Validate positive integer
function sanitizePositiveInt(value: unknown, max: number = 10000): number | null {
  const num = sanitizeNumber(value, 0, max);
  if (num === null) return null;
  return Math.floor(num);
}

// Validate array of UUIDs
function validateUUIDArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  if (value.length === 0) return [];
  if (value.length > 1000) return null; // Prevent DoS with huge arrays
  
  const validIds: string[] = [];
  for (const id of value) {
    if (!isValidUUID(id)) return null;
    validIds.push(id);
  }
  return validIds;
}

// Validate action parameter
function isValidAction(action: string): boolean {
  return VALID_ACTIONS.includes(action);
}

// Validate order type
function isValidOrderType(orderType: unknown): orderType is string {
  return typeof orderType === 'string' && VALID_ORDER_TYPES.includes(orderType);
}

// Validate order status
function isValidOrderStatus(status: unknown): status is string {
  return typeof status === 'string' && VALID_ORDER_STATUSES.includes(status);
}

// Validate table/tab status
function isValidTableStatus(status: unknown): status is string {
  return typeof status === 'string' && VALID_TABLE_STATUSES.includes(status);
}

// Validate payment method
function isValidPaymentMethod(method: unknown): method is string {
  return typeof method === 'string' && VALID_PAYMENT_METHODS.includes(method);
}

// Validate and sanitize order items array
function validateOrderItems(items: unknown): { valid: boolean; items: any[]; error?: string } {
  if (!Array.isArray(items)) {
    return { valid: false, items: [], error: 'items must be an array' };
  }
  
  if (items.length === 0) {
    return { valid: true, items: [] };
  }
  
  if (items.length > 500) {
    return { valid: false, items: [], error: 'Too many items in order' };
  }
  
  const validatedItems: any[] = [];
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    
    if (typeof item !== 'object' || item === null) {
      return { valid: false, items: [], error: `Item ${i} is invalid` };
    }
    
    const productName = sanitizeString(item.product_name, MAX_LENGTHS.name);
    if (!productName) {
      return { valid: false, items: [], error: `Item ${i} has invalid product_name` };
    }
    
    const productPrice = sanitizeNumber(item.product_price, 0, 100000);
    if (productPrice === null) {
      return { valid: false, items: [], error: `Item ${i} has invalid product_price` };
    }
    
    const quantity = sanitizePositiveInt(item.quantity, 1000);
    if (quantity === null || quantity < 1) {
      return { valid: false, items: [], error: `Item ${i} has invalid quantity` };
    }
    
    validatedItems.push({
      product_id: isValidUUID(item.product_id) ? item.product_id : null,
      product_name: productName,
      product_price: productPrice,
      quantity: quantity,
      notes: sanitizeString(item.notes, MAX_LENGTHS.notes),
      product_size: ['small', 'medium', 'large'].includes(item.product_size) ? item.product_size : null,
      category_id: isValidUUID(item.category_id) ? item.category_id : null,
    });
  }
  
  return { valid: true, items: validatedItems };
}

// Validate payments array for mixed payments
function validatePayments(payments: unknown): { valid: boolean; payments: any[]; error?: string } {
  if (!Array.isArray(payments)) {
    return { valid: true, payments: [] }; // Optional field
  }
  
  if (payments.length > 20) {
    return { valid: false, payments: [], error: 'Too many payment entries' };
  }
  
  const validatedPayments: any[] = [];
  
  for (let i = 0; i < payments.length; i++) {
    const payment = payments[i];
    
    if (typeof payment !== 'object' || payment === null) {
      return { valid: false, payments: [], error: `Payment ${i} is invalid` };
    }
    
    if (!isValidPaymentMethod(payment.method)) {
      return { valid: false, payments: [], error: `Payment ${i} has invalid method` };
    }
    
    const amount = sanitizeNumber(payment.amount, 0, 1000000);
    if (amount === null) {
      return { valid: false, payments: [], error: `Payment ${i} has invalid amount` };
    }
    
    validatedPayments.push({
      id: isValidUUID(payment.id) ? payment.id : null,
      method: payment.method,
      amount: amount,
      cashReceived: sanitizeNumber(payment.cashReceived, 0, 1000000),
    });
  }
  
  return { valid: true, payments: validatedPayments };
}

// Create error response helper
function errorResponse(message: string, status: number = 400): Response {
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// Create success response helper
function successResponse(data: unknown, status: number = 200): Response {
  return new Response(
    JSON.stringify(data),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// ============= MAIN HANDLER =============

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "tables";
    
    // Validate action
    if (!isValidAction(action)) {
      return errorResponse("Invalid action");
    }

    const restaurantId = url.searchParams.get("restaurant_id");

    // GET restaurant by slug (public endpoint - no restaurant_id needed)
    if (action === "get-restaurant") {
      const slug = url.searchParams.get("slug");
      
      if (!slug || !isValidSlug(slug)) {
        return errorResponse("Valid slug is required");
      }

      const { data, error } = await supabase
        .from("restaurants")
        .select("id, name, slug, logo_url")
        .eq("slug", slug)
        .single();

      if (error) {
        console.error("Restaurant fetch error:", error);
        return new Response(
          JSON.stringify({ error: "Restaurant not found", found: false }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return successResponse({ data, found: true });
    }

    // Validate restaurant_id for all other actions
    if (!restaurantId || !isValidUUID(restaurantId)) {
      return errorResponse("Valid restaurant_id is required");
    }

    // GET tables
    if (action === "tables") {
      const { data, error } = await supabase
        .from("tables")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("number");

      if (error) throw error;
      return successResponse({ data });
    }

    // GET tabs
    if (action === "tabs") {
      const { data, error } = await supabase
        .from("tabs")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("number");

      if (error) throw error;
      return successResponse({ data });
    }

    // GET categories
    if (action === "categories") {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("sort_order");

      if (error) throw error;
      return successResponse({ data });
    }

    // GET product addons (for waiter app - bypasses RLS)
    if (action === "product-addons") {
      const productId = url.searchParams.get("product_id");
      const productCategoryId = url.searchParams.get("category_id");

      if (!productId || !isValidUUID(productId)) {
        return errorResponse("Valid product_id is required");
      }

      // Validate optional category_id
      if (productCategoryId && !isValidUUID(productCategoryId)) {
        return errorResponse("Invalid category_id format");
      }

      // Get addon groups linked directly to this product
      const { data: productLinks } = await supabase
        .from("product_addon_groups")
        .select("addon_group_id")
        .eq("product_id", productId);

      // Get addon groups linked to the product's category
      let categoryGroupIds: string[] = [];
      if (productCategoryId) {
        const { data: categoryLinks } = await supabase
          .from("category_addon_groups")
          .select("addon_group_id")
          .eq("category_id", productCategoryId);
        categoryGroupIds = (categoryLinks || []).map((l: any) => l.addon_group_id);
      }

      // Combine both sources (remove duplicates)
      const productGroupIds = (productLinks || []).map((l: any) => l.addon_group_id);
      const allGroupIds = [...new Set([...productGroupIds, ...categoryGroupIds])];

      if (allGroupIds.length === 0) {
        return successResponse({ groups: [], addons: [] });
      }

      // Fetch the addon groups
      const { data: groups } = await supabase
        .from("addon_groups")
        .select("id, name, description, is_required, min_selections, max_selections")
        .in("id", allGroupIds)
        .eq("is_active", true)
        .order("sort_order");

      // Fetch all addons for these groups
      const { data: addons } = await supabase
        .from("addons")
        .select("id, group_id, name, price, is_available")
        .in("group_id", allGroupIds)
        .eq("is_available", true)
        .order("sort_order");

      return successResponse({ groups: groups || [], addons: addons || [] });
    }

    // GET products (with optional category filter for lazy loading)
    if (action === "products") {
      const categoryId = url.searchParams.get("category_id");
      
      // Validate optional category_id
      if (categoryId && !isValidUUID(categoryId)) {
        return errorResponse("Invalid category_id format");
      }
      
      let query = supabase
        .from("products")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .eq("is_available", true);
      
      if (categoryId) {
        query = query.eq("category_id", categoryId);
      }
      
      const { data, error } = await query.order("name");

      if (error) throw error;
      return successResponse({ data });
    }

    // GET orders for a table
    if (action === "table-orders") {
      const tableId = url.searchParams.get("table_id");
      
      if (!tableId || !isValidUUID(tableId)) {
        return errorResponse("Valid table_id is required");
      }

      const { data, error } = await supabase
        .from("orders")
        .select(`*, order_items (*), waiters (id, name)`)
        .eq("restaurant_id", restaurantId)
        .eq("table_id", tableId)
        .is("closed_at", null)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return successResponse({ data });
    }

    // GET orders for a tab
    if (action === "tab-orders") {
      const tabId = url.searchParams.get("tab_id");
      
      if (!tabId || !isValidUUID(tabId)) {
        return errorResponse("Valid tab_id is required");
      }

      const { data, error } = await supabase
        .from("orders")
        .select(`*, order_items (*), waiters (id, name)`)
        .eq("restaurant_id", restaurantId)
        .eq("tab_id", tabId)
        .is("closed_at", null)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return successResponse({ data });
    }

    // GET ready orders for tables
    if (action === "ready-orders") {
      const { data, error } = await supabase
        .from("orders")
        .select("table_id, status")
        .eq("restaurant_id", restaurantId)
        .eq("status", "ready")
        .not("table_id", "is", null);

      if (error) throw error;
      return successResponse({ data });
    }

    // GET pending totals for all tables and tabs (for status override)
    if (action === "pending-totals") {
      const { data: orders, error } = await supabase
        .from("orders")
        .select("table_id, tab_id, total")
        .eq("restaurant_id", restaurantId)
        .is("closed_at", null);

      if (error) throw error;

      // Aggregate totals by table and tab
      const tableTotals: Record<string, number> = {};
      const tabTotals: Record<string, number> = {};

      for (const order of orders || []) {
        if (order.table_id) {
          tableTotals[order.table_id] = (tableTotals[order.table_id] || 0) + (order.total || 0);
        }
        if (order.tab_id) {
          tabTotals[order.tab_id] = (tabTotals[order.tab_id] || 0) + (order.total || 0);
        }
      }

      return successResponse({ tableTotals, tabTotals });
    }

    // GET table total
    if (action === "table-total") {
      const tableId = url.searchParams.get("table_id");
      
      if (!tableId || !isValidUUID(tableId)) {
        return errorResponse("Valid table_id is required");
      }

      const { data, error } = await supabase
        .from("orders")
        .select("total")
        .eq("restaurant_id", restaurantId)
        .eq("table_id", tableId)
        .is("closed_at", null);

      if (error) throw error;
      const total = data?.reduce((sum: number, order: { total: number | null }) => sum + (order.total || 0), 0) || 0;
      return successResponse({ total });
    }

    // GET tab total
    if (action === "tab-total") {
      const tabId = url.searchParams.get("tab_id");
      
      if (!tabId || !isValidUUID(tabId)) {
        return errorResponse("Valid tab_id is required");
      }

      const { data, error } = await supabase
        .from("orders")
        .select("total")
        .eq("restaurant_id", restaurantId)
        .eq("tab_id", tabId)
        .is("closed_at", null);

      if (error) throw error;
      const total = data?.reduce((sum: number, order: { total: number | null }) => sum + (order.total || 0), 0) || 0;
      return successResponse({ total });
    }

    // GET search customers
    if (action === "search-customers") {
      const searchRaw = url.searchParams.get("search") || "";
      const search = sanitizeString(searchRaw, MAX_LENGTHS.search);
      
      if (!search || search.length < 2) {
        return successResponse({ data: [] });
      }

      // Escape special characters for ILIKE pattern
      const escapedSearch = search.replace(/[%_\\]/g, '\\$&');

      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .or(`phone.ilike.%${escapedSearch}%,name.ilike.%${escapedSearch}%`)
        .limit(10);

      if (error) throw error;
      return successResponse({ data });
    }

    // POST create order
    if (req.method === "POST" && action === "create-order") {
      const body = await req.json();
      
      // Validate order type
      if (!isValidOrderType(body.order_type)) {
        return errorResponse("Invalid order_type");
      }

      // Validate optional UUIDs
      if (body.table_id && !isValidUUID(body.table_id)) {
        return errorResponse("Invalid table_id format");
      }
      if (body.tab_id && !isValidUUID(body.tab_id)) {
        return errorResponse("Invalid tab_id format");
      }
      if (body.customer_id && !isValidUUID(body.customer_id)) {
        return errorResponse("Invalid customer_id format");
      }
      if (body.waiter_id && !isValidUUID(body.waiter_id)) {
        return errorResponse("Invalid waiter_id format");
      }

      // Validate print_status if provided
      if (body.print_status && !VALID_PRINT_STATUSES.includes(body.print_status)) {
        return errorResponse("Invalid print_status");
      }

      // Validate total
      const total = sanitizeNumber(body.total, 0, 1000000);
      if (total === null) {
        return errorResponse("Invalid total amount");
      }

      // Validate delivery_fee
      const deliveryFee = sanitizeNumber(body.delivery_fee, 0, 10000) || 0;

      // Validate items
      const itemsValidation = validateOrderItems(body.items || []);
      if (!itemsValidation.valid) {
        return errorResponse(itemsValidation.error || "Invalid items");
      }
      
      // Get next order number atomically using database function
      const { data: orderNumber, error: orderNumberError } = await supabase
        .rpc('get_next_order_number', { _restaurant_id: restaurantId });

      if (orderNumberError) throw orderNumberError;
      
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          restaurant_id: restaurantId,
          table_id: body.table_id || null,
          tab_id: body.tab_id || null,
          order_type: body.order_type,
          status: "pending",
          print_status: body.print_status || "pending",
          total: total,
          notes: sanitizeString(body.notes, MAX_LENGTHS.notes),
          customer_id: body.customer_id || null,
          customer_name: sanitizeString(body.customer_name, MAX_LENGTHS.customerName),
          delivery_address: sanitizeString(body.delivery_address, MAX_LENGTHS.address),
          delivery_phone: sanitizePhone(body.delivery_phone),
          delivery_fee: deliveryFee,
          waiter_id: body.waiter_id || null,
          order_number: orderNumber,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Insert order items
      if (itemsValidation.items.length > 0) {
        const orderItems = itemsValidation.items.map((item: any) => ({
          restaurant_id: restaurantId,
          order_id: order.id,
          product_id: item.product_id,
          product_name: item.product_name,
          product_price: item.product_price,
          quantity: item.quantity,
          notes: item.notes,
          product_size: item.product_size,
          category_id: item.category_id,
        }));

        const { error: itemsError } = await supabase
          .from("order_items")
          .insert(orderItems);

        if (itemsError) throw itemsError;
      }

      // Update table status if it's a table order
      if (body.table_id) {
        await supabase
          .from("tables")
          .update({ status: "occupied" })
          .eq("id", body.table_id);
      }

      // Update tab status if it's a tab order
      if (body.tab_id) {
        await supabase
          .from("tabs")
          .update({ status: "occupied" })
          .eq("id", body.tab_id);
      }

      return successResponse({ success: true, order });
    }

    // POST update table status
    if (req.method === "POST" && action === "update-table") {
      const body = await req.json();
      
      if (!body.table_id || !isValidUUID(body.table_id)) {
        return errorResponse("Valid table_id is required");
      }

      if (!isValidTableStatus(body.status)) {
        return errorResponse("Invalid status. Must be: available, occupied, or closing");
      }
      
      const { error } = await supabase
        .from("tables")
        .update({ status: body.status })
        .eq("id", body.table_id)
        .eq("restaurant_id", restaurantId);

      if (error) throw error;
      return successResponse({ success: true });
    }

    // POST close orders (for table/tab closing)
    if (req.method === "POST" && action === "close-orders") {
      const body = await req.json();
      
      // Validate order_ids
      const orderIds = validateUUIDArray(body.order_ids);
      if (orderIds === null) {
        return errorResponse("order_ids must be a valid array of UUIDs");
      }

      // Validate optional UUIDs
      if (body.table_id && !isValidUUID(body.table_id)) {
        return errorResponse("Invalid table_id format");
      }
      if (body.tab_id && !isValidUUID(body.tab_id)) {
        return errorResponse("Invalid tab_id format");
      }

      // Validate payment_method
      if (body.payment_method && !isValidPaymentMethod(body.payment_method)) {
        return errorResponse("Invalid payment_method");
      }

      // Validate payments array
      const paymentsValidation = validatePayments(body.payments);
      if (!paymentsValidation.valid) {
        return errorResponse(paymentsValidation.error || "Invalid payments");
      }

      // Validate numeric fields
      const cashReceived = sanitizeNumber(body.cash_received, 0, 1000000);
      const changeGiven = sanitizeNumber(body.change_given, 0, 1000000);
      const splitCount = sanitizePositiveInt(body.split_count, 100);
      
      // Determine payment method for orders
      const isMixedPayment = paymentsValidation.payments.length > 0;
      const paymentMethodForOrders = isMixedPayment ? 'mixed' : body.payment_method;
      
      for (const orderId of orderIds) {
        await supabase
          .from("orders")
          .update({
            status: "delivered",
            payment_method: paymentMethodForOrders,
            cash_received: cashReceived,
            change_given: changeGiven,
            split_people: splitCount,
            closed_at: new Date().toISOString(),
          })
          .eq("id", orderId)
          .eq("restaurant_id", restaurantId);
      }

      // Save mixed payments to tab_payments table
      if (isMixedPayment && body.tab_id) {
        for (const payment of paymentsValidation.payments) {
          const paymentChangeGiven = payment.method === 'cash' && payment.cashReceived && payment.cashReceived > payment.amount
            ? payment.cashReceived - payment.amount
            : null;
            
          await supabase
            .from("tab_payments")
            .insert({
              restaurant_id: restaurantId,
              tab_id: body.tab_id,
              payment_method: payment.method,
              amount: payment.amount,
              cash_received: payment.cashReceived || null,
              change_given: paymentChangeGiven,
            });
        }
      }

      // Update table status
      if (body.table_id) {
        await supabase
          .from("tables")
          .update({ status: "available" })
          .eq("id", body.table_id)
          .eq("restaurant_id", restaurantId);
      }

      // Update tab status
      if (body.tab_id) {
        await supabase
          .from("tabs")
          .update({ status: "available" })
          .eq("id", body.tab_id)
          .eq("restaurant_id", restaurantId);
      }

      return successResponse({ success: true });
    }

    // POST update tab (for tab customer assignment)
    if (req.method === "POST" && action === "update-tab") {
      const body = await req.json();
      
      if (!body.tab_id || !isValidUUID(body.tab_id)) {
        return errorResponse("Valid tab_id is required");
      }

      if (!isValidTableStatus(body.status)) {
        return errorResponse("Invalid status");
      }
      
      const { error } = await supabase
        .from("tabs")
        .update({
          status: body.status,
          customer_name: sanitizeString(body.customer_name, MAX_LENGTHS.customerName),
          customer_phone: sanitizePhone(body.customer_phone),
        })
        .eq("id", body.tab_id)
        .eq("restaurant_id", restaurantId);

      if (error) throw error;
      return successResponse({ success: true });
    }

    // POST create tab
    if (req.method === "POST" && action === "create-tab") {
      const body = await req.json();
      
      const tabNumber = sanitizePositiveInt(body.number, 10000);
      if (tabNumber === null) {
        return errorResponse("Valid tab number is required");
      }

      // Validate status if provided
      const status = body.status || 'occupied';
      if (!isValidTableStatus(status)) {
        return errorResponse("Invalid status");
      }
      
      const { data: newTab, error } = await supabase
        .from("tabs")
        .insert({
          restaurant_id: restaurantId,
          number: tabNumber,
          customer_name: sanitizeString(body.customer_name, MAX_LENGTHS.customerName),
          customer_phone: sanitizePhone(body.customer_phone),
          status: status,
        })
        .select()
        .single();

      if (error) throw error;
      return successResponse({ success: true, tab: newTab });
    }

    // POST create customer
    if (req.method === "POST" && action === "create-customer") {
      const body = await req.json();
      
      const name = sanitizeString(body.name, MAX_LENGTHS.name);
      if (!name) {
        return errorResponse("Valid customer name is required");
      }

      const phone = sanitizePhone(body.phone);
      if (!phone) {
        return errorResponse("Valid phone number is required");
      }
      
      const { data: newCustomer, error } = await supabase
        .from("customers")
        .insert({
          restaurant_id: restaurantId,
          name: name,
          phone: phone,
          address: sanitizeString(body.address, MAX_LENGTHS.address),
          number: sanitizeString(body.number, MAX_LENGTHS.number),
          complement: sanitizeString(body.complement, MAX_LENGTHS.complement),
          neighborhood: sanitizeString(body.neighborhood, MAX_LENGTHS.neighborhood),
          city: sanitizeString(body.city, MAX_LENGTHS.city),
          cep: sanitizeString(body.cep, MAX_LENGTHS.cep),
        })
        .select()
        .single();

      if (error) throw error;
      return successResponse({ success: true, customer: newCustomer });
    }

    // POST add order to existing (for adding more items to a table/tab)
    if (req.method === "POST" && action === "add-to-order") {
      const body = await req.json();
      
      // Validate order type
      if (!isValidOrderType(body.order_type)) {
        return errorResponse("Invalid order_type");
      }

      // Validate optional UUIDs
      if (body.table_id && !isValidUUID(body.table_id)) {
        return errorResponse("Invalid table_id format");
      }
      if (body.tab_id && !isValidUUID(body.tab_id)) {
        return errorResponse("Invalid tab_id format");
      }
      if (body.waiter_id && !isValidUUID(body.waiter_id)) {
        return errorResponse("Invalid waiter_id format");
      }

      // Validate print_status if provided
      if (body.print_status && !VALID_PRINT_STATUSES.includes(body.print_status)) {
        return errorResponse("Invalid print_status");
      }

      // Validate total
      const total = sanitizeNumber(body.total, 0, 1000000);
      if (total === null) {
        return errorResponse("Invalid total amount");
      }

      // Validate items
      const itemsValidation = validateOrderItems(body.items || []);
      if (!itemsValidation.valid) {
        return errorResponse(itemsValidation.error || "Invalid items");
      }
      
      // Get next order number atomically
      const { data: orderNumber, error: orderNumberError } = await supabase
        .rpc('get_next_order_number', { _restaurant_id: restaurantId });

      if (orderNumberError) throw orderNumberError;
      
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          restaurant_id: restaurantId,
          table_id: body.table_id || null,
          tab_id: body.tab_id || null,
          order_type: body.order_type,
          status: "pending",
          print_status: body.print_status || "pending",
          total: total,
          notes: sanitizeString(body.notes, MAX_LENGTHS.notes),
          waiter_id: body.waiter_id || null,
          order_number: orderNumber,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Insert order items
      if (itemsValidation.items.length > 0) {
        const orderItems = itemsValidation.items.map((item: any) => ({
          restaurant_id: restaurantId,
          order_id: order.id,
          product_id: item.product_id,
          product_name: item.product_name,
          product_price: item.product_price,
          quantity: item.quantity,
          notes: item.notes,
          product_size: item.product_size,
          category_id: item.category_id,
        }));

        const { error: itemsError } = await supabase
          .from("order_items")
          .insert(orderItems);

        if (itemsError) throw itemsError;
      }

      return successResponse({ success: true, order });
    }

    // POST print conference (for printing table/tab receipt)
    if (req.method === "POST" && action === "print-conference") {
      const body = await req.json();
      
      // Validate entity type
      const entityType = body.entity_type;
      if (!['table', 'tab'].includes(entityType)) {
        return errorResponse("entity_type must be 'table' or 'tab'");
      }

      // Validate entity number
      const entityNumber = sanitizePositiveInt(body.entity_number, 10000);
      if (entityNumber === null) {
        return errorResponse("Valid entity_number is required");
      }

      // Validate total
      const total = sanitizeNumber(body.total, 0, 1000000);
      if (total === null) {
        return errorResponse("Invalid total amount");
      }

      // Validate items
      const itemsValidation = validateOrderItems(body.items || []);
      if (!itemsValidation.valid) {
        return errorResponse(itemsValidation.error || "Invalid items");
      }

      // Validate numeric fields
      const serviceCharge = sanitizeNumber(body.service_charge, 0, 100000);
      const discount = sanitizeNumber(body.discount, 0, 100000) || 0;
      const addition = sanitizeNumber(body.addition, 0, 100000) || 0;
      const splitCount = sanitizePositiveInt(body.split_count, 100) || 1;

      // Validate payments if provided
      const paymentsValidation = validatePayments(body.payments);
      if (!paymentsValidation.valid) {
        return errorResponse(paymentsValidation.error || "Invalid payments");
      }
      
      // Create a temporary order for the conference print
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          restaurant_id: restaurantId,
          order_type: 'conference',
          customer_name: sanitizeString(body.customer_name, MAX_LENGTHS.customerName) || 
            `${entityType === 'table' ? 'Mesa' : 'Comanda'} ${entityNumber}`,
          total: total,
          service_charge: serviceCharge,
          status: 'conference',
          print_status: 'pending',
          notes: JSON.stringify({
            entityType: entityType,
            entityNumber: entityNumber,
            discount: discount,
            addition: addition,
            serviceCharge: serviceCharge || 0,
            splitCount: splitCount,
            isConference: !body.is_final_receipt,
            isFinalReceipt: !!body.is_final_receipt,
            payments: paymentsValidation.payments,
          }),
        })
        .select('id, order_number')
        .single();

      if (orderError) throw orderError;

      // Add items to the order
      if (itemsValidation.items.length > 0) {
        const itemsToInsert = itemsValidation.items.map((item: any) => ({
          order_id: order.id,
          restaurant_id: restaurantId,
          product_name: item.product_name,
          product_price: item.product_price,
          quantity: item.quantity,
        }));

        const { error: itemsError } = await supabase
          .from("order_items")
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;
      }

      // Log the conference print
      await supabase.from("print_logs").insert({
        restaurant_id: restaurantId,
        order_id: order.id,
        order_number: order.order_number?.toString() || null,
        event_type: 'print',
        status: 'pending',
        printer_name: 'Electron App',
        items_count: itemsValidation.items.length,
      });

      return successResponse({ success: true, order });
    }

    // POST reprint order
    if (req.method === "POST" && action === "reprint-order") {
      const body = await req.json();
      
      if (!body.order_id || !isValidUUID(body.order_id)) {
        return errorResponse("Valid order_id is required");
      }

      // Get current print count
      const { data: currentOrder, error: fetchError } = await supabase
        .from("orders")
        .select("print_count, order_number")
        .eq("id", body.order_id)
        .eq("restaurant_id", restaurantId)
        .single();

      if (fetchError) throw fetchError;

      const newPrintCount = (currentOrder?.print_count || 0) + 1;

      // Update order to pending print status
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          print_status: "pending",
          print_count: newPrintCount,
          printed_at: null,
        })
        .eq("id", body.order_id)
        .eq("restaurant_id", restaurantId);

      if (updateError) throw updateError;

      // Log the reprint request
      await supabase.from("print_logs").insert({
        restaurant_id: restaurantId,
        order_id: body.order_id,
        order_number: currentOrder?.order_number?.toString() || null,
        event_type: "reprint",
        status: "pending",
        printer_name: "Electron App",
      });

      return successResponse({ success: true, print_count: newPrintCount });
    }

    // POST update order status (mark as served, delivered, etc.)
    if (req.method === "POST" && action === "update-order-status") {
      const body = await req.json();
      
      if (!body.order_id || !isValidUUID(body.order_id)) {
        return errorResponse("Valid order_id is required");
      }

      if (!isValidOrderStatus(body.status)) {
        return errorResponse("Invalid status. Must be: pending, preparing, ready, served, delivered, or cancelled");
      }

      const updateData: Record<string, any> = {
        status: body.status,
      };

      // Add closed_at timestamp if marking as delivered
      if (body.status === "delivered") {
        updateData.closed_at = new Date().toISOString();
      }

      // Add ready_at timestamp if marking as ready
      if (body.status === "ready") {
        updateData.ready_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", body.order_id)
        .eq("restaurant_id", restaurantId);

      if (error) throw error;

      return successResponse({ success: true });
    }

    // POST bulk update order status (for closing table/tab)
    if (req.method === "POST" && action === "bulk-update-order-status") {
      const body = await req.json();
      
      const orderIds = validateUUIDArray(body.order_ids);
      if (orderIds === null || orderIds.length === 0) {
        return errorResponse("order_ids must be a non-empty array of valid UUIDs");
      }

      if (!isValidOrderStatus(body.status)) {
        return errorResponse("Invalid status");
      }

      const updateData: Record<string, any> = {
        status: body.status,
      };

      if (body.status === "delivered") {
        updateData.closed_at = new Date().toISOString();
      }

      for (const orderId of orderIds) {
        await supabase
          .from("orders")
          .update(updateData)
          .eq("id", orderId)
          .eq("restaurant_id", restaurantId);
      }

      return successResponse({ success: true });
    }

    return errorResponse("Invalid action");
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
