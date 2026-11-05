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

-- Done! Your Supabase database is now 100% ready to receive all checkout orders!
