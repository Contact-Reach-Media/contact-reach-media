import React, { useState, useEffect } from 'react';
import {
  Globe, Package, RefreshCw, Zap, ShieldCheck, DollarSign,
  Percent, Clock, ExternalLink, Search, Check, AlertCircle,
  Truck, ArrowRight, Layers, Sliders, CheckCircle2, ChevronRight,
  Sparkles, FileText, Send, Building, ShieldAlert, Info
} from 'lucide-react';
import { Product, Order, AlibabaConfig, AlibabaShippingQuote, Category } from '../types.ts';
import { api } from '../services/api.ts';
import { calculateAlibabaShipping, calculateAlibabaLandedPricing } from '../utils/alibabaShipping.ts';

interface AlibabaHubProps {
  products: Product[];
  orders: Order[];
  categories: Category[];
  onRefreshData: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export const AlibabaHub: React.FC<AlibabaHubProps> = ({
  products,
  orders,
  categories,
  onRefreshData,
  showToast
}) => {
  const [subTab, setSubTab] = useState<'catalog' | 'staging' | 'search' | 'logistics' | 'orders' | 'settings'>('staging');
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<AlibabaConfig | null>(null);

  // Staging & Review Queue state
  const [stagingProducts, setStagingProducts] = useState<Product[]>([]);
  const [stagingSummary, setStagingSummary] = useState({ totalCount: 0, pendingCount: 0, approvedCount: 0, rejectedCount: 0 });
  const [stagingLoading, setStagingLoading] = useState(false);
  const [stagingFilterStatus, setStagingFilterStatus] = useState<string>('Pending Approval');
  const [stagingFilterCategory, setStagingFilterCategory] = useState<string>('all');
  const [stagingSearch, setStagingSearch] = useState<string>('');
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [bulkApproving, setBulkApproving] = useState(false);
  const [importing300, setImporting300] = useState(false);
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);

  // Search & Import state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCategory, setSearchCategory] = useState('all');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedPids, setSelectedPids] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);

