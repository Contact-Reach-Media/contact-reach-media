import React, { useState, useEffect, useRef } from 'react';
import {
  ShoppingBag, Search, Phone, ShieldCheck, Heart, Menu, X,
  Globe, Camera, Smartphone, MoreVertical, Instagram, Facebook, Youtube,
  ExternalLink, Tag, User, ChevronDown, Check, Coins
} from 'lucide-react';
import { Language, translations, SUPPORTED_LANGUAGES, LanguageOption } from '../translations.ts';
import { CurrencyCode, SUPPORTED_CURRENCIES, CurrencyOption } from '../utils/currency.ts';
import { Product, CustomerUser } from '../types.ts';

interface HeaderProps {
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
  currentCurrency?: CurrencyCode;
  onCurrencyChange?: (curr: CurrencyCode) => void;
  activeView: string;
  onNavigate: (view: string) => void;
  cartCount: number;
  onOpenCart: () => void;
  onOpenSearch: () => void;
  onOpenMobileAppModal: () => void;
  wishlistCount: number;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSearchSubmit: () => void;
  products?: Product[];
  onSelectProduct?: (product: Product) => void;
  buyerUser?: CustomerUser | null;
  onOpenBuyerAuth?: () => void;
  onOpenBuyerAccount?: () => void;
  isAdminLoggedIn?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentLang,
  onLanguageChange,
  currentCurrency = 'RWF',
  onCurrencyChange,
  activeView,
  onNavigate,
  cartCount,
  onOpenCart,
  onOpenSearch,
  onOpenMobileAppModal,
  wishlistCount,
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  products = [],
  onSelectProduct,
  buyerUser,
  onOpenBuyerAuth,
  onOpenBuyerAccount,
  isAdminLoggedIn = false
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [currDropdownOpen, setCurrDropdownOpen] = useState(false);
  const [showLiveSuggestions, setShowLiveSuggestions] = useState(false);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const langDropdownRef = useRef<HTMLDivElement>(null);
  const currDropdownRef = useRef<HTMLDivElement>(null);

  const t = translations[currentLang] || translations.en;

  const currentLangObj = SUPPORTED_LANGUAGES.find(l => l.code === currentLang) || SUPPORTED_LANGUAGES[0];
  const currentCurrObj = SUPPORTED_CURRENCIES.find(c => c.code === currentCurrency) || SUPPORTED_CURRENCIES[0];

  const navLinks = [
    { id: 'home', label: t.home },
    { id: 'shop', label: t.shop },
    { id: 'shops', label: t.shops },
    { id: 'contact', label: t.contact },
    { id: 'how-to-buy', label: t.howToBuy }
  ];

