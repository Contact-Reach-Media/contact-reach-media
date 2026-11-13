import React, { useState, useMemo, useEffect } from 'react';
import {
  ShieldCheck, MapPin, Tag, Smartphone, CheckCircle2, ChevronRight,
  Info, Truck, Zap, ArrowLeft, AlertCircle, ShoppingBag, CreditCard
} from 'lucide-react';
import { CartItem, Order, PaymentMethod, AppSettings, CustomerUser } from '../types.ts';
import { Language, translations } from '../translations.ts';
import { api } from '../services/api.ts';
import { CurrencyCode, formatCurrencyPrice } from '../utils/currency.ts';
import { calculateCartBreakdown, getEffectiveUnitPrice } from '../utils/shippingCalculator.ts';
import { getProductImageDueToProduct } from '../utils/productImages.ts';

interface CheckoutPageProps {
  cart: CartItem[];
  settings: AppSettings;
  onOrderCreated: (order: Order) => void;
  onNavigate: (view: string, params?: any) => void;
  currentLang: Language;
  currentCurrency?: CurrencyCode;
  exchangeRates?: Record<string, number>;
  buyerUser?: CustomerUser | null;
  onOpenBuyerAuth?: () => void;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({
  cart,
  settings,
  onOrderCreated,
  onNavigate,
  currentLang,
  currentCurrency = 'RWF',
  exchangeRates,
  buyerUser,
  onOpenBuyerAuth
}) => {
  const t = translations[currentLang] || translations.en;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [customerName, setCustomerName] = useState(buyerUser?.name || '');
  const [customerPhone, setCustomerPhone] = useState(buyerUser?.phone || '');
  const [customerEmail, setCustomerEmail] = useState(buyerUser?.email || '');
  const [selectedLocationId, setSelectedLocationId] = useState<string>(settings.kigaliAreas?.[0]?.id || 'gasabo');
  const [deliveryAddress, setDeliveryAddress] = useState(buyerUser?.deliveryAddress || 'Kigali, Gasabo');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('MTN Merchant Code');

  // Coupon
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [discountMsg, setDiscountMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  // Sync with buyerUser profile
  useEffect(() => {
    if (buyerUser) {
      if (buyerUser.name && !customerName) setCustomerName(buyerUser.name);
      if (buyerUser.phone && !customerPhone) setCustomerPhone(buyerUser.phone);
      if (buyerUser.email && !customerEmail) setCustomerEmail(buyerUser.email);
      if (buyerUser.deliveryAddress && (!deliveryAddress || deliveryAddress === 'Kigali, Gasabo')) {
        setDeliveryAddress(buyerUser.deliveryAddress);
      }
    }
  }, [buyerUser]);

  const cartBreakdown = useMemo(() => {
    return calculateCartBreakdown(cart, {
      selectedLocationId,
      settings,
      appliedDiscount
    });
  }, [cart, selectedLocationId, settings, appliedDiscount]);

  const subtotal = cartBreakdown.subtotal;
  const isOutsideKigali = selectedLocationId === 'outside';
  const currentArea = settings.kigaliAreas?.find(a => a.id === selectedLocationId);
  const deliveryFee = cartBreakdown.deliveryFee;
  const shippingCost = cartBreakdown.shippingCost;
  const totalAmount = cartBreakdown.totalAmount;

  // Coupon validation handler
  const handleApplyCoupon = async () => {
    if (!discountCode.trim()) return;
    setValidatingCoupon(true);
    setDiscountMsg(null);
    try {
      const res = await api.validateCoupon(discountCode.trim(), subtotal);
      if (res.valid) {
        setAppliedDiscount(res.discountAmount);
        setDiscountMsg({ text: `Coupon applied: ${res.discountAmount.toLocaleString()} FRW saved!`, isError: false });
      } else {
        setAppliedDiscount(0);
        setDiscountMsg({ text: res.message || 'Invalid coupon code', isError: true });
      }
    } catch (err: any) {
      setAppliedDiscount(0);
      setDiscountMsg({ text: err.message || 'Failed to validate coupon', isError: true });
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    if (!customerName.trim()) {
      setError('Please provide your full name.');
      return;
    }

    const cleanPhone = customerPhone.replace(/\D/g, '');
    if (cleanPhone.length < 9) {
      setError('Please provide a valid Rwandan phone number (e.g. 0780000000).');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let selectedLocationName = currentArea?.name || 'Kigali Area';
      if (selectedLocationId === 'pickup') {
        selectedLocationName = 'Store Pickup (Fair View Plaza, Kigali)';
      } else if (selectedLocationId === 'international') {
        selectedLocationName = 'International / Worldwide Delivery';
      } else if (isOutsideKigali) {
        selectedLocationName = 'Outside Kigali (Upcountry / Intara)';
      }

      const orderPayload = {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim() || undefined,
        userId: buyerUser?.id || undefined,
        deliveryType: selectedLocationId === 'pickup' ? ('pickup' as const) : ('delivery' as const),
        deliveryLocation: selectedLocationName,
        deliveryAddress: deliveryAddress.trim(),
        deliveryNotes: deliveryNotes.trim() || undefined,
        items: cart.map(item => ({
          productId: item.product.id,
          productName: item.product.name,
          name: item.product.name,
          price: getEffectiveUnitPrice(item.product, item.quantity),
          quantity: item.quantity,
          imageUrl: item.product.imageUrl || '/logo.png',
          variation: item.variation || item.selectedVariation
        })),
        shippingCost,
        paymentMethod,
        couponCode: appliedDiscount > 0 ? discountCode.trim() : undefined
      };

      const orderData = await api.createOrder(orderPayload);
      if (!orderData || !orderData.orderNumber) {
        throw new Error('Could not generate order reference. Please try again.');
      }

      onOrderCreated(orderData);

      // Automatically navigate to dedicated full-page Payment / Confirmation
      onNavigate('payment', { orderRef: orderData.orderNumber });
    } catch (err: any) {
      console.error('Checkout error:', err);
      setError(err.message || 'An error occurred while creating order.');
      if (err?.requiresAuth && onOpenBuyerAuth) {
        onOpenBuyerAuth();
      }
      setLoading(false);
    }
  };

  if (!buyerUser && !api.getBuyerToken()) {
    return (
      <div className="bg-slate-50 min-h-screen py-12 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white rounded-3xl border border-orange-200 p-8 max-w-md w-full shadow-xs space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-orange-50 text-[#FF6000] flex items-center justify-center mx-auto">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-black text-slate-900">
            {currentLang === 'en' ? 'Buyer Account Required' : 'Konti y\'Umuguzi Iracyenewe'}
          </h2>
          <p className="text-slate-600 text-xs leading-relaxed">
            {currentLang === 'en'
              ? 'To buy any product on ContactReach Market, please create a free buyer account or sign in first.'
              : 'Kugira ngo ugure igicuruzwa icyo ari cyo cyose kuri ContactReach Market, banza ufungure konti cyangwa winjire.'}
          </p>
          <div className="flex flex-col gap-2 pt-2">
            <button
              type="button"
              onClick={() => (onOpenBuyerAuth ? onOpenBuyerAuth() : onNavigate('register'))}
              className="w-full py-3 bg-[#FF6000] hover:bg-orange-600 text-white rounded-xl text-xs font-black shadow-xs cursor-pointer"
            >
              {currentLang === 'en' ? 'Create Buyer Account / Sign In' : 'Fungura Konti / Injira'}
            </button>
            <button
              type="button"
              onClick={() => onNavigate('cart')}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
            >
              {currentLang === 'en' ? 'Return to Cart' : 'Subira mu Igate'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="bg-slate-50 min-h-screen py-12 flex flex-col items-center justify-center p-6 text-center">
        <ShoppingBag className="w-16 h-16 text-slate-300 mb-4" />
        <h2 className="text-xl font-bold text-slate-800">Your Cart is Empty</h2>
        <p className="text-slate-500 text-sm mt-1 max-w-md">
          You don't have any items in your cart to checkout. Add products first to proceed!
        </p>
        <button
          onClick={() => onNavigate('shop')}
          className="mt-6 px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-colors cursor-pointer"
        >
          Explore All Products
        </button>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen py-6 sm:py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

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
            onClick={() => onNavigate('cart')}
            className="hover:text-orange-600 transition-colors font-medium cursor-pointer"
          >
            Shopping Cart
          </button>
          <span>/</span>
          <span className="font-semibold text-slate-900">Checkout</span>
        </nav>

        {/* Page Title & Back Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Order Checkout
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Enter your delivery details and choose your preferred payment method.
            </p>
          </div>

          <button
            onClick={() => onNavigate('cart')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:text-orange-600 transition-colors cursor-pointer shadow-2xs self-start sm:self-auto"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Cart</span>
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmitOrder}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">

            {/* Left Column: Delivery & Payment Details (8 cols) */}
            <div className="lg:col-span-8 space-y-6">

              {/* SECTION 1: Customer Contact & Delivery */}
              <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-7 shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <MapPin className="w-4 h-4 text-orange-600" />
                  <h2 className="text-sm sm:text-base font-black text-slate-900">
                    1. Customer Contact & Delivery Address
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Jean Pierre Uwimana"
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Phone Number (MTN / Airtel) *
                    </label>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="078... or 073..."
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 text-xs font-mono"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">
                      Email Address (Optional)
                    </label>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="e.g. client@example.com (for order receipt)"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Delivery Region / Location *
                    </label>
                    <select
                      value={selectedLocationId}
                      onChange={(e) => setSelectedLocationId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 text-xs font-bold bg-white"
                    >
                      <optgroup label="Kigali Delivery">
                        {settings.kigaliAreas?.map(a => (
                          <option key={a.id} value={a.id}>
                            {a.name} ({cartBreakdown.isFreeDelivery || a.fee === 0 ? 'FREE' : `${a.fee.toLocaleString()} FRW`})
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Other Options">
                        <option value="pickup">Store Pickup (Fair View Plaza, Kigali - FREE)</option>
                        <option value="outside">Outside Kigali (Upcountry - {(settings.deliveryFeeUpcountry ?? 3500).toLocaleString()} FRW)</option>
                        <option value="international">International Delivery ({((settings as any)?.deliveryFeeInternational ?? 5000).toLocaleString()} FRW)</option>
                      </optgroup>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Specific Address / Landmark *
                    </label>
                    <input
                      type="text"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="House / Street / KN... / Near Hospital"
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 text-xs"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">
                      Delivery Notes / Special Instructions
                    </label>
                    <input
                      type="text"
                      value={deliveryNotes}
                      onChange={(e) => setDeliveryNotes(e.target.value)}
                      placeholder="e.g. Call when dispatch rider reaches the gate"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: Payment Method */}
              <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-7 shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <CreditCard className="w-4 h-4 text-orange-600" />
                  <h2 className="text-sm sm:text-base font-black text-slate-900">
                    2. Select Payment Method
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* MTN Merchant Code */}
                  <label
                    className={`p-3.5 rounded-2xl border-2 flex items-start gap-3 cursor-pointer transition-all ${
                      paymentMethod === 'MTN Merchant Code'
                        ? 'border-orange-600 bg-orange-50/50 shadow-2xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="MTN Merchant Code"
                      checked={paymentMethod === 'MTN Merchant Code'}
                      onChange={() => setPaymentMethod('MTN Merchant Code')}
                      className="mt-0.5 text-orange-600 focus:ring-orange-500 cursor-pointer"
                    />
                    <div>
                      <div className="flex items-center gap-1.5 font-extrabold text-slate-900">
                        <span>MTN MoMoPay</span>
                        <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[10px]">Merchant</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Code: <strong>2328354</strong> (*182*8*1*2328354#)
                      </p>
                    </div>
                  </label>

                  {/* MTN Mobile Money */}
                  <label
                    className={`p-3.5 rounded-2xl border-2 flex items-start gap-3 cursor-pointer transition-all ${
                      paymentMethod === 'MTN Mobile Money'
                        ? 'border-orange-600 bg-orange-50/50 shadow-2xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="MTN Mobile Money"
                      checked={paymentMethod === 'MTN Mobile Money'}
                      onChange={() => setPaymentMethod('MTN Mobile Money')}
                      className="mt-0.5 text-orange-600 focus:ring-orange-500 cursor-pointer"
                    />
                    <div>
                      <div className="flex items-center gap-1.5 font-extrabold text-slate-900">
                        <span>MTN Direct Transfer</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Transfer to <strong>0780022600 (Ruth)</strong>
                      </p>
                    </div>
                  </label>

                  {/* Airtel Money */}
                  <label
                    className={`p-3.5 rounded-2xl border-2 flex items-start gap-3 cursor-pointer transition-all ${
                      paymentMethod === 'Airtel Money'
                        ? 'border-orange-600 bg-orange-50/50 shadow-2xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="Airtel Money"
                      checked={paymentMethod === 'Airtel Money'}
                      onChange={() => setPaymentMethod('Airtel Money')}
                      className="mt-0.5 text-orange-600 focus:ring-orange-500 cursor-pointer"
                    />
                    <div>
                      <div className="flex items-center gap-1.5 font-extrabold text-slate-900">
                        <span>Airtel Money</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Send to <strong>0780022600 (Ruth)</strong>
                      </p>
                    </div>
                  </label>

                  {/* Bank Transfer */}
                  <label
                    className={`p-3.5 rounded-2xl border-2 flex items-start gap-3 cursor-pointer transition-all ${
                      paymentMethod === 'Bank Transfer'
                        ? 'border-orange-600 bg-orange-50/50 shadow-2xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="Bank Transfer"
                      checked={paymentMethod === 'Bank Transfer'}
                      onChange={() => setPaymentMethod('Bank Transfer')}
                      className="mt-0.5 text-orange-600 focus:ring-orange-500 cursor-pointer"
                    />
                    <div>
                      <div className="flex items-center gap-1.5 font-extrabold text-slate-900">
                        <span>Bank Transfer</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        I&M Bank Rwanda
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* SECTION 3: Promo / Coupon Code */}
              <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-7 shadow-xs space-y-3">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-orange-600" />
                  <h2 className="text-sm font-black text-slate-900">Have a Promotional Code?</h2>
                </div>

                <div className="flex gap-2 text-xs">
                  <input
                    type="text"
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                    placeholder="Enter code (e.g. WELCOME10)"
                    className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 font-mono uppercase text-xs focus:ring-2 focus:ring-orange-500"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={validatingCoupon || !discountCode.trim()}
                    className="px-4 py-2 bg-slate-900 hover:bg-black text-white font-bold rounded-xl text-xs cursor-pointer disabled:opacity-50 transition-colors"
                  >
                    {validatingCoupon ? 'Checking...' : 'Apply'}
                  </button>
                </div>

                {discountMsg && (
                  <p className={`text-xs font-bold ${discountMsg.isError ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {discountMsg.text}
                  </p>
                )}
              </div>

            </div>

            {/* Right Column: Order Review & Submit (4 cols) */}
            <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-24">
              <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
                <h3 className="text-base font-black text-slate-900 border-b border-slate-100 pb-3">
                  Order Review ({cart.length} item{cart.length > 1 ? 's' : ''})
                </h3>

                {/* Items Mini List */}
                <div className="max-h-60 overflow-y-auto space-y-2.5 pr-1 divide-y divide-slate-100">
                  {cartBreakdown.items.map(bItem => {
                    const resolvedImg = getProductImageDueToProduct(bItem.product);
                    return (
                      <div key={bItem.product.id} className="pt-2 first:pt-0 flex items-center gap-2.5 text-xs">
                        <img
                          src={resolvedImg && resolvedImg.trim() ? resolvedImg : '/logo.png'}
                          alt={bItem.product.name}
                          className="w-10 h-10 rounded-lg object-cover bg-white border border-slate-200 shrink-0"
                          referrerPolicy="no-referrer"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/logo.png'; }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-800 truncate">{bItem.product.name}</p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            {bItem.quantity} &times; {bItem.unitPrice.toLocaleString()} FRW
                            <span className="text-orange-700 font-semibold"> (+{bItem.itemShippingCost.toLocaleString()} ship)</span>
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-mono font-bold text-slate-900 block">
                            {bItem.itemTotalWithShipping.toLocaleString()} FRW
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono block">
                            Incl. ship
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pricing Breakdown */}
                <div className="space-y-2 text-xs text-slate-600 pt-3 border-t border-slate-100">
                  <div className="flex justify-between items-center">
                    <span>1. Product Price (Subtotal):</span>
                    <span className="font-mono font-bold text-slate-900">
                      {subtotal.toLocaleString()} FRW
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-orange-700">
                    <span className="flex items-center gap-1">
                      <span>2. Shipping Cost:</span>
                      <span className="text-[9px] bg-orange-100 px-1 rounded font-bold font-mono">1,500 + 10%</span>
                    </span>
                    <span className="font-mono font-bold">
                      +{shippingCost.toLocaleString()} FRW
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-1.5 border-t border-slate-100">
                    <span className="font-semibold text-slate-700">Product + Shipping Subtotal:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {cartBreakdown.subtotalWithShipping.toLocaleString()} FRW
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span>3. Delivery Fee:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {deliveryFee === 0 ? (
                        <span className="text-emerald-600 font-bold">FREE</span>
                      ) : (
                        `${deliveryFee.toLocaleString()} FRW`
                      )}
                    </span>
                  </div>

                  {appliedDiscount > 0 && (
                    <div className="flex justify-between items-center text-emerald-600">
                      <span>Discount Saved:</span>
                      <span className="font-mono font-bold">
                        -{appliedDiscount.toLocaleString()} FRW
                      </span>
                    </div>
                  )}

                  <div className="pt-3 border-t border-slate-100 flex justify-between items-baseline">
                    <span className="text-sm font-black text-slate-900">Total Due:</span>
                    <div className="text-right">
                      <span className="text-lg font-black text-orange-600 font-mono block">
                        {formatCurrencyPrice(totalAmount, currentCurrency, exchangeRates).primary}
                      </span>
                      {currentCurrency !== 'RWF' && (
                        <span className="text-[10px] text-slate-400 font-mono block">
                          (~ {totalAmount.toLocaleString()} FRW)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Submit Order Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-5 bg-orange-600 hover:bg-orange-700 text-white font-black text-sm rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <span>{loading ? 'Processing Order...' : 'Place Order & Proceed to Payment'}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>

                <p className="text-[11px] text-center text-slate-400">
                  By clicking Place Order, your order reference will be generated and you will be directed to payment instructions.
                </p>
              </div>

              {/* Guarantee */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200/90 text-xs text-slate-600 flex items-center gap-3 shadow-2xs">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>
                  100% Secure Checkout. Live order tracking reference generated immediately.
                </span>
              </div>

            </div>

          </div>
        </form>

      </div>
    </div>
  );
};
