import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  RefreshCw,
  CheckCircle2,
  ShieldCheck,
  Package,
  Truck,
  Clock,
  AlertCircle,
  MapPin,
  ExternalLink,
  Calendar,
  ArrowRight
} from 'lucide-react';
import { Order } from '../types.ts';
import { Language } from '../translations.ts';
import { api } from '../services/api.ts';
import { subscribeToSupabaseTable } from '../services/supabase.ts';
import { CurrencyCode, formatCurrencyPrice } from '../utils/currency.ts';

export type TrackStageKey = 'placed' | 'verified' | 'processing' | 'dispatched' | 'delivered';

export interface TrackStageDef {
  key: TrackStageKey;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const TRACK_ORDER_STAGES: TrackStageDef[] = [
  {
    key: 'placed',
    label: 'Placed',
    description: 'Order received',
    icon: Clock
  },
  {
    key: 'verified',
    label: 'Verified',
    description: 'Payment & order confirmed',
    icon: ShieldCheck
  },
  {
    key: 'processing',
    label: 'Processing',
    description: 'Packing & quality check',
    icon: Package
  },
  {
    key: 'dispatched',
    label: 'Dispatched',
    description: 'With courier in transit',
    icon: Truck
  },
  {
    key: 'delivered',
    label: 'Delivered',
    description: 'Received by customer',
    icon: CheckCircle2
  }
];

export function resolveOrderStageIndex(order: Order): {
  stageIndex: number;
  exceptionLabel?: string;
} {
  const status = String(order.status || '').trim();
  const delivery = String(order.deliveryStatus || '').trim();
  const payment = String(order.paymentStatus || '').trim();

  if (status === 'Cancelled' || delivery === 'Cancelled') {
    return { stageIndex: 0, exceptionLabel: 'Order Cancelled' };
  }
  if (status === 'Returned' || status === 'Refunded' || delivery === 'Returned') {
    return { stageIndex: 3, exceptionLabel: status === 'Refunded' ? 'Order Refunded' : 'Order Returned' };
  }
  if (delivery === 'Failed Delivery') {
    return { stageIndex: 3, exceptionLabel: 'Delivery Attempt Failed' };
  }

  if (
    status === 'Delivered' ||
    status === 'Completed' ||
    delivery === 'Delivered'
  ) {
    return { stageIndex: 4 };
  }

  if (
    status === 'Out for Delivery' ||
    status === 'Ready for Delivery' ||
    delivery === 'Out for Delivery' ||
    delivery === 'In Transit' ||
    delivery === 'Shipped' ||
    delivery === 'Awaiting Shipment'
  ) {
    return { stageIndex: 3 };
  }

  if (
    status === 'Preparing' ||
    status === 'Processing' ||
    delivery === 'Processing'
  ) {
    return { stageIndex: 2 };
  }

  if (
    status === 'Confirmed' ||
    status === 'Payment Confirmed' ||
    status === 'Paid' ||
    payment === 'Paid' ||
    payment === 'Approved'
  ) {
    return { stageIndex: 1 };
  }

  if (status === 'Payment Rejected' || payment === 'Payment Rejected' || payment === 'Rejected') {
    return { stageIndex: 0, exceptionLabel: 'Payment Verification Required' };
  }

  return { stageIndex: 0 };
}

function getStageTimestamp(order: Order, stageKey: TrackStageKey): string | undefined {
  if (stageKey === 'placed') return order.createdAt;
  const history = Array.isArray(order.statusHistory) ? order.statusHistory : [];
  if (history.length === 0) {
    if (stageKey === 'dispatched') return order.dispatchDate || order.trackingAddedAt;
    return undefined;
  }

  const matchers: Record<TrackStageKey, string[]> = {
    placed: ['new', 'placed', 'awaiting payment'],
    verified: ['confirmed', 'paid', 'verified', 'approved', 'payment confirmed'],
    processing: ['preparing', 'processing'],
    dispatched: ['ready for delivery', 'shipped', 'in transit', 'out for delivery', 'awaiting shipment', 'dispatched'],
    delivered: ['delivered', 'completed']
  };

  const keys = matchers[stageKey];
  const matched = [...history].reverse().find(h => {
    const s = `${h.status || ''} ${h.deliveryStatus || ''} ${h.paymentStatus || ''}`.toLowerCase();
    return keys.some(k => s.includes(k));
  });

  if (matched?.timestamp) return matched.timestamp;
  if (stageKey === 'dispatched') return order.dispatchDate || order.trackingAddedAt;
  return undefined;
}

interface OrderTrackStatusSummaryProps {
  orders?: Order[];
  initialOrderRef?: string;
  customerPhone?: string;
  onOpenFullTracking?: (orderNumber: string) => void;
  currentLang?: Language;
  currentCurrency?: CurrencyCode;
  exchangeRates?: Record<string, number>;
}

export const OrderTrackStatusSummary: React.FC<OrderTrackStatusSummaryProps> = ({
  orders = [],
  initialOrderRef,
  customerPhone,
  onOpenFullTracking,
  currentCurrency = 'RWF',
  exchangeRates
}) => {
  const [orderRefInput, setOrderRefInput] = useState(initialOrderRef || '');
  const [activeRef, setActiveRef] = useState(initialOrderRef || '');
  const [trackedOrder, setTrackedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(null);

  const fetchLatestOrderStatus = useCallback(async (refToFetch: string) => {
    const cleanRef = refToFetch.trim().toUpperCase();
    if (!cleanRef) {
      setError('Please enter an order reference (e.g. CRM-78291).');
      return;
    }

    const localMatch = orders.find(o => o.orderNumber?.toUpperCase() === cleanRef);
    setLoading(true);
    setError(null);
    setActiveRef(cleanRef);

    try {
      const latest = await api.trackOrder(
        cleanRef,
        customerPhone || localMatch?.customerPhone,
        localMatch?.trackingToken
      );
      setTrackedOrder(latest);
      setLastFetchedAt(new Date().toISOString());
    } catch (err: any) {
      setError(err?.message || `Could not fetch status for order #${cleanRef}.`);
      if (!localMatch) {
        setTrackedOrder(null);
      } else {
        setTrackedOrder(localMatch);
      }
    } finally {
      setLoading(false);
    }
  }, [customerPhone, orders]);

  // Sync external initialOrderRef selection
  useEffect(() => {
    if (initialOrderRef && initialOrderRef.trim()) {
      const normalized = initialOrderRef.trim().toUpperCase();
      setOrderRefInput(normalized);
      fetchLatestOrderStatus(normalized);
    }
  }, [initialOrderRef, fetchLatestOrderStatus]);

  // Auto-select customer's latest order on mount if none chosen yet
  useEffect(() => {
    if (!activeRef && !orderRefInput && orders.length > 0) {
      const preferred =
        orders.find(o => o.status !== 'Delivered' && o.status !== 'Cancelled') || orders[0];
      if (preferred?.orderNumber) {
        const ref = preferred.orderNumber.toUpperCase();
        setOrderRefInput(ref);
        fetchLatestOrderStatus(ref);
      }
    }
  }, [orders, activeRef, orderRefInput, fetchLatestOrderStatus]);

  // Live Supabase updates for the currently inspected order
  useEffect(() => {
    if (!trackedOrder?.orderNumber) return;
    const targetRef = trackedOrder.orderNumber.toUpperCase();

    const unsubOrders = subscribeToSupabaseTable('orders', (payload) => {
      const row = payload.new as any;
      if (row && (String(row.order_number || '').toUpperCase() === targetRef || String(row.id) === trackedOrder.id)) {
        fetchLatestOrderStatus(targetRef);
      }
    });

    const unsubPayments = subscribeToSupabaseTable('payments', (payload) => {
      const row = payload.new as any;
      if (row && String(row.order_number || '').toUpperCase() === targetRef) {
        fetchLatestOrderStatus(targetRef);
      }
    });

    return () => {
      unsubOrders();
      unsubPayments();
    };
  }, [trackedOrder?.orderNumber, trackedOrder?.id, fetchLatestOrderStatus]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLatestOrderStatus(orderRefInput);
  };

  const stageResolution = trackedOrder ? resolveOrderStageIndex(trackedOrder) : null;
  const activeStageIdx = stageResolution ? stageResolution.stageIndex : 0;
  const latestNote = trackedOrder?.statusHistory && trackedOrder.statusHistory.length > 0
    ? trackedOrder.statusHistory[trackedOrder.statusHistory.length - 1]?.note
    : undefined;

  return (
    <section
      aria-label="Track Order Status Summary"
      className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-5"
    >
      {/* Header + Lookup Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center shrink-0">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                Track Order Status
              </h2>
              <p className="text-[11px] text-slate-500">
                Live milestone tracking from placement to doorstep delivery.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
          <div className="relative flex-1 sm:w-60">
            <input
              type="text"
              value={orderRefInput}
              onChange={(e) => setOrderRefInput(e.target.value.toUpperCase())}
              placeholder="Order reference (e.g. CRM-...)"
              aria-label="Order reference"
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white text-xs font-mono font-bold uppercase text-slate-900 focus:ring-2 focus:ring-orange-500 outline-none"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={loading || !orderRefInput.trim()}
              className="flex-1 sm:flex-initial px-4 py-2 bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Checking...</span>
                </>
              ) : (
                <>
                  <span>Check Status</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>

            {trackedOrder && (
              <button
                type="button"
                onClick={() => fetchLatestOrderStatus(trackedOrder.orderNumber)}
                disabled={loading}
                title="Refresh latest order status"
                aria-label="Refresh latest order status"
                className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:text-orange-600 hover:border-orange-200 bg-white transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-orange-600' : ''}`} />
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Quick Order Reference Selector Chips */}
      {orders.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
          <span className="font-bold text-slate-500 mr-1">Your Orders:</span>
          {orders.slice(0, 6).map((ord) => {
            const isSelected = trackedOrder?.orderNumber?.toUpperCase() === ord.orderNumber?.toUpperCase();
            return (
              <button
                key={ord.id}
                type="button"
                onClick={() => {
                  const ref = ord.orderNumber.toUpperCase();
                  setOrderRefInput(ref);
                  fetchLatestOrderStatus(ref);
                }}
                className={`px-2.5 py-1 rounded-lg font-mono font-bold transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-orange-600 text-white border-orange-600 shadow-2xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-orange-300 hover:text-orange-700'
                }`}
              >
                {ord.orderNumber}
              </button>
            );
          })}
        </div>
      )}

      {/* Error Notice */}
      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading Skeleton when fetching initial order */}
      {loading && !trackedOrder && (
        <div className="py-8 flex flex-col items-center justify-center gap-2 text-center">
          <RefreshCw className="w-6 h-6 text-orange-600 animate-spin" />
          <p className="text-xs font-medium text-slate-500">
            Fetching latest status for <span className="font-mono font-bold text-slate-800">{activeRef || orderRefInput}</span>...
          </p>
        </div>
      )}

      {/* Empty Prompt State */}
      {!loading && !trackedOrder && !error && (
        <div className="py-6 px-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center space-y-1.5">
          <Package className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-xs font-bold text-slate-700">
            Enter an order reference above to inspect live delivery stages
          </p>
          <p className="text-[11px] text-slate-500">
            Track stages from Placed, Verified, Processing, and Dispatched through to Delivered.
          </p>
        </div>
      )}

      {/* Tracked Order Summary & 5 Visual Stages */}
      {trackedOrder && (
        <div className="space-y-5">
          {/* Metadata Strip */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50/90 border border-slate-200/80">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-black text-slate-900">
                  #{trackedOrder.orderNumber}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                    trackedOrder.paymentStatus === 'Paid' || trackedOrder.paymentStatus === 'Approved'
                      ? 'bg-emerald-100 text-emerald-800'
                      : trackedOrder.paymentStatus === 'Payment Rejected' || trackedOrder.paymentStatus === 'Rejected'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {trackedOrder.paymentStatus || 'Pending Payment'}
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800">
                  {trackedOrder.deliveryStatus || trackedOrder.status || 'Placed'}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  {trackedOrder.deliveryLocation || trackedOrder.deliveryAddress || 'Kigali'}
                </span>
                {trackedOrder.expectedDeliveryDate && (
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    ETA: <strong className="text-slate-700">{trackedOrder.expectedDeliveryDate}</strong>
                  </span>
                )}
                {lastFetchedAt && (
                  <span className="text-[10px] text-slate-400">
                    Synced {new Date(lastFetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
              <div className="text-left sm:text-right">
                <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                  Order Total
                </span>
                <span className="font-mono font-black text-sm text-slate-900">
                  {formatCurrencyPrice(trackedOrder.totalAmount, currentCurrency, exchangeRates).primary}
                </span>
              </div>

              {onOpenFullTracking && (
                <button
                  type="button"
                  onClick={() => onOpenFullTracking(trackedOrder.orderNumber)}
                  className="px-3 py-2 rounded-xl bg-white border border-slate-200 hover:border-orange-300 text-xs font-bold text-slate-700 hover:text-orange-600 transition-colors cursor-pointer inline-flex items-center gap-1"
                >
                  <span>Full Details</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Exception Callout Banner if Cancelled / Rejected / Failed */}
          {stageResolution?.exceptionLabel && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{stageResolution.exceptionLabel}</span>
              {latestNote && <span className="font-normal text-rose-700">— {latestNote}</span>}
            </div>
          )}

          {/* 5 Visual Stages Stepper: Placed -> Verified -> Processing -> Dispatched -> Delivered */}
          <div className="relative pt-2 pb-1">
            {/* Desktop connecting track */}
            <div className="hidden sm:block absolute top-7 left-[10%] right-[10%] h-1 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  stageResolution?.exceptionLabel ? 'bg-rose-400' : 'bg-gradient-to-r from-orange-500 to-emerald-500'
                }`}
                style={{
                  width: `${Math.min(100, Math.max(0, (activeStageIdx / (TRACK_ORDER_STAGES.length - 1)) * 100))}%`
                }}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 sm:gap-2 relative z-10">
              {TRACK_ORDER_STAGES.map((stage, idx) => {
                const Icon = stage.icon;
                const isException = Boolean(stageResolution?.exceptionLabel);
                const isCompleted = !isException && idx < activeStageIdx;
                const isCurrent = idx === activeStageIdx;
                const stageTs = getStageTimestamp(trackedOrder, stage.key);

                return (
                  <div
                    key={stage.key}
                    className={`flex sm:flex-col items-center sm:text-center gap-3 sm:gap-2 p-2.5 sm:p-1.5 rounded-2xl transition-colors ${
                      isCurrent
                        ? isException
                          ? 'bg-rose-50/70 sm:bg-transparent'
                          : 'bg-orange-50/70 sm:bg-transparent'
                        : ''
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center border-2 transition-all shrink-0 ${
                        isCompleted
                          ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                          : isCurrent
                          ? isException
                            ? 'bg-rose-600 border-rose-200 text-white ring-4 ring-rose-100'
                            : 'bg-orange-600 border-orange-200 text-white ring-4 ring-orange-100 shadow-sm'
                          : 'bg-white border-slate-200 text-slate-400'
                      }`}
                    >
                      {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
                    </div>

                    <div className="min-w-0 flex-1 sm:flex-initial">
                      <div className="flex sm:justify-center items-center gap-1.5">
                        <span
                          className={`text-xs font-extrabold ${
                            isCompleted
                              ? 'text-emerald-700'
                              : isCurrent
                              ? isException
                                ? 'text-rose-700'
                                : 'text-orange-700'
                              : 'text-slate-400'
                          }`}
                        >
                          {stage.label}
                        </span>
                        {isCurrent && !isException && (
                          <span className="sm:hidden px-1.5 py-0.2 bg-orange-600 text-white text-[9px] font-black rounded">
                            CURRENT
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
                        {stage.description}
                      </p>
                      {stageTs && (isCompleted || isCurrent) && (
                        <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                          {new Date(stageTs).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dispatch / Courier / Latest Note Footer */}
          {(trackedOrder.trackingNumber || trackedOrder.assignedCourier || latestNote) && (
            <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="space-y-0.5">
                {trackedOrder.trackingNumber && (
                  <p className="text-blue-950 font-bold">
                    Tracking Ref: <span className="font-mono">{trackedOrder.trackingNumber}</span>
                    {trackedOrder.trackingCarrier ? ` (${trackedOrder.trackingCarrier})` : ''}
                  </p>
                )}
                {trackedOrder.assignedCourier && (
                  <p className="text-blue-900 text-[11px]">
                    Courier: <strong>{trackedOrder.assignedCourier}</strong>
                    {trackedOrder.courierPhone ? ` • ${trackedOrder.courierPhone}` : ''}
                  </p>
                )}
                {latestNote && (
                  <p className="text-slate-600 text-[11px]">
                    Latest update: {latestNote}
                  </p>
                )}
              </div>
              {trackedOrder.trackingUrl && (
                <a
                  href={trackedOrder.trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-900 font-bold text-xs shrink-0"
                >
                  <span>Carrier Link</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
