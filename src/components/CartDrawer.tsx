import React from 'react';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react';
import { CartItem } from '../types.ts';
import { Language, translations } from '../translations.ts';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateQuantity: (productId: string, delta: number) => void;
  onRemoveItem: (productId: string) => void;
  onProceedToCheckout: () => void;
  currentLang: Language;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onProceedToCheckout,
  currentLang
}) => {
  if (!isOpen) return null;

  const t = translations[currentLang];
  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

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
              <h3 className="font-bold text-slate-700 text-base">Your cart is currently empty</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Explore our catalog of genuine hair products, smartphones, televisions, and fashion items.
              </p>
            </div>
          ) : (
            cart.map(({ product, quantity }) => (
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
                  <div className="text-xs font-bold text-[#EA580C] font-mono tabular-nums mt-0.5">
                    {(product.price * quantity).toLocaleString()} FRW
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
                      disabled={quantity >= product.stock}
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
            ))
          )}
        </div>

        {/* Drawer Footer */}
        {cart.length > 0 && (
          <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50/50 space-y-4">
            <div className="space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>{t.subtotal}</span>
                <span className="font-bold text-slate-900 font-mono tabular-nums text-sm">
                  {subtotal.toLocaleString()} FRW
                </span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>{t.deliveryFee}</span>
                <span>Calculated at checkout (Kigali 1,500 FRW)</span>
              </div>
            </div>

            <button
              onClick={() => {
                onClose();
                onProceedToCheckout();
              }}
              className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-[#EA580C] hover:bg-[#D94F04] text-white shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>{t.checkoutTitle}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
