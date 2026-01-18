-- ============================================================
-- SCRIPT DE MIGRAÇÃO COMPLETO PARA SUPABASE EXTERNO
-- Gamako - Sistema de Gestão para Restaurantes
-- Consolidado de 71 migrações
-- ============================================================
-- INSTRUÇÕES:
-- 1. Crie um novo projeto no Supabase (https://supabase.com)
-- 2. Acesse o SQL Editor do novo projeto
-- 3. Cole e execute este script completo
-- 4. Configure os secrets: RESEND_API_KEY e FOCUS_NFE_TOKEN
-- 5. Faça deploy das edge functions via Supabase CLI
-- ============================================================

-- ========================
-- EXTENSÕES E TIPOS
-- ========================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'waiter', 'cashier');

-- ========================
-- TABELAS PRINCIPAIS
-- ========================

-- Restaurants (tenants)
CREATE TABLE public.restaurants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    cnpj TEXT UNIQUE,
    logo_url TEXT,
    address TEXT,
    phone TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    suspended_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    suspended_reason TEXT DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Profiles (linked to auth.users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    email_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- User roles (separate for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'waiter',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE (user_id, role)
);

-- Categories
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    icon TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Products
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    image_url TEXT,
    is_available BOOLEAN DEFAULT TRUE,
    has_sizes BOOLEAN DEFAULT false,
    price_small NUMERIC DEFAULT NULL,
    price_medium NUMERIC DEFAULT NULL,
    price_large NUMERIC DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Tables (mesas)
CREATE TABLE public.tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
    number INTEGER NOT NULL,
    capacity INTEGER DEFAULT 4,
    status TEXT DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'closing')),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE (restaurant_id, number)
);

-- Tabs (comandas)
CREATE TABLE public.tabs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    number INTEGER NOT NULL,
    customer_name TEXT,
    customer_phone TEXT,
    status TEXT NOT NULL DEFAULT 'available',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT tabs_restaurant_number_unique UNIQUE (restaurant_id, number)
);

-- Customers
CREATE TABLE public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    cep TEXT,
    address TEXT,
    number TEXT,
    complement TEXT,
    neighborhood TEXT,
    city TEXT,
    state TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Delivery Drivers
CREATE TABLE public.delivery_drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT,
    vehicle_type TEXT DEFAULT 'moto',
    license_plate TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Waiters
CREATE TABLE public.waiters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    pin TEXT,
    pin_hash TEXT,
    pin_salt TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT waiters_pin_restaurant_unique UNIQUE (restaurant_id, pin)
);

-- Orders
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
    table_id UUID REFERENCES public.tables(id) ON DELETE SET NULL,
    tab_id UUID REFERENCES public.tabs(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    driver_id UUID REFERENCES public.delivery_drivers(id) ON DELETE SET NULL,
    waiter_id UUID REFERENCES public.waiters(id) ON DELETE SET NULL,
    customer_name TEXT,
    order_type TEXT DEFAULT 'table',
    status TEXT DEFAULT 'pending',
    total DECIMAL(10, 2) DEFAULT 0,
    notes TEXT,
    delivery_address TEXT,
    delivery_phone TEXT,
    delivery_fee NUMERIC DEFAULT 0,
    service_charge NUMERIC DEFAULT 0,
    payment_method TEXT DEFAULT NULL,
    cash_received NUMERIC DEFAULT NULL,
    change_given NUMERIC DEFAULT NULL,
    split_mode TEXT DEFAULT NULL,
    split_people INTEGER DEFAULT NULL,
    order_number INTEGER,
    print_status TEXT DEFAULT 'pending',
    printed_at TIMESTAMP WITH TIME ZONE,
    print_count INTEGER DEFAULT 0,
    ready_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    closed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    scheduled_at TIMESTAMP WITH TIME ZONE NULL,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT orders_order_type_check CHECK (order_type = ANY (ARRAY['counter', 'table', 'tab', 'delivery', 'takeaway', 'conference', 'closing'])),
    CONSTRAINT orders_status_check CHECK (status = ANY (ARRAY['pending', 'preparing', 'ready', 'served', 'out_for_delivery', 'delivered', 'cancelled', 'conference', 'closing']))
);

-- Order Items
CREATE TABLE public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    category_id UUID REFERENCES public.categories(id),
    product_name TEXT NOT NULL,
    product_price DECIMAL(10, 2) NOT NULL,
    product_size TEXT DEFAULT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- ========================
-- TABELAS AUXILIARES
-- ========================

