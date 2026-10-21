import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft, ChevronRight, Check, Truck, Package, Copy,
  ArrowRight, ShieldCheck, ShoppingBag, Sparkles, Smartphone,
  Home, CreditCard, User, Layers
} from 'lucide-react';
import { Language } from '../translations.ts';

interface HeroCarouselProps {
  currentLang: Language;
  onNavigateShop: () => void;
  onNavigateHowToBuy: () => void;
  onShowToast: (msg: string) => void;
}

export const HeroCarousel: React.FC<HeroCarouselProps> = ({
  currentLang,
  onNavigateShop,
  onNavigateHowToBuy,
  onShowToast,
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const totalSlides = 5;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % totalSlides);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  // Autoplay timer
  useEffect(() => {
    if (!isPaused) {
      timerRef.current = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % totalSlides);
      }, 5000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, totalSlides]);

  const copyTrackingRef = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard?.writeText('MT123456789');
    onShowToast('Reference copied: MT123456789');
  };

  return (
    <div
      className="relative w-full max-w-[1440px] mx-auto px-2 sm:px-4 lg:px-8 pt-3 pb-6 select-none overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Outer Slider Stage with Left/Right Peek Layout matching reference screenshot */}
      <div className="relative w-full h-[460px] sm:h-[500px] md:h-[540px] lg:h-[580px] flex items-center justify-center">
        {/* Slides Track */}
        <div className="relative w-full h-full rounded-3xl overflow-hidden shadow-sm">
          {/* SLIDE 0: EXACT REFERENCE SCREENSHOT DESIGN ("Tangira kugura, wishyure nyuma" with 3D Smartphone Tracking Screen) */}
          <div
            className={`absolute inset-0 w-full h-full transition-all duration-700 ease-out transform ${
              currentSlide === 0
                ? 'opacity-100 scale-100 translate-x-0 z-20'
                : currentSlide > 0
                ? 'opacity-0 scale-95 translate-x-full z-10 pointer-events-none'
                : 'opacity-0 scale-95 -translate-x-full z-10 pointer-events-none'
            }`}
          >
            {/* Luminous Sky-Blue Gradient Background matching reference */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#18A2E8] via-[#1095DE] to-[#0A7EC2]">
              {/* Radial glow effects */}
              <div className="absolute -top-24 -left-24 w-96 h-96 bg-sky-200/30 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-sky-300/20 rounded-full blur-3xl pointer-events-none" />
            </div>

            {/* Hand-Held Smartphone Graphic Container in Center */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none pt-4 pb-20 sm:pb-24">
              {/* Subtle Hand Silhouette Backdrop giving the exact realistic hand-holding perspective */}
              <div className="relative w-[300px] sm:w-[350px] md:w-[380px] max-h-full flex items-center justify-center pointer-events-auto">
                {/* Phone Outer Chassis with rounded corners & thin premium bezel */}
                <div className="w-[270px] sm:w-[305px] md:w-[325px] h-[400px] sm:h-[450px] md:h-[480px] bg-[#0E1015] rounded-[42px] p-[10px] shadow-2xl border-[3px] border-slate-700/60 ring-1 ring-white/20 relative overflow-hidden flex flex-col justify-between">
                  {/* Speaker & Dynamic Island Top Cutout */}
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 w-20 h-4 bg-black rounded-full z-30 flex items-center justify-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-700 ml-auto mr-1.5" />
                  </div>

                  {/* Phone Screen Display */}
                  <div className="w-full h-full bg-[#EFF3F6] rounded-[34px] overflow-hidden flex flex-col justify-between text-slate-800 shadow-inner relative pt-6">
                    {/* 1. In-App Orange Header Banner */}
                    <div className="bg-gradient-to-r from-[#FF7A00] to-[#FF5500] text-white p-3.5 pt-4 rounded-b-2xl shadow-xs">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-black tracking-tight leading-tight">
                            Order is on the way
                          </h4>
                          <p className="text-[10px] text-orange-100 font-medium">
                            Estimated delivery Jul 30
                          </p>
                        </div>
                      </div>

                      {/* 3-Step Stepper Line matching screenshot */}
                      <div className="mt-3 pt-2 border-t border-orange-400/40">
                        <div className="relative flex items-center justify-between px-3">
                          {/* Connecting Bar */}
                          <div className="absolute top-3.5 left-7 right-7 h-[2px] bg-orange-300/50 -z-0" />
                          <div className="absolute top-3.5 left-7 w-1/2 h-[2px] bg-white -z-0" />

                          {/* Step 1: Order */}
                          <div className="flex flex-col items-center gap-1 z-10">
                            <div className="w-7 h-7 rounded-full bg-white text-[#FF6000] flex items-center justify-center shadow-xs">
                              <Check className="w-4 h-4 stroke-[3]" />
                            </div>
                            <span className="text-[9px] font-bold text-white">Order</span>
                          </div>

                          {/* Step 2: On the way (Active) */}
                          <div className="flex flex-col items-center gap-1 z-10">
                            <div className="w-7 h-7 rounded-full bg-[#FF7A00] border-2 border-white text-white flex items-center justify-center shadow-xs">
                              <Truck className="w-3.5 h-3.5 stroke-[2.5]" />
                            </div>
                            <span className="text-[9px] font-black text-white">On the way</span>
                          </div>

                          {/* Step 3: Delivery */}
                          <div className="flex flex-col items-center gap-1 z-10">
                            <div className="w-7 h-7 rounded-full bg-orange-300/60 text-orange-100 flex items-center justify-center">
                              <Package className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-[9px] font-medium text-orange-100">Delivery</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 2. Middle Cards List inside phone screen */}
                    <div className="px-3 py-2 space-y-2 flex-1 overflow-hidden">
                      {/* Card A: Order Confirmed */}
                      <div className="bg-white rounded-xl p-2.5 shadow-2xs border border-slate-200/70 flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                        <span className="text-[11px] font-black text-slate-800">
                          Order Confirmed
                        </span>
                      </div>

                      {/* Card B: On the way with Copy button & Tracking Number */}
                      <div className="bg-white rounded-xl p-2.5 shadow-2xs border border-slate-200/70 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-[#FF6000] text-white flex items-center justify-center shrink-0">
                              <Truck className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-[11px] font-black text-slate-800">
                              On the way
                            </span>
                          </div>
                          <button
                            onClick={copyTrackingRef}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[9px] font-bold py-0.5 px-2 rounded-md flex items-center gap-1 transition-colors cursor-pointer"
                            title="Copy Tracking Number"
                          >
                            <Copy className="w-2.5 h-2.5" />
                            <span>Copy</span>
                          </button>
                        </div>
                        <div className="flex items-center justify-between text-[10px] pt-0.5 border-t border-slate-100">
                          <span className="text-slate-500 font-medium">Tracking No.</span>
                          <span className="font-mono font-bold text-slate-900 tracking-wider">
                            MT123456789
                          </span>
                        </div>
                      </div>

                      {/* Card C: Payment with MoMo Badge */}
                      <div className="bg-white rounded-xl p-2.5 shadow-2xs border border-slate-200/70 flex items-center justify-between">
                        <div>
                          <div className="text-[11px] font-black text-slate-800">
                            Payment
                          </div>
                          <span className="text-[9px] text-[#FF6000] font-bold hover:underline cursor-pointer">
                            Change payment method
                          </span>
                        </div>
                        <span className="bg-[#FFCC00] text-slate-900 text-[10px] font-extrabold px-2 py-0.5 rounded-md shadow-2xs">
                          MoMo
                        </span>
                      </div>
                    </div>

                    {/* 3. In-App Bottom Navigation Bar */}
                    <div className="bg-white border-t border-slate-200/80 px-4 py-2 flex items-center justify-between text-slate-400">
                      <div className="flex flex-col items-center gap-0.5 text-[#FF6000]">
                        <Home className="w-3.5 h-3.5" />
                        <span className="text-[8px] font-bold">Home</span>
                      </div>
                      <div className="flex flex-col items-center gap-0.5">
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span className="text-[8px] font-medium">Cart</span>
                      </div>
                      <div className="flex flex-col items-center gap-0.5">
                        <CreditCard className="w-3.5 h-3.5" />
                        <span className="text-[8px] font-medium">Wallet</span>
                      </div>
                      <div className="flex flex-col items-center gap-0.5">
                        <User className="w-3.5 h-3.5" />
                        <span className="text-[8px] font-medium">Profile</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Foreground Headline, Subtitle & Orange CTA Button matching screenshot */}
            <div className="absolute bottom-6 sm:bottom-8 left-6 sm:left-12 right-6 sm:right-12 z-30 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
              <div className="max-w-xl text-white space-y-1 sm:space-y-1.5 drop-shadow-md">
                <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black tracking-tight leading-none text-white">
                  {currentLang === 'en'
                    ? 'Start shopping, pay with ease'
                    : 'Tangira kugura, wishyure nyuma'}
                </h2>
                <p className="text-xs sm:text-sm text-sky-100 font-medium">
                  {currentLang === 'en'
                    ? 'Love it, we deliver it quickly to your doorstep.'
                    : 'Urabikunda, turabizana, wishyure nyuma.'}
                </p>
              </div>

              {/* Orange Pill CTA Button ("Gura ubu") */}
              <button
                onClick={onNavigateShop}
                className="py-2.5 sm:py-3 px-6 sm:px-8 rounded-full bg-[#FF6000] hover:bg-[#E54D00] text-white font-black text-xs sm:text-sm shadow-xl transition-transform transform active:scale-95 cursor-pointer shrink-0 border border-orange-400/30"
              >
                {currentLang === 'en' ? 'Shop Now' : 'Gura ubu'}
              </button>
            </div>
          </div>

          {/* SLIDE 1: BESTSELLERS IN KIGALI (Gifts, Lifestyle & Home) */}
          <div
            className={`absolute inset-0 w-full h-full transition-all duration-700 ease-out transform ${
              currentSlide === 1
                ? 'opacity-100 scale-100 translate-x-0 z-20'
                : currentSlide > 1
                ? 'opacity-0 scale-95 translate-x-full z-10 pointer-events-none'
                : 'opacity-0 scale-95 -translate-x-full z-10 pointer-events-none'
            }`}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-amber-600 via-orange-600 to-slate-950" />
            <div className="absolute inset-0 opacity-40 mix-blend-overlay">
              <img
                src="/src/assets/images/hero_marketplace_shopper_1791966365592.jpg"
                alt="ContactReach Market Shopper"
                className="w-full h-full object-cover object-right"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-slate-950 via-slate-950/70 to-transparent" />

            <div className="relative z-20 h-full p-8 sm:p-12 lg:p-16 flex flex-col justify-between max-w-2xl text-white">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-1.5 bg-amber-400 text-slate-950 text-[11px] font-extrabold px-3 py-1 rounded-full shadow-xs">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{currentLang === 'en' ? 'Bestsellers in Kigali' : 'Ibicuruzwa bikunzwe i Kigali'}</span>
                </div>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black leading-tight tracking-tight">
                  {currentLang === 'en' ? 'Gifts, Lifestyle & Gadgets' : "Impano n'ibindi byiza"}
                </h2>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed max-w-md">
                  {currentLang === 'en'
                    ? 'Explore premium collections of watches, bags, cosmetics, and accessories delivered directly to your doorstep.'
                    : "Gura impano, ibikoresho byo mu rugo, ibikoresho by'abana, amasaha, n'ibikapu byizewe ku biciro byiza."}
                </p>
              </div>

              <div className="flex items-center gap-3 pt-6">
                <button
                  onClick={onNavigateShop}
                  className="py-3 px-8 rounded-full bg-[#FF6000] hover:bg-orange-600 text-white font-black text-xs sm:text-sm shadow-xl transition-all cursor-pointer transform active:scale-95"
                >
                  {currentLang === 'en' ? 'Shop Catalog' : 'Gura ubu'}
                </button>
                <button
                  onClick={onNavigateHowToBuy}
                  className="py-3 px-6 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-xs backdrop-blur-xs transition-colors cursor-pointer border border-white/20"
                >
                  {currentLang === 'en' ? 'How to Buy' : 'Uko Bagura'}
                </button>
              </div>
            </div>
          </div>

          {/* SLIDE 2: MOBILE MONEY PAYMENT (MTN & AIRTEL INTEGRATION) */}
          <div
            className={`absolute inset-0 w-full h-full transition-all duration-700 ease-out transform ${
              currentSlide === 2
                ? 'opacity-100 scale-100 translate-x-0 z-20'
                : currentSlide > 2
                ? 'opacity-0 scale-95 translate-x-full z-10 pointer-events-none'
                : 'opacity-0 scale-95 -translate-x-full z-10 pointer-events-none'
            }`}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-900 via-indigo-900 to-amber-900" />
            <div className="absolute inset-0 bg-radial from-amber-400/20 via-transparent to-transparent pointer-events-none" />

            <div className="relative z-20 h-full p-8 sm:p-12 lg:p-16 flex flex-col justify-between max-w-2xl text-white">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-1.5 bg-[#FFCC00] text-slate-900 text-[11px] font-black px-3 py-1 rounded-full shadow-xs">
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>MTN MoMo & Airtel Money</span>
                </div>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black leading-tight tracking-tight">
                  {currentLang === 'en'
                    ? 'Pay Easily with Mobile Money'
                    : 'Ishyura Byoroshye kuri MoMo'}
                </h2>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed max-w-md">
                  {currentLang === 'en'
                    ? 'Convenient automated USSD codes for MTN and Airtel. Receiver: Ruth (078002260). Submit payment proof for swift approval.'
                    : 'Koresha kode ya USSD ya MTN cyangwa Airtel Money. Nyirubwishyu: Ruth (078002260). Emeza ubwishyu bwawe uhite wakirwa.'}
                </p>
              </div>

              <div className="flex items-center gap-3 pt-6">
                <button
                  onClick={onNavigateShop}
                  className="py-3 px-8 rounded-full bg-[#FF6000] hover:bg-orange-600 text-white font-black text-xs sm:text-sm shadow-xl transition-all cursor-pointer transform active:scale-95"
                >
                  {currentLang === 'en' ? 'Start Shopping' : 'Gura ubu'}
                </button>
              </div>
            </div>
          </div>

          {/* SLIDE 3: SAME-DAY DELIVERY IN KIGALI */}
          <div
            className={`absolute inset-0 w-full h-full transition-all duration-700 ease-out transform ${
              currentSlide === 3
                ? 'opacity-100 scale-100 translate-x-0 z-20'
                : currentSlide > 3
                ? 'opacity-0 scale-95 translate-x-full z-10 pointer-events-none'
                : 'opacity-0 scale-95 -translate-x-full z-10 pointer-events-none'
            }`}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-950" />
            <div className="relative z-20 h-full p-8 sm:p-12 lg:p-16 flex flex-col justify-between max-w-2xl text-white">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-1.5 bg-emerald-400 text-slate-950 text-[11px] font-black px-3 py-1 rounded-full shadow-xs">
                  <Truck className="w-3.5 h-3.5" />
                  <span>{currentLang === 'en' ? 'Fast Delivery Kigali' : 'Kugezwaho vuba i Kigali'}</span>
                </div>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black leading-tight tracking-tight">
                  {currentLang === 'en'
                    ? 'Speedy Delivery to Your Hands'
                    : 'Kugerwaho n’Ibicuruzwa Byihuse'}
                </h2>
                <p className="text-xs sm:text-sm text-emerald-100 leading-relaxed max-w-md">
                  {currentLang === 'en'
                    ? 'Orders confirmed by our dispatch team arrive safely and quickly anywhere in Kigali and surrounding sectors.'
                    : 'Ubwishyu bwawe bumaze kwemezwa, ibicuruzwa bikugeraho mu masaha make nta gutinda.'}
                </p>
              </div>

              <div className="flex items-center gap-3 pt-6">
                <button
                  onClick={onNavigateShop}
                  className="py-3 px-8 rounded-full bg-[#FF6000] hover:bg-orange-600 text-white font-black text-xs sm:text-sm shadow-xl transition-all cursor-pointer transform active:scale-95"
                >
                  {currentLang === 'en' ? 'Browse Products' : 'Gura ubu'}
                </button>
              </div>
            </div>
          </div>

          {/* SLIDE 4: 100% QUALITY & VERIFIED MERCHANTS */}
          <div
            className={`absolute inset-0 w-full h-full transition-all duration-700 ease-out transform ${
              currentSlide === 4
                ? 'opacity-100 scale-100 translate-x-0 z-20'
                : 'opacity-0 scale-95 translate-x-full z-10 pointer-events-none'
            }`}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-900 via-slate-900 to-slate-950" />
            <div className="relative z-20 h-full p-8 sm:p-12 lg:p-16 flex flex-col justify-between max-w-2xl text-white">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-1.5 bg-purple-400 text-slate-950 text-[11px] font-black px-3 py-1 rounded-full shadow-xs">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{currentLang === 'en' ? '100% Authentic Quality' : 'Ibicuruzwa by’umwimerere'}</span>
                </div>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black leading-tight tracking-tight">
                  {currentLang === 'en'
                    ? 'Shop with Complete Confidence'
                    : 'Ibicuruzwa byizewe 100%'}
                </h2>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed max-w-md">
                  {currentLang === 'en'
                    ? 'Every item on ContactReach Market is inspected and verified by ContactReach Media Ltd for quality assurance.'
                    : 'Buri gicuruzwa cyose kiri kuri ContactReach Market kigenzurwa ku rwego rwo hejuru kugira ngo kiguhe umunezero.'}
                </p>
              </div>

              <div className="flex items-center gap-3 pt-6">
                <button
                  onClick={onNavigateShop}
                  className="py-3 px-8 rounded-full bg-[#FF6000] hover:bg-orange-600 text-white font-black text-xs sm:text-sm shadow-xl transition-all cursor-pointer transform active:scale-95"
                >
                  {currentLang === 'en' ? 'Shop Now' : 'Gura ubu'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Carousel Navigation Arrow: Left (<) matching screenshot */}
        <button
          onClick={prevSlide}
          className="absolute left-2 sm:left-4 z-40 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white/20 hover:bg-white/40 active:scale-90 backdrop-blur-md border border-white/40 text-white flex items-center justify-center transition-all cursor-pointer shadow-md"
          aria-label="Previous Slide"
        >
          <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        {/* Carousel Navigation Arrow: Right (>) matching screenshot */}
        <button
          onClick={nextSlide}
          className="absolute right-2 sm:right-4 z-40 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white/20 hover:bg-white/40 active:scale-90 backdrop-blur-md border border-white/40 text-white flex items-center justify-center transition-all cursor-pointer shadow-md"
          aria-label="Next Slide"
        >
          <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        {/* Carousel Dot Indicators at the bottom center: 5 dots matching screenshot */}
        <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2">
          {Array.from({ length: totalSlides }).map((_, idx) => (
            <button
              key={idx}
              onClick={() => goToSlide(idx)}
              className={`transition-all duration-300 rounded-full cursor-pointer ${
                currentSlide === idx
                  ? 'w-6 sm:w-8 h-2 sm:h-2.5 bg-white shadow-xs'
                  : 'w-2 sm:w-2.5 h-2 sm:h-2.5 bg-white/50 hover:bg-white/80'
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
