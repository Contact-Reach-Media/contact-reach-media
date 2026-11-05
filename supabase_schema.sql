-- ==============================================================================
-- ContactReach Market — Supabase Database Orders Schema
-- Project: Contact-Reach-Media's Project (snasyjifdrvbcjekiqyh)
-- ==============================================================================
-- Instructions:
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard/project/snasyjifdrvbcjekiqyh/sql/new
-- 2. Paste this entire script into the SQL Editor.
-- 3. Click "Run" (or Ctrl+Enter).
-- Once created, all checkout data and website orders will automatically sync to this table in real time!
-- ==============================================================================

-- 1. Create the orders table
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY,
    order_number TEXT UNIQUE NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,
    delivery_type TEXT DEFAULT 'delivery',
    delivery_location TEXT,
    delivery_address TEXT,
    delivery_notes TEXT,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal NUMERIC DEFAULT 0,
    delivery_fee NUMERIC DEFAULT 0,
    shipping_cost NUMERIC DEFAULT 0,
    total_amount NUMERIC NOT NULL DEFAULT 0,
    payment_method TEXT,
    payment_status TEXT DEFAULT 'Pending Payment',
    delivery_status TEXT DEFAULT 'Pending',
    status TEXT DEFAULT 'New',
    tracking_number TEXT,
    tracking_token TEXT,
    coupon_code TEXT,
    discount_amount NUMERIC DEFAULT 0,
    supplier_name TEXT,
    shop_name TEXT,
    raw_checkout_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create index on order_number and customer_phone for fast lookups
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders (order_number);
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON public.orders (customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders (created_at DESC);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 4. Set RLS Policies allowing the public publishable API key (anon role) to insert, read, and update orders
DROP POLICY IF EXISTS "Allow public insert orders" ON public.orders;
CREATE POLICY "Allow public insert orders" ON public.orders
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public select orders" ON public.orders;
CREATE POLICY "Allow public select orders" ON public.orders
    FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow public update orders" ON public.orders;
CREATE POLICY "Allow public update orders" ON public.orders
    FOR UPDATE
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 5. Create accounts table (stores all admin, owner, staff, and customer accounts)
CREATE TABLE IF NOT EXISTS public.accounts (
    id TEXT PRIMARY KEY,
    email TEXT,
    phone TEXT,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'buyer', -- 'owner', 'administrator', 'product_manager', 'shop_manager', 'courier', 'buyer'
    auth_provider TEXT NOT NULL DEFAULT 'email', -- 'email', 'google', 'phone', 'supabase'
    status TEXT NOT NULL DEFAULT 'Active',
    last_sign_in_at TIMESTAMPTZ DEFAULT NOW(),
    sign_in_count INTEGER DEFAULT 1,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast account retrieval
CREATE INDEX IF NOT EXISTS idx_accounts_email ON public.accounts (email);
CREATE INDEX IF NOT EXISTS idx_accounts_phone ON public.accounts (phone);
CREATE INDEX IF NOT EXISTS idx_accounts_role ON public.accounts (role);

-- Enable RLS for accounts
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public all accounts" ON public.accounts;
CREATE POLICY "Allow public all accounts" ON public.accounts
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 6. Create sign_ins table (audit history of every sign-in across all methods)
CREATE TABLE IF NOT EXISTS public.sign_ins (
    id TEXT PRIMARY KEY,
    account_id TEXT,
    email TEXT,
    phone TEXT,
    name TEXT,
    role TEXT,
    sign_in_method TEXT NOT NULL, -- 'email_password', 'google', 'phone', 'supabase'
    ip_address TEXT,
    user_agent TEXT,
    status TEXT NOT NULL DEFAULT 'success',
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    details JSONB DEFAULT '{}'::jsonb
);

-- Indexes for sign_in audit logs
CREATE INDEX IF NOT EXISTS idx_sign_ins_account_id ON public.sign_ins (account_id);
CREATE INDEX IF NOT EXISTS idx_sign_ins_email ON public.sign_ins (email);
CREATE INDEX IF NOT EXISTS idx_sign_ins_timestamp ON public.sign_ins (timestamp DESC);

-- Enable RLS for sign_ins
ALTER TABLE public.sign_ins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public all sign_ins" ON public.sign_ins;
CREATE POLICY "Allow public all sign_ins" ON public.sign_ins
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- Done! Your Supabase database is now 100% configured for orders, accounts, and sign-ins!
