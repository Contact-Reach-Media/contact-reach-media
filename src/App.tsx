import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ShoppingBag, Search, Sparkles, Truck, ShieldCheck, CreditCard,
  MessageCircle, Heart, Star, ChevronRight, ChevronLeft, ArrowRight,
  Filter, Smartphone, Zap, Tag, Check, ArrowUpRight, Apple, Play,
  Headphones, Users, Calendar, HelpCircle, X, Wrench, Power
} from 'lucide-react';

import { Product, Category, AppSettings, CartItem, Order, PaymentConfirmation, VendorShop, CustomerUser } from './types.ts';
import { initialCategories, initialSettings } from './data/initialData.ts';
import { api, getAdminToken, getStoredAdminUser, isAuthorizedAdminUser } from './services/api.ts';
import {
  Language,
  translations,
  getCategoryTitle,
  loadLanguageTranslations,
  subscribeToTranslationUpdates,
  TranslationDictionary
} from './translations.ts';
import { CurrencyCode, DEFAULT_EXCHANGE_RATES, formatCurrencyPrice } from './utils/currency.ts';
import { initGoogleTranslateScript, setGoogleTranslateLanguage } from './services/googleTranslate.ts';
import { startDOMTranslationObserver, restoreOriginalEnglish } from './services/domTranslator.ts';
import { subscribeToSupabaseTable, mapSupabaseRowToProduct } from './services/supabase.ts';

import { Header } from './components/Header.tsx';
import { ProductCard } from './components/ProductCard.tsx';
import { ProductDetailPage } from './components/ProductDetailPage.tsx';
import { CartPage } from './components/CartPage.tsx';
import { CheckoutPage } from './components/CheckoutPage.tsx';
import { PaymentPage } from './components/PaymentPage.tsx';
import { OrderTrackingPage } from './components/OrderTrackingPage.tsx';
import { CustomerAccountPage } from './components/CustomerAccountPage.tsx';
import { AdminLoginPage } from './components/AdminLoginPage.tsx';
import { VendorApplicationPage } from './components/VendorApplicationPage.tsx';
import { AppDownloadPage } from './components/AppDownloadPage.tsx';
import { CategoriesPage } from './components/CategoriesPage.tsx';
import { HowToBuySection } from './components/HowToBuySection.tsx';
import { ShopsSection } from './components/ShopsSection.tsx';
import { ContactSection } from './components/ContactSection.tsx';
import { Footer } from './components/Footer.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import { MaintenancePage } from './components/MaintenancePage.tsx';
import { NotFoundPage } from './components/NotFoundPage.tsx';
import { SignInPage } from './components/SignInPage.tsx';
import { PWAInstallBanner } from './components/PWAInstallBanner.tsx';
import { ProductModal } from './components/ProductModal.tsx';
import { CartDrawer } from './components/CartDrawer.tsx';
import { CheckoutModal } from './components/CheckoutModal.tsx';
import { PaymentConfirmationModal } from './components/PaymentConfirmationModal.tsx';
import { OrderTrackingModal } from './components/OrderTrackingModal.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { PWAInstallModal } from './components/PWAInstallModal.tsx';
import { BuyerAuthModal } from './components/BuyerAuthModal.tsx';
import { BuyerAccountModal } from './components/BuyerAccountModal.tsx';
import { CategoryMegaMenu } from './components/CategoryMegaMenu.tsx';
import {
  MAIN_CATEGORY_DEFINITIONS,
  resolveDepartmentDefinitions,
  resolveSubCategoryLabel,
  doesProductMatchCategory,
  doesProductMatchSubCategory,
  toCategorySlug
} from './data/categoryStructure.ts';


const SUPPORTED_LANG_CODES: Language[] = ['en', 'fr', 'rw', 'sw', 'es', 'pt', 'ar', 'zh', 'de', 'hi'];
const SUPPORTED_CURR_CODES: CurrencyCode[] = ['RWF', 'USD', 'EUR', 'GBP', 'KES', 'TZS', 'UGX', 'NGN', 'ZAR', 'CNY'];