  // Sync state
  const [syncingStock, setSyncingStock] = useState(false);
  const [syncingCatalog, setSyncingCatalog] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);

  // Settings form
  const [appKeyInput, setAppKeyInput] = useState('');
  const [appSecretInput, setAppSecretInput] = useState('');
  const [emailInput, setEmailInput] = useState('contactreachmedialimited@gmail.com');
  const [usdRateInput, setUsdRateInput] = useState(1435);
  const [savingSettings, setSavingSettings] = useState(false);

  // Logistics calculator state
  const [calcWeight, setCalcWeight] = useState<number>(1.2);
  const [calcLength, setCalcLength] = useState<number>(25);
  const [calcWidth, setCalcWidth] = useState<number>(18);
  const [calcHeight, setCalcHeight] = useState<number>(10);
  const [calcUnitCost, setCalcUnitCost] = useState<number>(24.50);
  const [calcQuote, setCalcQuote] = useState<any>(null);

  // Orders state
  const [aliOrders, setAliOrders] = useState<any[]>([]);
  const [approvingOrderId, setApprovingOrderId] = useState<string | null>(null);

  // Direct Alibaba Store Cloner (No Login Required)
  const [cloneUrlInput, setCloneUrlInput] = useState('');
  const [cloneCategoryInput, setCloneCategoryInput] = useState('all');
  const [cloningStore, setCloningStore] = useState(false);

  // Filter products belonging to Alibaba
  const alibabaProducts = products.filter(
    p => p.source === 'alibaba' || Boolean(p.alibabaProductId) || p.sku?.startsWith('ALI-')
  );

  useEffect(() => {
    fetchConfig();
    fetchAlibabaOrders();
    handleSearch();
  }, []);

  const fetchConfig = async () => {
    try {
      const cfg = await api.adminGetAlibabaConfig();
      setConfig(cfg);
      setAppKeyInput(cfg.appKey || '');
      setAppSecretInput(cfg.appSecret || '');
      setEmailInput(cfg.email || 'contactreachmedialimited@gmail.com');
      setUsdRateInput(cfg.usdToRwfRate || 1435);
    } catch {
      // Handled via defaults
    }
  };

  const fetchAlibabaOrders = async () => {
    try {
      const res = await api.adminGetAlibabaOrders();
      setAliOrders(res.orders || []);
    } catch {
      // Fallback
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    try {
      const res = await api.adminTestAlibabaConnection(appKeyInput, appSecretInput);
      if (res.success) {
        showToast(res.message, 'success');
        fetchConfig();
      } else {
        showToast(res.message, 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Connection test failed', 'error');
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await api.adminUpdateAlibabaConfig({
        appKey: appKeyInput.trim(),
        appSecret: appSecretInput.trim(),
        email: emailInput.trim(),
        usdToRwfRate: Number(usdRateInput) || 1435
      });
      setConfig(res);
      showToast('Alibaba settings and credentials saved successfully.');
      onRefreshData();
    } catch (err: any) {
      showToast(err.message || 'Failed to save Alibaba settings', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSearch = async () => {
    setSearching(true);
    try {
      const res = await api.adminSearchAlibabaProducts({
        query: searchQuery,
        category: searchCategory,
        pageSize: 30
      });
      setSearchResults(res.products || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to search Alibaba catalog', 'error');
    } finally {
      setSearching(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedPids.length === searchResults.length) {
      setSelectedPids([]);
    } else {
      setSelectedPids(searchResults.map(p => p.pid));
    }
  };

  const handleToggleSelect = (pid: string) => {
    setSelectedPids(prev =>
      prev.includes(pid) ? prev.filter(id => id !== pid) : [...prev, pid]
    );
  };

  const handleImportSelected = async () => {
    if (selectedPids.length === 0) {
      showToast('Please select at least one Alibaba product to import', 'error');
      return;
    }

    const itemsToImport = searchResults.filter(p => selectedPids.includes(p.pid));
    setImporting(true);
    try {
      const res = await api.adminImportAlibabaProducts({
        products: itemsToImport,
        requireApproval: false
      });
      showToast(res.message, 'success');
      setSelectedPids([]);
      onRefreshData();
      handleSearch();
      setSubTab('catalog');
    } catch (err: any) {
      showToast(err.message || 'Failed to import selected products', 'error');
    } finally {
      setImporting(false);
    }
  };

  const handleSyncStockAndPrices = async () => {
    setSyncingStock(true);
    try {
      const res = await api.adminSyncAlibabaStockAndPrices();
      showToast(res.message, 'success');
      onRefreshData();
    } catch (err: any) {
      showToast(err.message || 'Failed to sync stock and prices', 'error');
    } finally {
      setSyncingStock(false);
    }
  };

  const handleSyncCatalogNow = async () => {
    setSyncingCatalog(true);
    try {
      const res = await api.adminSyncAlibabaNow(undefined, true);
      showToast(res.message, 'success');
      onRefreshData();
      handleSearch();
    } catch (err: any) {
      showToast(err.message || 'Failed to sync Alibaba catalog', 'error');
    } finally {
      setSyncingCatalog(false);
    }
  };

  const handleCloneStoreOrProduct = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setCloningStore(true);
    try {
      const res = await api.adminCloneAlibabaStoreOrProduct({
        url: cloneUrlInput.trim() || undefined,
        category: cloneCategoryInput !== 'all' ? cloneCategoryInput : undefined,
        count: 24,
        autoPublish: true
      });
      showToast(res.message, 'success');
      setCloneUrlInput('');
      onRefreshData();
      handleSearch();
      setSubTab('catalog');
    } catch (err: any) {
      showToast(err.message || 'Failed to clone Alibaba products', 'error');
    } finally {
      setCloningStore(false);
    }
  };

  const handleApproveOrder = async (orderId: string) => {
    setApprovingOrderId(orderId);
    try {
      const res = await api.adminApproveAlibabaFulfillment(orderId);
      showToast(res.message, 'success');
      fetchAlibabaOrders();
      onRefreshData();
    } catch (err: any) {
      showToast(err.message || 'Failed to approve fulfillment', 'error');
    } finally {
      setApprovingOrderId(null);
    }
  };

  const fetchStaging = async () => {
    setStagingLoading(true);
    try {
      const res = await api.adminGetAlibabaStaging({
        status: stagingFilterStatus,
        category: stagingFilterCategory,
        search: stagingSearch
      });
      setStagingProducts(res.products || []);
      if (res.summary) setStagingSummary(res.summary);
    } catch {
      // Fallback
    } finally {
      setStagingLoading(false);
    }
  };

  useEffect(() => {
    fetchStaging();
  }, [stagingFilterStatus, stagingFilterCategory]);

  const handleImport300 = async (autoPublish: boolean = false) => {
    setImporting300(true);
    try {
      const res = await api.adminImport300AlibabaProducts({ autoPublish });
      showToast(res.message, 'success');
      onRefreshData();
      await fetchStaging();
      setSubTab('staging');
    } catch (err: any) {
      showToast(err.message || 'Failed to import 300 Alibaba products', 'error');
    } finally {
      setImporting300(false);
    }
  };

  const handleApproveProduct = async (id: string) => {
    setApprovingId(id);
    try {
      const res = await api.adminApproveAlibabaProduct(id);
      showToast(res.message, 'success');
      onRefreshData();
      await fetchStaging();
    } catch (err: any) {
      showToast(err.message || 'Failed to approve product', 'error');
    } finally {
      setApprovingId(null);
    }
  };

  const handleRejectProduct = async (id: string) => {
    setRejectingId(id);
    try {
      const res = await api.adminRejectAlibabaProduct(id);
      showToast(res.message, 'success');
      onRefreshData();
      await fetchStaging();
    } catch (err: any) {
      showToast(err.message || 'Failed to reject product', 'error');
    } finally {
      setRejectingId(null);
    }
  };

  const handleBulkApprove = async (allPending: boolean = true) => {
    setBulkApproving(true);
    try {
      const res = await api.adminBulkApproveAlibabaProducts({ allPending });
      showToast(res.message, 'success');
      onRefreshData();
      await fetchStaging();
    } catch (err: any) {
      showToast(err.message || 'Failed to bulk approve products', 'error');
    } finally {
      setBulkApproving(false);
    }
  };

  // Re-calculate logistics quote when inputs change
  useEffect(() => {
    const rate = Number(usdRateInput) || 1435;
    const dims = { length: calcLength, width: calcWidth, height: calcHeight };
    const quote = calculateAlibabaShipping(calcWeight, dims, rate);
    const pricing = calculateAlibabaLandedPricing(calcUnitCost, calcWeight, dims, rate, 10);
    setCalcQuote({ quote, pricing });
  }, [calcWeight, calcLength, calcWidth, calcHeight, calcUnitCost, usdRateInput]);

  return (
    <div className="space-y-6">
      {/* Top Banner / Hero */}
      <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-8">
          <Globe className="w-80 h-80" />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold text-white tracking-wide">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Official Alibaba Wholesale & Air Freight Integration
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Alibaba to Rwanda Landed Pricing
            </h1>
            <p className="text-orange-100 text-xs sm:text-sm leading-relaxed">
              Official freight rates directly to Kigali (KGL & MAGERWA Customs). Automatic pricing formula strictly enforced:
              <span className="font-mono font-bold bg-black/20 px-2 py-0.5 rounded-md ml-1 text-white border border-white/20">
                Selling Price = (Product Cost + Shipping Cost) × 1.10
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => handleImport300(false)}
              disabled={importing300}
              className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
            >
              <Package className={`w-4 h-4 ${importing300 ? 'animate-spin' : ''}`} />
              <span>{importing300 ? 'Importing 300...' : '📦 Import 300 Products (Review Queue)'}</span>
            </button>
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testingConnection}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/30 text-white text-xs font-bold rounded-xl backdrop-blur-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
            >
              <ShieldCheck className={`w-4 h-4 ${testingConnection ? 'animate-spin' : ''}`} />
              <span>{testingConnection ? 'Testing...' : 'Test Gateway'}</span>
            </button>
            <button
              type="button"
              onClick={handleSyncStockAndPrices}
              disabled={syncingStock}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/30 text-white text-xs font-bold rounded-xl backdrop-blur-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${syncingStock ? 'animate-spin' : ''}`} />
              <span>{syncingStock ? 'Syncing...' : 'Sync Stock & Prices'}</span>
            </button>
            <button
              type="button"
              onClick={handleSyncCatalogNow}
              disabled={syncingCatalog}
              className="px-4 py-2.5 bg-white text-orange-700 hover:bg-orange-50 text-xs font-black rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
            >
              <Zap className={`w-4 h-4 text-orange-600 ${syncingCatalog ? 'animate-spin' : ''}`} />
              <span>{syncingCatalog ? 'Syncing...' : '1-Click Catalog Import'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* DIRECT ALIBABA SHOP CLONER (NO LOGIN REQUIRED) */}
      <div className="bg-white rounded-3xl border-2 border-orange-500/80 shadow-md p-6 space-y-4 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold mb-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Direct Web Cloner Active · Zero Login Details or API Keys Required</span>
            </div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-orange-500" />
              <span>Clone Alibaba Shop & Products Directly to Website</span>
            </h2>
            <p className="text-xs text-slate-500">
              Paste any Alibaba store or product link, or type keywords. Clones original images, original descriptions, computes authentic air shipping to Kigali, and applies the 10% markup formula automatically.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => handleImport300(false)}
              disabled={importing300}
              className="px-3.5 py-2.5 bg-amber-100 hover:bg-amber-200 border border-amber-300 text-amber-950 text-xs font-black rounded-xl shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all shrink-0"
            >
              <Layers className="w-4 h-4 text-amber-700" />
              <span>{importing300 ? 'Importing...' : '📦 Import 300 to Staging'}</span>
            </button>
            <button
              type="button"
              onClick={() => handleCloneStoreOrProduct()}
              disabled={cloningStore}
              className="px-4 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white text-xs font-black rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all shrink-0"
            >
              <Zap className={`w-4 h-4 ${cloningStore ? 'animate-spin' : ''}`} />
              <span>{cloningStore ? 'Cloning to Website...' : '⚡ Clone Entire Alibaba Store Now'}</span>
            </button>
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleCloneStoreOrProduct} className="flex flex-col sm:flex-row items-stretch gap-3">
          <div className="relative flex-1">
            <Globe className="w-4 h-4 text-orange-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Paste Alibaba Store URL, Product Link, or Product Name (e.g. https://www.alibaba.com/product-detail/... or Solar, Watches, Hair)..."
              value={cloneUrlInput}
              onChange={e => setCloneUrlInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:border-orange-500 focus:bg-white"
            />
          </div>

          <select
            value={cloneCategoryInput}
            onChange={e => setCloneCategoryInput(e.target.value)}
            className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden focus:border-orange-500"
          >
            <option value="all">All Store Categories</option>
            <option value="amatara">Solar & Lighting</option>
            <option value="electronics">Electronics & Tablets</option>
            <option value="hair-beauty">Hair, Wigs & Beauty</option>
            <option value="fashion">Shoes & Fashion</option>
            <option value="amasaha">Watches</option>
            <option value="ibikapu">Bags & Luggage</option>
            <option value="home-kitchen">Home & Kitchen</option>
            <option value="services">Tools & Equipment</option>
          </select>

          <button
            type="submit"
            disabled={cloningStore}
            className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-black rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all shrink-0"
          >
            <Sparkles className="w-4 h-4" />
            <span>{cloningStore ? 'Cloning...' : 'Clone & Upload'}</span>
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 pt-2 border-t border-slate-100">
          <span className="flex items-center gap-1 text-slate-700 font-semibold">
            <Check className="w-3.5 h-3.5 text-emerald-600" /> Original Images Unmodified
          </span>
          <span className="flex items-center gap-1 text-slate-700 font-semibold">
            <Check className="w-3.5 h-3.5 text-emerald-600" /> Original Descriptions Preserved
          </span>
          <span className="flex items-center gap-1 text-slate-700 font-semibold">
            <Check className="w-3.5 h-3.5 text-emerald-600" /> Real Freight to Kigali Added
          </span>
          <span className="flex items-center gap-1 text-slate-700 font-semibold">
            <Check className="w-3.5 h-3.5 text-emerald-600" /> Strictly 10% Markup Formula
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Alibaba Products Active</span>
            <Package className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {alibabaProducts.length}
          </div>
          <span className="text-[10px] text-slate-500">Imported with Kigali freight</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Markup Formula</span>
            <Percent className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600 font-mono">
            +10.0%
          </div>
          <span className="text-[10px] text-slate-500 font-mono">(Cost + Shipping) × 1.10</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Exchange Rate</span>
            <DollarSign className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-black text-slate-900 font-mono">
            1 USD = {usdRateInput} RWF
          </div>
          <span className="text-[10px] text-slate-400">Live Rwandan Franc peg</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>Air Cargo Routing</span>
            <Truck className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-sm font-black text-slate-900 mt-1">
            KGL Hub (Kigali Airport)
          </div>
          <span className="text-[10px] text-slate-500">7 - 12 days / MAGERWA DDP</span>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center gap-1.5 flex-wrap text-xs font-bold">
        <button
          type="button"
          onClick={() => {
            setSubTab('staging');
            fetchStaging();
          }}
          className={`px-3.5 py-2 rounded-xl flex items-center gap-2 cursor-pointer transition-colors ${
            subTab === 'staging'
              ? 'bg-orange-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Review & Staging Queue</span>
          {stagingSummary.pendingCount > 0 ? (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-400 text-slate-950 font-black animate-pulse">
              {stagingSummary.pendingCount} Pending
            </span>
          ) : (
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              subTab === 'staging' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
            }`}>
              {stagingSummary.totalCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setSubTab('catalog')}
          className={`px-3.5 py-2 rounded-xl flex items-center gap-2 cursor-pointer transition-colors ${
            subTab === 'catalog'
              ? 'bg-orange-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Live Catalog</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
            subTab === 'catalog' ? 'bg-white/20 text-white' : 'bg-orange-100 text-orange-800'
          }`}>
            {alibabaProducts.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setSubTab('search');
            if (searchResults.length === 0) handleSearch();
          }}
          className={`px-3.5 py-2 rounded-xl flex items-center gap-2 cursor-pointer transition-colors ${
            subTab === 'search'
              ? 'bg-orange-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>Product Search & Import</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('logistics')}
          className={`px-3.5 py-2 rounded-xl flex items-center gap-2 cursor-pointer transition-colors ${
            subTab === 'logistics'
              ? 'bg-orange-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Kigali Freight Rate Engine</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setSubTab('orders');
            fetchAlibabaOrders();
          }}
          className={`px-3.5 py-2 rounded-xl flex items-center gap-2 cursor-pointer transition-colors ${
            subTab === 'orders'
              ? 'bg-orange-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Alibaba Orders</span>
          {aliOrders.length > 0 && (
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              subTab === 'orders' ? 'bg-white/20 text-white' : 'bg-orange-100 text-orange-800'
            }`}>
              {aliOrders.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setSubTab('settings')}
          className={`px-3.5 py-2 rounded-xl flex items-center gap-2 cursor-pointer transition-colors ${
            subTab === 'settings'
              ? 'bg-orange-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>API Credentials & Settings</span>
        </button>
      </div>

      {/* SUB-TAB 0: REVIEW & STAGING QUEUE (300 VERIFIED PRODUCTS) */}
      {subTab === 'staging' && (
        <div className="space-y-4">
          {/* Staging Control Header */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold mb-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                  <span>Quality Control & Admin Approval Queue</span>
                </div>
                <h2 className="text-lg font-black text-slate-900">
                  Alibaba Staging Queue ({stagingSummary.totalCount} Products Total)
                </h2>
                <p className="text-xs text-slate-500">
                  Review original descriptions, images, supplier Trade Assurance, authentic air cargo to Kigali, and strict 10% markup before publishing live to the customer storefront.
                </p>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleBulkApprove(true)}
                  disabled={bulkApproving || stagingSummary.pendingCount === 0}
                  className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
                >
                  <CheckCircle2 className={`w-4 h-4 ${bulkApproving ? 'animate-spin' : ''}`} />
                  <span>
                    {bulkApproving ? 'Approving All...' : `✨ Approve All (${stagingSummary.pendingCount}) to Live Store`}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleImport300(false)}
                  disabled={importing300}
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
                >
                  <RefreshCw className={`w-4 h-4 ${importing300 ? 'animate-spin' : ''}`} />
                  <span>{importing300 ? 'Importing 300...' : '📦 Re-Import 300 Products'}</span>
                </button>
              </div>
            </div>

            {/* Status Tabs & Filter Controls */}
            <div className="pt-3 border-t border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setStagingFilterStatus('Pending Approval')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                    stagingFilterStatus === 'Pending Approval'
                      ? 'bg-amber-500 text-slate-950 font-black shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Pending Review ({stagingSummary.pendingCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStagingFilterStatus('Approved')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                    stagingFilterStatus === 'Approved'
                      ? 'bg-emerald-600 text-white font-black shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Approved & Live ({stagingSummary.approvedCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStagingFilterStatus('Rejected')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                    stagingFilterStatus === 'Rejected'
                      ? 'bg-rose-600 text-white font-black shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Rejected ({stagingSummary.rejectedCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStagingFilterStatus('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                    stagingFilterStatus === 'all'
                      ? 'bg-slate-900 text-white font-black shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All ({stagingSummary.totalCount})
                </button>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1 md:w-56">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search staged items..."
                    value={stagingSearch}
                    onChange={e => setStagingSearch(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') fetchStaging(); }}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:border-orange-500"
                  />
                </div>

                <select
                  value={stagingFilterCategory}
                  onChange={e => setStagingFilterCategory(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-hidden focus:border-orange-500"
                >
                  <option value="all">All 10 Categories</option>
                  <option value="amatara">Solar & Lighting (30)</option>
                  <option value="electronics">Electronics (30)</option>
                  <option value="hair-beauty">Hair & Beauty (30)</option>
                  <option value="amasaha">Watches & Amasaha (30)</option>
                  <option value="ibikapu">Bags & Ibikapu (30)</option>
                  <option value="home-kitchen">Home & Kitchen (30)</option>
                  <option value="services">Services & Tools (30)</option>
                  <option value="fashion">Fashion & Apparel (30)</option>
                  <option value="sports">Sports & Fitness (30)</option>
                  <option value="supermarket">Supermarket (30)</option>
                </select>

                <button
                  type="button"
                  onClick={fetchStaging}
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg cursor-pointer"
                  title="Refresh Queue"
                >
                  <RefreshCw className={`w-4 h-4 ${stagingLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Staging Products Table */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
            {stagingLoading ? (
              <div className="p-12 text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-orange-500 animate-spin mx-auto" />
                <p className="text-xs font-bold text-slate-600">Loading staged Alibaba products...</p>
              </div>
            ) : stagingProducts.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <Package className="w-12 h-12 text-slate-300 mx-auto" />
                <p className="text-sm font-bold text-slate-700">No products match current staging filters</p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Click below to import all 300 authentic Alibaba products covering all 10 store categories into this queue.
                </p>
                <button
                  type="button"
                  onClick={() => handleImport300(false)}
                  disabled={importing300}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  {importing300 ? 'Importing 300 Products...' : '📦 Import 300 Alibaba Products to Staging Queue'}
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200/60 uppercase font-bold text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Product Specs & Images</th>
                      <th className="py-3 px-4">Supplier & Trade Assurance</th>
                      <th className="py-3 px-4">Kigali Freight (KGL Hub)</th>
                      <th className="py-3 px-4">Total Landed Cost</th>
                      <th className="py-3 px-4">Selling Price (+10%)</th>
                      <th className="py-3 px-4">Review Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stagingProducts.map(prod => (
                      <tr key={prod.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={prod.imageUrl || (prod.images && prod.images[0]) || '/logo.png'}
                              alt={prod.name}
                              onClick={() => setPreviewProduct(prod)}
                              className="w-14 h-14 rounded-xl object-cover border border-slate-200 flex-shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                            />
                            <div className="space-y-0.5 max-w-xs">
                              <p
                                onClick={() => setPreviewProduct(prod)}
                                className="font-bold text-slate-900 line-clamp-2 hover:text-orange-600 cursor-pointer"
                              >
                                {prod.name}
                              </p>
                              <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                                <span className="font-mono text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                                  {prod.sku}
                                </span>
                                <span className="bg-orange-50 text-orange-800 font-bold px-1.5 py-0.2 rounded border border-orange-200/60">
                                  {prod.category}
                                </span>
                                {prod.images && prod.images.length > 1 && (
                                  <span className="text-slate-400">
                                    📷 {prod.images.length} photos
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="space-y-0.5">
                            <p className="font-bold text-slate-800 line-clamp-1">
                              {prod.alibabaSupplierName || 'Alibaba Verified Manufacturer'}
                            </p>
                            <p className="text-[10px] text-slate-500">
                              {prod.alibabaSupplierLocation || 'China'}
                            </p>
                            <div className="flex items-center gap-1 pt-0.5">
                              {prod.alibabaTradeAssurance && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[9px] font-bold">
                                  <ShieldCheck className="w-2.5 h-2.5" /> Trade Assurance
                                </span>
                              )}
                              <span className="text-[9px] text-slate-400 font-mono">
                                MOQ: {prod.alibabaMoq || 1} {prod.unit || 'pc'}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="space-y-0.5">
                            <span className="font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 text-xs inline-block">
                              +{(prod.alibabaShippingCostRwf || 0).toLocaleString()} RWF
                            </span>
                            <p className="text-[10px] text-slate-500">
                              Air Freight: {prod.alibabaWeightKg || 1} kg ({prod.alibabaShippingMethod || 'Alibaba Express Cargo'})
                            </p>
                            <p className="text-[9px] text-slate-400">
                              Direct to Kigali Airport (KGL) Hub
                            </p>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="space-y-0.5">
                            <span className="font-mono font-bold text-slate-900 text-xs">
                              {(prod.costPrice || 0).toLocaleString()} RWF
                            </span>
                            <p className="text-[10px] text-slate-500">
                              Item: {((prod.alibabaOriginalCostUsd || 10) * (usdRateInput || 1435)).toLocaleString()} RWF (${prod.alibabaOriginalCostUsd})
                            </p>
                            <p className="text-[9px] text-slate-400">
                              + Freight: {(prod.alibabaShippingCostRwf || 0).toLocaleString()} RWF
                            </p>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="space-y-0.5">
                            <span className="font-mono font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 text-xs inline-block">
                              {(prod.price || 0).toLocaleString()} RWF
                            </span>
                            <div className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                              <span>Profit (+10%): +{(prod.profitMargin || 0).toLocaleString()} RWF</span>
                            </div>
                            <span className="text-[9px] text-slate-400 font-mono block">
                              (Cost + Shipping) × 1.10
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          {prod.reviewStatus === 'Approved' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black border border-emerald-300">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Approved & Live</span>
                            </span>
                          ) : prod.reviewStatus === 'Rejected' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 text-[10px] font-black border border-rose-300">
                              <ShieldAlert className="w-3 h-3 text-rose-600" />
                              <span>Rejected</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black border border-amber-300 animate-pulse">
                              <Clock className="w-3 h-3 text-amber-700" />
                              <span>Pending Review</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setPreviewProduct(prod)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold cursor-pointer"
                              title="Inspect unmodified specs and original photos"
                            >
                              Inspect
                            </button>

                            {prod.reviewStatus !== 'Approved' && (
                              <button
                                type="button"
                                onClick={() => handleApproveProduct(prod.id)}
                                disabled={approvingId === prod.id}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-black shadow-2xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              >
                                {approvingId === prod.id ? (
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Check className="w-3 h-3" />
                                )}
                                <span>Approve</span>
                              </button>
                            )}

                            {prod.reviewStatus !== 'Rejected' && (
                              <button
                                type="button"
                                onClick={() => handleRejectProduct(prod.id)}
                                disabled={rejectingId === prod.id}
                                className="px-2 py-1 bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700 rounded-lg text-[11px] font-bold cursor-pointer disabled:opacity-50"
                                title="Reject and hide from store"
                              >
                                {rejectingId === prod.id ? (
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                ) : (
                                  'Reject'
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 1: LIVE IMPORTED CATALOG */}
      {subTab === 'catalog' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-black text-slate-900">
                Alibaba Products in Store ({alibabaProducts.length})
              </h2>
              <p className="text-xs text-slate-500">
                Every product includes actual air cargo shipping to Kigali and exact 10% markup.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSubTab('search')}
                className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors"
              >
                + Import More from Alibaba
              </button>
            </div>
          </div>

          {alibabaProducts.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Package className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">No Alibaba products imported yet</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Use 1-Click Catalog Import to populate authentic Alibaba items with verified Kigali shipping costs and 10% markup.
              </p>
              <button
                type="button"
                onClick={handleSyncCatalogNow}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                ⚡ 1-Click Import Verified Alibaba Catalog
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200/60 uppercase font-bold text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Product Details</th>
                    <th className="py-3 px-4">Supplier & MOQ</th>
                    <th className="py-3 px-4">Weight & Dimensions</th>
                    <th className="py-3 px-4">Shipping to Kigali</th>
                    <th className="py-3 px-4">Landed Cost</th>
                    <th className="py-3 px-4">Selling Price (+10%)</th>
                    <th className="py-3 px-4">Profit</th>
                    <th className="py-3 px-4">Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {alibabaProducts.map(prod => (
                    <tr key={prod.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={prod.imageUrl || '/logo.png'}
                            alt={prod.name}
                            className="w-12 h-12 rounded-lg object-cover border border-slate-200 flex-shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate max-w-xs">{prod.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{prod.sku}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {prod.alibabaTradeAssurance && (
                                <span className="text-[9px] bg-amber-50 text-amber-700 font-bold px-1.5 py-0.2 rounded border border-amber-200">
                                  Trade Assurance
                                </span>
                              )}
                              {prod.alibabaVerifiedSupplier && (
                                <span className="text-[9px] bg-blue-50 text-blue-700 font-bold px-1.5 py-0.2 rounded border border-blue-200">
                                  Verified Supplier
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-800">{prod.alibabaSupplierName || 'Alibaba Partner'}</p>
                        <p className="text-[10px] text-slate-400">{prod.alibabaSupplierLocation || 'China'}</p>
                        <p className="text-[10px] text-slate-500 font-mono">MOQ: {prod.alibabaMoq || 1} {prod.unit || 'pc'}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-mono text-slate-800">{prod.alibabaWeightKg || 1} kg</p>
                        {prod.alibabaDimensionsCm && (
                          <p className="text-[10px] text-slate-400 font-mono">
                            {prod.alibabaDimensionsCm.length}×{prod.alibabaDimensionsCm.width}×{prod.alibabaDimensionsCm.height} cm
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900 font-mono">
                          {prod.alibabaShippingCostRwf ? `${prod.alibabaShippingCostRwf.toLocaleString()} RWF` : 'Free'}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate max-w-[140px]" title={prod.alibabaShippingMethod}>
                          {prod.alibabaShippingMethod || 'Alibaba Air Express'}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-mono font-bold text-slate-700">
                          {prod.costPrice?.toLocaleString() || 0} RWF
                        </p>
                        <p className="text-[10px] text-slate-400">
                          ${prod.alibabaOriginalCostUsd || 0} USD product
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200">
                          {prod.price.toLocaleString()} RWF
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-mono font-bold text-emerald-600">
                          +{prod.profitMargin ? prod.profitMargin.toLocaleString() : Math.round(prod.price - (prod.costPrice || 0)).toLocaleString()} RWF
                        </p>
                        <p className="text-[10px] text-emerald-600 font-bold">10% markup</p>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-slate-800">{prod.stock}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: PRODUCT SEARCH & 1-CLICK IMPORT */}
      {subTab === 'search' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search Alibaba verified products, solar generators, cosmetics, electronics..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <select
                value={searchCategory}
                onChange={e => setSearchCategory(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 focus:outline-hidden focus:border-orange-500"
              >
                <option value="all">All Categories</option>
                <option value="electronics">Electronics & Solar</option>
                <option value="hair-beauty">Hair & Beauty</option>
                <option value="clothing">Apparel & Fashion</option>
                <option value="home-kitchen">Home & Kitchen</option>
                <option value="services">Tools & Commercial</option>
              </select>

              <button
                type="button"
                onClick={handleSearch}
                disabled={searching}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Search className="w-3.5 h-3.5" />
                <span>{searching ? 'Searching...' : 'Search Alibaba'}</span>
              </button>
            </div>

            {/* Selection action bar */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-orange-600 font-bold hover:underline cursor-pointer"
                >
                  {selectedPids.length === searchResults.length ? 'Deselect All' : 'Select All'}
                </button>
                <span className="text-slate-500">
                  {selectedPids.length} of {searchResults.length} selected
                </span>
              </div>

              <button
                type="button"
                onClick={handleImportSelected}
                disabled={selectedPids.length === 0 || importing}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-40 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{importing ? 'Importing...' : `Import Selected (${selectedPids.length})`}</span>
              </button>
            </div>
          </div>

          {/* Results grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {searchResults.map(item => {
              const isSelected = selectedPids.includes(item.pid);
              return (
                <div
                  key={item.pid}
                  className={`bg-white rounded-2xl border transition-all p-4 space-y-3 relative ${
                    isSelected
                      ? 'border-orange-500 ring-2 ring-orange-100 shadow-md'
                      : 'border-slate-200 hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelect(item.pid)}
                      className="w-4 h-4 mt-1 rounded text-orange-600 focus:ring-orange-500 border-slate-300 cursor-pointer"
                    />
                    <img
                      src={item.productImages?.[0] || '/logo.png'}
                      alt={item.productName}
                      className="w-16 h-16 rounded-xl object-cover border border-slate-200 flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-xs text-slate-900 line-clamp-2 leading-snug">
                        {item.productName}
                      </h3>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">{item.productSku}</p>
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        {item.tradeAssurance && (
                          <span className="text-[9px] bg-amber-50 text-amber-700 font-bold px-1.5 py-0.2 rounded border border-amber-200">
                            Trade Assurance
                          </span>
                        )}
                        {item.alreadyImported && (
                          <span className="text-[9px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.2 rounded border border-emerald-200">
                            ✓ In Store
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Supplier info */}
                  <div className="p-2.5 bg-slate-50 rounded-xl space-y-1 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Supplier:</span>
                      <span className="font-semibold text-slate-800 truncate max-w-[150px]">{item.supplierName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Weight & Volumetric:</span>
                      <span className="font-mono text-slate-800">
                        {item.weightKg} kg ({item.dimensionsCm?.length}×{item.dimensionsCm?.width}×{item.dimensionsCm?.height}cm)
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Air Freight to Kigali:</span>
                      <span className="font-mono font-bold text-slate-900">
                        {item.shippingCostRwf?.toLocaleString()} RWF (${item.shippingCostUsd})
                      </span>
                    </div>
                  </div>

                  {/* Pricing Breakdown Formula */}
                  <div className="p-2.5 bg-orange-50/70 border border-orange-100 rounded-xl space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-orange-900">Wholesale Unit:</span>
                      <span className="font-mono font-bold text-slate-800">
                        ${item.unitCostUsd} USD ({item.productCostRwf?.toLocaleString()} RWF)
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-orange-900">Total Landed Cost:</span>
                      <span className="font-mono font-bold text-slate-800">
                        {item.totalLandedCostRwf?.toLocaleString()} RWF
                      </span>
                    </div>
                    <div className="pt-1 border-t border-orange-200/60 flex items-center justify-between">
                      <span className="text-xs font-black text-orange-950">Selling (+10%):</span>
                      <span className="text-sm font-black text-orange-600 font-mono">
                        {item.sellingPriceRwf?.toLocaleString()} RWF
                      </span>
                    </div>
                    <p className="text-[9px] text-orange-700/80 font-mono text-center pt-0.5">
                      ({item.productCostRwf?.toLocaleString()} + {item.shippingCostRwf?.toLocaleString()}) × 1.10
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: KIGALI FREIGHT RATE ENGINE */}
      {subTab === 'logistics' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-6">
            <div>
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Truck className="w-5 h-5 text-orange-600" />
                <span>Official Alibaba Logistics Freight Rate Calculator (China ➔ Kigali, Rwanda)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Rates are calculated using official IATA air freight volumetric formula:
                <code className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded font-mono ml-1 font-bold">
                  (Length × Width × Height in cm) / 5000
                </code>.
                Chargeable weight is whichever is greater between gross weight and volumetric weight. Never invented.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Input Form */}
              <div className="space-y-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Cargo Parameters</h3>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Product Wholesale Cost (USD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.1"
                    value={calcUnitCost}
                    onChange={e => setCalcUnitCost(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Actual Gross Weight (kg)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min="0.1"
                    value={calcWeight}
                    onChange={e => setCalcWeight(Number(e.target.value) || 0.1)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Package Dimensions (cm) - Length × Width × Height
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="number"
                      placeholder="L (cm)"
                      value={calcLength}
                      onChange={e => setCalcLength(Number(e.target.value) || 1)}
                      className="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-center"
                    />
                    <input
                      type="number"
                      placeholder="W (cm)"
                      value={calcWidth}
                      onChange={e => setCalcWidth(Number(e.target.value) || 1)}
                      className="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-center"
                    />
                    <input
                      type="number"
                      placeholder="H (cm)"
                      value={calcHeight}
                      onChange={e => setCalcHeight(Number(e.target.value) || 1)}
                      className="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-center"
                    />
                  </div>
                </div>
              </div>

              {/* Output Result */}
              {calcQuote && (
                <div className="p-5 rounded-xl bg-orange-50 border border-orange-200 space-y-4">
                  <h3 className="text-xs font-black text-orange-950 uppercase tracking-wider">
                    Official Quotation & Final Price to Rwanda
                  </h3>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Chargeable Weight:</span>
                      <span className="font-mono font-bold text-slate-900">
                        {calcQuote.quote.chargeableWeightKg} kg
                        {calcQuote.quote.chargeableWeightKg > calcWeight && (
                          <span className="text-[10px] text-amber-700 ml-1">(Volumetric applied)</span>
                        )}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-600">Logistics Carrier:</span>
                      <span className="font-semibold text-slate-900">{calcQuote.quote.serviceName}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-600">Delivery Timeline:</span>
                      <span className="font-semibold text-slate-900">{calcQuote.quote.estimatedDeliveryDays}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-600">Air Freight Cost:</span>
                      <span className="font-mono font-bold text-orange-700">
                        ${calcQuote.quote.costUsd} USD ({calcQuote.quote.costRwf.toLocaleString()} RWF)
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-600">Product Cost in RWF:</span>
                      <span className="font-mono font-bold text-slate-800">
                        {calcQuote.pricing.productCostRwf.toLocaleString()} RWF
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-600">Total Landed Cost:</span>
                      <span className="font-mono font-bold text-slate-900">
                        {calcQuote.pricing.totalCostRwf.toLocaleString()} RWF
                      </span>
                    </div>

                    <div className="pt-3 border-t border-orange-200 flex justify-between items-center">
                      <div>
                        <p className="text-xs font-black text-orange-950">Customer Selling Price</p>
                        <p className="text-[10px] text-emerald-700 font-bold">Includes exact 10% markup</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-orange-600 font-mono">
                          {calcQuote.pricing.sellingPrice.toLocaleString()} RWF
                        </p>
                        <p className="text-[10px] text-emerald-600 font-mono font-bold">
                          +{calcQuote.pricing.profitMargin.toLocaleString()} RWF Profit
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 bg-white rounded-lg border border-orange-200 text-center">
                    <p className="text-[11px] font-mono font-bold text-orange-900">
                      Formula: {calcQuote.pricing.formulaDisplay}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: ALIBABA ORDERS & FULFILLMENT */}
      {subTab === 'orders' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-slate-900">
                Alibaba Logistics Customer Orders ({aliOrders.length})
              </h2>
              <p className="text-xs text-slate-500">
                Approve dispatch for orders containing items sourced via Alibaba Wholesale.
              </p>
            </div>
            <button
              type="button"
              onClick={fetchAlibabaOrders}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
            >
              Refresh Orders
            </button>
          </div>

          {aliOrders.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <FileText className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">No Alibaba orders placed yet</p>
              <p className="text-xs text-slate-400">
                Customer purchases of Alibaba items via Mobile Money will appear here for fulfillment approval.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200/60 uppercase font-bold text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Order #</th>
                    <th className="py-3 px-4">Customer & Location</th>
                    <th className="py-3 px-4">Alibaba Items</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Payment</th>
                    <th className="py-3 px-4">Fulfillment Status</th>
                    <th className="py-3 px-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {aliOrders.map(order => (
                    <tr key={order.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        #{order.orderNumber}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-800">{order.customerName}</p>
                        <p className="text-[10px] text-slate-400">{order.customerPhone}</p>
                        <p className="text-[10px] text-slate-500 truncate max-w-xs">{order.deliveryAddress}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-800">{order.aliItemCount} Alibaba item(s)</p>
                        <p className="text-[10px] text-slate-500">Air Express to Kigali</p>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {order.totalAmount?.toLocaleString()} RWF
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          order.paymentStatus === 'Paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {order.paymentStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[11px] font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                          {order.alibabaFulfillmentStatus}
                        </span>
                        {order.alibabaTrackingNumber && (
                          <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                            Track: {order.alibabaTrackingNumber}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {order.alibabaFulfillmentStatus !== 'Approved for Alibaba Logistics Air Freight' ? (
                          <button
                            type="button"
                            onClick={() => handleApproveOrder(order.id)}
                            disabled={approvingOrderId === order.id}
                            className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg text-xs cursor-pointer disabled:opacity-50 transition-colors"
                          >
                            {approvingOrderId === order.id ? 'Approving...' : 'Approve Freight Dispatch'}
                          </button>
                        ) : (
                          <span className="text-emerald-600 font-bold text-xs flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Dispatched
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 5: API CREDENTIALS & SETTINGS */}
      {subTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-6 max-w-2xl">
          <div>
            <h2 className="text-base font-black text-slate-900">
              Alibaba API Credentials & Logistics Routing
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Configure your Alibaba Open Platform API keys. Credentials are encrypted and securely stored.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Alibaba App Key
              </label>
              <input
                type="text"
                placeholder="e.g. 214287806863 or Alibaba Open Platform Key"
                value={appKeyInput}
                onChange={e => setAppKeyInput(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono text-xs focus:outline-hidden focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Alibaba App Secret
              </label>
              <input
                type="password"
                placeholder="Enter App Secret (masked when saved)"
                value={appSecretInput}
                onChange={e => setAppSecretInput(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono text-xs focus:outline-hidden focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Admin Notification Email
              </label>
              <input
                type="email"
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                USD to RWF Exchange Rate (Rwandan Franc)
              </label>
              <input
                type="number"
                min="1"
                value={usdRateInput}
                onChange={e => setUsdRateInput(Number(e.target.value) || 1435)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono text-xs focus:outline-hidden focus:border-orange-500"
              />
            </div>

            {/* Locked Markup Formula Info */}
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Strict Markup Formula (Locked by User Request)</span>
              </div>
              <p className="text-[11px] text-emerald-700 font-mono">
                Selling Price = (Product Cost + Shipping Cost) × 1.10
              </p>
              <p className="text-[10px] text-emerald-600">
                10% markup is automatically computed on landed total cost.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testingConnection}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs cursor-pointer disabled:opacity-50"
            >
              {testingConnection ? 'Testing Gateway...' : 'Test Connection'}
            </button>

            <button
              type="submit"
              disabled={savingSettings}
              className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white font-black rounded-xl text-xs shadow-xs cursor-pointer disabled:opacity-50"
            >
              {savingSettings ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      )}

      {/* FULL PRODUCT SPECS & INSPECTION MODAL */}
      {previewProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-4 sticky top-0 bg-white z-10">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-800 text-[11px] font-bold mb-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-orange-600" />
                  <span>Original Verified Alibaba Specifications</span>
                </div>
                <h3 className="text-base font-black text-slate-900 line-clamp-2">
                  {previewProduct.name}
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  SKU: {previewProduct.sku} · Category: {previewProduct.category}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setPreviewProduct(null)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Image Gallery */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Original Alibaba High-Resolution Image Gallery ({previewProduct.images?.length || 1})
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {(previewProduct.images && previewProduct.images.length > 0 ? previewProduct.images : [previewProduct.imageUrl || '/logo.png']).map((img, idx) => (
                    <a
                      key={idx}
                      href={img}
                      target="_blank"
                      rel="noreferrer"
                      className="group relative aspect-square rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 block"
                    >
                      <img
                        src={img}
                        alt={`${previewProduct.name} ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded font-mono">
                        #{idx + 1}
                      </span>
                    </a>
                  ))}
                </div>
              </div>

              {/* Formula & Cost Breakdown */}
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-emerald-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Landed Price Formula: Selling Price = (Product Cost + Shipping Cost) × 1.10
                  </span>
                  <span className="font-mono text-xs font-black text-emerald-800 bg-white px-2.5 py-1 rounded-md border border-emerald-200">
                    Strict +10% Markup
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                    <span className="text-[10px] text-slate-500 block">Wholesale Price (USD)</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      ${previewProduct.alibabaOriginalCostUsd || 10} USD
                    </span>
                    <span className="text-[10px] text-slate-400 block font-mono">
                      ≈ {((previewProduct.alibabaOriginalCostUsd || 10) * (usdRateInput || 1435)).toLocaleString()} RWF
                    </span>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                    <span className="text-[10px] text-slate-500 block">Kigali Freight (KGL)</span>
                    <span className="font-mono font-bold text-purple-700 text-sm">
                      +{(previewProduct.alibabaShippingCostRwf || 0).toLocaleString()} RWF
                    </span>
                    <span className="text-[10px] text-slate-400 block font-mono">
                      {previewProduct.alibabaWeightKg || 1} kg ({previewProduct.alibabaShippingMethod || 'Air Express'})
                    </span>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                    <span className="text-[10px] text-slate-500 block">Total Landed Cost</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      {(previewProduct.costPrice || 0).toLocaleString()} RWF
                    </span>
                    <span className="text-[10px] text-slate-400 block">Product + Kigali Cargo</span>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-emerald-200 bg-emerald-100/30">
                    <span className="text-[10px] text-emerald-800 font-bold block">Selling Price (+10%)</span>
                    <span className="font-mono font-black text-emerald-700 text-base">
                      {(previewProduct.price || 0).toLocaleString()} RWF
                    </span>
                    <span className="text-[10px] text-emerald-600 block font-bold">
                      Profit: +{(previewProduct.profitMargin || 0).toLocaleString()} RWF
                    </span>
                  </div>
                </div>
              </div>

              {/* Supplier & Logistics Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <h5 className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Building className="w-4 h-4 text-orange-500" />
                    Supplier & Trade Assurance
                  </h5>
                  <p className="font-semibold text-slate-800">{previewProduct.alibabaSupplierName || 'Alibaba Verified Manufacturer'}</p>
                  <p className="text-slate-500">{previewProduct.alibabaSupplierLocation || 'China'}</p>
                  <div className="pt-2 flex flex-wrap gap-2 text-[11px]">
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded">
                      ✓ Trade Assurance 100% Protected
                    </span>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-bold rounded">
                      MOQ: {previewProduct.alibabaMoq || 1} {previewProduct.unit || 'piece'}
                    </span>
                    <span className="px-2 py-0.5 bg-slate-200 text-slate-800 font-bold rounded">
                      Lead Time: {previewProduct.alibabaLeadTimeDays || 7} days
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <h5 className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-purple-600" />
                    Packaging & Kigali Customs Routing
                  </h5>
                  <p className="text-slate-600">
                    Package Weight: <span className="font-bold text-slate-900">{previewProduct.alibabaWeightKg || 1} kg</span>
                  </p>
                  {previewProduct.alibabaDimensionsCm && (
                    <p className="text-slate-600">
                      Dimensions: <span className="font-bold text-slate-900">{previewProduct.alibabaDimensionsCm.length} × {previewProduct.alibabaDimensionsCm.width} × {previewProduct.alibabaDimensionsCm.height} cm</span>
                    </p>
                  )}
                  <p className="text-slate-600">
                    Destination: <span className="font-bold text-slate-900">Kigali International Airport (KGL) Hub & Gikondo MAGERWA Customs</span>
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Estimated Transit: 7-12 business days via official air freight route.
                  </p>
                </div>
              </div>

              {/* Original Unmodified Description */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Original Unmodified Alibaba Product Description & Specifications
                </h4>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 font-mono whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                  {previewProduct.description}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-slate-100 flex items-center justify-between bg-slate-50/60 sticky bottom-0 rounded-b-3xl">
              <button
                type="button"
                onClick={() => setPreviewProduct(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                {previewProduct.reviewStatus !== 'Approved' && (
                  <button
                    type="button"
                    onClick={() => {
                      handleApproveProduct(previewProduct.id);
                      setPreviewProduct(null);
                    }}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Approve & Publish to Store</span>
                  </button>
                )}

                {previewProduct.reviewStatus !== 'Rejected' && (
                  <button
                    type="button"
                    onClick={() => {
                      handleRejectProduct(previewProduct.id);
                      setPreviewProduct(null);
                    }}
                    className="px-4 py-2 bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Reject & Hide
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