-- Salon Settings
CREATE TABLE public.salon_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL UNIQUE,
    has_dining_room BOOLEAN DEFAULT false,
    table_count INTEGER DEFAULT 0,
    order_tab_count INTEGER DEFAULT 0,
    has_waiters BOOLEAN DEFAULT false,
    operation_type TEXT DEFAULT NULL,
    service_table BOOLEAN DEFAULT false,
    service_individual BOOLEAN DEFAULT false,
    service_counter BOOLEAN DEFAULT false,
    service_self BOOLEAN DEFAULT false,
    counter_prep_min INTEGER DEFAULT 10,
    counter_prep_max INTEGER DEFAULT 50,
    delivery_prep_min INTEGER DEFAULT 25,
    delivery_prep_max INTEGER DEFAULT 80,
    auto_print_counter BOOLEAN DEFAULT true,
    auto_print_table BOOLEAN DEFAULT true,
    auto_print_delivery BOOLEAN DEFAULT true,
    is_open BOOLEAN DEFAULT false,
    last_opened_at TIMESTAMP WITH TIME ZONE,
    daily_order_counter INTEGER DEFAULT 0,
    receipt_header TEXT,
    receipt_footer TEXT,
    show_address_on_receipt BOOLEAN DEFAULT true,
    show_phone_on_receipt BOOLEAN DEFAULT true,
    show_cnpj_on_receipt BOOLEAN DEFAULT true,
    print_layout JSONB NULL DEFAULT '{}'::jsonb,
    conference_printer_id UUID,
    closing_printer_id UUID,
    sound_enabled BOOLEAN DEFAULT true,
    sound_delivery BOOLEAN DEFAULT true,
    sound_table BOOLEAN DEFAULT true,
    sound_counter BOOLEAN DEFAULT true,
    sound_takeaway BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Salon Areas
CREATE TABLE public.salon_areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT 'bg-blue-500',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Delivery Fees
CREATE TABLE public.delivery_fees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    neighborhood TEXT NOT NULL,
    city TEXT,
    fee NUMERIC NOT NULL DEFAULT 0,
    min_order_value NUMERIC DEFAULT 0,
    estimated_time TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Printers
CREATE TABLE public.printers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    name TEXT NOT NULL,
    model TEXT,
    printer_name TEXT,
    status TEXT DEFAULT 'disconnected',
    paper_width INTEGER DEFAULT 48,
    linked_order_types TEXT[] DEFAULT ARRAY['counter', 'table', 'delivery'],
    linked_categories UUID[] NULL DEFAULT NULL,
    is_active BOOLEAN DEFAULT true,
    last_seen_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Available Printers (detected by Electron app)
CREATE TABLE public.available_printers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    printer_name TEXT NOT NULL,
    display_name TEXT,
    driver_name TEXT,
    port_name TEXT,
    is_default BOOLEAN DEFAULT false,
    last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(restaurant_id, printer_name)
);

-- Print Logs
CREATE TABLE public.print_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL DEFAULT 'print',
    status TEXT NOT NULL DEFAULT 'success',
    printer_name TEXT,
    error_message TEXT,
    order_number TEXT,
    items_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Printer Heartbeats
CREATE TABLE public.printer_heartbeats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    client_id TEXT NOT NULL,
    client_name TEXT,
    client_version TEXT,
    platform TEXT,
    last_heartbeat_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    is_printing BOOLEAN DEFAULT false,
    pending_orders INTEGER DEFAULT 0,
    printers_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(restaurant_id, client_id)
);

-- Daily Closings
CREATE TABLE public.daily_closings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    closing_date DATE NOT NULL,
    total_revenue NUMERIC NOT NULL DEFAULT 0,
    total_orders INTEGER NOT NULL DEFAULT 0,
    average_ticket NUMERIC NOT NULL DEFAULT 0,
    cancelled_orders INTEGER NOT NULL DEFAULT 0,
    payment_breakdown JSONB NOT NULL DEFAULT '{}',
    order_type_breakdown JSONB NOT NULL DEFAULT '{}',
    closed_by UUID REFERENCES auth.users(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(restaurant_id, closing_date)
);

-- Tab Payments
CREATE TABLE public.tab_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    tab_id UUID NOT NULL REFERENCES public.tabs(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    payment_method TEXT NOT NULL,
    paid_by TEXT,
    notes TEXT,
    cash_received NUMERIC,
    change_given NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Addon Groups
CREATE TABLE public.addon_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    min_selections INTEGER DEFAULT 0,
    max_selections INTEGER DEFAULT 1,
    is_required BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Addons
CREATE TABLE public.addons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES public.addon_groups(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price NUMERIC(10,2) NOT NULL DEFAULT 0,
    is_available BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Product Addon Groups
CREATE TABLE public.product_addon_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    addon_group_id UUID NOT NULL REFERENCES public.addon_groups(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(product_id, addon_group_id)
);

-- Category Addon Groups
CREATE TABLE public.category_addon_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    addon_group_id UUID NOT NULL REFERENCES public.addon_groups(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(category_id, addon_group_id)
);

-- NFCe Settings
CREATE TABLE public.nfce_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    is_enabled BOOLEAN DEFAULT false,
    environment TEXT DEFAULT 'homologation' CHECK (environment IN ('homologation', 'production')),
    inscricao_estadual TEXT,
    regime_tributario INTEGER DEFAULT 1,
    csc_id TEXT,
    csc_token TEXT,
    serie_nfce INTEGER DEFAULT 1,
    numero_atual INTEGER DEFAULT 0,
    certificado_url TEXT,
    certificado_senha TEXT,
    certificado_validade TIMESTAMP WITH TIME ZONE,
    auto_print_nfce BOOLEAN DEFAULT true,
    printer_id UUID REFERENCES public.printers(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT nfce_settings_restaurant_unique UNIQUE (restaurant_id)
);

-- NFCe Invoices
CREATE TABLE public.nfce_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id),
    numero INTEGER NOT NULL,
    serie INTEGER NOT NULL,
    chave_acesso TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'authorized', 'cancelled', 'rejected', 'contingency')),
    status_sefaz TEXT,
    motivo_sefaz TEXT,
    valor_total NUMERIC(10,2) NOT NULL,
    valor_desconto NUMERIC(10,2) DEFAULT 0,
    valor_produtos NUMERIC(10,2) NOT NULL,
    cpf_consumidor TEXT,
    nome_consumidor TEXT,
    forma_pagamento TEXT,
    xml_url TEXT,
    danfe_url TEXT,
    qrcode_url TEXT,
    protocolo TEXT,
    data_emissao TIMESTAMP WITH TIME ZONE,
    data_autorizacao TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancel_reason TEXT,
    cancel_protocol TEXT,
    focus_id TEXT,
    api_response JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Waiter Invites
