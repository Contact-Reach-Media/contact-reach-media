import React from 'react';
import {
  ShoppingBag, Trash2, Plus, Minus, ArrowRight, ArrowLeft,
  Truck, ShieldCheck, CheckCircle2, ChevronRight, Package
} from 'lucide-react';
import { AppSettings, CartItem, Product } from '../types.ts';
import { Language, translations } from '../translations.ts';
import { CurrencyCode, formatCurrencyPrice } from '../utils/currency.ts';
import { calculateCartBreakdown } from '../utils/shippingCalculator.ts';
import { getProductImageDueToProduct } from '../utils/productImages.ts';

interface CartPageProps {
  cart: CartItem[];
  settings?: AppSettings;
  onUpdateQuantity: (productId: string, delta: number) => void;
  onRemoveItem: (productId: string) => void;
  onNavigate: (view: string, params?: any) => void;
  onSelectProduct: (product: Product) => void;
  currentLang: Language;
  currentCurrency?: CurrencyCode;
  exchangeRates?: Record<string, number>;
}

export const CartPage: React.FC<CartPageProps> = ({
  cart,
  settings,
  onUpdateQuantity,
  onRemoveItem,
  onNavigate,
  onSelectProduct,
  currentLang,
  currentCurrency = 'RWF',
  exchangeRates
}) => {
  const t = translations[currentLang] || translations.en;
  const breakdown = calculateCartBreakdown(cart, { settings });

  const subtotalFormatted = formatCurrencyPrice(breakdown.subtotal, currentCurrency, exchangeRates, { showBaseSecondary: true });
  const subtotalWithShippingFormatted = formatCurrencyPrice(breakdown.subtotalWithShipping, currentCurrency, exchangeRates);
  const estimatedDelivery = breakdown.deliveryFee;
  const estimatedTotal = breakdown.grandTotal;
  const totalFormatted = formatCurrencyPrice(estimatedTotal, currentCurrency, exchangeRates, { showBaseSecondary: true });

  const freeDeliveryThreshold = settings?.freeDeliveryThreshold ?? 50000;
  const progressToFreeDelivery = Math.min(100, Math.round((breakdown.subtotal / freeDeliveryThreshold) * 100));
  const remainingForFreeDelivery = Math.max(0, freeDeliveryThreshold - breakdown.subtotal);

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
            onClick={() => onNavigate('shop')}
            className="hover:text-orange-600 transition-colors font-medium cursor-pointer"
          >
            Shop
          </button>
          <span>/</span>
          <span className="font-semibold text-slate-900">Shopping Cart</span>
        </nav>

        {/* Page Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Shopping Cart
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {cart.length === 0
                ? 'Your cart is currently empty'
                : `You have ${cart.reduce((sum, item) => sum + item.quantity, 0)} item(s) in your basket`}
            </p>
          </div>

          {cart.length > 0 && (
            <button
              onClick={() => onNavigate('shop')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 hover:text-orange-700 hover:underline cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Continue Shopping</span>
            </button>
          )}
        </div>

        {cart.length === 0 ? (
          /* Empty Cart State */
          <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 text-center shadow-xs space-y-5">
            <div className="w-16 h-16 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center mx-auto text-orange-600">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-800">Your basket is empty</h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                Looks like you haven't added any products to your shopping cart yet. Explore thousands of deals on ContactReach Market!
              </p>
            </div>
            <button
              onClick={() => onNavigate('shop')}
              className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl text-xs sm:text-sm font-black shadow-md hover:shadow-lg transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <span>Start Shopping Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          /* Cart Content Layout */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">

            {/* Left Column: Cart Items List (8 cols) */}
            <div className="lg:col-span-8 space-y-4">

              {/* Free Delivery Banner */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-bold text-slate-800">
                    <Truck className="w-4 h-4 text-orange-600" />
                    <span>
                      {breakdown.subtotal >= freeDeliveryThreshold
                        ? '🎉 You qualify for FREE Delivery in Kigali!'
                        : `Add ${remainingForFreeDelivery.toLocaleString()} FRW more to get FREE Delivery in Kigali`}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-slate-500">{progressToFreeDelivery}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-orange-500 to-emerald-500 transition-all duration-300"
                    style={{ width: `${progressToFreeDelivery}%` }}
                  />
                </div>
              </div>

              {/* Items Table/Cards */}
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden divide-y divide-slate-100">
                {breakdown.items.map((bItem) => {
                  const item = cart.find(c => c.product.id === bItem.product.id);
                  const resolvedImg = getProductImageDueToProduct(bItem.product);
                  const itemUnitPrice = bItem.unitPrice;
                  const itemTotalWithShippingFormatted = formatCurrencyPrice(bItem.itemTotalWithShipping, currentCurrency, exchangeRates);

                  return (
                    <div
                      key={bItem.product.id}
                      className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors"
                    >
                      {/* Product Image & Info */}
                      <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                        <img
                          src={resolvedImg}
                          alt={bItem.product.name}
                          className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover bg-white border border-slate-200 shrink-0 shadow-2xs cursor-pointer"
                          referrerPolicy="no-referrer"
                          onClick={() => {
                            onSelectProduct(bItem.product);
                            onNavigate('product', { productId: bItem.product.id });
                          }}
                        />

                        <div className="min-w-0 flex-1 space-y-1">
                          <button
                            type="button"
                            onClick={() => {
                              onSelectProduct(bItem.product);
                              onNavigate('product', { productId: bItem.product.id });
                            }}
                            className="font-bold text-xs sm:text-sm text-slate-900 hover:text-orange-600 text-left line-clamp-2 transition-colors cursor-pointer"
                          >
                            {bItem.product.name}
                          </button>

                          <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-wrap">
                            <span className="capitalize">{bItem.product.category}</span>
                            {bItem.product.shopName && (
                              <span>&bull; {bItem.product.shopName}</span>
                            )}
                            {item?.variation && Object.entries(item.variation).map(([k, v]) => (
                              <span key={k} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[10px]">
                                {k}: {v}
                              </span>
                            ))}
                          </div>

                          <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
                            <span className="font-bold text-slate-700">
                              {formatCurrencyPrice(itemUnitPrice, currentCurrency, exchangeRates).primary} each
                            </span>
                            <span className="text-[11px] text-orange-700 font-semibold bg-orange-50 px-1.5 py-0.5 rounded border border-orange-200">
                              +{formatCurrencyPrice(bItem.itemShippingCost, currentCurrency, exchangeRates).primary} shipping
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Quantity & Item Total */}
                      <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100">
                        {/* Quantity Controls */}
                        <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 p-1 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(bItem.product.id, -1)}
                            className="p-1.5 rounded-lg hover:bg-white text-slate-600 cursor-pointer transition-colors"
                            title="Decrease quantity"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-8 text-center font-mono font-bold text-xs text-slate-900">
                            {bItem.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(bItem.product.id, 1)}
                            disabled={!bItem.isOutOfStock && bItem.quantity >= (bItem.product.stock || 50)}
                            className="p-1.5 rounded-lg hover:bg-white text-slate-600 disabled:opacity-30 cursor-pointer transition-colors"
                            title="Increase quantity"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Total Price (Product + Shipping) */}
                        <div className="text-right min-w-[100px]">
                          <span className="font-mono font-black text-sm text-slate-900 block">
                            {itemTotalWithShippingFormatted.primary}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400 block">
                            Incl. shipping
                          </span>
                        </div>

                        {/* Remove Button */}
                        <button
                          type="button"
                          onClick={() => onRemoveItem(bItem.product.id)}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Remove item from basket"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Delivery info notice */}
              <div className="p-4 rounded-2xl bg-slate-100/70 border border-slate-200 text-xs text-slate-600 flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>
                  All purchases are protected by ContactReach Market Buyer Guarantee. Verify items upon doorstep delivery.
                </span>
              </div>
            </div>

            {/* Right Column: Order Summary Card (4 cols) */}
            <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-24">
              <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
                <h3 className="text-base font-black text-slate-900 border-b border-slate-100 pb-3">
                  Order Summary
                </h3>

                <div className="space-y-2.5 text-xs text-slate-600">
                  <div className="flex justify-between items-center">
                    <span>1. Product Price (Subtotal):</span>
                    <span className="font-mono font-bold text-slate-900">{subtotalFormatted.primary}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1">
                      <span>2. Shipping Cost:</span>
                      <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.2 rounded font-bold font-mono">
                        1,500 + 10%
                      </span>
                    </span>
                    <span className="font-mono font-bold text-orange-700">
                      +{formatCurrencyPrice(breakdown.shippingCost, currentCurrency, exchangeRates).primary}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-1.5 border-t border-slate-100">
                    <span className="font-semibold text-slate-700">Product + Shipping:</span>
                    <span className="font-mono font-bold text-slate-900">{subtotalWithShippingFormatted.primary}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span>3. Estimated Delivery (Kigali):</span>
                    <span className="font-mono font-bold text-slate-900">
                      {estimatedDelivery === 0 ? (
                        <span className="text-emerald-600 font-black">FREE</span>
                      ) : (
                        formatCurrencyPrice(estimatedDelivery, currentCurrency, exchangeRates).primary
                      )}
                    </span>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex justify-between items-baseline">
                    <span className="text-sm font-black text-slate-900">Estimated Total:</span>
                    <div className="text-right">
                      <span className="text-lg font-black text-orange-600 font-mono block">
                        {totalFormatted.primary}
                      </span>
                      {totalFormatted.secondary && (
                        <span className="text-[10px] text-slate-400 font-mono block">
                          {totalFormatted.secondary}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Checkout CTA */}
                <button
                  type="button"
                  onClick={() => onNavigate('checkout')}
                  className="w-full py-3.5 px-5 bg-orange-600 hover:bg-orange-700 text-white font-black text-sm rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Proceed to Checkout</span>
                  <ChevronRight className="w-4 h-4" />
                </button>

                <p className="text-[11px] text-center text-slate-400">
                  Taxes, discounts, and final delivery options calculated during checkout.
                </p>
              </div>

              {/* Payment Methods Accepted */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200/90 text-center space-y-2 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  Accepted Payment Methods in Rwanda
                </span>
                <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-600 flex-wrap">
                  <span className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-200">MTN MoMo</span>
                  <span className="px-2 py-0.5 rounded-lg bg-red-50 text-red-900 border border-red-200">Airtel Money</span>
                  <span className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-900 border border-blue-200">Bank Transfer</span>
                  <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700">Cash / Pickup</span>
                </div>
              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  );
};
