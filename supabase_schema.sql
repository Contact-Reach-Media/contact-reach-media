-- ==============================================================================
-- ContactReach Market — Comprehensive Supabase Database Schema
-- Project Name: contactreachmarket
-- Project ID: hfwfjbvwhkjfrdodqyyw
-- Project URL: https://hfwfjbvwhkjfrdodqyyw.supabase.co
-- ==============================================================================
-- INSTRUCTIONS FOR SUPABASE SQL EDITOR:
-- 1. Log in to your Supabase Dashboard:
--    https://supabase.com/dashboard/project/hfwfjbvwhkjfrdodqyyw/sql/new
-- 2. Paste this entire SQL script into the editor.
-- 3. Click "Run" (or press Ctrl+Enter).
-- This script is idempotent: safe to run repeatedly without breaking existing data.
-- ==============================================================================

-- Enable UUID extension if available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Helper function to automatically update `updated_at` timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ==============================================================================
-- 1. PRODUCTS & INVENTORY TABLE
-- Stores full catalog, variations, pricing, dropshipping (CJ, Alibaba, AliExpress),
-- commission rates, media images/videos, and discount promotions.
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
    shop_id TEXT,
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

-- Safe migrations for existing installations
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS commission_rate NUMERIC DEFAULT 10;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS profit_margin NUMERIC DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS discount_percent NUMERIC DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS discount_price NUMERIC;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS promo_start_date TIMESTAMPTZ;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS promo_end_date TIMESTAMPTZ;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS subcategory TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS youtube_url TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS specifications TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS storage TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS packaging_info TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS attributes JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cj_product_sku TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cj_original_cost_usd NUMERIC;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cj_last_sync_at TIMESTAMPTZ;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS review_status TEXT DEFAULT 'Approved';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS alibaba_item_url TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS alibaba_supplier_name TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS alibaba_supplier_location TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS alibaba_moq INTEGER DEFAULT 1;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS alibaba_weight_kg NUMERIC;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS alibaba_dimensions_cm JSONB;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS alibaba_original_cost_usd NUMERIC;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS alibaba_shipping_cost_usd NUMERIC;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS alibaba_shipping_cost_rwf NUMERIC;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS alibaba_shipping_method TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS alibaba_lead_time_days INTEGER;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS alibaba_trade_assurance BOOLEAN DEFAULT true;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS alibaba_verified_supplier BOOLEAN DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS alibaba_last_sync_at TIMESTAMPTZ;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS ali_express_url TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS supplier_variant TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS supplier_sku TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS supplier_product_url TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_supplier_mapped BOOLEAN DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS history JSONB DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_products_category ON public.products (category);
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products (status);
CREATE INDEX IF NOT EXISTS idx_products_price ON public.products (price);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON public.products (created_at DESC);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all products" ON public.products;
CREATE POLICY "Allow public all products" ON public.products
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);


-- ==============================================================================
-- 2. CATEGORIES TABLE
-- Supports multi-lingual labels (English, Kinyarwanda, French), nested subcategories,
-- custom imagery, icons, hierarchy levels, and sorting orders.
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

ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS name_en TEXT;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS item_count INTEGER DEFAULT 0;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS keywords JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS subcategories_list JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_categories_parent ON public.categories (parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON public.categories (sort_order ASC);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all categories" ON public.categories;
CREATE POLICY "Allow public all categories" ON public.categories
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);


-- ==============================================================================
-- 3. VENDOR SHOPS TABLE
-- Verified partner stores, brand distributors, contact info, commission rates,
-- payout accounts (MTN MoMo, Airtel, Bank), follower metrics, and ratings.
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

ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS tin_number TEXT;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS contact_person TEXT;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS commission_rate NUMERIC DEFAULT 10;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS payout_method TEXT DEFAULT 'MTN Mobile Money';
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS payout_account TEXT;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS payout_receiver_name TEXT;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS total_payouts_paid NUMERIC DEFAULT 0;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS pending_payout NUMERIC DEFAULT 0;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS logo TEXT DEFAULT 'ShoppingBag';
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS banner_color TEXT DEFAULT 'from-orange-500 to-amber-600';
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS delivery_info TEXT;