CREATE TABLE public.waiter_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    waiter_id UUID REFERENCES public.waiters(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    email TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- Email Verification Tokens
CREATE TABLE public.email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    email TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours'),
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add foreign key for salon_settings printers (after printers table is created)
ALTER TABLE public.salon_settings
ADD CONSTRAINT salon_settings_conference_printer_fkey FOREIGN KEY (conference_printer_id) REFERENCES public.printers(id) ON DELETE SET NULL,
ADD CONSTRAINT salon_settings_closing_printer_fkey FOREIGN KEY (closing_printer_id) REFERENCES public.printers(id) ON DELETE SET NULL;

-- ========================
-- ÍNDICES
-- ========================
CREATE INDEX idx_restaurants_cnpj ON public.restaurants(cnpj);
CREATE INDEX idx_customers_phone ON public.customers(phone);
CREATE INDEX idx_customers_restaurant ON public.customers(restaurant_id);
CREATE INDEX idx_delivery_fees_restaurant ON public.delivery_fees(restaurant_id);
CREATE INDEX idx_delivery_fees_neighborhood ON public.delivery_fees(neighborhood);
CREATE INDEX idx_orders_print_status ON public.orders(print_status, restaurant_id);
CREATE INDEX idx_orders_closed_at ON public.orders(closed_at);
CREATE INDEX idx_orders_payment_method ON public.orders(payment_method);
CREATE INDEX idx_orders_order_number ON public.orders(order_number);
CREATE INDEX idx_orders_waiter_id ON public.orders(waiter_id);
CREATE INDEX idx_orders_scheduled_at ON public.orders (scheduled_at) WHERE scheduled_at IS NOT NULL;
CREATE INDEX idx_print_logs_restaurant_id ON public.print_logs(restaurant_id);
CREATE INDEX idx_print_logs_created_at ON public.print_logs(created_at DESC);
CREATE INDEX idx_print_logs_event_type ON public.print_logs(event_type);
CREATE INDEX idx_available_printers_restaurant ON public.available_printers(restaurant_id);
CREATE INDEX idx_available_printers_last_seen ON public.available_printers(last_seen_at);
CREATE INDEX idx_salon_settings_is_open ON public.salon_settings(is_open);
CREATE INDEX idx_waiters_pin ON public.waiters(pin);
CREATE INDEX idx_waiters_restaurant_status ON public.waiters(restaurant_id, status);
CREATE INDEX idx_waiters_user_id ON public.waiters(user_id);
CREATE INDEX idx_tab_payments_tab_id ON public.tab_payments(tab_id);
CREATE INDEX idx_tab_payments_restaurant_id ON public.tab_payments(restaurant_id);
CREATE INDEX idx_nfce_invoices_restaurant ON public.nfce_invoices(restaurant_id);
CREATE INDEX idx_nfce_invoices_order ON public.nfce_invoices(order_id);
CREATE INDEX idx_nfce_invoices_status ON public.nfce_invoices(status);
CREATE INDEX idx_nfce_invoices_chave ON public.nfce_invoices(chave_acesso);
CREATE INDEX idx_order_items_category_id ON public.order_items(category_id);
CREATE INDEX idx_email_verification_tokens_token ON public.email_verification_tokens(token);
CREATE INDEX idx_email_verification_tokens_user_id ON public.email_verification_tokens(user_id);

-- ========================
-- ENABLE ROW LEVEL SECURITY
-- ========================
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tabs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waiters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salon_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salon_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.printers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.available_printers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.print_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.printer_heartbeats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_closings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tab_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addon_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_addon_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_addon_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfce_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfce_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waiter_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_verification_tokens ENABLE ROW LEVEL SECURITY;

-- ========================
-- FUNCTIONS
-- ========================

-- Get user's restaurant_id
CREATE OR REPLACE FUNCTION public.get_user_restaurant_id(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT restaurant_id FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- Check if user has role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
    )
$$;

-- Check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'
  )
