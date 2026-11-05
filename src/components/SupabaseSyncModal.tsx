import React, { useState } from 'react';
import {
  Database, Check, Copy, ExternalLink, RefreshCw, AlertCircle,
  CheckCircle2, X, Shield, ArrowRight, Table, Server, Users
} from 'lucide-react';
import { api } from '../services/api.ts';
import { AppSettings, Order } from '../types.ts';

interface SupabaseSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings?: AppSettings | null;
  orders: Order[];
  onRefreshData?: () => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
}

export const SUPABASE_SQL_SCHEMA = `-- ==============================================================================
-- ContactReach Market — Supabase Database Orders Schema
-- Project: Contact-Reach-Media's Project (snasyjifdrvbcjekiqyh)
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

-- 2. Indexes for high-speed queries
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders (order_number);
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON public.orders (customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders (created_at DESC);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 4. Set RLS Policies allowing the publishable API key (anon role) to insert, select, and update
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
    role TEXT NOT NULL DEFAULT 'buyer',
    auth_provider TEXT NOT NULL DEFAULT 'email',
    status TEXT NOT NULL DEFAULT 'Active',
    last_sign_in_at TIMESTAMPTZ DEFAULT NOW(),
    sign_in_count INTEGER DEFAULT 1,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accounts_email ON public.accounts (email);
CREATE INDEX IF NOT EXISTS idx_accounts_phone ON public.accounts (phone);
CREATE INDEX IF NOT EXISTS idx_accounts_role ON public.accounts (role);

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
    sign_in_method TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    status TEXT NOT NULL DEFAULT 'success',
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    details JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_sign_ins_account_id ON public.sign_ins (account_id);
CREATE INDEX IF NOT EXISTS idx_sign_ins_email ON public.sign_ins (email);
CREATE INDEX IF NOT EXISTS idx_sign_ins_timestamp ON public.sign_ins (timestamp DESC);

ALTER TABLE public.sign_ins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public all sign_ins" ON public.sign_ins;
CREATE POLICY "Allow public all sign_ins" ON public.sign_ins
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);`;

export const SupabaseSyncModal: React.FC<SupabaseSyncModalProps> = ({
  isOpen,
  onClose,
  settings,
  orders,
  onRefreshData,
  showToast,
}) => {
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncingAccounts, setSyncingAccounts] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    tableExists?: boolean;
    details?: any;
  } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  if (!isOpen) return null;

  const cfg = settings?.supabaseConfig || {
    enabled: true,
    projectUrl: 'https://snasyjifdrvbcjekiqyh.supabase.co',
    anonKey: 'sb_publishable_OjFoAKe3zgUtd20dPQEwEA_Z25-mgT-',
    projectId: 'snasyjifdrvbcjekiqyh',
    projectName: "Contact-Reach-Media's Project",
    tableName: 'orders',
    autoSyncOrders: true,
  };

  const handleCopySql = () => {
    try {
      navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
      setCopiedSql(true);
      showToast('Supabase SQL Schema copied to clipboard!');
      setTimeout(() => setCopiedSql(false), 2500);
    } catch {
      showToast('Please copy the SQL text manually from below.', 'error');
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.testSupabaseConnection();
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

  const handleSyncAllOrders = async () => {
    setSyncing(true);
    try {
      const res = await api.syncAllOrdersToSupabase();
      if (res.success) {
        showToast(`Successfully synced ${res.syncedCount} order(s) to Supabase database!`);
        if (onRefreshData) onRefreshData();
      } else {
        showToast(res.message || 'Failed to sync orders to Supabase', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to sync orders', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncAllAccounts = async () => {
    setSyncingAccounts(true);
    try {
      const res = await api.syncAllAccountsToSupabase();
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
                  Active
                </span>
              </div>
              <p className="text-xs text-emerald-100 mt-0.5">
                Connected to {cfg.projectName || "Contact-Reach-Media's Project"} (PostgreSQL)
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
                <span className="font-bold text-slate-900">{cfg.projectName || "Contact-Reach-Media's Project"}</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-semibold">Project ID</span>
                <span className="font-mono font-bold text-slate-900">{cfg.projectId || 'snasyjifdrvbcjekiqyh'}</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 col-span-1 sm:col-span-2">
                <span className="text-[10px] text-slate-400 block font-semibold">Project URL</span>
                <span className="font-mono text-[11px] text-slate-700 break-all">{cfg.projectUrl}</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-semibold">Target Table</span>
                <span className="font-mono font-bold text-emerald-700">public.{cfg.tableName || 'orders'}</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-semibold">Auto-Sync on Checkout</span>
                <span className="font-bold text-emerald-600">Enabled (Automatic)</span>
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
                    Notice: Your Supabase database is reachable, but the <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-bold">orders</code> table has not been created yet in Supabase. Copy the SQL script below, open your Supabase SQL Editor, and click "Run" to finish setup!
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
                <span>1-Click Table Setup for Supabase</span>
              </h4>
              <a
                href="https://supabase.com/dashboard/project/snasyjifdrvbcjekiqyh/sql/new"
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
              <li>Click <strong>"Sync All Existing Orders"</strong> to upload all your website orders to Supabase!</li>
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
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin text-orange-400' : 'text-slate-300'}`} />
                <span>{testing ? 'Testing...' : 'Test Connection'}</span>
              </button>

              <button
                type="button"
                onClick={handleSyncAllOrders}
                disabled={syncing}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
              >
                <Database className={`w-3.5 h-3.5 ${syncing ? 'animate-bounce text-emerald-200' : 'text-emerald-200'}`} />
                <span>{syncing ? 'Syncing...' : `Sync Orders (${orders.length})`}</span>
              </button>

              <button
                type="button"
                onClick={handleSyncAllAccounts}
                disabled={syncingAccounts}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
              >
                <Users className={`w-3.5 h-3.5 ${syncingAccounts ? 'animate-bounce text-blue-200' : 'text-blue-200'}`} />
                <span>{syncingAccounts ? 'Syncing...' : 'Sync All Accounts'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