CREATE INDEX IF NOT EXISTS idx_shops_status ON public.shops (status);
CREATE INDEX IF NOT EXISTS idx_shops_is_verified ON public.shops (is_verified);

ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all shops" ON public.shops;
CREATE POLICY "Allow public all shops" ON public.shops
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);


-- ==============================================================================
-- 4. ORDERS & DELIVERIES TABLE
-- Stores full customer checkouts, items, Kigali/Upcountry delivery coordinates,
-- secret tracking tokens, courier assignments, status histories, dropshipping
-- approvals (CJ, DSers, Alibaba), commission earnings, and supplier payouts.
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

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_carrier TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_url TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_added_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS commission_rate NUMERIC DEFAULT 10;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS commission_earned NUMERIC DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS supplier_payout_amount NUMERIC DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS supplier_payout_status TEXT DEFAULT 'Pending';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS supplier_fulfillment_status TEXT DEFAULT 'Pending';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS supplier_payout_ref TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS receiver_name TEXT DEFAULT 'Ruth';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS receiver_details TEXT DEFAULT '0780022600';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS expected_delivery_date TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS supplier_order_ref TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS dispatch_date TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS stock_deducted BOOLEAN DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS assigned_courier TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS courier_phone TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS internal_notes TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS supplier_approval_status TEXT DEFAULT 'Pending Review';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS supplier_approved_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS supplier_approved_by TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS supplier_rejection_reason TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cj_fulfillment_status TEXT DEFAULT 'Not Applicable';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cj_fulfillment_approved_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cj_fulfillment_approved_by TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cj_tracking_number TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS alibaba_fulfillment_status TEXT DEFAULT 'Not Applicable';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS alibaba_fulfillment_approved_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS alibaba_fulfillment_approved_by TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS alibaba_order_ref TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS alibaba_tracking_number TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS alibaba_shipping_method TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS status_history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_confirmation JSONB;

CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders (order_number);
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON public.orders (customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_tracking_token ON public.orders (tracking_token);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders (payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders (created_at DESC);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all orders" ON public.orders;
CREATE POLICY "Allow public all orders" ON public.orders
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);


-- ==============================================================================
-- 5. PAYMENT CONFIRMATIONS & EVIDENCE TABLE
-- Stores MoMo / Airtel / Card transaction references, screenshots, pasted SMS
-- confirmations, duplicate transaction detection, anti-fraud flags, and review status.
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

ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS payment_phone TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS amount_paid NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS screenshot_url TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS confirmation_message TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS is_duplicate_txn BOOLEAN DEFAULT false;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS duplicate_order_numbers JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS flagged_suspicious BOOLEAN DEFAULT false;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS suspicious_reason TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS customer_notified BOOLEAN DEFAULT false;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS notification_message TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS verified_directly BOOLEAN DEFAULT false;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS telecom_verified BOOLEAN DEFAULT false;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS telecom_reference TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_payments_order_number ON public.payments (order_number);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON public.payments (transaction_id);
CREATE INDEX IF NOT EXISTS idx_payments_verification ON public.payments (verification_status);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all payments" ON public.payments;
CREATE POLICY "Allow public all payments" ON public.payments
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);


-- ==============================================================================
-- 6. DIRECT TELECOM PAYMENT TRANSACTIONS TABLE
-- Captures MTN MoMo open API pushes, Airtel Money Rwanda webhooks, direct card
-- payments, idempotency keys, financial reference IDs, and verification states.
-- ==============================================================================
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

CREATE INDEX IF NOT EXISTS idx_transactions_order_number ON public.payment_transactions (order_number);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.payment_transactions (status);
CREATE INDEX IF NOT EXISTS idx_transactions_provider_id ON public.payment_transactions (provider_transaction_id);

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all payment_transactions" ON public.payment_transactions;
CREATE POLICY "Allow public all payment_transactions" ON public.payment_transactions
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);


