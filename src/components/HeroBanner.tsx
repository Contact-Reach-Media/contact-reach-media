import React, { useState, useEffect } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, Copy, Check, Sparkles, Truck, ShieldCheck, Zap } from 'lucide-react';
import { Language } from '../translations.ts';

interface HeroBannerProps {
  currentLang: Language;
  onShopNow: (categoryId?: string) => void;
  onTrackOrder: () => void;
  onCopyNotice?: (text: string) => void;
}

interface PromoSlide {
  id: string;
  badgeEn: string;
  badgeRw: string;
  titleEn: string;
  titleRw: string;
  descEn: string;
  descRw: string;
  ctaEn: string;
  ctaRw: string;
  categoryId: string;
  image: string;
  gradient: string;
  accentColor: string;
}

const slides: PromoSlide[] = [
  {
    id: 'gifts-lifestyle',
    badgeEn: 'Bestsellers in Kigali',
    badgeRw: 'Ibicuruzwa bikunzwe i Kigali',
    titleEn: 'Gifts, Lifestyle & Home Decor',
    titleRw: 'Impano n\'ibindi byiza byo mu rugo',
    descEn: 'Shop authentic curated gift hampers, home essentials, kids toys, and watches at the best prices.',
    descRw: 'Gura impano, ibikoresho byo mu rugo, ibikoresho by\'abana, amasaha, n\'ibindi byinshi byizewe ku biciro byiza.',
    ctaEn: 'Shop Now',
    ctaRw: 'Gura ubu',
    categoryId: 'impano',
    image: '/src/assets/images/hero_marketplace_shopper_1791966365592.jpg',
    gradient: 'from-[#C2410C] via-[#9A3412] to-[#1E293B]',
    accentColor: '#FF6000'
  },
  {
    id: 'smart-tech',
    badgeEn: 'Tech & Home Entertainment',
    badgeRw: 'Ibyuma by\'ubwenge & Tereviziyo',
    titleEn: 'Smart LED TVs & Audio Systems',
    titleRw: 'Smart TVs na Sound Systems nziza',
    descEn: 'Upgrade your living room with high-definition smart displays, wireless audio, and premium accessories.',
    descRw: 'Gura televiziyo zigezweho za Smart LED, indangururamajwi z\'amajwi meza, n\'ibikoresho by\'ikoranabuhanga.',
    ctaEn: 'Explore Tech',
    ctaRw: 'Reba Ibyuma',
    categoryId: 'electronics',
    image: '/src/assets/images/product_smart_tv_audio_1791966367526.jpg',
    gradient: 'from-[#0369A1] via-[#0F172A] to-[#1E1B4B]',
    accentColor: '#38BDF8'
  },
  {
    id: 'fashion-beauty',
    badgeEn: 'Fashion & Cosmetics',
    badgeRw: 'Imideri & Ubwiza',
    titleEn: 'Streetwear, Sneakers & Hair Care',
    titleRw: 'Inkweto, Imyenda & Amavuta y\'Umusatsi',
    descEn: 'Discover on-trend urban sneakers, organic curl revitalizers, and personal care essentials delivered fast.',
    descRw: 'Inkweto zigezweho z\'umujyi, amavuta n\'amasabune by\'umusatsi, n\'imyenda myiza i Kigali.',
    ctaEn: 'Browse Fashion',
    ctaRw: 'Reba Imideri',
    categoryId: 'fashion',
    image: '/src/assets/images/product_street_sneakers_1791966366958.jpg',
    gradient: 'from-[#15803D] via-[#14532D] to-[#0F172A]',
    accentColor: '#4ADE80'
  }
];

