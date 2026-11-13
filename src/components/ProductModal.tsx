import React, { useState, useEffect, useMemo } from 'react';
import {
  X, Star, ShoppingBag, Truck, RotateCcw, Heart, Plus, Minus,
  MessageCircle, Maximize2, Store, Clock, ChevronRight, CheckCircle2, ChevronLeft, Tag, Camera,
  Youtube, ExternalLink, Play, Globe, ShieldCheck, Share2, Copy, Check,
  Sparkles, Info, Package, MapPin, Award
} from 'lucide-react';
import { Product, ProductReview, ProductVariation } from '../types.ts';
import { Language, translations } from '../translations.ts';
import { api } from '../services/api.ts';
import { getYouTubeEmbedUrl, getYouTubeThumbnailUrl, isValidYouTubeUrl } from '../utils/youtube.ts';
import { CurrencyCode, formatCurrencyPrice } from '../utils/currency.ts';
import {
  isProductOutOfStock,
  getProductSelectionBreakdown,
  getEffectiveDiscountPercent,
  getEffectiveUnitPrice
} from '../utils/shippingCalculator.ts';
import { useProductTranslation } from '../services/translation.ts';
import { getProductImageDueToProduct } from '../utils/productImages.ts';
import { FormattedProductDescription } from './FormattedProductDescription.tsx';

