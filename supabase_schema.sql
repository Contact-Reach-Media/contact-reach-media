-- ==============================================================================
-- ContactReach Market: Complete Production Supabase Schema, Relationships & RLS
-- Project Name: contactreachmarket
-- Project ID: enmxlqdouiqnqfhmmzha
-- Project URL: https://enmxlqdouiqnqfhmmzha.supabase.co
-- ==============================================================================
-- Safe, idempotent, and non-destructive SQL script:
--   - Preserves all existing tables and data (CREATE IF NOT EXISTS + ADD COLUMN IF NOT EXISTS)
--   - Creates all tables, foreign key relationships, indexes, RLS policies, triggers & Realtime
--   - Inserts NO demo products or sample records (only required system/owner config)
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Helper function to automatically maintain updated_at timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 1. SYSTEM OWNER, STAFF ROLES, ADMIN INVITATIONS & CREDENTIALS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.admin_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.admin_users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID,
  profile_id UUID,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL DEFAULT 'Ruth (System Owner)',
  phone TEXT DEFAULT '0780022600',
  role TEXT NOT NULL DEFAULT 'owner',
  permissions TEXT[] DEFAULT ARRAY['all'],
  active BOOLEAN NOT NULL DEFAULT true,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.admin_users ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.admin_users ADD COLUMN IF NOT EXISTS profile_id UUID;
ALTER TABLE public.admin_users ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '0780022600';
ALTER TABLE public.admin_users ADD COLUMN IF NOT EXISTS permissions TEXT[] DEFAULT ARRAY['all'];
ALTER TABLE public.admin_users ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
ALTER TABLE public.admin_users ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;
ALTER TABLE public.admin_users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE OR REPLACE FUNCTION public.enforce_authorized_admin_email()
RETURNS TRIGGER AS $$
BEGIN
  IF LOWER(TRIM(NEW.role)) = 'owner' AND LOWER(TRIM(NEW.email)) != 'contactreachmedialimited@gmail.com' THEN
    RAISE EXCEPTION 'Security violation: Only contactreachmedialimited@gmail.com is authorized as system owner.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_enforce_admin_email ON public.admin_users;
CREATE TRIGGER trigger_enforce_admin_email
  BEFORE INSERT OR UPDATE ON public.admin_users
  FOR EACH ROW EXECUTE FUNCTION public.enforce_authorized_admin_email();