-- ==============================================================================
-- 7. ACCOUNTS & USERS TABLE (Buyers, Vendors, Staff & Administrators)
-- Stores customer buyer profiles, order history totals, wishlist, delivery addresses,
-- Google OAuth IDs, and role-based access control (RBAC) administrator accounts.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.accounts (
    id TEXT PRIMARY KEY,
    email TEXT,
    phone TEXT,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'buyer',
    auth_provider TEXT NOT NULL DEFAULT 'supabase',
    status TEXT NOT NULL DEFAULT 'Active',
    active BOOLEAN DEFAULT true,
    last_sign_in_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ DEFAULT NOW(),
    sign_in_count INTEGER DEFAULT 1,
    total_orders INTEGER DEFAULT 0,
    total_spent NUMERIC DEFAULT 0,
    wishlist JSONB DEFAULT '[]'::jsonb,
    delivery_address TEXT,
    photo_url TEXT,
    google_uid TEXT,
    account_type TEXT DEFAULT 'buyer',
    is_registered_buyer BOOLEAN DEFAULT true,
    has_password BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS total_orders INTEGER DEFAULT 0;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS total_spent NUMERIC DEFAULT 0;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS wishlist JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS delivery_address TEXT;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS google_uid TEXT;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'buyer';
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS is_registered_buyer BOOLEAN DEFAULT true;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS has_password BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_accounts_email ON public.accounts (email);
CREATE INDEX IF NOT EXISTS idx_accounts_phone ON public.accounts (phone);
CREATE INDEX IF NOT EXISTS idx_accounts_role ON public.accounts (role);
CREATE INDEX IF NOT EXISTS idx_accounts_google_uid ON public.accounts (google_uid);

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all accounts" ON public.accounts;
CREATE POLICY "Allow public all accounts" ON public.accounts
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);


-- ==============================================================================
-- 8. MESSAGES & CUSTOMER CHAT TABLE
-- Real-time 2-way communication between customers and store admins, inquiry threads,
-- order update notifications, and admin replies.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.messages (
    id TEXT PRIMARY KEY,
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

ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS customer_id TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS order_number TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS reply_note TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS sender TEXT DEFAULT 'customer';
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_read_by_customer BOOLEAN DEFAULT false;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_read_by_admin BOOLEAN DEFAULT false;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS notification_type TEXT DEFAULT 'chat';

CREATE INDEX IF NOT EXISTS idx_messages_customer_id ON public.messages (customer_id);
CREATE INDEX IF NOT EXISTS idx_messages_status ON public.messages (status);
CREATE INDEX IF NOT EXISTS idx_messages_order_number ON public.messages (order_number);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages (created_at DESC);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all messages" ON public.messages;
CREATE POLICY "Allow public all messages" ON public.messages
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);


-- ==============================================================================
-- 9. CUSTOMER PROBLEM REPORTS / DISPUTES TABLE
-- Manages delivery delays, missing items, damaged products, refund requests,
-- case priority (low, medium, high, urgent), staff assignments, and resolutions.
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

ALTER TABLE public.customer_problems ADD COLUMN IF NOT EXISTS case_number TEXT;
ALTER TABLE public.customer_problems ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'delivery_delay';
ALTER TABLE public.customer_problems ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium';
ALTER TABLE public.customer_problems ADD COLUMN IF NOT EXISTS assigned_to TEXT;
ALTER TABLE public.customer_problems ADD COLUMN IF NOT EXISTS private_notes JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.customer_problems ADD COLUMN IF NOT EXISTS resolution TEXT;
ALTER TABLE public.customer_problems ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_problems_order_number ON public.customer_problems (order_number);
CREATE INDEX IF NOT EXISTS idx_problems_status ON public.customer_problems (status);

ALTER TABLE public.customer_problems ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all customer_problems" ON public.customer_problems;
CREATE POLICY "Allow public all customer_problems" ON public.customer_problems
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);


-- ==============================================================================
-- 10. COUPONS & PROMO CODES TABLE
-- Percentage or fixed discounts, minimum order threshold, maximum discount bounds,
-- expiration dates, and usage limits with automatic redemption counters.
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

ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS max_discount NUMERIC;

CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons (code);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all coupons" ON public.coupons;
CREATE POLICY "Allow public all coupons" ON public.coupons
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);


