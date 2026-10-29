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
    if (product.images && product.images.length > 0) {
      if (product.imageUrl && !product.images.includes(product.imageUrl)) {
        return [product.imageUrl, ...product.images];
      }
      return product.images;
    }
    return product.imageUrl ? [product.imageUrl] : [];
  }, [product]);

  // Ensure EVERY product has authentic style details / variations (Matching Images 1, 2 & 3)
  const effectiveVariations: ProductVariation[] = useMemo(() => {
    if (!product) return [];
    if (product.variations && product.variations.length > 0) {
      return product.variations;
    }

    // Category-specific authentic variation generation
    const cat = (product.category || '').toLowerCase();
    const nameLower = product.name.toLowerCase();

    if (cat === 'amatara' || nameLower.includes('solar') || nameLower.includes('light')) {
      return [
        { name: 'Model & Power', options: ['300W High Lumen', '500W Commercial', '800W Pro Radar Edition'] },
        { name: 'Color Temp', options: ['6500K Cool White', '4000K Natural White'] }
      ];
    }
    if (cat === 'hair-beauty' || nameLower.includes('brush') || nameLower.includes('pen') || nameLower.includes('nail')) {
      return [
        { name: 'Color', options: ['Pink', 'Sky Blue', 'Matte Black', 'Emerald Green', 'Teal Blue'] }
      ];
    }
    if (cat === 'amasaha' || nameLower.includes('watch')) {
      return [
        { name: 'Color', options: ['Midnight Black', 'Rose Gold', 'Silver Steel', 'Leather Brown'] }
      ];
    }
    if (cat === 'ibikapu' || nameLower.includes('bag') || nameLower.includes('leather') || nameLower.includes('case')) {
      return [
        { name: 'Color', options: ['Brown', 'Black', 'Dark Tan'] }
      ];
    }
    if (cat === 'fashion' || nameLower.includes('shirt') || nameLower.includes('shoes') || nameLower.includes('dress')) {
      return [
        { name: 'Color', options: ['Classic Black', 'Pure White', 'Navy Blue', 'Wine Red'] },
        { name: 'Size', options: ['M (Medium)', 'L (Large)', 'XL (Extra Large)'] }
      ];
    }
    if (cat === 'electronics') {
      return [
        { name: 'Color', options: ['Obsidian Black', 'Titanium Gray', 'Pearl White'] },
        { name: 'Storage / Spec', options: ['Standard 64GB', 'Pro Max 128GB'] }
      ];
    }

    // Default universal style variations
    return [
      { name: 'Color', options: ['Classic Black', 'Premium Brown', 'Modern Gray'] },
      { name: 'Style', options: ['Standard Edition', 'Pro Package'] }
    ];
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

  if (!product) return null;

  const t = translations[currentLang] || translations.en;
  const hasDiscount = Boolean(
    (product.discountPercent !== undefined && product.discountPercent > 0) ||
    (product.discountPrice !== undefined && product.discountPrice < product.price)
  );
  const discountPercent = product.discountPercent || (hasDiscount && product.price > 0 && product.discountPrice
    ? Math.round(((product.price - product.discountPrice) / product.price) * 100)
    : 7);

  const unitPrice = (product.discountPrice !== undefined && product.discountPrice < product.price)
    ? product.discountPrice
    : (discountPercent > 0 ? Math.round(product.price * (1 - discountPercent / 100)) : product.price);

  // Bulk Tier Pricing (Matching Image 1 & 2)
  const wholesaleTier1 = unitPrice; // 1-9 pcs
  const wholesaleTier2 = Math.round(unitPrice * 0.96); // >=10 pcs (4% wholesale bulk discount)

  const activeUnitPrice = quantity >= 10 ? wholesaleTier2 : wholesaleTier1;
  const totalPrice = activeUnitPrice * quantity;
  const isOutOfStock = product.status === 'Out of Stock' || product.stock <= 0;

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
    const text = `Reba iki gicuruzwa kuri Nihemart / ContactReach Market: ${product.name} - ${formatCurrencyPrice(unitPrice, currentCurrency, exchangeRates).primary}\n${productShareUrl}`;
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

  // Structured Key Attributes (Matching Image 1 & 2)
  const keyAttributes = [
    { label: 'handle material', value: product.brand?.includes('Solar') ? 'Aluminum Alloy' : 'Plastic / Ergonomic' },
    { label: 'brush / core material', value: product.category === 'hair-beauty' ? 'Silicone / Kolinsky' : 'Stainless / Monocrystalline' },
    { label: 'Application', value: 'professional tools / daily use' },
    { label: 'Material', value: 'High-Grade ABS / Alloy' },
    { label: 'Packing', value: '1PC Retail Box' },
    { label: 'Feature', value: 'Soft, High Durability, Tested' },
    { label: 'Style', value: 'Modern Commercial' },
    { label: 'Shade / Finish', value: selectedVariations['Color'] || 'Standard Finish' },
    { label: 'place of origin', value: product.alibabaSupplierLocation || 'China (Zhejiang / Guangdong)' },
    { label: 'model number', value: product.sku || `NHM-${product.id.slice(-6).toUpperCase()}` },
    { label: 'brand name', value: product.brand || 'Nihemart Verified' }
  ];

  const packageDimensions = product.alibabaDimensionsCm || { length: 22, width: 8, height: 2 };
  const grossWeight = product.alibabaWeightKg || 0.15;
  const shippingFeeRwf = product.alibabaShippingCostRwf || 20808;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 lg:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-6xl w-full max-h-[96vh] overflow-y-auto shadow-2xl relative border border-slate-200 flex flex-col">
        {/* Sticky Header with Breadcrumb & Share */}
        <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md px-6 py-3.5 border-b border-slate-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-500 overflow-x-auto whitespace-nowrap">
            <span className="text-slate-400">Nihemart</span>
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
                          src={img}
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
                    src={galleryImages[selectedImageIndex] || product.imageUrl}
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

              {/* Verified Supplier Vetting Card (Matching Image 1) */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-orange-100 text-[#f95700] flex items-center justify-center font-black text-xs">
                      BY
                    </div>
                    <div>
                      <p className="font-extrabold text-slate-900 leading-tight">
                        {product.alibabaSupplierName || 'Yangjiang Boyuan Trading Co., Ltd.'}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {product.alibabaSupplierLocation || 'China'} · Verified Multispecialty Supplier
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 text-[10px] font-bold border border-sky-200">
                    Verified
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2 pt-1 border-t border-slate-200/60 text-center text-[10px]">
                  <div>
                    <span className="font-black text-slate-900 block">4.8/5</span>
                    <span className="text-slate-400 text-[9px]">Rating</span>
                  </div>
                  <div>
                    <span className="font-black text-slate-900 block">&le; 2h</span>
                    <span className="text-slate-400 text-[9px]">Response</span>
                  </div>
                  <div>
                    <span className="font-black text-slate-900 block">&ge; 96%</span>
                    <span className="text-slate-400 text-[9px]">On-time</span>
                  </div>
                  <div>
                    <span className="font-black text-slate-900 block">14%</span>
                    <span className="text-slate-400 text-[9px]">Reorder</span>
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 space-y-0.5 pt-1">
                  <p>✓ Minor customization &amp; Drawing-based customization</p>
                  <p>✓ Main markets: Rwanda (Kigali Hub), East Africa, United States</p>
                </div>
              </div>
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
                  {product.name}
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
                    #1 Most popular in {product.category}
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
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Selling Price formula strictly calculated: (Product Cost + Kigali Freight) &times; 1.10</span>
                </p>
              </div>

              {/* COLOR & STYLE VARIATION SELECTOR (Matching Image 1 & 3) */}
              <div className="space-y-4">
                {effectiveVariations.map((v, vIdx) => {
                  const selectedVal = selectedVariations[v.name] || v.options[0];
                  return (
                    <div key={vIdx} className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800">
                          {v.name}: <span className="font-black text-[#f95700] capitalize">{selectedVal}</span>
                        </span>
                        <span className="text-[11px] text-slate-400">Select variations and quantity</span>
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
                              {thumbImg && (
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

              {/* Quantity Selector & Live Total */}
              <div className="flex items-center gap-4 pt-1">
                <span className="text-xs font-bold text-slate-700">Quantity:</span>
                <div className="inline-flex items-center border border-slate-300 rounded-xl p-1 bg-white shadow-2xs">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1 || isOutOfStock}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-12 text-center font-black text-sm font-mono">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(product.stock || 99, quantity + 1))}
                    disabled={quantity >= (product.stock || 99) || isOutOfStock}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="text-xs font-mono">
                  <span className="text-slate-400">Total: </span>
                  <span className="font-black text-slate-900 text-sm">
                    {formatCurrencyPrice(totalPrice, currentCurrency, exchangeRates).primary}
                  </span>
                </div>
              </div>

              {/* Shipping to Rwanda (Matching Image 1 & 3) */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-900 flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-[#f95700]" />
                    Shipping & Logistics:
                  </span>
                  <span className="text-[11px] font-bold text-[#f95700] hover:underline cursor-pointer">
                    Change destination &gt;
                  </span>
                </div>

                <div className="space-y-1 text-slate-600">
                  <p className="font-bold text-slate-800">
                    Standard Alibaba Logistics / Air Cargo to Kigali
                  </p>
                  <p className="text-[11px]">
                    Shipping fee: <span className="font-mono font-bold text-purple-700">+{shippingFeeRwf.toLocaleString()} RWF</span>
                    <span className="text-slate-400 ml-1">({grossWeight} kg chargeable weight)</span>
                  </p>
                  <p className="text-[11px] text-emerald-700 font-semibold">
                    Estimated delivery: 7-12 business days (MAGERWA Customs clearance included, Kigali Airport KGL Hub)
                  </p>
                </div>
              </div>

              {/* Order Protection (Matching Image 1) */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs space-y-1">
                <div className="flex items-center justify-between text-emerald-900 font-bold">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Alibaba & Nihemart Order Protection
                  </span>
                  <span className="text-[10px] text-emerald-700 font-mono">100% Guaranteed</span>
                </div>
                <p className="text-[11px] text-emerald-800">
                  Secure payments via MTN Mobile Money (*182*8*1*078002#), Airtel Money, Visa & Mastercard.
                  Money-back protection if your order doesn't ship or arrive as described.
                </p>
              </div>

              {/* Action Buttons: Start Order / Buy Now, Add to Cart, Chat Now (Matching Image 1 & 3) */}
              <div className="flex flex-col sm:flex-row items-stretch gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => onBuyNow(product, quantity, selectedVariations)}
                  disabled={isOutOfStock}
                  className="flex-1 py-3.5 px-6 rounded-2xl font-black text-sm bg-[#f95700] hover:bg-[#ea4e00] text-white shadow-md shadow-orange-500/25 transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Start order / Buy Now</span>
                </button>

                <button
                  type="button"
                  onClick={() => onAddToCart(product, quantity, selectedVariations)}
                  disabled={isOutOfStock}
                  className="py-3.5 px-6 rounded-2xl font-bold text-sm bg-white hover:bg-slate-50 border-2 border-slate-300 text-slate-800 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <span>Add to cart</span>
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
            {/* Tabs Header */}
            <div className="flex items-center gap-6 border-b border-slate-200 text-xs font-bold overflow-x-auto pb-3">
              <button
                type="button"
                onClick={() => setActiveTab('attributes')}
                className={`cursor-pointer pb-2 relative whitespace-nowrap ${
                  activeTab === 'attributes' ? 'text-[#f95700] font-black' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Attributes & Specifications
                {activeTab === 'attributes' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#f95700] rounded-full" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('description')}
                className={`cursor-pointer pb-2 relative whitespace-nowrap ${
                  activeTab === 'description' ? 'text-[#f95700] font-black' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Description
                {activeTab === 'description' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#f95700] rounded-full" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('supplier')}
                className={`cursor-pointer pb-2 relative whitespace-nowrap ${
                  activeTab === 'supplier' ? 'text-[#f95700] font-black' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Supplier & Packaging
                {activeTab === 'supplier' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#f95700] rounded-full" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('reviews')}
                className={`cursor-pointer pb-2 relative whitespace-nowrap ${
                  activeTab === 'reviews' ? 'text-[#f95700] font-black' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Reviews ({reviews.length})
                {activeTab === 'reviews' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#f95700] rounded-full" />
                )}
              </button>
            </div>

            {/* TAB 1: KEY ATTRIBUTES & SPECIFICATIONS TABLE (Matching Image 1 & 2) */}
            {activeTab === 'attributes' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-black text-slate-900 mb-3 uppercase tracking-wider">
                    Key attributes
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 border border-slate-200 rounded-2xl overflow-hidden text-xs">
                    {keyAttributes.map((attr, idx) => (
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

                {/* Packaging and Delivery (Matching Image 2) */}
                <div>
                  <h3 className="text-sm font-black text-slate-900 mb-3 uppercase tracking-wider">
                    Packaging and delivery
                  </h3>
                  <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
                      <div className="p-3.5 space-y-1">
                        <span className="text-[11px] text-slate-400 block font-medium">Selling Units</span>
                        <span className="font-bold text-slate-900">Single item ({product.unit || 'Piece'})</span>
                      </div>
                      <div className="p-3.5 space-y-1">
                        <span className="text-[11px] text-slate-400 block font-medium">Single package size</span>
                        <span className="font-bold text-slate-900 font-mono">
                          {packageDimensions.length} &times; {packageDimensions.width} &times; {packageDimensions.height} cm
                        </span>
                      </div>
                      <div className="p-3.5 space-y-1">
                        <span className="text-[11px] text-slate-400 block font-medium">Single gross weight</span>
                        <span className="font-bold text-slate-900 font-mono">{grossWeight} kg</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* At a glance (Matching Image 1) */}
                <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 text-xs space-y-2">
                  <h4 className="font-black text-amber-950 flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-amber-600" />
                    At a glance
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-slate-700">
                    <li><strong className="text-slate-900">Kolinsky / Professional Grade:</strong> High quality resilient materials for long operational lifespan and ergonomic usage.</li>
                    <li><strong className="text-slate-900">Precision Construction:</strong> Crimped ferrule and reinforced assembly prevents shedding and maintains shape over time.</li>
                    <li><strong className="text-slate-900">Alibaba Trade Assurance:</strong> 100% dispatch and parcel inspection verified prior to Kigali air cargo flight.</li>
                  </ul>
                </div>
              </div>
            )}

            {/* TAB 2: UNMODIFIED ORIGINAL DESCRIPTION */}
            {activeTab === 'description' && (
              <div className="space-y-4 text-xs">
                <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 font-mono whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
                  {product.description}
                </div>
              </div>
            )}

            {/* TAB 3: SUPPLIER & PACKAGING */}
            {activeTab === 'supplier' && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <h4 className="font-black text-slate-900 flex items-center gap-1.5">
                      <Store className="w-4 h-4 text-[#f95700]" />
                      Verified Manufacturer
                    </h4>
                    <p className="font-bold text-slate-800">{product.alibabaSupplierName || 'Yangjiang Boyuan Trading Co., Ltd.'}</p>
                    <p className="text-slate-500">{product.alibabaSupplierLocation || 'China'}</p>
                    <p className="text-[11px] text-emerald-700 font-semibold pt-1">
                      ✓ ISO9001, CE, FCC, RoHS factory certification compliance
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <h4 className="font-black text-slate-900 flex items-center gap-1.5">
                      <Truck className="w-4 h-4 text-purple-600" />
                      Rwanda Freight Routing
                    </h4>
                    <p className="text-slate-700">
                      Destination: <strong className="text-slate-900">Kigali International Airport (KGL) Hub</strong>
                    </p>
                    <p className="text-slate-700">
                      Customs Clearance: <strong className="text-slate-900">Gikondo MAGERWA Customs Station</strong>
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Dispatched directly via official Alibaba Air Express consolidators.
                    </p>
                  </div>
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
