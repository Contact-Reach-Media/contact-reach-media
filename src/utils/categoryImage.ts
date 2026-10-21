import { Category, Product } from '../types.ts';

// High quality curated category fallbacks if a newly created category does not yet have listed products
const CATEGORY_DEFAULT_IMAGES: Record<string, string> = {
  'hair-beauty': '/src/assets/images/product_hair_curl_cream_1791966366308.jpg',
  'electronics': '/src/assets/images/product_smart_tv_audio_1791966367526.jpg',
  'fashion': '/src/assets/images/product_street_sneakers_1791966366958.jpg',
  'amatara': '/src/assets/images/hero_phone_order_tracking_1791969659929.jpg',
  'impano': '/src/assets/images/hero_marketplace_shopper_1791966365592.jpg',
  'abana': '/src/assets/images/hero_phone_order_tracking_1791969659929.jpg',
  'amasaha': '/src/assets/images/product_smart_tv_audio_1791966367526.jpg',
  'ibikapu': '/src/assets/images/product_street_sneakers_1791966366958.jpg',
  'sports': '/src/assets/images/product_street_sneakers_1791966366958.jpg',
  'books': '/src/assets/images/phone_order_tracking_hero_1791972613582.jpg',
};

/**
 * Returns the effective category image.
 * 1. If admin customized the category image (category.imageUrl is set), use it.
 * 2. Otherwise, automatically pick the image from the first listed product in this category.
 * 3. If no products are listed yet in this category, use a clean curated default.
 */
export function getCategoryCoverImage(category: Category, products: Product[] = []): string {
  if (category.imageUrl && category.imageUrl.trim().length > 0) {
    return category.imageUrl.trim();
  }

  // Find first product in this category with an image
  const matchingProduct = products.find(
    p => p.category === category.id && p.status !== 'Hidden' && (p.imageUrl || (p.images && p.images.length > 0))
  );

  if (matchingProduct) {
    return matchingProduct.imageUrl || matchingProduct.images?.[0] || '';
  }

  return CATEGORY_DEFAULT_IMAGES[category.id] || '/src/assets/images/hero_marketplace_shopper_1791966365592.jpg';
}

/**
 * Returns details about whether the category image is auto-derived or customized.
 */
export function getCategoryImageSource(category: Category, products: Product[] = []): {
  isCustom: boolean;
  image: string;
  sourceLabel: string;
} {
  if (category.imageUrl && category.imageUrl.trim().length > 0) {
    return {
      isCustom: true,
      image: category.imageUrl.trim(),
      sourceLabel: 'Custom image uploaded or set by Admin'
    };
  }

  const matchingProduct = products.find(
    p => p.category === category.id && p.status !== 'Hidden' && (p.imageUrl || (p.images && p.images.length > 0))
  );

  if (matchingProduct) {
    return {
      isCustom: false,
      image: matchingProduct.imageUrl || matchingProduct.images?.[0] || '',
      sourceLabel: `Auto-selected from product "${matchingProduct.name}"`
    };
  }

  return {
    isCustom: false,
    image: CATEGORY_DEFAULT_IMAGES[category.id] || '/src/assets/images/hero_marketplace_shopper_1791966365592.jpg',
    sourceLabel: 'Default marketplace placeholder (no listed products yet)'
  };
}
