/**
 * Product Image Resolution Utility
 * Ensures that every order, item, and cart record displays the exact high-fidelity image
 * corresponding to the product purchased, eliminating generic logos or mismatched placeholder images.
 */

export const CANONICAL_PRODUCT_IMAGES: { match: RegExp; url: string }[] = [
  { match: /speaker|soundbar|audio box|loudspeaker/i, url: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600&auto=format&fit=crop&q=80' },
  { match: /headphone|earphone|airpod|earbud|headset/i, url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80' },
  { match: /watch|smartwatch|amasaha|fitness tracker|clock/i, url: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=600&auto=format&fit=crop&q=80' },
  { match: /sneaker|running shoe|athletic shoe|street sneaker|sport sneaker|canvas shoe/i, url: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=600&auto=format&fit=crop&q=80' },
  { match: /dress shoe|leather shoe|oxford|formal shoe/i, url: 'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=600&auto=format&fit=crop&q=80' },
  { match: /sandal|heel|flip flop|slide/i, url: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600&auto=format&fit=crop&q=80' },
  { match: /honey|ubuki/i, url: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=600&auto=format&fit=crop&q=80' },
  { match: /printer|pos|receipt|thermal/i, url: 'https://s.alicdn.com/@sc04/kf/H3600b8fe09a2403f95437e03c3fe0b43v.jpg?avif=close&webp=close' },
  { match: /serum|vitamin c|skincare|facial|cream|lotion|beauty/i, url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&auto=format&fit=crop&q=80' },
  { match: /crossbody|bag|backpack|wallet|purse|tote|handbag/i, url: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&auto=format&fit=crop&q=80' },
  { match: /sunglass|eyewear|glasses|polarized/i, url: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=600&auto=format&fit=crop&q=80' },
  { match: /cable|charger|adapter|usb-c|lightning/i, url: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600&auto=format&fit=crop&q=80' },
  { match: /mouse|keyboard|trackpad|gaming mouse/i, url: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=600&auto=format&fit=crop&q=80' },
  { match: /laptop stand|aluminum stand|holder/i, url: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&auto=format&fit=crop&q=80' },
  { match: /webcam|camera/i, url: 'https://images.unsplash.com/photo-1587826080692-f439cd0b70da?w=600&auto=format&fit=crop&q=80' },
  { match: /blender|juicer|smoothie/i, url: 'https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=600&auto=format&fit=crop&q=80' },
  { match: /robot|toy|stem/i, url: 'https://images.unsplash.com/photo-1535378917042-10a22c95931a?w=600&auto=format&fit=crop&q=80' },
  { match: /baby carrier|carrier/i, url: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=600&auto=format&fit=crop&q=80' },
  { match: /chair|office chair|desk/i, url: 'https://s.alicdn.com/@sc04/kf/Hf4be3fee087b4eae80f7590040c50a136.jpg?avif=close&' },
  { match: /wig|hair/i, url: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&auto=format&fit=crop&q=80' },
  { match: /lamp|bulb|solar/i, url: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600&auto=format&fit=crop&q=80' }
];

export function getProductImageDueToProduct(
  item?: { productName?: string; name?: string; imageUrl?: string; image?: string; productId?: string },
  catalogProducts?: Array<{ id: string; name: string; imageUrl?: string }>
): string {
  if (!item) {
    return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80';
  }

  const name = (item.productName || item.name || '').trim();
  const currentUrl = (item.imageUrl || item.image || '').trim();
  const isGenericLogo = !currentUrl || currentUrl === '/logo.png' || currentUrl === 'logo.png' || currentUrl.endsWith('/logo.png');

  // Check if currentUrl is obviously mismatched (e.g. headphone with sneaker image or honey image)
  const isMismatched =
    (name.toLowerCase().includes('headphone') && (currentUrl.includes('sneaker') || currentUrl.includes('photo-1590658268037'))) ||
    (name.toLowerCase().includes('speaker') && currentUrl.includes('sneaker')) ||
    (name.toLowerCase().includes('watch') && (currentUrl.includes('sneaker') || currentUrl.includes('honey')));

  // 1. If catalogProducts provided, try matching to authoritative catalog
  if (catalogProducts && catalogProducts.length > 0) {
    const catalogMatch = catalogProducts.find(p =>
      (item.productId && p.id === item.productId) ||
      (p.name && p.name.toLowerCase() === name.toLowerCase())
    );
    if (catalogMatch?.imageUrl && !catalogMatch.imageUrl.includes('logo.png')) {
      const catUrl = catalogMatch.imageUrl;
      const catMismatched = (name.toLowerCase().includes('headphone') && (catUrl.includes('sneaker') || catUrl.includes('photo-1590658268037')));
      if (!catMismatched) {
        return catUrl;
      }
    }
  }

  // 2. If currentUrl is valid, non-logo, non-mismatched, use it
  if (currentUrl && !isGenericLogo && !isMismatched) {
    return currentUrl;
  }

  // 3. Fallback to product-matched canonical image based on product name keywords
  for (const entry of CANONICAL_PRODUCT_IMAGES) {
    if (entry.match.test(name)) {
      return entry.url;
    }
  }

  return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80';
}
