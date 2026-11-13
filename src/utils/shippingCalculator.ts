import { Product, CartItem, AppSettings } from '../types.ts';

/**
 * Checks if a product is currently out of stock in local inventory.
 * If out of stock, it must be ordered from the supplier (international/supplier shipment).
 */
export function isProductOutOfStock(product?: Product | null): boolean {
  if (!product) return false;
  return (
    product.status === 'Out of Stock' ||
    (typeof product.stock === 'number' && product.stock <= 0)
  );
}

/**
 * Returns the effective discount percentage for a product, or 0 if no valid discount applies.
 */
export function getEffectiveDiscountPercent(product?: Product | null): number {
  if (!product) return 0;
  const rawPrice = Math.max(0, Number(product.price) || 0);
  const hasDiscountPrice =
    typeof product.discountPrice === 'number' &&
    product.discountPrice > 0 &&
    product.discountPrice < rawPrice;

  if (typeof product.discountPercent === 'number' && product.discountPercent > 0 && product.discountPercent < 100) {
    return Math.round(product.discountPercent);
  }
  if (hasDiscountPrice && rawPrice > 0) {
    return Math.round(((rawPrice - Number(product.discountPrice)) / rawPrice) * 100);
  }
  return 0;
}

/**
 * Returns the canonical effective per-unit selling price in RWF for a product,
 * accounting for discountPrice, discountPercent, and >=10 bulk wholesale tier (4% off).
 */
export function getEffectiveUnitPrice(product?: Product | null, quantity: number = 1): number {
  if (!product) return 0;
  const rawPrice = Math.max(0, Number(product.price) || 0);
  const qty = Math.max(1, Math.floor(Number(quantity) || 1));

  let baseUnitPrice = rawPrice;
  if (
    typeof product.discountPrice === 'number' &&
    product.discountPrice > 0 &&
    product.discountPrice < rawPrice
  ) {
    baseUnitPrice = Math.round(product.discountPrice);
  } else if (
    typeof product.discountPercent === 'number' &&
    product.discountPercent > 0 &&
    product.discountPercent < 100
  ) {
    baseUnitPrice = Math.max(0, Math.round(rawPrice * (1 - product.discountPercent / 100)));
  } else {
    baseUnitPrice = Math.round(rawPrice);
  }

  return qty >= 10 ? Math.round(baseUnitPrice * 0.96) : baseUnitPrice;
}

/**
 * Calculates the per-unit shipping cost for any listed product.
 * Formula strictly enforced as requested:
 * Shipping Cost = 1500 + (cost of product * 10) / 100
 *
 * Uses custom product.shippingCost (> 0) if explicitly set by Admin;
 * otherwise computes 1500 + 10% of product.costPrice (or effective unit price).
 */
export function calculateProductShippingUnitCost(product?: Product | null, unitPriceOverride?: number): number {
  if (!product) return 0;

  // Honor explicit admin custom shipping cost (> 0)
  if (typeof product.shippingCost === 'number' && !isNaN(product.shippingCost) && product.shippingCost > 0) {
    return Math.round(product.shippingCost);
  }

  // Cost of product: use product costPrice, or explicit override, or effective unit selling price
  const productCost =
    typeof product.costPrice === 'number' && !isNaN(product.costPrice) && product.costPrice > 0
      ? product.costPrice
      : (typeof unitPriceOverride === 'number' && !isNaN(unitPriceOverride) && unitPriceOverride > 0
          ? unitPriceOverride
          : getEffectiveUnitPrice(product, 1));

  // 1500 + (cost of product * 10) / 100
  return 1500 + Math.round((productCost * 10) / 100);
}

/**
 * Calculates the per-unit supplier shipping cost for a product.
 * Returns the standard formula: 1500 + (cost of product * 10) / 100
 */
export function getProductSupplierShippingUnitCost(product?: Product | null): number {
  return calculateProductShippingUnitCost(product);
}

/**
 * Returns product price + automatically added shipping cost for a given quantity.
 */
export function getProductTotalWithShipping(product?: Product | null, quantity: number = 1) {
  const qty = Math.max(1, Math.floor(Number(quantity) || 1));
  const unitPrice = getEffectiveUnitPrice(product, qty);
  const unitShippingCost = calculateProductShippingUnitCost(product);
  const unitTotalWithShipping = unitPrice + unitShippingCost;
  const productPriceTotal = unitPrice * qty;
  const totalShippingCost = unitShippingCost * qty;
  const totalWithShipping = productPriceTotal + totalShippingCost;

  return {
    unitPrice,
    unitShippingCost,
    unitTotalWithShipping,
    productPriceTotal,
    totalShippingCost,
    totalWithShipping
  };
}

/**
 * Returns complete shipping & total cost breakdown for a single product selection
 */
