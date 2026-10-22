import React from 'react';
import { Product, AppSettings } from '../types.ts';
import { Language } from '../translations.ts';

interface NotFoundPageProps {
  currentLang: Language;
  products?: Product[];
  onNavigate: (view: string) => void;
  onSelectProduct?: (product: Product) => void;
  onOpenAdminLogin?: () => void;
  onOpenTracking?: () => void;
  onSearch?: (query: string) => void;
  settings?: AppSettings;
}

export function NotFoundPage({
  currentLang,
  products = [],
  onNavigate,
  onSelectProduct,
  onOpenAdminLogin,
  onOpenTracking,
  onSearch,
  settings
}: NotFoundPageProps) {
  const isRw = currentLang === 'rw';
  const currentYear = new Date().getFullYear();

  // Curate 3 trending products if available for extra engagement
  const featuredPreview = products.filter(p => p.status !== 'Hidden').slice(0, 3);

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#f5f8fc] text-[#172b4d] relative overflow-x-hidden selection:bg-orange-500 selection:text-white">
      {/* Dynamic Background Gradients */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse at 15% 30%, rgba(17, 153, 220, 0.09), transparent 36%),
            radial-gradient(ellipse at 85% 70%, rgba(255, 101, 0, 0.09), transparent 35%)
          `
        }}
      />

      {/* Brand Topbar */}
      <div className="min-h-[42px] px-[5%] py-2.5 flex justify-between items-center gap-3 flex-wrap bg-[#ff6500] text-white text-xs font-bold shadow-sm relative z-10">
        <span className="flex items-center gap-1.5">
          <span>☎</span> ONLINE: +250 780 022 600
        </span>
        <span className="flex items-center gap-1.5">
          <span>🛍</span> {isRw ? 'Isoko ryawe, ryoroheje kandi ryizewe' : 'Your Marketplace, Made Easy'}
        </span>
      </div>

      {/* Brand Header */}
      <header className="min-h-[86px] px-[5%] py-4 flex items-center justify-between gap-5 bg-white/95 border-b border-[#e2eaf3] shadow-[0_3px_15px_rgba(16,35,68,0.04)] backdrop-blur-sm relative z-10">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            onNavigate('home');
          }}
          className="flex items-center gap-3 no-underline text-[#102344] min-w-0 group"
          aria-label="ContactReach Market home"
        >
          <div className="w-12 h-12 shrink-0 grid place-items-center rounded-full border-2 border-[#dce8f5] bg-white text-2xl shadow-[0_4px_12px_rgba(16,35,68,0.08)] group-hover:scale-105 transition-transform duration-200">
            🛍️
          </div>
          <div>
            <div className="text-[clamp(17px,2vw,25px)] font-extrabold tracking-tight leading-tight whitespace-nowrap">
              ContactReach <span className="text-[#ff6500]">Market</span>
            </div>
            <div className="mt-1 text-[10px] font-bold tracking-wider text-[#65758b]">
              BY CONTACTREACH MEDIA
            </div>
          </div>
        </a>

        <div className="text-[#102344] bg-[#f1f7fc] border border-[#e0eaf4] px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap hidden sm:flex items-center gap-1.5 shadow-sm">
          <span>🧡</span> {isRw ? 'Haha wishimye' : 'Shop with confidence'}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-[min(1100px,92%)] mx-auto my-10 flex-1 relative z-10">
        {/* 404 Hero Banner */}
        <section
          className="relative isolate overflow-hidden min-h-[365px] grid grid-cols-1 md:grid-cols-[1.15fr_0.85fr] items-center gap-5 px-6 sm:px-12 md:px-16 py-10 text-white rounded-[26px] shadow-[0_16px_38px_rgba(8,123,184,0.18)]"
          style={{
            background: 'linear-gradient(120deg, #109fe5 0%, #1188cb 55%, #087bb8 100%)'
          }}
        >
          {/* Decorative geometric background rings */}
          <div className="absolute -right-16 -top-36 w-[300px] h-[300px] rounded-full border-[45px] border-white/10 pointer-events-none -z-10" />
          <div className="absolute left-[40%] -bottom-32 w-[180px] h-[180px] rounded-full bg-white/10 pointer-events-none -z-10" />

          {/* Left Text Column */}
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/20 border border-white/25 text-xs font-bold tracking-wide shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#8ff7c0] shadow-[0_0_10px_rgba(143,247,192,0.7)] animate-pulse" />
              <span>{isRw ? 'REKA DUKUGARURE KU ISOKO' : "LET'S GET YOU BACK"}</span>
            </div>

            <h1 className="text-[clamp(76px,12vw,128px)] leading-[0.95] font-extrabold tracking-[-8px] drop-shadow-[0_7px_20px_rgba(0,42,85,0.15)]">
              404
            </h1>

            <h2 className="text-[clamp(23px,3vw,34px)] font-bold leading-snug tracking-tight max-w-[460px]">
              {isRw ? 'Ooops! Iyi paji ntabwo yabonetse.' : "Oops! This page couldn't be found."}
            </h2>

            <p className="text-white/95 text-sm sm:text-base leading-relaxed max-w-[450px]">
              {isRw
                ? 'Paji washakaga ishobora kuba yimuwe cyangwa ntiyaba ikibonetse. Reba ibicuruzwa biri ku isoko rya ContactReach Market.'
                : "The page you're looking for may have moved or may no longer be available. Explore our marketplace and discover products you'll love."}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-3">
              <button
                onClick={() => onNavigate('home')}
                className="min-h-[48px] px-5 py-3 rounded-xl bg-[#ff6500] hover:bg-[#e95700] text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_7px_18px_rgba(112,47,0,0.22)] hover:-translate-y-0.5 hover:shadow-[0_10px_22px_rgba(112,47,0,0.28)] transition-all cursor-pointer"
              >
                <span>⌂</span>
                <span>{isRw ? 'Urupapuro rw\'Ibanze' : 'Back to Home'}</span>
              </button>

              <button
                onClick={() => onNavigate('shop')}
                className="min-h-[48px] px-5 py-3 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/45 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 hover:-translate-y-0.5 transition-all cursor-pointer"
              >
                <span>🛍</span>
                <span>{isRw ? 'Shakisha Ibicuruzwa' : 'Browse Products'}</span>
              </button>
            </div>
          </div>

          {/* Right Animated Art Column ("Floating shopping bag & product animations") */}
          <div className="relative min-h-[260px] grid place-items-center mt-6 md:mt-0" aria-hidden="true">
            {/* Dashed Orbit Ring */}
            <div
              className="absolute w-[245px] h-[245px] rounded-full border border-dashed border-white/40 pointer-events-none"
              style={{ animation: 'spin 22s linear infinite' }}
            />

            {/* Orbiting Product Emojis */}
            <div
              className="absolute top-2 left-1 z-20 w-[62px] h-[62px] rounded-[19px] bg-white grid place-items-center text-3xl shadow-[0_12px_26px_rgba(0,42,85,0.18)]"
              style={{ animation: 'float 4.5s ease-in-out infinite', animationDelay: '-0.6s' }}
            >
              🎁
            </div>

            <div
              className="absolute right-0 top-10 z-20 w-[62px] h-[62px] rounded-[19px] bg-white grid place-items-center text-3xl shadow-[0_12px_26px_rgba(0,42,85,0.18)]"
              style={{ animation: 'floatReverse 4.8s ease-in-out infinite', animationDelay: '-1.5s' }}
            >
              ⌚
            </div>

            <div
              className="absolute bottom-2 left-7 z-20 w-[62px] h-[62px] rounded-[19px] bg-white grid place-items-center text-3xl shadow-[0_12px_26px_rgba(0,42,85,0.18)]"
              style={{ animation: 'float 4.2s ease-in-out infinite', animationDelay: '-2s' }}
            >
              👟
            </div>

            <div
              className="absolute bottom-0 right-6 z-20 w-[54px] h-[54px] rounded-[17px] bg-white grid place-items-center text-2xl shadow-[0_12px_26px_rgba(0,42,85,0.18)]"
              style={{ animation: 'floatReverse 4.6s ease-in-out infinite' }}
            >
              🎧
            </div>

            {/* Central Floating Shopping Bag */}
            <div
              className="relative z-10 w-[145px] h-[155px] grid place-items-center rounded-t-[25px] rounded-b-[32px] shadow-[0_24px_40px_rgba(0,45,86,0.25)]"
              style={{
                background: 'linear-gradient(145deg, #ff984d, #ff6500)',
                animation: 'float 4s ease-in-out infinite'
              }}
            >
              {/* White Handle */}
              <div
                className="absolute -top-7 w-[60px] h-[44px] border-[10px] border-white border-b-0 rounded-t-[28px]"
              />
              <span className="text-[69px] select-none filter drop-shadow-[0_5px_5px_rgba(0,0,0,0.15)]">
                🛍️
              </span>
            </div>
          </div>
        </section>

        {/* Quick Navigation Cards */}
        <h2 className="text-xl font-extrabold tracking-tight text-[#102344] mt-9 mb-4">
          {isRw ? 'Wahitamo kujya he?' : 'Where would you like to go?'}
        </h2>

        <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {/* Card 1: Home */}
          <div
            onClick={() => onNavigate('home')}
            className="min-h-[125px] flex items-start gap-3.5 p-5 bg-white border border-[#e1e9f2] rounded-[18px] shadow-[0_5px_18px_rgba(16,35,68,0.035)] hover:-translate-y-1 hover:border-[#a8d9f3] hover:shadow-[0_12px_25px_rgba(16,35,68,0.08)] transition-all cursor-pointer group"
          >
            <div className="w-11 h-11 shrink-0 grid place-items-center bg-[#edf8ff] rounded-[13px] text-2xl group-hover:scale-110 transition-transform">
              🏠
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[#172b4d] mb-1.5 group-hover:text-[#ff6500] transition-colors">
                {isRw ? 'Ahabanza (Home)' : 'Home'}
              </h3>
              <p className="text-xs leading-relaxed text-[#65758b]">
                {isRw
                  ? 'Gusubira ku rupapuro rw\'ibanze rwa ContactReach Market.'
                  : 'Return to the ContactReach Market homepage.'}
              </p>
            </div>
          </div>

          {/* Card 2: Shop Products */}
          <div
            onClick={() => onNavigate('shop')}
            className="min-h-[125px] flex items-start gap-3.5 p-5 bg-white border border-[#e1e9f2] rounded-[18px] shadow-[0_5px_18px_rgba(16,35,68,0.035)] hover:-translate-y-1 hover:border-[#a8d9f3] hover:shadow-[0_12px_25px_rgba(16,35,68,0.08)] transition-all cursor-pointer group"
          >
            <div className="w-11 h-11 shrink-0 grid place-items-center bg-[#fff2e8] rounded-[13px] text-2xl group-hover:scale-110 transition-transform">
              🛒
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[#172b4d] mb-1.5 group-hover:text-[#ff6500] transition-colors">
                {isRw ? 'Ibicuruzwa Byose' : 'Shop Products'}
              </h3>
              <p className="text-xs leading-relaxed text-[#65758b]">
                {isRw
                  ? 'Shakisha ibicuruzwa n\'ibyiciro byose biboneka.'
                  : 'Explore available products and shopping categories.'}
              </p>
            </div>
          </div>

          {/* Card 3: Contact & Support */}
          <div
            onClick={() => onNavigate('contact')}
            className="min-h-[125px] flex items-start gap-3.5 p-5 bg-white border border-[#e1e9f2] rounded-[18px] shadow-[0_5px_18px_rgba(16,35,68,0.035)] hover:-translate-y-1 hover:border-[#a8d9f3] hover:shadow-[0_12px_25px_rgba(16,35,68,0.08)] transition-all cursor-pointer group"
          >
            <div className="w-11 h-11 shrink-0 grid place-items-center bg-[#eef8f3] rounded-[13px] text-2xl group-hover:scale-110 transition-transform">
              💬
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[#172b4d] mb-1.5 group-hover:text-[#ff6500] transition-colors">
                {isRw ? 'Ubufasha & Twandikire' : 'Contact & Support'}
              </h3>
              <p className="text-xs leading-relaxed text-[#65758b]">
                {isRw
                  ? 'Vugana natwe cyangwa ubone ubufasha bwo guhaha.'
                  : 'Return to the marketplace to find assistance.'}
              </p>
            </div>
          </div>
        </section>

        {/* Live Recommended Items Showcase (if catalog is loaded) */}
        {featuredPreview.length > 0 && (
          <div className="mt-10 pt-6 border-t border-[#e2eaf3]">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-extrabold text-[#102344]">
                {isRw ? 'Ibicuruzwa biboneka ako kanya' : 'Discover Genuine In-Stock Items'}
              </h4>
              <button
                onClick={() => onNavigate('shop')}
                className="text-xs font-bold text-[#ff6500] hover:underline"
              >
                {isRw ? 'Reba byose →' : 'Explore All →'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {featuredPreview.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onSelectProduct && onSelectProduct(item)}
                  className="bg-white p-3 rounded-2xl border border-[#e1e9f2] flex items-center gap-3.5 shadow-sm hover:shadow-md hover:border-[#ff6500]/40 transition-all cursor-pointer group"
                >
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/logo.png';
                      }}
                    />
                  </div>
                  <div className="min-w-0">
                    <h5 className="text-xs font-bold text-[#172b4d] truncate group-hover:text-[#ff6500] transition-colors">
                      {item.name}
                    </h5>
                    <p className="text-xs font-extrabold text-[#ff6500] mt-0.5">
                      {item.price.toLocaleString()} FRW
                    </p>
                    <span className="text-[10px] text-[#65758b] font-medium">
                      {item.category}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Brand Footer */}
      <footer className="px-[5%] py-6 flex justify-center items-center gap-2 flex-wrap text-center bg-white border-t border-[#e2eaf3] text-[#65758b] text-xs leading-relaxed relative z-10">
        <strong className="text-[#102344]">
          ContactReach <span className="text-[#ff6500]">Market</span>
        </strong>
        <span>·</span>
        <span>© {currentYear} ContactReach Media. All rights reserved.</span>
      </footer>

      {/* Embedded Animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(-3deg); }
          50% { transform: translateY(-13px) rotate(3deg); }
        }
        @keyframes floatReverse {
          0%, 100% { transform: translateY(0) rotate(3deg); }
          50% { transform: translateY(12px) rotate(-5deg); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
