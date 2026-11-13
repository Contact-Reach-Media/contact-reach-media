import React, { useState, useEffect } from 'react';
import {
  Search, CheckCircle2, Clock, Truck, Package, AlertCircle,
  CreditCard, ChevronRight, Printer, FileText, PhoneCall,
  Copy, Check, ArrowLeft, RefreshCw, Calendar
} from 'lucide-react';
import { Order, OrderStatus } from '../types.ts';
import { Language, translations } from '../translations.ts';
import { api } from '../services/api.ts';
import { subscribeToSupabaseTable } from '../services/supabase.ts';
import { buildUssdCode, formatUssdTelUri, autoTriggerUssd } from '../utils/ussd.ts';
import { CurrencyCode, formatCurrencyPrice } from '../utils/currency.ts';
import { getProductImageDueToProduct } from '../utils/productImages.ts';

interface OrderTrackingPageProps {
  initialOrderNumber?: string;
  onNavigate: (view: string, params?: any) => void;
  currentLang: Language;
  currentCurrency?: CurrencyCode;
  exchangeRates?: Record<string, number>;
}

const ORDER_STEPS: OrderStatus[] = [
  'New',
  'Confirmed',
  'Preparing',
  'Ready for Delivery',
  'Out for Delivery',
  'Delivered'
];

