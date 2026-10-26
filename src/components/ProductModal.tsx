import React, { useState, useEffect } from 'react';
import {
  X, Star, ShoppingBag, Truck, RotateCcw, Heart, Plus, Minus,
  MessageCircle, Maximize2, Store, Clock, ChevronRight, CheckCircle2, ChevronLeft, Tag, Camera,
  Youtube, ExternalLink, Play
} from 'lucide-react';
import { Product, ProductReview } from '../types.ts';
import { Language, translations } from '../translations.ts';
import { api } from '../services/api.ts';
import { getYouTubeEmbedUrl, getYouTubeThumbnailUrl, isValidYouTubeUrl, getYouTubeVideoId } from '../utils/youtube.ts';

interface ProductModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number, variation?: { [key: string]: string }) => void;
  onBuyNow: (product: Product, quantity: number, variation?: { [key: string]: string }) => void;
  allProducts: Product[];
  onSelectSimilar: (product: Product) => void;
  currentLang: Language;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  product,
  onClose,
  onAddToCart,
  onBuyNow,
  allProducts,
  onSelectSimilar,
  currentLang
}) => {
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'description' | 'video' | 'reviews'>('description');
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [selectedVariations, setSelectedVariations] = useState<{ [key: string]: string }>({});

  // Reviews state
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [revRating, setRevRating] = useState(5);
  const [revName, setRevName] = useState('');
  const [revComment, setRevComment] = useState('');
  const [revSubmitting, setRevSubmitting] = useState(false);
  const [revSuccess, setRevSuccess] = useState(false);

  // Real gallery images
  const galleryImages = (product?.images && product.images.length > 0)
    ? (product.imageUrl && !product.images.includes(product.imageUrl) ? [product.imageUrl, ...product.images] : product.images)
    : (product ? [product.imageUrl] : []);

  useEffect(() => {
    if (product) {
      setQuantity(1);
      setSelectedImageIndex(0);
      setIsLightboxOpen(false);
      setSelectedVariations({});
      // Load initial selected variation if options exist
      if (product.variations && product.variations.length > 0) {
        const initialVars: { [key: string]: string } = {};
        product.variations.forEach(v => {
          if (v.options.length > 0) initialVars[v.name] = v.options[0];
        });
        setSelectedVariations(initialVars);
      }
      // Load reviews
      api.getProductReviews(product.id).then(r => setReviews(r)).catch(() => {});
    }
  }, [product]);

  // Keyboard navigation for image gallery & fullscreen lightbox
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

  const t = translations[currentLang];
  const hasDiscount = Boolean(
    (product.discountPercent !== undefined && product.discountPercent > 0) ||
    (product.discountPrice !== undefined && product.discountPrice < product.price)
  );
  const discountPercent = product.discountPercent || (hasDiscount && product.price > 0 && product.discountPrice
    ? Math.round(((product.price - product.discountPrice) / product.price) * 100)
    : 0);
  const unitPrice = (product.discountPrice !== undefined && product.discountPrice < product.price)
    ? product.discountPrice
    : (discountPercent > 0 ? Math.round(product.price * (1 - discountPercent / 100)) : product.price);
  const totalPrice = unitPrice * quantity;
  const isOutOfStock = product.status === 'Out of Stock' || product.stock <= 0;

  // Filter similar items from same category
  const similarItems = allProducts
    .filter(p => p.id !== product.id && p.category === product.category)
    .slice(0, 5);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revName.trim() || !revComment.trim()) return;
    setRevSubmitting(true);
    try {
      const review = await api.submitProductReview(product.id, {
        customerName: revName.trim(),
        rating: revRating,
        comment: revComment.trim()
      });
      setReviews([review, ...reviews]);
      setRevSuccess(true);
      setRevName('');
      setRevComment('');
      setTimeout(() => setRevSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to submit review:', err);
    } finally {
      setRevSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[94vh] overflow-y-auto shadow-2xl relative border border-slate-100 flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Main Content */}
        <div className="p-6 sm:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            {/* LEFT COLUMN: Gallery with multiple views */}
            <div className="space-y-3">
              {/* Main Image with Expand Icon & Navigation Arrows */}
              <div className="relative rounded-2xl overflow-hidden bg-slate-50 border border-slate-200 pt-[82%] shadow-inner group/img">
                <img
                  src={galleryImages[selectedImageIndex] || product.imageUrl}
                  alt={product.name}
                  referrerPolicy="no-referrer"
                  onClick={() => setIsLightboxOpen(true)}
                  className="absolute inset-0 w-full h-full object-cover object-center cursor-zoom-in transition-transform duration-300 group-hover/img:scale-[1.02]"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80';
                  }}
                />

                {/* Floating Image Counter Badge */}
                {galleryImages.length > 1 && (
                  <div className="absolute bottom-3 left-3 z-10 pointer-events-none">
                    <span className="bg-slate-900/75 backdrop-blur-xs text-white text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-md">
                      <Camera className="w-3.5 h-3.5" />
                      <span>{selectedImageIndex + 1} / {galleryImages.length}</span>
                    </span>
                  </div>
                )}

                {/* Fullscreen Expand Button */}
                <button
                  type="button"
                  onClick={() => setIsLightboxOpen(true)}
                  className="absolute top-3 right-3 z-10 p-2 rounded-xl bg-white/90 hover:bg-white text-slate-700 shadow-md backdrop-blur-xs transition-all hover:scale-105 cursor-pointer"
                  title="View fullscreen image gallery"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>

                {/* Next / Previous Arrows Overlay */}
                {galleryImages.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedImageIndex(prev => (prev > 0 ? prev - 1 : galleryImages.length - 1));
                      }}
                      className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-slate-800 shadow-md backdrop-blur-xs flex items-center justify-center transition-all opacity-85 hover:opacity-100 hover:scale-110 cursor-pointer"
                      title="Previous image"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedImageIndex(prev => (prev < galleryImages.length - 1 ? prev + 1 : 0));
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-slate-800 shadow-md backdrop-blur-xs flex items-center justify-center transition-all opacity-85 hover:opacity-100 hover:scale-110 cursor-pointer"
                      title="Next image"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>

              {/* Thumbnails Row */}
              {(galleryImages.length > 1 || (product.videoUrl && isValidYouTubeUrl(product.videoUrl))) && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1.5">
                  {galleryImages.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImageIndex(idx)}
                      className={`relative w-16 h-16 rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                        selectedImageIndex === idx
                          ? 'border-[#FF5500] ring-2 ring-orange-200 scale-102 shadow-xs'
                          : 'border-slate-200 opacity-70 hover:opacity-100 hover:border-slate-300'
                      }`}
                      title={`Photo ${idx + 1}`}
                    >
                      <img
                        src={img}
                        alt={`Thumbnail ${idx + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80';
                        }}
                      />
                      <span className="absolute bottom-0.5 right-0.5 bg-black/70 text-white text-[8px] font-bold px-1 rounded">
                        {idx + 1}
                      </span>
                    </button>
                  ))}

                  {/* YouTube Video Quick Access Thumbnail */}
                  {product.videoUrl && isValidYouTubeUrl(product.videoUrl) && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('video');
                        const videoSection = document.getElementById('product-video-section');
                        if (videoSection) {
                          videoSection.scrollIntoView({ behavior: 'smooth' });
                        }
                      }}
                      className={`relative w-16 h-16 rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer flex flex-col items-center justify-center group ${
                        activeTab === 'video'
                          ? 'border-red-600 ring-2 ring-red-200 scale-102 shadow-xs bg-red-950'
                          : 'border-red-300 bg-red-900/90 hover:border-red-500'
                      }`}
                      title="Watch YouTube Product Video Description"
                    >
                      <img
                        src={getYouTubeThumbnailUrl(product.videoUrl) || ''}
                        alt="YouTube Video Preview"
                        className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-85 transition-opacity"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      <div className="relative z-10 w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                        <Play className="w-3 h-3 fill-white ml-0.5" />
                      </div>
                      <span className="relative z-10 text-[8px] font-black uppercase text-white bg-black/80 px-1 rounded mt-0.5 tracking-wider">
                        Video
                      </span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: Product Purchase Panel */}
            <div className="space-y-4">
              {/* Title & Wishlist */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {product.brand && (
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{product.brand}</span>
                    )}
                    {product.sku && (
                      <span className="text-[10px] font-mono text-slate-400 font-bold bg-slate-100 px-2 py-0.5 rounded">
                        SKU: {product.sku}
                      </span>
                    )}
                  </div>
                  <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-snug">
                    {product.name}
                  </h1>
                </div>
                <button
                  onClick={() => setIsWishlisted(!isWishlisted)}
                  className={`p-2 rounded-full border transition-colors shrink-0 cursor-pointer ${
                    isWishlisted ? 'border-rose-300 bg-rose-50 text-rose-500' : 'border-slate-200 hover:bg-slate-50 text-slate-400'
                  }`}
                  aria-label="Wishlist"
                >
                  <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-rose-500 text-rose-500' : ''}`} />
                </button>
              </div>

              {/* Price & Stock */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-y border-slate-100 py-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-2xl sm:text-3xl font-black text-[#FF5500] font-mono tabular-nums">
                    {unitPrice.toLocaleString()} frw
                  </span>
                  {hasDiscount && (
                    <>
                      <span className="text-xs sm:text-sm text-slate-400 line-through font-mono">
                        {product.price.toLocaleString()} frw
                      </span>
                      <span className="text-xs font-black text-white bg-[#FF6000] px-2 py-0.5 rounded-md shadow-2xs">
                        -{discountPercent}% OFF
                      </span>
                      <span className="text-xs font-semibold text-emerald-600">
                        (Save {(product.price - unitPrice).toLocaleString()} frw)
                      </span>
                    </>
                  )}
                </div>
                {isOutOfStock ? (
                  <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200">
                    Out of Stock
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Available ({product.stock} in stock)
                  </span>
                )}
              </div>

              {/* Variations Selector (e.g. Size, Color) */}
              {product.variations && product.variations.length > 0 && (
                <div className="space-y-3 pt-1">
                  {product.variations.map((v, i) => (
                    <div key={i} className="text-xs">
                      <span className="font-bold text-slate-700 block mb-1.5">{v.name}:</span>
                      <div className="flex flex-wrap gap-2">
                        {v.options.map((opt, oIdx) => {
                          const isSelected = selectedVariations[v.name] === opt;
                          return (
                            <button
                              key={oIdx}
                              type="button"
                              onClick={() => setSelectedVariations({ ...selectedVariations, [v.name]: opt })}
                              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-[#FF5500] text-white shadow-xs'
                                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
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

              {/* Supported Payment Options & Receiver info */}
              <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/60 text-xs space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-amber-900 font-semibold">
                  <span>Available Payment Methods:</span>
                  <span className="font-mono text-slate-700 font-bold">
                    Receiver: {product.receiverName || 'Ruth'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(product.paymentMethods && product.paymentMethods.length > 0
                    ? product.paymentMethods
                    : ['MTN Merchant Code', 'MTN Mobile Money']
                  ).map((method) => (
                    <span
                      key={method}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-amber-300 text-[10px] font-bold text-slate-800 font-mono shadow-2xs"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                      {method === 'MTN Merchant Code'
                        ? `MTN MoMoPay (*182*8*1*${product.merchantCode || '078002'}#)`
                        : method === 'MTN Mobile Money'
                        ? `MTN Transfer (*182*1*1*${product.receiverPhone || '078002260'}#)`
                        : method}
                    </span>
                  ))}
                </div>
              </div>

              {/* Quantity Stepper & Buy Buttons */}
              <div className="flex items-center gap-3 pt-1">
                <div className="inline-flex items-center border border-slate-300 rounded-lg p-1 bg-white">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1 || isOutOfStock}
                    className="w-7 h-7 rounded flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-9 text-center font-bold text-xs font-mono">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    disabled={quantity >= product.stock || isOutOfStock}
                    className="w-7 h-7 rounded flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  onClick={() => onAddToCart(product, quantity, selectedVariations)}
                  disabled={isOutOfStock}
                  className="py-2.5 px-4 rounded-xl font-bold text-xs border border-[#FF5500] text-[#FF5500] hover:bg-orange-50 transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Add to Cart</span>
                </button>

                <button
                  onClick={() => onBuyNow(product, quantity, selectedVariations)}
                  disabled={isOutOfStock}
                  className="py-2.5 px-6 rounded-xl font-extrabold text-xs bg-[#FF5500] hover:bg-[#E54D00] text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <span>Gura Nonaha</span>
                </button>
              </div>

              {/* Seller shop info */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <Store className="w-4 h-4 text-[#FF5500]" />
                  <div>
                    <span className="font-bold text-slate-800 block">{product.shopName || 'ContactReach Market'}</span>
                    <span className="text-[10px] text-slate-400">{product.location || 'Kigali, Rwanda'}</span>
                  </div>
                </div>
                <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Verified Seller
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Tabs: Description vs Reviews */}
          <div className="mt-8 border-t border-slate-200 pt-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3 mb-4 overflow-x-auto">
              <button
                onClick={() => setActiveTab('description')}
                className={`text-xs font-bold pb-2 relative cursor-pointer whitespace-nowrap ${
                  activeTab === 'description' ? 'text-[#FF5500]' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Sobanukirwa Icyo Igicuruzwa Cyagenewe
                {activeTab === 'description' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF5500] rounded-full" />
                )}
              </button>

              {product.videoUrl && isValidYouTubeUrl(product.videoUrl) && (
                <button
                  onClick={() => setActiveTab('video')}
                  className={`text-xs font-bold pb-2 relative cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                    activeTab === 'video' ? 'text-red-600' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Youtube className="w-4 h-4 text-red-600" />
                  <span>YouTube Video Description</span>
                  <span className="text-[9px] bg-red-100 text-red-700 font-black px-1.5 py-0.2 rounded-full uppercase">
                    Video
                  </span>
                  {activeTab === 'video' && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600 rounded-full" />
                  )}
                </button>
              )}

              <button
                onClick={() => setActiveTab('reviews')}
                className={`text-xs font-bold pb-2 relative cursor-pointer whitespace-nowrap ${
                  activeTab === 'reviews' ? 'text-[#FF5500]' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Customer Reviews ({reviews.length})
                {activeTab === 'reviews' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF5500] rounded-full" />
                )}
              </button>
            </div>

            {activeTab === 'description' ? (
              <div className="text-xs text-slate-700 leading-relaxed space-y-3 bg-slate-50/60 p-4 rounded-2xl border border-slate-100">
                <p>{product.description}</p>
                {product.deliveryInfo && (
                  <div className="flex items-center gap-2 text-slate-600 pt-2 border-t border-slate-200/60">
                    <Truck className="w-4 h-4 text-orange-600 shrink-0" />
                    <span>Delivery Details: {product.deliveryInfo}</span>
                  </div>
                )}

                {/* Inline YouTube Video Description preview in description tab */}
                {product.videoUrl && isValidYouTubeUrl(product.videoUrl) && (
                  <div id="product-video-section" className="mt-4 p-4 rounded-2xl bg-white border border-red-200/80 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-red-600 text-white flex items-center justify-center shadow-xs">
                          <Youtube className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 text-xs block">YouTube Video Demonstration</span>
                          <span className="text-[10px] text-slate-500">Official product showcase & unboxing</span>
                        </div>
                      </div>
                      <a
                        href={product.videoUrl.startsWith('http') ? product.videoUrl : `https://www.youtube.com/watch?v=${getYouTubeVideoId(product.videoUrl)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-[11px] font-bold flex items-center gap-1 border border-red-200 transition-colors"
                      >
                        <span>Watch on YouTube</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="relative pt-[56.25%] rounded-xl overflow-hidden bg-black shadow-inner">
                      <iframe
                        src={getYouTubeEmbedUrl(product.videoUrl) || ''}
                        title={`${product.name} Video Description`}
                        className="absolute inset-0 w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : activeTab === 'video' ? (
              <div id="product-video-section" className="p-4 sm:p-5 rounded-2xl bg-white border border-red-200 shadow-2xs space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-xs">
                      <Youtube className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900">
                        YouTube Video Description: {product.name}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Watch how this product looks, works, and is packaged before you purchase.
                      </p>
                    </div>
                  </div>
                  {product.videoUrl && (
                    <a
                      href={product.videoUrl.startsWith('http') ? product.videoUrl : `https://www.youtube.com/watch?v=${getYouTubeVideoId(product.videoUrl)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                    >
                      <span>Open in YouTube App</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>

                {/* Embedded Video Player */}
                <div className="relative pt-[56.25%] rounded-2xl overflow-hidden bg-black shadow-lg border border-slate-900">
                  <iframe
                    src={getYouTubeEmbedUrl(product.videoUrl, true) || ''}
                    title={`${product.name} Video Description`}
                    className="absolute inset-0 w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100 flex-wrap gap-2">
                  <span>Product SKU: <strong className="font-mono text-slate-700">{product.sku || 'N/A'}</strong></span>
                  <span>ContactReach Market Video Showcase</span>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Submit review */}
                <form onSubmit={handleSubmitReview} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 text-xs">
                  <h4 className="font-extrabold text-slate-900">Write a Customer Review</h4>
                  {revSuccess && (
                    <div className="p-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl">
                      Review submitted and published! Thank you.
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      required
                      placeholder="Your Name"
                      value={revName}
                      onChange={(e) => setRevName(e.target.value)}
                      className="px-3 py-2 rounded-xl border border-slate-300 bg-white"
                    />
                    <select
                      value={revRating}
                      onChange={(e) => setRevRating(Number(e.target.value))}
                      className="px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold"
                    >
                      <option value={5}>⭐⭐⭐⭐⭐ 5 Stars - Excellent</option>
                      <option value={4}>⭐⭐⭐⭐ 4 Stars - Very Good</option>
                      <option value={3}>⭐⭐⭐ 3 Stars - Average</option>
                      <option value={2}>⭐⭐ 2 Stars - Below Expectations</option>
                      <option value={1}>⭐ 1 Star - Poor</option>
                    </select>
                  </div>
                  <textarea
                    rows={2}
                    required
                    placeholder="Share your experience with this product..."
                    value={revComment}
                    onChange={(e) => setRevComment(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                  />
                  <button
                    type="submit"
                    disabled={revSubmitting}
                    className="px-4 py-2 bg-slate-900 hover:bg-black text-white font-bold rounded-xl cursor-pointer disabled:opacity-50"
                  >
                    Submit Review
                  </button>
                </form>

                {/* Reviews List */}
                <div className="space-y-2">
                  {reviews.length > 0 ? (
                    reviews.map(r => (
                      <div key={r.id} className="p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{r.customerName}</span>
                          <span className="text-[10px] text-slate-400">{new Date(r.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="text-amber-500 font-bold">
                          {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                        </div>
                        <p className="text-slate-600">{r.comment}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 py-3 text-center">No reviews yet. Be the first to review this product!</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fullscreen Lightbox Modal */}
      {isLightboxOpen && (
        <div className="fixed inset-0 z-60 bg-black/95 flex flex-col justify-between p-4 sm:p-6 animate-in fade-in duration-200">
          {/* Top Bar */}
          <div className="flex items-center justify-between text-white pb-3 border-b border-white/10">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full bg-white/10 text-xs font-mono font-bold flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-orange-400" />
                <span>{selectedImageIndex + 1} of {galleryImages.length}</span>
              </span>
              <span className="text-sm font-semibold truncate max-w-md hidden sm:inline">
                {product.name}
              </span>
            </div>
            <button
              onClick={() => setIsLightboxOpen(false)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Close fullscreen (Esc)"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Centered Image with Large Prev/Next */}
          <div className="relative flex-1 flex items-center justify-center p-2 min-h-0">
            {galleryImages.length > 1 && (
              <button
                type="button"
                onClick={() => setSelectedImageIndex(prev => (prev > 0 ? prev - 1 : galleryImages.length - 1))}
                className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 transition-all hover:scale-110 cursor-pointer z-10"
                title="Previous image (Left arrow)"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            <img
              src={galleryImages[selectedImageIndex] || product.imageUrl}
              alt={product.name}
              className="max-h-[75vh] max-w-full object-contain rounded-xl shadow-2xl"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80';
              }}
            />

            {galleryImages.length > 1 && (
              <button
                type="button"
                onClick={() => setSelectedImageIndex(prev => (prev < galleryImages.length - 1 ? prev + 1 : 0))}
                className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 transition-all hover:scale-110 cursor-pointer z-10"
                title="Next image (Right arrow)"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Bottom Thumbnails Strip */}
          {galleryImages.length > 1 && (
            <div className="flex items-center justify-center gap-2 overflow-x-auto py-2 pt-3 border-t border-white/10">
              {galleryImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                    selectedImageIndex === idx
                      ? 'border-[#FF5500] ring-2 ring-orange-500 scale-105'
                      : 'border-transparent opacity-50 hover:opacity-90'
                  }`}
                >
                  <img src={img} alt="thumbnail" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
