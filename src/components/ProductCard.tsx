import React from 'react';
import { Heart, Star, Camera, Youtube } from 'lucide-react';
import { Product } from '../types.ts';
import { Language } from '../translations.ts';

interface ProductCardProps {
  product: Product;
  onViewProduct: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onQuickBuy: (product: Product) => void;
  isWishlisted?: boolean;
  onToggleWishlist?: (product: Product) => void;
  currentLang: Language;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onViewProduct,
  onAddToCart,
  onQuickBuy,
  isWishlisted = false,
  onToggleWishlist,
  currentLang
}) => {
  const hasDiscount = Boolean(
    (product.discountPercent !== undefined && product.discountPercent > 0) ||
    (product.discountPrice !== undefined && product.discountPrice < product.price)
  );

  const discountPercent = product.discountPercent || (hasDiscount && product.price > 0 && product.discountPrice
    ? Math.round(((product.price - product.discountPrice) / product.price) * 100)
    : 0);

  const currentPrice = (product.discountPrice !== undefined && product.discountPrice < product.price)
    ? product.discountPrice
    : (discountPercent > 0 ? Math.round(product.price * (1 - discountPercent / 100)) : product.price);

  return (
    <div
      onClick={() => onViewProduct(product)}
      className="group bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs hover:shadow-md transition-all duration-300 flex flex-col justify-between cursor-pointer relative hover:-translate-y-0.5"
    >
      {/* Top Floating Discount % Badge */}
      {hasDiscount && discountPercent > 0 && (
        <div className="absolute top-2.5 left-2.5 z-10">
          <span className="bg-[#FF6000] text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-xs flex items-center gap-0.5 tracking-tight">
            -{discountPercent}%
          </span>
        </div>
      )}

      {/* Top Floating Wishlist Button */}
      <div className="absolute top-2.5 right-2.5 z-10">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleWishlist?.(product);
          }}
          className={`w-7 h-7 rounded-full bg-white/90 backdrop-blur-xs border border-slate-200 flex items-center justify-center transition-all shadow-2xs hover:scale-110 cursor-pointer ${
            isWishlisted ? 'text-rose-500 border-rose-200' : 'text-slate-400 hover:text-rose-500'
          }`}
          title="Save item"
          aria-label="Wishlist"
        >
          <Heart className={`w-3.5 h-3.5 ${isWishlisted ? 'fill-rose-500' : ''}`} />
        </button>
      </div>

      {/* Product Image */}
      <div className="relative pt-[100%] bg-slate-50/70 overflow-hidden">
        {/* Primary Image */}
        <img
          src={product.imageUrl}
          alt={product.name}
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80';
          }}
        />

        {/* Secondary Angle Image Preview on Hover */}
        {product.images && product.images[1] && product.images[1] !== product.imageUrl && (
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

        {/* Multiple Photos Badge */}
        {product.images && product.images.length > 1 && (
          <div className="absolute bottom-2 right-2 z-10 pointer-events-none">
            <span className="bg-slate-900/75 backdrop-blur-xs text-white text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
              <Camera className="w-2.5 h-2.5 text-orange-400" />
              <span>{product.images.length} photos</span>
            </span>
          </div>
        )}

        {/* YouTube Video Badge */}
        {product.videoUrl && (
          <div className="absolute bottom-2 left-2 z-10 pointer-events-none">
            <span className="bg-red-600/95 backdrop-blur-xs text-white text-[9px] font-black px-1.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
              <Youtube className="w-2.5 h-2.5" />
              <span>Video</span>
            </span>
          </div>
        )}

        {(product.status === 'Out of Stock' || product.stock <= 0) && (
          <div className="absolute inset-0 bg-white/85 backdrop-blur-2xs flex flex-col items-center justify-center p-2 text-center z-10">
            <span className="bg-rose-600 text-white text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider shadow-xs">
              Out of stock
            </span>
            <span className="text-[10px] text-slate-500 mt-1 font-semibold">Ntibikiri mu bubiko</span>
          </div>
        )}
      </div>

      {/* Product Information */}
      <div className="p-3.5 flex flex-col justify-between flex-1">
        <div>
          {/* Price Tag in Bold Orange with % percentage badge */}
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <span className="text-xs sm:text-sm font-extrabold text-[#FF5500] font-mono tabular-nums leading-none">
              {currentPrice.toLocaleString()} frw
            </span>
            {hasDiscount && (
              <>
                <span className="text-[10px] text-slate-400 line-through font-mono">
                  {product.price.toLocaleString()} frw
                </span>
                <span className="text-[9px] font-black text-rose-600 bg-rose-50 px-1 py-0.2 rounded border border-rose-100 font-mono">
                  -{discountPercent}%
                </span>
              </>
            )}
          </div>

          {/* Shop label */}
          {product.shopName && (
            <div className="text-[10px] text-slate-400 font-medium truncate mb-1">
              {product.shopName}
            </div>
          )}

          {/* Product Name */}
          <h3
            className="text-xs font-bold text-slate-800 line-clamp-2 group-hover:text-[#FF5500] transition-colors leading-snug"
            title={product.name}
          >
            {product.name}
          </h3>
        </div>

        {/* Subtle rating & stock indicator */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-600">
          {product.reviewsCount && product.reviewsCount > 0 ? (
            <div className="flex items-center gap-1 text-amber-500 font-bold">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span>{product.rating?.toFixed(1)}</span>
              <span className="text-[10px] text-slate-400 font-normal">({product.reviewsCount})</span>
            </div>
          ) : (
            <span className="text-[10px] text-slate-400 font-medium">New listing</span>
          )}
          <span className={`text-[10px] font-bold ${product.status === 'Out of Stock' || product.stock <= 0 ? 'text-rose-600' : 'text-slate-500'}`}>
            {product.status === 'Out of Stock' || product.stock <= 0 ? 'Sold out' : `${product.stock} in stock`}
          </span>
        </div>
      </div>
    </div>
  );
};
