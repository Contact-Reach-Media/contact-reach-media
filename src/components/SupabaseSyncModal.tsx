import React, { useState } from 'react';
import {
  Database, Check, Copy, ExternalLink, RefreshCw, AlertCircle,
  CheckCircle2, X, Shield, ArrowRight, Table, Server, Users,
  ShoppingBag, Layers
} from 'lucide-react';
import { api } from '../services/api.ts';
import {
  SUPABASE_PROJECT_NAME,
  SUPABASE_PROJECT_ID,
  SUPABASE_URL,
  testSupabaseConnection,
  syncAllProductsToSupabase,
  syncAllOrdersToSupabase,
  syncAllAccountsToSupabase,
  syncAllDataToSupabase
} from '../services/supabase.ts';
import { AppSettings, Order, Product } from '../types.ts';

interface SupabaseSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings?: AppSettings | null;
  orders: Order[];
  products?: Product[];
  onRefreshData?: () => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
}

export const SUPABASE_SQL_SCHEMA = `-- ==============================================================================
-- ContactReach Market — Comprehensive Supabase Database Schema
-- Project Name: contactreachmarket
-- Project ID: hfwfjbvwhkjfrdodqyyw
-- Project URL: https://hfwfjbvwhkjfrdodqyyw.supabase.co
-- ==============================================================================
-- 1. Open your Supabase SQL Editor:
--    https://supabase.com/dashboard/project/hfwfjbvwhkjfrdodqyyw/sql/new
-- 2. Paste this entire script and click "Run" (Ctrl+Enter).
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. PRODUCTS & INVENTORY
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

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all products" ON public.products;
CREATE POLICY "Allow public all products" ON public.products FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 2. CATEGORIES
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

-- 3. VENDOR SHOPS
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

-- 4. ORDERS & DELIVERIES
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

-- 5. PAYMENT CONFIRMATIONS & EVIDENCE
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

-- 6. DIRECT TELECOM TRANSACTIONS
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

-- 7. ACCOUNTS & USERS
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

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all accounts" ON public.accounts;
CREATE POLICY "Allow public all accounts" ON public.accounts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 8. MESSAGES & LIVE CHAT
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

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all messages" ON public.messages;
CREATE POLICY "Allow public all messages" ON public.messages FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 9. CUSTOMER PROBLEMS / DISPUTES
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

-- 10. COUPONS
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

-- 11. APP SETTINGS
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

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all app_settings" ON public.app_settings;
CREATE POLICY "Allow public all app_settings" ON public.app_settings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 12. PRODUCT REVIEWS
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

-- 13. SUPPLIER APPLICATIONS
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

-- 14. SUPPLIER PAYOUTS
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

-- 15. INVENTORY LOGS
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

ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all inventory_logs" ON public.inventory_logs;
CREATE POLICY "Allow public all inventory_logs" ON public.inventory_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 16. AUDIT LOGS
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

-- 17. SECURITY SIGN INS
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

ALTER TABLE public.sign_ins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all sign_ins" ON public.sign_ins;
CREATE POLICY "Allow public all sign_ins" ON public.sign_ins FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 18. DELETED PRODUCT TOMBSTONES
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

-- 19. ENABLE REALTIME
DO $$
BEGIN
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
    RAISE NOTICE 'Realtime publication setup notice: %', SQLERRM;
END;
$$;

-- 20. TRIGGERS
DROP TRIGGER IF EXISTS trigger_products_updated_at ON public.products;
CREATE TRIGGER trigger_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_categories_updated_at ON public.categories;
CREATE TRIGGER trigger_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_shops_updated_at ON public.shops;
CREATE TRIGGER trigger_shops_updated_at BEFORE UPDATE ON public.shops FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_orders_updated_at ON public.orders;
CREATE TRIGGER trigger_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_accounts_updated_at ON public.accounts;
CREATE TRIGGER trigger_accounts_updated_at BEFORE UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_app_settings_updated_at ON public.app_settings;
CREATE TRIGGER trigger_app_settings_updated_at BEFORE UPDATE ON public.app_settings FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
`;

