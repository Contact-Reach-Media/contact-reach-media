-- ==============================================================================
-- ContactReach Market — Comprehensive Supabase Database Schema
-- Project Name: contactreachmarket
-- Project ID: hfwfjbvwhkjfrdodqyyw
-- Project URL: https://hfwfjbvwhkjfrdodqyyw.supabase.co
-- ==============================================================================
-- INSTRUCTIONS FOR SUPABASE SQL EDITOR:
-- 1. Open your Supabase SQL Editor:
--    https://supabase.com/dashboard/project/hfwfjbvwhkjfrdodqyyw/sql/new
-- 2. Paste this entire script into the editor.
-- 3. Click "Run" (or press Ctrl+Enter).
-- This script is completely safe, idempotent, and non-destructive.
-- ==============================================================================

-- 0. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Helper function to automatically update updated_at timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 1. PROFILES & AUTHENTICATED USERS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    full_name TEXT NOT NULL DEFAULT 'Customer',
    email TEXT UNIQUE,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'buyer',
    avatar_url TEXT,
    delivery_address TEXT,
    city TEXT DEFAULT 'Kigali',
    country TEXT DEFAULT 'Rwanda',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all profiles" ON public.profiles;
CREATE POLICY "Allow public all profiles" ON public.profiles FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Legacy users/accounts table support
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL DEFAULT 'User',
    email TEXT UNIQUE,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'customer',
    default_address TEXT,
    city TEXT DEFAULT 'Kigali',
    country TEXT DEFAULT 'Rwanda',
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all users" ON public.users;
CREATE POLICY "Allow public all users" ON public.users FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.accounts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'buyer',
    status TEXT NOT NULL DEFAULT 'Active',
    active BOOLEAN DEFAULT true,
    delivery_address TEXT,
    total_orders INTEGER DEFAULT 0,
    total_spent NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all accounts" ON public.accounts;