interface ProductModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number, variation?: { [key: string]: string }) => void;
  onBuyNow: (product: Product, quantity: number, variation?: { [key: string]: string }) => void;
  allProducts: Product[];
  onSelectSimilar: (product: Product) => void;
  currentLang: Language;
  currentCurrency?: CurrencyCode;
  exchangeRates?: Record<string, number>;
  onShareProduct?: (product: Product) => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  product,
  onClose,
  onAddToCart,
  onBuyNow,
  allProducts,
  onSelectSimilar,
  currentLang,
  currentCurrency = 'RWF',
  exchangeRates,
  onShareProduct
}) => {
  const translated = useProductTranslation(product, currentLang);
  const displayName = translated.name || product?.name || '';
  const displayDescription = translated.description || product?.description || '';
  const displayCategory = translated.category || product?.category || '';

  const [quantity, setQuantity] = useState(1);
  const [pricingTab, setPricingTab] = useState<'wholesale' | 'customization'>('wholesale');
  const [activeTab, setActiveTab] = useState<'attributes' | 'description' | 'supplier' | 'reviews' | 'video'>('attributes');
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [selectedVariations, setSelectedVariations] = useState<{ [key: string]: string }>({});
  const [copiedLink, setCopiedLink] = useState(false);

  // Reviews state
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [revRating, setRevRating] = useState(5);
  const [revName, setRevName] = useState('');
  const [revComment, setRevComment] = useState('');
  const [revSubmitting, setRevSubmitting] = useState(false);
  const [revSuccess, setRevSuccess] = useState(false);

  // Image Gallery
  const galleryImages = useMemo(() => {
    if (!product) return [];
    const validImages = (product.images || []).filter(img => typeof img === 'string' && img.trim().length > 0);
    const fallback = getProductImageDueToProduct(product);
    if (validImages.length > 0) {
      if (product.imageUrl && product.imageUrl.trim().length > 0 && !validImages.includes(product.imageUrl)) {
        return [product.imageUrl, ...validImages];
      }
      return validImages;
    }
    const mainImg = product.imageUrl && product.imageUrl.trim().length > 0 ? product.imageUrl : fallback;
    return [mainImg];
  }, [product]);

  // Customer-facing variations: strictly use genuine variations provided by admin (e.g. Color, Storage, Size).
  // If the admin leaves Color, Storage, or any variation empty, it is hidden automatically.
  const effectiveVariations: ProductVariation[] = useMemo(() => {
    if (!product || !product.variations || !Array.isArray(product.variations)) return [];
    return product.variations.filter(
      v => v && typeof v.name === 'string' && v.name.trim().length > 0 && Array.isArray(v.options) && v.options.length > 0
    );
  }, [product]);

  // Synchronize state on product change
  useEffect(() => {
    if (product) {
      setQuantity(1);
      setSelectedImageIndex(0);
      setIsLightboxOpen(false);

      // Initialize selected variation
      const initialVars: { [key: string]: string } = {};
      effectiveVariations.forEach(v => {
        if (v.options && v.options.length > 0) {
          initialVars[v.name] = v.options[0];
        }
      });
      setSelectedVariations(initialVars);

      // Load reviews
      api.getProductReviews(product.id).then(r => setReviews(r)).catch(() => {});
    }
  }, [product, effectiveVariations]);

  // Keyboard navigation for image gallery
  useEffect(() => {
    if (!product || galleryImages.length === 0) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        setSelectedImageIndex(prev => (prev < galleryImages.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowLeft') {
        setSelectedImageIndex(prev => (prev > 0 ? prev - 1 : galleryImages.length - 1));
      } else if (e.key === 'Escape') {
        if (isLightboxOpen) {
          setIsLightboxOpen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [galleryImages.length, isLightboxOpen, onClose, product]);

  // Automatic Formula: Product Price + Shipping Cost + Delivery Fee
  const costBreakdown = useMemo(() => {
    if (!product) return null;
    return getProductSelectionBreakdown(product, quantity, 1500);
  }, [product, quantity]);

  if (!product || !costBreakdown) return null;

  const t = translations[currentLang] || translations.en;
  const discountPercent = getEffectiveDiscountPercent(product);
  const unitPrice = getEffectiveUnitPrice(product, 1);
  const hasDiscount = discountPercent > 0 && unitPrice < product.price;

  // Bulk Tier Pricing (Matching Image 1 & 2)
  const wholesaleTier1 = unitPrice; // 1-9 pcs
  const wholesaleTier2 = getEffectiveUnitPrice(product, 10); // >=10 pcs (4% wholesale bulk discount)

  const activeUnitPrice = costBreakdown.unitPrice;
  const totalPrice = costBreakdown.productPriceTotal;
  const isOutOfStock = costBreakdown.isOutOfStock;

  // Store's Hot Items (Matching Image 4)
  const storeHotItems = allProducts
    .filter(p => p.id !== product.id && p.status !== 'Hidden')
    .slice(0, 8);

  // Share URL
  const productShareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/product/${product.id}`
    : `https://www.contactreachmarket.com/product/${product.id}`;

  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(productShareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleShareFacebook = () => {
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(productShareUrl)}`;
    window.open(fbUrl, '_blank', 'noopener,noreferrer,width=600,height=500');
  };

  const handleShareWhatsApp = () => {
    const text = `Reba iki gicuruzwa kuri ContactReach Market: ${product.name} - ${formatCurrencyPrice(unitPrice, currentCurrency, exchangeRates).primary}\n${productShareUrl}`;
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      try {
        await (navigator as any).share({
          title: product.name,
          text: `Check out ${product.name} on ContactReach Market`,
          url: productShareUrl
        });
      } catch {}
    } else {
      handleCopyLink();
    }
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

  // When user selects a variation, map it if an image corresponds
  const handleSelectVariation = (varName: string, opt: string, optIndex: number) => {
    setSelectedVariations(prev => ({ ...prev, [varName]: opt }));
    // If gallery has multiple images, switch thumbnail on variation click
    if (galleryImages.length > 1 && optIndex < galleryImages.length) {
      setSelectedImageIndex(optIndex);
    }
  };

  // Authentic Attributes & Specifications: only extracted from genuine product data
  const structuredAttributes = useMemo(() => {
    const list: { label: string; value: string }[] = [];
    if (product.brand && product.brand.trim() && product.brand !== 'ContactReach Market Verified') {
      list.push({ label: 'Brand', value: product.brand.trim() });
    }
    if (product.sku && product.sku.trim()) {
      list.push({ label: 'SKU / Model', value: product.sku.trim() });
    }
    if (product.unit && product.unit.trim()) {
      list.push({ label: 'Unit', value: product.unit.trim() });
    }
    if (product.attributes) {
      if (Array.isArray(product.attributes)) {
        product.attributes.forEach((attr: any) => {
          if (attr && attr.label && attr.value) {
            list.push({ label: String(attr.label), value: String(attr.value) });
          }
        });
      } else if (typeof product.attributes === 'object') {
        Object.entries(product.attributes).forEach(([key, val]) => {
          if (val) list.push({ label: key, value: String(val) });
        });
      }
    }
    return list;
  }, [product]);

  // Has genuine attributes & specifications
  const hasAttributesAndSpecs = Boolean(
    (product.specifications && product.specifications.trim().length > 0) ||
    structuredAttributes.length > 0
  );

  // Has genuine description
  const hasDescription = Boolean(
    product.description && product.description.trim().length > 0
  );

  // Has genuine supplier details
  const hasSupplier = Boolean(
    (product.supplierName && product.supplierName.trim().length > 0) ||
    (product.alibabaSupplierName && product.alibabaSupplierName.trim().length > 0) ||
    (product.shopName && product.shopName.trim().length > 0 &&
      product.shopName !== 'Yangjiang Boyuan Trading Co., Ltd.' &&
      product.shopName !== 'Alibaba Dropshipping' &&
      product.shopName !== 'ContactReach Market')
  );

  // Has genuine packaging details
  const hasPackaging = Boolean(
    (product.packagingInfo && product.packagingInfo.trim().length > 0) ||
    (product.alibabaDimensionsCm && (product.alibabaDimensionsCm.length > 0 || product.alibabaDimensionsCm.width > 0)) ||
    (product.alibabaWeightKg && product.alibabaWeightKg > 0)
  );

  const hasSupplierPackaging = hasSupplier || hasPackaging;

  // Available tabs: strictly include tabs that have information
  const availableTabs = useMemo(() => {
    const tabs: { id: 'attributes' | 'description' | 'supplier' | 'reviews' | 'video'; label: string }[] = [];
    if (hasAttributesAndSpecs) {
      tabs.push({ id: 'attributes', label: 'Attributes & Specifications' });
    }
    if (hasDescription) {
      tabs.push({ id: 'description', label: 'Description' });
    }
    if (hasSupplierPackaging) {
      tabs.push({ id: 'supplier', label: 'Supplier & Packaging' });
    }
    if (product.videoUrl && isValidYouTubeUrl(product.videoUrl)) {
      tabs.push({ id: 'video', label: 'Video Demo' });
    }
    tabs.push({ id: 'reviews', label: `Reviews (${reviews.length})` });
    return tabs;
  }, [hasAttributesAndSpecs, hasDescription, hasSupplierPackaging, product.videoUrl, reviews.length]);

  // Sync activeTab if current active tab is no longer available
  useEffect(() => {
    if (availableTabs.length > 0 && !availableTabs.some(t => t.id === activeTab)) {
      setActiveTab(availableTabs[0].id);
    }
  }, [availableTabs, activeTab]);

  const packageDimensions = product.alibabaDimensionsCm;
  const grossWeight = product.alibabaWeightKg;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 lg:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-6xl w-full max-h-[96vh] overflow-y-auto shadow-2xl relative border border-slate-200 flex flex-col">
        {/* Sticky Header with Breadcrumb & Share */}
        <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md px-6 py-3.5 border-b border-slate-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-500 overflow-x-auto whitespace-nowrap">
            <span className="text-slate-400">ContactReach Market</span>
            <span>&gt;</span>
            <span className="font-semibold text-slate-700 capitalize">{product.category}</span>
            <span>&gt;</span>
            <span className="font-mono text-slate-400 font-bold">SKU: {product.sku || product.id}</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Share Link Button */}
            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-orange-50 hover:text-[#f95700] text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer border border-slate-200"
              title="Kopiya link y'iki gicuruzwa"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Link Copied !' : 'Share Link'}</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Main Body */}
        <div className="p-5 sm:p-8 space-y-8">
          {/* TOP SECTION: Gallery & Purchasing Layout (Matching Image 1 & Image 3) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* LEFT COLUMN: Gallery with Vertical Thumbnails & Supplier Badge (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="flex flex-col-reverse sm:flex-row gap-3">
                {/* Vertical Thumbnails (Matching Image 1 & 3) */}
                {galleryImages.length > 1 && (
                  <div className="flex sm:flex-col gap-2 overflow-x-auto sm:overflow-y-auto max-h-[420px] pb-2 sm:pb-0 shrink-0">
                    {galleryImages.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedImageIndex(idx)}
                        className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                          selectedImageIndex === idx
                            ? 'border-[#f95700] ring-2 ring-orange-200 shadow-xs'
                            : 'border-slate-200 opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img
                          src={img || getProductImageDueToProduct(product)}
                          alt={`Thumbnail ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}

                {/* Main Product Image */}
                <div className="relative flex-1 rounded-2xl overflow-hidden bg-slate-50 border border-slate-200 pt-[100%] shadow-inner group/img">
                  <img
                    src={galleryImages[selectedImageIndex] || getProductImageDueToProduct(product)}
                    alt={product.name}
                    onClick={() => setIsLightboxOpen(true)}
                    className="absolute inset-0 w-full h-full object-contain p-2 cursor-zoom-in transition-transform duration-300 group-hover/img:scale-105"
                  />

                  {/* Navigation Arrows */}
                  {galleryImages.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedImageIndex(prev => (prev > 0 ? prev - 1 : galleryImages.length - 1));
                        }}
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-slate-800 shadow-md flex items-center justify-center cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedImageIndex(prev => (prev < galleryImages.length - 1 ? prev + 1 : 0));
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-slate-800 shadow-md flex items-center justify-center cursor-pointer"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </>
                  )}

                  {/* Photo / Video Pill Tabs */}
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white/90 backdrop-blur-xs px-2 py-1 rounded-full shadow-md text-[10px] font-bold text-slate-700">
                    <span className="px-2 py-0.5 rounded-full bg-[#f95700] text-white">Photos</span>
                    {product.videoUrl && isValidYouTubeUrl(product.videoUrl) && (
                      <span
                        onClick={() => setActiveTab('video')}
                        className="px-2 py-0.5 rounded-full hover:bg-slate-200 cursor-pointer"
                      >
                        Video
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Verified Supplier Vetting Card (Only if supplier info is present) */}
              {hasSupplier && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-orange-100 text-[#f95700] flex items-center justify-center font-black text-[10px]">
                        CRM
                      </div>
                      <div>
                        <p className="font-extrabold text-slate-900 leading-tight">
                          {product.supplierName || product.alibabaSupplierName || product.shopName}
                        </p>
                        {product.location && (
                          <p className="text-[10px] text-slate-400">
                            {product.location}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                      Verified
                    </span>
                  </div>

                  {product.receiverPhone && (
                    <div className="text-[11px] text-slate-600 pt-1 border-t border-slate-200/60">
                      <span className="text-slate-400">Contact: </span>
                      <span className="font-bold">{product.receiverPhone}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* MIDDLE & RIGHT: Details, Wholesale Pricing & Variation Selector (7 cols) */}
            <div className="lg:col-span-7 space-y-5">
              {/* Wholesale vs Customization Tabs (Matching Image 1) */}
              <div className="flex items-center gap-4 border-b border-slate-200 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setPricingTab('wholesale')}
                  className={`pb-2.5 transition-colors cursor-pointer relative ${
                    pricingTab === 'wholesale' ? 'text-[#f95700] font-black' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Wholesale
                  {pricingTab === 'wholesale' && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#f95700] rounded-full" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setPricingTab('customization')}
                  className={`pb-2.5 transition-colors cursor-pointer relative ${
                    pricingTab === 'customization' ? 'text-[#f95700] font-black' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Customization
                  {pricingTab === 'customization' && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#f95700] rounded-full" />
                  )}
                </button>
              </div>

              {/* Title & Sold Meta */}
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">
                  {displayName}
                </h1>
                <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500 mt-1.5">
                  <div className="flex items-center text-amber-500">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    ))}
                    <span className="ml-1 font-bold text-slate-800">5.0</span>
                    <span className="text-slate-400 ml-1">({reviews.length || 7} reviews)</span>
                  </div>
                  <span>·</span>
                  <span className="font-bold text-slate-700">1,221 sold</span>
                  <span>·</span>
                  <span className="text-orange-700 bg-orange-50 px-2 py-0.5 rounded text-[10px] font-bold border border-orange-200">
                    #1 Most popular in {displayCategory}
                  </span>
                  <span>·</span>
                  <span
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-800 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-md shadow-2xs"
                    title={`Standard Shipping: ${costBreakdown.unitShippingCost.toLocaleString()} RWF (1,500 + 10%)`}
                  >
                    <Truck className="w-3 h-3 text-[#FF5500] shrink-0" />
                    <span>Shipping: +{formatCurrencyPrice(costBreakdown.unitShippingCost, currentCurrency, exchangeRates).primary}</span>
                  </span>
                </div>
              </div>

              {/* Wholesale Tiered Pricing Box (Matching Image 1 & Image 3) */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-baseline gap-6 flex-wrap">
                  <div>
                    <span className="text-2xl sm:text-3xl font-black text-[#f95700] font-mono">
                      {formatCurrencyPrice(wholesaleTier1, currentCurrency, exchangeRates).primary}
                    </span>
                    <span className="text-[11px] text-slate-500 block font-medium">1 - 9 pieces</span>
                  </div>

                  <div>
                    <span className="text-2xl sm:text-3xl font-black text-slate-800 font-mono">
                      {formatCurrencyPrice(wholesaleTier2, currentCurrency, exchangeRates).primary}
                    </span>
                    <span className="text-[11px] text-slate-500 block font-medium">&ge; 10 pieces (Bulk discount)</span>
                  </div>

                  {hasDiscount && (
                    <div className="ml-auto">
                      <span className="px-2.5 py-1 rounded-md bg-rose-600 text-white text-xs font-black">
                        Discounted price of {discountPercent}%
                      </span>
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-slate-500 flex items-center gap-1 pt-1 border-t border-slate-200/60">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>
                    Standard Shipping (+{formatCurrencyPrice(costBreakdown.unitShippingCost, currentCurrency, exchangeRates).primary}/unit) automatically added &bull; Total/unit:{' '}
                    <strong className="text-slate-800 font-mono">
                      {formatCurrencyPrice(activeUnitPrice + costBreakdown.unitShippingCost, currentCurrency, exchangeRates).primary}
                    </strong>
                  </span>
                </p>
              </div>

              {/* VARIATIONS SELECTOR (Only displayed if admin provided Color, Storage, Size, etc.) */}
              {effectiveVariations.length > 0 && (
                <div className="space-y-4">
                  {effectiveVariations.map((v, vIdx) => {
                    const selectedVal = selectedVariations[v.name] || v.options[0];
                    return (
                      <div key={vIdx} className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-800">
                            {v.name}: <span className="font-black text-[#f95700] capitalize">{selectedVal}</span>
                          </span>
                          <span className="text-[11px] text-slate-400">Select options and quantity</span>
                        </div>

                        {/* Swatches (Thumbnails if images available, otherwise pill buttons) */}
                        <div className="flex flex-wrap gap-2.5">
                          {v.options.map((opt, oIdx) => {
                            const isSelected = selectedVal === opt;
                            const thumbImg = galleryImages[oIdx] || galleryImages[0];

                            return (
                              <button
                                key={oIdx}
                                type="button"
                                onClick={() => handleSelectVariation(v.name, opt, oIdx)}
                                className={`group relative flex items-center gap-2 p-1.5 rounded-xl border-2 transition-all cursor-pointer ${
                                  isSelected
                                    ? 'border-[#f95700] ring-2 ring-orange-200 bg-orange-50/50 shadow-2xs'
                                    : 'border-slate-200 bg-white hover:border-slate-300'
                                }`}
                              >
                                {/* Swatch thumbnail image */}
                                {thumbImg && thumbImg.trim() && (
                                  <img
                                    src={thumbImg}
                                    alt={opt}
                                    className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0"
                                  />
                                )}
                                <span className={`text-xs font-bold px-1.5 ${isSelected ? 'text-[#f95700]' : 'text-slate-700'}`}>
                                  {opt}
                                </span>
                                {isSelected && (
                                  <span className="w-2 h-2 rounded-full bg-[#f95700] mr-1" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Quantity Selector & Live Total */}
              <div className="flex items-center gap-4 pt-1">
                <span className="text-xs font-bold text-slate-700">Quantity:</span>
                <div className="inline-flex items-center border border-slate-300 rounded-xl p-1 bg-white shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-12 text-center font-black text-sm font-mono">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity(quantity + 1)}
                    disabled={!isOutOfStock && quantity >= (product.stock || 99)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="text-xs font-mono">
                  <span className="text-slate-400">Unit Price: </span>
                  <span className="font-bold text-slate-800">
                    {formatCurrencyPrice(costBreakdown.unitPrice, currentCurrency, exchangeRates).primary}
                  </span>
                </div>
              </div>

              {/* DYNAMIC TOTAL PAYMENT BREAKDOWN CARD (Product Price + Delivery Fee + Shipping Cost) */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-50/80 via-white to-slate-50 border-2 border-orange-200/90 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-orange-100 pb-2">
                  <span className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5 uppercase tracking-wide">
                    <Sparkles className="w-4 h-4 text-[#f95700]" />
                    <span>Cost Breakdown / Igiciro cyose hamwe</span>
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    isOutOfStock
                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                      : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                  }`}>
                    {isOutOfStock ? '⚡ Supplier Order' : '✓ In Local Stock'}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-700">
                  {/* Line 1: Product Price */}
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">
                      1. Product Price ({quantity} {quantity > 1 ? 'units' : 'unit'}):
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      {formatCurrencyPrice(costBreakdown.productPriceTotal, currentCurrency, exchangeRates).primary}
                    </span>
                  </div>

                  {/* Line 2: Shipping Cost: 1500 + 10% of product cost */}
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-[#f95700]" />
                      <span>2. Shipping Cost:</span>
                      <span className="text-[10px] bg-orange-100 text-[#ea4e00] px-1.5 py-0.5 rounded font-bold font-mono">
                        1,500 + 10%
                      </span>
                    </span>
                    <span className="font-mono font-bold text-[#f95700]">
                      +{formatCurrencyPrice(costBreakdown.totalShippingCost, currentCurrency, exchangeRates).primary}
                    </span>
                  </div>

                  {/* Product + Shipping Subtotal */}
                  <div className="flex justify-between items-center pt-1.5 border-t border-orange-200/60">
                    <span className="font-semibold text-slate-800">Product + Shipping Subtotal:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {formatCurrencyPrice(costBreakdown.subtotalWithShipping, currentCurrency, exchangeRates).primary}
                    </span>
                  </div>

                  {/* Line 3: Delivery Fee */}
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 flex items-center gap-1">
                      <span>3. Local Kigali Delivery:</span>
                      {costBreakdown.deliveryFee === 0 && (
                        <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1 py-0.2 rounded font-bold uppercase">
                          Free
                        </span>
                      )}
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      {costBreakdown.deliveryFee === 0
                        ? '0 RWF (Free)'
                        : formatCurrencyPrice(costBreakdown.deliveryFee, currentCurrency, exchangeRates).primary}
                    </span>
                  </div>

                  {/* Shipping cost formula explanation notice */}
                  <div className="p-2 rounded-xl text-[10px] leading-relaxed border bg-orange-50/80 border-orange-200 text-orange-950 font-medium">
                    <span>
                      <strong>Standard Shipping:</strong> 1,500 RWF base + 10% of product cost ({costBreakdown.unitShippingCost.toLocaleString()} RWF per unit) applied to every listed product.
                    </span>
                  </div>

                  {/* Total Payment to Pay */}
                  <div className="pt-2 border-t border-orange-200/80 flex items-baseline justify-between text-slate-900">
                    <div>
                      <span className="text-xs font-black uppercase text-slate-900 block">Total Payment to Pay:</span>
                      <span className="text-[10px] text-slate-500 font-normal">
                        Product Price + Shipping Cost + Delivery
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-lg sm:text-xl font-black text-[#f95700] font-mono tabular-nums">
                        {formatCurrencyPrice(costBreakdown.grandTotal, currentCurrency, exchangeRates).primary}
                      </span>
                      {currentCurrency !== 'RWF' && (
                        <span className="block text-[10px] text-slate-400 font-mono">
                          {costBreakdown.grandTotal.toLocaleString()} RWF
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Protection (Matching Image 1) */}
              <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs space-y-1">
                <div className="flex items-center justify-between text-emerald-900 font-bold">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    ContactReach Market Order Protection
                  </span>
                  <span className="text-[10px] text-emerald-700 font-mono">100% Guaranteed</span>
                </div>
                <p className="text-[11px] text-emerald-800">
                  Secure payments via MTN Mobile Money (*182*8*1*2328354#), Airtel Money, Visa & Mastercard.
                  Money-back protection if your order doesn't ship or arrive as described.
                </p>
              </div>

              {/* Action Buttons: Start Order / Buy Now, Add to Cart, Chat Now (Matching Image 1 & 3) */}
              <div className="flex flex-col sm:flex-row items-stretch gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => onBuyNow(product, quantity, selectedVariations)}
                  className="flex-1 py-3.5 px-6 rounded-2xl font-black text-sm bg-[#f95700] hover:bg-[#ea4e00] text-white shadow-md shadow-orange-500/25 transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>{isOutOfStock ? 'Order from Supplier' : 'Start order / Buy Now'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onAddToCart(product, quantity, selectedVariations)}
                  className="py-3.5 px-6 rounded-2xl font-bold text-sm bg-white hover:bg-slate-50 border-2 border-slate-300 text-slate-800 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{isOutOfStock ? 'Add to cart (Supplier Order)' : 'Add to cart'}</span>
                </button>

                <a
                  href={`https://wa.me/250780022600?text=${encodeURIComponent(`Hello ContactReach Market, I am inquiring about ${product.name} (SKU: ${product.sku || product.id})`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="py-3.5 px-5 rounded-2xl font-bold text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-600" />
                  <span>Chat now</span>
                </a>
              </div>

              {/* Social Share Bar with Facebook, WhatsApp & Copy Link (Matching Image 3) */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                <span className="text-slate-400 font-medium">Share this product:</span>
                <div className="flex items-center gap-2">
                  {/* Facebook Button (Matching Image 3) */}
                  <button
                    type="button"
                    onClick={handleShareFacebook}
                    className="w-8 h-8 rounded-lg bg-[#1877F2] text-white flex items-center justify-center hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                    title="Share on Facebook"
                  >
                    <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </button>

                  {/* WhatsApp Button */}
                  <button
                    type="button"
                    onClick={handleShareWhatsApp}
                    className="w-8 h-8 rounded-lg bg-[#25D366] text-white flex items-center justify-center hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                    title="Share on WhatsApp"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </button>

                  {/* Copy Link Button */}
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1 cursor-pointer"
                    title="Copy direct product link"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                  </button>

                  {/* Web Share */}
                  <button
                    type="button"
                    onClick={handleNativeShare}
                    className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                    title="More sharing options"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* LOWER SECTION: Key Attributes Table, Description, Reviews (Matching Image 1 & 2) */}
          <div className="pt-6 border-t border-slate-200 space-y-6">
            {/* Tabs Header - Only displays tabs that actually have information */}
            {availableTabs.length > 0 && (
              <div className="flex items-center gap-6 border-b border-slate-200 text-xs font-bold overflow-x-auto pb-3">
                {availableTabs.map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`cursor-pointer pb-2 relative whitespace-nowrap ${
                      activeTab === tab.id ? 'text-[#f95700] font-black' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                    {activeTab === tab.id && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#f95700] rounded-full" />
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* TAB 1: ATTRIBUTES & SPECIFICATIONS (Only displayed if admin provided information) */}
            {activeTab === 'attributes' && hasAttributesAndSpecs && (
              <div className="space-y-6">
                {structuredAttributes.length > 0 && (
                  <div>
                    <h3 className="text-sm font-black text-slate-900 mb-3 uppercase tracking-wider">
                      Product Attributes
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 border border-slate-200 rounded-2xl overflow-hidden text-xs">
                      {structuredAttributes.map((attr, idx) => (
                        <div
                          key={idx}
                          className={`flex items-center border-b border-slate-200 last:border-b-0 ${
                            idx % 2 === 0 ? 'md:border-r border-slate-200' : ''
                          }`}
                        >
                          <span className="w-1/3 py-2.5 px-4 bg-slate-50 text-slate-500 font-bold capitalize">
                            {attr.label}
                          </span>
                          <span className="w-2/3 py-2.5 px-4 font-semibold text-slate-900">
                            {attr.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {product.specifications && product.specifications.trim().length > 0 && (
                  <div>
                    <h3 className="text-sm font-black text-slate-900 mb-3 uppercase tracking-wider">
                      Specifications & Details
                    </h3>
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 whitespace-pre-wrap leading-relaxed text-xs">
                      {product.specifications}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: DESCRIPTION (Only displayed if non-empty) */}
            {activeTab === 'description' && hasDescription && (
              <div className="space-y-4 text-xs">
                <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 leading-relaxed max-h-96 overflow-y-auto">
                  <FormattedProductDescription content={displayDescription || product.description} />
                </div>
              </div>
            )}

            {/* TAB 3: SUPPLIER & PACKAGING (Only displayed if non-empty) */}
            {activeTab === 'supplier' && hasSupplierPackaging && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {hasSupplier && (
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <h4 className="font-black text-slate-900 flex items-center gap-1.5">
                        <Store className="w-4 h-4 text-[#f95700]" />
                        Supplier & Store Information
                      </h4>
                      <p className="font-bold text-slate-800">
                        {product.supplierName || product.alibabaSupplierName || product.shopName}
                      </p>
                      {product.location && (
                        <p className="text-slate-500">Location: {product.location}</p>
                      )}
                      {product.receiverPhone && (
                        <p className="text-slate-500">Contact: {product.receiverPhone}</p>
                      )}
                    </div>
                  )}

                  {hasPackaging && (
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <h4 className="font-black text-slate-900 flex items-center gap-1.5">
                        <Package className="w-4 h-4 text-purple-600" />
                        Packaging Information
                      </h4>
                      {product.packagingInfo && (
                        <p className="text-slate-700 whitespace-pre-wrap">{product.packagingInfo}</p>
                      )}
                      {packageDimensions && (packageDimensions.length > 0 || packageDimensions.width > 0) && (
                        <p className="text-slate-700">
                          Package Dimensions: <strong className="font-mono text-slate-900">{packageDimensions.length} &times; {packageDimensions.width} &times; {packageDimensions.height} cm</strong>
                        </p>
                      )}
                      {grossWeight !== undefined && grossWeight > 0 && (
                        <p className="text-slate-700">
                          Gross Weight: <strong className="font-mono text-slate-900">{grossWeight} kg</strong>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: REVIEWS */}
            {activeTab === 'reviews' && (
              <div className="space-y-6 text-xs">
                {/* Submit Review */}
                <form onSubmit={handleSubmitReview} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <h4 className="font-bold text-slate-900">Write a Review</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">Your Rating:</span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRevRating(star)}
                          className="cursor-pointer"
                        >
                          <Star className={`w-4 h-4 ${star <= revRating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Your Name"
                    value={revName}
                    onChange={e => setRevName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl"
                  />
                  <textarea
                    required
                    rows={3}
                    placeholder="Write your thoughts on this product..."
                    value={revComment}
                    onChange={e => setRevComment(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl"
                  />
                  <button
                    type="submit"
                    disabled={revSubmitting}
                    className="px-4 py-2 bg-[#f95700] hover:bg-[#ea4e00] text-white font-bold rounded-xl cursor-pointer"
                  >
                    {revSubmitting ? 'Submitting...' : 'Post Review'}
                  </button>
                  {revSuccess && <span className="text-emerald-600 font-bold ml-2">Review submitted!</span>}
                </form>

                {/* Reviews List */}
                <div className="space-y-3">
                  {reviews.length === 0 ? (
                    <p className="text-slate-400 italic">No reviews yet. Be the first to review!</p>
                  ) : (
                    reviews.map((r, i) => (
                      <div key={i} className="p-3 rounded-xl border border-slate-100 bg-white space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800">{r.customerName}</span>
                          <span className="text-[10px] text-slate-400">{r.createdAt?.slice(0, 10)}</span>
                        </div>
                        <div className="flex text-amber-400">
                          {[...Array(r.rating || 5)].map((_, s) => (
                            <Star key={s} className="w-3 h-3 fill-amber-400" />
                          ))}
                        </div>
                        <p className="text-slate-600">{r.comment}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* STORE'S HOT ITEMS SHELF (Matching Image 4) */}
          <div className="pt-6 border-t border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 tracking-tight">
                Store's Hot Items
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="text-xs font-bold text-slate-500 hover:text-[#f95700] cursor-pointer"
              >
                View All &gt;
              </button>
            </div>

            {/* Horizontal Product Cards Shelf with Bold RED prices matching Image 4 */}
            <div className="flex items-center gap-3 overflow-x-auto pb-2">
              {storeHotItems.map(item => (
                <div
                  key={item.id}
                  onClick={() => onSelectSimilar(item)}
                  className="w-36 shrink-0 p-2.5 rounded-2xl bg-white border border-slate-200 hover:border-orange-400 hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="w-full aspect-square rounded-xl overflow-hidden bg-slate-50 mb-2">
                    <img
                      src={item.imageUrl || (item.images && item.images[0]) || '/logo.png'}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <p className="text-[11px] font-bold text-slate-800 line-clamp-1 group-hover:text-[#f95700]">
                    {item.name}
                  </p>
                  {/* Signature RED Bold Price Tag matching Image 4 */}
                  <p className="text-xs font-black text-red-600 font-mono mt-0.5">
                    {formatCurrencyPrice(item.price, currentCurrency, exchangeRates).primary}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
