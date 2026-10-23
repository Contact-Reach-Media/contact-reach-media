import React, { useState, useEffect } from 'react';
import {
  ShoppingBag, Search, Sparkles, Truck, ShieldCheck, CreditCard,
  MessageCircle, Heart, Star, ChevronRight, ChevronLeft, ArrowRight,
  Filter, Smartphone, Zap, Tag, Check, ArrowUpRight, Apple, Play,
  Headphones, Users, Calendar, HelpCircle, X, Wrench, Power
} from 'lucide-react';

import { Product, Category, AppSettings, CartItem, Order, PaymentConfirmation, VendorShop, CustomerUser } from './types.ts';
import { initialProducts, initialCategories, initialSettings, initialShops } from './data/initialData.ts';
import { api, getAdminToken, getStoredAdminUser } from './services/api.ts';
import { Language, translations } from './translations.ts';

import { Header } from './components/Header.tsx';
import { ProductCard } from './components/ProductCard.tsx';
import { ProductModal } from './components/ProductModal.tsx';
import { CartDrawer } from './components/CartDrawer.tsx';
import { CheckoutModal } from './components/CheckoutModal.tsx';
import { PaymentConfirmationModal } from './components/PaymentConfirmationModal.tsx';
import { OrderTrackingModal } from './components/OrderTrackingModal.tsx';
import { HowToBuySection } from './components/HowToBuySection.tsx';
import { ShopsSection } from './components/ShopsSection.tsx';
import { ContactSection } from './components/ContactSection.tsx';
import { Footer } from './components/Footer.tsx';
import { AdminLoginModal } from './components/AdminLoginModal.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import { HeroCarousel } from './components/HeroCarousel.tsx';
import { BuyerAuthModal } from './components/BuyerAuthModal.tsx';
import { BuyerAccountModal } from './components/BuyerAccountModal.tsx';
import { MaintenancePage } from './components/MaintenancePage.tsx';
import { NotFoundPage } from './components/NotFoundPage.tsx';

