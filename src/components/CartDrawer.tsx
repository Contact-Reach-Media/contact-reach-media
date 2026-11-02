import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight, Truck } from 'lucide-react';
import { CartItem } from '../types.ts';
import { Language, translations } from '../translations.ts';
import { CurrencyCode, formatCurrencyPrice } from '../utils/currency.ts';
import { calculateCartBreakdown, isProductOutOfStock, calculateProductShippingUnitCost } from '../utils/shippingCalculator.ts';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateQuantity: (productId: string, delta: number) => void;
  onRemoveItem: (productId: string) => void;
  onProceedToCheckout: () => void;
  currentLang: Language;
  currentCurrency?: CurrencyCode;
  exchangeRates?: Record<string, number>;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onProceedToCheckout,
  currentLang,
  currentCurrency = 'RWF',
  exchangeRates
}) => {
  if (!isOpen) return null;

  const t = translations[currentLang] || translations.en;
  const breakdown = calculateCartBreakdown(cart);
  const subtotalFormat = formatCurrencyPrice(breakdown.subtotal, currentCurrency, exchangeRates, { showBaseSecondary: true });
  const estimatedDelivery = breakdown.subtotal >= 50000 ? 0 : 1500;
  const estimatedTotal = breakdown.subtotal + breakdown.shippingCost + estimatedDelivery;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between">
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src="/logo.png"
              alt="ContactReach Market Logo"
              className="w-7 h-7 rounded-full object-contain border border-slate-200 bg-white shadow-2xs shrink-0"
            />
            <h2 className="font-extrabold text-base sm:text-lg text-slate-900">
              {t.cart} ({cart.reduce((count, item) => count + item.quantity, 0)})
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-800 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {cart.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <div className="w-16 h-16 rounded-full bg-orange-50 text-[#EA580C] mx-auto flex items-center justify-center">
                <ShoppingBag className="w-8 h-8 opacity-60" />
              </div>
              <h3 className="font-bold text-slate-700 text-base">{t.emptyCart}</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                {t.continueShopping}
              </p>
            </div>
          ) : (
            cart.map(({ product, quantity }) => {
              const itemTotalRwf = product.price * quantity;
              const itemPriceFormat = formatCurrencyPrice(itemTotalRwf, currentCurrency, exchangeRates, { showBaseSecondary: true });

              return (
                <div
                  key={product.id}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/80"
                >
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    referrerPolicy="no-referrer"
                    className="w-16 h-16 rounded-xl object-cover bg-white shrink-0 border border-slate-100"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/src/assets/images/product_street_sneakers_1791966366958.jpg';
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                      {product.name}
                    </h4>
                    <div className="flex items-baseline gap-1.5 flex-wrap mt-0.5">
                      <span className="text-xs font-bold text-[#EA580C] font-mono tabular-nums">
                        {itemPriceFormat.primary}
                      </span>
                      {currentCurrency !== 'RWF' && itemPriceFormat.secondary && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          {itemPriceFormat.secondary}
                        </span>
                      )}
                    </div>

                    <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-orange-50 text-orange-800 border border-orange-200">
                        <Truck className="w-2.5 h-2.5 text-[#FF5500] shrink-0" />
                        <span>Ship: +{formatCurrencyPrice(calculateProductShippingUnitCost(product), currentCurrency, exchangeRates).primary}</span>
                      </span>
                      {isProductOutOfStock(product) ? (
                        <span className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200">
                          ⚡ Supplier Order
                        </span>
                      ) : (
                        <span className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                          ✓ In Local Stock
                        </span>
                      )}
                    </div>

                    {/* Quantity Stepper */}
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => onUpdateQuantity(product.id, -1)}
                        className="w-6 h-6 rounded bg-white border border-slate-300 flex items-center justify-center text-slate-600 hover:bg-slate-100 cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-bold font-mono px-1">{quantity}</span>
                      <button
                        onClick={() => onUpdateQuantity(product.id, 1)}
                        disabled={!isProductOutOfStock(product) && quantity >= product.stock}
                        className="w-6 h-6 rounded bg-white border border-slate-300 flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => onRemoveItem(product.id)}
                    className="p-2 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-white transition-colors cursor-pointer"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Drawer Footer with Full Cost Breakdown */}
        {cart.length > 0 && (
          <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50/70 space-y-3.5">
            <div className="space-y-2 text-xs text-slate-600">
              {/* Row 1: Product Price (Subtotal) */}
              <div className="flex justify-between items-baseline">
                <span>1. Product Price (Subtotal):</span>
                <div className="text-end">
                  <span className="font-bold text-slate-900 font-mono tabular-nums text-sm block">
                    {subtotalFormat.primary}
                  </span>
                  {currentCurrency !== 'RWF' && subtotalFormat.secondary && (
                    <span className="text-[10px] text-slate-400 font-mono block">
                      {subtotalFormat.secondary}
                    </span>
                  )}
                </div>
              </div>

              {/* Row 2: Delivery Fee */}
              <div className="flex justify-between text-[11px] items-center">
                <span>2. Local Delivery Fee:</span>
                <span className="font-mono text-slate-800 font-bold">
                  {estimatedDelivery === 0 ? '0 RWF (Free)' : `${estimatedDelivery.toLocaleString()} RWF`}
                </span>
              </div>

              {/* Row 3: Shipping Cost (1,500 + 10% of product cost) */}
              <div className="flex justify-between text-[11px] items-center">
                <span className="flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5 text-[#EA580C]" />
                  <span>3. Shipping Cost:</span>
                  <span className="text-[9px] bg-orange-100 text-[#EA580C] px-1 py-0.2 rounded font-bold font-mono">
                    1,500 + 10%
                  </span>
                </span>
                <span className="font-mono font-bold text-slate-900">
                  +{formatCurrencyPrice(breakdown.shippingCost, currentCurrency, exchangeRates).primary}
                </span>
              </div>

              {/* Total Payment Row */}
              <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline font-black text-slate-900">
                <div>
                  <span className="text-xs uppercase block">Total Payment:</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    Product Price + Delivery Fee + Shipping Cost
                  </span>
                </div>
                <span className="text-base text-[#EA580C] font-mono tabular-nums">
                  {formatCurrencyPrice(estimatedTotal, currentCurrency, exchangeRates).primary}
                </span>
              </div>

              {currentCurrency !== 'RWF' && (
                <div className="text-[10px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
                  {t.currencyNotice}
                </div>
              )}
            </div>

            <button
              onClick={() => {
                onClose();
                onProceedToCheckout();
              }}
              className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-[#EA580C] hover:bg-[#D94F04] text-white shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>{t.proceedToCheckout}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