$$;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create restaurant with profile (for signup)
CREATE OR REPLACE FUNCTION public.create_restaurant_with_profile(
  _user_id uuid,
  _restaurant_name text,
  _restaurant_slug text,
  _cnpj text,
  _full_name text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _restaurant_id uuid;
BEGIN
  INSERT INTO public.restaurants (name, slug, cnpj)
  VALUES (_restaurant_name, _restaurant_slug, _cnpj)
  RETURNING id INTO _restaurant_id;

  INSERT INTO public.profiles (user_id, restaurant_id, full_name)
  VALUES (_user_id, _restaurant_id, _full_name);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'admin');

  RETURN _restaurant_id;
END;
$$;

-- Auto occupy table/tab when order is created
CREATE OR REPLACE FUNCTION public.auto_occupy_table_tab()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.table_id IS NOT NULL THEN
    UPDATE public.tables
    SET status = 'occupied'
    WHERE id = NEW.table_id AND status = 'available';
  END IF;

  IF NEW.tab_id IS NOT NULL THEN
    UPDATE public.tabs
    SET status = 'occupied'
    WHERE id = NEW.tab_id AND status = 'available';
  END IF;

  RETURN NEW;
END;
$$;

-- Get next order number atomically
CREATE OR REPLACE FUNCTION public.get_next_order_number(_restaurant_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  next_number integer;
BEGIN
  INSERT INTO public.salon_settings (restaurant_id, daily_order_counter)
  VALUES (_restaurant_id, 0)
  ON CONFLICT (restaurant_id) DO NOTHING;
  
  UPDATE public.salon_settings
  SET daily_order_counter = COALESCE(daily_order_counter, 0) + 1,
      updated_at = now()
  WHERE restaurant_id = _restaurant_id
  RETURNING daily_order_counter INTO next_number;
  
  RETURN next_number;
END;
$function$;

-- Generate waiter invite token
CREATE OR REPLACE FUNCTION public.generate_waiter_invite_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'hex');
END;
$$;

-- Validate waiter invite token
CREATE OR REPLACE FUNCTION public.validate_waiter_invite(invite_token text)
RETURNS TABLE (
  id uuid,
  restaurant_id uuid,
  waiter_id uuid,
  expires_at timestamptz,
  used_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    wi.id,
    wi.restaurant_id,
    wi.waiter_id,
    wi.expires_at,
    wi.used_at
  FROM waiter_invites wi
  WHERE wi.token = invite_token
    AND wi.expires_at > now()
    AND wi.used_at IS NULL
  LIMIT 1;
$$;

-- Get restaurant by slug (for public waiter app)
CREATE OR REPLACE FUNCTION public.get_restaurant_by_slug(restaurant_slug text)
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  logo_url text,
  is_active boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    r.id,
    r.name,
    r.slug,
    r.logo_url,
    r.is_active
  FROM restaurants r
  WHERE r.slug = restaurant_slug
    AND r.is_active = true
  LIMIT 1;
$$;

-- Generate verification token
CREATE OR REPLACE FUNCTION public.generate_verification_token()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'hex');
END;
$$;

-- ========================
-- TRIGGERS
-- ========================

CREATE TRIGGER update_restaurants_updated_at
    BEFORE UPDATE ON public.restaurants
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tabs_updated_at
    BEFORE UPDATE ON public.tabs
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON public.customers
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_delivery_fees_updated_at
    BEFORE UPDATE ON public.delivery_fees
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_printers_updated_at
    BEFORE UPDATE ON public.printers
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_salon_settings_updated_at
    BEFORE UPDATE ON public.salon_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_waiters_updated_at
    BEFORE UPDATE ON public.waiters
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_salon_areas_updated_at
    BEFORE UPDATE ON public.salon_areas
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_delivery_drivers_updated_at
    BEFORE UPDATE ON public.delivery_drivers
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_daily_closings_updated_at
    BEFORE UPDATE ON public.daily_closings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_printer_heartbeats_updated_at
    BEFORE UPDATE ON public.printer_heartbeats
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_addon_groups_updated_at
    BEFORE UPDATE ON public.addon_groups
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_addons_updated_at
    BEFORE UPDATE ON public.addons
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_nfce_settings_updated_at
    BEFORE UPDATE ON public.nfce_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_nfce_invoices_updated_at
    BEFORE UPDATE ON public.nfce_invoices
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER auto_occupy_on_order_insert
    AFTER INSERT ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.auto_occupy_table_tab();