CREATE TABLE IF NOT EXISTS public.staff_accounts (
  user_id UUID PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('owner','administrator','product_manager','shop_manager','order_manager','customer_support')),
  full_name TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.admin_invitations (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'administrator',
  status TEXT NOT NULL DEFAULT 'pending',
  token_hash TEXT NOT NULL,
  verification_code_hash TEXT,
  invite_url TEXT,
  created_by_id TEXT,
  created_by_name TEXT,
  created_by_email TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  accepted_user_id TEXT,
  accepted_username TEXT,
  revoked_at TIMESTAMPTZ,
  revoked_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.admin_credentials (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  invitation_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Strict owner / authorized staff helper
CREATE OR REPLACE FUNCTION public.is_staff(roles TEXT[] DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = auth.uid()
      AND LOWER(TRIM(u.email)) = 'contactreachmedialimited@gmail.com'
  ) OR EXISTS (
    SELECT 1 FROM auth.users u
    JOIN public.staff_accounts s ON s.user_id = u.id
    WHERE u.id = auth.uid()
      AND LOWER(TRIM(u.email)) = 'contactreachmedialimited@gmail.com'
      AND s.active
      AND (roles IS NULL OR s.role = ANY(roles))
  );
$$;

-- ==============================================================================
-- 2. PROFILES, USERS, CUSTOMERS & ACCOUNTS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY,
  user_id UUID,
  full_name TEXT,
  email TEXT UNIQUE,
  phone TEXT UNIQUE,
  role TEXT NOT NULL DEFAULT 'buyer',
  avatar_url TEXT,
  delivery_address TEXT,
  city TEXT DEFAULT 'Kigali',
  country TEXT DEFAULT 'Rwanda',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL DEFAULT 'Customer',
  email TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'customer',
  default_address TEXT,
  city TEXT DEFAULT 'Kigali',
  country TEXT DEFAULT 'Rwanda',
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.customers (
  id TEXT PRIMARY KEY,
  email TEXT,
  phone TEXT,
  name TEXT NOT NULL DEFAULT 'Customer',
  role TEXT NOT NULL DEFAULT 'customer',
  delivery_address TEXT,
  default_address TEXT,
  city TEXT DEFAULT 'Kigali',
  country TEXT DEFAULT 'Rwanda',
  total_orders INTEGER NOT NULL DEFAULT 0,
  total_spent NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  status TEXT DEFAULT 'Active',
  is_registered_buyer BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

-- ==============================================================================
-- 3. CATEGORIES, SHOPS, PRODUCTS & INVENTORY
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
  active BOOLEAN DEFAULT true,
  item_count INTEGER DEFAULT 0,
  keywords JSONB DEFAULT '[]'::jsonb,
  subcategories JSONB DEFAULT '[]'::jsonb,
  subcategories_list JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS name_fr TEXT;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS item_count INTEGER DEFAULT 0;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS keywords JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS subcategories_list JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.shops (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_rw TEXT,
  category TEXT DEFAULT 'all',
  owner_user UUID,
  commission_pct NUMERIC(5,2) NOT NULL DEFAULT 10 CHECK (commission_pct BETWEEN 0 AND 100),
  commission_rate NUMERIC DEFAULT 10,
  phone TEXT,
  email TEXT,
  tin_number TEXT,
  contact_person TEXT,
  payout_method TEXT DEFAULT 'MTN Mobile Money',
  payout_account TEXT,
  payout_receiver_name TEXT,
  location TEXT DEFAULT 'Kigali, Rwanda',
  address TEXT,
  logo TEXT DEFAULT 'ShoppingBag',
  logo_url TEXT,
  banner_color TEXT DEFAULT 'from-orange-500 to-amber-600',
  banner_url TEXT,
  rating REAL DEFAULT 5.0,
  total_sales NUMERIC DEFAULT 0,
  total_payouts_paid NUMERIC DEFAULT 0,
  pending_payout NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'Active',
  is_verified BOOLEAN DEFAULT false,
  is_recommended BOOLEAN DEFAULT false,
  followers_count INTEGER DEFAULT 0,
  description TEXT,
  delivery_info TEXT,
  categories JSONB DEFAULT '[]'::jsonb,
  owner_name TEXT,
  is_active BOOLEAN DEFAULT true,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS name_rw TEXT;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS tin_number TEXT;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS contact_person TEXT;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS commission_rate NUMERIC DEFAULT 10;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS payout_method TEXT DEFAULT 'MTN Mobile Money';
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS payout_account TEXT;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS payout_receiver_name TEXT;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS banner_url TEXT;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS rating REAL DEFAULT 5.0;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS delivery_info TEXT;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS categories JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS owner_name TEXT;

CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  sku TEXT,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'clothing',
  subcategory TEXT,
  main_category_id TEXT,
  sub_category_id TEXT,
  category_name TEXT,
  sub_category_name TEXT,
  category_id TEXT,
  shop_id TEXT,
  shop_name TEXT DEFAULT 'ContactReach Market',
  price NUMERIC NOT NULL DEFAULT 0,
  price_rwf NUMERIC DEFAULT 0,
  cost_price NUMERIC,
  cost_overridden_by_admin BOOLEAN DEFAULT false,
  commission_rate NUMERIC(5,2) DEFAULT 10,
  profit_margin NUMERIC DEFAULT 0,
  discount_percent NUMERIC(5,2) DEFAULT 0,
  discount_pct NUMERIC(5,2) DEFAULT 0,
  discount_price NUMERIC,
  promo_start_date TIMESTAMPTZ,
  promo_end_date TIMESTAMPTZ,
  stock INTEGER NOT NULL DEFAULT 0,
  stock_quantity INTEGER DEFAULT 0,
  image_url TEXT DEFAULT '',
  images JSONB DEFAULT '[]'::jsonb,
  video_url TEXT,
  youtube_url TEXT,
  receiver_name TEXT,
  receiver_phone TEXT,
  payment_methods JSONB DEFAULT '[]'::jsonb,
  merchant_code TEXT,
  location TEXT DEFAULT 'Kigali, Rwanda',
  delivery_info TEXT,
  status TEXT NOT NULL DEFAULT 'Available',
  is_featured BOOLEAN DEFAULT false,
  featured BOOLEAN DEFAULT false,
  is_new_arrival BOOLEAN DEFAULT false,
  is_new BOOLEAN DEFAULT false,
  is_best_seller BOOLEAN DEFAULT false,
  brand TEXT,
  unit TEXT DEFAULT 'Piece',
  shipping_cost NUMERIC DEFAULT 0,
  specifications TEXT,
  storage TEXT,
  packaging_info TEXT,
  min_order_quantity INTEGER NOT NULL DEFAULT 1,
  attributes JSONB DEFAULT '[]'::jsonb,
  variations JSONB DEFAULT '[]'::jsonb,
  rating NUMERIC(3,2) DEFAULT 5.0,
  reviews_count INTEGER DEFAULT 0,
  source TEXT DEFAULT 'local',
  review_status TEXT DEFAULT 'Approved',
  cj_product_id TEXT,
  cj_product_sku TEXT,
  cj_original_cost_usd NUMERIC,
  cj_last_sync_at TIMESTAMPTZ,
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
  visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Safe column additions if products table already existed from an earlier minimal schema
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS min_order_quantity INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS promo_start_date TIMESTAMPTZ;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS promo_end_date TIMESTAMPTZ;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cj_product_sku TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cj_original_cost_usd NUMERIC;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cj_last_sync_at TIMESTAMPTZ;
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

CREATE TABLE IF NOT EXISTS public.inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id TEXT,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  reserved_quantity INTEGER NOT NULL DEFAULT 0,
  available_quantity INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER NOT NULL DEFAULT 5,
  location TEXT DEFAULT 'Kigali Main Warehouse',
  last_restocked_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.inventory_logs (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  product_name TEXT,
  transaction_type TEXT DEFAULT 'adjustment',
  previous_stock INTEGER,
  new_stock INTEGER,
  change_amount INTEGER DEFAULT 0,
  quantity_changed INTEGER DEFAULT 0,
  reason TEXT NOT NULL,
  performed_by TEXT,
  admin_name TEXT,
  order_id text,
  actor UUID,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.inventory_logs ADD COLUMN IF NOT EXISTS transaction_type TEXT DEFAULT 'adjustment';

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

-- ==============================================================================
-- 4. COUPONS, PROMO CODES & DELIVERY ZONES
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
  times_used INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS max_discount_amount NUMERIC;

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

CREATE TABLE IF NOT EXISTS public.promo_code_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  promo_code_id TEXT,
  code TEXT NOT NULL,
  order_id TEXT,
  customer_id TEXT,
  discount_applied NUMERIC NOT NULL DEFAULT 0,
  used_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.delivery_zones (
  name TEXT PRIMARY KEY,
  fee_rwf INTEGER NOT NULL CHECK (fee_rwf >= 0),
  eta TEXT,
  active BOOLEAN DEFAULT true
);

-- ==============================================================================
-- 5. ORDERS, ORDER ITEMS & DELIVERIES
-- ==============================================================================
CREATE SEQUENCE IF NOT EXISTS public.order_no_seq START 1000;

CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL,
  user_id TEXT,
  tracking_token TEXT,
  tracking_number TEXT,
  tracking_carrier TEXT,
  tracking_url TEXT,
  tracking_added_at TIMESTAMPTZ,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  delivery_type TEXT DEFAULT 'delivery',
  delivery_location TEXT DEFAULT 'Kigali',
  delivery_address TEXT DEFAULT 'Kigali, Rwanda',
  delivery_notes TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  delivery_fee NUMERIC NOT NULL DEFAULT 0,
  shipping_cost NUMERIC NOT NULL DEFAULT 0,
  discount_amount NUMERIC NOT NULL DEFAULT 0,
  coupon_code TEXT,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  commission_rate NUMERIC(5,2) DEFAULT 10,
  commission_earned NUMERIC DEFAULT 0,
  supplier_payout_amount NUMERIC DEFAULT 0,
  supplier_payout_status TEXT DEFAULT 'Pending',
  supplier_fulfillment_status TEXT DEFAULT 'Pending',
  supplier_payout_ref TEXT,
  payment_method TEXT NOT NULL DEFAULT 'MTN Mobile Money',
  receiver_name TEXT DEFAULT 'Ruth',
  receiver_details TEXT DEFAULT '0780022600',
  shop_name TEXT,
  payment_status TEXT NOT NULL DEFAULT 'Pending Payment',
  status TEXT NOT NULL DEFAULT 'New',
  delivery_status TEXT DEFAULT 'Pending',
  expected_delivery_date TEXT,
  supplier_name TEXT,
  supplier_order_ref TEXT,
  dispatch_date TIMESTAMPTZ,
  stock_deducted BOOLEAN DEFAULT false,
  assigned_courier TEXT,
  courier_phone TEXT,
  internal_notes TEXT,
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
  product_snapshots JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS product_snapshots JSONB DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS public.order_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  order_id TEXT NOT NULL,
  product_id TEXT,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  line_total NUMERIC DEFAULT 0,
  variation JSONB DEFAULT '{}'::jsonb,
  sku TEXT,
  brand TEXT,
  image_url TEXT,
  images JSONB DEFAULT '[]'::jsonb,
  description TEXT,
  original_price NUMERIC DEFAULT 0,
  discount_percent NUMERIC DEFAULT 0,
  discount_price NUMERIC,
  discount_amount NUMERIC DEFAULT 0,
  min_order_quantity INTEGER DEFAULT 1,
  shipping_cost NUMERIC DEFAULT 0,
  selected_size TEXT,
  selected_color TEXT,
  selected_storage TEXT,
  available_sizes JSONB DEFAULT '[]'::jsonb,
  available_colors JSONB DEFAULT '[]'::jsonb,
  storage TEXT,
  category TEXT,
  subcategory TEXT,
  shop_id TEXT,
  shop_name TEXT,
  unit TEXT DEFAULT 'Piece',
  product_snapshot JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS line_total NUMERIC DEFAULT 0;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS sku TEXT;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS original_price NUMERIC DEFAULT 0;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS discount_percent NUMERIC DEFAULT 0;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS discount_price NUMERIC;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS min_order_quantity INTEGER DEFAULT 1;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC DEFAULT 0;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS selected_size TEXT;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS selected_color TEXT;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS selected_storage TEXT;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS available_sizes JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS available_colors JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS storage TEXT;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS subcategory TEXT;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS shop_id TEXT;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS shop_name TEXT;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'Piece';
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS product_snapshot JSONB DEFAULT '{}'::jsonb;

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

-- ==============================================================================
-- 6. PAYMENTS, PAYMENT TRANSACTIONS & SMS NOTIFICATIONS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.payments (
  id TEXT PRIMARY KEY,
  order_id TEXT,
  order_number TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  payment_phone TEXT,
  sender_phone TEXT,
  sender_name TEXT,
  amount NUMERIC DEFAULT 0,
  amount_paid NUMERIC DEFAULT 0,
  payment_method TEXT DEFAULT 'MTN Mobile Money',
  transaction_id TEXT,
  payment_proof_url TEXT,
  screenshot_url TEXT,
  confirmation_message TEXT,
  verification_status TEXT DEFAULT 'Pending Verification',
  verified_at TIMESTAMPTZ,
  verified_by TEXT,
  notes TEXT,
  admin_notes TEXT,
  flagged_suspicious BOOLEAN DEFAULT false,
  is_duplicate_txn BOOLEAN DEFAULT false,
  duplicate_order_numbers JSONB DEFAULT '[]'::jsonb,
  suspicious_reason TEXT,
  verified_directly BOOLEAN DEFAULT false,
  telecom_verified BOOLEAN DEFAULT false,
  telecom_reference TEXT,
  customer_notified BOOLEAN DEFAULT false,
  notification_message TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS order_id TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS order_number TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS payment_phone TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS sender_phone TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS sender_name TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS amount NUMERIC DEFAULT 0;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS amount_paid NUMERIC DEFAULT 0;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'MTN Mobile Money';
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS transaction_id TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS payment_proof_url TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS screenshot_url TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS confirmation_message TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'Pending Verification';
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS verified_by TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS customer_notified BOOLEAN DEFAULT false;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS notification_message TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS flagged_suspicious BOOLEAN DEFAULT false;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS is_duplicate_txn BOOLEAN DEFAULT false;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS duplicate_order_numbers JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS suspicious_reason TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS verified_directly BOOLEAN DEFAULT false;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS telecom_verified BOOLEAN DEFAULT false;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS telecom_reference TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

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

ALTER TABLE public.payment_verifications ADD COLUMN IF NOT EXISTS payment_id TEXT;
ALTER TABLE public.payment_verifications ADD COLUMN IF NOT EXISTS verification_method TEXT DEFAULT 'manual';
ALTER TABLE public.payment_verifications ADD COLUMN IF NOT EXISTS telecom_reference TEXT;
ALTER TABLE public.payment_verifications ADD COLUMN IF NOT EXISTS amount_verified NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.payment_verifications ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Verified';
ALTER TABLE public.payment_verifications ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.payment_verifications ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id TEXT PRIMARY KEY,
  order_id TEXT,
  order_number TEXT,
  idempotency_key TEXT UNIQUE,
  payment_method TEXT NOT NULL DEFAULT 'MTN Mobile Money',
  provider TEXT NOT NULL DEFAULT 'MTN Mobile Money',
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'RWF',
  customer_phone TEXT,
  customer_email TEXT,
  checkout_url TEXT,
  status TEXT NOT NULL DEFAULT 'Pending',
  provider_transaction_id TEXT,
  financial_transaction_id TEXT,
  failure_reason TEXT,
  verified_directly BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  telecom_status TEXT,
  signature_verified BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.payment_transactions ADD COLUMN IF NOT EXISTS order_id TEXT;
ALTER TABLE public.payment_transactions ADD COLUMN IF NOT EXISTS order_number TEXT;
ALTER TABLE public.payment_transactions ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
ALTER TABLE public.payment_transactions ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'MTN Mobile Money';
ALTER TABLE public.payment_transactions ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'MTN Mobile Money';
ALTER TABLE public.payment_transactions ADD COLUMN IF NOT EXISTS amount NUMERIC DEFAULT 0;
ALTER TABLE public.payment_transactions ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'RWF';
ALTER TABLE public.payment_transactions ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE public.payment_transactions ADD COLUMN IF NOT EXISTS customer_email TEXT;
ALTER TABLE public.payment_transactions ADD COLUMN IF NOT EXISTS checkout_url TEXT;
ALTER TABLE public.payment_transactions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Pending';
ALTER TABLE public.payment_transactions ADD COLUMN IF NOT EXISTS provider_transaction_id TEXT;
ALTER TABLE public.payment_transactions ADD COLUMN IF NOT EXISTS financial_transaction_id TEXT;
ALTER TABLE public.payment_transactions ADD COLUMN IF NOT EXISTS failure_reason TEXT;
ALTER TABLE public.payment_transactions ADD COLUMN IF NOT EXISTS verified_directly BOOLEAN DEFAULT false;
ALTER TABLE public.payment_transactions ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE public.payment_transactions ADD COLUMN IF NOT EXISTS telecom_status TEXT;
ALTER TABLE public.payment_transactions ADD COLUMN IF NOT EXISTS signature_verified BOOLEAN DEFAULT false;
ALTER TABLE public.payment_transactions ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.payment_transactions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.payment_transactions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.sms_notifications (
  id TEXT PRIMARY KEY,
  direction TEXT NOT NULL DEFAULT 'incoming' CHECK (direction IN ('incoming','outbound','outgoing')),
  sender_phone TEXT NOT NULL DEFAULT '',
  sender_name TEXT,
  recipient_phone TEXT DEFAULT '',
  provider TEXT DEFAULT 'MTN Mobile Money',
  message TEXT NOT NULL,
  parsed_transaction_id TEXT,
  parsed_amount NUMERIC,
  order_number TEXT,
  payment_id TEXT,
  status TEXT NOT NULL DEFAULT 'received',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.sms_notifications ADD COLUMN IF NOT EXISTS direction TEXT DEFAULT 'incoming';
ALTER TABLE public.sms_notifications ADD COLUMN IF NOT EXISTS sender_phone TEXT DEFAULT '';
ALTER TABLE public.sms_notifications ADD COLUMN IF NOT EXISTS sender_name TEXT;
ALTER TABLE public.sms_notifications ADD COLUMN IF NOT EXISTS recipient_phone TEXT DEFAULT '';
ALTER TABLE public.sms_notifications ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'MTN Mobile Money';
ALTER TABLE public.sms_notifications ADD COLUMN IF NOT EXISTS parsed_transaction_id TEXT;
ALTER TABLE public.sms_notifications ADD COLUMN IF NOT EXISTS parsed_amount NUMERIC;
ALTER TABLE public.sms_notifications ADD COLUMN IF NOT EXISTS order_number TEXT;
ALTER TABLE public.sms_notifications ADD COLUMN IF NOT EXISTS payment_id TEXT;
ALTER TABLE public.sms_notifications ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'received';
ALTER TABLE public.sms_notifications ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.sms_notifications ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.sms_notifications DROP CONSTRAINT IF EXISTS sms_notifications_direction_check;
ALTER TABLE public.sms_notifications ADD CONSTRAINT sms_notifications_direction_check CHECK (direction IN ('incoming','outbound','outgoing'));

-- ==============================================================================
-- 7. CHAT CONVERSATIONS, MESSAGES & ADMIN NOTIFICATIONS
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

CREATE TABLE IF NOT EXISTS public.messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT,
  customer_id TEXT,
  name TEXT,
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
  replied_by TEXT,
  sender TEXT DEFAULT 'customer',
  is_read_by_customer BOOLEAN DEFAULT true,
  is_read_by_admin BOOLEAN DEFAULT false,
  notification_type TEXT DEFAULT 'chat',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS conversation_id TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS replied_by TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

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

CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL DEFAULT 'system',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  sender_name TEXT,
  sender_phone TEXT,
  sender_email TEXT,
  order_number TEXT,
  customer_id TEXT,
  action_tab text,
  entity_id TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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

-- ==============================================================================
-- 8. CUSTOMER PROBLEMS, ISSUES & REPORTS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.customer_problems (
  id TEXT PRIMARY KEY,
  case_number TEXT UNIQUE,
  order_number TEXT,
  customer_id TEXT,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  category TEXT NOT NULL DEFAULT 'delivery_delay',
  issue_type TEXT,
  description TEXT NOT NULL,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'New',
  assigned_to TEXT,
  admin_notes TEXT,
  private_notes JSONB DEFAULT '[]'::jsonb,
  resolution TEXT,
  resolved_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.customer_problems ADD COLUMN IF NOT EXISTS customer_id TEXT;
ALTER TABLE public.customer_problems ADD COLUMN IF NOT EXISTS private_notes JSONB DEFAULT '[]'::jsonb;

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

-- ==============================================================================
-- 9. SUPPLIERS, PAYOUTS & FULFILLMENT
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
  status TEXT DEFAULT 'Pending',
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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

-- ==============================================================================
-- 10. SETTINGS, REVIEWS, TOMBSTONES & AUDIT LOGS
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

CREATE TABLE IF NOT EXISTS public.website_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS public.store_settings (
  id TEXT PRIMARY KEY DEFAULT 'global',
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.reviews (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  rating NUMERIC NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL DEFAULT '',
  verified_purchase BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'approved',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.deleted_tombstones (
  id TEXT PRIMARY KEY,
  product_name TEXT,
  deleted_by TEXT,
  deleted_at TIMESTAMPTZ DEFAULT NOW(),
  reason TEXT
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  actor UUID,
  admin_name TEXT,
  admin_role TEXT,
  action TEXT NOT NULL,
  details TEXT,
  entity TEXT,
  entity_type TEXT,
  entity_id text,
  detail JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 11. RELATIONSHIPS (SAFE FOREIGN KEY CONSTRAINTS)
-- ==============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_admin_users_auth_user') THEN
    BEGIN
      ALTER TABLE public.admin_users
        ADD CONSTRAINT fk_admin_users_auth_user
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_staff_accounts_auth_user') THEN
    BEGIN
      ALTER TABLE public.staff_accounts
        ADD CONSTRAINT fk_staff_accounts_auth_user
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_profiles_auth_user') THEN
    BEGIN
      ALTER TABLE public.profiles
        ADD CONSTRAINT fk_profiles_auth_user
        FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_categories_parent') THEN
    BEGIN
      ALTER TABLE public.categories
        ADD CONSTRAINT fk_categories_parent
        FOREIGN KEY (parent_id) REFERENCES public.categories(id) ON DELETE SET NULL NOT VALID;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_shops_owner_user') THEN
    BEGIN
      ALTER TABLE public.shops
        ADD CONSTRAINT fk_shops_owner_user
        FOREIGN KEY (owner_user) REFERENCES auth.users(id) ON DELETE SET NULL NOT VALID;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_products_shop') THEN
    BEGIN
      ALTER TABLE public.products
        ADD CONSTRAINT fk_products_shop
        FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE SET NULL NOT VALID;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_inventory_product') THEN
    BEGIN
      ALTER TABLE public.inventory
        ADD CONSTRAINT fk_inventory_product
        FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE NOT VALID;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_inventory_logs_product') THEN
    BEGIN
      ALTER TABLE public.inventory_logs
        ADD CONSTRAINT fk_inventory_logs_product
        FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL NOT VALID;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_order_items_order') THEN
    BEGIN
      ALTER TABLE public.order_items
        ADD CONSTRAINT fk_order_items_order
        FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE NOT VALID;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_order_items_product') THEN
    BEGIN
      ALTER TABLE public.order_items
        ADD CONSTRAINT fk_order_items_product
        FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL NOT VALID;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_deliveries_order') THEN
    BEGIN
      ALTER TABLE public.deliveries
        ADD CONSTRAINT fk_deliveries_order
        FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE NOT VALID;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_payments_order') THEN
    BEGIN
      ALTER TABLE public.payments
        ADD CONSTRAINT fk_payments_order
        FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL NOT VALID;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_payment_verifications_payment') THEN
    BEGIN
      ALTER TABLE public.payment_verifications
        ADD CONSTRAINT fk_payment_verifications_payment
        FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON DELETE CASCADE NOT VALID;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_payment_transactions_order') THEN
    BEGIN
      ALTER TABLE public.payment_transactions
        ADD CONSTRAINT fk_payment_transactions_order
        FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL NOT VALID;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_supplier_payouts_shop') THEN
    BEGIN
      ALTER TABLE public.supplier_payouts
        ADD CONSTRAINT fk_supplier_payouts_shop
        FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE SET NULL NOT VALID;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_supplier_payouts_order') THEN
    BEGIN
      ALTER TABLE public.supplier_payouts
        ADD CONSTRAINT fk_supplier_payouts_order
        FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL NOT VALID;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_supplier_products_product') THEN
    BEGIN
      ALTER TABLE public.supplier_products
        ADD CONSTRAINT fk_supplier_products_product
        FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE NOT VALID;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_reviews_product') THEN
    BEGIN
      ALTER TABLE public.reviews
        ADD CONSTRAINT fk_reviews_product
        FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE NOT VALID;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;
END $$;

-- ==============================================================================
-- 12. PERFORMANCE & LOOKUP INDEXES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS admin_invitations_token_idx ON public.admin_invitations(token_hash);
CREATE INDEX IF NOT EXISTS admin_invitations_status_idx ON public.admin_invitations(status);
CREATE INDEX IF NOT EXISTS users_phone_idx ON public.users(phone);
CREATE INDEX IF NOT EXISTS users_email_idx ON public.users(LOWER(email));
CREATE INDEX IF NOT EXISTS customers_phone_idx ON public.customers(phone);
CREATE INDEX IF NOT EXISTS customers_email_idx ON public.customers(LOWER(email));
CREATE INDEX IF NOT EXISTS categories_parent_idx ON public.categories(parent_id);
CREATE INDEX IF NOT EXISTS categories_slug_idx ON public.categories(slug);
CREATE INDEX IF NOT EXISTS categories_sort_idx ON public.categories(sort_order);
CREATE INDEX IF NOT EXISTS shops_name_idx ON public.shops(LOWER(name));
CREATE INDEX IF NOT EXISTS shops_status_idx ON public.shops(status);
CREATE INDEX IF NOT EXISTS products_cat_idx ON public.products(category);
CREATE INDEX IF NOT EXISTS products_main_cat_idx ON public.products(main_category_id);
CREATE INDEX IF NOT EXISTS products_sub_cat_idx ON public.products(sub_category_id);
CREATE INDEX IF NOT EXISTS products_shop_idx ON public.products(shop_id);
CREATE INDEX IF NOT EXISTS products_sku_idx ON public.products(sku);
CREATE INDEX IF NOT EXISTS products_status_idx ON public.products(status);
CREATE INDEX IF NOT EXISTS products_created_idx ON public.products(created_at DESC);
CREATE INDEX IF NOT EXISTS products_name_idx ON public.products USING GIN (to_tsvector('simple', name));
CREATE INDEX IF NOT EXISTS inventory_logs_product_idx ON public.inventory_logs(product_id);
CREATE INDEX IF NOT EXISTS orders_number_idx ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS orders_user_id_idx ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS orders_phone_idx ON public.orders(customer_phone);
CREATE INDEX IF NOT EXISTS orders_status_idx ON public.orders(status);
CREATE INDEX IF NOT EXISTS orders_created_idx ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS order_items_order_idx ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS order_items_product_idx ON public.order_items(product_id);
CREATE INDEX IF NOT EXISTS payments_order_id_idx ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS payments_order_number_idx ON public.payments(order_number);
CREATE INDEX IF NOT EXISTS payments_status_idx ON public.payments(verification_status);
CREATE INDEX IF NOT EXISTS payments_created_idx ON public.payments(created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS payments_verified_txn_uq
  ON public.payments(LOWER(transaction_id))
  WHERE verification_status IN ('Verified/Paid', 'Approved', 'verified') AND transaction_id IS NOT NULL AND transaction_id != '';
CREATE INDEX IF NOT EXISTS payment_txns_order_id_idx ON public.payment_transactions(order_id);
CREATE INDEX IF NOT EXISTS payment_txns_order_number_idx ON public.payment_transactions(order_number);
CREATE INDEX IF NOT EXISTS payment_txns_status_idx ON public.payment_transactions(status);
CREATE INDEX IF NOT EXISTS payment_txns_created_idx ON public.payment_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS sms_notifications_order_idx ON public.sms_notifications(order_number);
CREATE INDEX IF NOT EXISTS sms_notifications_phone_idx ON public.sms_notifications(sender_phone);
CREATE INDEX IF NOT EXISTS sms_notifications_created_idx ON public.sms_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS messages_customer_id_idx ON public.messages(customer_id);
CREATE INDEX IF NOT EXISTS messages_phone_idx ON public.messages(phone);
CREATE INDEX IF NOT EXISTS messages_sender_idx ON public.messages(sender);
CREATE INDEX IF NOT EXISTS messages_created_idx ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS admin_notifications_read_idx ON public.admin_notifications(is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS customer_problems_case_idx ON public.customer_problems(case_number);
CREATE INDEX IF NOT EXISTS customer_problems_order_idx ON public.customer_problems(order_number);
CREATE INDEX IF NOT EXISTS customer_problems_phone_idx ON public.customer_problems(customer_phone);
CREATE INDEX IF NOT EXISTS reviews_product_idx ON public.reviews(product_id);
CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON public.audit_logs(created_at DESC);

-- ==============================================================================
-- 13. ROW LEVEL SECURITY (RLS) & POLICIES
-- ==============================================================================
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_code_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fulfillment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deleted_tombstones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Owner / Staff Authorization Policies
DROP POLICY IF EXISTS "Allow public all admin_roles" ON public.admin_roles;
CREATE POLICY "Allow public all admin_roles" ON public.admin_roles FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "only owner can read admin_users" ON public.admin_users;
CREATE POLICY "only owner can read admin_users" ON public.admin_users FOR SELECT
  TO anon, authenticated
  USING (public.is_staff(ARRAY['owner']) OR LOWER(TRIM(email)) = 'contactreachmedialimited@gmail.com');

DROP POLICY IF EXISTS "only owner can manage admin_users" ON public.admin_users;
DROP POLICY IF EXISTS "Allow public all admin_users" ON public.admin_users;
CREATE POLICY "only owner can manage admin_users" ON public.admin_users FOR ALL
  TO anon, authenticated
  USING (public.is_staff(ARRAY['owner']) OR LOWER(TRIM(email)) = 'contactreachmedialimited@gmail.com')
  WITH CHECK (LOWER(TRIM(email)) = 'contactreachmedialimited@gmail.com');

DROP POLICY IF EXISTS "staff read staff" ON public.staff_accounts;
CREATE POLICY "staff read staff" ON public.staff_accounts FOR SELECT TO authenticated USING (public.is_staff());

DROP POLICY IF EXISTS "owner manages staff" ON public.staff_accounts;
CREATE POLICY "owner manages staff" ON public.staff_accounts FOR ALL TO authenticated USING (public.is_staff(ARRAY['owner'])) WITH CHECK (public.is_staff(ARRAY['owner']));

DROP POLICY IF EXISTS "owner manages admin_invitations" ON public.admin_invitations;
CREATE POLICY "owner manages admin_invitations" ON public.admin_invitations FOR ALL TO authenticated USING (public.is_staff(ARRAY['owner','administrator'])) WITH CHECK (public.is_staff(ARRAY['owner','administrator']));

DROP POLICY IF EXISTS "owner manages admin_credentials" ON public.admin_credentials;
CREATE POLICY "owner manages admin_credentials" ON public.admin_credentials FOR ALL TO authenticated USING (public.is_staff(ARRAY['owner'])) WITH CHECK (public.is_staff(ARRAY['owner']));

-- Profiles & Customer Accounts
DROP POLICY IF EXISTS "own profile" ON public.profiles;
CREATE POLICY "own profile" ON public.profiles FOR ALL TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "staff read profiles" ON public.profiles;
CREATE POLICY "staff read profiles" ON public.profiles FOR SELECT TO authenticated USING (public.is_staff());

DROP POLICY IF EXISTS "Allow public all users" ON public.users;
CREATE POLICY "Allow public all users" ON public.users FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all customers" ON public.customers;
CREATE POLICY "Allow public all customers" ON public.customers FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all accounts" ON public.accounts;
CREATE POLICY "Allow public all accounts" ON public.accounts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Catalog, Inventory & Storefront Operational Policies (Compatible with sb_publishable_* & Auth)
DROP POLICY IF EXISTS "Allow public all categories" ON public.categories;
CREATE POLICY "Allow public all categories" ON public.categories FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all shops" ON public.shops;
CREATE POLICY "Allow public all shops" ON public.shops FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all products" ON public.products;
CREATE POLICY "Allow public all products" ON public.products FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all inventory" ON public.inventory;
CREATE POLICY "Allow public all inventory" ON public.inventory FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all inventory_logs" ON public.inventory_logs;
CREATE POLICY "Allow public all inventory_logs" ON public.inventory_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all inventory_transactions" ON public.inventory_transactions;
CREATE POLICY "Allow public all inventory_transactions" ON public.inventory_transactions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all coupons" ON public.coupons;
CREATE POLICY "Allow public all coupons" ON public.coupons FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all promo_codes" ON public.promo_codes;
CREATE POLICY "Allow public all promo_codes" ON public.promo_codes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all promo_code_usage" ON public.promo_code_usage;
CREATE POLICY "Allow public all promo_code_usage" ON public.promo_code_usage FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public zones" ON public.delivery_zones;
CREATE POLICY "public zones" ON public.delivery_zones FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "staff zones" ON public.delivery_zones;
CREATE POLICY "staff zones" ON public.delivery_zones FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all orders" ON public.orders;
CREATE POLICY "Allow public all orders" ON public.orders FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all order_items" ON public.order_items;
CREATE POLICY "Allow public all order_items" ON public.order_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all deliveries" ON public.deliveries;
CREATE POLICY "Allow public all deliveries" ON public.deliveries FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all payments" ON public.payments;
CREATE POLICY "Allow public all payments" ON public.payments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all payment_verifications" ON public.payment_verifications;
CREATE POLICY "Allow public all payment_verifications" ON public.payment_verifications FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all payment_transactions" ON public.payment_transactions;
CREATE POLICY "Allow public all payment_transactions" ON public.payment_transactions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all sms_notifications" ON public.sms_notifications;
CREATE POLICY "Allow public all sms_notifications" ON public.sms_notifications FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all conversations" ON public.conversations;
CREATE POLICY "Allow public all conversations" ON public.conversations FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all messages" ON public.messages;
CREATE POLICY "Allow public all messages" ON public.messages FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all customer_messages" ON public.customer_messages;
CREATE POLICY "Allow public all customer_messages" ON public.customer_messages FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all admin_notifications" ON public.admin_notifications;
CREATE POLICY "Allow public all admin_notifications" ON public.admin_notifications FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all notification_logs" ON public.notification_logs;
CREATE POLICY "Allow public all notification_logs" ON public.notification_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all customer_problems" ON public.customer_problems;
CREATE POLICY "Allow public all customer_problems" ON public.customer_problems FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all issues" ON public.issues;
CREATE POLICY "Allow public all issues" ON public.issues FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all reports" ON public.reports;
CREATE POLICY "Allow public all reports" ON public.reports FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all suppliers" ON public.suppliers;
CREATE POLICY "Allow public all suppliers" ON public.suppliers FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all supplier_applications" ON public.supplier_applications;
CREATE POLICY "Allow public all supplier_applications" ON public.supplier_applications FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all supplier_payouts" ON public.supplier_payouts;
CREATE POLICY "Allow public all supplier_payouts" ON public.supplier_payouts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all supplier_products" ON public.supplier_products;
CREATE POLICY "Allow public all supplier_products" ON public.supplier_products FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all supplier_imports" ON public.supplier_imports;
CREATE POLICY "Allow public all supplier_imports" ON public.supplier_imports FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all fulfillment_records" ON public.fulfillment_records;
CREATE POLICY "Allow public all fulfillment_records" ON public.fulfillment_records FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all app_settings" ON public.app_settings;
CREATE POLICY "Allow public all app_settings" ON public.app_settings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public settings" ON public.website_settings;
CREATE POLICY "public settings" ON public.website_settings FOR SELECT TO anon, authenticated USING (key NOT LIKE 'private.%');
DROP POLICY IF EXISTS "staff settings" ON public.website_settings;
CREATE POLICY "staff settings" ON public.website_settings FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "Allow public all store_settings" ON public.store_settings;
CREATE POLICY "Allow public all store_settings" ON public.store_settings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all reviews" ON public.reviews;
CREATE POLICY "Allow public all reviews" ON public.reviews FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all deleted_tombstones" ON public.deleted_tombstones;
CREATE POLICY "Allow public all deleted_tombstones" ON public.deleted_tombstones FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all audit_logs" ON public.audit_logs;
CREATE POLICY "Allow public all audit_logs" ON public.audit_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ==============================================================================
-- 14. AUTOMATIC UPDATED_AT TRIGGERS
-- ==============================================================================
DROP TRIGGER IF EXISTS trigger_admin_users_updated_at ON public.admin_users;
CREATE TRIGGER trigger_admin_users_updated_at BEFORE UPDATE ON public.admin_users FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_users_updated_at ON public.users;
CREATE TRIGGER trigger_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_customers_updated_at ON public.customers;
CREATE TRIGGER trigger_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_accounts_updated_at ON public.accounts;
CREATE TRIGGER trigger_accounts_updated_at BEFORE UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_categories_updated_at ON public.categories;
CREATE TRIGGER trigger_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_shops_updated_at ON public.shops;
CREATE TRIGGER trigger_shops_updated_at BEFORE UPDATE ON public.shops FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_products_updated_at ON public.products;
CREATE TRIGGER trigger_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_orders_updated_at ON public.orders;
CREATE TRIGGER trigger_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_payment_transactions_updated_at ON public.payment_transactions;
CREATE TRIGGER trigger_payment_transactions_updated_at BEFORE UPDATE ON public.payment_transactions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_customer_problems_updated_at ON public.customer_problems;
CREATE TRIGGER trigger_customer_problems_updated_at BEFORE UPDATE ON public.customer_problems FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_app_settings_updated_at ON public.app_settings;
CREATE TRIGGER trigger_app_settings_updated_at BEFORE UPDATE ON public.app_settings FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 15. REQUIRED SYSTEM CONFIGURATION (NO DEMO PRODUCTS OR SAMPLE RECORDS)
-- ==============================================================================
INSERT INTO public.admin_users (id, name, email, phone, role, permissions, active)
VALUES (
  'adm-owner-crmedia',
  'Administrator',
  'contactreachmedialimited@gmail.com',
  '0780022600',
  'owner',
  ARRAY['all'],
  true
)
ON CONFLICT (email) DO UPDATE SET
  role = 'owner',
  active = true,
  updated_at = NOW();

INSERT INTO public.app_settings (
  id, market_name, company_name, phone, email, receiver_name, payment_number,
  merchant_code, mtn_ussd_pattern, airtel_ussd_pattern,
  delivery_fee_kigali, delivery_fee_upcountry, free_delivery_threshold, is_maintenance_mode
)
VALUES (
  'global',
  'ContactReach Market',
  'ContactReach Media Ltd',
  '0780022600',
  'contactreachmedialimited@gmail.com',
  'Ruth',
  '0780022600',
  '2328354',
  '*182*1*1*0780022600*{AMOUNT}#',
  '*182*1*2*0780022600*{AMOUNT}#',
  1500,
  3500,
  50000,
  false
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.delivery_zones (name, fee_rwf, eta) VALUES
  ('Gasabo', 1500, 'Same Day / Next Day'),
  ('Nyarugenge', 1500, 'Same Day / Next Day'),
  ('Kicukiro', 1500, 'Same Day / Next Day'),
  ('Kigali Express', 2500, '2-4 Hours'),
  ('Outside Kigali', 3500, '1-2 Days'),
  ('Store Pickup', 0, 'Instant at Office')
ON CONFLICT (name) DO NOTHING;

-- ==============================================================================
-- 16. REALTIME PUBLICATION & REPLICA IDENTITY CONFIGURATION
-- ==============================================================================
DO $$
DECLARE
  tbl TEXT;
  realtime_tables TEXT[] := ARRAY[
    'products',
    'categories',
    'shops',
    'orders',
    'order_items',
    'deliveries',
    'payments',
    'payment_transactions',
    'sms_notifications',
    'conversations',
    'messages',
    'admin_notifications',
    'customer_problems',
    'coupons',
    'inventory_logs',
    'audit_logs',
    'supplier_applications',
    'supplier_payouts',
    'reviews',
    'users',
    'customers',
    'app_settings'
  ];
BEGIN
  FOREACH tbl IN ARRAY realtime_tables LOOP
    BEGIN
      EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', tbl);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END LOOP;

  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH tbl IN ARRAY realtime_tables LOOP
      IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = tbl
      ) THEN
        BEGIN
          EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
        EXCEPTION
          WHEN duplicate_object THEN NULL;
          WHEN undefined_table THEN NULL;
          WHEN OTHERS THEN NULL;
        END;
      END IF;
    END LOOP;
  END IF;
END $$;
