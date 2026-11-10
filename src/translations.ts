// Dynamic Google-Powered Translation Engine
// Replaces static hardcoded dictionaries with dynamic translation via Google Cloud Translation API.
// English (en) is the canonical source language; all target languages are dynamically translated.

import { batchTranslateWithGoogle } from './services/translation.ts';

import { GOOGLE_LANGUAGES, GoogleLanguage, getLanguageByCode } from './data/languages.ts';

export type Language = string;

export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  dir: 'ltr' | 'rtl';
  region?: string;
  popular?: boolean;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = GOOGLE_LANGUAGES;

export interface TranslationDictionary {
  // Top Bar
  helpLine: string;
  getMobileApp: string;
  sellerCta: string;
  // Nav
  home: string;
  shop: string;
  categories: string;
  shops: string;
  howToBuy: string;
  contact: string;
  trackOrder: string;
  adminLogin: string;
  searchPlaceholder: string;
  cart: string;
  // Slogan & Hero
  slogan: string;
  heroTitle: string;
  heroSubtitle: string;
  shopNow: string;
  exploreCategories: string;
  // Trust badges
  fastDelivery: string;
  fastDeliverySub: string;
  momoPayment: string;
  momoPaymentSub: string;
  genuineProducts: string;
  genuineProductsSub: string;
  support24: string;
  support24Sub: string;
  // Sections
  availableCategories: string;
  featuredProducts: string;
  recentlyAdded: string;
  similarProducts: string;
  viewProduct: string;
  buyNow: string;
  addToCart: string;
  inStock: string;
  outOfStock: string;
  itemsAvailable: string;
  freeDeliveryNote: string;
  returnDelivery: string;
  returnDeliveryText: string;
  // Checkout & Payment
  checkoutTitle: string;
  orderSummary: string;
  subtotal: string;
  deliveryFee: string;
  totalAmount: string;
  choosePaymentMethod: string;
  payWithMtn: string;
  payWithAirtel: string;
  receiverName: string;
  paymentNumber: string;
  amountToPay: string;
  ussdCode: string;
  dialUssdNow: string;
  copyCode: string;
  codeCopied: string;
  iHaveAlreadyPaid: string;
  // Confirmation Form
  paymentConfirmationTitle: string;
  paymentConfirmationSub: string;
  customerName: string;
  paymentPhone: string;
  transactionId: string;
  transactionIdPlaceholder: string;
  amountPaid: string;
  uploadProof: string;
  uploadScreenshot: string;
  pasteSmsConfirmation: string;
  pasteSmsPlaceholder: string;
  submitConfirmation: string;
  submitting: string;
  whatsappAssistance: string;
  // Order Status
  awaitingPayment: string;
  paymentUnderReview: string;
  paymentConfirmed: string;
  processing: string;
  readyForDelivery: string;
  completed: string;
  cancelled: string;
  // Footer
  company: string;
  aboutUs: string;
  termsConditions: string;
  privacyPolicy: string;
  customerCare: string;
  hours: string;
  allRightsReserved: string;
  // Selectors & Modals additions
  language: string;
  currency: string;
  selectLanguage: string;
  selectCurrency: string;
  currencyNotice: string;
  baseSettlementNotice: string;
  myAccount: string;
  signIn: string;
  signInRegister: string;
  signOut: string;
  wishlist: string;
  emptyCart: string;
  continueShopping: string;
  proceedToCheckout: string;
  soldOut: string;
  photos: string;
  video: string;
  rebaIbindi: string;
  allStores: string;
  verifiedStores: string;
  backToHome: string;
  pageNotFound: string;
  pageNotFoundDesc: string;
  maintenanceTitle: string;
  maintenanceDesc: string;
  allProducts?: string;
  allFilters?: string;
  noProductsFound?: string;
  productsComingSoon?: string;
  recentArrivals?: string;
  recommendedForYou?: string;
  showMore?: string;
}

