import React, { useState } from 'react';
import {
  X, Search, CheckCircle2, Clock, Truck, Package, AlertCircle,
  MessageCircle, CreditCard, ChevronRight, Printer, FileText,
  PhoneCall, Copy, Check
} from 'lucide-react';
import { Order, OrderStatus } from '../types.ts';
import { Language, translations } from '../translations.ts';
import { api } from '../services/api.ts';
import { buildUssdCode, formatUssdTelUri, autoTriggerUssd } from '../utils/ussd.ts';
import { CurrencyCode, formatCurrencyPrice } from '../utils/currency.ts';

interface OrderTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialOrderNumber?: string;
  onOpenConfirmation: (order: Order) => void;
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

export const OrderTrackingModal: React.FC<OrderTrackingModalProps> = ({
  isOpen,
  onClose,
  initialOrderNumber = '',
  onOpenConfirmation,
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

  // Auto-track on mount if order number provided
  React.useEffect(() => {
    if (isOpen && initialOrderNumber && initialOrderNumber.trim()) {
      handleTrack();
    }
  }, [isOpen, initialOrderNumber]);

  if (!isOpen) return null;

  const handleTrack = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) {
      setError('Please enter your order reference (e.g. CRM-78291).');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      const urlToken = searchParams?.get('token') || '';

      const queryParams = new URLSearchParams();
      if (phoneQuery.trim()) queryParams.set('phone', phoneQuery.trim());
      if (urlToken) queryParams.set('token', urlToken);

      const q = queryParams.toString() ? `?${queryParams.toString()}` : '';
      const data = await api.trackOrder(searchQuery.trim().toUpperCase(), phoneQuery.trim());
      setTrackedOrder(data);
    } catch (err: any) {
      setError(err.message || 'Could not find order. Please verify your reference number and phone.');
    } finally {
      setLoading(false);
    }
  };

  const getStepIndex = (status: OrderStatus) => {
    if (status === 'Cancelled') return -1;
    return ORDER_STEPS.indexOf(status);
  };

  const currentStepIdx = trackedOrder ? getStepIndex(trackedOrder.status) : 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl relative border border-slate-100 flex flex-col">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-white border border-slate-200 shadow-2xs shrink-0 flex items-center justify-center p-0.5">
              <img
                src="/logo.png"
                alt="ContactReach Market Logo"
                className="w-full h-full object-contain rounded-full"
              />
            </div>
            <div>
              <h2 className="font-extrabold text-lg text-slate-900">
                Customer Order Tracking
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Check live verification and delivery progress with your CRM reference
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Tracking Search Bar */}
          <form onSubmit={handleTrack} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Order Reference *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="e.g. CRM-78291"
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-300 text-xs font-mono font-bold uppercase focus:outline-none focus:ring-2 focus:ring-orange-500 bg-slate-50/50"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Phone (Optional)
                </label>
                <input
                  type="text"
                  value={phoneQuery}
                  onChange={(e) => setPhoneQuery(e.target.value)}
                  placeholder="078..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 bg-slate-50/50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-slate-900 hover:bg-slate-800 text-white transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <span>{loading ? 'Searching orders...' : 'Track My Order'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </form>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Tracked Order Details */}
          {trackedOrder && (
            <div className="space-y-6 pt-2 border-t border-slate-100 animate-in fade-in">
              {/* Order Top Summary */}
              <div className="p-4 rounded-2xl bg-orange-50/70 border border-orange-100 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Order Reference</span>
                  <div className="text-base font-extrabold text-[#EA580C] font-mono">
                    {trackedOrder.orderNumber}
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    Placed by <strong>{trackedOrder.customerName}</strong> · {new Date(trackedOrder.createdAt).toLocaleDateString()}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Current Status</span>
                  <div>
                    <span
                      className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold mt-0.5 ${
                        trackedOrder.status === 'Completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : trackedOrder.status === 'Payment Confirmed' || trackedOrder.status === 'Ready for Delivery'
                          ? 'bg-blue-100 text-blue-800'
                          : trackedOrder.status === 'Payment Under Review'
                          ? 'bg-amber-100 text-amber-800'
                          : trackedOrder.status === 'Cancelled'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}
                    >
                      {trackedOrder.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress Stepper Bar */}
              {trackedOrder.status !== 'Cancelled' ? (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <h4 className="text-xs font-bold text-slate-700 mb-4 uppercase tracking-wider">
                    Fulfillment Progress
                  </h4>
                  <div className="relative">
                    {/* Background line */}
                    <div className="absolute top-4 left-4 right-4 h-1 bg-slate-200 -z-0" />
                    {/* Active line */}
                    <div
                      className="absolute top-4 left-4 h-1 bg-emerald-500 transition-all duration-500 -z-0"
                      style={{
                        width: `${Math.min(100, Math.max(0, (currentStepIdx / (ORDER_STEPS.length - 1)) * 100))}%`
                      }}
                    />

                    <div className="flex justify-between items-start relative z-10">
                      {ORDER_STEPS.map((step, idx) => {
                        const isDone = idx <= currentStepIdx;
                        const isCurrent = idx === currentStepIdx;
                        return (
                          <div key={step} className="flex flex-col items-center text-center max-w-[70px]">
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
                              className={`text-[9px] mt-2 font-medium leading-tight ${
                                isCurrent
                                  ? 'font-bold text-slate-900'
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
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800">
                  This order was cancelled. If you believe this is in error, please contact our support team.
                </div>
              )}

              {/* Live Shipping & Parcel Tracking Card */}
              {trackedOrder.trackingNumber && (
                <div className="p-4 bg-gradient-to-r from-blue-50/90 to-indigo-50/80 border border-blue-200 rounded-2xl shadow-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                        <Truck className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
                          {trackedOrder.trackingCarrier || 'Live Parcel Tracking'}
                        </span>
                        <h5 className="font-extrabold text-slate-900 text-sm">Dispatched for Delivery</h5>
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                      Active Tracking
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-2 border-t border-blue-100">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 font-medium">Tracking #:</span>
                      <code className="px-2.5 py-1 rounded-lg bg-white border border-blue-200 text-xs font-mono font-bold text-slate-800 select-all">
                        {trackedOrder.trackingNumber}
                      </code>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(trackedOrder.trackingNumber || '');
                          setCopiedTracking(true);
                          setTimeout(() => setCopiedTracking(false), 2000);
                        }}
                        className="px-2 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 text-xs transition-colors cursor-pointer flex items-center gap-1"
                        title="Copy tracking number"
                      >
                        {copiedTracking ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span className="text-[10px] font-medium">{copiedTracking ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    {trackedOrder.trackingUrl && (
                      <a
                        href={trackedOrder.trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors"
                      >
                        <span>Track Carrier Live</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Action for Awaiting Payment */}
              {(trackedOrder.paymentStatus === 'Pending Payment' || trackedOrder.status === 'Awaiting Payment' || (trackedOrder.status === 'New' && trackedOrder.paymentStatus !== 'Paid')) && (() => {
                const ussdCode = buildUssdCode(
                  trackedOrder.paymentMethod,
                  trackedOrder.totalAmount,
                  trackedOrder.receiverDetails || '078002260',
                  '078002'
                );
                const telUri = formatUssdTelUri(ussdCode);

                return (
                  <div className="p-4 bg-amber-50/90 rounded-2xl border border-amber-300 space-y-3 shadow-xs">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-amber-800 bg-amber-200/70 px-2 py-0.5 rounded-full inline-block">
                          {trackedOrder.paymentMethod}
                        </span>
                        <h5 className="font-extrabold text-amber-950 text-sm mt-1">
                          {currentLang === 'en' ? 'Payment Pending for This Order' : 'Kwishyura biracyategerejwe'}
                        </h5>
                        <p className="text-xs text-amber-900 mt-0.5">
                          {currentLang === 'en'
                            ? `Amount due: ${trackedOrder.totalAmount.toLocaleString()} RWF to ${trackedOrder.receiverName || 'Ruth'} (${trackedOrder.receiverDetails || '078002260'})`
                            : `Amafaranga yishyurwa: ${trackedOrder.totalAmount.toLocaleString()} RWF kuri ${trackedOrder.receiverName || 'Ruth'} (${trackedOrder.receiverDetails || '078002260'})`}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          onOpenConfirmation(trackedOrder);
                          onClose();
                        }}
                        className="px-4 py-2 bg-[#FF5500] hover:bg-[#E54D00] text-white text-xs font-bold rounded-xl shadow-xs shrink-0 cursor-pointer transition-colors"
                      >
                        {t.iHaveAlreadyPaid}
                      </button>
                    </div>

                    {/* Pre-filled USSD & 1-tap Dial Button */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1 border-t border-amber-200">
                      <div className="flex-1 flex items-center justify-between bg-slate-950 text-white px-3.5 py-2.5 rounded-xl font-mono text-xs sm:text-sm font-bold">
                        <span className="text-amber-400 truncate">{ussdCode}</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(ussdCode);
                            setCopiedUssd(true);
                            setTimeout(() => setCopiedUssd(false), 2000);
                          }}
                          className="ml-2 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-sans font-medium flex items-center gap-1 cursor-pointer"
                        >
                          {copiedUssd ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedUssd ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>

                      <a
                        href={telUri}
                        onClick={() => autoTriggerUssd(ussdCode)}
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 shrink-0 cursor-pointer transition-colors"
                      >
                        <PhoneCall className="w-3.5 h-3.5 text-white animate-pulse" />
                        <span>{currentLang === 'en' ? 'Dial USSD Code' : 'Hamagara USSD'}</span>
                      </a>
                    </div>
                  </div>
                );
              })()}

              {/* Items in Order */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                  Ordered Items ({trackedOrder.items.length})
                </h4>
                <div className="space-y-2">
                  {trackedOrder.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={item.imageUrl}
                          alt={item.productName}
                          referrerPolicy="no-referrer"
                          className="w-10 h-10 rounded-lg object-cover bg-white"
                        />
                        <div>
                          <div className="font-bold text-slate-800 line-clamp-1">{item.productName}</div>
                          <div className="text-[11px] text-slate-500">Qty: {item.quantity} × {item.price.toLocaleString()} FRW</div>
                        </div>
                      </div>
                      <div className="font-bold text-slate-900 font-mono tabular-nums">
                        {(item.price * item.quantity).toLocaleString()} FRW
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 p-3 bg-slate-50 rounded-xl space-y-1 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>{t.subtotal}:</span>
                    <span className="font-mono tabular-nums font-semibold">
                      {formatCurrencyPrice(trackedOrder.subtotal, currentCurrency, exchangeRates).primary}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>{t.deliveryFee}:</span>
                    <span className="font-mono tabular-nums font-semibold">
                      {trackedOrder.deliveryFee === 0 ? '0' : formatCurrencyPrice(trackedOrder.deliveryFee, currentCurrency, exchangeRates).primary}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline font-extrabold text-slate-900 pt-1 border-t border-slate-200">
                    <span>{t.totalAmount}:</span>
                    <div className="text-end">
                      <span className="text-[#EA580C] font-mono tabular-nums text-sm block">
                        {formatCurrencyPrice(trackedOrder.totalAmount, currentCurrency, exchangeRates).primary}
                      </span>
                      {currentCurrency !== 'RWF' && (
                        <span className="text-[10px] text-slate-500 font-mono block">
                          (~ {trackedOrder.totalAmount.toLocaleString()} FRW)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Delivery Details */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                <span className="font-bold text-slate-700 block">Delivery Address:</span>
                <p className="text-slate-600">{trackedOrder.deliveryAddress}</p>
                {trackedOrder.deliveryNotes && (
                  <p className="text-[11px] text-slate-500 italic mt-1">Note: {trackedOrder.deliveryNotes}</p>
                )}
              </div>

              {/* Status Audit Log */}
              {trackedOrder.statusHistory && trackedOrder.statusHistory.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                    Status History & Audit Trail
                  </h4>
                  <div className="space-y-2">
                    {trackedOrder.statusHistory.map((h, i) => (
                      <div key={i} className="text-xs p-2.5 rounded-lg bg-slate-50 border border-slate-200/60 flex items-start justify-between gap-3">
                        <div>
                          <span className="font-bold text-slate-800">{h.status}</span>
                          {h.note && <p className="text-[11px] text-slate-600 mt-0.5">{h.note}</p>}
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                          {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Invoice & Support Actions */}
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex-1 py-3 px-4 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-orange-400" />
                  <span>Download / Print Official Invoice</span>
                </button>
                <a
                  href={`https://wa.me/250780022600?text=${encodeURIComponent(
                    `Hello ContactReach Market, I am inquiring about Order Status for ${trackedOrder.orderNumber}.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3 px-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center gap-2 border border-emerald-200 transition-colors"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-600" />
                  <span>Order Help (0780022600)</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