-- Grant execute permission for order number function
GRANT EXECUTE ON FUNCTION public.get_next_order_number(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_next_order_number(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_next_order_number(uuid) TO anon;

-- ========================
-- RLS POLICIES
-- ========================

-- RESTAURANTS
CREATE POLICY "Users can view their restaurant" ON public.restaurants FOR SELECT
USING (id = public.get_user_restaurant_id(auth.uid()));

CREATE POLICY "Users can update their restaurant" ON public.restaurants FOR UPDATE
USING (id = get_user_restaurant_id(auth.uid()))
WITH CHECK (id = get_user_restaurant_id(auth.uid()));

CREATE POLICY "Authenticated users can create restaurant" ON public.restaurants FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can view all restaurants" ON public.restaurants FOR SELECT
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Admins can update all restaurants" ON public.restaurants FOR UPDATE
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- PROFILES
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Super admins can view all profiles" ON public.profiles FOR SELECT
USING (is_super_admin(auth.uid()));

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT
WITH CHECK (user_id = auth.uid());

-- USER_ROLES
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own role" ON public.user_roles FOR INSERT
WITH CHECK (user_id = auth.uid());

-- CATEGORIES
CREATE POLICY "Users can view categories in their restaurant" ON public.categories FOR SELECT
USING (restaurant_id = public.get_user_restaurant_id(auth.uid()));

CREATE POLICY "Admins can manage categories" ON public.categories FOR ALL
USING (restaurant_id = public.get_user_restaurant_id(auth.uid()));

-- PRODUCTS
CREATE POLICY "Users can view products in their restaurant" ON public.products FOR SELECT
USING (restaurant_id = public.get_user_restaurant_id(auth.uid()));

CREATE POLICY "Users can manage products in their restaurant" ON public.products FOR ALL
USING (restaurant_id = public.get_user_restaurant_id(auth.uid()));

CREATE POLICY "Admins can view all products" ON public.products FOR SELECT
USING (is_super_admin(auth.uid()));

-- TABLES
CREATE POLICY "Users can view tables in their restaurant" ON public.tables FOR SELECT
USING (restaurant_id = public.get_user_restaurant_id(auth.uid()));

CREATE POLICY "Users can manage tables in their restaurant" ON public.tables FOR ALL
USING (restaurant_id = public.get_user_restaurant_id(auth.uid()));

CREATE POLICY "Admins can view all tables" ON public.tables FOR SELECT
USING (is_super_admin(auth.uid()));

-- TABS
CREATE POLICY "Users can view tabs in their restaurant" ON public.tabs FOR SELECT
USING (restaurant_id = get_user_restaurant_id(auth.uid()));

CREATE POLICY "Users can manage tabs in their restaurant" ON public.tabs FOR ALL
USING (restaurant_id = get_user_restaurant_id(auth.uid()));

-- ORDERS
CREATE POLICY "Users can view orders in their restaurant" ON public.orders FOR SELECT
USING (restaurant_id = public.get_user_restaurant_id(auth.uid()));

CREATE POLICY "Users can manage orders in their restaurant" ON public.orders FOR ALL
USING (restaurant_id = public.get_user_restaurant_id(auth.uid()));

CREATE POLICY "Admins can view all orders" ON public.orders FOR SELECT
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Conference orders insert" ON public.orders FOR INSERT
WITH CHECK (
  order_type IN ('conference', 'closing') 
  AND status IN ('conference', 'closing')
  AND print_status = 'pending'
  AND EXISTS (SELECT 1 FROM restaurants WHERE id = orders.restaurant_id AND is_active = true)
);

CREATE POLICY "Conference orders delete" ON public.orders FOR DELETE
USING (
  order_type IN ('conference', 'closing') 
  AND status IN ('conference', 'closing')
);

-- ORDER_ITEMS
CREATE POLICY "Users can view order_items in their restaurant" ON public.order_items FOR SELECT
USING (restaurant_id = public.get_user_restaurant_id(auth.uid()));

CREATE POLICY "Users can manage order_items in their restaurant" ON public.order_items FOR ALL
USING (restaurant_id = public.get_user_restaurant_id(auth.uid()));

CREATE POLICY "Conference order items insert" ON public.order_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = order_items.order_id 
    AND o.order_type IN ('conference', 'closing')
    AND EXISTS (SELECT 1 FROM restaurants WHERE id = o.restaurant_id)
  )
);

CREATE POLICY "Conference order items delete" ON public.order_items FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = order_items.order_id 
    AND o.order_type IN ('conference', 'closing')
  )
);

-- CUSTOMERS
CREATE POLICY "Managers can view customers" ON public.customers FOR SELECT
USING (
  restaurant_id = get_user_restaurant_id(auth.uid())
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
);

CREATE POLICY "Managers can manage customers" ON public.customers FOR ALL
USING (
  restaurant_id = get_user_restaurant_id(auth.uid())
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
);

