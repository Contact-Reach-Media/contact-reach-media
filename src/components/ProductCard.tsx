import React from 'react';
import { Heart, Star, Camera, Youtube, Truck } from 'lucide-react';
import { Product } from '../types.ts';
import { Language, translations } from '../translations.ts';
import { CurrencyCode, formatCurrencyPrice } from '../utils/currency.ts';
import { calculateProductShippingUnitCost } from '../utils/shippingCalculator.ts';
import { useProductTranslation } from '../services/translation.ts';
import { getProductImageDueToProduct } from '../utils/productImages.ts';

interface ProductCardProps {
  product: Product;
  onViewProduct: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onQuickBuy: (product: Product) => void;
  isWishlisted?: boolean;
  onToggleWishlist?: (product: Product) => void;
  currentLang: Language;
  currentCurrency?: CurrencyCode;
  exchangeRates?: Record<string, number>;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onViewProduct,
  onAddToCart,
  onQuickBuy,
  isWishlisted = false,
  onToggleWishlist,
  currentLang,
  currentCurrency = 'RWF',
  exchangeRates
}) => {
  const t = translations[currentLang] || translations.en;
  const translated = useProductTranslation(product, currentLang);
  const displayName = translated.name || product.name;

  const hasDiscount = Boolean(
    (product.discountPercent !== undefined && product.discountPercent > 0) ||
    (product.discountPrice !== undefined && product.discountPrice < product.price)
  );

  const discountPercent = product.discountPercent || (hasDiscount && product.price > 0 && product.discountPrice
    ? Math.round(((product.price - product.discountPrice) / product.price) * 100)
    : 0);

  const currentPriceRwf = (product.discountPrice !== undefined && product.discountPrice < product.price)
    ? product.discountPrice
    : (discountPercent > 0 ? Math.round(product.price * (1 - discountPercent / 100)) : product.price);

  const priceFormat = formatCurrencyPrice(currentPriceRwf, currentCurrency, exchangeRates, { showBaseSecondary: true });
  const originalFormat = hasDiscount ? formatCurrencyPrice(product.price, currentCurrency, exchangeRates) : null;
  const shippingCost = calculateProductShippingUnitCost(product, currentPriceRwf);
  const shippingFormat = formatCurrencyPrice(shippingCost, currentCurrency, exchangeRates);

  return (
    <div
      onClick={() => onViewProduct(product)}
      className="group bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs hover:shadow-md transition-all duration-300 flex flex-col justify-between cursor-pointer relative hover:-translate-y-0.5 text-start"
    >
      {/* Floating Discount or Status Badge - Single sleek badge, not a crowded stack */}
      <div className="absolute top-2.5 start-2.5 z-10">
        {hasDiscount && discountPercent > 0 ? (
          <span className="bg-[#FF6000] text-white text-[11px] font-extrabold px-2 py-0.5 rounded-md shadow-xs tracking-tight">
            -{discountPercent}%
          </span>
        ) : product.isNewArrival ? (
          <span className="bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs tracking-wide uppercase">
            New
          </span>
        ) : null}
      </div>

      {/* Floating Wishlist Button */}
      <div className="absolute top-2.5 end-2.5 z-10">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleWishlist?.(product);
          }}
          className={`w-7 h-7 rounded-full bg-white/90 backdrop-blur-xs border border-slate-200/90 flex items-center justify-center transition-all shadow-2xs hover:scale-110 cursor-pointer ${
            isWishlisted ? 'text-rose-500 border-rose-200' : 'text-slate-400 hover:text-rose-500'
          }`}
          title={t.wishlist}
          aria-label="Wishlist"
        >
          <Heart className={`w-3.5 h-3.5 ${isWishlisted ? 'fill-rose-500' : ''}`} />
        </button>
      </div>

      {/* Product Image */}
      <div className="relative pt-[100%] bg-slate-50 overflow-hidden">
        <img
          src={product.imageUrl ? product.imageUrl : getProductImageDueToProduct(product)}
          alt={product.name}
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80';
          }}
        />

        {/* Secondary Angle Preview on Hover (if available) */}
        {product.images && product.images[1] && product.images[1].trim() && product.images[1] !== product.imageUrl && (
          <img
            src={product.images[1]}
            alt={`${product.name} alternate view`}
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover object-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        )}

        {(product.status === 'Out of Stock' || product.stock <= 0) && (
          <div className="absolute inset-0 bg-white/85 backdrop-blur-2xs flex flex-col items-center justify-center p-2 text-center z-10">
            <span className="bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
              {t.outOfStock}
            </span>
          </div>
        )}
      </div>

      {/* Product Information - Compact, medium text, clear hierarchy */}
      <div className="p-3 flex flex-col justify-between flex-1">
        <div>
          {/* Price & Discount */}
          <div className="flex items-baseline gap-1.5 mb-1 flex-wrap">
            <span className="text-sm font-black text-[#FF6000] font-mono tabular-nums leading-none">
              {priceFormat.primary}
            </span>
            {hasDiscount && originalFormat && (
              <span className="text-xs text-slate-400 line-through font-mono">
                {originalFormat.primary}
              </span>
            )}
          </div>

          {/* Secondary Currency (if non-RWF selected) */}
          {currentCurrency !== 'RWF' && priceFormat.secondary && (
            <div className="text-[11px] text-slate-400 font-mono mb-1">
              {priceFormat.secondary}
            </div>
          )}

          {/* Product Name - 2 lines clamp, medium text */}
          <h3
            className="text-xs sm:text-sm font-semibold text-slate-800 line-clamp-2 group-hover:text-[#FF6000] transition-colors leading-snug"
            title={displayName}
          >
            {displayName}
          </h3>

          {/* Delivery Note */}
          <div className="flex items-center gap-1 mt-1 text-[11px] text-slate-500">
            <Truck className="w-3 h-3 text-slate-400 shrink-0" />
            <span>+{shippingFormat.primary} delivery</span>
          </div>
        </div>

        {/* Footer: Rating / Stock */}
        <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100 text-[11px]">
          {product.reviewsCount && product.reviewsCount > 0 ? (
            <div className="flex items-center gap-1 text-amber-500 font-semibold">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span>{product.rating?.toFixed(1)}</span>
              <span className="text-slate-400 font-normal">({product.reviewsCount})</span>
            </div>
          ) : (
            <span className="text-slate-400 text-[11px]">Verified</span>
          )}

          <span className={`font-medium ${product.status === 'Out of Stock' || product.stock <= 0 ? 'text-rose-600 font-semibold' : 'text-slate-500'}`}>
            {product.status === 'Out of Stock' || product.stock <= 0 ? t.soldOut : `${product.stock} in stock`}
          </span>
        </div>
      </div>
    </div>
  );
};
