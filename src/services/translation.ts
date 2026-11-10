// Google Cloud Translation Client Service
// Integrates dynamically with Google Cloud Translation API via server-side proxy
// Caches translated strings in session memory and localStorage to minimize network usage

import { useState, useEffect } from 'react';
import { Language } from '../translations.ts';

const TRANSLATION_CACHE_KEY_PREFIX = 'crm_gtrans_';

// In-memory quick lookup cache
const memoryCache = new Map<string, string>();

/**
 * Translates a single text string from source language into target language via Google Cloud Translation.
 */
export async function translateWithGoogle(
  text: string,
  targetLang: Language,
  sourceLang: string = 'en'
): Promise<string> {
  const clean = (text || '').trim();
  if (!clean || targetLang === sourceLang) return text;

  const cacheKey = `${TRANSLATION_CACHE_KEY_PREFIX}${sourceLang}_${targetLang}_${clean}`;

  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey)!;
  }

  // Check localStorage session cache
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(cacheKey);
      if (stored) {
        memoryCache.set(cacheKey, stored);
        return stored;
      }
    } catch {}
  }

  try {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        texts: clean,
        targetLang,
        sourceLang
      })
    });

    if (res.ok) {
      const data = await res.json();
      const translated = data?.translation || clean;
      memoryCache.set(cacheKey, translated);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(cacheKey, translated);
        } catch {}
      }
      return translated;
    }
  } catch (err) {
    console.warn(`[GoogleTranslate] Error translating "${clean.slice(0, 30)}":`, err);
  }

  return text;
}

/**
 * Batch translates an array of strings in one single HTTP request via Google Cloud Translation
 */
export async function batchTranslateWithGoogle(
  texts: string[],
  targetLang: Language,
  sourceLang: string = 'en'
): Promise<string[]> {
  if (!texts || texts.length === 0 || targetLang === sourceLang) {
    return texts || [];
  }

  const results: string[] = new Array(texts.length);
  const uncachedIndices: number[] = [];
  const uncachedTexts: string[] = [];

  // Check cache first
  texts.forEach((txt, idx) => {
    const clean = (txt || '').trim();
    if (!clean) {
      results[idx] = txt;
      return;
    }

    const cacheKey = `${TRANSLATION_CACHE_KEY_PREFIX}${sourceLang}_${targetLang}_${clean}`;
    if (memoryCache.has(cacheKey)) {
      results[idx] = memoryCache.get(cacheKey)!;
      return;
    }

    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(cacheKey);
        if (stored) {
          memoryCache.set(cacheKey, stored);
          results[idx] = stored;
          return;
        }
      } catch {}
    }

    uncachedIndices.push(idx);
    uncachedTexts.push(clean);
  });

  if (uncachedTexts.length === 0) {
    return results;
  }

  try {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        texts: uncachedTexts,
        targetLang,
        sourceLang
      })
    });

    if (res.ok) {
      const data = await res.json();
      const translations: string[] = data?.translations || uncachedTexts;

      uncachedIndices.forEach((origIdx, i) => {
        const origText = uncachedTexts[i];
        const translated = translations[i] || origText;
        results[origIdx] = translated;

        const cacheKey = `${TRANSLATION_CACHE_KEY_PREFIX}${sourceLang}_${targetLang}_${origText}`;
        memoryCache.set(cacheKey, translated);
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(cacheKey, translated);
          } catch {}
        }
      });
    } else {
      // Fallback to original
      uncachedIndices.forEach((origIdx, i) => {
        results[origIdx] = uncachedTexts[i];
      });
    }
  } catch (err) {
    console.warn('[GoogleTranslate] Batch translate notice:', err);
    uncachedIndices.forEach((origIdx, i) => {
      results[origIdx] = uncachedTexts[i];
    });
  }

  return results;
}

/**
 * React hook to translate arbitrary text dynamically using Google Translation API
 */
export function useDynamicText(text: string | undefined | null, targetLang: Language): string {
  const [translated, setTranslated] = useState(text || '');

  useEffect(() => {
    if (!text) {
      setTranslated('');
      return;
    }
    if (targetLang === 'en') {
      setTranslated(text);
      return;
    }

    let cancelled = false;
    translateWithGoogle(text, targetLang).then((res) => {
      if (!cancelled && res) {
        setTranslated(res);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [text, targetLang]);

  return targetLang === 'en' ? (text || '') : (translated || text || '');
}

/**
 * React hook to dynamically translate product title, description, and category
 * Preserving the original content intact in the database while presenting the translated view.
 */
export function useProductTranslation(
  product: { name: string; description?: string; category?: string } | null | undefined,
  targetLang: Language
) {
  const [translated, setTranslated] = useState({
    name: product?.name || '',
    description: product?.description || '',
    category: product?.category || ''
  });

  useEffect(() => {
    if (!product) {
      setTranslated({ name: '', description: '', category: '' });
      return;
    }
    if (targetLang === 'en') {
      setTranslated({
        name: product.name || '',
        description: product.description || '',
        category: product.category || ''
      });
      return;
    }

    let cancelled = false;
    const texts = [product.name || '', product.description || '', product.category || ''];
    batchTranslateWithGoogle(texts, targetLang).then(([tName, tDesc, tCat]) => {
      if (!cancelled) {
        setTranslated({
          name: tName || product.name,
          description: tDesc || product.description || '',
          category: tCat || product.category || ''
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [product?.name, product?.description, product?.category, targetLang]);

  return targetLang === 'en'
    ? {
        name: product?.name || '',
        description: product?.description || '',
        category: product?.category || ''
      }
    : translated;
}