-- ==============================================================================
-- 11. APP SETTINGS & CONFIGURATION TABLE
-- Stores global company metadata, Kigali delivery zones and fees, MoMo merchant codes,
-- USSD patterns, maintenance mode status, dropshipping credentials, and backups.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.app_settings (
    id TEXT PRIMARY KEY DEFAULT 'global',
    market_name TEXT DEFAULT 'ContactReach Market',
    company_name TEXT DEFAULT 'ContactReach Media Ltd',
    slogan TEXT DEFAULT 'Discover Products. Pay Easily. Shop with Confidence.',
    phone TEXT DEFAULT '+250780022600',
    email TEXT DEFAULT 'contactreachmedialimited@gmail.com',
    address TEXT DEFAULT 'Kigali, Rwanda',
    receiver_name TEXT DEFAULT 'Ruth',
    payment_number TEXT DEFAULT '0780022600',
    merchant_code TEXT DEFAULT '*182*8*1*0780022600#',
    mtn_ussd_pattern TEXT,
    airtel_ussd_pattern TEXT,
    whats_app_number TEXT DEFAULT '+250780022600',
    delivery_fee_kigali NUMERIC DEFAULT 2000,
    delivery_fee_upcountry NUMERIC DEFAULT 4000,
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

ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS slogan TEXT;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS receiver_name TEXT;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS payment_number TEXT;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS merchant_code TEXT;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS mtn_ussd_pattern TEXT;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS airtel_ussd_pattern TEXT;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS whats_app_number TEXT;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS delivery_fee_kigali NUMERIC;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS delivery_fee_upcountry NUMERIC;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS free_delivery_threshold NUMERIC;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS outside_kigali_notice TEXT;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS is_maintenance_mode BOOLEAN;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS maintenance_title TEXT;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS maintenance_message TEXT;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS maintenance_estimated_time TEXT;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS maintenance_updated_at TIMESTAMPTZ;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS socials JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS kigali_areas JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS cj_config JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS drive_backup_status JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS google_sheet_config JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS alibaba_config JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS dsers_config JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS supabase_config JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all app_settings" ON public.app_settings;
CREATE POLICY "Allow public all app_settings" ON public.app_settings
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);


-- ==============================================================================
-- 12. PRODUCT REVIEWS & RATINGS TABLE
-- Customer star ratings, verified purchase badges, review text, and admin approvals.
-- ==============================================================================
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

ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS verified_purchase BOOLEAN DEFAULT false;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved';

CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON public.reviews (product_id);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all reviews" ON public.reviews;
CREATE POLICY "Allow public all reviews" ON public.reviews
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);


-- ==============================================================================
-- 13. SUPPLIER & VENDOR ONBOARDING APPLICATIONS TABLE
-- Stores new merchant sign-ups, TIN business registration numbers, Kigali locations,
-- product categories, and administrator verification workflows.
-- ==============================================================================
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

CREATE INDEX IF NOT EXISTS idx_supplier_apps_status ON public.supplier_applications (status);

ALTER TABLE public.supplier_applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all supplier_applications" ON public.supplier_applications;
CREATE POLICY "Allow public all supplier_applications" ON public.supplier_applications
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);


-- ==============================================================================
-- 14. SUPPLIER PAYOUTS & COMMISSIONS TABLE
-- Tracks automated commission deductions, supplier net balances, MoMo payout references,
-- payment timestamps, and administrative audit approvals.
-- ==============================================================================
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

CREATE INDEX IF NOT EXISTS idx_payouts_shop_id ON public.supplier_payouts (shop_id);
CREATE INDEX IF NOT EXISTS idx_payouts_order_number ON public.supplier_payouts (order_number);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON public.supplier_payouts (status);

ALTER TABLE public.supplier_payouts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all supplier_payouts" ON public.supplier_payouts;
CREATE POLICY "Allow public all supplier_payouts" ON public.supplier_payouts
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);