CREATE POLICY "Waiters can create customers" ON public.customers FOR INSERT
WITH CHECK (
  restaurant_id IN (
    SELECT restaurant_id FROM waiters 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

-- DELIVERY_DRIVERS
CREATE POLICY "Users can view drivers in their restaurant" ON public.delivery_drivers FOR SELECT
USING (restaurant_id = get_user_restaurant_id(auth.uid()));

CREATE POLICY "Users can manage drivers in their restaurant" ON public.delivery_drivers FOR ALL
USING (restaurant_id = get_user_restaurant_id(auth.uid()));

-- DELIVERY_FEES
CREATE POLICY "Users can view delivery_fees in their restaurant" ON public.delivery_fees FOR SELECT
USING (restaurant_id = get_user_restaurant_id(auth.uid()));

CREATE POLICY "Users can manage delivery_fees in their restaurant" ON public.delivery_fees FOR ALL
USING (restaurant_id = get_user_restaurant_id(auth.uid()));

-- WAITERS
CREATE POLICY "Managers can view all waiter data" ON public.waiters FOR SELECT
USING (
  restaurant_id = get_user_restaurant_id(auth.uid())
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
);

CREATE POLICY "Waiters can view own record" ON public.waiters FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage waiters" ON public.waiters FOR ALL
USING (
  restaurant_id = get_user_restaurant_id(auth.uid())
  AND has_role(auth.uid(), 'admin')
);

-- SALON_SETTINGS
CREATE POLICY "Users can view their restaurant salon settings" ON public.salon_settings FOR SELECT
USING (restaurant_id = get_user_restaurant_id(auth.uid()));

CREATE POLICY "Users can insert their restaurant salon settings" ON public.salon_settings FOR INSERT
WITH CHECK (restaurant_id = get_user_restaurant_id(auth.uid()));

CREATE POLICY "Users can update their restaurant salon settings" ON public.salon_settings FOR UPDATE
USING (restaurant_id = get_user_restaurant_id(auth.uid()));

-- SALON_AREAS
CREATE POLICY "Users can view areas in their restaurant" ON public.salon_areas FOR SELECT
USING (restaurant_id = get_user_restaurant_id(auth.uid()));

CREATE POLICY "Users can manage areas in their restaurant" ON public.salon_areas FOR ALL
USING (restaurant_id = get_user_restaurant_id(auth.uid()));

-- PRINTERS
CREATE POLICY "Users can view printers in their restaurant" ON public.printers FOR SELECT
USING (restaurant_id = get_user_restaurant_id(auth.uid()));

CREATE POLICY "Users can manage printers in their restaurant" ON public.printers FOR ALL
USING (restaurant_id = get_user_restaurant_id(auth.uid()));

-- AVAILABLE_PRINTERS
CREATE POLICY "Users can view available printers in their restaurant" ON public.available_printers FOR SELECT
USING (restaurant_id = get_user_restaurant_id(auth.uid()));

CREATE POLICY "Users can manage available printers in their restaurant" ON public.available_printers FOR ALL
USING (restaurant_id = get_user_restaurant_id(auth.uid()));

-- PRINT_LOGS
CREATE POLICY "Users can view print logs in their restaurant" ON public.print_logs FOR SELECT
USING (restaurant_id = get_user_restaurant_id(auth.uid()));

CREATE POLICY "Users can insert print logs for their restaurant" ON public.print_logs FOR INSERT
WITH CHECK (restaurant_id = get_user_restaurant_id(auth.uid()));

CREATE POLICY "Valid restaurant can insert print logs" ON public.print_logs FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM restaurants WHERE id = print_logs.restaurant_id)
);

-- PRINTER_HEARTBEATS
CREATE POLICY "Authenticated users read own restaurant" ON public.printer_heartbeats FOR SELECT
USING (restaurant_id = public.get_user_restaurant_id(auth.uid()));

CREATE POLICY "Printer heartbeat insert" ON public.printer_heartbeats FOR INSERT
WITH CHECK (
  restaurant_id IS NOT NULL 
  AND EXISTS (SELECT 1 FROM restaurants WHERE id = printer_heartbeats.restaurant_id)
);

CREATE POLICY "Printer heartbeat update" ON public.printer_heartbeats FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM restaurants WHERE id = printer_heartbeats.restaurant_id)
)
WITH CHECK (restaurant_id IS NOT NULL);

CREATE POLICY "Printer heartbeat select" ON public.printer_heartbeats FOR SELECT
USING (
  restaurant_id = get_user_restaurant_id(auth.uid())
  OR EXISTS (SELECT 1 FROM restaurants WHERE id = printer_heartbeats.restaurant_id)
);

-- DAILY_CLOSINGS
CREATE POLICY "Users can view closings in their restaurant" ON public.daily_closings FOR SELECT
USING (restaurant_id = get_user_restaurant_id(auth.uid()));

CREATE POLICY "Users can insert closings in their restaurant" ON public.daily_closings FOR INSERT
WITH CHECK (restaurant_id = get_user_restaurant_id(auth.uid()));

CREATE POLICY "Users can update closings in their restaurant" ON public.daily_closings FOR UPDATE
USING (restaurant_id = get_user_restaurant_id(auth.uid()));

CREATE POLICY "Admins can view all daily closings" ON public.daily_closings FOR SELECT
USING (public.is_super_admin(auth.uid()));

-- TAB_PAYMENTS
CREATE POLICY "Users can view tab payments in their restaurant" ON public.tab_payments FOR SELECT
USING (restaurant_id = get_user_restaurant_id(auth.uid()));

CREATE POLICY "Users can manage tab payments in their restaurant" ON public.tab_payments FOR ALL
USING (restaurant_id = get_user_restaurant_id(auth.uid()));

-- ADDON_GROUPS
CREATE POLICY "Users can view their restaurant addon groups" ON public.addon_groups FOR SELECT
USING (restaurant_id = public.get_user_restaurant_id(auth.uid()));

CREATE POLICY "Users can create addon groups for their restaurant" ON public.addon_groups FOR INSERT
WITH CHECK (restaurant_id = public.get_user_restaurant_id(auth.uid()));

