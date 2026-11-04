import React, { useState, useEffect, useMemo } from 'react';
import {
  Star, ShoppingBag, Truck, RotateCcw, Heart, Plus, Minus,
  MessageCircle, Store, Clock, ChevronRight, CheckCircle2, ChevronLeft,
  Share2, Copy, Check, Sparkles, Info, Package, MapPin, Award,
  ArrowLeft, Youtube, ExternalLink, ShieldCheck, CheckSquare
} from 'lucide-react';
import { Product, ProductReview, ProductVariation } from '../types.ts';
import { Language, translations } from '../translations.ts';
import { api } from '../services/api.ts';
import { getYouTubeEmbedUrl, isValidYouTubeUrl } from '../utils/youtube.ts';
import { CurrencyCode, formatCurrencyPrice } from '../utils/currency.ts';
import { isProductOutOfStock, getProductSelectionBreakdown } from '../utils/shippingCalculator.ts';
import { getProductImageDueToProduct } from '../utils/productImages.ts';

interface ProductDetailPageProps {
  product: Product | null;
  allProducts: Product[];
  onAddToCart: (product: Product, quantity: number, variation?: { [key: string]: string }) => void;
  onBuyNow: (product: Product, quantity: number, variation?: { [key: string]: string }) => void;
  onSelectProduct: (product: Product) => void;
  onNavigate: (view: string, params?: any) => void;
  currentLang: Language;
  currentCurrency?: CurrencyCode;
  exchangeRates?: Record<string, number>;
  wishlist?: string[];
  onToggleWishlist?: (productId: string) => void;
}

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({
  product,
  allProducts,
  onAddToCart,
  onBuyNow,
  onSelectProduct,
  onNavigate,
  currentLang,
  currentCurrency = 'RWF',
  exchangeRates,
  wishlist = [],
  onToggleWishlist
}) => {
  const t = translations[currentLang] || translations.en;

  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'attributes' | 'description' | 'supplier' | 'reviews' | 'video'>('attributes');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedVariations, setSelectedVariations] = useState<{ [key: string]: string }>({});
  const [copiedLink, setCopiedLink] = useState(false);
  const [addedNotice, setAddedNotice] = useState(false);

  // Reviews state
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [revRating, setRevRating] = useState(5);
  const [revName, setRevName] = useState('');
  const [revComment, setRevComment] = useState('');
  const [revSubmitting, setRevSubmitting] = useState(false);
  const [revSuccess, setRevSuccess] = useState(false);

  const isWishlisted = Boolean(product && wishlist.includes(product.id));

  // Image Gallery
  const galleryImages = useMemo(() => {
    if (!product) return [];
    if (product.images && product.images.length > 0) {
      if (product.imageUrl && !product.images.includes(product.imageUrl)) {
        return [product.imageUrl, ...product.images];
      }
      return product.images;
    }
    const resolved = getProductImageDueToProduct(product);
    return [resolved];
  }, [product]);

  const effectiveVariations: ProductVariation[] = useMemo(() => {
    if (!product || !product.variations || !Array.isArray(product.variations)) return [];
    return product.variations.filter(
      v => v && typeof v.name === 'string' && v.name.trim().length > 0 && Array.isArray(v.options) && v.options.length > 0
    );
  }, [product]);

  useEffect(() => {
    if (product) {
      setQuantity(1);
      setSelectedImageIndex(0);
      setAddedNotice(false);

      const initialVars: { [key: string]: string } = {};
      effectiveVariations.forEach(v => {
        if (v.options && v.options.length > 0) {
          initialVars[v.name] = v.options[0];
        }
      });
      setSelectedVariations(initialVars);

      api.getProductReviews(product.id).then(r => setReviews(r)).catch(() => {});
    }
  }, [product, effectiveVariations]);

  if (!product) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <Package className="w-16 h-16 text-slate-300 mb-4" />
        <h2 className="text-xl font-bold text-slate-800">Product Not Found</h2>
        <p className="text-slate-500 text-sm mt-1 max-w-md">
          The requested product could not be found or may have been removed from the catalog.
        </p>
        <button
          onClick={() => onNavigate('shop')}
          className="mt-6 px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-bold shadow-xs transition-colors cursor-pointer"
        >
          Explore All Products
        </button>
      </div>
    );
  }

  const selectionBreakdown = getProductSelectionBreakdown(product, quantity);
  const isOutOfStock = isProductOutOfStock(product);
  const maxAvailable = isOutOfStock ? 50 : Math.max(1, product.stock);

  const priceFormatted = formatCurrencyPrice(selectionBreakdown.unitPrice, currentCurrency, exchangeRates, { showBaseSecondary: true });
  const originalFormatted = product.discountPrice && product.discountPrice < product.price
    ? formatCurrencyPrice(product.price, currentCurrency, exchangeRates)
    : null;

  const discountPercent = product.discountPercent && product.discountPercent > 0
    ? product.discountPercent
    : (product.discountPrice && product.discountPrice < product.price
      ? Math.round(((product.price - product.discountPrice) / product.price) * 100)
      : null);

  const handleCopyLink = () => {
    if (typeof window === 'undefined') return;
    const url = `${window.location.origin}/product/${product.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    });
  };

  const handleAddToCartClick = () => {
    onAddToCart(product, quantity, selectedVariations);
    setAddedNotice(true);
    setTimeout(() => setAddedNotice(false), 3000);
  };

  const handleBuyNowClick = () => {
    onBuyNow(product, quantity, selectedVariations);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || !revName.trim() || !revComment.trim()) return;
    setRevSubmitting(true);
    try {
      const newRev = await api.submitProductReview(product.id, {
        customerName: revName.trim(),
        rating: revRating,
        comment: revComment.trim()
      });
      setReviews(prev => [newRev, ...prev]);
      setRevName('');
      setRevComment('');
      setRevSuccess(true);
      setTimeout(() => setRevSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to submit review:', err);
    } finally {
      setRevSubmitting(false);
    }
  };

  const similarProducts = allProducts
    .filter(p => p.id !== product.id && p.category === product.category)
    .slice(0, 4);

  const rawPhone = (product.receiverPhone || '0780022600').replace(/\D/g, '');
  const waPhone = rawPhone.startsWith('250') ? rawPhone : `250${rawPhone}`;
  const whatsappUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(`Hello ContactReach Market, I am inquiring about "${product.name}" (SKU: ${product.sku || product.id})`)}`;

  return (
    <div className="bg-slate-50 min-h-screen py-6 sm:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs text-slate-500 overflow-x-auto whitespace-nowrap pb-1">
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
          <span className="capitalize text-slate-700 font-semibold">{product.category}</span>
          <span>/</span>
          <span className="text-slate-400 font-mono truncate max-w-[200px]" title={product.name}>
            {product.name}
          </span>
        </nav>

        {/* Back Button */}
        <div>
          <button
            onClick={() => {
              if (window.history.length > 1) {
                window.history.back();
              } else {
                onNavigate('shop');
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:text-orange-600 hover:border-orange-300 transition-all cursor-pointer shadow-2xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Products</span>
          </button>
        </div>

        {/* Main Product Details Card */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden p-5 sm:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">

            {/* Left Column: Image Gallery (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="flex flex-col-reverse sm:flex-row gap-3">
                {/* Thumbnails */}
                {galleryImages.length > 1 && (
                  <div className="flex sm:flex-col gap-2 overflow-x-auto sm:overflow-y-auto max-h-[460px] pb-2 sm:pb-0 shrink-0">
                    {galleryImages.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedImageIndex(idx)}
                        className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                          selectedImageIndex === idx
                            ? 'border-orange-600 ring-2 ring-orange-200 shadow-xs'
                            : 'border-slate-200 hover:border-slate-300 opacity-80'
                        }`}
                      >
                        <img
                          src={img}
                          alt={`${product.name} thumbnail ${idx + 1}`}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = getProductImageDueToProduct(product);
                          }}
                        />
                      </button>
                    ))}
                  </div>
                )}

                {/* Main Image */}
                <div className="flex-1 relative aspect-square rounded-2xl overflow-hidden bg-slate-50 border border-slate-200 shadow-inner group">
                  <img
                    src={galleryImages[selectedImageIndex] || getProductImageDueToProduct(product)}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = getProductImageDueToProduct(product);
                    }}
                  />

                  {/* Stock Tag */}
                  <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                    {isOutOfStock ? (
                      <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-white text-[11px] font-bold shadow-xs">
                        Direct Supplier Order
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-bold shadow-xs">
                        In Stock ({product.stock} units)
                      </span>
                    )}
                    {discountPercent && (
                      <span className="px-2.5 py-1 rounded-lg bg-rose-600 text-white text-[11px] font-bold shadow-xs">
                        -{discountPercent}% OFF
                      </span>
                    )}
                  </div>

                  {/* Wishlist Button */}
                  {onToggleWishlist && (
                    <button
                      onClick={() => onToggleWishlist(product.id)}
                      className={`absolute top-3 right-3 p-2 rounded-full shadow-md transition-transform hover:scale-110 cursor-pointer ${
                        isWishlisted
                          ? 'bg-rose-50 text-rose-600'
                          : 'bg-white/90 text-slate-600 hover:text-rose-600'
                      }`}
                      title={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                    >
                      <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-rose-600' : ''}`} />
                    </button>
                  )}
                </div>
              </div>

              {/* Delivery Guarantee Notice */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1.5">
                <div className="flex items-center gap-2 text-slate-800 font-bold">
                  <Truck className="w-4 h-4 text-orange-600 shrink-0" />
                  <span>Doorstep Delivery Across Rwanda</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Fast delivery within 24-48 hours in Kigali. Upcountry delivery available nationwide.
                </p>
              </div>
            </div>

            {/* Right Column: Product Information & Purchase Actions (7 cols) */}
            <div className="lg:col-span-7 space-y-5">

              {/* Supplier & Category Badge */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-orange-50 border border-orange-200 text-orange-800 text-[11px] font-bold capitalize">
                    {product.category}
                  </span>
                  {product.shopName && (
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-semibold flex items-center gap-1">
                      <Store className="w-3 h-3 text-slate-500" />
                      <span>{product.shopName}</span>
                    </span>
                  )}
                </div>

                {/* Share Link */}
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  title="Share product link"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Link Copied!' : 'Share'}</span>
                </button>
              </div>

              {/* Title & SKU */}
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">
                  {product.name}
                </h1>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1.5 flex-wrap">
                  {product.sku && (
                    <span className="font-mono">SKU: <strong className="text-slate-700">{product.sku}</strong></span>
                  )}
                  {product.brand && (
                    <span>Brand: <strong className="text-slate-700">{product.brand}</strong></span>
                  )}
                  <span className="flex items-center gap-1 text-amber-500 font-bold">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    <span>{product.rating || '4.8'}</span>
                    <span className="text-slate-400 font-normal">({reviews.length || 12} reviews)</span>
                  </span>
                </div>
              </div>

              {/* Price Block */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-orange-50/80 to-amber-50/50 border border-orange-200/80">
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="text-2xl sm:text-3xl font-black text-orange-600 font-mono tracking-tight">
                    {priceFormatted.primary}
                  </span>
                  {originalFormatted && (
                    <span className="text-sm sm:text-base text-slate-400 line-through font-mono">
                      {originalFormatted.primary}
                    </span>
                  )}
                  {discountPercent && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-black bg-rose-100 text-rose-800">
                      Save {discountPercent}%
                    </span>
                  )}
                </div>
                {priceFormatted.secondary && (
                  <p className="text-xs text-slate-500 font-mono mt-1">
                    {priceFormatted.secondary}
                  </p>
                )}
                {selectionBreakdown.estimatedShippingCost > 0 && (
                  <p className="text-xs text-amber-800 mt-2 font-medium flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                    <span>Includes {selectionBreakdown.estimatedShippingCost.toLocaleString()} FRW international supplier handling</span>
                  </p>
                )}
              </div>

              {/* Variations (if any) */}
              {effectiveVariations.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  {effectiveVariations.map(v => (
                    <div key={v.name} className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                        {v.name}: <span className="text-orange-600 font-semibold">{selectedVariations[v.name] || 'Select'}</span>
                      </label>
                      <div className="flex items-center gap-2 flex-wrap">
                        {v.options.map((opt, optIdx) => {
                          const isSelected = selectedVariations[v.name] === opt;
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => {
                                setSelectedVariations(prev => ({ ...prev, [v.name]: opt }));
                                if (galleryImages.length > 1 && optIdx < galleryImages.length) {
                                  setSelectedImageIndex(optIdx);
                                }
                              }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-orange-600 text-white border-orange-600 shadow-2xs'
                                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Quantity Selector */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Quantity
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 p-1 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                      disabled={quantity <= 1}
                      className="p-1.5 rounded-lg hover:bg-white text-slate-700 disabled:opacity-30 cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-10 text-center font-bold text-sm text-slate-900 font-mono">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity(prev => Math.min(maxAvailable, prev + 1))}
                      disabled={quantity >= maxAvailable}
                      className="p-1.5 rounded-lg hover:bg-white text-slate-700 disabled:opacity-30 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="text-xs text-slate-500">
                    {isOutOfStock ? 'Direct Supplier Order' : `${product.stock} units available in stock`}
                  </span>
                </div>
              </div>

              {/* Action Buttons: BUY NOW & ADD TO CART */}
              <div className="space-y-2.5 pt-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Buy Now (Primary - Direct to Checkout) */}
                  <button
                    type="button"
                    onClick={handleBuyNowClick}
                    className="w-full py-3 px-5 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Buy Now</span>
                  </button>

                  {/* Add to Cart */}
                  <button
                    type="button"
                    onClick={handleAddToCartClick}
                    className="w-full py-3 px-5 rounded-2xl bg-slate-900 hover:bg-black text-white font-extrabold text-sm shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add to Cart</span>
                  </button>
                </div>

                {/* Added Notice Feedback */}
                {addedNotice && (
                  <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between animate-in fade-in">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Item added to your shopping cart!</span>
                    </div>
                    <button
                      onClick={() => onNavigate('cart')}
                      className="underline hover:text-emerald-900 cursor-pointer"
                    >
                      View Cart & Checkout &rarr;
                    </button>
                  </div>
                )}

                {/* WhatsApp & Inquiries */}
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-600" />
                  <span>Ask Question on WhatsApp ({product.receiverPhone || '0780022600'})</span>
                </a>
              </div>

            </div>
          </div>

          {/* PRODUCT TABS (Specifications, Description, Supplier, Reviews, Video) */}
          <div className="mt-10 pt-8 border-t border-slate-200 space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setActiveTab('attributes')}
                className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'attributes'
                    ? 'border-b-2 border-orange-600 text-orange-600 bg-orange-50/50'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Specifications & Attributes
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('description')}
                className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'description'
                    ? 'border-b-2 border-orange-600 text-orange-600 bg-orange-50/50'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Description
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('supplier')}
                className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'supplier'
                    ? 'border-b-2 border-orange-600 text-orange-600 bg-orange-50/50'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Supplier & Logistics
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('reviews')}
                className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'reviews'
                    ? 'border-b-2 border-orange-600 text-orange-600 bg-orange-50/50'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Reviews ({reviews.length})
              </button>

              {isValidYouTubeUrl(product.youtubeUrl || '') && (
                <button
                  type="button"
                  onClick={() => setActiveTab('video')}
                  className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    activeTab === 'video'
                      ? 'border-b-2 border-red-600 text-red-600 bg-red-50/50'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Youtube className="w-3.5 h-3.5 text-red-600" />
                  <span>Video</span>
                </button>
              )}
            </div>

            {/* Tab 1: Attributes */}
            {activeTab === 'attributes' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Category</span>
                  <span className="font-bold text-slate-800 capitalize">{product.category}</span>
                </div>
                {product.brand && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Brand</span>
                    <span className="font-bold text-slate-800">{product.brand}</span>
                  </div>
                )}
                {product.sku && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">SKU / Model</span>
                    <span className="font-mono font-bold text-slate-800">{product.sku}</span>
                  </div>
                )}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Stock Status</span>
                  <span className="font-bold text-slate-800">
                    {isOutOfStock ? 'Direct Supplier Order' : `${product.stock} units ready`}
                  </span>
                </div>
                {product.specifications && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 sm:col-span-2 md:col-span-3">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Detailed Specifications</span>
                    <p className="text-slate-700 whitespace-pre-line leading-relaxed">{product.specifications}</p>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Description */}
            {activeTab === 'description' && (
              <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed bg-slate-50 p-5 rounded-2xl border border-slate-200">
                <p className="whitespace-pre-line">{product.description || 'No detailed description provided for this product.'}</p>
              </div>
            )}

            {/* Tab 3: Supplier & Logistics */}
            {activeTab === 'supplier' && (
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
                <div className="flex items-center gap-2">
                  <Store className="w-4 h-4 text-orange-600 shrink-0" />
                  <span className="font-bold text-slate-800">
                    Fulfilled by: {product.supplierName || product.shopName || 'ContactReach Market Official Hub'}
                  </span>
                </div>
                <p className="text-slate-600">
                  Standard dispatch from local Kigali hub occurs within 24 hours. For international supplier-sourced items, cargo clearance and tracking updates are managed directly through our automated logistics gateway.
                </p>
                <div className="pt-2 border-t border-slate-200 flex items-center gap-4 text-slate-500">
                  <span>Merchant Code: <strong className="font-mono text-slate-800">{product.merchantCode || '2328354'}</strong></span>
                  <span>Payment Contact: <strong className="font-mono text-slate-800">{product.receiverPhone || '0780022600'}</strong></span>
                </div>
              </div>
            )}

            {/* Tab 4: Reviews */}
            {activeTab === 'reviews' && (
              <div className="space-y-6">
                {/* Submit Review */}
                <form onSubmit={handleSubmitReview} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">Leave a Verified Review</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-600 font-medium mb-1">Your Name</label>
                      <input
                        type="text"
                        value={revName}
                        onChange={(e) => setRevName(e.target.value)}
                        placeholder="e.g. Marie Claire"
                        required
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-medium mb-1">Rating</label>
                      <select
                        value={revRating}
                        onChange={(e) => setRevRating(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold"
                      >
                        <option value={5}>5 Stars - Excellent</option>
                        <option value={4}>4 Stars - Very Good</option>
                        <option value={3}>3 Stars - Average</option>
                        <option value={2}>2 Stars - Poor</option>
                        <option value={1}>1 Star - Very Bad</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 font-medium mb-1">Your Comment</label>
                    <textarea
                      value={revComment}
                      onChange={(e) => setRevComment(e.target.value)}
                      placeholder="Share your experience with this product..."
                      required
                      rows={3}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={revSubmitting}
                    className="px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50"
                  >
                    {revSubmitting ? 'Submitting...' : 'Submit Review'}
                  </button>
                  {revSuccess && (
                    <span className="text-xs text-emerald-600 font-bold ml-2">Review submitted successfully!</span>
                  )}
                </form>

                {/* Review list */}
                {reviews.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No reviews yet. Be the first to review this product!</p>
                ) : (
                  <div className="space-y-3">
                    {reviews.map(rev => (
                      <div key={rev.id} className="p-3.5 rounded-xl bg-white border border-slate-100 text-xs space-y-1 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800">{rev.customerName}</span>
                          <span className="flex items-center gap-1 text-amber-500">
                            {Array.from({ length: rev.rating }).map((_, i) => (
                              <Star key={i} className="w-3 h-3 fill-amber-400" />
                            ))}
                          </span>
                        </div>
                        <p className="text-slate-600 text-[11px]">{rev.comment}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 5: Video */}
            {activeTab === 'video' && isValidYouTubeUrl(product.youtubeUrl || '') && (
              <div className="aspect-video w-full rounded-2xl overflow-hidden border border-slate-200 shadow-md">
                <iframe
                  src={getYouTubeEmbedUrl(product.youtubeUrl!)}
                  title={`${product.name} Video`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              </div>
            )}

          </div>
        </div>

        {/* Similar / Recommended Products Section */}
        {similarProducts.length > 0 && (
          <div className="space-y-4 pt-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900">
                Similar Products in {product.category}
              </h3>
              <button
                onClick={() => onNavigate('shop')}
                className="text-xs font-bold text-orange-600 hover:underline cursor-pointer"
              >
                View Catalog &rarr;
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {similarProducts.map(sim => (
                <div
                  key={sim.id}
                  onClick={() => {
                    onSelectProduct(sim);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs hover:shadow-md transition-all cursor-pointer p-3 flex flex-col justify-between group"
                >
                  <div className="aspect-square rounded-xl overflow-hidden bg-slate-50 mb-2">
                    <img
                      src={getProductImageDueToProduct(sim)}
                      alt={sim.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-800 line-clamp-2 group-hover:text-orange-600 transition-colors">
                      {sim.name}
                    </h4>
                    <div className="mt-1 font-mono font-bold text-xs text-orange-600">
                      {formatCurrencyPrice(sim.discountPrice || sim.price, currentCurrency, exchangeRates).primary}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