  // Automatic Live Search Filter
  const liveMatches = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || q.length < 2) return [];
    return products
      .filter(p =>
        p.status !== 'Hidden' &&
        (p.name.toLowerCase().includes(q) ||
         p.category.toLowerCase().includes(q) ||
         (p.sku && p.sku.toLowerCase().includes(q)) ||
         (p.brand && p.brand.toLowerCase().includes(q)) ||
         (p.shopName && p.shopName.toLowerCase().includes(q)))
      )
      .slice(0, 5);
  }, [searchQuery, products]);

  // Handle outside click to close dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (searchContainerRef.current && !searchContainerRef.current.contains(target)) {
        setShowLiveSuggestions(false);
      }
      if (langDropdownRef.current && !langDropdownRef.current.contains(target)) {
        setLangDropdownOpen(false);
      }
      if (currDropdownRef.current && !currDropdownRef.current.contains(target)) {
        setCurrDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setShowLiveSuggestions(false);
      onSearchSubmit();
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full shadow-xs bg-white">
      {/* 1. TOP NOTICE / HELPLINE ORANGE BAR */}
      <div className="bg-[#FF6000] text-white text-xs py-1.5 px-4 sm:px-8 border-b border-orange-600/30">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-3 flex-wrap">
          {/* Left: Help Line & Administrator top entry */}
          <div className="flex items-center gap-2.5">
            <a
              href="tel:+250780022600"
              className="flex items-center gap-1.5 hover:underline font-bold tracking-tight whitespace-nowrap"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>{t.helpLine}</span>
            </a>

            {isAdminLoggedIn && (
              <button
                onClick={() => onNavigate('admin')}
                className="flex items-center gap-1.5 bg-slate-950 text-amber-300 hover:bg-black hover:text-amber-200 px-2.5 py-0.5 rounded font-black text-[11px] shadow-xs border border-amber-400/40 transition-transform active:scale-95 cursor-pointer"
                title="Administrator Active - Click to enter Admin Control Panel"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>{t.adminLogin}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </button>
            )}
          </div>

          {/* Center: Language & Currency Selectors */}
          <div className="flex items-center gap-2">
            {/* Language Selector Dropdown */}
            <div className="relative" ref={langDropdownRef}>
              <button
                type="button"
                onClick={() => {
                  setLangDropdownOpen(!langDropdownOpen);
                  setCurrDropdownOpen(false);
                }}
                className="flex items-center gap-1.5 bg-white text-slate-800 hover:bg-slate-100 px-2.5 py-1 rounded-md font-bold text-xs shadow-2xs transition-all active:scale-95 cursor-pointer border border-white/40"
                title={t.selectLanguage}
                aria-label={t.selectLanguage}
              >
                <span className="text-sm leading-none">{currentLangObj.flag}</span>
                <span className="max-w-[90px] truncate">{currentLangObj.nativeName}</span>
                <ChevronDown className="w-3 h-3 text-slate-500" />
              </button>

              {langDropdownOpen && (
                <div className="absolute top-full mt-1.5 z-50 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1 max-h-80 overflow-y-auto animate-in fade-in slide-in-from-top-1 text-slate-800 start-0">
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                    {t.selectLanguage} (10)
                  </div>
                  {SUPPORTED_LANGUAGES.map((langItem) => {
                    const isSelected = currentLang === langItem.code;
                    return (
                      <button
                        key={langItem.code}
                        type="button"
                        onClick={() => {
                          onLanguageChange(langItem.code);
                          setLangDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-start hover:bg-orange-50 hover:text-[#FF6000] transition-colors cursor-pointer ${
                          isSelected ? 'bg-orange-50 text-[#FF6000] font-bold' : 'text-slate-700'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className="text-base leading-none">{langItem.flag}</span>
                          <span className="font-medium">{langItem.nativeName}</span>
                          <span className="text-[10px] text-slate-400">({langItem.name})</span>
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#FF6000] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Currency Selector Dropdown */}
            <div className="relative" ref={currDropdownRef}>
              <button
                type="button"
                onClick={() => {
                  setCurrDropdownOpen(!currDropdownOpen);
                  setLangDropdownOpen(false);
                }}
                className="flex items-center gap-1.5 bg-black/20 hover:bg-black/30 text-white px-2.5 py-1 rounded-md font-bold text-xs shadow-2xs transition-all active:scale-95 cursor-pointer border border-white/20"
                title={t.selectCurrency}
                aria-label={t.selectCurrency}
              >
                <span className="text-sm leading-none">{currentCurrObj.flag}</span>
                <span className="font-mono">{currentCurrObj.code}</span>
                <span className="text-[10px] text-orange-200 font-mono">({currentCurrObj.symbol})</span>
                <ChevronDown className="w-3 h-3 text-orange-200" />
              </button>

              {currDropdownOpen && (
                <div className="absolute top-full mt-1.5 z-50 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-1 max-h-80 overflow-y-auto animate-in fade-in slide-in-from-top-1 text-slate-800 start-0">
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 flex items-center justify-between">
                    <span>{t.selectCurrency} (10)</span>
                    <span className="text-[9px] text-[#FF6000] font-bold">Base: RWF</span>
                  </div>
                  {SUPPORTED_CURRENCIES.map((currItem) => {
                    const isSelected = currentCurrency === currItem.code;
                    return (
                      <button
                        key={currItem.code}
                        type="button"
                        onClick={() => {
                          if (onCurrencyChange) onCurrencyChange(currItem.code);
                          setCurrDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-start hover:bg-orange-50 hover:text-[#FF6000] transition-colors cursor-pointer ${
                          isSelected ? 'bg-orange-50 text-[#FF6000] font-bold' : 'text-slate-700'
                        }`}
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <span className="text-base leading-none">{currItem.flag}</span>
                          <span className="font-mono font-bold">{currItem.code}</span>
                          <span className="text-slate-500 font-mono text-[11px]">({currItem.symbol})</span>
                          <span className="text-[10px] text-slate-400 truncate max-w-[90px]">{currItem.name}</span>
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#FF6000] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right: Mobile App + Social Media Links */}
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenMobileAppModal}
              className="hidden md:flex items-center gap-1 text-white hover:text-white/80 font-bold transition-colors cursor-pointer whitespace-nowrap text-xs"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>{t.getMobileApp}</span>
            </button>

            <div className="hidden lg:flex items-center gap-2 text-white/90">
              <a
                href="https://instagram.com/@contactreachmedia"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
                title="Instagram"
              >
                <Instagram className="w-3.5 h-3.5" />
              </a>
              <a
                href="https://facebook.com/@contactreachmedia"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
                title="Facebook"
              >
                <Facebook className="w-3.5 h-3.5" />
              </a>
              <a
                href="https://tiktok.com/@contactreachmedia"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors font-bold text-[11px]"
                title="TikTok"
              >
                ♪
              </a>
              <a
                href="https://youtube.com/@contactreachmedia"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
                title="YouTube"
              >
                <Youtube className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* 2. MAIN HEADER NAVIGATION BAR */}
      <div className="px-4 sm:px-8 py-3 bg-white border-b border-slate-200">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-4 lg:gap-8">
          {/* Logo / Brand Zone */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 text-slate-700 hover:text-slate-900 rounded-lg hover:bg-slate-100 cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            <button
              onClick={() => onNavigate('home')}
              className="flex items-center gap-2.5 group text-left cursor-pointer"
            >
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden border border-slate-200/90 shadow-2xs group-hover:scale-105 transition-transform shrink-0 bg-white flex items-center justify-center p-0.5">
                <img
                  src="/logo.png"
                  alt="ContactReach Market Logo"
                  className="w-full h-full object-contain rounded-full"
                />
              </div>
              <div className="flex flex-col">
                <span className="font-black text-lg sm:text-xl tracking-tight text-slate-900 leading-none">
                  ContactReach <span className="text-[#FF6000]">Market</span>
                </span>
                <span className="text-[9px] text-slate-600 font-bold uppercase tracking-wider mt-0.5">
                  by ContactReach Media
                </span>
              </div>
            </button>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-6 xl:gap-8 shrink-0">
            {navLinks.map((link) => {
              const isActive = activeView === link.id;
              return (
                <button
                  key={link.id}
                  onClick={() => onNavigate(link.id)}
                  className={`text-sm font-bold whitespace-nowrap transition-colors relative py-1 cursor-pointer ${
                    isActive
                      ? 'text-[#FF6000]'
                      : 'text-slate-700 hover:text-slate-900'
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF6000] rounded-full" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Search Input Bar with Automatic Live Search */}
          <div ref={searchContainerRef} className="flex-1 max-w-md relative hidden sm:block">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute start-3.5 pointer-events-none" />
              <input
                type="text"
                placeholder={t.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => {
                  onSearchChange(e.target.value);
                  setShowLiveSuggestions(true);
                }}
                onFocus={() => setShowLiveSuggestions(true)}
                onKeyDown={handleSearchKeyDown}
                className="w-full ps-9 pe-14 py-2 rounded-full border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF6000] focus:border-transparent bg-slate-50/60"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    onSearchChange('');
                    setShowLiveSuggestions(false);
                  }}
                  className="absolute end-8 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={onSearchSubmit}
                className="absolute end-2 p-1 rounded-full text-slate-400 hover:text-[#FF6000] hover:bg-slate-100 transition-colors cursor-pointer"
                title="Search"
              >
                <Search className="w-4 h-4 text-[#FF6000]" />
              </button>
            </div>

            {/* Live Search Instant Dropdown */}
            {showLiveSuggestions && searchQuery.trim().length >= 2 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-1">
                <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-500">
                  <span>Live Search Results ({liveMatches.length})</span>
                  <button
                    onClick={() => {
                      setShowLiveSuggestions(false);
                      onSearchSubmit();
                    }}
                    className="text-[#FF6000] hover:underline cursor-pointer"
                  >
                    View All in Catalog
                  </button>
                </div>
                {liveMatches.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {liveMatches.map(product => (
                      <div
                        key={product.id}
                        onClick={() => {
                          setShowLiveSuggestions(false);
                          if (onSelectProduct) onSelectProduct(product);
                        }}
                        className="p-2.5 flex items-center gap-3 hover:bg-orange-50/60 cursor-pointer transition-colors"
                      >
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-10 h-10 object-cover rounded-lg border border-slate-200 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {product.name}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono mt-0.5">
                            <span className="text-[#FF6000] font-bold font-mono">
                              {product.price.toLocaleString()} FRW
                            </span>
                            {product.shopName && (
                              <span>• {product.shopName}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-xs text-slate-500">
                    No items match &quot;{searchQuery}&quot;
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Action Icons & Profile Zone */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Wishlist Button with Badge */}
            <button
              onClick={() => {
                onNavigate('shop');
              }}
              className="relative p-2 text-slate-700 hover:text-[#FF6000] hover:bg-slate-50 rounded-xl transition-colors cursor-pointer hidden sm:flex"
              title={t.wishlist}
              aria-label="Wishlist"
            >
              <Heart className="w-5 h-5" />
              {wishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                  {wishlistCount}
                </span>
              )}
            </button>

            {/* Buyer Account Button or Sign In */}
            {buyerUser ? (
              <button
                onClick={onOpenBuyerAccount}
                className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 text-slate-800 hover:text-[#FF6000] hover:bg-slate-50 rounded-xl transition-colors cursor-pointer border border-slate-200 text-xs font-bold"
                title="Buyer Account"
              >
                <div className="w-6 h-6 rounded-full bg-orange-100 text-[#FF6000] flex items-center justify-center font-black text-xs">
                  {buyerUser.name.charAt(0).toUpperCase()}
                </div>
                <span className="hidden sm:inline max-w-[100px] truncate">
                  {buyerUser.name.split(' ')[0]}
                </span>
              </button>
            ) : (
              <button
                onClick={onOpenBuyerAuth}
                className="flex items-center gap-1.5 p-1.5 sm:px-3 sm:py-1.5 text-slate-700 hover:text-[#FF6000] hover:bg-slate-50 rounded-xl transition-colors cursor-pointer border border-slate-200 text-xs font-bold"
                title="Buyer Sign In / Register"
              >
                <User className="w-4 h-4 text-[#FF6000]" />
                <span className="hidden sm:inline">
                  {t.signIn}
                </span>
              </button>
            )}

            {/* Shopping Cart Button with Counter */}
            <button
              onClick={onOpenCart}
              className="relative p-2 text-slate-700 hover:text-[#FF6000] hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
              title={t.cart}
              aria-label="Cart"
            >
              <ShoppingBag className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#FF6000] text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                  {cartCount}
                </span>
              )}
            </button>

            {/* 3-Dots More Options Menu */}
            <div className="relative">
              <button
                onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                aria-label="More options"
              >
                <MoreVertical className="w-5 h-5" />
              </button>

              {moreMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in slide-in-from-top-1 text-xs font-semibold text-slate-700">
                  {isAdminLoggedIn && (
                    <button
                      onClick={() => {
                        onNavigate('admin');
                        setMoreMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 bg-slate-950 text-amber-300 hover:bg-slate-900 transition-colors font-black flex items-center gap-2 border-b border-slate-800 cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4 text-amber-400" />
                      <span>{t.adminLogin}</span>
                      <span className="ml-auto w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    </button>
                  )}
                  {buyerUser ? (
                    <button
                      onClick={() => {
                        if (onOpenBuyerAccount) onOpenBuyerAccount();
                        setMoreMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-orange-50 hover:text-[#FF6000] transition-colors font-bold flex items-center gap-2 border-b border-slate-100 cursor-pointer"
                    >
                      <User className="w-3.5 h-3.5 text-[#FF6000]" />
                      <span>{t.myAccount}</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        if (onOpenBuyerAuth) onOpenBuyerAuth();
                        setMoreMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-orange-50 hover:text-[#FF6000] transition-colors font-bold flex items-center gap-2 border-b border-slate-100 cursor-pointer"
                    >
                      <User className="w-3.5 h-3.5 text-[#FF6000]" />
                      <span>{t.signInRegister}</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      onNavigate('track-order');
                      setMoreMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-orange-50 hover:text-[#FF6000] transition-colors cursor-pointer"
                  >
                    {t.trackOrder}
                  </button>
                  <button
                    onClick={() => {
                      onNavigate('contact');
                      setMoreMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-orange-50 hover:text-[#FF6000] transition-colors cursor-pointer"
                  >
                    {t.contact}
                  </button>
                  <button
                    onClick={() => {
                      onOpenMobileAppModal();
                      setMoreMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-orange-50 hover:text-[#FF6000] transition-colors cursor-pointer"
                  >
                    {t.getMobileApp}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden pt-3 pb-2 border-t border-slate-100 mt-2 animate-in fade-in space-y-3">
            {isAdminLoggedIn && (
              <button
                onClick={() => {
                  onNavigate('admin');
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-black bg-slate-950 text-amber-300 hover:bg-slate-900 flex items-center gap-2 border border-amber-400/30 shadow-xs cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>{t.adminLogin}</span>
                <span className="ml-auto w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </button>
            )}

            {/* Mobile Language and Currency Selectors in Drawer */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-[#FF6000]" />
                  <span>{t.language}:</span>
                </span>
                <select
                  value={currentLang}
                  onChange={(e) => onLanguageChange(e.target.value as Language)}
                  className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800"
                >
                  {SUPPORTED_LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.flag} {l.nativeName} ({l.name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-[#FF6000]" />
                  <span>{t.currency}:</span>
                </span>
                <select
                  value={currentCurrency}
                  onChange={(e) => onCurrencyChange && onCurrencyChange(e.target.value as CurrencyCode)}
                  className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 font-mono"
                >
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.code} ({c.symbol})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {navLinks.map((link) => (
                <button
                  key={link.id}
                  onClick={() => {
                    onNavigate(link.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`text-start px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    activeView === link.id
                      ? 'bg-orange-50 text-[#FF6000]'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {link.label}
                </button>
              ))}
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder={t.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => {
                  onSearchChange(e.target.value);
                  setShowLiveSuggestions(true);
                }}
                onKeyDown={handleSearchKeyDown}
                className="w-full ps-8 pe-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-orange-500 bg-slate-50"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute start-2.5 top-2.5" />
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