// Client-side URL route parser for Vercel, Netlify & direct browser reloads
function parseRouteFromLocation() {
  if (typeof window === 'undefined') {
    return {
      view: 'home',
      category: 'all',
      search: '',
      orderRef: '',
      productId: '',
      lang: 'en' as Language,
    };
  }

  const rawPath = window.location.pathname.toLowerCase().replace(/\/+$/, '') || '/';
  const searchParams = new URLSearchParams(window.location.search);
  const catParam = searchParams.get('category');
  const searchParam = searchParams.get('search') || searchParams.get('q');
  const orderParam = searchParams.get('order') || searchParams.get('ref');
  const langParam = searchParams.get('lang');

  let view = 'home';
  let productId = '';

  if (rawPath === '/shop' || rawPath === '/products' || rawPath === '/catalog') {
    view = 'shop';
  } else if (rawPath === '/shops' || rawPath === '/stores' || rawPath === '/vendors') {
    view = 'shops';
  } else if (rawPath === '/how-to-buy' || rawPath === '/how' || rawPath === '/guide') {
    view = 'how-to-buy';
  } else if (rawPath === '/contact' || rawPath === '/support' || rawPath === '/about') {
    view = 'contact';
  } else if (rawPath === '/admin' || rawPath === '/dashboard') {
    view = 'admin';
  } else if (rawPath === '/orders' || rawPath === '/track' || rawPath === '/track-order') {
    view = 'track-order';
  } else if (rawPath === '/404' || rawPath === '/not-found') {
    view = '404';
  } else if (rawPath.startsWith('/product/')) {
    productId = window.location.pathname.replace(/^\/product\//i, '').trim();
    view = 'shop';
  } else if (rawPath !== '/' && rawPath !== '') {
    view = '404';
  }

  return {
    view,
    category: catParam || 'all',
    search: searchParam || '',
    orderRef: orderParam || '',
    productId,
    lang: (langParam === 'en' || langParam === 'rw' ? langParam : 'en') as Language,
  };
}

export default function App() {
  const initialRoute = React.useMemo(() => parseRouteFromLocation(), []);
  const [currentLang, setCurrentLang] = useState<Language>(initialRoute.lang);
  const [activeView, setActiveView] = useState<string>(initialRoute.view);

  // Core Data
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [shops, setShops] = useState<VendorShop[]>(initialShops);
  const [settings, setSettings] = useState<AppSettings>(initialSettings);

  // Cart & Wishlist
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);

  // Filtering & Catalog
  const [selectedCategory, setSelectedCategory] = useState<string>(initialRoute.category);
  const [searchQuery, setSearchQuery] = useState<string>(initialRoute.search);
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'newest'>('featured');

  // Modals
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [confirmationOrder, setConfirmationOrder] = useState<Order | null>(null);
  const [isTrackingOpen, setIsTrackingOpen] = useState(
    initialRoute.view === 'track-order' || Boolean(initialRoute.orderRef)
  );
  const [trackingOrderNumber, setTrackingOrderNumber] = useState(initialRoute.orderRef);
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const token = api.getAdminToken();
    const user = api.getStoredAdminUser();
    return Boolean(token && user && user.active !== false);
  });
  const [isAppDownloadOpen, setIsAppDownloadOpen] = useState(false);
  const [isRequestProductOpen, setIsRequestProductOpen] = useState(false);
  const [isSellerModalOpen, setIsSellerModalOpen] = useState(false);

  // Buyer Account & Authentication
  const [buyerUser, setBuyerUser] = useState<CustomerUser | null>(null);
  const [isBuyerAuthOpen, setIsBuyerAuthOpen] = useState(false);
  const [isBuyerAccountOpen, setIsBuyerAccountOpen] = useState(false);

  // Product quantity display limit for "Reba ibindi"
  const [visibleRecommendedCount, setVisibleRecommendedCount] = useState(10);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const t = translations[currentLang];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Synchronized navigation pushing URL path without reload
  const handleNavigate = (view: string, push = true) => {
    let targetPath = '/';
    if (view === 'shop') targetPath = '/shop';
    else if (view === 'shops') targetPath = '/shops';
    else if (view === 'how-to-buy') targetPath = '/how-to-buy';
    else if (view === 'contact') targetPath = '/contact';
    else if (view === 'track-order' || view === 'orders') targetPath = '/orders';
    else if (view === 'admin') targetPath = '/admin';
    else if (view === '404') targetPath = '/404';

    if (view === 'admin') {
      setActiveView('admin');
      const isAuth = isAdminLoggedIn || Boolean(api.getAdminToken() && api.getStoredAdminUser()?.active !== false);
      if (isAuth) {
        setIsAdminLoggedIn(true);
        if (push && window.location.pathname !== targetPath) {
          window.history.pushState({ view: 'admin' }, '', targetPath);
        }
      } else {
        setIsAdminLoginOpen(true);
        if (push && window.location.pathname !== targetPath) {
          window.history.pushState({ view: 'admin' }, '', targetPath);
        }
      }
      return;
    }

    if (view === 'track-order' || view === 'orders') {
      setIsTrackingOpen(true);
      if (push && window.location.pathname !== targetPath) {
        window.history.pushState({ view: 'orders' }, '', targetPath);
      }
      return;
    }

    if (push && window.location.pathname !== targetPath) {
      window.history.pushState({ view }, '', targetPath);
    }
    setActiveView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Initial Data Fetch
  const refreshAllData = async () => {
    try {
      const [fetchedProducts, fetchedCategories, fetchedSettings, fetchedShops, isAuth] = await Promise.all([
        api.getProducts(),
        api.getCategories(),
        api.getSettings(),
        api.getShops(),
        api.adminCheckAuth()
      ]);
      setProducts(fetchedProducts);
      setCategories(fetchedCategories);
      setSettings(fetchedSettings);
      setShops(fetchedShops);
      setIsAdminLoggedIn(isAuth);

      if (initialRoute.view === 'admin' && !isAuth && !api.getAdminToken()) {
        setIsAdminLoginOpen(true);
      }

      if (initialRoute.productId) {
        const found = fetchedProducts.find(p => p.id === initialRoute.productId);
        if (found) setSelectedProduct(found);
      }

      // Check for logged-in buyer user
      try {
        const currentBuyer = await api.buyerGetMe();
        if (currentBuyer) setBuyerUser(currentBuyer);
      } catch {}
    } catch (err) {
      console.warn('Backend sync in fallback mode:', err);
    }
  };

  useEffect(() => {
    refreshAllData();
  }, []);

  // Listen to browser Back/Forward (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const route = parseRouteFromLocation();
      if (route.view === 'admin') {
        setActiveView('admin');
        const isAuth = isAdminLoggedIn || Boolean(api.getAdminToken() && api.getStoredAdminUser()?.active !== false);
        if (!isAuth) {
          setIsAdminLoginOpen(true);
        }
      } else if (route.view === 'track-order') {
        setIsTrackingOpen(true);
        if (route.orderRef) setTrackingOrderNumber(route.orderRef);
      } else {
        setActiveView(route.view);
      }

      if (route.category) setSelectedCategory(route.category);
      if (route.search) setSearchQuery(route.search);
      if (route.productId) {
        const found = products.find(p => p.id === route.productId);
        if (found) setSelectedProduct(found);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isAdminLoggedIn, products]);

  // Cart Actions
  const handleAddToCart = (product: Product, quantity = 1, variation?: { [key: string]: string }) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity, selectedVariation: variation || item.selectedVariation }
            : item
        );
      }
      return [...prev, { product, quantity, selectedVariation: variation }];
    });
    showToast(`Added "${product.name.slice(0, 24)}..." to cart`);
  };

  const handleUpdateCartQuantity = (productId: string, delta: number) => {
    setCart(prev =>
      prev
        .map(item => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
    showToast('Item removed from cart');
  };

  const handleQuickBuy = (product: Product, quantity = 1, variation?: { [key: string]: string }) => {
    setCart([{ product, quantity, selectedVariation: variation }]);
    setSelectedProduct(null);
    setIsCheckoutOpen(true);
  };

  const handleToggleWishlist = (product: Product) => {
    setWishlist(prev => {
      const exists = prev.includes(product.id);
      if (exists) {
        showToast('Removed from wishlist');
        return prev.filter(id => id !== product.id);
      } else {
        showToast('Saved to wishlist');
        return [...prev, product.id];
      }
    });
  };

  // Filtered & Sorted Products
  const filteredProducts = products.filter(p => {
    const matchCategory = selectedCategory === 'all' || p.category === selectedCategory;
    const matchSearch =
      !searchQuery.trim() ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase().trim());
    return matchCategory && matchSearch;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'price-asc') return a.price - b.price;
    if (sortBy === 'price-desc') return b.price - a.price;
    if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0);
  });

  // Category Icons Map
  const categoryImages: Record<string, string> = {
    abana: 'https://images.unsplash.com/photo-1558877385-81a1c7e67d72?auto=format&fit=crop&w=300&q=80',
    amasaha: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=300&q=80',
    amatara: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=300&q=80',
    books: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=300&q=80',
    ibikapu: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=300&q=80',
    impano: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=300&q=80',
    'hair-beauty': '/src/assets/images/product_hair_curl_cream_1791966366308.jpg',
    fashion: '/src/assets/images/product_street_sneakers_1791966366958.jpg',
    electronics: '/src/assets/images/product_smart_tv_audio_1791966367526.jpg',
    sports: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=300&q=80'
  };

  // Categories list for home slider
  const [catScrollIndex, setCatScrollIndex] = useState(0);

  // Products subsets matching Screenshot 2, 3, 4
  const recentProducts = products.slice(0, 10);
  const recommendedProducts = products.slice(0, visibleRecommendedCount);

  // Maintenance mode detection for non-admin visitors
  const isVisitorUnderMaintenance = !isAdminLoggedIn && Boolean(settings.isMaintenanceMode) && activeView !== 'admin';

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA] text-slate-800 font-sans antialiased selection:bg-orange-500 selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs font-semibold py-2.5 px-5 rounded-full shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-200">
          {toastMessage}
        </div>
      )}

      {isVisitorUnderMaintenance ? (
        /* VISITOR & BUYER PROFESSIONAL MAINTENANCE SCREEN */
        <MaintenancePage
          settings={settings}
          onOpenAdminLogin={() => setIsAdminLoginOpen(true)}
          onOpenOrderTracking={() => setIsTrackingOpen(true)}
          onCheckStatus={refreshAllData}
          currentLang={currentLang}
          onToggleLang={() => setCurrentLang(prev => (prev === 'en' ? 'rw' : 'en'))}
        />
      ) : (
        <>
          {/* Admin Maintenance Alert Banner */}
          {isAdminLoggedIn && settings.isMaintenanceMode && (
            <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-slate-950 font-medium px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-2 shadow-sm border-b border-amber-600 sticky top-0 z-40">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping shrink-0" />
                <strong className="font-black uppercase text-[11px] bg-black/15 px-1.5 py-0.5 rounded shrink-0">
                  Maintenance Mode Active
                </strong>
                <span className="text-slate-900 text-xs truncate">
                  Public visitors see the "We’ll Be Back Soon" screen. You are browsing the live website with administrator credentials.
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {activeView !== 'admin' && (
                  <button
                    onClick={() => handleNavigate('admin')}
                    className="px-2.5 py-1 bg-slate-900 hover:bg-black text-white font-bold rounded-lg text-[11px] cursor-pointer"
                  >
                    Open Dashboard
                  </button>
                )}
                <button
                  onClick={async () => {
                    try {
                      const res = await api.adminToggleMaintenanceMode({ isMaintenanceMode: false });
                      setSettings(res.settings);
                      showToast('Maintenance Mode turned OFF. Website is live.');
                      refreshAllData();
                    } catch (err: any) {
                      showToast(err.message || 'Failed to toggle maintenance mode');
                    }
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-amber-50 text-slate-900 font-extrabold rounded-lg text-[11px] shadow-2xs cursor-pointer flex items-center gap-1"
                >
                  <Power className="w-3 h-3 text-red-600" />
                  <span>Turn OFF Maintenance</span>
                </button>
              </div>
            </div>
          )}

          {/* Main Header */}
          <Header
        currentLang={currentLang}
        onLanguageChange={setCurrentLang}
        activeView={activeView}
        onNavigate={(view) => handleNavigate(view)}
        cartCount={cart.reduce((total, item) => total + item.quantity, 0)}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenSearch={() => {
          handleNavigate('shop');
          window.scrollTo({ top: 300, behavior: 'smooth' });
        }}
        onOpenMobileAppModal={() => setIsAppDownloadOpen(true)}
        wishlistCount={wishlist.length}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchSubmit={() => {
          handleNavigate('shop');
        }}
        products={products}
        onSelectProduct={(p) => setSelectedProduct(p)}
        buyerUser={buyerUser}
        onOpenBuyerAuth={() => setIsBuyerAuthOpen(true)}
        onOpenBuyerAccount={() => setIsBuyerAccountOpen(true)}
        isAdminLoggedIn={isAdminLoggedIn}
      />

      {/* VIEW: ADMIN DASHBOARD */}
      {activeView === 'admin' ? (
        isAdminLoggedIn ? (
          <AdminDashboard
            onLogout={async () => {
              await api.adminLogout();
              setIsAdminLoggedIn(false);
              handleNavigate('home');
              showToast('Logged out of admin portal');
            }}
            categories={categories}
            onRefreshPublicData={refreshAllData}
          />
        ) : (
          <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-16 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-xl shadow-orange-500/20 mb-6">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-semibold mb-4">
              <span>ADMIN GATEWAY</span>
            </div>
            <h2 className="text-3xl font-black mb-3">ContactReach Admin Portal</h2>
            <p className="text-slate-400 max-w-md text-sm mb-6">
              Restricted management area for verified platform owners, catalog managers, and customer support operators.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => setIsAdminLoginOpen(true)}
                className="px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-sm shadow-lg shadow-orange-600/30 transition hover:scale-105 cursor-pointer"
              >
                Sign In with Admin Credentials
              </button>
              <button
                onClick={() => handleNavigate('home')}
                className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm border border-slate-700 transition cursor-pointer"
              >
                Return to Storefront
              </button>
            </div>
          </div>
        )
      ) : activeView === '404' ? (
        <NotFoundPage
          currentLang={currentLang}
          products={products}
          onNavigate={handleNavigate}
          onSelectProduct={(p) => setSelectedProduct(p)}
          onOpenAdminLogin={() => setIsAdminLoginOpen(true)}
          onOpenTracking={() => setIsTrackingOpen(true)}
          onSearch={(q) => {
            setSearchQuery(q);
            handleNavigate('shop');
          }}
          settings={settings}
        />
      ) : activeView === 'shops' ? (
        /* VIEW: SHOPS / STORES DIRECTORY (Matching Screenshot 7) */
        <ShopsSection
          shops={shops}
          currentLang={currentLang}
          onSelectShopCategory={() => {
            setSelectedCategory('all');
            handleNavigate('shop');
          }}
          onOpenSellerModal={() => setIsSellerModalOpen(true)}
        />
      ) : activeView === 'how-to-buy' ? (
        /* VIEW: HOW TO BUY (Matching Screenshot 4 from previous prompt) */
        <HowToBuySection
          currentLang={currentLang}
          onStartShopping={() => handleNavigate('shop')}
        />
      ) : activeView === 'contact' ? (
        /* VIEW: CONTACT US (Matching Screenshot 8 & 9) */
        <ContactSection settings={settings} currentLang={currentLang} />
      ) : activeView === 'track-order' ? (
        /* VIEW: TRACK ORDER DIRECT PAGE */
        <div className="py-12 px-4 max-w-4xl mx-auto flex-1 w-full">
          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm text-center space-y-4">
            <h2 className="text-2xl font-black text-slate-900">Track Your Order Status</h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Enter your unique ContactReach order reference (e.g. CRM-78291) to check payment verification and delivery courier updates.
            </p>
            <button
              onClick={() => setIsTrackingOpen(true)}
              className="py-3 px-6 bg-[#FF6000] text-white font-bold text-xs rounded-xl shadow-sm hover:bg-orange-600 transition-all cursor-pointer"
            >
              Open Order Tracking Search
            </button>
          </div>
        </div>
      ) : activeView === 'shop' ? (
        /* VIEW: ALL PRODUCTS / CATALOG (Matching Screenshot 6: Ibicuruzwa Byose) */
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-8 flex-1 w-full">
          {/* Top Bar matching Screenshot 6 */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h1 className="text-2xl font-black text-slate-900">
              {currentLang === 'en' ? 'All Products' : 'Ibicuruzwa Byose'}
            </h1>

            <div className="flex flex-wrap items-center gap-3">
              {/* Search Bar */}
              <div className="relative min-w-[240px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Shakisha ibicuruzwa..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-1.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-orange-500 bg-white"
                />
              </div>

              {/* Sort Dropdown */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="py-1.5 px-3 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 bg-white focus:ring-2 focus:ring-orange-500 cursor-pointer"
              >
                <option value="featured">Sor: Recommend</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="newest">Newest First</option>
              </select>

              <button
                onClick={() => setSelectedCategory('all')}
                className="py-1.5 px-3 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
              >
                <Filter className="w-3.5 h-3.5" />
                <span>All filters</span>
              </button>
            </div>
          </div>

          {/* Category Filter Buttons */}
          <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              All Products ({products.length})
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  selectedCategory === c.id
                    ? 'bg-[#FF6000] text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {currentLang === 'en' ? c.nameEn : c.nameRw}
              </button>
            ))}
          </div>

          {/* 6-Column Dense Grid matching Screenshot 6 */}
          {sortedProducts.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center text-slate-500">
              <ShoppingBag className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <h3 className="font-bold text-base text-slate-800">No products found</h3>
              <p className="text-xs text-slate-400 mt-1">Try resetting search keywords or category filters.</p>
              <button
                onClick={() => {
                  setSelectedCategory('all');
                  setSearchQuery('');
                }}
                className="mt-4 px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
              {sortedProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onViewProduct={(p) => setSelectedProduct(p)}
                  onAddToCart={(p) => handleAddToCart(p, 1)}
                  onQuickBuy={(p) => handleQuickBuy(p, 1)}
                  isWishlisted={wishlist.includes(product.id)}
                  onToggleWishlist={handleToggleWishlist}
                  currentLang={currentLang}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* VIEW: HOMEPAGE (Exact match to Screenshots 1, 2, 3, 4, 5) */
        <main className="flex-1">
          {/* 1. TOP ADVERTISEMENT HERO CAROUSEL (Matching exact design, phone tracking graphic, and animation from screenshot) */}
          <HeroCarousel
            currentLang={currentLang}
            onNavigateShop={() => {
              setSelectedCategory('all');
              handleNavigate('shop');
            }}
            onNavigateHowToBuy={() => handleNavigate('how-to-buy')}
            onShowToast={showToast}
          />

          {/* 2. CATEGORIES HORIZONTAL SLIDER (Matching Screenshot 2: "Ibyiciro bihari") */}
          <section className="max-w-[1440px] mx-auto px-4 sm:px-8 py-6">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 mb-4">
              Ibyiciro bihari
            </h2>

            <div className="relative">
              <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-none">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      handleNavigate('shop');
                    }}
                    className="w-36 h-36 bg-white hover:bg-orange-50/50 rounded-2xl border border-slate-200/90 p-3 flex flex-col items-center justify-between shrink-0 transition-all duration-200 hover:shadow-xs cursor-pointer group"
                  >
                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-50 flex items-center justify-center">
                      <img
                        src={categoryImages[cat.id] || categoryImages.impano}
                        alt={cat.nameRw}
                        className="w-full h-full object-contain group-hover:scale-110 transition-transform"
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-800 group-hover:text-[#FF6000] transition-colors">
                      {currentLang === 'en' ? cat.nameEn : cat.nameRw}
                    </span>
                  </button>
                ))}

                {/* Arrow Button to scroll/view more (Matching Screenshot 2) */}
                <button
                  onClick={() => {
                    setSelectedCategory('all');
                    handleNavigate('shop');
                  }}
                  className="w-10 h-10 rounded-full bg-white border border-slate-300 shadow-xs flex items-center justify-center text-slate-700 hover:text-[#FF6000] shrink-0 hover:bg-slate-50 transition-colors cursor-pointer ml-1"
                  aria-label="View more categories"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </section>

          {/* 3. PRODUCTS DISPLAY / PROFESSIONAL EMPTY STATE */}
          {products.length === 0 ? (
            <section className="max-w-[1440px] mx-auto px-4 sm:px-8 py-10">
              <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 text-center max-w-2xl mx-auto shadow-2xs space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-orange-50 border border-orange-100 text-[#FF6000] flex items-center justify-center mx-auto">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                    {currentLang === 'en' ? 'Products Coming Soon' : 'Ibicuruzwa Biri Gutegurwa'}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-lg mx-auto leading-relaxed">
                    {currentLang === 'en'
                      ? 'ContactReach Market connects Rwandan customers with vetted local suppliers and wholesalers without holding physical inventory. New verified products are being added shortly.'
                      : "ContactReach Market ihuza abaguzi n'abacuruzi nyabo i Kigali no mu Rwanda hose. Ibicuruzwa bishya byizewe biri kongerwamo."}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => setIsSellerModalOpen(true)}
                    className="py-2.5 px-6 rounded-full bg-[#FF6000] hover:bg-[#E54D00] text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                  >
                    {currentLang === 'en' ? 'Register as Supplier' : 'Curuza kuri ContactReach'}
                  </button>
                  <button
                    onClick={() => handleNavigate('contact')}
                    className="py-2.5 px-5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                  >
                    {currentLang === 'en' ? 'Contact Support' : 'Twandikire'}
                  </button>
                </div>
              </div>
            </section>
          ) : (
            <>
              {/* RECENT ARRIVALS */}
              {recentProducts.length > 0 && (
                <section className="max-w-[1440px] mx-auto px-4 sm:px-8 py-6">
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 mb-4">
                    {currentLang === 'en' ? 'Recent Arrivals' : 'Ibije vuba'}
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {recentProducts.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        onViewProduct={(p) => setSelectedProduct(p)}
                        onAddToCart={(p) => handleAddToCart(p, 1)}
                        onQuickBuy={(p) => handleQuickBuy(p, 1)}
                        isWishlisted={wishlist.includes(product.id)}
                        onToggleWishlist={handleToggleWishlist}
                        currentLang={currentLang}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* RECOMMENDATIONS SECTION */}
              {recommendedProducts.length > 0 && (
                <section className="max-w-[1440px] mx-auto px-4 sm:px-8 py-6">
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 mb-4">
                    {currentLang === 'en' ? 'Recommended for You' : 'Ibindi Ukunda'}
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {recommendedProducts.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        onViewProduct={(p) => setSelectedProduct(p)}
                        onAddToCart={(p) => handleAddToCart(p, 1)}
                        onQuickBuy={(p) => handleQuickBuy(p, 1)}
                        isWishlisted={wishlist.includes(product.id)}
                        onToggleWishlist={handleToggleWishlist}
                        currentLang={currentLang}
                      />
                    ))}
                  </div>

                  {visibleRecommendedCount < products.length && (
                    <div className="text-center mt-8">
                      <button
                        onClick={() => setVisibleRecommendedCount(prev => Math.min(products.length, prev + 5))}
                        className="py-2.5 px-6 rounded-full bg-[#18191C] hover:bg-black text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                      >
                        {currentLang === 'en' ? 'Show More' : 'Reba ibindi'}
                      </button>
                    </div>
                  )}
                </section>
              )}
            </>
          )}

          {/* 6. PROMOTIONAL BANNER 1: SELLER CALLOUT (Matching Screenshot 4) */}
          <section className="max-w-[1440px] mx-auto px-4 sm:px-8 pt-8 pb-4">
            <div className="rounded-3xl bg-[#23150D] p-6 sm:p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xs border border-orange-950/40">
              <div className="space-y-1 text-center md:text-left">
                <h3 className="text-xl sm:text-2xl font-black">
                  Ufite ibicuruzwa ushaka kugurisha?
                </h3>
                <p className="text-xs text-orange-200/80">
                  Injira kuri ContactReach Market nk'umucuruzi ugere ku baguzi benshi.
                </p>
              </div>

              <button
                onClick={() => setIsSellerModalOpen(true)}
                className="py-3 px-6 rounded-xl font-black text-xs sm:text-sm bg-[#FF6000] hover:bg-[#E54D00] text-white shadow-xs transition-all whitespace-nowrap cursor-pointer shrink-0"
              >
                Gurisha kuri ContactReach →
              </button>
            </div>
          </section>

          {/* 7. PROMOTIONAL BANNER 2: SHOP ON THE GO (Matching Screenshot 4 & 5) */}
          <section className="max-w-[1440px] mx-auto px-4 sm:px-8 py-4 mb-12">
            <div className="rounded-3xl bg-[#18191C] p-6 sm:p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xs border border-slate-800">
              <div className="space-y-2 text-center md:text-left max-w-xl">
                <span className="inline-block bg-[#FF6000]/20 text-[#FF6000] border border-[#FF6000]/40 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                  • Mobile App Available
                </span>
                <h3 className="text-2xl font-black">
                  Shop on the go
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Download our mobile app for a faster, smoother shopping experience with exclusive mobile-only deals. Enable auto updates to get the latest features and improvements.
                </p>
              </div>

              {/* App Store & Android Badges (Matching Screenshot 4) */}
              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <button
                  onClick={() => setIsAppDownloadOpen(true)}
                  className="bg-black hover:bg-slate-900 border border-slate-700 text-white px-4 py-2 rounded-xl flex items-center gap-2.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Apple className="w-5 h-5" />
                  <div className="text-left">
                    <span className="text-[9px] text-slate-400 block leading-none">DOWNLOAD ON THE</span>
                    <span className="text-xs font-extrabold block leading-tight">App Store</span>
                  </div>
                </button>

                <button
                  onClick={() => setIsAppDownloadOpen(true)}
                  className="bg-black hover:bg-slate-900 border border-slate-700 text-white px-4 py-2 rounded-xl flex items-center gap-2.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Play className="w-5 h-5 fill-emerald-500 text-emerald-500" />
                  <div className="text-left">
                    <span className="text-[9px] text-slate-400 block leading-none">DOWNLOAD ON</span>
                    <span className="text-xs font-extrabold block leading-tight">Android</span>
                  </div>
                </button>
              </div>
            </div>
          </section>
        </main>
      )}

      {/* FLOATING WHATSAPP SUPPORT TAB (Matching exact design on right edge of all screenshots!) */}
      <div className="fixed bottom-6 right-0 z-40">
        <a
          href={`https://wa.me/${settings.whatsAppNumber.replace(/\D/g, '')}?text=${encodeURIComponent(
            'Hello ContactReach Support, I would like assistance with products on ContactReach Market.'
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-white border-y border-l border-slate-200 text-slate-700 hover:text-emerald-600 rounded-l-2xl shadow-xl py-2 px-3 flex flex-col items-center gap-1 transition-transform hover:-translate-x-1"
          title="Ubufasha kuri WhatsApp"
        >
          <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-2xs">
            <MessageCircle className="w-3.5 h-3.5 fill-current" />
          </div>
          <span className="text-[10px] font-extrabold tracking-wider [writing-mode:vertical-rl] rotate-180">
            Ubufasha
          </span>
        </a>
      </div>

      {/* Footer */}
      <Footer
        settings={settings}
        currentLang={currentLang}
        onNavigate={(view) => handleNavigate(view)}
        onOpenAdmin={() => handleNavigate('admin')}
        onRequestProduct={() => setIsRequestProductOpen(true)}
      />
      </>
      )}

      {/* MODALS */}
      {/* 1. Product Details Modal (PDP) */}
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={() => {
            setSelectedProduct(null);
            if (window.location.pathname.startsWith('/product/')) {
              window.history.replaceState({ view: activeView }, '', activeView === 'home' ? '/' : `/${activeView}`);
            }
          }}
          onAddToCart={(p, qty, variation) => {
            handleAddToCart(p, qty, variation);
            setSelectedProduct(null);
          }}
          onBuyNow={(p, qty, variation) => {
            handleQuickBuy(p, qty, variation);
          }}
          allProducts={products}
          onSelectSimilar={(p) => {
            setSelectedProduct(p);
            if (p) {
              window.history.pushState({ view: 'shop', productId: p.id }, '', `/product/${p.id}`);
            }
          }}
          currentLang={currentLang}
        />
      )}

      {/* 2. Cart Drawer */}
      {isCartOpen && (
        <CartDrawer
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          cart={cart}
          onUpdateQuantity={handleUpdateCartQuantity}
          onRemoveItem={handleRemoveFromCart}
          onProceedToCheckout={() => setIsCheckoutOpen(true)}
          currentLang={currentLang}
        />
      )}

      {/* 3. Checkout Modal */}
      {isCheckoutOpen && (
        <CheckoutModal
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          cart={cart}
          settings={settings}
          onOrderCreated={(order) => {
            setCart([]);
            setConfirmationOrder(order);
            showToast(`Order #${order.orderNumber} placed`);
          }}
          onOpenConfirmation={(order) => {
            setConfirmationOrder(order);
            setIsConfirmationOpen(true);
          }}
          onOpenTracking={(orderNumber) => {
            setTrackingOrderNumber(orderNumber);
            setIsTrackingOpen(true);
          }}
          currentLang={currentLang}
          buyerUser={buyerUser}
          onOpenBuyerAuth={() => setIsBuyerAuthOpen(true)}
        />
      )}

      {/* 4. Payment Confirmation Modal ("I Have Already Paid") */}
      {isConfirmationOpen && (
        <PaymentConfirmationModal
          isOpen={isConfirmationOpen}
          onClose={() => setIsConfirmationOpen(false)}
          order={confirmationOrder}
          onConfirmationSuccess={(confirmation, updatedOrder) => {
            showToast('Payment confirmation submitted for review!');
            setConfirmationOrder(updatedOrder);
          }}
          currentLang={currentLang}
        />
      )}

      {/* 5. Order Tracking Modal */}
      {isTrackingOpen && (
        <OrderTrackingModal
          isOpen={isTrackingOpen}
          onClose={() => {
            setIsTrackingOpen(false);
            if (window.location.pathname === '/orders' || window.location.pathname === '/track-order') {
              window.history.replaceState({ view: activeView }, '', activeView === 'home' ? '/' : `/${activeView}`);
            }
          }}
          initialOrderNumber={trackingOrderNumber}
          onOpenConfirmation={(order) => {
            setConfirmationOrder(order);
            setIsConfirmationOpen(true);
          }}
          currentLang={currentLang}
        />
      )}

      {/* 6. Admin Login Modal */}
      {isAdminLoginOpen && (
        <AdminLoginModal
          isOpen={isAdminLoginOpen}
          onClose={() => {
            setIsAdminLoginOpen(false);
            if (window.location.pathname === '/admin' && !isAdminLoggedIn) {
              window.history.replaceState({ view: activeView }, '', activeView === 'home' ? '/' : `/${activeView}`);
            }
          }}
          onLoginSuccess={(user) => {
            setIsAdminLoggedIn(true);
            setActiveView('admin');
            if (window.location.pathname !== '/admin') {
              window.history.pushState({ view: 'admin' }, '', '/admin');
            }
            showToast(`Welcome Administrator ${user?.name || ''}`);
          }}
        />
      )}

      {/* 7. Mobile App Download Modal */}
      {isAppDownloadOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 text-center space-y-4 relative">
            <button
              onClick={() => setIsAppDownloadOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-white border-2 border-slate-200 shadow-md p-1 mx-auto flex items-center justify-center">
                <img
                  src="/logo.png"
                  alt="ContactReach Market Logo"
                  className="w-full h-full object-contain rounded-full"
                />
              </div>
            </div>

            <h3 className="font-black text-lg text-slate-900">
              Download ContactReach Market App
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Experience seamless shopping on iOS & Android. Receive instant order notifications and exclusive discounts.
            </p>

            <div className="pt-2 space-y-2.5">
              <a
                href="https://apps.apple.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-4 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center justify-center gap-2 hover:bg-black transition-colors"
              >
                <Apple className="w-4 h-4" />
                <span>Download on Apple App Store</span>
              </a>

              <a
                href="https://play.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-4 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center justify-center gap-2 hover:bg-black transition-colors"
              >
                <Play className="w-4 h-4 text-emerald-400 fill-emerald-400" />
                <span>Download on Google Play Store</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 8. Request a Product (SABA) Modal */}
      {isRequestProductOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 relative">
            <button
              onClick={() => setIsRequestProductOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5">
              <img
                src="/logo.png"
                alt="ContactReach Market Logo"
                className="w-8 h-8 rounded-full object-contain bg-white border border-slate-200 shadow-2xs shrink-0"
              />
              <h3 className="font-black text-base text-slate-900">
                SABA — Tubwire Icyo Ukeneye
              </h3>
            </div>

            <p className="text-xs text-slate-500">
              Ntiwabonye igicuruzwa wifuza? Andika hano icyo ushaka maze ContactReach Media Ltd igushakire igicuruzwa cy'umwimerere ku giciro cyiza.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                showToast('Ubusabe bwawe bwakiriwe! Tugiye kugushakira igicuruzwa.');
                setIsRequestProductOpen(false);
              }}
              className="space-y-3"
            >
              <input
                type="text"
                required
                placeholder="Amazina yawe..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-orange-500"
              />
              <input
                type="tel"
                required
                placeholder="Nimero ya telefoni (WhatsApp)..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-orange-500"
              />
              <textarea
                rows={3}
                required
                placeholder="Sobanura igicuruzwa ushaka..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-orange-500"
              />
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-[#FF6000] hover:bg-orange-600 text-white font-bold text-xs shadow-xs"
              >
                Ohereza Ubusabe (Submit Request)
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 9. Seller Registration Modal (Gurisha kuri ContactReach) */}
      {isSellerModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 relative">
            <button
              onClick={() => setIsSellerModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5">
              <img
                src="/logo.png"
                alt="ContactReach Market Logo"
                className="w-8 h-8 rounded-full object-contain bg-white border border-slate-200 shadow-2xs shrink-0"
              />
              <h3 className="font-black text-base text-slate-900">
                Gurisha kuri ContactReach Market
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Uzuza amakuru y'iduka cyangwa ibicuruzwa byawe maze utangire kugurisha ku baguzi benshi bo mu Rwanda.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                showToast('Amakuru y\'ubucuruzi bwawe yakiriwe! Ikipe yacu irakuvugisha kuri WhatsApp.');
                setIsSellerModalOpen(false);
              }}
              className="space-y-3"
            >
              <input
                type="text"
                required
                placeholder="Izina ry'Iduka cyangwa Ubucuruzi..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-orange-500"
              />
              <input
                type="text"
                required
                placeholder="Aho mukorera (e.g. Nyarugenge, Kigali)..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-orange-500"
              />
              <input
                type="tel"
                required
                placeholder="Telefoni ikora..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-orange-500"
              />
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-[#FF6000] hover:bg-orange-600 text-white font-bold text-xs shadow-xs"
              >
                Iyandikishe nk'Umucuruzi
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 10. Buyer Authentication Modal (Google Sign In Only) */}
      <BuyerAuthModal
        isOpen={isBuyerAuthOpen}
        onClose={() => setIsBuyerAuthOpen(false)}
        onSuccess={(user) => {
          setBuyerUser(user);
          setIsBuyerAuthOpen(false);
          showToast(
            currentLang === 'en'
              ? `Welcome, ${user.name}!`
              : `Murakaza neza, ${user.name}!`
          );
        }}
        currentLang={currentLang}
      />

      {/* 11. Buyer Account & Order History Modal */}
      {buyerUser && (
        <BuyerAccountModal
          isOpen={isBuyerAccountOpen}
          onClose={() => setIsBuyerAccountOpen(false)}
          user={buyerUser}
          onLogout={async () => {
            await api.buyerLogout();
            setBuyerUser(null);
            setIsBuyerAccountOpen(false);
            showToast(
              currentLang === 'en'
                ? 'Signed out of buyer account'
                : 'Mwasohotse muri konti'
            );
          }}
          onTrackOrder={(orderRef) => {
            setTrackingOrderNumber(orderRef);
            setIsTrackingOpen(true);
          }}
          currentLang={currentLang}
        />
      )}
    </div>
  );
}
