import type { OrderItem, OrderItemProductSnapshot, Product, ProductVariation } from '../types.ts';
import {
  calculateProductShippingUnitCost,
  getEffectiveDiscountPercent,
  getEffectiveUnitPrice,
  getMinOrderQuantity
} from './shippingCalculator.ts';

function extractAttributeValues(
  attributes: Product['attributes'] | undefined,
  pattern: RegExp
): string[] {
  if (!attributes) return [];
  const results: string[] = [];
  if (Array.isArray(attributes)) {
    for (const entry of attributes) {
      if (entry && pattern.test(String(entry.label || ''))) {
        String(entry.value || '')
          .split(/[,/|]+/)
          .map(v => v.trim())
          .filter(Boolean)
          .forEach(v => results.push(v));
      }
    }
  } else if (typeof attributes === 'object') {
    for (const [k, val] of Object.entries(attributes)) {
      if (pattern.test(k) && val !== null && val !== undefined) {
        String(val)
          .split(/[,/|]+/)
          .map(v => v.trim())
          .filter(Boolean)
          .forEach(v => results.push(v));
      }
    }
  }
  return Array.from(new Set(results));
}

function extractVariationOptions(
  variations: ProductVariation[] | undefined,
  attributes: Product['attributes'] | undefined,
  pattern: RegExp
): string[] {
  const opts: string[] = [];
  if (Array.isArray(variations)) {
    for (const v of variations) {
      if (v && v.name && pattern.test(v.name) && Array.isArray(v.options)) {
        for (const opt of v.options) {
          const clean = String(opt || '').trim();
          if (clean) opts.push(clean);
        }
      }
    }
  }
  for (const attrVal of extractAttributeValues(attributes, pattern)) {
    opts.push(attrVal);
  }
  return Array.from(new Set(opts));
}

function findSelectedVariationValue(
  variation: string | Record<string, any> | undefined,
  pattern: RegExp
): string | undefined {
  if (!variation || typeof variation !== 'object') return undefined;
  for (const [k, v] of Object.entries(variation)) {
    if (pattern.test(k) && v !== null && v !== undefined && String(v).trim() !== '') {
      return String(v).trim();
    }
  }
  return undefined;
}

export function normalizeSnapshotImages(primary?: string, gallery?: string[]): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];
  const pushImg = (u?: string) => {
    const clean = typeof u === 'string' ? u.trim() : '';
    if (!clean || clean === '/logo.png' || clean === 'logo.png' || seen.has(clean)) return;
    seen.add(clean);
    ordered.push(clean);
  };
  pushImg(primary);
  if (Array.isArray(gallery)) {
    gallery.forEach(pushImg);
  }
  if (ordered.length === 0 && primary && primary.trim()) {
    ordered.push(primary.trim());
  }
  return ordered;
}