CREATE POLICY "Allow public all accounts" ON public.accounts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ==============================================================================
-- 2. ADMIN ROLES & ADMIN USERS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.admin_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all admin_roles" ON public.admin_roles;
CREATE POLICY "Allow public all admin_roles" ON public.admin_roles FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.admin_users (
    id TEXT PRIMARY KEY,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'administrator',
    permissions JSONB DEFAULT '[]'::jsonb,
    active BOOLEAN DEFAULT true,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all admin_users" ON public.admin_users;
CREATE POLICY "Allow public all admin_users" ON public.admin_users FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ==============================================================================
-- 3. CATEGORIES TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    name_en TEXT,
    name_rw TEXT,
    name_fr TEXT,
    slug TEXT,
    icon TEXT DEFAULT 'Tag',
    image_url TEXT,
    description TEXT,
    parent_id TEXT,
    level INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    item_count INTEGER DEFAULT 0,
    keywords JSONB DEFAULT '[]'::jsonb,
    subcategories JSONB DEFAULT '[]'::jsonb,
    subcategories_list JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all categories" ON public.categories;
CREATE POLICY "Allow public all categories" ON public.categories FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ==============================================================================
-- 4. REGISTERED SHOPS & VENDORS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.shops (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    name_rw TEXT,
    category TEXT DEFAULT 'all',
    description TEXT,
    location TEXT DEFAULT 'Kigali, Rwanda',
    address TEXT,
    phone TEXT,
    email TEXT,
    tin_number TEXT,
    contact_person TEXT,
    commission_rate NUMERIC DEFAULT 10,
    payout_method TEXT DEFAULT 'MTN Mobile Money',
    payout_account TEXT,
    payout_receiver_name TEXT,
    total_sales NUMERIC DEFAULT 0,
    total_payouts_paid NUMERIC DEFAULT 0,
    pending_payout NUMERIC DEFAULT 0,
    logo TEXT DEFAULT 'ShoppingBag',
    logo_url TEXT,
    banner_color TEXT DEFAULT 'from-orange-500 to-amber-600',
    banner_url TEXT,
    rating REAL DEFAULT 5.0,
    followers_count INTEGER DEFAULT 0,
    is_verified BOOLEAN DEFAULT false,
    is_recommended BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'Active',
    is_active BOOLEAN DEFAULT true,
    delivery_info TEXT,
    categories JSONB DEFAULT '[]'::jsonb,
    owner_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all shops" ON public.shops;
CREATE POLICY "Allow public all shops" ON public.shops FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ==============================================================================
-- 5. PRODUCTS CATALOG TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    sku TEXT,
    description TEXT,
    price NUMERIC NOT NULL DEFAULT 0,
    cost_price NUMERIC,
    cost_overridden_by_admin BOOLEAN DEFAULT false,
    commission_rate NUMERIC DEFAULT 10,
    profit_margin NUMERIC DEFAULT 0,
    discount_percent NUMERIC DEFAULT 0,
    discount_price NUMERIC,
    promo_start_date TIMESTAMPTZ,
    promo_end_date TIMESTAMPTZ,
    category TEXT NOT NULL DEFAULT 'clothing',
    subcategory TEXT,
    main_category_id TEXT,
    sub_category_id TEXT,
    category_name TEXT,
    sub_category_name TEXT,
    stock INTEGER NOT NULL DEFAULT 0,
    image_url TEXT,
    images JSONB DEFAULT '[]'::jsonb,
    video_url TEXT,
    youtube_url TEXT,
    shop_name TEXT,
    shop_id TEXT REFERENCES public.shops(id) ON DELETE SET NULL,
    receiver_name TEXT,
    receiver_phone TEXT,
    payment_methods JSONB DEFAULT '[]'::jsonb,
    merchant_code TEXT,
    location TEXT DEFAULT 'Kigali, Rwanda',
    delivery_info TEXT,
    status TEXT NOT NULL DEFAULT 'Available',
    is_featured BOOLEAN DEFAULT false,
    is_new_arrival BOOLEAN DEFAULT false,
    is_best_seller BOOLEAN DEFAULT false,
    brand TEXT,
    unit TEXT DEFAULT 'Piece',
    shipping_cost NUMERIC DEFAULT 0,
    specifications TEXT,
    storage TEXT,
    packaging_info TEXT,
    attributes JSONB DEFAULT '[]'::jsonb,
    variations JSONB DEFAULT '[]'::jsonb,
    rating REAL DEFAULT 5.0,
    reviews_count INTEGER DEFAULT 0,
    source TEXT DEFAULT 'local',
    cj_product_id TEXT,
    cj_product_sku TEXT,
    cj_original_cost_usd NUMERIC,
    cj_last_sync_at TIMESTAMPTZ,
    review_status TEXT DEFAULT 'Approved',
    alibaba_product_id TEXT,
    alibaba_item_url TEXT,
    alibaba_supplier_name TEXT,
    alibaba_supplier_location TEXT,
    alibaba_moq INTEGER DEFAULT 1,
    alibaba_weight_kg NUMERIC,
    alibaba_dimensions_cm JSONB,
    alibaba_original_cost_usd NUMERIC,
    alibaba_shipping_cost_usd NUMERIC,
    alibaba_shipping_cost_rwf NUMERIC,
    alibaba_shipping_method TEXT,
    alibaba_lead_time_days INTEGER,
    alibaba_trade_assurance BOOLEAN DEFAULT true,
    alibaba_verified_supplier BOOLEAN DEFAULT false,
    alibaba_last_sync_at TIMESTAMPTZ,
    ali_express_url TEXT,
    supplier_variant TEXT,
    supplier_sku TEXT,
    supplier_product_url TEXT,
    is_supplier_mapped BOOLEAN DEFAULT false,
    last_verified_at TIMESTAMPTZ,
    history JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all products" ON public.products;
CREATE POLICY "Allow public all products" ON public.products FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ==============================================================================
-- 6. INVENTORY & INVENTORY TRANSACTIONS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id TEXT REFERENCES public.products(id) ON DELETE CASCADE,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    reserved_quantity INTEGER NOT NULL DEFAULT 0,
    available_quantity INTEGER NOT NULL DEFAULT 0,
    low_stock_threshold INTEGER NOT NULL DEFAULT 5,
    location TEXT DEFAULT 'Kigali Main Warehouse',
    last_restocked_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all inventory" ON public.inventory;
CREATE POLICY "Allow public all inventory" ON public.inventory FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.inventory_logs (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    product_name TEXT,
    transaction_type TEXT DEFAULT 'adjustment',
    previous_stock INTEGER,
    new_stock INTEGER,
    change_amount INTEGER,
    quantity_changed INTEGER,
    reason TEXT,
    admin_name TEXT,
    performed_by TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all inventory_logs" ON public.inventory_logs;
CREATE POLICY "Allow public all inventory_logs" ON public.inventory_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.inventory_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id TEXT NOT NULL,
    product_name TEXT,
    transaction_type TEXT DEFAULT 'adjustment',
    previous_stock INTEGER,
    new_stock INTEGER,
    change_amount INTEGER,
    reason TEXT,
    performed_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all inventory_transactions" ON public.inventory_transactions;
CREATE POLICY "Allow public all inventory_transactions" ON public.inventory_transactions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ==============================================================================
-- 7. ORDERS & ORDER ITEMS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY,
    order_number TEXT UNIQUE NOT NULL,
    tracking_token TEXT,
    tracking_number TEXT,
    tracking_carrier TEXT,
    tracking_url TEXT,
    tracking_added_at TIMESTAMPTZ,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,
    delivery_type TEXT DEFAULT 'delivery',
    delivery_location TEXT DEFAULT 'Gasabo',
    delivery_address TEXT,
    delivery_notes TEXT,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal NUMERIC DEFAULT 0,
    delivery_fee NUMERIC DEFAULT 0,
    shipping_cost NUMERIC DEFAULT 0,
    discount_amount NUMERIC DEFAULT 0,
    coupon_code TEXT,
    total_amount NUMERIC NOT NULL DEFAULT 0,
    commission_rate NUMERIC DEFAULT 10,
    commission_earned NUMERIC DEFAULT 0,
    supplier_payout_amount NUMERIC DEFAULT 0,
    supplier_payout_status TEXT DEFAULT 'Pending',
    supplier_fulfillment_status TEXT DEFAULT 'Pending',
    supplier_payout_ref TEXT,
    payment_method TEXT DEFAULT 'MTN Mobile Money',
    receiver_name TEXT DEFAULT 'Ruth',
    receiver_details TEXT DEFAULT '0780022600',
    shop_name TEXT,
    payment_status TEXT DEFAULT 'Pending Payment',
    status TEXT DEFAULT 'New',
    delivery_status TEXT DEFAULT 'Pending',
    expected_delivery_date TIMESTAMPTZ,
    supplier_name TEXT,
    supplier_order_ref TEXT,
    dispatch_date TIMESTAMPTZ,
    stock_deducted BOOLEAN DEFAULT false,
    assigned_courier TEXT,
    courier_phone TEXT,
    internal_notes TEXT,
    user_id TEXT,
    supplier_approval_status TEXT DEFAULT 'Pending Review',
    supplier_approved_at TIMESTAMPTZ,
    supplier_approved_by TEXT,
    supplier_rejection_reason TEXT,
    cj_fulfillment_status TEXT DEFAULT 'Not Applicable',
    cj_fulfillment_approved_at TIMESTAMPTZ,
    cj_fulfillment_approved_by TEXT,
    cj_tracking_number TEXT,
    alibaba_fulfillment_status TEXT DEFAULT 'Not Applicable',
    alibaba_fulfillment_approved_at TIMESTAMPTZ,
    alibaba_fulfillment_approved_by TEXT,
    alibaba_order_ref TEXT,
    alibaba_tracking_number TEXT,
    alibaba_shipping_method TEXT,
    status_history JSONB DEFAULT '[]'::jsonb,
    payment_confirmation JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all orders" ON public.orders;
CREATE POLICY "Allow public all orders" ON public.orders FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id TEXT NOT NULL,
    product_id TEXT,
    product_name TEXT NOT NULL,
    unit_price NUMERIC NOT NULL DEFAULT 0,
    quantity INTEGER NOT NULL DEFAULT 1,
    line_total NUMERIC NOT NULL DEFAULT 0,
    variation JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all order_items" ON public.order_items;
CREATE POLICY "Allow public all order_items" ON public.order_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ==============================================================================
-- 8. DELIVERIES TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id TEXT,
    order_number TEXT NOT NULL,
    tracking_number TEXT,
    courier_name TEXT,
    courier_phone TEXT,
    delivery_address TEXT NOT NULL,
    delivery_city TEXT DEFAULT 'Kigali',
    delivery_district TEXT,
    delivery_fee NUMERIC DEFAULT 0,
    delivery_status TEXT NOT NULL DEFAULT 'Pending',
    expected_delivery_date TIMESTAMPTZ,
    actual_delivery_date TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all deliveries" ON public.deliveries;
CREATE POLICY "Allow public all deliveries" ON public.deliveries FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ==============================================================================
-- 9. PAYMENTS & PAYMENT VERIFICATIONS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.payments (
    id TEXT PRIMARY KEY,
    order_id TEXT,
    order_number TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    payment_phone TEXT,
    amount NUMERIC NOT NULL DEFAULT 0,
    amount_paid NUMERIC NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL DEFAULT 'MTN Mobile Money',
    transaction_id TEXT,
    screenshot_url TEXT,
    payment_proof_url TEXT,
    confirmation_message TEXT,
    verification_status TEXT DEFAULT 'Pending Verification',
    verified_at TIMESTAMPTZ,
    verified_by TEXT,
    notes TEXT,
    admin_notes TEXT,
    is_duplicate_txn BOOLEAN DEFAULT false,
    duplicate_order_numbers JSONB DEFAULT '[]'::jsonb,
    flagged_suspicious BOOLEAN DEFAULT false,
    suspicious_reason TEXT,
    customer_notified BOOLEAN DEFAULT false,
    notification_message TEXT,
    verified_directly BOOLEAN DEFAULT false,
    telecom_verified BOOLEAN DEFAULT false,
    telecom_reference TEXT,
    sender_name TEXT,
    sender_phone TEXT,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all payments" ON public.payments;
CREATE POLICY "Allow public all payments" ON public.payments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.payment_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id TEXT,
    order_number TEXT NOT NULL,
    verified_by TEXT NOT NULL,
    verification_method TEXT DEFAULT 'manual',
    telecom_reference TEXT,
    amount_verified NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Verified',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.payment_verifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all payment_verifications" ON public.payment_verifications;
CREATE POLICY "Allow public all payment_verifications" ON public.payment_verifications FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.payment_transactions (
    id TEXT PRIMARY KEY,
    order_id TEXT,
    order_number TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,
    amount NUMERIC NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'RWF',
    payment_method TEXT NOT NULL,
    provider TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending',
    provider_transaction_id TEXT,
    financial_transaction_id TEXT,
    idempotency_key TEXT,
    checkout_url TEXT,
    failure_reason TEXT,
    verified_directly BOOLEAN DEFAULT false,
    verified_at TIMESTAMPTZ,
    telecom_status TEXT,
    signature_verified BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all payment_transactions" ON public.payment_transactions;
CREATE POLICY "Allow public all payment_transactions" ON public.payment_transactions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ==============================================================================
-- 10. CUSTOMERS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.customers (
    id TEXT PRIMARY KEY,
    email TEXT,
    phone TEXT,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'customer',
    delivery_address TEXT,
    default_address TEXT,
    city TEXT DEFAULT 'Kigali',
    country TEXT DEFAULT 'Rwanda',
    total_orders INTEGER DEFAULT 0,
    total_spent NUMERIC DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    status TEXT DEFAULT 'Active',
    is_registered_buyer BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all customers" ON public.customers;
CREATE POLICY "Allow public all customers" ON public.customers FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ==============================================================================
-- 11. CONVERSATIONS & CUSTOMER MESSAGES TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id TEXT,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    customer_email TEXT,
    last_message TEXT,
    unread_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all conversations" ON public.conversations;
CREATE POLICY "Allow public all conversations" ON public.conversations FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.messages (
    id TEXT PRIMARY KEY,
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
    customer_id TEXT,
    name TEXT NOT NULL,
    sender_name TEXT,
    email TEXT,
    sender_email TEXT,
    phone TEXT,
    sender_phone TEXT,
    subject TEXT,
    message TEXT NOT NULL,
    order_number TEXT,
    status TEXT DEFAULT 'unread',
    read_at TIMESTAMPTZ,
    replied_at TIMESTAMPTZ,
    reply_note TEXT,
    reply_message TEXT,
    sender TEXT DEFAULT 'customer',
    is_read_by_customer BOOLEAN DEFAULT false,
    is_read_by_admin BOOLEAN DEFAULT false,
    notification_type TEXT DEFAULT 'chat',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all messages" ON public.messages;
CREATE POLICY "Allow public all messages" ON public.messages FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.customer_messages (
    id TEXT PRIMARY KEY,
    conversation_id UUID,
    customer_id TEXT,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    message TEXT NOT NULL,
    order_number TEXT,
    status TEXT DEFAULT 'unread',
    reply_note TEXT,
    sender TEXT DEFAULT 'customer',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.customer_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all customer_messages" ON public.customer_messages;
CREATE POLICY "Allow public all customer_messages" ON public.customer_messages FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ==============================================================================
-- 12. ISSUES & REPORTS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.customer_problems (
    id TEXT PRIMARY KEY,
    case_number TEXT,
    order_number TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,
    category TEXT DEFAULT 'delivery_delay',
    issue_type TEXT,
    description TEXT NOT NULL,
    priority TEXT DEFAULT 'medium',
    status TEXT NOT NULL DEFAULT 'New',
    assigned_to TEXT,
    private_notes JSONB DEFAULT '[]'::jsonb,
    admin_notes TEXT,
    resolution TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.customer_problems ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all customer_problems" ON public.customer_problems;
CREATE POLICY "Allow public all customer_problems" ON public.customer_problems FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.issues (
    id TEXT PRIMARY KEY,
    case_number TEXT,
    order_number TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    category TEXT DEFAULT 'delivery_delay',
    description TEXT NOT NULL,
    priority TEXT DEFAULT 'medium',
    status TEXT NOT NULL DEFAULT 'New',
    resolution TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all issues" ON public.issues;
CREATE POLICY "Allow public all issues" ON public.issues FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    filters JSONB DEFAULT '{}'::jsonb,
    generated_by TEXT,
    file_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all reports" ON public.reports;
CREATE POLICY "Allow public all reports" ON public.reports FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ==============================================================================
-- 13. SUPPLIERS & SOURCING TABLES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.suppliers (
    id TEXT PRIMARY KEY,
    business_name TEXT NOT NULL,
    owner_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    tin_number TEXT,
    location TEXT,
    category TEXT,
    description TEXT,
    documents JSONB DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'Pending',
    reviewed_by TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all suppliers" ON public.suppliers;
CREATE POLICY "Allow public all suppliers" ON public.suppliers FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.supplier_applications (
    id TEXT PRIMARY KEY,
    business_name TEXT NOT NULL,
    owner_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    tin_number TEXT,
    location TEXT,
    category TEXT,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'Pending',
    reviewed_by TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.supplier_applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all supplier_applications" ON public.supplier_applications;
CREATE POLICY "Allow public all supplier_applications" ON public.supplier_applications FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.supplier_payouts (
    id TEXT PRIMARY KEY,
    shop_id TEXT,
    shop_name TEXT,
    order_id TEXT,
    order_number TEXT,
    order_total NUMERIC DEFAULT 0,
    commission_rate NUMERIC DEFAULT 0.1,
    commission_earned NUMERIC DEFAULT 0,
    payout_amount NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'Pending',
    payment_reference TEXT,
    paid_at TIMESTAMPTZ,
    approved_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.supplier_payouts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all supplier_payouts" ON public.supplier_payouts;
CREATE POLICY "Allow public all supplier_payouts" ON public.supplier_payouts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.supplier_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id TEXT,
    product_id TEXT,
    supplier_sku TEXT,
    wholesale_price NUMERIC NOT NULL DEFAULT 0,
    moq INTEGER DEFAULT 1,
    lead_time_days INTEGER DEFAULT 3,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.supplier_products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all supplier_products" ON public.supplier_products;
CREATE POLICY "Allow public all supplier_products" ON public.supplier_products FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.supplier_imports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source TEXT NOT NULL,
    imported_count INTEGER DEFAULT 0,
    approved_count INTEGER DEFAULT 0,
    rejected_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'completed',
    error_details TEXT,
    imported_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.supplier_imports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all supplier_imports" ON public.supplier_imports;
CREATE POLICY "Allow public all supplier_imports" ON public.supplier_imports FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.fulfillment_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id TEXT,
    order_number TEXT NOT NULL,
    provider TEXT NOT NULL,
    supplier_order_ref TEXT,
    tracking_number TEXT,
    fulfillment_status TEXT DEFAULT 'Pending',
    sync_status TEXT DEFAULT 'synced',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.fulfillment_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all fulfillment_records" ON public.fulfillment_records;
CREATE POLICY "Allow public all fulfillment_records" ON public.fulfillment_records FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ==============================================================================
-- 14. PROMO CODES & COUPONS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.coupons (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    discount_type TEXT NOT NULL DEFAULT 'percentage',
    discount_value NUMERIC NOT NULL DEFAULT 0,
    min_order_amount NUMERIC DEFAULT 0,
    max_discount NUMERIC,
    max_discount_amount NUMERIC,
    expires_at TIMESTAMPTZ,
    usage_limit INTEGER,
    times_used INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all coupons" ON public.coupons;
CREATE POLICY "Allow public all coupons" ON public.coupons FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.promo_codes (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    discount_type TEXT NOT NULL DEFAULT 'percentage',
    discount_value NUMERIC NOT NULL DEFAULT 0,
    min_order_amount NUMERIC DEFAULT 0,
    max_discount NUMERIC,
    expires_at TIMESTAMPTZ,
    usage_limit INTEGER,
    times_used INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all promo_codes" ON public.promo_codes;
CREATE POLICY "Allow public all promo_codes" ON public.promo_codes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.promo_code_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    promo_code_id TEXT,
    code TEXT NOT NULL,
    order_id TEXT,
    customer_id TEXT,
    discount_applied NUMERIC NOT NULL DEFAULT 0,
    used_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.promo_code_usage ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all promo_code_usage" ON public.promo_code_usage;
CREATE POLICY "Allow public all promo_code_usage" ON public.promo_code_usage FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ==============================================================================
-- 15. AUDIT LOGS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY,
    admin_name TEXT,
    admin_role TEXT,
    action TEXT NOT NULL,
    details TEXT,
    entity_type TEXT,
    entity_id TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all audit_logs" ON public.audit_logs;
CREATE POLICY "Allow public all audit_logs" ON public.audit_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ==============================================================================
-- 16. STORE SETTINGS & CONFIGURATION TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.app_settings (
    id TEXT PRIMARY KEY DEFAULT 'global',
    market_name TEXT DEFAULT 'ContactReach Market',
    company_name TEXT DEFAULT 'ContactReach Media Ltd',
    slogan TEXT DEFAULT 'Discover Products. Pay Easily. Shop with Confidence.',
    phone TEXT DEFAULT '+250780022600',
    email TEXT DEFAULT 'contactreachmedialimited@gmail.com',
    address TEXT DEFAULT 'KG 622 St, Fair View Plaza, Kigali, Rwanda',
    receiver_name TEXT DEFAULT 'Ruth',
    payment_number TEXT DEFAULT '0780022600',
    merchant_code TEXT DEFAULT '2328354',
    mtn_ussd_pattern TEXT DEFAULT '*182*1*1*0780022600*{AMOUNT}#',
    airtel_ussd_pattern TEXT DEFAULT '*182*1*2*0780022600*{AMOUNT}#',
    whats_app_number TEXT DEFAULT '+250780022600',
    delivery_fee_kigali NUMERIC DEFAULT 1500,
    delivery_fee_upcountry NUMERIC DEFAULT 3500,
    free_delivery_threshold NUMERIC DEFAULT 50000,
    outside_kigali_notice TEXT,
    is_maintenance_mode BOOLEAN DEFAULT false,
    maintenance_title TEXT,
    maintenance_message TEXT,
    maintenance_estimated_time TEXT,
    maintenance_updated_at TIMESTAMPTZ,
    socials JSONB DEFAULT '{}'::jsonb,
    kigali_areas JSONB DEFAULT '[]'::jsonb,
    cj_config JSONB DEFAULT '{}'::jsonb,
    drive_backup_status JSONB DEFAULT '{}'::jsonb,
    google_sheet_config JSONB DEFAULT '{}'::jsonb,
    alibaba_config JSONB DEFAULT '{}'::jsonb,
    dsers_config JSONB DEFAULT '{}'::jsonb,
    supabase_config JSONB DEFAULT '{}'::jsonb,
    settings_data JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all app_settings" ON public.app_settings;
CREATE POLICY "Allow public all app_settings" ON public.app_settings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.store_settings (
    id TEXT PRIMARY KEY DEFAULT 'global',
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all store_settings" ON public.store_settings;
CREATE POLICY "Allow public all store_settings" ON public.store_settings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ==============================================================================
-- 17. NOTIFICATION LOGS & REVIEWS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.notification_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel TEXT NOT NULL DEFAULT 'sms',
    recipient TEXT NOT NULL,
    subject TEXT,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'sent',
    error_message TEXT,
    sent_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all notification_logs" ON public.notification_logs;
CREATE POLICY "Allow public all notification_logs" ON public.notification_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.reviews (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    rating REAL NOT NULL DEFAULT 5.0,
    comment TEXT,
    verified_purchase BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'approved',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all reviews" ON public.reviews;
CREATE POLICY "Allow public all reviews" ON public.reviews FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.deleted_tombstones (
    id TEXT PRIMARY KEY,
    product_name TEXT,
    deleted_by TEXT,
    deleted_at TIMESTAMPTZ DEFAULT NOW(),
    reason TEXT
);

ALTER TABLE public.deleted_tombstones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all deleted_tombstones" ON public.deleted_tombstones;
CREATE POLICY "Allow public all deleted_tombstones" ON public.deleted_tombstones FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ==============================================================================
-- 18. REALTIME REPLICATION PUBLICATION SETUP
-- ==============================================================================
DO $$
DECLARE
    tbl text;
    realtime_tables text[] := ARRAY[
        'products', 'orders', 'payments', 'messages', 'customer_problems',
        'categories', 'shops', 'coupons', 'inventory_logs', 'audit_logs',
        'supplier_applications', 'supplier_payouts', 'app_settings'
    ];
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        FOREACH tbl IN ARRAY realtime_tables LOOP
            IF NOT EXISTS (
                SELECT 1 FROM pg_publication_tables 
                WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = tbl
            ) THEN
                BEGIN
                    EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
                EXCEPTION WHEN OTHERS THEN
                    NULL;
                END;
            END IF;
        END LOOP;
    END IF;
END;
$$;

-- ==============================================================================
-- 19. AUTOMATIC UPDATED_AT TRIGGERS
-- ==============================================================================
DROP TRIGGER IF EXISTS trigger_products_updated_at ON public.products;
CREATE TRIGGER trigger_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_categories_updated_at ON public.categories;
CREATE TRIGGER trigger_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_shops_updated_at ON public.shops;
CREATE TRIGGER trigger_shops_updated_at BEFORE UPDATE ON public.shops FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_orders_updated_at ON public.orders;
CREATE TRIGGER trigger_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_app_settings_updated_at ON public.app_settings;
CREATE TRIGGER trigger_app_settings_updated_at BEFORE UPDATE ON public.app_settings FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- End of schema