export function getProductSelectionBreakdown(
  product: Product,
  quantity: number = 1,
  estimatedDeliveryFee: number = 1500,
  settings?: Partial<AppSettings>
) {
  const isOutOfStock = isProductOutOfStock(product);
  const qty = Math.max(1, Math.floor(Number(quantity) || 1));

  const unitPrice = getEffectiveUnitPrice(product, qty);
  const productPriceTotal = unitPrice * qty;

  // Formula strictly calculated: 1500 + (cost of product * 10) / 100 (or custom shipping)
  const unitShippingCost = calculateProductShippingUnitCost(product);
  const totalShippingCost = unitShippingCost * qty;
  const subtotalWithShipping = productPriceTotal + totalShippingCost;

  const freeThreshold = settings?.freeDeliveryThreshold ?? 50000;
  const baseKigaliFee = settings?.deliveryFeeKigali ?? estimatedDeliveryFee;
  const deliveryFee = productPriceTotal >= freeThreshold ? 0 : baseKigaliFee;
  const grandTotal = subtotalWithShipping + deliveryFee;

  return {
    isOutOfStock,
    unitPrice,
    quantity: qty,
    productPriceTotal,
    deliveryFee,
    unitShippingCost,
    totalShippingCost,
    estimatedShippingCost: totalShippingCost,
    subtotalWithShipping,
    grandTotal,
    stockStatusLabel: isOutOfStock
      ? 'Out of Stock - Ordered from Supplier'
      : 'In Local Stock (Kigali Hub)'
  };
}

export interface CartCalculationOptions {
  selectedLocationId?: string;
  isPickup?: boolean;
  settings?: Partial<AppSettings>;
  appliedDiscount?: number;
}

export interface CartCostBreakdown {
  subtotal: number;
  deliveryFee: number;
  shippingCost: number;
  subtotalWithShipping: number;
  discountAmount: number;
  grandTotal: number;
  totalAmount: number;
  hasOutOfStockItems: boolean;
  outOfStockCount: number;
  inStockCount: number;
  isFreeDelivery: boolean;
  items: {
    product: Product;
    quantity: number;
    unitPrice: number;
    itemSubtotal: number;
    isOutOfStock: boolean;
    unitShippingCost: number;
    itemShippingCost: number;
    itemTotalWithShipping: number;
  }[];
}

/**
 * Calculates complete cart cost breakdown:
 * Product Price (Subtotal) + Shipping Cost + Delivery Fee - Discount
 */
export function calculateCartBreakdown(
  cart: CartItem[],
  options: CartCalculationOptions = {}
): CartCostBreakdown {
  const { selectedLocationId, isPickup = false, settings, appliedDiscount = 0 } = options;

  let subtotal = 0;
  let shippingCost = 0;
  let outOfStockCount = 0;
  let inStockCount = 0;

  const items = cart.map(item => {
    const isOutOfStock = isProductOutOfStock(item.product);
    const qty = Math.max(1, Math.floor(Number(item.quantity) || 1));

    const unitPrice = getEffectiveUnitPrice(item.product, qty);
    const itemSubtotal = unitPrice * qty;
    subtotal += itemSubtotal;

    // Formula strictly calculated for every listed product: 1500 + (cost of product * 10) / 100
    const unitShippingCost = calculateProductShippingUnitCost(item.product);
    const itemShippingCost = unitShippingCost * qty;
    shippingCost += itemShippingCost;

    const itemTotalWithShipping = itemSubtotal + itemShippingCost;

    if (isOutOfStock) {
      outOfStockCount += qty;
    } else {
      inStockCount += qty;
    }

    return {
      product: item.product,
      quantity: qty,
      unitPrice,
      itemSubtotal,
      isOutOfStock,
      unitShippingCost,
      itemShippingCost,
      itemTotalWithShipping
    };
  });

  // Delivery fee calculation
  let deliveryFee = 0;
  let isFreeDelivery = false;

  if (!isPickup && selectedLocationId !== 'pickup') {
    const isOutsideKigali = selectedLocationId === 'outside';
    const isInternational = selectedLocationId === 'international';
    const freeDeliveryThreshold = settings?.freeDeliveryThreshold ?? 50000;
    const qualifiesForFree = subtotal >= freeDeliveryThreshold && !isOutsideKigali && !isInternational;

    if (qualifiesForFree) {
      deliveryFee = 0;
      isFreeDelivery = true;
    } else if (isInternational) {
      deliveryFee = (settings as any)?.deliveryFeeInternational ?? 5000;
    } else if (isOutsideKigali) {
      deliveryFee = settings?.deliveryFeeUpcountry ?? 3500;
    } else {
      const currentArea = settings?.kigaliAreas?.find(a => a.id === selectedLocationId);
      deliveryFee = currentArea ? currentArea.fee : (settings?.deliveryFeeKigali ?? 1500);
    }
  } else {
    deliveryFee = 0;
  }

  const subtotalWithShipping = subtotal + shippingCost;
  const safeDiscount = Math.max(0, Math.round(Number(appliedDiscount) || 0));
  const grandTotal = Math.max(0, subtotalWithShipping + deliveryFee - safeDiscount);

  return {
    subtotal,
    deliveryFee,
    shippingCost,
    subtotalWithShipping,
    discountAmount: safeDiscount,
    grandTotal,
    totalAmount: grandTotal,
    hasOutOfStockItems: outOfStockCount > 0,
    outOfStockCount,
    inStockCount,
    isFreeDelivery,
    items
  };
}
