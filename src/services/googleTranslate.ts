// Google Cloud Translation Client-Side Orchestrator
// Bridges Google's official Website Translation element with custom UI & DOM Translation Engine

import { getLanguageByCode } from '../data/languages.ts';

declare global {
  interface Window {
    google?: any;
    googleTranslateElementInit?: () => void;
    __crmGoogleTranslateActive?: boolean;
    __crmCurrentLang?: string;
  }
}

const STORAGE_LANG_KEY = 'crm_lang';

/**
 * Initializes the official Google Website Translation script silently in the background
 */
export function initGoogleTranslateScript(): void {
  if (typeof window === 'undefined') return;

  // Setup the global callback for Google Translate
  window.googleTranslateElementInit = function () {
    try {
      if (window.google && window.google.translate && window.google.translate.TranslateElement) {
        new window.google.translate.TranslateElement(
          {
            pageLanguage: 'en',
            autoDisplay: false,
            layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE
          },
          'google_translate_element'
        );
        window.__crmGoogleTranslateActive = true;
      }
    } catch (e) {
      console.warn('[GoogleTranslateInit] Warning:', e);
    }
  };

  // Check if script tag already exists
  if (!document.getElementById('google-translate-script')) {
    const script = document.createElement('script');
    script.id = 'google-translate-script';
    script.type = 'text/javascript';
    script.async = true;
    script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    script.onerror = () => {
      console.warn('[GoogleTranslate] Google Translate element script could not be loaded directly. Relying on backend Google Cloud Translation API proxy.');
    };
    document.head.appendChild(script);
  }
}

/**
 * Sets the website language dynamically through Google Translate Element & Cookies
 */
export function setGoogleTranslateLanguage(targetLang: string): void {
  if (typeof window === 'undefined') return;

  const cleanLang = (targetLang || 'en').trim();
  window.__crmCurrentLang = cleanLang;

  // Store in localStorage
  try {
    localStorage.setItem(STORAGE_LANG_KEY, cleanLang);
  } catch {}

  const langObj = getLanguageByCode(cleanLang);

  // Set document attributes
  document.documentElement.lang = cleanLang;
  document.documentElement.dir = langObj.dir || 'ltr';

  // 1. Reset to Original English
  if (cleanLang === 'en') {
    // Clear Google cookies
    const host = window.location.hostname;
    document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${host};`;
    document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${host};`;

    // Reset Google's select dropdown if present
    const select = document.querySelector('.goog-te-combo') as HTMLSelectElement | null;
    if (select) {
      select.value = '';
      select.dispatchEvent(new Event('change'));
    }

    // Dispatch global event for React components and DOM translator
    window.dispatchEvent(new CustomEvent('crm_language_changed', { detail: { lang: 'en', isOriginal: true } }));
    return;
  }

  // 2. Set Google Translate Cookie
  const host = window.location.hostname;
  document.cookie = `googtrans=/en/${cleanLang}; path=/;`;
  document.cookie = `googtrans=/en/${cleanLang}; path=/; domain=${host};`;
  if (host.includes('.')) {
    document.cookie = `googtrans=/en/${cleanLang}; path=/; domain=.${host};`;
  }

  // Trigger Google's combo dropdown if loaded
  const select = document.querySelector('.goog-te-combo') as HTMLSelectElement | null;
  if (select) {
    select.value = cleanLang;
    select.dispatchEvent(new Event('change'));
  }

  // Dispatch global event for React components & DOM translator
  window.dispatchEvent(new CustomEvent('crm_language_changed', { detail: { lang: cleanLang, isOriginal: false } }));
}

/**
 * Automatically detects the visitor's preferred language from browser settings
 */
export function detectVisitorLanguage(): string {
  if (typeof window === 'undefined' || !navigator) return 'en';

  const navLang = navigator.language || (navigator.languages && navigator.languages[0]) || 'en';
  const primaryCode = navLang.split('-')[0].toLowerCase();

  // If the browser language is already supported, return it
  const match = getLanguageByCode(primaryCode);
  return match.code !== 'en' ? match.code : primaryCode;
}