export const OrderTrackingPage: React.FC<OrderTrackingPageProps> = ({
  initialOrderNumber = '',
  onNavigate,
  currentLang,
  currentCurrency = 'RWF',
  exchangeRates
}) => {
  const t = translations[currentLang] || translations.en;

  const [searchQuery, setSearchQuery] = useState(initialOrderNumber);
  const [phoneQuery, setPhoneQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trackedOrder, setTrackedOrder] = useState<Order | null>(null);
  const [copiedUssd, setCopiedUssd] = useState(false);
  const [copiedTracking, setCopiedTracking] = useState(false);
  const [liveStatusNotice, setLiveStatusNotice] = useState<string | null>(null);

  // Auto-track on mount or URL change
  useEffect(() => {
    const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const targetRef = initialOrderNumber || searchParams?.get('order') || searchParams?.get('ref');
    if (targetRef && targetRef.trim()) {
      setSearchQuery(targetRef.trim().toUpperCase());
      handleTrackQuery(targetRef.trim().toUpperCase());
    }
  }, [initialOrderNumber]);

  const handleTrackQuery = async (queryRef: string, phone?: string) => {
    if (!queryRef.trim()) {
      setError('Please enter your order reference (e.g. CRM-78291).');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await api.trackOrder(queryRef.trim().toUpperCase(), phone ? phone.trim() : undefined);
      setTrackedOrder(data);
    } catch (err: any) {
      console.error('Tracking error:', err);
      setError(err.message || 'Could not find order. Please verify the order number and phone number.');
      setTrackedOrder(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleTrackQuery(searchQuery, phoneQuery);
  };

  // Scoped Real-Time Synchronization via SSE + Supabase Realtime (no polling)
  useEffect(() => {
    if (!trackedOrder?.orderNumber) return;
    const orderNum = trackedOrder.orderNumber;
    const phoneParam = (trackedOrder.customerPhone || phoneQuery || '').trim();
    const qPhone = phoneParam ? `&phone=${encodeURIComponent(phoneParam)}` : '';

    let es: EventSource | null = null;
    try {
      es = new EventSource(`/api/realtime/track?orderNumber=${encodeURIComponent(orderNum)}${qPhone}`);
      es.onmessage = async (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type !== 'db_update') return;
          const latest = await api.trackOrder(orderNum, phoneParam || undefined);
          if (latest) {
            setTrackedOrder(prev => {
              if (prev && (latest.status !== prev.status || latest.paymentStatus !== prev.paymentStatus || latest.deliveryStatus !== prev.deliveryStatus)) {
                setLiveStatusNotice(`⚡ Order status updated live: "${latest.deliveryStatus || latest.status}" (${latest.paymentStatus})`);
                setTimeout(() => setLiveStatusNotice(null), 6000);
              }
              return latest;
            });
          }
        } catch {}
      };
    } catch {}

    const unsubOrders = subscribeToSupabaseTable('orders', async (payload) => {
      const row = payload.new as any;
      if (row && (row.order_number === orderNum || row.id === trackedOrder.id)) {
        try {
          const latest = await api.trackOrder(orderNum, phoneParam || undefined);
          if (latest) setTrackedOrder(latest);
        } catch {}
      }
    });

    const unsubPayments = subscribeToSupabaseTable('payments', async (payload) => {
      const row = payload.new as any;
      if (row && row.order_number === orderNum) {
        try {
          const latest = await api.trackOrder(orderNum, phoneParam || undefined);
          if (latest) setTrackedOrder(latest);
        } catch {}
      }
    });

    return () => {
      if (es) es.close();
      unsubOrders();
      unsubPayments();
    };
  }, [trackedOrder?.orderNumber, trackedOrder?.id, phoneQuery]);

  const currentStepIdx = trackedOrder
    ? ORDER_STEPS.indexOf(
        trackedOrder.deliveryStatus === 'Delivered'
          ? 'Delivered'
          : trackedOrder.deliveryStatus === 'Out for Delivery' || trackedOrder.deliveryStatus === 'In Transit'
          ? 'Out for Delivery'
          : trackedOrder.deliveryStatus === 'Shipped' || trackedOrder.deliveryStatus === 'Awaiting Shipment'
          ? 'Ready for Delivery'
          : trackedOrder.deliveryStatus === 'Processing'
          ? 'Preparing'
          : (trackedOrder.status as any) || 'New'
      )
    : 0;

  const primaryItem = trackedOrder?.items?.[0];
  const primaryItemImg = primaryItem ? getProductImageDueToProduct(primaryItem) : '';

  return (
    <div className="bg-slate-50 min-h-screen py-6 sm:py-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs text-slate-500 overflow-x-auto whitespace-nowrap">
          <button
            onClick={() => onNavigate('home')}
            className="hover:text-orange-600 transition-colors font-medium cursor-pointer"
          >
            Home
          </button>
          <span>/</span>
          <button
            onClick={() => onNavigate('shop')}
            className="hover:text-orange-600 transition-colors font-medium cursor-pointer"
          >
            Shop
          </button>
          <span>/</span>
          <span className="font-semibold text-slate-900">Order Delivery Tracking</span>
        </nav>

        {/* Page Title & Back Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Order Delivery Tracking
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Follow your package from order confirmation to final doorstep delivery across Rwanda.
            </p>
          </div>

          <button
            onClick={() => onNavigate('shop')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:text-orange-600 transition-colors cursor-pointer shadow-2xs self-start sm:self-auto"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Shop</span>
          </button>
        </div>

        {/* Order Search Form */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-7 shadow-xs">
          <form onSubmit={handleSearchSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-7">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Order Reference (Order ID) *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="e.g. CRM-78291"
                    required
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 font-mono font-bold text-xs uppercase focus:ring-2 focus:ring-orange-500"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                </div>
              </div>

              <div className="sm:col-span-5">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Customer Phone (Optional)
                </label>
                <input
                  type="text"
                  value={phoneQuery}
                  onChange={(e) => setPhoneQuery(e.target.value)}
                  placeholder="078... or 073..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-orange-500 font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer inline-flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Search className="w-3.5 h-3.5" />
              <span>{loading ? 'Locating Order...' : 'Track My Order'}</span>
            </button>
          </form>

          {error && (
            <div className="mt-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Live Status Toast Notice */}
        {liveStatusNotice && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-2 animate-bounce shadow-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{liveStatusNotice}</span>
          </div>
        )}

        {/* Tracked Order Details */}
        {trackedOrder && (
          <div className="space-y-6 animate-in fade-in">

            {/* 9 MANDATORY ATTRIBUTES CARD */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-7 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-orange-600" />
                  <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900">
                    Order Information & Delivery Status
                  </h2>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Synced
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">

                {/* 1. Order ID */}
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    1. Order ID
                  </span>
                  <span className="font-mono font-black text-slate-900 text-sm mt-0.5 block">
                    {trackedOrder.orderNumber}
                  </span>
                </div>

                {/* 2. Product Name & Image */}
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    2. Product Name & Image
                  </span>
                  {primaryItem ? (
                    <div className="flex items-center gap-2.5 mt-1">
                      <img
                        src={primaryItemImg && primaryItemImg.trim() ? primaryItemImg : '/logo.png'}
                        alt={primaryItem.productName}
                        className="w-10 h-10 rounded-xl object-cover bg-white border border-slate-200 shrink-0"
                        referrerPolicy="no-referrer"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/logo.png'; }}
                      />
                      <div className="min-w-0">
                        <span className="font-bold text-slate-900 truncate block text-xs" title={primaryItem.productName}>
                          {primaryItem.productName}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          Qty: {primaryItem.quantity} {trackedOrder.items.length > 1 ? `(+${trackedOrder.items.length - 1} more)` : ''}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-slate-400 italic text-xs block mt-1">Not Yet Available</span>
                  )}
                </div>

                {/* 3. Customer Name & Phone */}
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    3. Customer & Phone
                  </span>
                  <span className="font-bold text-slate-900 block truncate mt-0.5">
                    {trackedOrder.customerName}
                  </span>
                  <span className="font-mono text-slate-500 text-[11px] block">
                    {trackedOrder.customerPhone || 'N/A'}
                  </span>
                </div>

                {/* 4. Supplier Name */}
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    4. Supplier Name
                  </span>
                  <span className="font-bold text-slate-900 block truncate mt-0.5">
                    {trackedOrder.supplierName || (primaryItem?.supplierName) || trackedOrder.shopName || 'Contact Reach Market'}
                  </span>
                </div>

                {/* 5. Payment Status */}
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    5. Payment Status
                  </span>
                  <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-black ${
                    trackedOrder.paymentStatus === 'Paid'
                      ? 'bg-emerald-100 text-emerald-800'
                      : trackedOrder.paymentStatus === 'Pending Verification'
                      ? 'bg-amber-100 text-amber-800'
                      : trackedOrder.paymentStatus === 'Failed'
                      ? 'bg-rose-100 text-rose-800'
                      : trackedOrder.paymentStatus === 'Refunded'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-orange-100 text-orange-800'
                  }`}>
                    {trackedOrder.paymentStatus || 'Pending Payment'}
                  </span>
                </div>

                {/* 6. Order Date */}
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    6. Order Date
                  </span>
                  <span className="font-medium text-slate-800 block text-xs mt-0.5">
                    {new Date(trackedOrder.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                </div>

                {/* 7. Delivery Status */}
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    7. Delivery Status
                  </span>
                  <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-black ${
                    trackedOrder.deliveryStatus === 'Delivered'
                      ? 'bg-emerald-100 text-emerald-800'
                      : (trackedOrder.deliveryStatus === 'Shipped' || trackedOrder.deliveryStatus === 'In Transit' || trackedOrder.deliveryStatus === 'Out for Delivery')
                      ? 'bg-blue-100 text-blue-800'
                      : trackedOrder.deliveryStatus === 'Cancelled'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-indigo-100 text-indigo-800'
                  }`}>
                    {trackedOrder.deliveryStatus || trackedOrder.status || 'Pending'}
                  </span>
                </div>

                {/* 8. Tracking Number */}
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    8. Tracking Number
                  </span>
                  {trackedOrder.trackingNumber && trackedOrder.trackingNumber.trim() ? (
                    <div className="flex items-center justify-between gap-1 mt-0.5">
                      <code className="font-mono font-bold text-blue-700 text-xs truncate">
                        {trackedOrder.trackingNumber}
                      </code>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(trackedOrder.trackingNumber || '');
                          setCopiedTracking(true);
                          setTimeout(() => setCopiedTracking(false), 2000);
                        }}
                        className="p-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-600 text-[10px]"
                      >
                        {copiedTracking ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  ) : (
                    <span className="text-slate-400 italic text-xs block mt-1 font-medium">
                      Not Yet Available
                    </span>
                  )}
                </div>

                {/* 9. Expected Delivery Date */}
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    9. Expected Delivery Date
                  </span>
                  {trackedOrder.expectedDeliveryDate && trackedOrder.expectedDeliveryDate.trim() ? (
                    <span className="font-bold text-emerald-700 text-xs block mt-0.5 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      {new Date(trackedOrder.expectedDeliveryDate).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  ) : (
                    <span className="text-slate-400 italic text-xs block mt-1 font-medium">
                      Not Yet Available
                    </span>
                  )}
                </div>

              </div>
            </div>

            {/* Delivery Progression Stepper */}
            {trackedOrder.status !== 'Cancelled' && trackedOrder.deliveryStatus !== 'Cancelled' ? (
              <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-7 shadow-xs">
                <h3 className="text-xs font-bold text-slate-700 mb-6 uppercase tracking-wider">
                  Delivery Progression
                </h3>

                <div className="relative px-2">
                  <div className="absolute top-4 left-6 right-6 h-1 bg-slate-200 -z-0" />
                  <div
                    className="absolute top-4 left-6 h-1 bg-emerald-500 transition-all duration-500 -z-0"
                    style={{
                      width: `${Math.min(100, Math.max(0, (currentStepIdx / (ORDER_STEPS.length - 1)) * 100))}%`
                    }}
                  />

                  <div className="flex justify-between items-start relative z-10">
                    {ORDER_STEPS.map((step, idx) => {
                      const isDone = idx <= currentStepIdx;
                      const isCurrent = idx === currentStepIdx;
                      return (
                        <div key={step} className="flex flex-col items-center text-center max-w-[80px]">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                              isDone
                                ? 'bg-emerald-500 text-white shadow-xs'
                                : 'bg-white border-2 border-slate-300 text-slate-400'
                            } ${isCurrent ? 'ring-4 ring-emerald-100' : ''}`}
                          >
                            {isDone ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                          </div>
                          <span
                            className={`text-[10px] mt-2 font-medium leading-tight ${
                              isCurrent
                                ? 'font-black text-slate-900'
                                : isDone
                                ? 'text-slate-700'
                                : 'text-slate-400'
                            }`}
                          >
                            {step}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 font-semibold">
                This order was cancelled. If you have questions, please reach out to customer support.
              </div>
            )}

            {/* Live Carrier Tracking (If available) */}
            {trackedOrder.trackingNumber && trackedOrder.trackingNumber.trim() ? (
              <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-3xl shadow-xs space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                      <Truck className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
                        {trackedOrder.trackingCarrier || 'Live Parcel Tracking'}
                      </span>
                      <h4 className="font-extrabold text-slate-900 text-sm">Dispatched for Doorstep Delivery</h4>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                    Active Tracking
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-2 border-t border-blue-100 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-medium">Tracking #:</span>
                    <code className="px-2.5 py-1 rounded-lg bg-white border border-blue-200 font-mono font-bold text-slate-800 select-all">
                      {trackedOrder.trackingNumber}
                    </code>
                  </div>
                  {trackedOrder.trackingUrl && (
                    <a
                      href={trackedOrder.trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors"
                    >
                      <span>Track Carrier Live</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            ) : null}

            {/* Ordered Items Breakdown */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-7 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Purchased Products ({trackedOrder.items.length})
              </h3>

              <div className="space-y-2.5 divide-y divide-slate-100">
                {trackedOrder.items.map((it, idx) => {
                  const resolvedImg = getProductImageDueToProduct(it);
                  return (
                    <div key={idx} className="pt-2.5 first:pt-0 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3">
                        <img
                          src={resolvedImg && resolvedImg.trim() ? resolvedImg : '/logo.png'}
                          alt={it.productName}
                          className="w-12 h-12 rounded-xl object-cover bg-white border border-slate-200 shrink-0"
                          referrerPolicy="no-referrer"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/logo.png'; }}
                        />
                        <div>
                          <p className="font-bold text-slate-900">{it.productName}</p>
                          <p className="text-[11px] text-slate-500">
                            Qty: {it.quantity} &times; {it.price.toLocaleString()} FRW
                          </p>
                        </div>
                      </div>
                      <span className="font-mono font-bold text-slate-900">
                        {(it.price * it.quantity).toLocaleString()} FRW
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-mono font-bold">{trackedOrder.subtotal.toLocaleString()} FRW</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Fee:</span>
                  <span className="font-mono font-bold">
                    {trackedOrder.deliveryFee === 0 ? 'FREE' : `${trackedOrder.deliveryFee.toLocaleString()} FRW`}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline font-black text-slate-900 text-sm">
                  <span>Total Amount:</span>
                  <span className="font-mono text-orange-600 text-base">
                    {trackedOrder.totalAmount.toLocaleString()} FRW
                  </span>
                </div>
              </div>
            </div>

            {/* Action to complete payment if unpaid */}
            {trackedOrder.paymentStatus !== 'Paid' && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-amber-950 text-xs">Payment is Pending</h4>
                  <p className="text-[11px] text-amber-800">
                    Complete your payment via USSD or submit your payment proof to expedite processing.
                  </p>
                </div>
                <button
                  onClick={() => onNavigate('payment', { orderRef: trackedOrder.orderNumber })}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer shrink-0"
                >
                  Complete Payment Now &rarr;
                </button>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
};