CREATE POLICY "Users can update their restaurant addon groups" ON public.addon_groups FOR UPDATE
USING (restaurant_id = public.get_user_restaurant_id(auth.uid()));

CREATE POLICY "Users can delete their restaurant addon groups" ON public.addon_groups FOR DELETE
USING (restaurant_id = public.get_user_restaurant_id(auth.uid()));

-- ADDONS
CREATE POLICY "Users can view their restaurant addons" ON public.addons FOR SELECT
USING (restaurant_id = public.get_user_restaurant_id(auth.uid()));

CREATE POLICY "Users can create addons for their restaurant" ON public.addons FOR INSERT
WITH CHECK (restaurant_id = public.get_user_restaurant_id(auth.uid()));

CREATE POLICY "Users can update their restaurant addons" ON public.addons FOR UPDATE
USING (restaurant_id = public.get_user_restaurant_id(auth.uid()));

CREATE POLICY "Users can delete their restaurant addons" ON public.addons FOR DELETE
USING (restaurant_id = public.get_user_restaurant_id(auth.uid()));

-- PRODUCT_ADDON_GROUPS
CREATE POLICY "Users can view product addon links" ON public.product_addon_groups FOR SELECT
USING (
  EXISTS (SELECT 1 FROM products p WHERE p.id = product_id AND p.restaurant_id = get_user_restaurant_id(auth.uid()))
);

CREATE POLICY "Users can create product addon links" ON public.product_addon_groups FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM products p WHERE p.id = product_id AND p.restaurant_id = get_user_restaurant_id(auth.uid()))
);

CREATE POLICY "Users can delete product addon links" ON public.product_addon_groups FOR DELETE
USING (
  EXISTS (SELECT 1 FROM products p WHERE p.id = product_id AND p.restaurant_id = get_user_restaurant_id(auth.uid()))
);

-- CATEGORY_ADDON_GROUPS
CREATE POLICY "Users can view category addon links" ON public.category_addon_groups FOR SELECT
USING (
  EXISTS (SELECT 1 FROM categories c WHERE c.id = category_addon_groups.category_id AND c.restaurant_id = get_user_restaurant_id(auth.uid()))
);

CREATE POLICY "Users can create category addon links" ON public.category_addon_groups FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM categories c WHERE c.id = category_addon_groups.category_id AND c.restaurant_id = get_user_restaurant_id(auth.uid()))
);

CREATE POLICY "Users can delete category addon links" ON public.category_addon_groups FOR DELETE
USING (
  EXISTS (SELECT 1 FROM categories c WHERE c.id = category_addon_groups.category_id AND c.restaurant_id = get_user_restaurant_id(auth.uid()))
);