// Client-side URL route parser for direct browser reloads & shareable links
function parseRouteFromLocation() {
  if (typeof window === 'undefined') {
    return {
      view: 'home',
      category: 'all',
      search: '',
      orderRef: '',
      productId: '',
      lang: 'en' as Language,
      currency: 'RWF' as CurrencyCode,
    };
  }

  const rawPath = window.location.pathname.toLowerCase().replace(/\/+$/, '') || '/';
  const searchParams = new URLSearchParams(window.location.search);
  const catParam = searchParams.get('category');
  const searchParam = searchParams.get('search') || searchParams.get('q');
  const orderParam = searchParams.get('order') || searchParams.get('ref');
  const langParam = searchParams.get('lang');
  const currParam = searchParams.get('currency');
  const viewParam = searchParams.get('view');

  let view = 'home';
  let productId = '';
  let category = catParam || 'all';

  if (viewParam === 'admin' || rawPath === '/admin' || rawPath === '/dashboard') {
    view = 'admin';
  } else if (viewParam === 'admin-login' || rawPath === '/admin/login') {
    view = 'admin-login';
  } else if (viewParam === 'shop' || rawPath === '/shop' || rawPath === '/products' || rawPath === '/catalog') {
    view = 'shop';
  } else if (rawPath === '/shops' || rawPath === '/stores' || rawPath === '/vendors') {
    view = 'shops';
  } else if (rawPath === '/how-to-buy' || rawPath === '/how' || rawPath === '/guide') {
    view = 'how-to-buy';
  } else if (rawPath === '/contact' || rawPath === '/support' || rawPath === '/about') {
    view = 'contact';
  } else if (viewParam === 'track' || rawPath === '/orders' || rawPath === '/track' || rawPath === '/track-order') {
    view = 'track-order';
  } else if (rawPath === '/login' || rawPath === '/signin' || rawPath === '/auth') {
    view = 'login';
  } else if (rawPath === '/register' || rawPath === '/signup') {
    view = 'register';
  } else if (rawPath === '/cart' || rawPath === '/bag' || rawPath === '/basket') {
    view = 'cart';
  } else if (rawPath === '/checkout' || rawPath === '/buy') {
    view = 'checkout';
  } else if (rawPath === '/payment' || rawPath === '/order-confirmed' || rawPath === '/pay') {
    view = 'payment';
  } else if (rawPath === '/account' || rawPath === '/profile' || rawPath === '/my-account') {
    view = 'account';
  } else if (rawPath === '/categories' || rawPath === '/departments') {
    view = 'categories';
  } else if (rawPath === '/vendor' || rawPath === '/sell' || rawPath === '/supplier') {
    view = 'vendor';
  } else if (rawPath === '/download' || rawPath === '/app' || rawPath === '/install') {
    view = 'download';
  } else if (rawPath === '/upload' || rawPath === '/upload-product' || rawPath === '/add-product') {
    view = 'admin-upload';
  } else if (rawPath === '/404' || rawPath === '/not-found') {
    view = '404';
  } else if (rawPath.startsWith('/product/') || rawPath.startsWith('/p/')) {
    productId = window.location.pathname.replace(/^\/(?:product|p)\//i, '').trim();
    view = 'product';
  } else if (rawPath.startsWith('/category/')) {
    category = window.location.pathname.replace(/^\/category\//i, '').trim() || 'all';
    view = 'shop';
  } else if (rawPath !== '/' && rawPath !== '') {
    view = '404';
  }

  // Persisted language preference
  const storedLang = localStorage.getItem('crm_lang');
  const resolvedLang: Language = (langParam && langParam.trim().length >= 2)
    ? langParam.trim()
    : (storedLang && storedLang.trim().length >= 2 ? storedLang.trim() : 'en');

  // Persisted currency preference
  const storedCurr = localStorage.getItem('crm_currency') as CurrencyCode | null;
  const resolvedCurr = (currParam && SUPPORTED_CURR_CODES.includes(currParam.toUpperCase() as CurrencyCode))
    ? (currParam.toUpperCase() as CurrencyCode)
    : (storedCurr && SUPPORTED_CURR_CODES.includes(storedCurr) ? storedCurr : 'RWF');

  return {
    view,
    category,
    search: searchParam || '',
    orderRef: orderParam || '',
    productId,
    lang: resolvedLang,
    currency: resolvedCurr,
  };
}

export default function App() {
  const initialRoute = React.useMemo(() => parseRouteFromLocation(), []);
  const [currentLang, setCurrentLang] = useState<Language>(initialRoute.lang);
  const [currentCurrency, setCurrentCurrency] = useState<CurrencyCode>(initialRoute.currency);
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>(DEFAULT_EXCHANGE_RATES);
  const [activeView, setActiveView] = useState<string>(initialRoute.view);

  // Core Data loaded dynamically from Supabase
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [shops, setShops] = useState<VendorShop[]>([]);
  const [settings, setSettings] = useState<AppSettings>(initialSettings);

  // Request permanent storage from browser and persist catalog to local storage
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().catch(() => {});
    }
  }, []);

  useEffect(() => {
    try {
      if (products && products.length > 0) {
        localStorage.setItem('crm_home_catalog_cache', JSON.stringify(products.slice(0, 1000)));
      }
    } catch {}
  }, [products]);

  // Cart & Wishlist with localStorage Persistence (excluding any permanently deleted products)
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const deletedIds = api.getLocallyDeletedProductIds();
      const delSet = new Set(deletedIds.map((d: string) => d.toLowerCase().trim()));
      const saved = localStorage.getItem('crm_cart');
      if (saved) {
        const list = JSON.parse(saved);
        if (Array.isArray(list)) {
          return list.filter((item: any) => {
            const pId = item.productId || item.product?.id || item.id;
            return !delSet.has(String(pId).toLowerCase().trim());
          });
        }
      }
      return [];
    } catch {
      return [];
    }
  });

  const [wishlist, setWishlist] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const deletedIds = api.getLocallyDeletedProductIds();
      const delSet = new Set(deletedIds.map((d: string) => d.toLowerCase().trim()));
      const saved = localStorage.getItem('crm_wishlist');
      if (saved) {
        const list = JSON.parse(saved);
        if (Array.isArray(list)) {
          return list.filter((id: string) => !delSet.has(String(id).toLowerCase().trim()));
        }
      }
      return [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('crm_cart', JSON.stringify(cart));
    } catch {}
  }, [cart]);

  useEffect(() => {
    try {
      localStorage.setItem('crm_wishlist', JSON.stringify(wishlist));
    } catch {}
  }, [wishlist]);

  // Filtering & Catalog
  const [selectedCategory, setSelectedCategory] = useState<string>(initialRoute.category);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
  const [isCategoryMegaMenuOpen, setIsCategoryMegaMenuOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>(initialRoute.search);
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'newest'>('featured');

  // Active selected entities
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [confirmationOrder, setConfirmationOrder] = useState<Order | null>(null);
  const [trackingOrderNumber, setTrackingOrderNumber] = useState<string>(initialRoute.orderRef || '');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const token = api.getAdminToken();
    if (!token) return false;
    const user = api.getStoredAdminUser();
    if (user) {
      return isAuthorizedAdminUser(user) && user.active !== false;
    }
    return true;
  });
  const [adminInitialTab, setAdminInitialTab] = useState<'overview' | 'products' | 'orders' | 'inventory' | 'settings'>('overview');
  const [autoOpenAddProduct, setAutoOpenAddProduct] = useState(initialRoute.view === 'admin-upload');
  const [pendingAdminAction, setPendingAdminAction] = useState<string | null>(initialRoute.view === 'admin-upload' ? 'upload-product' : null);

  // Buyer Account & Authentication (hydrated synchronously so session persists across refreshes/restarts)
  const [buyerUser, setBuyerUser] = useState<CustomerUser | null>(() => {
    if (typeof window === 'undefined') return null;
    return api.getBuyerToken() ? api.getStoredBuyerUser() : null;
  });

  // Modal Dialog States
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);
  const [isAppDownloadOpen, setIsAppDownloadOpen] = useState(false);
  const [isRequestProductOpen, setIsRequestProductOpen] = useState(false);
  const [isSellerModalOpen, setIsSellerModalOpen] = useState(false);
  const [isBuyerAuthOpen, setIsBuyerAuthOpen] = useState(false);
  const [isBuyerAccountOpen, setIsBuyerAccountOpen] = useState(false);

  // Product quantity display limit for "Reba ibindi"
  const [visibleRecommendedCount, setVisibleRecommendedCount] = useState(20);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Dynamic Google-Powered Translations dictionary state
  const [activeDictionary, setActiveDictionary] = useState<TranslationDictionary>(() => translations[currentLang]);

  // One-time initialization of official Google Website Translation script
  useEffect(() => {
    initGoogleTranslateScript();

    const handleExternalLangEvent = (e: any) => {
      const code = e.detail?.lang;
      if (code && code !== currentLang) {
        setCurrentLang(code);
      }
    };
    window.addEventListener('crm_language_changed', handleExternalLangEvent);
    return () => {
      window.removeEventListener('crm_language_changed', handleExternalLangEvent);
    };
  }, []);

  // Synchronize Google Translate Element & Continuous DOM Translation Observer on language change
  useEffect(() => {
    setActiveDictionary(translations[currentLang]);
    loadLanguageTranslations(currentLang).then(dict => {
      setActiveDictionary(dict);
    }).catch(() => {});

    // Trigger Google Website Translation Element & DOM Text Observer
    setGoogleTranslateLanguage(currentLang);
    startDOMTranslationObserver(currentLang);

    const unsubscribe = subscribeToTranslationUpdates((updatedLang, updatedDict) => {
      if (updatedLang === currentLang) {
        setActiveDictionary(updatedDict);
      }
    });
    return () => unsubscribe();
  }, [currentLang]);

  const handleLanguageChange = (newLang: Language) => {
    setCurrentLang(newLang);
    setGoogleTranslateLanguage(newLang);
    startDOMTranslationObserver(newLang);
    loadLanguageTranslations(newLang).catch(() => {});
  };

  const t = activeDictionary || translations[currentLang];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Synchronized navigation pushing URL path without reload
  const handleNavigate = (view: string, params?: { productId?: string; orderRef?: string; replace?: boolean; push?: boolean }) => {
    let targetPath = '/';
    let resolvedView = view;

    if (view === 'shop') targetPath = '/shop';
    else if (view === 'shops') targetPath = '/shops';
    else if (view === 'how-to-buy') targetPath = '/how-to-buy';
    else if (view === 'contact') targetPath = '/contact';
    else if (view === 'cart') targetPath = '/cart';
    else if (view === 'checkout') targetPath = '/checkout';
    else if (view === 'payment') {
      const ref = params?.orderRef || confirmationOrder?.orderNumber || trackingOrderNumber || '';
      targetPath = ref ? `/payment?order=${encodeURIComponent(ref)}` : '/payment';
      if (ref) setTrackingOrderNumber(ref);
    }
    else if (view === 'track-order' || view === 'orders') {
      resolvedView = 'track-order';
      const ref = params?.orderRef || trackingOrderNumber || '';
      targetPath = ref ? `/orders?ref=${encodeURIComponent(ref)}` : '/orders';
      if (ref) setTrackingOrderNumber(ref);
    }
    else if (view === 'login') targetPath = '/login';
    else if (view === 'register') targetPath = '/register';
    else if (view === 'account') {
      targetPath = '/account';
    }
    else if (view === 'admin-login') {
      const token = api.getAdminToken();
      const stored = api.getStoredAdminUser();
      const isAuth = (isAdminLoggedIn || Boolean(token)) && (!stored || (isAuthorizedAdminUser(stored) && stored.active !== false));
      if (isAuth && token) {
        resolvedView = 'admin';
        targetPath = '/admin';
      } else {
        targetPath = '/admin/login';
      }
    }
    else if (view === 'admin') {
      const token = api.getAdminToken();
      const stored = api.getStoredAdminUser();
      const isAuth = (isAdminLoggedIn || Boolean(token)) && (!stored || (isAuthorizedAdminUser(stored) && stored.active !== false));
      if (!isAuth || !token) {
        resolvedView = 'admin-login';
        targetPath = '/admin/login';
      } else {
        targetPath = '/admin';
      }
    }
    else if (view === 'vendor' || view === 'sell') {
      resolvedView = 'vendor';
      targetPath = '/vendor';
    }
    else if (view === 'download' || view === 'app') {
      resolvedView = 'download';
      targetPath = '/download';
    }
    else if (view === 'categories') {
      targetPath = '/categories';
    }
    else if (view === 'admin-upload' || view === 'upload-product') {
      const token = api.getAdminToken();
      const stored = api.getStoredAdminUser();
      const isAuth = (isAdminLoggedIn || Boolean(token)) && (!stored || (isAuthorizedAdminUser(stored) && stored.active !== false));
      if (isAuth || token) {
        setIsAdminLoggedIn(true);
        setAdminInitialTab('products');
        setAutoOpenAddProduct(true);
        resolvedView = 'admin';
        targetPath = '/admin';
      } else {
        setPendingAdminAction('upload-product');
        resolvedView = 'admin-login';
        targetPath = '/admin/login';
      }
    }
    else if (view === 'product') {
      const pId = params?.productId || selectedProduct?.id;
      if (pId) {
        targetPath = `/product/${encodeURIComponent(pId)}`;
        const found = products.find(p => p.id === pId);
        if (found) setSelectedProduct(found);
      } else {
        targetPath = '/shop';
        resolvedView = 'shop';
      }
    }
    else if (view === '404') targetPath = '/404';

    const shouldPush = params?.push !== false;
    if (typeof window !== 'undefined') {
      if (params?.replace) {
        window.history.replaceState({ view: resolvedView, ...params }, '', targetPath);
      } else if (shouldPush && (window.location.pathname + window.location.search) !== targetPath) {
        window.history.pushState({ view: resolvedView, ...params }, '', targetPath);
      }
    }

    setActiveView(resolvedView);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Dedicated manual logout handler - ONLY manual logout ends admin session
  const handleAdminLogout = useCallback(async () => {
    try {
      await api.adminLogout();
    } catch {}
    setIsAdminLoggedIn(false);
    setAutoOpenAddProduct(false);
    handleNavigate('home');
    showToast('Logged out of admin portal');
  }, []);

  // Direct product selector with deep-link URL push & replace
  const handleSelectProduct = (product: Product | null) => {
    setSelectedProduct(product);
    if (product) {
      handleNavigate('product', { productId: product.id });
    } else {
      handleNavigate('shop');
    }
  };

  // Browser back/forward popstate listener
  useEffect(() => {
    const handlePopState = () => {
      const route = parseRouteFromLocation();
      setActiveView(route.view);
      if (route.productId) {
        const found = products.find(p => p.id === route.productId);
        if (found) setSelectedProduct(found);
      }
      if (route.orderRef) {
        setTrackingOrderNumber(route.orderRef);
      }
      if (route.category) {
        setSelectedCategory(route.category);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [products]);

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
      const hasToken = Boolean(api.getAdminToken());
      const effectiveAuth = isAuth && hasToken;
      setIsAdminLoggedIn(effectiveAuth);

      if (initialRoute.view === 'admin' && !effectiveAuth) {
        setActiveView('admin-login');
        if (typeof window !== 'undefined') {
          window.history.replaceState({ view: 'admin-login' }, '', '/admin/login');
        }
      } else if (initialRoute.view === 'admin-login' && effectiveAuth) {
        setActiveView('admin');
        if (typeof window !== 'undefined') {
          window.history.replaceState({ view: 'admin' }, '', '/admin');
        }
      }

      if (initialRoute.productId) {
        const found = fetchedProducts.find(p => p.id === initialRoute.productId);
        if (found) setSelectedProduct(found);
      }

      // Check for logged-in buyer user
      try {
        if (!api.getBuyerToken()) {
          setBuyerUser(null);
        } else {
          const currentBuyer = await api.buyerGetMe();
          setBuyerUser(currentBuyer);
        }
      } catch {}

      // Reconcile and clamp existing cart items against fresh inventory
      setCart(currentCart => {
        if (!currentCart || currentCart.length === 0) return currentCart;
        return currentCart.map(item => {
          const fresh = fetchedProducts.find(p => p.id === item.product.id);
          if (!fresh) return item;
          const freshStock = Math.max(0, fresh.stock || 0);
          const clampedQty = Math.min(item.quantity, freshStock);
          return {
            ...item,
            product: fresh,
            quantity: clampedQty
          };
        }).filter(item => item.quantity > 0 && item.product.status !== 'Out of Stock');
      });
    } catch (err) {
      console.warn('Backend sync in fallback mode:', err);
    }
  };

  useEffect(() => {
    refreshAllData();
  }, []);

  // Automatic Admin Session Verification & Cross-Tab Sync
  useEffect(() => {
    let isChecking = false;
    const verifyAdminSession = async () => {
      if (isChecking) return;
      const token = api.getAdminToken();
      if (!token) {
        setIsAdminLoggedIn(false);
        return;
      }
      isChecking = true;
      try {
        const valid = await api.adminCheckAuth();
        setIsAdminLoggedIn(valid);
        if (!valid && window.location.pathname.toLowerCase().startsWith('/admin') && !window.location.pathname.toLowerCase().includes('/login')) {
          setActiveView('admin-login');
          window.history.replaceState({ view: 'admin-login' }, '', '/admin/login');
        }
      } catch {} finally {
        isChecking = false;
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        verifyAdminSession();
      }
    };

    const handleFocusOrOnline = () => {
      verifyAdminSession();
    };

    const handleStorageSync = (e: StorageEvent) => {
      if (e.key === 'crm_admin_token' || e.key === 'crm_admin_session_active' || e.key === null) {
        const token = api.getAdminToken();
        if (!token) {
          setIsAdminLoggedIn(false);
          if (window.location.pathname.toLowerCase().startsWith('/admin') && !window.location.pathname.toLowerCase().includes('/login')) {
            setActiveView('admin-login');
            window.history.replaceState({ view: 'admin-login' }, '', '/admin/login');
          }
        } else {
          verifyAdminSession();
        }
      }
    };

    const handleAuthChanged = (e: any) => {
      const authenticated = Boolean(e?.detail?.authenticated && api.getAdminToken());
      setIsAdminLoggedIn(authenticated);
      if (!authenticated && window.location.pathname.toLowerCase().startsWith('/admin') && !window.location.pathname.toLowerCase().includes('/login')) {
        setActiveView('admin-login');
        window.history.replaceState({ view: 'admin-login' }, '', '/admin/login');
      }
    };

    const sessionHeartbeat = setInterval(verifyAdminSession, 5 * 60 * 1000);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleFocusOrOnline);
    window.addEventListener('online', handleFocusOrOnline);
    window.addEventListener('storage', handleStorageSync);
    window.addEventListener('crm_admin_auth_changed', handleAuthChanged);

    return () => {
      clearInterval(sessionHeartbeat);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocusOrOnline);
      window.removeEventListener('online', handleFocusOrOnline);
      window.removeEventListener('storage', handleStorageSync);
      window.removeEventListener('crm_admin_auth_changed', handleAuthChanged);
    };
  }, []);

  // Persistent Buyer Session Verification & Cross-Tab Sync
  useEffect(() => {
    let isCheckingBuyer = false;
    const verifyBuyerSession = async () => {
      if (isCheckingBuyer) return;
      const token = api.getBuyerToken();
      if (!token) {
        setBuyerUser(null);
        return;
      }
      isCheckingBuyer = true;
      try {
        const currentBuyer = await api.buyerGetMe();
        setBuyerUser(currentBuyer);
      } catch {} finally {
        isCheckingBuyer = false;
      }
    };

    const handleBuyerVisibility = () => {
      if (document.visibilityState === 'visible') {
        verifyBuyerSession();
      }
    };

    const handleBuyerStorageSync = (e: StorageEvent) => {
      if (
        e.key === 'crm_buyer_token' ||
        e.key === 'crm_buyer_session_active' ||
        e.key === 'crm_buyer_user' ||
        e.key === null
      ) {
        const token = api.getBuyerToken();
        if (!token) {
          setBuyerUser(null);
        } else {
          const stored = api.getStoredBuyerUser();
          if (stored) setBuyerUser(stored);
          verifyBuyerSession();
        }
      }
    };

    const handleBuyerAuthChanged = (e: any) => {
      const authenticated = Boolean(e?.detail?.authenticated && api.getBuyerToken());
      if (!authenticated) {
        setBuyerUser(null);
      } else {
        setBuyerUser(e?.detail?.user || api.getStoredBuyerUser());
      }
    };

    const buyerHeartbeat = setInterval(verifyBuyerSession, 5 * 60 * 1000);
    document.addEventListener('visibilitychange', handleBuyerVisibility);
    window.addEventListener('focus', verifyBuyerSession);
    window.addEventListener('online', verifyBuyerSession);
    window.addEventListener('storage', handleBuyerStorageSync);
    window.addEventListener('crm_buyer_auth_changed', handleBuyerAuthChanged);

    return () => {
      clearInterval(buyerHeartbeat);
      document.removeEventListener('visibilitychange', handleBuyerVisibility);
      window.removeEventListener('focus', verifyBuyerSession);
      window.removeEventListener('online', verifyBuyerSession);
      window.removeEventListener('storage', handleBuyerStorageSync);
      window.removeEventListener('crm_buyer_auth_changed', handleBuyerAuthChanged);
    };
  }, []);

  // Live real-time catalog synchronization across all devices & sessions
  useEffect(() => {
    // 1. Supabase Postgres Realtime replication for products
    const unsubscribeSupabase = subscribeToSupabaseTable('products', (payload) => {
      const { eventType, new: newRecord, old: oldRecord } = payload;
      if ((eventType === 'INSERT' || eventType === 'UPDATE') && newRecord) {
        const mapped = mapSupabaseRowToProduct(newRecord);
        const isPublicVisible = mapped.status !== 'Hidden' && mapped.status !== 'Archived';
        setProducts(prev => {
          if (!isPublicVisible) {
            return prev.filter(p => p.id !== mapped.id);
          }
          const exists = prev.some(p => p.id === mapped.id);
          if (exists) {
            return prev.map(p => p.id === mapped.id ? mapped : p);
          }
          return [mapped, ...prev];
        });
      } else if (eventType === 'DELETE' && oldRecord) {
        const delId = String(oldRecord.id);
        setProducts(prev => prev.filter(p => p.id !== delId));
      }
    });

    // 2. High-speed Server-Sent Events (SSE) live database stream for worldwide instant sync
    let eventSource: EventSource | null = null;
    let lastKnownVersion = '';
    let lastKnownCatalogUpdate = '';

    const handleSyncRefresh = () => {
      api.getProducts().then(freshProds => {
        if (Array.isArray(freshProds) && freshProds.length > 0) {
          setProducts(freshProds);
        }
      }).catch(() => {});

      api.getCategories().then(freshCats => {
        if (Array.isArray(freshCats) && freshCats.length > 0) {
          setCategories(freshCats);
        }
      }).catch(() => {});
    };

    try {
      eventSource = new EventSource('/api/database/stream');
      eventSource.addEventListener('db_update', (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (!parsed) return;

          // Track version updates
          if (parsed.version && (!lastKnownVersion || parsed.version !== lastKnownVersion)) {
            lastKnownVersion = parsed.version;
            if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
              navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' });
            }
          }

          if (parsed.lastCatalogUpdate) {
            lastKnownCatalogUpdate = parsed.lastCatalogUpdate;
          }

          // Real-time catalog events
          if (parsed?.type === 'product_created' && parsed.payload?.product) {
            const p: Product = parsed.payload.product;
            if (p.status !== 'Hidden' && p.status !== 'Archived') {
              setProducts(prev => {
                if (prev.some(x => x.id === p.id)) return prev.map(x => x.id === p.id ? p : x);
                return [p, ...prev];
              });
            }
          } else if (parsed?.type === 'product_updated' && parsed.payload?.product) {
            const p: Product = parsed.payload.product;
            const isPublicVisible = p.status !== 'Hidden' && p.status !== 'Archived';
            setProducts(prev => {
              if (!isPublicVisible) return prev.filter(x => x.id !== p.id);
              if (prev.some(x => x.id === p.id)) return prev.map(x => x.id === p.id ? p : x);
              return [p, ...prev];
            });
          } else if (parsed?.type === 'products_bulk_updated' && Array.isArray(parsed.payload?.productIds)) {
            handleSyncRefresh();
          } else if (parsed?.type === 'product_deleted' && parsed.payload?.productId) {
            const delId = parsed.payload.productId;
            setProducts(prev => prev.filter(x => x.id !== delId));
          } else if (parsed?.type === 'products_bulk_deleted' && Array.isArray(parsed.payload?.productIds)) {
            const delSet = new Set(parsed.payload.productIds);
            setProducts(prev => prev.filter(x => !delSet.has(x.id)));
          } else if (
            parsed?.type === 'category_created' ||
            parsed?.type === 'category_updated' ||
            parsed?.type === 'category_deleted'
          ) {
            api.getCategories().then(freshCats => {
              if (Array.isArray(freshCats)) setCategories(freshCats);
            }).catch(() => {});
          } else if (parsed?.type === 'settings_updated') {
            api.getSettings().then((st: AppSettings) => {
              if (st) setSettings(st);
            }).catch(() => {});
          } else if (parsed?.type === 'site_version_update' || parsed?.type === 'catalog_update') {
            handleSyncRefresh();
          }
        } catch {}
      });
    } catch {}

    // 3. Resilient 30s background sync heartbeat (fallback for networks blocking SSE)
    const syncHeartbeat = setInterval(async () => {
      try {
        const res = await fetch('/api/sync/status', { cache: 'no-store' });
        if (res.ok) {
          const status = await res.json();
          if (status?.lastCatalogUpdate && lastKnownCatalogUpdate && status.lastCatalogUpdate !== lastKnownCatalogUpdate) {
            lastKnownCatalogUpdate = status.lastCatalogUpdate;
            handleSyncRefresh();
          }
          if (status?.version && lastKnownVersion && status.version !== lastKnownVersion) {
            lastKnownVersion = status.version;
            if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
              navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' });
            }
            handleSyncRefresh();
          }
        }
      } catch {}
    }, 30000);

    return () => {
      try { unsubscribeSupabase(); } catch {}
      clearInterval(syncHeartbeat);
      if (eventSource) {
        try { eventSource.close(); } catch {}
      }
    };
  }, []);

  // Fetch live exchange rates from backend (/api/exchange-rates)
  useEffect(() => {
    api.getExchangeRates().then(res => {
      if (res && res.rates && Object.keys(res.rates).length > 0) {
        setExchangeRates(res.rates);
      }
    }).catch(err => {
      console.warn('Using baseline currency rates:', err);
    });
  }, []);

  // Sync document language, direction, and persistence
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('crm_lang', currentLang);
        document.documentElement.lang = currentLang;
        document.documentElement.dir = currentLang === 'ar' ? 'rtl' : 'ltr';
      } catch {}
    }
  }, [currentLang]);

  // Sync currency persistence
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('crm_currency', currentCurrency);
      } catch {}
    }
  }, [currentCurrency]);

  // Listen to browser Back/Forward (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const route = parseRouteFromLocation();
      if (route.view === 'admin') {
        const token = api.getAdminToken();
        const stored = api.getStoredAdminUser();
        const isAuth = (isAdminLoggedIn || Boolean(token)) && (!stored || (isAuthorizedAdminUser(stored) && stored.active !== false));
        if (!isAuth && !token) {
          setActiveView('admin-login');
        } else {
          setIsAdminLoggedIn(true);
          setActiveView('admin');
        }
      } else if (route.view === 'track-order') {
        setIsTrackingOpen(true);
        if (route.orderRef) setTrackingOrderNumber(route.orderRef);
      } else if (route.view === 'cart') {
        setIsCartOpen(true);
      } else if (route.view === 'vendor') {
        setIsSellerModalOpen(true);
      } else {
        setActiveView(route.view);
      }

      if (route.category) setSelectedCategory(route.category);
      if (route.search) setSearchQuery(route.search);
      if (route.productId) {
        const found = products.find(p => p.id === route.productId);
        if (found) setSelectedProduct(found);
      } else {
        setSelectedProduct(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isAdminLoggedIn, products]);

  // Cart Actions with Verified Stock Clamping
  const handleAddToCart = (product: Product, quantity = 1, variation?: { [key: string]: string }) => {
    const availableStock = Math.max(0, product.stock || 0);
    if (availableStock <= 0 || product.status === 'Out of Stock') {
      showToast(currentLang === 'en' ? `"${product.name.slice(0, 24)}" is currently out of stock.` : `"${product.name.slice(0, 24)}" ntiri mu bubiko.`);
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        const potentialQty = existing.quantity + quantity;
        const clampedQty = Math.min(potentialQty, availableStock);
        if (potentialQty > availableStock) {
          showToast(`Only ${availableStock} units available in stock.`);
        } else {
          showToast(`Added "${product.name.slice(0, 24)}..." to cart`);
        }
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: clampedQty, selectedVariation: variation || item.selectedVariation }
            : item
        );
      }
      const initialQty = Math.min(quantity, availableStock);
      showToast(`Added "${product.name.slice(0, 24)}..." to cart`);
      return [...prev, { product, quantity: initialQty, selectedVariation: variation }];
    });
  };

  const handleUpdateCartQuantity = (productId: string, delta: number) => {
    setCart(prev =>
      prev
        .map(item => {
          if (item.product.id === productId) {
            const maxStock = Math.max(0, item.product.stock || 0);
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (newQty > maxStock) {
              showToast(`Maximum available stock reached (${maxStock} units).`);
              return { ...item, quantity: maxStock };
            }
            return { ...item, quantity: newQty };
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
    const availableStock = Math.max(0, product.stock || 0);
    if (availableStock <= 0 || product.status === 'Out of Stock') {
      showToast(currentLang === 'en' ? `"${product.name.slice(0, 24)}" is currently out of stock.` : `"${product.name.slice(0, 24)}" ntiri mu bubiko.`);
      return;
    }
    const safeQty = Math.min(quantity, availableStock);
    setCart([{ product, quantity: safeQty, selectedVariation: variation }]);
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

  const departmentTree = useMemo(
    () => resolveDepartmentDefinitions(categories, true),
    [categories]
  );

  // Filtered & Sorted Products
  const filteredProducts = products.filter(p => {
    const matchCategory = doesProductMatchCategory(p, selectedCategory);
    const matchSubCategory = doesProductMatchSubCategory(
      p,
      selectedSubCategory,
      selectedCategory,
      categories
    );

    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      (p.subCategoryName && p.subCategoryName.toLowerCase().includes(q)) ||
      (p.subcategory && p.subcategory.toLowerCase().includes(q)) ||
      (p.brand && p.brand.toLowerCase().includes(q)) ||
      (p.sku && p.sku.toLowerCase().includes(q));

    return matchCategory && matchSubCategory && matchSearch;
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

  // Recent Arrivals: strictly 3 products that are new
  const recentProducts = useMemo(() => {
    // 1. Priority: Available products explicitly flagged as isNewArrival, sorted newest first
    const newItems = products.filter(p => p.isNewArrival && p.status === 'Available');
    if (newItems.length >= 3) {
      return [...newItems]
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .slice(0, 3);
    }

    // 2. Fallback: available products sorted by creation timestamp descending
    const available = products.filter(p => p.status === 'Available');
    const sorted = [...available].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    return sorted.slice(0, 3);
  }, [products]);
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
          onOpenAdminLogin={() => handleNavigate('admin-login')}
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

          {/* In-App PWA Install Banner (Only on customer-facing storefront) */}
          {!(activeView === 'admin' && isAdminLoggedIn) && (
            <PWAInstallBanner
              onOpenModal={() => setIsAppDownloadOpen(true)}
              currentLang={currentLang}
            />
          )}

          {/* Main Storefront Header (Hidden when inside Admin Portal) */}
          {!(activeView === 'admin' && isAdminLoggedIn) && activeView !== 'admin-login' && (
            <Header
              currentLang={currentLang}
              onLanguageChange={handleLanguageChange}
              currentCurrency={currentCurrency}
              onCurrencyChange={setCurrentCurrency}
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
              onSelectProduct={(p) => handleSelectProduct(p)}
              buyerUser={buyerUser}
              onOpenBuyerAuth={() => handleNavigate('login')}
              onOpenBuyerAccount={() => setIsBuyerAccountOpen(true)}
              isAdminLoggedIn={isAdminLoggedIn}
              onOpenUploadProduct={() => handleNavigate('admin-upload')}
              onOpenCategoriesMenu={() => setIsCategoryMegaMenuOpen(true)}
              categories={categories}
              selectedCategory={selectedCategory}
              onSelectCategory={(mainId: string, subId?: string, tag?: string) => {
                setSelectedCategory(mainId);
                setSelectedSubCategory(subId || null);
                setSearchQuery(tag || '');
                handleNavigate('shop');
              }}
            />
          )}

      {/* VIEW: ADMIN LOGIN OR DASHBOARD */}
      {activeView === 'admin' || activeView === 'admin-login' ? (
        isAdminLoggedIn ? (
          <ErrorBoundary fallbackTitle="ContactReach Admin Dashboard">
            <AdminDashboard
              onLogout={handleAdminLogout}
              categories={categories}
              onRefreshPublicData={refreshAllData}
              initialTab={adminInitialTab as any}
              autoOpenAddProduct={autoOpenAddProduct}
              onNavigateToStorefront={() => handleNavigate('home')}
            />
          </ErrorBoundary>
        ) : (
          <AdminLoginPage
            onLoginSuccess={(user) => {
              setIsAdminLoggedIn(true);
              setActiveView('admin');
              if (pendingAdminAction === 'upload-product') {
                setAdminInitialTab('products');
                setAutoOpenAddProduct(true);
                setPendingAdminAction(null);
              }
              if (typeof window !== 'undefined') {
                window.history.pushState({ view: 'admin' }, '', '/admin');
              }
              showToast(`Welcome Administrator ${user?.name || ''}`);
            }}
            onNavigateHome={() => handleNavigate('home')}
          />
        )
      ) : activeView === 'login' || activeView === 'register' ? (
        /* VIEW: BUYER SIGN IN / REGISTER FULL SCREEN (Exact match to image_027b1349.png) */
        <div className="py-6 sm:py-10 px-4 max-w-6xl mx-auto flex-1 w-full flex items-center justify-center">
          <SignInPage
            initialMode={activeView === 'register' ? 'register' : 'signin'}
            onSuccess={(user) => {
              const isAdmin = isAuthorizedAdminUser(user);
              if (isAdmin) {
                setIsAdminLoggedIn(true);
                setActiveView('admin');
                if (typeof window !== 'undefined') {
                  window.history.pushState({ view: 'admin' }, '', '/admin');
                }
                showToast(`Welcome Administrator ${user.name}`);
              } else {
                setBuyerUser(user);
                handleNavigate('home');
                showToast(currentLang === 'en' ? `Welcome, ${user.name}!` : `Murakaza neza, ${user.name}!`);
              }
            }}
            onNavigateHome={() => handleNavigate('home')}
            onOpenVendorApplication={() => setIsSellerModalOpen(true)}
            currentLang={currentLang}
          />
        </div>
      ) : activeView === '404' ? (
        <NotFoundPage
          currentLang={currentLang}
          currentCurrency={currentCurrency}
          exchangeRates={exchangeRates}
          products={products}
          onNavigate={handleNavigate}
          onSelectProduct={(p) => handleSelectProduct(p)}
          onOpenAdminLogin={() => handleNavigate('admin-login')}
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
            <h2 className="text-2xl font-black text-slate-900">{t.trackOrder || 'Track Your Order Status'}</h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {currentLang === 'en'
                ? 'Enter your unique ContactReach order reference (e.g. CRM-78291) to check payment verification and delivery courier updates.'
                : 'Shyiramo nimero ya komande yawe (urugero CRM-78291) kugira ngo urebe aho igeze n\'itangizwa ry\'ubwishyu.'}
            </p>
            <button
              onClick={() => setIsTrackingOpen(true)}
              className="py-3 px-6 bg-[#FF6000] text-white font-bold text-xs rounded-xl shadow-sm hover:bg-orange-600 transition-all cursor-pointer"
            >
              {t.trackOrder || 'Open Order Tracking Search'}
            </button>
          </div>
        </div>
      ) : activeView === 'categories' ? (
        <CategoriesPage
          categories={categories}
          currentLang={currentLang}
          onNavigate={handleNavigate}
          onSelectCategory={(mainId: string, subId?: string, tag?: string) => {
            setSelectedCategory(mainId);
            setSelectedSubCategory(subId || null);
            setSearchQuery(tag || '');
            handleNavigate('shop');
          }}
        />
      ) : activeView === 'shop' ? (
        /* VIEW: ALL PRODUCTS / CATALOG (Matching Screenshot 6: Ibicuruzwa Byose) */
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-8 flex-1 w-full">
          {/* Top Bar matching Screenshot 6 */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h1 className="text-2xl font-black text-slate-900">
              {t.allProducts || (currentLang === 'en' ? 'All Products' : 'Ibicuruzwa Byose')}
            </h1>

            <div className="flex flex-wrap items-center gap-3">
              {/* Search Bar */}
              <div className="relative w-full sm:w-auto flex-1 sm:flex-initial min-w-0 sm:min-w-[240px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder={t.searchPlaceholder || "Shakisha ibicuruzwa..."}
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
                <option value="featured">Sort: Recommend</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="newest">Newest First</option>
              </select>

              <button
                onClick={() => {
                  setSelectedCategory('all');
                  setSelectedSubCategory(null);
                  setSearchQuery('');
                }}
                className="py-1.5 px-3 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
              >
                <Filter className="w-3.5 h-3.5" />
                <span>{t.allFilters || 'All filters'}</span>
              </button>
            </div>
          </div>

          {/* Active Breadcrumb & Hierarchy Status */}
          {(selectedCategory !== 'all' || selectedSubCategory || searchQuery.trim()) && (
            <div className="bg-orange-50/70 border border-orange-100 rounded-2xl p-3 mb-4 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-slate-600 flex-wrap">
                <button
                  onClick={() => {
                    setSelectedCategory('all');
                    setSelectedSubCategory(null);
                    setSearchQuery('');
                  }}
                  className="font-bold hover:text-[#FF6000] cursor-pointer"
                >
                  All Products
                </button>
                {selectedCategory !== 'all' && (
                  <>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    <button
                      onClick={() => {
                        setSelectedSubCategory(null);
                        setSearchQuery('');
                      }}
                      className="font-extrabold text-slate-900 hover:text-[#FF6000] cursor-pointer"
                    >
                      {departmentTree.find(m => m.id === selectedCategory)?.name || selectedCategory}
                    </button>
                  </>
                )}
                {selectedSubCategory && (
                  <>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-bold text-[#FF6000] bg-white px-2 py-0.5 rounded-md border border-orange-200 inline-flex items-center gap-1">
                      <span>{resolveSubCategoryLabel(selectedSubCategory, selectedCategory, categories)}</span>
                      <button
                        onClick={() => setSelectedSubCategory(null)}
                        className="text-slate-400 hover:text-slate-700 cursor-pointer"
                        title="Clear subcategory"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  </>
                )}
                {searchQuery.trim() && (
                  <>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-bold text-slate-700 bg-white px-2 py-0.5 rounded-md border border-slate-200 inline-flex items-center gap-1">
                      <span>&quot;{searchQuery.trim()}&quot;</span>
                      <button
                        onClick={() => setSearchQuery('')}
                        className="text-slate-400 hover:text-slate-700 cursor-pointer"
                        title="Clear search filter"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsCategoryMegaMenuOpen(true)}
                  className="text-[11px] font-bold text-[#FF6000] hover:underline cursor-pointer"
                >
                  Browse All Categories &rarr;
                </button>
                <button
                  onClick={() => {
                    setSelectedCategory('all');
                    setSelectedSubCategory(null);
                    setSearchQuery('');
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-600 rounded-lg text-[11px] font-bold border border-slate-200 cursor-pointer"
                >
                  Reset
                </button>
              </div>
            </div>
          )}

          {/* Main Category Filter Strip */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-3 scrollbar-none">
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSelectedSubCategory(null);
                setSearchQuery('');
              }}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {t.allProducts || 'All Products'} ({products.length})
            </button>
            {departmentTree.map((c) => {
              const isSelected = selectedCategory === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelectedCategory(c.id);
                    setSelectedSubCategory(null);
                    setSearchQuery('');
                  }}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[#FF6000] text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span>{currentLang === 'en' ? c.name : c.nameRw}</span>
                </button>
              );
            })}
          </div>

          {/* Subcategory Pills when a Main Department is active */}
          {selectedCategory !== 'all' && (() => {
            const activeDept = departmentTree.find(m => m.id === selectedCategory);
            const activeSubs = activeDept?.subcategories || [];
            if (activeSubs.length === 0) return null;
            return (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-4 mb-5 scrollbar-none animate-in fade-in duration-150">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
                  Subcategories:
                </span>
                <button
                  onClick={() => {
                    setSelectedSubCategory(null);
                    setSearchQuery('');
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    !selectedSubCategory
                      ? 'bg-[#FF6000] text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  All {activeDept?.name}
                </button>
                {activeSubs.map((sub) => {
                  const subSlug = toCategorySlug(sub.id);
                  const selectedSlug = toCategorySlug(selectedSubCategory);
                  const isSubActive = Boolean(
                    selectedSubCategory &&
                    (selectedSubCategory === sub.id ||
                      selectedSubCategory.toLowerCase() === sub.name.toLowerCase() ||
                      selectedSlug === subSlug ||
                      selectedSlug === sub.slug)
                  );
                  return (
                    <button
                      key={sub.id}
                      onClick={() => {
                        setSelectedSubCategory(sub.id);
                        setSearchQuery('');
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                        isSubActive
                          ? 'bg-[#FF6000] text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {currentLang === 'rw' && sub.nameRw ? sub.nameRw : sub.name}
                    </button>
                  );
                })}
              </div>
            );
          })()}

          {/* 6-Column Dense Grid matching Screenshot 6 */}
          {sortedProducts.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 sm:p-16 text-center text-slate-500 max-w-2xl mx-auto shadow-2xs">
              <div className="w-16 h-16 rounded-2xl bg-orange-50 border border-orange-100 text-[#FF6000] flex items-center justify-center mx-auto mb-4">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <h3 className="font-black text-lg sm:text-xl text-slate-900">
                {products.length === 0
                  ? (t.productsComingSoon || 'Catalog Fresh Arrivals Coming Soon')
                  : (t.noProductsFound || 'No products found')}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
                {products.length === 0
                  ? (currentLang === 'en'
                      ? 'Our verified supplier inventory is synced in real-time with Supabase. Fresh items will be displayed as soon as products are added.'
                      : "Ibicuruzwa bishya biri kongerwamo bivuye mu bacuruzi nyabo i Kigali no mu Rwanda.")
                  : (currentLang === 'en'
                      ? 'No items matched your current filter or search terms. Try clearing your filters.'
                      : "Nta bicuruzwa bihwanye n'ibyo ushatse. Gerageza guhindura amagambo.")}
              </p>
              {products.length > 0 && (
                <button
                  onClick={() => {
                    setSelectedCategory('all');
                    setSelectedSubCategory(null);
                    setSearchQuery('');
                  }}
                  className="mt-5 px-5 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Reset Filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
              {sortedProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onViewProduct={(p) => handleSelectProduct(p)}
                  onAddToCart={(p) => handleAddToCart(p, 1)}
                  onQuickBuy={(p) => handleQuickBuy(p, 1)}
                  isWishlisted={wishlist.includes(product.id)}
                  onToggleWishlist={handleToggleWishlist}
                  currentLang={currentLang}
                  currentCurrency={currentCurrency}
                  exchangeRates={exchangeRates}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* VIEW: HOMEPAGE (Exact match to Screenshots 1, 2, 3, 4, 5) */
        <main className="flex-1">
          {/* CATEGORIES HORIZONTAL SLIDER (Matching Screenshot 2: "Ibyiciro bihari" - 13 Departments) */}
          <section className="max-w-[1440px] mx-auto px-4 sm:px-8 py-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                  {t.categories || (currentLang === 'en' ? 'Categories' : 'Ibyiciro bihari')}
                </h2>
                <span className="text-xs text-slate-500 font-medium">
                  {currentLang === 'en' ? 'Explore all 13 product departments' : 'Reba ibyiciro byose uko ari 13'}
                </span>
              </div>
              <button
                onClick={() => setIsCategoryMegaMenuOpen(true)}
                className="text-xs font-bold text-[#FF6000] hover:text-[#e05500] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>{currentLang === 'en' ? 'All 13 Departments' : 'Ibyiciro Byose (13)'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="relative">
              <div className="flex items-center gap-3 sm:gap-4 overflow-x-auto pb-2 scrollbar-none">
                {departmentTree.map((cat, idx) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      setSelectedSubCategory(null);
                      setSearchQuery('');
                      handleNavigate('shop');
                    }}
                    className="w-32 sm:w-36 h-36 bg-white hover:bg-orange-50/50 rounded-2xl border border-slate-200/90 p-2.5 sm:p-3 flex flex-col items-center justify-between shrink-0 transition-all duration-200 hover:shadow-xs cursor-pointer group"
                  >
                    <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-slate-50 flex items-center justify-center p-1">
                      <img
                        src={cat.image}
                        alt={cat.name}
                        className="w-full h-full object-cover rounded-lg group-hover:scale-110 transition-transform duration-300"
                        loading={idx < 6 ? 'eager' : 'lazy'}
                      />
                    </div>
                    <div className="text-center w-full px-1">
                      <span className="text-xs font-bold text-slate-800 group-hover:text-[#FF6000] transition-colors block truncate">
                        {currentLang === 'en' ? cat.name : cat.nameRw}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium block">
                        {cat.subcategories.length} subcategories
                      </span>
                    </div>
                  </button>
                ))}

                {/* Arrow Button to open full 13 departments mega menu */}
                <button
                  onClick={() => setIsCategoryMegaMenuOpen(true)}
                  className="w-11 h-11 rounded-full bg-white border border-slate-300 shadow-xs flex items-center justify-center text-slate-700 hover:text-[#FF6000] shrink-0 hover:bg-slate-50 transition-colors cursor-pointer ml-1 group"
                  aria-label="View more categories"
                  title="Explore All Categories"
                >
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
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
                    {t.productsComingSoon || 'Products Coming Soon'}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-lg mx-auto leading-relaxed">
                    {currentLang === 'en'
                      ? 'ContactReach Market connects customers with vetted suppliers and wholesalers. New verified products are being added shortly.'
                      : "ContactReach Market ihuza abaguzi n'abacuruzi nyabo i Kigali no mu Rwanda hose. Ibicuruzwa bishya byizewe biri kongerwamo."}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => setIsSellerModalOpen(true)}
                    className="py-2.5 px-6 rounded-full bg-[#FF6000] hover:bg-[#E54D00] text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                  >
                    {t.sellerCta || 'Register as Supplier'}
                  </button>
                  <button
                    onClick={() => handleNavigate('contact')}
                    className="py-2.5 px-5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                  >
                    {t.contact || 'Contact Support'}
                  </button>
                </div>
              </div>
            </section>
          ) : (
            <>
              {/* RECENT ARRIVALS - STRICTLY 3 NEW PRODUCTS */}
              {recentProducts.length > 0 && (
                <section className="max-w-[1440px] mx-auto px-4 sm:px-8 py-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                      {t.recentArrivals || (currentLang === 'en' ? 'Recent Arrivals' : 'Ibije vuba')}
                    </h2>
                    <span className="text-xs text-slate-500 font-bold bg-slate-100 px-2.5 py-1 rounded-full">
                      3 {currentLang === 'en' ? 'New Products' : 'Bishya'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-6">
                    {recentProducts.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        onViewProduct={(p) => handleSelectProduct(p)}
                        onAddToCart={(p) => handleAddToCart(p, 1)}
                        onQuickBuy={(p) => handleQuickBuy(p, 1)}
                        isWishlisted={wishlist.includes(product.id)}
                        onToggleWishlist={handleToggleWishlist}
                        currentLang={currentLang}
                        currentCurrency={currentCurrency}
                        exchangeRates={exchangeRates}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* RECOMMENDATIONS SECTION */}
              {recommendedProducts.length > 0 && (
                <section className="max-w-[1440px] mx-auto px-4 sm:px-8 py-6">
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 mb-4">
                    {t.recommendedForYou || (currentLang === 'en' ? 'Recommended for You' : 'Ibindi Ukunda')}
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                    {recommendedProducts.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        onViewProduct={(p) => handleSelectProduct(p)}
                        onAddToCart={(p) => handleAddToCart(p, 1)}
                        onQuickBuy={(p) => handleQuickBuy(p, 1)}
                        isWishlisted={wishlist.includes(product.id)}
                        onToggleWishlist={handleToggleWishlist}
                        currentLang={currentLang}
                        currentCurrency={currentCurrency}
                        exchangeRates={exchangeRates}
                      />
                    ))}
                  </div>

                  {visibleRecommendedCount < products.length && (
                    <div className="text-center mt-8">
                      <button
                        onClick={() => setVisibleRecommendedCount(prev => Math.min(products.length, prev + 20))}
                        className="py-2.5 px-6 rounded-full bg-[#18191C] hover:bg-black text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                      >
                        {t.showMore || (currentLang === 'en' ? 'Show More' : 'Reba ibindi')}
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
                  {currentLang === 'en'
                    ? 'Do you have products you want to sell?'
                    : currentLang === 'rw'
                    ? 'Ufite ibicuruzwa ushaka kugurisha?'
                    : currentLang === 'fr'
                    ? 'Vous avez des produits à vendre ?'
                    : currentLang === 'sw'
                    ? 'Je, una bidhaa unazotaka kuuza?'
                    : currentLang === 'ar'
                    ? 'هل لديك منتجات ترغب في بيعها؟'
                    : currentLang === 'zh'
                    ? '您有优质商品想要入驻销售吗？'
                    : currentLang === 'es'
                    ? '¿Tienes productos que quieras vender?'
                    : currentLang === 'pt'
                    ? 'Tem produtos que deseja vender?'
                    : currentLang === 'de'
                    ? 'Haben Sie Produkte zu verkaufen?'
                    : 'क्या आपके पास बेचने के लिए उत्पाद हैं?'}
                </h3>
                <p className="text-xs text-orange-200/80">
                  {currentLang === 'en'
                    ? 'Join ContactReach Market as a verified supplier and reach buyers nationwide.'
                    : "Injira kuri ContactReach Market nk'umucuruzi ugere ku baguzi benshi."}
                </p>
              </div>

              <button
                onClick={() => setIsSellerModalOpen(true)}
                className="py-3 px-6 rounded-xl font-black text-xs sm:text-sm bg-[#FF6000] hover:bg-[#E54D00] text-white shadow-xs transition-all whitespace-nowrap cursor-pointer shrink-0"
              >
                {t.sellerCta || 'Gurisha kuri ContactReach →'}
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

      {/* FLOATING WHATSAPP SUPPORT TAB (Only for public storefront customers) */}
      {!(activeView === 'admin' && isAdminLoggedIn) && activeView !== 'admin-login' && (
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
      )}

      {/* Footer (Only on public storefront) */}
      {!(activeView === 'admin' && isAdminLoggedIn) && activeView !== 'admin-login' && (
        <Footer
          settings={settings}
          currentLang={currentLang}
          onNavigate={(view) => handleNavigate(view)}
          onOpenAdmin={() => handleNavigate('admin')}
          onRequestProduct={() => setIsRequestProductOpen(true)}
        />
      )}
      </>
      )}

      {/* MODALS */}
      {/* 1. Product Details Modal (PDP) */}
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={() => handleSelectProduct(null)}
          onAddToCart={(p, qty, variation) => {
            handleAddToCart(p, qty, variation);
            handleSelectProduct(null);
          }}
          onBuyNow={(p, qty, variation) => {
            handleQuickBuy(p, qty, variation);
          }}
          allProducts={products}
          onSelectSimilar={(p) => handleSelectProduct(p)}
          currentLang={currentLang}
          currentCurrency={currentCurrency}
          exchangeRates={exchangeRates}
        />
      )}

      {/* 2. Cart Drawer */}
      {isCartOpen && (
        <CartDrawer
          isOpen={isCartOpen}
          onClose={() => {
            setIsCartOpen(false);
            if (window.location.pathname === '/cart') {
              window.history.replaceState({ view: activeView }, '', activeView === 'home' ? '/' : `/${activeView}`);
            }
          }}
          cart={cart}
          onUpdateQuantity={handleUpdateCartQuantity}
          onRemoveItem={handleRemoveFromCart}
          onProceedToCheckout={() => setIsCheckoutOpen(true)}
          currentLang={currentLang}
          currentCurrency={currentCurrency}
          exchangeRates={exchangeRates}
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
          currentCurrency={currentCurrency}
          exchangeRates={exchangeRates}
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
          onOpenConfirmation={(order: Order) => {
            setConfirmationOrder(order);
            setIsConfirmationOpen(true);
          }}
          currentLang={currentLang}
          currentCurrency={currentCurrency}
          exchangeRates={exchangeRates}
        />
      )}

      {/* Save to Home Screen / PWA Install Modal */}
      <PWAInstallModal
        isOpen={isAppDownloadOpen}
        onClose={() => setIsAppDownloadOpen(false)}
        currentLang={currentLang}
      />


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
              onClick={() => {
                setIsSellerModalOpen(false);
                if (window.location.pathname === '/vendor' || window.location.pathname === '/sell') {
                  window.history.replaceState({ view: activeView }, '', activeView === 'home' ? '/' : `/${activeView}`);
                }
              }}
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

      {/* 10. Buyer Authentication Modal (Phone Number & Password) */}
      <BuyerAuthModal
        isOpen={isBuyerAuthOpen}
        onClose={() => setIsBuyerAuthOpen(false)}
        onSuccess={(user: CustomerUser) => {
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
          onTrackOrder={(orderRef: string) => {
            setTrackingOrderNumber(orderRef);
            setIsTrackingOpen(true);
          }}
          onOpenPaymentConfirmation={(order: Order) => {
            setConfirmationOrder(order);
            setIsConfirmationOpen(true);
          }}
          currentLang={currentLang}
          currentCurrency={currentCurrency}
          exchangeRates={exchangeRates}
        />
      )}

      {/* 12. Contact Reach Category Mega Menu */}
      <CategoryMegaMenu
        isOpen={isCategoryMegaMenuOpen}
        onClose={() => setIsCategoryMegaMenuOpen(false)}
        selectedCategory={selectedCategory}
        categories={categories}
        onSelectCategory={(mainId: string, subId?: string | null, tag?: string) => {
          setSelectedCategory(mainId);
          setSelectedSubCategory(subId || null);
          setSearchQuery(tag || '');
          handleNavigate('shop');
        }}
        currentLang={currentLang}
      />
    </div>
  );
}