export const HeroBanner: React.FC<HeroBannerProps> = ({
  currentLang,
  onShopNow,
  onTrackOrder,
  onCopyNotice
}) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isCopied, setIsCopied] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Auto advance slides every 5.5 seconds unless hovered
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % slides.length);
    }, 5500);
    return () => clearInterval(interval);
  }, [isPaused]);

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    onCopyNotice?.(text);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const currentSlide = slides[currentSlideIndex];

  return (
    <section className="max-w-[1440px] mx-auto px-4 sm:px-8 pt-3 pb-6">
      {/* Dynamic Flash Announcement Marquee */}
      <div className="mb-4 bg-slate-900 text-white rounded-xl py-2 px-4 shadow-xs flex items-center justify-between text-xs overflow-hidden border border-slate-800">
        <div className="flex items-center gap-2 shrink-0 text-[#FF6000] font-bold">
          <Zap className="w-3.5 h-3.5 fill-current animate-pulse" />
          <span className="uppercase tracking-wider text-[11px]">ContactReach Notice:</span>
        </div>
        <div className="flex-1 mx-4 overflow-hidden whitespace-nowrap text-slate-300 text-[11px] sm:text-xs">
          <span className="inline-block animate-marquee">
            🚚 Free delivery across Kigali for orders over 30,000 FRW &nbsp;•&nbsp; 
            📱 Easy MTN MoMo (*182*1*1*0780022600*AMOUNT#) & Airtel Money dialer &nbsp;•&nbsp; 
            🛡️ 100% Verified Quality & Same-Day Dispatch
          </span>
        </div>
        <button
          onClick={() => onShopNow('all')}
          className="shrink-0 text-[11px] font-bold text-orange-400 hover:text-orange-300 underline underline-offset-2 cursor-pointer"
        >
          {currentLang === 'en' ? 'Shop Deals' : 'Gura ubu'} →
        </button>
      </div>

      {/* Dual Hero Advertisement Cards (Matching Screenshot 1 & 2 Style) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        
        {/* ============================================================== */}
        {/* CARD 1: ORDER TRACKING & MOMO EXPERIENCE BANNER               */}
        {/* ============================================================== */}
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#0284C7] via-[#0369A1] to-[#075985] text-white p-6 sm:p-8 min-h-[360px] flex flex-col justify-between shadow-md border border-sky-400/30 group">
          
          {/* Subtle Background Radial Glow */}
          <div className="absolute -top-24 -right-24 w-80 h-80 bg-sky-300/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-blue-900/40 rounded-full blur-3xl pointer-events-none" />

          {/* Top Row: Pill Badge & Fast Dispatch */}
          <div className="relative z-10">
            <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md text-white text-[11px] font-extrabold px-3 py-1 rounded-full mb-3.5 shadow-2xs border border-white/20">
              <Truck className="w-3.5 h-3.5 text-amber-300" />
              <span>Fast Delivery • Today in Kigali</span>
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black leading-tight tracking-tight text-white max-w-md drop-shadow-xs">
              {currentLang === 'en' ? 'Order is on the way' : 'Ibintu Byageze Mu Nzira'}
            </h2>
            <p className="text-xs sm:text-sm text-sky-100 mt-2 max-w-sm leading-relaxed drop-shadow-2xs">
              {currentLang === 'en'
                ? 'Track delivery status in real time and pay securely with MTN MoMo or Airtel Money.'
                : 'Kurikirana aho ibyo waguze bigeze unishyure byoroshye ukoresheje MTN cyangwa Airtel MoMo.'}
            </p>
          </div>

          {/* Interactive Simulated Live Tracking & Quick Pay Widget */}
          <div className="relative z-10 mt-6 bg-slate-900/40 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-white/25 shadow-xl space-y-3">
            {/* Order Reference Row */}
            <div className="flex items-center justify-between text-xs border-b border-white/15 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="font-mono font-bold text-white tracking-wide">
                  Ref: <span className="text-amber-300">MT123456789</span>
                </span>
              </div>
              <button
                onClick={() => handleCopyCode('MT123456789')}
                className="flex items-center gap-1 text-[11px] font-bold bg-white/25 hover:bg-white/35 text-white px-2.5 py-1 rounded-lg transition-all active:scale-95 cursor-pointer"
                title="Copy reference code"
              >
                {isCopied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-300" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            {/* Visual Delivery Steps Micro-Bar */}
            <div className="flex items-center justify-between text-[10px] text-sky-100 font-semibold pt-0.5">
              <div className="flex items-center gap-1 text-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Byemejwe</span>
              </div>
              <div className="h-0.5 flex-1 mx-2 bg-emerald-400/50" />
              <div className="flex items-center gap-1 text-amber-300">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span>MoMo Verified</span>
              </div>
              <div className="h-0.5 flex-1 mx-2 bg-white/30" />
              <div className="flex items-center gap-1 text-sky-200">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-300" />
                <span>Mu Nzira</span>
              </div>
            </div>

            {/* Action Row */}
            <div className="flex items-center justify-between pt-1 gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-black bg-[#FFCC00] text-slate-900 px-2.5 py-1 rounded-md shadow-2xs">
                  MTN MoMo
                </span>
                <span className="text-[11px] font-black bg-[#E60000] text-white px-2.5 py-1 rounded-md shadow-2xs">
                  Airtel
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onTrackOrder}
                  className="py-2 px-3 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs transition-all cursor-pointer"
                >
                  {currentLang === 'en' ? 'Track Order' : 'Kurikirana'}
                </button>
                <button
                  onClick={() => onShopNow('all')}
                  className="py-2 px-4 rounded-xl bg-[#FF6000] hover:bg-[#ea580c] text-white font-black text-xs shadow-md transition-all transform active:scale-95 cursor-pointer flex items-center gap-1"
                >
                  <span>{currentLang === 'en' ? 'Shop Now' : 'Gura ubu'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* CARD 2: FEATURED ADVERTISEMENT CAROUSEL (Matching Reference)  */}
        {/* ============================================================== */}
        <div
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          className={`relative rounded-3xl overflow-hidden bg-gradient-to-br ${currentSlide.gradient} text-white p-6 sm:p-8 min-h-[360px] flex flex-col justify-between shadow-md border border-white/10 transition-colors duration-700 group`}
        >
          {/* Background Product Image with Gradient Mask */}
          <div className="absolute right-0 top-0 bottom-0 w-1/2 lg:w-5/12 overflow-hidden pointer-events-none opacity-40 sm:opacity-60 md:opacity-85 mix-blend-luminosity hover:mix-blend-normal transition-opacity">
            <img
              src={currentSlide.image}
              alt={currentSlide.titleEn}
              className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/50 to-transparent" />
          </div>

          {/* Top Pill & Category Indicator */}
          <div className="relative z-10 max-w-sm">
            <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md text-white text-[11px] font-extrabold px-3 py-1 rounded-full mb-3.5 shadow-2xs border border-white/20">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>{currentLang === 'en' ? currentSlide.badgeEn : currentSlide.badgeRw}</span>
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black leading-tight tracking-tight text-white drop-shadow-xs">
              {currentLang === 'en' ? currentSlide.titleEn : currentSlide.titleRw}
            </h2>

            <p className="text-xs sm:text-sm text-slate-200 mt-2.5 leading-relaxed drop-shadow-2xs">
              {currentLang === 'en' ? currentSlide.descEn : currentSlide.descRw}
            </p>
          </div>

          {/* Bottom Controls Row: Dots, CTA Button, and Next/Prev Arrows */}
          <div className="relative z-10 flex items-center justify-between mt-8 pt-4 border-t border-white/15">
            {/* Indicator Dots */}
            <div className="flex items-center gap-2">
              {slides.map((s, idx) => (
                <button
                  key={s.id}
                  onClick={() => setCurrentSlideIndex(idx)}
                  className={`transition-all rounded-full cursor-pointer ${
                    currentSlideIndex === idx
                      ? 'w-7 h-2 bg-white'
                      : 'w-2 h-2 bg-white/40 hover:bg-white/70'
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>

            {/* CTA & Next Slide Arrows */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => onShopNow(currentSlide.categoryId)}
                className="py-2.5 px-5 rounded-xl bg-white text-slate-900 hover:bg-orange-50 font-black text-xs shadow-md transition-all transform active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <span>{currentLang === 'en' ? currentSlide.ctaEn : currentSlide.ctaRw}</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#FF6000]" />
              </button>

              <button
                onClick={() => setCurrentSlideIndex((prev) => (prev === 0 ? slides.length - 1 : prev - 1))}
                className="w-9 h-9 rounded-full bg-white/20 hover:bg-white text-white hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Previous slide"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                onClick={() => setCurrentSlideIndex((prev) => (prev + 1) % slides.length)}
                className="w-9 h-9 rounded-full bg-white/20 hover:bg-white text-white hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Next slide"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};