export const SupabaseSyncModal: React.FC<SupabaseSyncModalProps> = ({
  isOpen,
  onClose,
  settings,
  orders,
  products = [],
  onRefreshData,
  showToast,
}) => {
  const [testing, setTesting] = useState(false);
  const [syncingProducts, setSyncingProducts] = useState(false);
  const [syncingOrders, setSyncingOrders] = useState(false);
  const [syncingAccounts, setSyncingAccounts] = useState(false);
  const [syncingFullDb, setSyncingFullDb] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    tableExists?: boolean;
    tableStatus?: Record<string, boolean>;
    details?: any;
  } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  if (!isOpen) return null;

  const cfg = settings?.supabaseConfig || {
    enabled: true,
    projectUrl: SUPABASE_URL,
    anonKey: 'sb_publishable_vBneCzN_L_4VDjE_mPwxHw_vib-ua-5',
    projectId: SUPABASE_PROJECT_ID,
    projectName: SUPABASE_PROJECT_NAME,
    tableName: 'products',
    autoSyncOrders: true,
  };

  const handleCopySql = () => {
    try {
      navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
      setCopiedSql(true);
      showToast('Complete Supabase SQL Schema copied to clipboard!');
      setTimeout(() => setCopiedSql(false), 2500);
    } catch {
      showToast('Please copy the SQL text manually from below.', 'error');
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testSupabaseConnection();
      setTestResult(res);
      if (res.success) {
        showToast(res.message);
      } else {
        showToast(res.message, 'error');
      }
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Failed to connect to Supabase'
      });
      showToast(err.message || 'Connection test failed', 'error');
    } finally {
      setTesting(false);
    }
  };

  const handleSyncAllProducts = async () => {
    setSyncingProducts(true);
    try {
      const liveProducts = products.length > 0 ? products : await api.getProducts();
      const res = await syncAllProductsToSupabase(liveProducts);
      if (res.success) {
        showToast(`Successfully synced ${res.syncedCount} product(s) to Supabase public.products!`);
        if (onRefreshData) onRefreshData();
      } else {
        showToast(res.message || 'Failed to sync products. Please make sure the products table is created in Supabase.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to sync products', 'error');
    } finally {
      setSyncingProducts(false);
    }
  };

  const handleSyncAllOrders = async () => {
    setSyncingOrders(true);
    try {
      const res = await syncAllOrdersToSupabase(orders);
      if (res.success) {
        showToast(`Successfully synced ${res.syncedCount} order(s) to Supabase database!`);
        if (onRefreshData) onRefreshData();
      } else {
        showToast(res.message || 'Failed to sync orders to Supabase', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to sync orders', 'error');
    } finally {
      setSyncingOrders(false);
    }
  };

  const handleSyncAllAccounts = async () => {
    setSyncingAccounts(true);
    try {
      const customers = await api.adminGetCustomers().catch(() => []);
      const res = await syncAllAccountsToSupabase(customers);
      if (res.success) {
        showToast(`Successfully synced ${res.syncedCount} account(s) to Supabase public.accounts!`);
      } else {
        showToast(res.message || 'Failed to sync accounts to Supabase', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to sync accounts', 'error');
    } finally {
      setSyncingAccounts(false);
    }
  };

  const handleMigrateFullDatabase = async () => {
    setSyncingFullDb(true);
    try {
      const liveProducts = products.length > 0 ? products : await api.getProducts();
      const liveCategories = await api.getCategories();
      const liveShops = await api.getShops();
      const liveCustomers = await api.adminGetCustomers().catch(() => []);

      const res = await syncAllDataToSupabase({
        products: liveProducts,
        categories: liveCategories,
        shops: liveShops,
        orders,
        customers: liveCustomers,
        settings: settings || undefined
      });

      if (res.success) {
        showToast(res.message);
        if (onRefreshData) onRefreshData();
      } else {
        showToast(res.message, 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Migration notice', 'error');
    } finally {
      setSyncingFullDb(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white p-5 sm:p-6 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center border border-white/20 shadow-xs">
              <Database className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight">Supabase Database Integration</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 text-white border border-white/30">
                  Main DB
                </span>
              </div>
              <p className="text-xs text-emerald-100 mt-0.5">
                Connected to {SUPABASE_PROJECT_NAME} ({SUPABASE_PROJECT_ID})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/70 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto text-xs">
          {/* Credentials Status Card */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200/90 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                Connected Supabase Credentials
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                Live Endpoint Configured
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-semibold">Project Name</span>
                <span className="font-bold text-slate-900">{SUPABASE_PROJECT_NAME}</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-semibold">Project ID</span>
                <span className="font-mono font-bold text-slate-900">{SUPABASE_PROJECT_ID}</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 col-span-1 sm:col-span-2">
                <span className="text-[10px] text-slate-400 block font-semibold">Project URL</span>
                <span className="font-mono text-[11px] text-slate-700 break-all">{SUPABASE_URL}</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-semibold">Database Engine</span>
                <span className="font-mono font-bold text-emerald-700">PostgreSQL (Supabase)</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-semibold">Real-Time Sync</span>
                <span className="font-bold text-emerald-600">Active (Automatic)</span>
              </div>
            </div>
          </div>

          {/* Test Status Feedback */}
          {testResult && (
            <div className={`p-4 rounded-2xl border flex items-start gap-3 ${
              testResult.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}>
              {testResult.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <p className="font-bold text-xs">{testResult.message}</p>
                {!testResult.tableExists && (
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Notice: Your Supabase project is reachable, but tables have not been created yet. Copy the SQL script below, open your Supabase SQL Editor, and click "Run" to initialize all tables!
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Setup Instructions Box */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="font-black text-blue-950 text-xs flex items-center gap-1.5">
                <Server className="w-4 h-4 text-blue-600" />
                <span>1-Click Database Setup for Supabase</span>
              </h4>
              <a
                href={`https://supabase.com/dashboard/project/${SUPABASE_PROJECT_ID}/sql/new`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] transition-colors cursor-pointer"
              >
                <span>Open SQL Editor ↗</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <ol className="list-decimal pl-4 space-y-1 text-slate-700 text-[11px] leading-relaxed">
              <li>Click <strong>"Copy SQL Schema"</strong> below.</li>
              <li>Open your Supabase dashboard by clicking <strong>"Open SQL Editor ↗"</strong>.</li>
              <li>Paste the SQL script and press <strong>Run</strong>.</li>
              <li>Click <strong>"Migrate Full Database"</strong> to upload all your live products, categories, orders, and customer accounts!</li>
            </ol>

            {/* SQL Script Viewer */}
            <div className="relative mt-2">
              <pre className="bg-slate-900 text-slate-100 p-3 rounded-xl font-mono text-[10px] overflow-x-auto max-h-36 leading-snug border border-slate-700">
                {SUPABASE_SQL_SCHEMA}
              </pre>
              <button
                type="button"
                onClick={handleCopySql}
                className="absolute top-2 right-2 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
              >
                {copiedSql ? <Check className="w-3 h-3 text-white" /> : <Copy className="w-3 h-3 text-white" />}
                <span>{copiedSql ? 'Copied!' : 'Copy SQL'}</span>
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin text-orange-400' : 'text-slate-300'}`} />
                <span>{testing ? 'Testing...' : 'Test Connection'}</span>
              </button>

              <button
                type="button"
                onClick={handleSyncAllProducts}
                disabled={syncingProducts}
                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
              >
                <ShoppingBag className={`w-3.5 h-3.5 ${syncingProducts ? 'animate-bounce text-amber-200' : 'text-amber-200'}`} />
                <span>{syncingProducts ? 'Syncing...' : `Sync Products (${products.length || 'All'})`}</span>
              </button>

              <button
                type="button"
                onClick={handleSyncAllOrders}
                disabled={syncingOrders}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
              >
                <Database className={`w-3.5 h-3.5 ${syncingOrders ? 'animate-bounce text-emerald-200' : 'text-emerald-200'}`} />
                <span>{syncingOrders ? 'Syncing...' : `Sync Orders (${orders.length})`}</span>
              </button>

              <button
                type="button"
                onClick={handleSyncAllAccounts}
                disabled={syncingAccounts}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
              >
                <Users className={`w-3.5 h-3.5 ${syncingAccounts ? 'animate-bounce text-blue-200' : 'text-blue-200'}`} />
                <span>{syncingAccounts ? 'Syncing...' : 'Sync Accounts'}</span>
              </button>

              <button
                type="button"
                onClick={handleMigrateFullDatabase}
                disabled={syncingFullDb}
                className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
              >
                <Layers className={`w-3.5 h-3.5 ${syncingFullDb ? 'animate-pulse text-purple-200' : 'text-purple-200'}`} />
                <span>{syncingFullDb ? 'Migrating...' : 'Migrate Full Database'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer ml-auto"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
