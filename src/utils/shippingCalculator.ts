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
 * Calculates the per-unit supplier shipping cost for a product.
 * - If product is in local stock (stock > 0 and status is Available): shipping cost is 0 RWF (Free local stock).
 * - If product is out of stock: supplier shipping to Rwanda applies (alibabaShippingCostRwf, converted USD, or standard 3,500 RWF).
 */
export function getProductSupplierShippingUnitCost(product?: Product | null): number {
  if (!product) return 0;
  if (!isProductOutOfStock(product)) {
    return 0; // In local stock, no supplier shipping required
  }

  if (product.alibabaShippingCostRwf && product.alibabaShippingCostRwf > 0) {
    return product.alibabaShippingCostRwf;
  }

  if (product.alibabaShippingCostUsd && product.alibabaShippingCostUsd > 0) {
    return Math.round(product.alibabaShippingCostUsd * 1435);
  }

  // Standard Air Freight / Supplier Import shipping fee to Kigali Hub
  return 3500;
}

/**
 * Returns complete shipping cost info for a single product selection
 */
export function getProductSelectionBreakdown(
  product: Product,
  quantity: number = 1,
  estimatedDeliveryFee: number = 1500
) {
  const isOutOfStock = isProductOutOfStock(product);
  const qty = Math.max(1, quantity);

  // Unit price considering discount if any
  const hasDiscount = Boolean(
    (product.discountPercent !== undefined && product.discountPercent > 0) ||
    (product.discountPrice !== undefined && product.discountPrice < product.price)
  );
  const discountPercent = product.discountPercent || (hasDiscount && product.price > 0 && product.discountPrice
    ? Math.round(((product.price - product.discountPrice) / product.price) * 100)
    : 0);

  const unitPrice = (product.discountPrice !== undefined && product.discountPrice < product.price)
    ? product.discountPrice
    : (discountPercent > 0 ? Math.round(product.price * (1 - discountPercent / 100)) : product.price);

  // Bulk discount tier (>= 10 pcs: 4% off)
  const activeUnitPrice = qty >= 10 ? Math.round(unitPrice * 0.96) : unitPrice;
  const productPriceTotal = activeUnitPrice * qty;

  const unitShippingCost = isOutOfStock ? getProductSupplierShippingUnitCost(product) : 0;
  const totalShippingCost = unitShippingCost * qty;
  const deliveryFee = productPriceTotal >= 50000 ? 0 : estimatedDeliveryFee;
  const grandTotal = productPriceTotal + deliveryFee + totalShippingCost;

  return {
    isOutOfStock,
    unitPrice: activeUnitPrice,
    quantity: qty,
    productPriceTotal,
    deliveryFee,
    unitShippingCost,
    totalShippingCost,
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
  discountAmount: number;
  grandTotal: number;
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
  }[];
}

/**
 * Calculates complete cart cost breakdown:
 * Product Price (Subtotal) + Delivery Fee + Supplier Shipping Cost (for out-of-stock items) - Discount
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
    const qty = Math.max(1, item.quantity);

    const unitPrice = item.product.discountPrice && item.product.discountPrice > 0
      ? item.product.discountPrice
      : item.product.price;

    const itemSubtotal = unitPrice * qty;
    subtotal += itemSubtotal;

    const unitShippingCost = isOutOfStock ? getProductSupplierShippingUnitCost(item.product) : 0;
    const itemShippingCost = unitShippingCost * qty;
    shippingCost += itemShippingCost;

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
      itemShippingCost
    };
  });

  // Delivery fee calculation
  let deliveryFee = 0;
  let isFreeDelivery = false;

  if (!isPickup) {
    const isOutsideKigali = selectedLocationId === 'outside';
    const freeDeliveryThreshold = settings?.freeDeliveryThreshold || 50000;
    const qualifiesForFree = subtotal >= freeDeliveryThreshold && !isOutsideKigali;

    if (qualifiesForFree) {
      deliveryFee = 0;
      isFreeDelivery = true;
    } else if (isOutsideKigali) {
      deliveryFee = settings?.deliveryFeeUpcountry || 3500;
    } else {
      const currentArea = settings?.kigaliAreas?.find(a => a.id === selectedLocationId);
      deliveryFee = currentArea ? currentArea.fee : (settings?.deliveryFeeKigali || 1500);
    }
  }

  const grandTotal = Math.max(0, subtotal + deliveryFee + shippingCost - appliedDiscount);

  return {
    subtotal,
    deliveryFee,
    shippingCost,
    discountAmount: appliedDiscount,
    grandTotal,
    hasOutOfStockItems: outOfStockCount > 0,
    outOfStockCount,
    inStockCount,
    isFreeDelivery,
    items
  };
}
