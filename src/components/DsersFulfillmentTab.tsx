import React, { useState, useMemo, useEffect } from 'react';
import {
  Globe, Check, CheckCircle2, XCircle, AlertCircle, Truck, ExternalLink,
  Download, Edit, Search, Filter, Copy, Plus, Clock, ArrowUpRight,
  ShoppingBag, Package, RefreshCw, FileSpreadsheet, ChevronRight, X,
  AlertTriangle, ShieldCheck, Send, Info, Eye, KeyRound, Lock, Zap
} from 'lucide-react';
import { Product, Order, Category, DsersConfig } from '../types.ts';
import { api } from '../services/api.ts';
import {
  exportProductsToDsersProductTemplate,
  exportOrdersToDsersOrderTemplate
} from '../utils/spreadsheet.ts';

interface DsersFulfillmentTabProps {
  products: Product[];
  orders: Order[];
  categories: Category[];
  onRefreshData: () => Promise<void>;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  onOpenProductEdit?: (product: Product) => void;
}

export const DsersFulfillmentTab: React.FC<DsersFulfillmentTabProps> = ({
  products,
  orders,
  categories,
  onRefreshData,
  showToast,
  onOpenProductEdit
}) => {
  // Sub-navigation view inside DSers tab
  const [activeSubTab, setActiveSubTab] = useState<'mapping' | 'approval' | 'tracking'>('approval');

  // Supplier Mapping State
  const [mappingSearch, setMappingSearch] = useState('');
  const [mappingStatusFilter, setMappingStatusFilter] = useState<'all' | 'mapped' | 'unmapped'>('all');
  const [editingMappingProduct, setEditingMappingProduct] = useState<Product | null>(null);
  const [mappingForm, setMappingForm] = useState({
    aliExpressUrl: '',
    supplierVariant: '',
    supplierSku: '',
    costPrice: ''
  });
  const [savingMapping, setSavingMapping] = useState(false);

  // Manual Approval State
  const [approvalSearch, setApprovalSearch] = useState('');
  const [approvalFilter, setApprovalFilter] = useState<'all' | 'pending' | 'approved' | 'submitted' | 'rejected'>('pending');
  const [selectedOrderForApproval, setSelectedOrderForApproval] = useState<Order | null>(null);
  const [approvalDecision, setApprovalDecision] = useState<'Approved' | 'Rejected' | 'Submitted to Supplier'>('Approved');
  const [approvalNote, setApprovalNote] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [submittingApproval, setSubmittingApproval] = useState(false);

  // Tracking Updates State
  const [trackingSearch, setTrackingSearch] = useState('');
  const [trackingFilter, setTrackingFilter] = useState<'all' | 'needs_tracking' | 'has_tracking'>('all');
  const [editingTrackingOrder, setEditingTrackingOrder] = useState<Order | null>(null);
  const [trackingForm, setTrackingForm] = useState({
    trackingNumber: '',
    trackingCarrier: 'AliExpress Standard Shipping',
    trackingUrl: '',
    updateOrderStatus: true,
    notes: ''
  });
  const [savingTracking, setSavingTracking] = useState(false);
  const [copiedTrackingId, setCopiedTrackingId] = useState<string | null>(null);

  // Quick order detail view
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);

  // DSers API Gateway Connection State
  const [dsersConfig, setDsersConfig] = useState<DsersConfig | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [dsersApiKeyInput, setDsersApiKeyInput] = useState('');
  const [testingConnection, setTestingConnection] = useState(false);

  useEffect(() => {
    api.adminGetDsersConfig().then(cfg => {
      if (cfg) {
        setDsersConfig(cfg);
        setDsersApiKeyInput(cfg.apiKey || '');
      }
    }).catch(() => {});
  }, []);

  const handleTestAndSaveDsers = async () => {
    setTestingConnection(true);
    try {
      const res = await api.adminTestDsersConnection(dsersApiKeyInput.trim());
      if (res.success && res.status === 'connected') {
        showToast(res.message, 'success');
        if (res.config) setDsersConfig(res.config);
        setShowConfigModal(false);
      } else {
        showToast(res.message || 'Connection test failed. Enter a valid DSers API token.', 'error');
        if (res.config) setDsersConfig(res.config);
      }
    } catch (err: any) {
      showToast(err.message || 'Error connecting to DSers API', 'error');
    } finally {
      setTestingConnection(false);
    }
  };

  // -------------------------------------------------------------
  // COMPUTED STATS
  // -------------------------------------------------------------
  const stats = useMemo(() => {
    const totalProducts = products.length;
    const mappedProducts = products.filter(p => Boolean(p.aliExpressUrl || p.supplierProductUrl)).length;
    const unmappedProducts = totalProducts - mappedProducts;
    const mappingPercent = totalProducts > 0 ? Math.round((mappedProducts / totalProducts) * 100) : 0;

    const nonCancelledOrders = orders.filter(o => o.status !== 'Cancelled');
    const pendingApprovalOrders = nonCancelledOrders.filter(o => (o.supplierApprovalStatus || 'Pending Review') === 'Pending Review');
    const approvedOrders = nonCancelledOrders.filter(o => o.supplierApprovalStatus === 'Approved' || o.supplierApprovalStatus === 'Submitted to Supplier');
    const ordersWithTracking = nonCancelledOrders.filter(o => Boolean(o.trackingNumber));

    return {
      totalProducts,
      mappedProducts,
      unmappedProducts,
      mappingPercent,
      totalOrders: nonCancelledOrders.length,
      pendingApproval: pendingApprovalOrders.length,
      approved: approvedOrders.length,
      withTracking: ordersWithTracking.length
    };
  }, [products, orders]);

  // Product mapping list
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const isMapped = Boolean(p.aliExpressUrl || p.supplierProductUrl);
      if (mappingStatusFilter === 'mapped' && !isMapped) return false;
      if (mappingStatusFilter === 'unmapped' && isMapped) return false;

      if (mappingSearch.trim()) {
        const q = mappingSearch.toLowerCase().trim();
        const matchName = p.name.toLowerCase().includes(q);
        const matchSku = (p.sku || '').toLowerCase().includes(q);
        const matchId = p.id.toLowerCase().includes(q);
        const matchUrl = (p.aliExpressUrl || '').toLowerCase().includes(q);
        return matchName || matchSku || matchId || matchUrl;
      }
      return true;
    });
  }, [products, mappingStatusFilter, mappingSearch]);

  // Orders list for Manual Approval
  const filteredApprovalOrders = useMemo(() => {
    return orders.filter(o => {
      if (o.status === 'Cancelled') return false;
      const status = o.supplierApprovalStatus || 'Pending Review';

      if (approvalFilter === 'pending' && status !== 'Pending Review') return false;
      if (approvalFilter === 'approved' && status !== 'Approved') return false;
      if (approvalFilter === 'submitted' && status !== 'Submitted to Supplier') return false;
      if (approvalFilter === 'rejected' && status !== 'Rejected') return false;

      if (approvalSearch.trim()) {
        const q = approvalSearch.toLowerCase().trim();
        const matchNum = o.orderNumber.toLowerCase().includes(q);
        const matchCust = o.customerName.toLowerCase().includes(q);
        const matchPhone = o.customerPhone.toLowerCase().includes(q);
        return matchNum || matchCust || matchPhone;
      }
      return true;
    });
  }, [orders, approvalFilter, approvalSearch]);

  // Orders list for Tracking Updates
  const filteredTrackingOrders = useMemo(() => {
    return orders.filter(o => {
      if (o.status === 'Cancelled') return false;
      const hasTracking = Boolean(o.trackingNumber);

      if (trackingFilter === 'needs_tracking' && hasTracking) return false;
      if (trackingFilter === 'has_tracking' && !hasTracking) return false;

      if (trackingSearch.trim()) {
        const q = trackingSearch.toLowerCase().trim();
        const matchNum = o.orderNumber.toLowerCase().includes(q);
        const matchCust = o.customerName.toLowerCase().includes(q);
        const matchTrack = (o.trackingNumber || '').toLowerCase().includes(q);
        return matchNum || matchCust || matchTrack;
      }
      return true;
    });
  }, [orders, trackingFilter, trackingSearch]);

  // -------------------------------------------------------------
  // ACTIONS: SUPPLIER MAPPING
  // -------------------------------------------------------------
  const handleOpenMappingModal = (product: Product) => {
    setEditingMappingProduct(product);
    setMappingForm({
      aliExpressUrl: product.aliExpressUrl || product.supplierProductUrl || '',
      supplierVariant: product.supplierVariant || '',
      supplierSku: product.supplierSku || '',
      costPrice: product.costPrice !== undefined ? String(product.costPrice) : ''
    });
  };

  const handleSaveMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMappingProduct) return;

    setSavingMapping(true);
    try {
      await api.updateSupplierMapping(editingMappingProduct.id, {
        aliExpressUrl: mappingForm.aliExpressUrl.trim(),
        supplierVariant: mappingForm.supplierVariant.trim(),
        supplierSku: mappingForm.supplierSku.trim(),
        costPrice: mappingForm.costPrice !== '' ? Number(mappingForm.costPrice) : undefined
      });
      showToast(`Supplier mapping saved for ${editingMappingProduct.sku || editingMappingProduct.name}`);
      setEditingMappingProduct(null);
      await onRefreshData();
    } catch (err: any) {
      showToast(`Error: ${err.message || 'Failed to save mapping'}`);
    } finally {
      setSavingMapping(false);
    }
  };

  // -------------------------------------------------------------
  // ACTIONS: MANUAL ORDER APPROVAL
  // -------------------------------------------------------------
  const handleOpenApprovalModal = (order: Order, defaultDecision: 'Approved' | 'Rejected' | 'Submitted to Supplier' = 'Approved') => {
    setSelectedOrderForApproval(order);
    setApprovalDecision(defaultDecision);
    setApprovalNote('');
    setRejectionReason('');
  };

  const handleQuickApprove = async (order: Order) => {
    try {
      await api.approveOrderForSupplier(order.id, 'Approved', {
        note: 'Quick manual approval by administrator for DSers fulfillment'
      });
      showToast(`Order #${order.orderNumber} approved for DSers!`);
      await onRefreshData();
    } catch (err: any) {
      showToast(`Error: ${err.message || 'Failed to approve order'}`);
    }
  };

  const handleSubmitApprovalDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForApproval) return;

    if (approvalDecision === 'Rejected' && !rejectionReason.trim()) {
      showToast('Please specify a rejection reason for the supplier / customer record.');
      return;
    }

    setSubmittingApproval(true);
    try {
      await api.approveOrderForSupplier(selectedOrderForApproval.id, approvalDecision, {
        rejectionReason: rejectionReason.trim() || undefined,
        note: approvalNote.trim() || undefined
      });
      showToast(`Order #${selectedOrderForApproval.orderNumber} updated: ${approvalDecision}`);
      setSelectedOrderForApproval(null);
      await onRefreshData();
    } catch (err: any) {
      showToast(`Error: ${err.message || 'Failed to update approval status'}`);
    } finally {
      setSubmittingApproval(false);
    }
  };

  // -------------------------------------------------------------
  // ACTIONS: TRACKING UPDATES
  // -------------------------------------------------------------
  const handleOpenTrackingModal = (order: Order) => {
    setEditingTrackingOrder(order);
    setTrackingForm({
      trackingNumber: order.trackingNumber || '',
      trackingCarrier: order.trackingCarrier || 'AliExpress Standard Shipping',
      trackingUrl: order.trackingUrl || '',
      updateOrderStatus: true,
      notes: ''
    });
  };

  const handleSaveTracking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTrackingOrder) return;

    if (!trackingForm.trackingNumber.trim()) {
      showToast('Please enter a valid parcel tracking number.');
      return;
    }

    setSavingTracking(true);
    try {
      await api.updateOrderTracking(editingTrackingOrder.id, {
        trackingNumber: trackingForm.trackingNumber.trim(),
        trackingCarrier: trackingForm.trackingCarrier.trim(),
        trackingUrl: trackingForm.trackingUrl.trim() || undefined,
        updateOrderStatus: trackingForm.updateOrderStatus,
        notes: trackingForm.notes.trim() || undefined
      });
      showToast(`Tracking updated for Order #${editingTrackingOrder.orderNumber}`);
      setEditingTrackingOrder(null);
      await onRefreshData();
    } catch (err: any) {
      showToast(`Error: ${err.message || 'Failed to save tracking number'}`);
    } finally {
      setSavingTracking(false);
    }
  };

  // -------------------------------------------------------------
  // ACTIONS: CSV & EXCEL EXPORTS
  // -------------------------------------------------------------
  const handleExportProductTemplate = (format: 'csv' | 'xlsx' = 'csv') => {
    const result = exportProductsToDsersProductTemplate(products, categories, format);
    showToast(
      `Exported ${result.totalCount} products into DSers product template (${result.mappedCount} mapped, ${result.unmappedCount} unmapped).`
    );
  };

  const handleExportOrderTemplate = (format: 'csv' | 'xlsx' = 'csv', onlyApproved = true) => {
    const result = exportOrdersToDsersOrderTemplate(orders, products, {
      onlyApproved,
      format
    });

    if (result.orderCount === 0) {
      showToast('No eligible customer orders to export. Approve orders first!');
      return;
    }

    if (result.unmappedItemsCount > 0) {
      showToast(
        `Exported ${result.orderCount} orders (${result.exportedCount} items) to DSers. Note: ${result.unmappedItemsCount} items are not mapped to AliExpress yet.`
      );
    } else {
      showToast(
        `Successfully exported ${result.orderCount} approved orders (${result.exportedCount} items) to DSers template!`
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-7 text-white shadow-xl relative overflow-hidden border border-slate-800">
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              <span>Official DSers & AliExpress Fulfillment Hub</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              DSers Product Mapping & Order Fulfillment
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              DSers requires product mapping before orders can be fulfilled. Its CSV workflow uses matching
              product IDs and SKUs across product and order imports. Review orders manually and push live tracking updates.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => handleExportProductTemplate('csv')}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
              title="Export product IDs, SKUs and supplier URLs into DSers product template (CSV)"
            >
              <Download className="w-4 h-4" />
              <span>Export Products (CSV)</span>
            </button>

            <button
              onClick={() => handleExportOrderTemplate('csv', true)}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
              title="Export eligible customer orders into the DSers order template (CSV)"
            >
              <Download className="w-4 h-4 text-indigo-200" />
              <span>Export Orders (CSV)</span>
            </button>

            <button
              onClick={() => onRefreshData()}
              className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors cursor-pointer"
              title="Refresh live data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 mt-6 border-t border-slate-800/80">
          <div className="bg-white/5 rounded-2xl p-3.5 border border-white/5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Store Catalog</span>
            <div className="text-xl sm:text-2xl font-black text-white font-mono mt-0.5">
              {stats.totalProducts} <span className="text-xs text-slate-400 font-sans font-normal">SKUs</span>
            </div>
            <div className="text-[11px] text-emerald-400 font-medium mt-1">
              {stats.mappedProducts} mapped ({stats.mappingPercent}%)
            </div>
          </div>

          <div className="bg-white/5 rounded-2xl p-3.5 border border-white/5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Awaiting Manual Approval</span>
            <div className="text-xl sm:text-2xl font-black text-amber-400 font-mono mt-0.5">
              {stats.pendingApproval}
            </div>
            <div className="text-[11px] text-slate-300 font-medium mt-1">
              Requires admin review
            </div>
          </div>

          <div className="bg-white/5 rounded-2xl p-3.5 border border-white/5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Approved for DSers</span>
            <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono mt-0.5">
              {stats.approved}
            </div>
            <div className="text-[11px] text-slate-300 font-medium mt-1">
              Ready for order export
            </div>
          </div>

          <div className="bg-white/5 rounded-2xl p-3.5 border border-white/5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">With Active Tracking</span>
            <div className="text-xl sm:text-2xl font-black text-blue-400 font-mono mt-0.5">
              {stats.withTracking}
            </div>
            <div className="text-[11px] text-slate-300 font-medium mt-1">
              Customer tracking active
            </div>
          </div>
        </div>
      </div>

      {/* Live DSers Official API Connection Status Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            dsersConfig?.isConnected ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
          }`}>
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-black text-slate-900 text-sm">DSers & AliExpress API Gateway</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                dsersConfig?.isConnected
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-100 text-slate-600'
              }`}>
                {dsersConfig?.isConnected ? '● Connected & Verified' : '○ Disconnected / Token Required'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {dsersConfig?.isConnected
                ? `Official DSers API connected (${dsersConfig.apiKey || 'Verified'}). Orders approved by administrators can be automatically routed for supplier fulfillment.`
                : 'No active API token connected. Orders must be exported via CSV or connect your DSers API credentials below.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowConfigModal(true)}
          className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs whitespace-nowrap"
        >
          <KeyRound className="w-3.5 h-3.5 text-orange-400" />
          <span>{dsersConfig?.isConnected ? 'Manage API Key' : 'Connect DSers API'}</span>
        </button>
      </div>

      {/* Workflow Navigation Sub-tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-slate-200">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setActiveSubTab('approval')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'approval'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>Manual Order Approval</span>
            {stats.pendingApproval > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                {stats.pendingApproval}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('mapping')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'mapping'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Globe className="w-4 h-4 text-emerald-400" />
            <span>Product & Supplier Mapping</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
              {stats.mappedProducts}/{stats.totalProducts}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('tracking')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'tracking'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Truck className="w-4 h-4 text-blue-400" />
            <span>Tracking Number Updates</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
              {stats.withTracking}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeSubTab === 'mapping' && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleExportProductTemplate('csv')}
                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 cursor-pointer"
                title="Download CSV"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>CSV</span>
              </button>
              <button
                onClick={() => handleExportProductTemplate('xlsx')}
                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 cursor-pointer"
                title="Download Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Excel</span>
              </button>
            </div>
          )}

          {activeSubTab === 'approval' && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleExportOrderTemplate('csv', true)}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 flex items-center gap-1.5 cursor-pointer"
                title="Export approved orders to DSers order template CSV"
              >
                <Download className="w-3.5 h-3.5 text-indigo-600" />
                <span>Export Approved (CSV)</span>
              </button>
              <button
                onClick={() => handleExportOrderTemplate('xlsx', true)}
                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 cursor-pointer"
                title="Export approved orders to Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Excel</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* SUB-TAB 1: MANUAL ORDER APPROVAL (Workflow Step 2)        */}
      {/* ========================================================= */}
      {activeSubTab === 'approval' && (
        <div className="space-y-4 animate-in fade-in">
          {/* Information Notice */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-xs text-amber-900">
            <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-extrabold text-amber-950 block">
                Manual Order Review Requirement
              </span>
              <p>
                Each customer order requires manual verification and admin approval before being submitted to
                AliExpress or exported into the DSers CSV order template. Ensure mobile money payment has been
                received, customer address is accurate, and all items are properly mapped to supplier SKUs.
              </p>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 flex flex-wrap gap-2.5 items-center justify-between text-xs">
            <div className="flex-1 min-w-[220px] relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={approvalSearch}
                onChange={(e) => setApprovalSearch(e.target.value)}
                placeholder="Search by order CRM-..., customer name, or phone..."
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 font-bold text-xs">
                {(['pending', 'approved', 'submitted', 'rejected', 'all'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setApprovalFilter(f)}
                    className={`px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${
                      approvalFilter === f
                        ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {f === 'pending'
                      ? `Pending Review (${orders.filter(o => o.status !== 'Cancelled' && (o.supplierApprovalStatus || 'Pending Review') === 'Pending Review').length})`
                      : f === 'approved'
                      ? 'Approved'
                      : f === 'submitted'
                      ? 'Submitted'
                      : f === 'rejected'
                      ? 'Rejected'
                      : 'All'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="py-3 px-4">Order #</th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Customer & Location</th>
                    <th className="py-3 px-3">Ordered Items</th>
                    <th className="py-3 px-3">Supplier Mapping Status</th>
                    <th className="py-3 px-3">Amount</th>
                    <th className="py-3 px-3">Approval Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredApprovalOrders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <ShoppingBag className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                        <div className="font-bold text-slate-600">No customer orders matching this filter</div>
                        <p className="text-xs text-slate-400 mt-1">All orders in this queue have been processed</p>
                      </td>
                    </tr>
                  ) : (
                    filteredApprovalOrders.map(order => {
                      const approvalStatus = order.supplierApprovalStatus || 'Pending Review';
                      const allItemsMapped = order.items.every(it => {
                        const prod = products.find(p => p.id === it.productId);
                        return Boolean(it.aliExpressUrl || prod?.aliExpressUrl || prod?.supplierProductUrl);
                      });

                      return (
                        <tr key={order.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                            <button
                              onClick={() => setViewingOrder(order)}
                              className="text-orange-600 hover:text-orange-700 underline cursor-pointer"
                            >
                              {order.orderNumber}
                            </button>
                          </td>
                          <td className="py-3.5 px-3 text-slate-500 font-mono text-[11px]">
                            {new Date(order.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td className="py-3.5 px-3">
                            <div className="font-bold text-slate-800">{order.customerName}</div>
                            <div className="text-[11px] text-slate-500">{order.customerPhone}</div>
                            <div className="text-[10px] text-slate-400 line-clamp-1">{order.deliveryLocation}</div>
                          </td>
                          <td className="py-3.5 px-3">
                            <div className="space-y-1">
                              {order.items.slice(0, 2).map((it, idx) => (
                                <div key={idx} className="flex items-center gap-1.5 text-[11px] text-slate-700 font-medium">
                                  <span className="font-bold text-slate-900 font-mono">{it.quantity}x</span>
                                  <span className="line-clamp-1">{it.productName}</span>
                                </div>
                              ))}
                              {order.items.length > 2 && (
                                <span className="text-[10px] text-slate-400">+{order.items.length - 2} more item(s)</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-3">
                            {allItemsMapped ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>100% Mapped</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                                <span>Missing Mapping</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-3 font-mono font-bold text-slate-900">
                            {order.totalAmount.toLocaleString()} FRW
                            <div className="text-[10px] font-normal text-slate-400">{order.paymentStatus}</div>
                          </td>
                          <td className="py-3.5 px-3">
                            <span
                              className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                approvalStatus === 'Approved'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : approvalStatus === 'Submitted to Supplier'
                                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                  : approvalStatus === 'Rejected'
                                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                  : 'bg-amber-100 text-amber-800 border border-amber-200'
                              }`}
                            >
                              {approvalStatus}
                            </span>
                            {order.supplierApprovedBy && (
                              <div className="text-[9px] text-slate-400 mt-0.5">by {order.supplierApprovedBy}</div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {approvalStatus === 'Pending Review' ? (
                                <>
                                  <button
                                    onClick={() => handleQuickApprove(order)}
                                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-2xs flex items-center gap-1 cursor-pointer transition-colors"
                                    title="1-click approve for DSers order fulfillment"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Approve</span>
                                  </button>
                                  <button
                                    onClick={() => handleOpenApprovalModal(order, 'Rejected')}
                                    className="px-2 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 cursor-pointer transition-colors"
                                    title="Reject order"
                                  >
                                    Reject
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => handleOpenApprovalModal(order, approvalStatus as any)}
                                  className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer transition-colors"
                                >
                                  Update
                                </button>
                              )}

                              <button
                                onClick={() => handleOpenTrackingModal(order)}
                                className="p-1.5 rounded-lg border border-slate-200 hover:bg-blue-50 text-slate-600 hover:text-blue-600 cursor-pointer transition-colors"
                                title="Add or edit tracking number"
                              >
                                <Truck className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUB-TAB 2: SUPPLIER MAPPING (Workflow Step 1)             */}
      {/* ========================================================= */}
      {activeSubTab === 'mapping' && (
        <div className="space-y-4 animate-in fade-in">
          {/* Information Notice */}
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3 text-xs text-emerald-950">
            <Globe className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-extrabold text-emerald-900 block">
                DSers Product & Variant Mapping Instructions
              </span>
              <p>
                Save the AliExpress product URL and exact supplier variant (e.g. "Color: Black, Size: XL") for each store SKU.
                When exporting to DSers, the system pairs your Store Product ID and SKU with the AliExpress URL.
              </p>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 flex flex-wrap gap-2.5 items-center justify-between text-xs">
            <div className="flex-1 min-w-[220px] relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={mappingSearch}
                onChange={(e) => setMappingSearch(e.target.value)}
                placeholder="Search by product name, SKU, or AliExpress URL..."
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 font-bold text-xs">
                {(['all', 'mapped', 'unmapped'] as const).map(status => (
                  <button
                    key={status}
                    onClick={() => setMappingStatusFilter(status)}
                    className={`px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${
                      mappingStatusFilter === status
                        ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {status === 'all'
                      ? `All (${products.length})`
                      : status === 'mapped'
                      ? `Mapped (${stats.mappedProducts})`
                      : `Unmapped (${stats.unmappedProducts})`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Mapping Table */}
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="py-3 px-4">Store Product / SKU</th>
                    <th className="py-3 px-3">Price / Cost</th>
                    <th className="py-3 px-3">AliExpress Product URL</th>
                    <th className="py-3 px-3">Exact Supplier Variant</th>
                    <th className="py-3 px-3">Supplier SKU</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <Package className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                        <div className="font-bold text-slate-600">No products found matching your filter</div>
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map(product => {
                      const isMapped = Boolean(product.aliExpressUrl || product.supplierProductUrl);
                      const displayUrl = product.aliExpressUrl || product.supplierProductUrl || '';

                      return (
                        <tr key={product.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="w-10 h-10 object-cover rounded-xl border border-slate-200 shrink-0"
                              />
                              <div className="max-w-xs">
                                <span className="font-bold text-slate-900 block line-clamp-1">{product.name}</span>
                                <div className="flex items-center gap-1.5 mt-0.5 text-[10px]">
                                  <span className="font-mono font-bold text-slate-500">{product.sku}</span>
                                  <span className="text-slate-300">·</span>
                                  <span className="text-slate-400 font-mono">ID: {product.id}</span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-3">
                            <div className="font-bold text-slate-900 font-mono">{product.price.toLocaleString()} FRW</div>
                            {product.costPrice ? (
                              <div className="text-[10px] text-slate-500 font-mono">Cost: {product.costPrice.toLocaleString()} FRW</div>
                            ) : (
                              <div className="text-[10px] text-slate-400 italic">No cost set</div>
                            )}
                          </td>
                          <td className="py-3.5 px-3 max-w-[220px]">
                            {displayUrl ? (
                              <a
                                href={displayUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 hover:underline text-[11px] font-mono truncate max-w-full"
                                title={displayUrl}
                              >
                                <ExternalLink className="w-3 h-3 shrink-0" />
                                <span className="truncate">{displayUrl.replace(/^https?:\/\/(www\.)?/, '')}</span>
                              </a>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">No supplier link mapped</span>
                            )}
                          </td>
                          <td className="py-3.5 px-3">
                            {product.supplierVariant ? (
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px]">
                                {product.supplierVariant}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px] italic">Default Variant</span>
                            )}
                          </td>
                          <td className="py-3.5 px-3 font-mono text-[11px] text-slate-600">
                            {product.supplierSku || <span className="text-slate-400 italic">—</span>}
                          </td>
                          <td className="py-3.5 px-3">
                            {isMapped ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Mapped</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                                <span>Unmapped</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => handleOpenMappingModal(product)}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl flex items-center gap-1 ml-auto cursor-pointer transition-colors"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              <span>{isMapped ? 'Edit Mapping' : 'Map Item'}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUB-TAB 3: TRACKING UPDATES (Workflow Step 3)             */}
      {/* ========================================================= */}
      {activeSubTab === 'tracking' && (
        <div className="space-y-4 animate-in fade-in">
          {/* Information Notice */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-start gap-3 text-xs text-blue-950">
            <Truck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-extrabold text-blue-900 block">
                Live Parcel Tracking & Customer Updates
              </span>
              <p>
                Once an order is shipped by the AliExpress supplier or dispatched via local courier, enter the tracking number
                here. Customers can immediately view and copy their tracking code directly from their Order Tracking screen.
              </p>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 flex flex-wrap gap-2.5 items-center justify-between text-xs">
            <div className="flex-1 min-w-[220px] relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={trackingSearch}
                onChange={(e) => setTrackingSearch(e.target.value)}
                placeholder="Search by order CRM-..., customer name, or tracking #..."
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 font-bold text-xs">
                {(['all', 'needs_tracking', 'has_tracking'] as const).map(filter => (
                  <button
                    key={filter}
                    onClick={() => setTrackingFilter(filter)}
                    className={`px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${
                      trackingFilter === filter
                        ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {filter === 'all'
                      ? 'All Orders'
                      : filter === 'needs_tracking'
                      ? `Needs Tracking (${orders.filter(o => o.status !== 'Cancelled' && !o.trackingNumber).length})`
                      : `Active Tracking (${stats.withTracking})`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tracking Table */}
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="py-3 px-4">Order #</th>
                    <th className="py-3 px-3">Customer</th>
                    <th className="py-3 px-3">Carrier</th>
                    <th className="py-3 px-3">Tracking Number</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Date Added</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTrackingOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <Truck className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                        <div className="font-bold text-slate-600">No orders matching tracking filter</div>
                      </td>
                    </tr>
                  ) : (
                    filteredTrackingOrders.map(order => (
                      <tr key={order.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                          {order.orderNumber}
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="font-bold text-slate-800">{order.customerName}</div>
                          <div className="text-[11px] text-slate-500">{order.customerPhone}</div>
                        </td>
                        <td className="py-3.5 px-3 text-slate-700 font-medium">
                          {order.trackingCarrier || '—'}
                        </td>
                        <td className="py-3.5 px-3">
                          {order.trackingNumber ? (
                            <div className="flex items-center gap-1.5">
                              <code className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-mono font-bold text-xs select-all">
                                {order.trackingNumber}
                              </code>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(order.trackingNumber || '');
                                  setCopiedTrackingId(order.id);
                                  setTimeout(() => setCopiedTrackingId(null), 2000);
                                }}
                                className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 cursor-pointer"
                                title="Copy tracking number"
                              >
                                {copiedTrackingId === order.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                              {order.trackingUrl && (
                                <a
                                  href={order.trackingUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 rounded text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                                  title="Open tracking page"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
                          ) : (
                            <span className="text-amber-600 italic text-[11px] font-medium">
                              Pending shipment tracking
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              order.status === 'Delivered'
                                ? 'bg-emerald-100 text-emerald-800'
                                : order.status === 'Out for Delivery'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {order.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-slate-500 font-mono text-[11px]">
                          {order.trackingAddedAt
                            ? new Date(order.trackingAddedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })
                            : '—'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleOpenTrackingModal(order)}
                            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl border border-blue-200 flex items-center gap-1.5 ml-auto cursor-pointer transition-colors"
                          >
                            <Truck className="w-3.5 h-3.5 text-blue-600" />
                            <span>{order.trackingNumber ? 'Edit Tracking' : 'Add Tracking'}</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: EDIT SUPPLIER MAPPING                            */}
      {/* ========================================================= */}
      {editingMappingProduct && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative border border-slate-200 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">DSers Supplier Mapping</h3>
                  <p className="text-slate-500 text-xs">Link Store SKU with AliExpress Supplier</p>
                </div>
              </div>
              <button
                onClick={() => setEditingMappingProduct(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl flex items-center gap-3 border border-slate-200">
              <img
                src={editingMappingProduct.imageUrl}
                alt={editingMappingProduct.name}
                className="w-12 h-12 object-cover rounded-xl border border-slate-200"
              />
              <div className="space-y-0.5">
                <span className="font-bold text-slate-900 block line-clamp-1">{editingMappingProduct.name}</span>
                <div className="flex items-center gap-2 text-slate-500 font-mono text-[11px]">
                  <span>SKU: {editingMappingProduct.sku}</span>
                  <span>·</span>
                  <span>Price: {editingMappingProduct.price.toLocaleString()} FRW</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveMapping} className="space-y-3.5">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  AliExpress Product URL *
                </label>
                <input
                  type="url"
                  required
                  value={mappingForm.aliExpressUrl}
                  onChange={(e) => setMappingForm({ ...mappingForm, aliExpressUrl: e.target.value })}
                  placeholder="https://www.aliexpress.com/item/1005006..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-xs"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Exact AliExpress product listing link where supplier fulfills this item.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Exact Supplier Variant
                  </label>
                  <input
                    type="text"
                    value={mappingForm.supplierVariant}
                    onChange={(e) => setMappingForm({ ...mappingForm, supplierVariant: e.target.value })}
                    placeholder="e.g. Color: Black, Size: 42"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Supplier SKU (Optional)
                  </label>
                  <input
                    type="text"
                    value={mappingForm.supplierSku}
                    onChange={(e) => setMappingForm({ ...mappingForm, supplierSku: e.target.value })}
                    placeholder="e.g. ALI-94821-BK"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Supplier Cost in RWF (Optional)
                </label>
                <input
                  type="number"
                  min="0"
                  value={mappingForm.costPrice}
                  onChange={(e) => setMappingForm({ ...mappingForm, costPrice: e.target.value })}
                  placeholder="e.g. 8500"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-mono"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-200 gap-2">
                {mappingForm.aliExpressUrl && (
                  <a
                    href={mappingForm.aliExpressUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 text-slate-600 hover:text-blue-600 rounded-xl hover:bg-slate-100 flex items-center gap-1.5 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Test AliExpress Link</span>
                  </a>
                )}

                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setEditingMappingProduct(null)}
                    className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingMapping}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {savingMapping ? 'Saving...' : 'Save Mapping'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: MANUAL ORDER REVIEW & APPROVAL                   */}
      {/* ========================================================= */}
      {selectedOrderForApproval && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative border border-slate-200 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Manual Order Approval</h3>
                  <p className="text-slate-500 text-xs">Review before submitting to AliExpress / DSers</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedOrderForApproval(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl space-y-1.5 border border-slate-200">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-700">Order Reference:</span>
                <span className="font-mono font-bold text-orange-600">{selectedOrderForApproval.orderNumber}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-700">Customer:</span>
                <span className="text-slate-800">{selectedOrderForApproval.customerName} ({selectedOrderForApproval.customerPhone})</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-700">Payment Status:</span>
                <span className="font-semibold text-slate-900">{selectedOrderForApproval.paymentStatus}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-700">Total Amount:</span>
                <span className="font-mono font-bold text-slate-900">{selectedOrderForApproval.totalAmount.toLocaleString()} FRW</span>
              </div>
            </div>

            <form onSubmit={handleSubmitApprovalDecision} className="space-y-3.5">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Approval Decision *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Approved', 'Submitted to Supplier', 'Rejected'] as const).map(dec => (
                    <button
                      key={dec}
                      type="button"
                      onClick={() => setApprovalDecision(dec)}
                      className={`py-2 px-2.5 rounded-xl text-center font-bold text-xs border transition-all cursor-pointer ${
                        approvalDecision === dec
                          ? dec === 'Approved'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                            : dec === 'Submitted to Supplier'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                            : 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {dec}
                    </button>
                  ))}
                </div>
              </div>

              {approvalDecision === 'Rejected' && (
                <div>
                  <label className="block font-bold text-rose-700 mb-1">
                    Rejection Reason *
                  </label>
                  <input
                    type="text"
                    required
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="e.g. Payment unverified, supplier out of stock, incorrect address"
                    className="w-full px-3.5 py-2 rounded-xl border border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-500 text-xs"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Internal Verification Note (Optional)
                </label>
                <textarea
                  rows={2}
                  value={approvalNote}
                  onChange={(e) => setApprovalNote(e.target.value)}
                  placeholder="Add notes for fulfillment history..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500 text-xs resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSelectedOrderForApproval(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingApproval}
                  className="px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl font-bold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {submittingApproval ? 'Saving...' : 'Confirm Decision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: TRACKING NUMBER ENTRY & UPDATE                   */}
      {/* ========================================================= */}
      {editingTrackingOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative border border-slate-200 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Enter Tracking Information</h3>
                  <p className="text-slate-500 text-xs">Updates Order #{editingTrackingOrder.orderNumber} for live customer tracking</p>
                </div>
              </div>
              <button
                onClick={() => setEditingTrackingOrder(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTracking} className="space-y-3.5">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Tracking Number *
                </label>
                <input
                  type="text"
                  required
                  value={trackingForm.trackingNumber}
                  onChange={(e) => {
                    const val = e.target.value.trim();
                    setTrackingForm({
                      ...trackingForm,
                      trackingNumber: val,
                      trackingUrl: val ? `https://t.17track.net/en#nums=${encodeURIComponent(val)}` : ''
                    });
                  }}
                  placeholder="e.g. LP0058493021948 or YT240192840294"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Shipping Carrier *
                </label>
                <select
                  value={trackingForm.trackingCarrier}
                  onChange={(e) => setTrackingForm({ ...trackingForm, trackingCarrier: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-semibold"
                >
                  <option value="AliExpress Standard Shipping">AliExpress Standard Shipping</option>
                  <option value="Cainiao Super Economy">Cainiao Super Economy</option>
                  <option value="DHL Express">DHL Express</option>
                  <option value="EMS / Posta Rwanda">EMS / Posta Rwanda</option>
                  <option value="Yanwen Economic Air Mail">Yanwen Economic Air Mail</option>
                  <option value="FedEx">FedEx</option>
                  <option value="Local Kigali Courier Dispatch">Local Kigali Courier Dispatch</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Tracking Portal URL (Auto-generated)
                </label>
                <input
                  type="url"
                  value={trackingForm.trackingUrl}
                  onChange={(e) => setTrackingForm({ ...trackingForm, trackingUrl: e.target.value })}
                  placeholder="https://t.17track.net/en#nums=..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-[11px]"
                />
              </div>

              <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-100 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="updateOrderStatus"
                  checked={trackingForm.updateOrderStatus}
                  onChange={(e) => setTrackingForm({ ...trackingForm, updateOrderStatus: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                />
                <label htmlFor="updateOrderStatus" className="text-xs text-blue-900 font-semibold cursor-pointer">
                  Automatically set order status to "Out for Delivery"
                </label>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Carrier / Dispatch Notes (Optional)
                </label>
                <input
                  type="text"
                  value={trackingForm.notes}
                  onChange={(e) => setTrackingForm({ ...trackingForm, notes: e.target.value })}
                  placeholder="e.g. Expected Kigali delivery within 7-10 business days"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingTrackingOrder(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingTracking}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {savingTracking ? 'Saving...' : 'Save & Publish Tracking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* QUICK ORDER DETAILS VIEW                                  */}
      {/* ========================================================= */}
      {viewingOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl relative border border-slate-200 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400">Order Inspection</span>
                <h3 className="font-extrabold text-base text-slate-900 font-mono">{viewingOrder.orderNumber}</h3>
              </div>
              <button
                onClick={() => setViewingOrder(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-slate-50 rounded-2xl space-y-1">
                <div className="font-bold text-slate-800">{viewingOrder.customerName} · {viewingOrder.customerPhone}</div>
                <div className="text-slate-600">{viewingOrder.deliveryAddress} ({viewingOrder.deliveryLocation})</div>
                {viewingOrder.deliveryNotes && (
                  <div className="text-slate-500 italic mt-1 text-[11px]">Note: {viewingOrder.deliveryNotes}</div>
                )}
              </div>

              <div>
                <h4 className="font-bold text-slate-800 mb-2 uppercase text-[10px] tracking-wider">
                  Ordered Items & Supplier Status ({viewingOrder.items.length})
                </h4>
                <div className="space-y-2">
                  {viewingOrder.items.map((it, idx) => {
                    const prod = products.find(p => p.id === it.productId);
                    const mappedUrl = it.aliExpressUrl || prod?.aliExpressUrl || prod?.supplierProductUrl;
                    const variant = it.supplierVariant || prod?.supplierVariant || it.variation;

                    return (
                      <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={it.imageUrl}
                            alt={it.productName}
                            className="w-10 h-10 object-cover rounded-lg border border-slate-200 shrink-0"
                          />
                          <div>
                            <span className="font-bold text-slate-900 block line-clamp-1">{it.productName}</span>
                            <div className="text-[11px] text-slate-500">
                              Qty: {it.quantity} × {it.price.toLocaleString()} FRW
                              {variant && <span className="ml-1 text-slate-700">({variant})</span>}
                            </div>
                            {mappedUrl ? (
                              <a
                                href={mappedUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-blue-600 hover:underline inline-flex items-center gap-1 font-mono mt-0.5"
                              >
                                <ExternalLink className="w-2.5 h-2.5" />
                                <span>AliExpress Link</span>
                              </a>
                            ) : (
                              <span className="text-[10px] text-amber-600 font-bold block mt-0.5">
                                ⚠ Product not mapped to AliExpress
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="font-mono font-bold text-slate-900 text-right shrink-0">
                          {(it.price * it.quantity).toLocaleString()} FRW
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                onClick={() => {
                  setViewingOrder(null);
                  handleOpenApprovalModal(viewingOrder);
                }}
                className="px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold cursor-pointer"
              >
                Review Approval
              </button>
              <button
                onClick={() => {
                  setViewingOrder(null);
                  handleOpenTrackingModal(viewingOrder);
                }}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold cursor-pointer"
              >
                Enter Tracking
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DSers API Connection & Token Configuration Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center text-[#FF6000]">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">DSers API Configuration</h3>
                  <p className="text-xs text-slate-500">Official AliExpress dropshipping credentials</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 py-4 text-xs">
              <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/80">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-slate-700">Live Gateway Status:</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    dsersConfig?.isConnected ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {dsersConfig?.isConnected ? '● Connected' : '○ Disconnected'}
                  </span>
                </div>
                <p className="text-slate-500 text-[11px]">
                  DSers API tokens are obtained from your DSers account portal: <code className="font-mono text-slate-700">Settings &gt; Account &gt; API Access</code>.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  DSers API Token / Key
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={dsersApiKeyInput}
                    onChange={(e) => setDsersApiKeyInput(e.target.value)}
                    placeholder="Enter DSers API Token (e.g. ds_live_...)"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-mono text-xs focus:ring-2 focus:ring-[#FF6000] focus:border-transparent outline-hidden pr-10"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Credentials are encrypted and stored safely on the backend server.
                </p>
              </div>

              <div className="bg-amber-50 rounded-2xl p-3 border border-amber-200 flex items-start gap-2.5 text-amber-900">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  <strong>Verification Requirement:</strong> The system will never show a supplier as connected unless credentials have been verified successfully. If you do not have an API token, you can still export approved orders into the official DSers CSV template.
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleTestAndSaveDsers}
                disabled={testingConnection}
                className="px-4 py-2 bg-[#FF6000] hover:bg-orange-600 text-white font-bold rounded-xl flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-colors shadow-2xs"
              >
                <Zap className={`w-4 h-4 ${testingConnection ? 'animate-spin' : ''}`} />
                <span>{testingConnection ? 'Verifying...' : 'Test & Verify Connection'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