export function buildOrderItemWithSnapshot(params: {
  product?: Partial<Product> | null;
  itemInput?: Record<string, any> | null;
  quantity: number;
  unitPriceOverride?: number;
  unitShippingOverride?: number;
  resolvedImageUrl?: string;
  isOutOfStock?: boolean;
}): OrderItem {
  const prod = params.product || {};
  const input = params.itemInput || {};
  const existingSnap: Partial<OrderItemProductSnapshot> =
    (input.productSnapshot && typeof input.productSnapshot === 'object') ? input.productSnapshot : {};

  const qty = Math.max(1, Math.floor(Number(params.quantity ?? input.quantity) || 1));
  const rawPrice = Math.max(
    0,
    Math.round(
      Number(prod.price ?? existingSnap.originalPrice ?? input.originalPrice ?? input.price ?? params.unitPriceOverride) || 0
    )
  );
  const unitPrice = Math.max(
    0,
    Math.round(
      params.unitPriceOverride !== undefined
        ? params.unitPriceOverride
        : prod.price !== undefined
        ? getEffectiveUnitPrice(prod as Product, qty)
        : (Number(input.price ?? existingSnap.price) || rawPrice)
    )
  );
  const originalPrice = Math.max(unitPrice, rawPrice);
  const discountPercent =
    prod.price !== undefined
      ? getEffectiveDiscountPercent(prod as Product)
      : Number(input.discountPercent ?? existingSnap.discountPercent) ||
        (originalPrice > unitPrice && originalPrice > 0
          ? Math.round(((originalPrice - unitPrice) / originalPrice) * 100)
          : 0);
  const discountPrice =
    typeof prod.discountPrice === 'number' && prod.discountPrice > 0
      ? Math.round(prod.discountPrice)
      : unitPrice < originalPrice
      ? unitPrice
      : (typeof input.discountPrice === 'number' ? Math.round(input.discountPrice) : existingSnap.discountPrice);
  const discountAmount = Math.max(0, (originalPrice - unitPrice) * qty);

  const unitShippingCost = Math.max(
    0,
    Math.round(
      params.unitShippingOverride !== undefined
        ? params.unitShippingOverride
        : prod.price !== undefined
        ? calculateProductShippingUnitCost(prod as Product, unitPrice)
        : Number(input.unitShippingCost ?? existingSnap.unitShippingCost ?? prod.shippingCost) || 0
    )
  );
  const totalShippingCost = unitShippingCost * qty;

  const minOrderQuantity = Math.max(
    1,
    Math.floor(
      Number(
        prod.minOrderQuantity ??
        input.minOrderQuantity ??
        existingSnap.minOrderQuantity ??
        getMinOrderQuantity(prod as Product)
      ) || 1
    )
  );

  const primaryImg = (
    params.resolvedImageUrl ||
    prod.imageUrl ||
    existingSnap.imageUrl ||
    input.imageUrl ||
    (Array.isArray(prod.images) && prod.images[0]) ||
    '/logo.png'
  ).trim();
  const images = normalizeSnapshotImages(
    primaryImg,
    [
      ...(Array.isArray(prod.images) ? prod.images : []),
      ...(Array.isArray(existingSnap.images) ? existingSnap.images : []),
      ...(Array.isArray(input.images) ? input.images : [])
    ]
  );

  const variation = input.variation ?? input.selectedVariation ?? existingSnap.selectedVariation;
  const variations = Array.isArray(prod.variations) && prod.variations.length > 0
    ? prod.variations
    : (Array.isArray(input.variations) ? input.variations : existingSnap.variations);
  const attributes = prod.attributes ?? input.attributes ?? existingSnap.attributes;

  const sizes = Array.from(new Set([
    ...extractVariationOptions(variations, attributes, /size|taille/i),
    ...(Array.isArray(input.sizes) ? input.sizes : []),
    ...(Array.isArray(existingSnap.sizes) ? existingSnap.sizes : [])
  ].filter(Boolean)));
  const colors = Array.from(new Set([
    ...extractVariationOptions(variations, attributes, /colou?r|ibara/i),
    ...(Array.isArray(input.colors) ? input.colors : []),
    ...(Array.isArray(existingSnap.colors) ? existingSnap.colors : [])
  ].filter(Boolean)));
  const productStorage = (prod.storage || input.storage || existingSnap.storage || '').trim() || undefined;
  const storageOptions = Array.from(new Set([
    ...extractVariationOptions(variations, attributes, /storage|capacity|memory|rom|ram/i),
    ...(productStorage ? [productStorage] : []),
    ...(Array.isArray(input.storageOptions) ? input.storageOptions : []),
    ...(Array.isArray(existingSnap.storageOptions) ? existingSnap.storageOptions : [])
  ].filter(Boolean)));

  const selectedSize =
    findSelectedVariationValue(variation, /size|taille/i) ||
    input.size ||
    existingSnap.size ||
    undefined;
  const selectedColor =
    findSelectedVariationValue(variation, /colou?r|ibara/i) ||
    input.color ||
    existingSnap.color ||
    undefined;
  const selectedStorage =
    findSelectedVariationValue(variation, /storage|capacity|memory|rom|ram/i) ||
    input.selectedStorage ||
    existingSnap.selectedStorage ||
    productStorage ||
    undefined;

  const productId = String(prod.id || input.productId || existingSnap.productId || '');
  const productName = String(prod.name || input.productName || input.name || existingSnap.productName || 'Marketplace Product');
  const sku = (prod.sku || input.sku || existingSnap.sku || undefined) as string | undefined;
  const brand = (prod.brand || input.brand || existingSnap.brand || undefined) as string | undefined;
  const description = (prod.description ?? input.description ?? existingSnap.description ?? '') as string;
  const unit = (prod.unit || input.unit || existingSnap.unit || 'Piece') as string;
  const category = (prod.category || input.category || existingSnap.category || undefined) as string | undefined;
  const categoryName = (prod.categoryName || input.categoryName || existingSnap.categoryName || category || undefined) as string | undefined;
  const subcategory = (prod.subcategory || input.subcategory || existingSnap.subcategory || undefined) as string | undefined;
  const subCategoryName = (prod.subCategoryName || input.subCategoryName || existingSnap.subCategoryName || subcategory || undefined) as string | undefined;
  const shopId = (prod.shopId || input.shopId || existingSnap.shopId || undefined) as string | undefined;
  const shopName = (prod.shopName || input.shopName || existingSnap.shopName || undefined) as string | undefined;
  const supplierName = (prod.supplierName || input.supplierName || existingSnap.supplierName || shopName || undefined) as string | undefined;
  const specifications = (prod.specifications || input.specifications || existingSnap.specifications || undefined) as string | undefined;
  const packagingInfo = (prod.packagingInfo || input.packagingInfo || existingSnap.packagingInfo || undefined) as string | undefined;
  const capturedAt = existingSnap.capturedAt || input.capturedAt || new Date().toISOString();

  const snapshot: OrderItemProductSnapshot = {
    productId,
    productName,
    sku,
    brand,
    imageUrl: images[0] || primaryImg,
    images,
    description,
    price: unitPrice,
    originalPrice,
    costPrice: typeof prod.costPrice === 'number' ? prod.costPrice : input.costPrice,
    discountPercent,
    discountPrice,
    discountAmount,
    quantity: qty,
    unit,
    minOrderQuantity,
    shippingCost: totalShippingCost,
    unitShippingCost,
    size: selectedSize,
    color: selectedColor,
    storage: productStorage || selectedStorage,
    selectedStorage,
    sizes,
    colors,
    storageOptions,
    variations: Array.isArray(variations) ? variations : undefined,
    selectedVariation: variation,
    category,
    categoryName,
    subcategory,
    subCategoryName,
    shopId,
    shopName,
    supplierName,
    specifications,
    packagingInfo,
    attributes,
    capturedAt
  };

  return {
    productId,
    productName,
    name: productName,
    price: unitPrice,
    originalPrice,
    costPrice: snapshot.costPrice,
    discountPercent,
    discountPrice,
    discountAmount,
    quantity: qty,
    unit,
    minOrderQuantity,
    imageUrl: snapshot.imageUrl,
    images,
    description,
    brand,
    sku,
    category,
    categoryName,
    subcategory,
    subCategoryName,
    shopId,
    shopName,
    supplierName,
    size: selectedSize,
    color: selectedColor,
    storage: productStorage || selectedStorage,
    selectedStorage,
    sizes,
    colors,
    storageOptions,
    variations: snapshot.variations,
    variation,
    specifications,
    packagingInfo,
    attributes,
    aliExpressUrl: (prod.aliExpressUrl || prod.supplierProductUrl || input.aliExpressUrl) || undefined,
    supplierVariant: prod.supplierVariant || input.supplierVariant || undefined,
    supplierSku: prod.supplierSku || input.supplierSku || undefined,
    isOutOfStock: params.isOutOfStock ?? Boolean(input.isOutOfStock),
    shippingCost: totalShippingCost,
    unitShippingCost,
    capturedAt,
    productSnapshot: snapshot
  };
}