-- ==============================================================================
-- 15. INVENTORY AUDIT LOGS TABLE
-- Tracks every inventory adjustment, order stock deduction, return restock,
-- administrative stock override, and quantity changed.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.inventory_logs (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    product_name TEXT,
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

ALTER TABLE public.inventory_logs ADD COLUMN IF NOT EXISTS change_amount INTEGER;
ALTER TABLE public.inventory_logs ADD COLUMN IF NOT EXISTS admin_name TEXT;
ALTER TABLE public.inventory_logs ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_inv_logs_product_id ON public.inventory_logs (product_id);
CREATE INDEX IF NOT EXISTS idx_inv_logs_created_at ON public.inventory_logs (created_at DESC);

ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all inventory_logs" ON public.inventory_logs;
CREATE POLICY "Allow public all inventory_logs" ON public.inventory_logs
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);


-- ==============================================================================
-- 16. ADMINISTRATIVE AUDIT TRAIL TABLE
-- Records every administrative action, product update, role change, and settings edit
-- for accountability and security governance.
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

ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all audit_logs" ON public.audit_logs;
CREATE POLICY "Allow public all audit_logs" ON public.audit_logs
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);


-- ==============================================================================
-- 17. SECURITY SIGN-IN AUDIT TABLE
-- Records login activity, IP addresses, user agents, auth providers, and timestamps.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.sign_ins (
    id TEXT PRIMARY KEY,
    account_id TEXT,
    email TEXT,
    phone TEXT,
    name TEXT,
    role TEXT,
    sign_in_method TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    status TEXT NOT NULL DEFAULT 'success',
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sign_ins_email ON public.sign_ins (email);
CREATE INDEX IF NOT EXISTS idx_sign_ins_timestamp ON public.sign_ins (timestamp DESC);

ALTER TABLE public.sign_ins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all sign_ins" ON public.sign_ins;
CREATE POLICY "Allow public all sign_ins" ON public.sign_ins
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);


-- ==============================================================================
-- 18. DELETED PRODUCT TOMBSTONES TABLE
-- Ensures that when an admin permanently deletes or archives a product, external
-- feeds (CJ Dropshipping, Alibaba, Google Sheets) do not automatically resurrect it.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.deleted_tombstones (
    id TEXT PRIMARY KEY,
    product_name TEXT,
    deleted_by TEXT,
    deleted_at TIMESTAMPTZ DEFAULT NOW(),
    reason TEXT
);

ALTER TABLE public.deleted_tombstones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all deleted_tombstones" ON public.deleted_tombstones;
CREATE POLICY "Allow public all deleted_tombstones" ON public.deleted_tombstones
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);


-- ==============================================================================
-- 19. ENABLE SUPABASE REALTIME REPLICATION
-- Adds core interactive tables to the realtime publication so live orders, chat
-- messages, payment verifications, and stock updates stream to connected clients.
-- ==============================================================================
DO $$
BEGIN
    -- Check if supabase_realtime publication exists before adding tables
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_problems;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_logs;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.app_settings;
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- In some environments or if already added, ignore publication notice
    RAISE NOTICE 'Realtime publication setup notice: %', SQLERRM;
END;
$$;

-- ==============================================================================
-- 20. AUTOMATIC UPDATED_AT TRIGGERS
-- Keeps updated_at timestamps fresh on record modifications.
-- ==============================================================================
DROP TRIGGER IF EXISTS trigger_products_updated_at ON public.products;
CREATE TRIGGER trigger_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_categories_updated_at ON public.categories;
CREATE TRIGGER trigger_categories_updated_at
    BEFORE UPDATE ON public.categories
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_shops_updated_at ON public.shops;
CREATE TRIGGER trigger_shops_updated_at
    BEFORE UPDATE ON public.shops
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_orders_updated_at ON public.orders;
CREATE TRIGGER trigger_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_accounts_updated_at ON public.accounts;
CREATE TRIGGER trigger_accounts_updated_at
    BEFORE UPDATE ON public.accounts
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_app_settings_updated_at ON public.app_settings;
CREATE TRIGGER trigger_app_settings_updated_at
    BEFORE UPDATE ON public.app_settings
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- End of ContactReach Market Supabase Schema Migration Script
-- ==============================================================================
