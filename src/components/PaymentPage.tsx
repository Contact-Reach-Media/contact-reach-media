import React, { useState, useEffect } from 'react';
import {
  CheckCircle2, Copy, Check, PhoneCall, Upload, FileText,
  AlertCircle, ShieldCheck, ChevronRight, Package, Truck,
  Calendar, ShoppingBag, ArrowLeft, RefreshCw, MessageCircle
} from 'lucide-react';
import { Order, PaymentConfirmation } from '../types.ts';
import { Language, translations } from '../translations.ts';
import { api } from '../services/api.ts';
import { subscribeToSupabaseTable } from '../services/supabase.ts';
import { buildUssdCode, formatUssdTelUri, autoTriggerUssd } from '../utils/ussd.ts';
import { CurrencyCode, formatCurrencyPrice } from '../utils/currency.ts';
import { compressImageFile } from '../utils/imageCompress.ts';
import { getProductImageDueToProduct } from '../utils/productImages.ts';

interface PaymentPageProps {
  order: Order | null;
  orderNumberQuery?: string;
  onNavigate: (view: string, params?: any) => void;
  currentLang: Language;
  currentCurrency?: CurrencyCode;
  exchangeRates?: Record<string, number>;
}

export const PaymentPage: React.FC<PaymentPageProps> = ({
  order: initialOrder,
  orderNumberQuery = '',
  onNavigate,
  currentLang,
  currentCurrency = 'RWF',
  exchangeRates
}) => {
  const t = translations[currentLang] || translations.en;

  const [activeOrder, setActiveOrder] = useState<Order | null>(initialOrder);
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [copiedUssd, setCopiedUssd] = useState(false);
  const [copiedTracking, setCopiedTracking] = useState(false);

  // Payment proof form
  const [transactionId, setTransactionId] = useState('');
  const [confirmationMessage, setConfirmationMessage] = useState('');
  const [screenshotData, setScreenshotData] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [submittingProof, setSubmittingProof] = useState(false);
  const [proofSubmitted, setProofSubmitted] = useState(false);
  const [proofError, setProofError] = useState<string | null>(null);

  // Fetch order if orderNumberQuery is provided and initialOrder is missing or different
  useEffect(() => {
    const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const targetRef = orderNumberQuery || searchParams?.get('order') || searchParams?.get('ref') || initialOrder?.orderNumber;

    if (targetRef && (!activeOrder || activeOrder.orderNumber !== targetRef)) {
      setLoadingOrder(true);
      api.trackOrder(targetRef)
        .then(res => {
          if (res) setActiveOrder(res);
        })
        .catch(err => {
          console.warn('Could not load order for payment page:', err);
        })
        .finally(() => setLoadingOrder(false));
    }
  }, [orderNumberQuery, initialOrder]);

  // Scoped Real-Time Order & Payment verification updates
  useEffect(() => {
    if (!activeOrder?.orderNumber) return;
    const orderNum = activeOrder.orderNumber;
    let es: EventSource | null = null;
    try {
      es = new EventSource(`/api/realtime/track?orderNumber=${encodeURIComponent(orderNum)}`);
      es.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.type === 'db_update' && msg.data) {
            const d = msg.data;
            if (d.orderNumber === orderNum || d.order_number === orderNum || d.id === activeOrder.id) {
              setActiveOrder(prev => prev ? {
                ...prev,
                paymentStatus: d.paymentStatus || d.payment_status || prev.paymentStatus,
                status: d.status || prev.status,
                deliveryStatus: d.deliveryStatus || d.delivery_status || prev.deliveryStatus,
                trackingNumber: d.trackingNumber ?? d.tracking_number ?? prev.trackingNumber
              } : prev);
            }
          }
        } catch {}
      };
    } catch {}

    const unsubOrders = subscribeToSupabaseTable('orders', (payload) => {
      const row = payload.new as any;
      if (row && (row.order_number === orderNum || row.id === activeOrder.id)) {
        setActiveOrder(prev => prev ? {
          ...prev,
          paymentStatus: row.payment_status || prev.paymentStatus,
          status: row.status || prev.status,
          deliveryStatus: row.delivery_status || prev.deliveryStatus,
          trackingNumber: row.tracking_number ?? prev.trackingNumber
        } : prev);
      }
    });

    return () => {
      if (es) es.close();
      unsubOrders();
    };
  }, [activeOrder?.orderNumber, activeOrder?.id]);

  const handleSmsChange = (text: string) => {
    setConfirmationMessage(text);
    // Regex auto-detect Rwandan MoMo / Airtel / Bank transaction IDs
    const momoMatch = text.match(/(?:TxId|Financial Transaction Id|Txn ID|Transaction ID|Id|Ref)[:\s]*([A-Za-z0-9.]+)/i);
    if (momoMatch && momoMatch[1]) {
      setTransactionId(momoMatch[1].replace(/[.,]$/, '').trim());
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    try {
      const compressed = await compressImageFile(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.8 });
      setScreenshotData(compressed);
    } catch {
      const reader = new FileReader();
      reader.onload = () => setScreenshotData(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrder) return;

    if (!transactionId.trim() && !confirmationMessage.trim() && !screenshotData) {
      setProofError('Please enter a Transaction ID, paste the SMS message, or upload a payment screenshot.');
      return;
    }

    setSubmittingProof(true);
    setProofError(null);

    try {
      const confirmationPayload = {
        orderId: activeOrder.id,
        orderNumber: activeOrder.orderNumber,
        customerName: activeOrder.customerName,
        customerPhone: activeOrder.customerPhone,
        paymentPhone: activeOrder.customerPhone || '',
        paymentMethod: activeOrder.paymentMethod,
        amountPaid: activeOrder.totalAmount,
        transactionId: transactionId.trim() || undefined,
        confirmationMessage: confirmationMessage.trim() || undefined,
        screenshotUrl: screenshotData || undefined
      };

      const res = await api.submitPaymentConfirmation(confirmationPayload);
      if (res && res.order) {
        setActiveOrder(res.order);
      }
      setProofSubmitted(true);
    } catch (err: any) {
      console.error('Proof submission error:', err);
      setProofError(err.message || 'Failed to submit payment proof. Please try again.');
    } finally {
      setSubmittingProof(false);
    }
  };

  if (loadingOrder) {
    return (
      <div className="bg-slate-50 min-h-screen py-20 flex flex-col items-center justify-center p-6 text-center">
        <RefreshCw className="w-8 h-8 text-orange-600 animate-spin mb-3" />
        <h2 className="text-base font-bold text-slate-800">Loading Order Details...</h2>
      </div>
    );
  }

  if (!activeOrder) {
    return (
      <div className="bg-slate-50 min-h-screen py-20 flex flex-col items-center justify-center p-6 text-center">
        <Package className="w-16 h-16 text-slate-300 mb-4" />
        <h2 className="text-xl font-bold text-slate-800">No Active Order Found</h2>
        <p className="text-slate-500 text-sm mt-1 max-w-md">
          Please check your order reference number or browse our catalog.
        </p>
        <button
          onClick={() => onNavigate('shop')}
          className="mt-6 px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs cursor-pointer"
        >
          Explore All Products
        </button>
      </div>
    );
  }

  const primaryItem = activeOrder.items?.[0];
  const primaryItemImg = getProductImageDueToProduct(primaryItem);
  const ussdCode = buildUssdCode(
    activeOrder.paymentMethod,
    activeOrder.totalAmount,
    activeOrder.receiverDetails || '0780022600',
    '2328354'
  );
  const telUri = formatUssdTelUri(ussdCode);

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
          <span className="font-semibold text-slate-900">Payment & Confirmation</span>
        </nav>

        {/* Success Banner Header */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 text-center shadow-xs space-y-3">
          <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-2xs">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Order Successfully Placed!
          </h1>

          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            Thank you, <strong className="text-slate-800">{activeOrder.customerName}</strong>! Your order reference is{' '}
            <strong className="font-mono text-orange-600">{activeOrder.orderNumber}</strong>.
          </p>

          <div className="pt-2 flex items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Synced to Database
            </span>
          </div>
        </div>

        {/* 9 MANDATORY ORDER ATTRIBUTES CARD */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-7 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-orange-600" />
              <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900">
                Order Information & Delivery Status (9 Official Fields)
              </h2>
            </div>
            <span className="text-xs font-mono font-bold text-slate-500">{activeOrder.orderNumber}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">

            {/* 1. Order ID */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                1. Order ID
              </span>
              <span className="font-mono font-black text-slate-900 text-sm mt-0.5 block">
                {activeOrder.orderNumber}
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
                      Qty: {primaryItem.quantity} {activeOrder.items.length > 1 ? `(+${activeOrder.items.length - 1} more)` : ''}
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
                3. Customer Name & Phone
              </span>
              <span className="font-bold text-slate-900 block truncate mt-0.5">
                {activeOrder.customerName}
              </span>
              <span className="font-mono text-slate-500 text-[11px] block">
                {activeOrder.customerPhone || 'N/A'}
              </span>
            </div>

            {/* 4. Supplier Name */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                4. Supplier Name
              </span>
              <span className="font-bold text-slate-900 block truncate mt-0.5">
                {activeOrder.supplierName || (primaryItem?.supplierName) || activeOrder.shopName || 'Contact Reach Market'}
              </span>
            </div>

            {/* 5. Payment Status */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                5. Payment Status
              </span>
              <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-black ${
                activeOrder.paymentStatus === 'Paid'
                  ? 'bg-emerald-100 text-emerald-800'
                  : activeOrder.paymentStatus === 'Pending Verification'
                  ? 'bg-amber-100 text-amber-800'
                  : activeOrder.paymentStatus === 'Failed'
                  ? 'bg-rose-100 text-rose-800'
                  : activeOrder.paymentStatus === 'Refunded'
                  ? 'bg-purple-100 text-purple-800'
                  : 'bg-orange-100 text-orange-800'
              }`}>
                {activeOrder.paymentStatus || 'Pending Payment'}
              </span>
            </div>

            {/* 6. Order Date */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                6. Order Date
              </span>
              <span className="font-medium text-slate-800 block text-xs mt-0.5">
                {new Date(activeOrder.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
              </span>
            </div>

            {/* 7. Delivery Status */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                7. Delivery Status
              </span>
              <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-black ${
                activeOrder.deliveryStatus === 'Delivered'
                  ? 'bg-emerald-100 text-emerald-800'
                  : (activeOrder.deliveryStatus === 'Shipped' || activeOrder.deliveryStatus === 'In Transit' || activeOrder.deliveryStatus === 'Out for Delivery')
                  ? 'bg-blue-100 text-blue-800'
                  : activeOrder.deliveryStatus === 'Cancelled'
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-indigo-100 text-indigo-800'
              }`}>
                {activeOrder.deliveryStatus || activeOrder.status || 'Pending'}
              </span>
            </div>

            {/* 8. Tracking Number */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                8. Tracking Number
              </span>
              {activeOrder.trackingNumber && activeOrder.trackingNumber.trim() ? (
                <div className="flex items-center justify-between gap-1 mt-0.5">
                  <code className="font-mono font-bold text-blue-700 text-xs truncate">
                    {activeOrder.trackingNumber}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(activeOrder.trackingNumber || '');
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
              {activeOrder.expectedDeliveryDate && activeOrder.expectedDeliveryDate.trim() ? (
                <span className="font-bold text-emerald-700 text-xs block mt-0.5 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  {new Date(activeOrder.expectedDeliveryDate).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              ) : (
                <span className="text-slate-400 italic text-xs block mt-1 font-medium">
                  Not Yet Available
                </span>
              )}
            </div>

          </div>
        </div>

        {/* PAYMENT INSTRUCTIONS & USSD DIALER (If unpaid) */}
        {activeOrder.paymentStatus !== 'Paid' && (
          <div className="bg-gradient-to-br from-amber-50 to-orange-50/60 rounded-3xl border border-amber-300 p-5 sm:p-7 shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-amber-800 bg-amber-200/70 px-2.5 py-0.5 rounded-full inline-block">
                  Payment Method: {activeOrder.paymentMethod}
                </span>
                <h3 className="text-base sm:text-lg font-black text-amber-950 mt-1">
                  How to Complete Your Payment
                </h3>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-500 font-medium block">Total Amount Due</span>
                <span className="text-xl sm:text-2xl font-black text-orange-600 font-mono">
                  {activeOrder.totalAmount.toLocaleString()} RWF
                </span>
              </div>
            </div>

            <p className="text-xs text-amber-900 leading-relaxed">
              Please send exactly <strong>{activeOrder.totalAmount.toLocaleString()} RWF</strong> to{' '}
              <strong>{activeOrder.receiverName || 'Ruth'}</strong> ({activeOrder.receiverDetails || '0780022600'}).
              For MTN MoMoPay, enter merchant code <strong>2328354</strong>.
            </p>

            {/* USSD Box with 1-tap dial */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1 border-t border-amber-200">
              <div className="flex-1 flex items-center justify-between bg-slate-950 text-white px-4 py-3 rounded-2xl font-mono text-xs sm:text-sm font-bold shadow-inner">
                <span className="text-amber-400 truncate">{ussdCode}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(ussdCode);
                    setCopiedUssd(true);
                    setTimeout(() => setCopiedUssd(false), 2000);
                  }}
                  className="ml-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-sans font-medium flex items-center gap-1 cursor-pointer transition-colors"
                >
                  {copiedUssd ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedUssd ? 'Copied' : 'Copy USSD'}</span>
                </button>
              </div>

              <a
                href={telUri}
                onClick={() => autoTriggerUssd(ussdCode)}
                className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold rounded-2xl shadow-md flex items-center justify-center gap-2 shrink-0 cursor-pointer transition-colors"
              >
                <PhoneCall className="w-4 h-4 text-white" />
                <span>Dial USSD Directly</span>
              </a>
            </div>
          </div>
        )}

        {/* SUBMIT PAYMENT PROOF (SMS or Transaction ID) */}
        {activeOrder.paymentStatus !== 'Paid' && (
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-7 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <FileText className="w-4 h-4 text-orange-600" />
              <h3 className="text-sm sm:text-base font-black text-slate-900">
                Submit Payment Confirmation Proof
              </h3>
            </div>

            {proofSubmitted ? (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>Payment proof submitted successfully!</span>
                </div>
                <p className="font-normal text-emerald-800 text-[11px]">
                  Our automated telecom verification agent is reconciling your payment. Your order status will update to Paid automatically.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitProof} className="space-y-4 text-xs">
                {proofError && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{proofError}</span>
                  </div>
                )}

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Paste Payment SMS from MTN / Airtel
                  </label>
                  <textarea
                    value={confirmationMessage}
                    onChange={(e) => handleSmsChange(e.target.value)}
                    placeholder="e.g. Y'ello! You have transferred 15,000 RWF to Ruth (0780022600). Financial Transaction Id: 1982736451."
                    rows={3}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 font-mono text-xs"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Pasting the SMS will automatically detect and extract your transaction reference.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Transaction Reference / ID
                    </label>
                    <input
                      type="text"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      placeholder="e.g. 1982736451 or MP261104..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Upload Screenshot (Optional)
                    </label>
                    <label className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center gap-2 cursor-pointer text-slate-600">
                      <Upload className="w-4 h-4 text-slate-400" />
                      <span className="truncate">{fileName || 'Choose image screenshot...'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submittingProof}
                  className="px-6 py-3 bg-slate-900 hover:bg-black text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>{submittingProof ? 'Verifying Proof...' : 'Submit Payment Proof'}</span>
                </button>
              </form>
            )}
          </div>
        )}

        {/* BOTTOM ACTION BUTTONS */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <button
            onClick={() => onNavigate('shop')}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:text-orange-600 transition-colors cursor-pointer shadow-2xs inline-flex items-center justify-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Continue Shopping</span>
          </button>

          <button
            onClick={() => onNavigate('track-order', { orderRef: activeOrder.orderNumber })}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-md transition-colors cursor-pointer inline-flex items-center justify-center gap-2"
          >
            <Truck className="w-4 h-4" />
            <span>Track Delivery Progress &rarr;</span>
          </button>
        </div>

      </div>
    </div>
  );
};