// Canonical source UI strings (Base English)
export const BASE_ENGLISH_DICTIONARY: TranslationDictionary = {
  helpLine: 'HELP LINE: +250 780 022 600',
  getMobileApp: 'Get the Mobile App',
  sellerCta: 'Sell on ContactReach',
  home: 'Home',
  shop: 'Shop All',
  categories: 'Categories',
  shops: 'Stores',
  howToBuy: 'How to Buy',
  contact: 'Contact Us',
  trackOrder: 'Track Order',
  adminLogin: 'Admin Portal',
  searchPlaceholder: 'Search products, brands, or categories...',
  cart: 'Cart',
  slogan: 'Discover Products. Pay Easily. Shop with Confidence.',
  heroTitle: 'Best Prices in Kigali, Direct to Your Doorstep',
  heroSubtitle: 'Enjoy genuine quality cosmetics, tech, fashion, and home essentials with verified MTN MoMo and Airtel Money payments.',
  shopNow: 'Shop Now',
  exploreCategories: 'Explore Categories',
  fastDelivery: 'Fast Delivery',
  fastDeliverySub: 'Kigali within 24h & Countrywide',
  momoPayment: 'Mobile Money Payments',
  momoPaymentSub: 'MTN MoMo & Airtel Money',
  genuineProducts: '100% Genuine Quality',
  genuineProductsSub: 'Inspected before dispatch',
  support24: 'WhatsApp Support',
  support24Sub: 'Direct help on +250 780 022 600',
  availableCategories: 'Available Categories',
  featuredProducts: 'Featured Products',
  recentlyAdded: 'Recently Added',
  similarProducts: 'Similar Items You Might Also Like',
  viewProduct: 'View Product',
  buyNow: 'Buy Now',
  addToCart: 'Add to Cart',
  inStock: 'In Stock',
  outOfStock: 'Out of Stock',
  itemsAvailable: 'items available',
  freeDeliveryNote: 'Delivery calculated at checkout',
  returnDelivery: 'Return Delivery',
  returnDeliveryText: '24-hour verification & return policy if not satisfied with item condition.',
  checkoutTitle: 'Checkout & Payment',
  orderSummary: 'Order Summary',
  subtotal: 'Subtotal',
  deliveryFee: 'Delivery Fee',
  totalAmount: 'Total Amount',
  choosePaymentMethod: 'Select Mobile Money Method',
  payWithMtn: 'Pay with MTN MoMo',
  payWithAirtel: 'Pay with Airtel Money',
  receiverName: 'Receiver Name',
  paymentNumber: 'Payment Number',
  amountToPay: 'Amount to Pay',
  ussdCode: 'USSD Payment Code',
  dialUssdNow: 'Dial USSD Code on Phone',
  copyCode: 'Copy Payment Code',
  codeCopied: 'USSD Code Copied!',
  iHaveAlreadyPaid: 'I Have Already Paid',
  paymentConfirmationTitle: 'Submit Payment Confirmation',
  paymentConfirmationSub: 'Please enter the mobile money transaction ID and details so our team can verify your payment immediately.',
  customerName: 'Customer Full Name',
  paymentPhone: 'Phone Number Used to Pay',
  transactionId: 'Transaction ID / Reference',
  transactionIdPlaceholder: 'e.g. 192847581 from MTN or Airtel SMS',
  amountPaid: 'Amount Paid (FRW)',
  uploadProof: 'Attach Screenshot / Receipt (Optional)',
  uploadScreenshot: 'Upload Payment Screenshot',
  pasteSmsConfirmation: 'Paste SMS / Confirmation Message',
  pasteSmsPlaceholder: 'Paste the mobile money SMS confirmation message received from MTN MoMo or Airtel Money here...',
  submitConfirmation: 'Submit Payment Confirmation',
  submitting: 'Submitting Confirmation...',
  whatsappAssistance: 'Chat on WhatsApp for Payment Help',
  awaitingPayment: 'Awaiting Payment',
  paymentUnderReview: 'Payment Under Review',
  paymentConfirmed: 'Payment Confirmed',
  processing: 'Processing',
  readyForDelivery: 'Ready for Delivery',
  completed: 'Completed',
  cancelled: 'Cancelled',
  company: 'Company',
  aboutUs: 'About Us',
  termsConditions: 'Terms & Conditions',
  privacyPolicy: 'Privacy Policy',
  customerCare: 'Customer Care',
  hours: 'Monday – Sunday: 8:00 AM – 9:00 PM',
  allRightsReserved: 'All rights reserved. Powered by ContactReach Media Ltd.',
  language: 'Language',
  currency: 'Currency',
  selectLanguage: 'Select Language',
  selectCurrency: 'Select Currency',
  currencyNotice: 'Prices shown in chosen currency are converted for reference. Checkout is settled in Rwandan Francs (FRW).',
  baseSettlementNotice: 'Official Settlement Amount: ',
  myAccount: 'My Account',
  signIn: 'Sign In',
  signInRegister: 'Sign In / Register',
  signOut: 'Sign Out',
  wishlist: 'Wishlist',
  emptyCart: 'Your cart is empty',
  continueShopping: 'Continue Shopping',
  proceedToCheckout: 'Proceed to Checkout',
  soldOut: 'Sold out',
  photos: 'photos',
  video: 'Video',
  rebaIbindi: 'Load More Products',
  allStores: 'All Verified Stores',
  verifiedStores: 'Explore trusted retail partners across Kigali',
  backToHome: 'Back to Home',
  pageNotFound: 'Page Not Found',
  pageNotFoundDesc: 'The page you requested could not be found. Please return to the homepage or search our catalog.',
  maintenanceTitle: 'Under Maintenance',
  maintenanceDesc: 'We are performing scheduled enhancements to bring you a better shopping experience. We will be back shortly.',
  allProducts: 'All Products',
  allFilters: 'All Categories',
  noProductsFound: 'No products found',
  productsComingSoon: 'New products coming soon',
  recentArrivals: 'Recent Arrivals',
  recommendedForYou: 'Recommended for You',
  showMore: 'Show More'
};