-- NFCE_SETTINGS
CREATE POLICY "Admins can view nfce settings" ON public.nfce_settings FOR SELECT
USING (
  restaurant_id = get_user_restaurant_id(auth.uid())
  AND has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can manage nfce settings" ON public.nfce_settings FOR ALL
USING (
  restaurant_id = get_user_restaurant_id(auth.uid())
  AND has_role(auth.uid(), 'admin')
);

-- NFCE_INVOICES
CREATE POLICY "Managers can view invoices" ON public.nfce_invoices FOR SELECT
USING (
  restaurant_id = get_user_restaurant_id(auth.uid())
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
);

CREATE POLICY "Admins can manage invoices" ON public.nfce_invoices FOR ALL
USING (
  restaurant_id = get_user_restaurant_id(auth.uid())
  AND has_role(auth.uid(), 'admin')
);

-- WAITER_INVITES
CREATE POLICY "Users can create invites for their restaurant" ON public.waiter_invites FOR INSERT
WITH CHECK (restaurant_id = get_user_restaurant_id(auth.uid()));

CREATE POLICY "Users can view invites for their restaurant" ON public.waiter_invites FOR SELECT
USING (restaurant_id = get_user_restaurant_id(auth.uid()));

CREATE POLICY "Users can delete invites for their restaurant" ON public.waiter_invites FOR DELETE
USING (restaurant_id = get_user_restaurant_id(auth.uid()));

CREATE POLICY "Service role can read invites" ON public.waiter_invites FOR SELECT
USING (restaurant_id = get_user_restaurant_id(auth.uid()));

-- EMAIL_VERIFICATION_TOKENS
CREATE POLICY "Users can view own verification tokens" ON public.email_verification_tokens FOR SELECT
USING (auth.uid() = user_id);

-- ========================
-- VIEWS
-- ========================

-- Admin restaurant metrics view
CREATE VIEW public.admin_restaurant_metrics
WITH (security_invoker = true) AS
SELECT 
  r.id as restaurant_id,
  r.name as restaurant_name,
  r.slug,
  r.cnpj,
  r.phone,
  r.address,
  r.is_active as account_active,
  r.suspended_at,
  r.suspended_reason,
  r.created_at as restaurant_created_at,
  ss.is_open,
  ss.daily_order_counter,
  (SELECT COUNT(*) FROM orders o WHERE o.restaurant_id = r.id) as total_orders,
  (SELECT COALESCE(SUM(o.total), 0) FROM orders o WHERE o.restaurant_id = r.id AND o.status = 'delivered') as total_revenue,
  (SELECT COUNT(*) FROM orders o WHERE o.restaurant_id = r.id AND o.created_at::date = CURRENT_DATE) as orders_today,
  (SELECT COALESCE(SUM(o.total), 0) FROM orders o WHERE o.restaurant_id = r.id AND o.status = 'delivered' AND o.created_at::date = CURRENT_DATE) as revenue_today,
  (SELECT COUNT(*) FROM products p WHERE p.restaurant_id = r.id) as total_products,
  (SELECT COUNT(*) FROM categories c WHERE c.restaurant_id = r.id) as total_categories,
  (SELECT COUNT(*) FROM tables t WHERE t.restaurant_id = r.id) as total_tables,
  (SELECT COUNT(*) FROM waiters w WHERE w.restaurant_id = r.id) as total_waiters
FROM restaurants r
LEFT JOIN salon_settings ss ON ss.restaurant_id = r.id;

-- Safe waiters view (without sensitive data)
CREATE VIEW public.waiters_safe
WITH (security_invoker = true) AS
SELECT 
  id,
  restaurant_id,
  name,
  status,
  created_at,
  updated_at
FROM public.waiters;

-- Safe NFCe settings view
CREATE VIEW public.nfce_settings_safe
WITH (security_invoker = true) AS
SELECT 
  id,
  restaurant_id,
  is_enabled,
  environment,
  regime_tributario,
  inscricao_estadual,
  serie_nfce,
  numero_atual,
  auto_print_nfce,
  printer_id,
  CASE WHEN certificado_url IS NOT NULL THEN '***configured***' ELSE NULL END as certificado_status,
  certificado_validade,
  CASE WHEN csc_id IS NOT NULL THEN '***configured***' ELSE NULL END as csc_status,
  created_at,
  updated_at
FROM public.nfce_settings;

-- Safe NFCe invoices view (masked CPF)
CREATE VIEW public.nfce_invoices_safe
WITH (security_invoker = true) AS
SELECT 
  id,
  restaurant_id,
  order_id,
  numero,
  serie,
  status,
  status_sefaz,
  motivo_sefaz,
  valor_total,
  valor_produtos,
  valor_desconto,
  forma_pagamento,
  CASE 
    WHEN cpf_consumidor IS NOT NULL 
    THEN CONCAT('***', RIGHT(cpf_consumidor, 3))
    ELSE NULL 
  END as cpf_masked,
  nome_consumidor,
  chave_acesso,
  protocolo,
  danfe_url,
  qrcode_url,
  data_emissao,
  data_autorizacao,
  cancelled_at,
  cancel_reason,
  created_at,
  updated_at
FROM public.nfce_invoices;

-- ========================
-- REALTIME
-- ========================
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.print_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.printer_heartbeats;

-- ========================
-- STORAGE BUCKETS
-- ========================

-- Printer downloads
INSERT INTO storage.buckets (id, name, public)
VALUES ('printer-downloads', 'printer-downloads', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read access for printer downloads"
ON storage.objects FOR SELECT
USING (bucket_id = 'printer-downloads');

CREATE POLICY "Authenticated users can upload printer files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'printer-downloads' AND auth.role() = 'authenticated');

-- Product images
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('product-images', 'product-images', true, 4194304)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Product images are publicly accessible" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'product-images');

CREATE POLICY "Authenticated users can upload product images" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update product images" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete product images" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');

-- Restaurant logos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('restaurant-logos', 'restaurant-logos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Restaurant logos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'restaurant-logos');

CREATE POLICY "Users can upload logos for their restaurant"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'restaurant-logos' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update logos for their restaurant"
ON storage.objects FOR UPDATE
USING (bucket_id = 'restaurant-logos' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete logos for their restaurant"
ON storage.objects FOR DELETE
USING (bucket_id = 'restaurant-logos' AND auth.role() = 'authenticated');

-- Printer app
INSERT INTO storage.buckets (id, name, public)
VALUES ('printer-app', 'printer-app', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can download printer app"
ON storage.objects FOR SELECT
USING (bucket_id = 'printer-app');

CREATE POLICY "Authenticated users can upload printer app"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'printer-app' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete printer app"
ON storage.objects FOR DELETE
USING (bucket_id = 'printer-app' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update printer app"
ON storage.objects FOR UPDATE
USING (bucket_id = 'printer-app' AND auth.role() = 'authenticated');

-- Certificates (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('certificates', 'certificates', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload certificates for their restaurant"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'certificates' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can view their certificates"
ON storage.objects FOR SELECT
USING (bucket_id = 'certificates' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their certificates"
ON storage.objects FOR DELETE
USING (bucket_id = 'certificates' AND auth.uid() IS NOT NULL);

-- ============================================================
-- FIM DO SCRIPT
-- ============================================================
-- Após executar este script:
-- 1. Configure os Edge Function Secrets no painel Supabase
-- 2. Faça deploy das Edge Functions via CLI
-- 3. Atualize o .env do projeto com as novas credenciais
-- ============================================================