// In-memory dynamic translation cache for UI dictionaries
const dynamicDictionaryCache = new Map<Language, TranslationDictionary>();
dynamicDictionaryCache.set('en', BASE_ENGLISH_DICTIONARY);

// Listeners for when dynamic translation completes
type TranslationListener = (lang: Language, dictionary: TranslationDictionary) => void;
const translationListeners = new Set<TranslationListener>();

export function subscribeToTranslationUpdates(listener: TranslationListener): () => void {
  translationListeners.add(listener);
  return () => translationListeners.delete(listener);
}

/**
 * Loads and returns dynamic Google Cloud translations for the given language.
 * Initiates an asynchronous batch request if not already cached.
 */
export async function loadLanguageTranslations(lang: Language): Promise<TranslationDictionary> {
  if (lang === 'en') {
    return BASE_ENGLISH_DICTIONARY;
  }

  if (dynamicDictionaryCache.has(lang)) {
    return dynamicDictionaryCache.get(lang)!;
  }

  // Check localStorage for saved dynamic translation
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(`crm_dyn_dict_${lang}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          dynamicDictionaryCache.set(lang, parsed);
          return parsed;
        }
      }
    } catch {}
  }

  // Extract all keys and English values from the base dictionary
  const keys = Object.keys(BASE_ENGLISH_DICTIONARY) as Array<keyof TranslationDictionary>;
  const values = keys.map(k => BASE_ENGLISH_DICTIONARY[k] || '');

  try {
    const translatedValues = await batchTranslateWithGoogle(values, lang, 'en');
    const newDict: Partial<TranslationDictionary> = {};

    keys.forEach((key, idx) => {
      newDict[key] = translatedValues[idx] || BASE_ENGLISH_DICTIONARY[key] || '';
    });

    const fullDict = newDict as TranslationDictionary;
    dynamicDictionaryCache.set(lang, fullDict);

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`crm_dyn_dict_${lang}`, JSON.stringify(fullDict));
      } catch {}
    }

    // Notify active subscribers to re-render with translated UI
    translationListeners.forEach(listener => listener(lang, fullDict));

    return fullDict;
  } catch (err) {
    console.warn(`[GoogleTranslate] Could not load dynamic dictionary for ${lang}:`, err);
    return BASE_ENGLISH_DICTIONARY;
  }
}

/**
 * Backward-compatible translations object proxy.
 * If translations[lang] is accessed, it returns the dynamically translated dictionary
 * (or base English while translation streams in).
 */
export const translations = new Proxy({} as Record<Language, TranslationDictionary>, {
  get(_target, prop: string) {
    const lang = prop as Language;
    if (dynamicDictionaryCache.has(lang)) {
      return dynamicDictionaryCache.get(lang);
    }
    // Kick off background translation load
    if (typeof window !== 'undefined' && lang !== 'en') {
      loadLanguageTranslations(lang).catch(() => {});
    }
    return BASE_ENGLISH_DICTIONARY;
  }
});

/**
 * Returns localized category title dynamically translated via Google
 */
const categoryTranslationCache = new Map<string, string>();

export function getCategoryTitle(
  category: { id?: string; nameEn?: string; nameRw?: string; name?: string } | string,
  lang: Language
): string {
  if (!category) return '';
  const rawTitle = typeof category === 'string'
    ? category
    : (category.name || category.nameEn || category.id || '');

  if (!rawTitle) return '';
  const titleFormatted = rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1);
  if (lang === 'en') return titleFormatted;

  const cacheKey = `${lang}:${rawTitle.toLowerCase()}`;
  if (categoryTranslationCache.has(cacheKey)) {
    return categoryTranslationCache.get(cacheKey)!;
  }

  // Trigger dynamic Google translation in background
  if (typeof window !== 'undefined') {
    batchTranslateWithGoogle([titleFormatted], lang, 'en').then(res => {
      if (res && res[0]) {
        categoryTranslationCache.set(cacheKey, res[0]);
      }
    }).catch(() => {});
  }

  return titleFormatted;
}
