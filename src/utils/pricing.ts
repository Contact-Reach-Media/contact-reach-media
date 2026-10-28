/**
 * Official ContactReach Market Landed Cost & Selling Price Engine
 * 
 * Landed cost = product cost + shipping to Rwanda + applicable taxes and fees.
 * 
 * For a 15% markup:
 * Selling price = landed cost × 1.15.
 * 
 * For a 15% gross margin before other expenses:
 * Selling price = landed cost ÷ 0.85.
 */

export interface LandedCostInput {
  productCostUsd: number;
  weightKg?: number;
  shippingToRwandaUsd?: number;
  isShippingVerified?: boolean;
  shippingServiceName?: string;
  applicableTaxesPercent?: number; // e.g. 18% standard VAT / import customs
  usdToRwfRate?: number; // e.g. 1435 RWF/USD
  pricingStrategy?: 'markup' | 'gross_margin'; // default 'markup'
  strategyPercentage?: number; // default 15
}

export interface LandedCostResult {
  productCostUsd: number;
  productCostRwf: number;
  shippingToRwandaUsd: number;
  shippingToRwandaRwf: number;
  isShippingVerified: boolean;
  shippingServiceName: string;
  applicableTaxesPercent: number;
  applicableTaxesRwf: number;
  landedCostRwf: number;
  pricingStrategy: 'markup' | 'gross_margin';
  strategyPercentage: number;
  sellingPriceRwf: number;
  grossProfitRwf: number;
  formulaDisplay: string;
}

/**
 * Standard Air Cargo shipping estimate to Kigali International Airport (KGL), Rwanda
 * Rates: Base handling $3.50 + $9.50/kg for general cargo from China/Asia logistics hubs.
 */
export function estimateRwandaShippingUsd(weightKg?: number): {
  costUsd: number;
  serviceName: string;
  isVerified: boolean;
} {
  const actualWeight = Math.max(0.1, weightKg || 0.4); // typical package weight default 400g
  const baseHandling = 3.5;
  const ratePerKg = 9.5;
  const costUsd = Math.round((baseHandling + actualWeight * ratePerKg) * 100) / 100;

  return {
    costUsd,
    serviceName: 'China-to-Kigali Air Cargo Freight',
    isVerified: false // Explicitly labelled unverified estimate until supplier quote confirms
  };
}

/**
 * Calculates Landed Cost and Selling Price strictly adhering to the ContactReach Market formula.
 */
export function calculateLandedCostAndSellingPrice(input: LandedCostInput): LandedCostResult {
  const usdRate = input.usdToRwfRate && input.usdToRwfRate > 0 ? input.usdToRwfRate : 1435;
  const taxesPct = input.applicableTaxesPercent !== undefined ? Math.max(0, input.applicableTaxesPercent) : 18; // 18% standard import/VAT
  const strategy = input.pricingStrategy || 'markup';
  const percentage = input.strategyPercentage !== undefined ? Math.max(1, input.strategyPercentage) : 15;

  const productCostUsd = Math.max(0, input.productCostUsd || 0);
  const productCostRwf = Math.round(productCostUsd * usdRate);

  // Determine shipping cost to Rwanda
  let shippingToRwandaUsd = 0;
  let isShippingVerified = false;
  let shippingServiceName = 'Supplier Shipping to Kigali';

  if (input.shippingToRwandaUsd !== undefined && input.shippingToRwandaUsd >= 0) {
    shippingToRwandaUsd = input.shippingToRwandaUsd;
    isShippingVerified = Boolean(input.isShippingVerified);
    shippingServiceName = input.shippingServiceName || 'Direct Supplier Quote to Kigali';
  } else {
    const estimated = estimateRwandaShippingUsd(input.weightKg);
    shippingToRwandaUsd = estimated.costUsd;
    isShippingVerified = estimated.isVerified;
    shippingServiceName = estimated.serviceName;
  }

  const shippingToRwandaRwf = Math.round(shippingToRwandaUsd * usdRate);

  // Applicable taxes & fees (calculated on CIF = Cost + Insurance + Freight)
  const cifRwf = productCostRwf + shippingToRwandaRwf;
  const applicableTaxesRwf = Math.round(cifRwf * (taxesPct / 100));

  // Landed cost = product cost + shipping to Rwanda + applicable taxes and fees
  const landedCostRwf = productCostRwf + shippingToRwandaRwf + applicableTaxesRwf;

  // Selling price calculation
  let sellingPriceRwf = 0;
  let formulaDisplay = '';

  if (strategy === 'gross_margin') {
    // For 15% gross margin: Selling price = landed cost ÷ (1 - 0.15) = landed cost ÷ 0.85
    const divisor = Math.max(0.01, 1 - percentage / 100);
    sellingPriceRwf = Math.round(landedCostRwf / divisor);
    // Round to nearest 100 RWF for clean commercial pricing
    sellingPriceRwf = Math.ceil(sellingPriceRwf / 100) * 100;
    formulaDisplay = `Landed Cost ${landedCostRwf.toLocaleString()} RWF ÷ ${(1 - percentage / 100).toFixed(2)} (${percentage}% Margin) = ${sellingPriceRwf.toLocaleString()} RWF`;
  } else {
    // For 15% markup: Selling price = landed cost × 1.15
    const multiplier = 1 + percentage / 100;
    sellingPriceRwf = Math.round(landedCostRwf * multiplier);
    // Round to nearest 100 RWF for clean commercial pricing
    sellingPriceRwf = Math.ceil(sellingPriceRwf / 100) * 100;
    formulaDisplay = `Landed Cost ${landedCostRwf.toLocaleString()} RWF × ${multiplier.toFixed(2)} (${percentage}% Markup) = ${sellingPriceRwf.toLocaleString()} RWF`;
  }

  const grossProfitRwf = Math.max(0, sellingPriceRwf - landedCostRwf);

  return {
    productCostUsd,
    productCostRwf,
    shippingToRwandaUsd,
    shippingToRwandaRwf,
    isShippingVerified,
    shippingServiceName,
    applicableTaxesPercent: taxesPct,
    applicableTaxesRwf,
    landedCostRwf,
    pricingStrategy: strategy,
    strategyPercentage: percentage,
    sellingPriceRwf,
    grossProfitRwf,
    formulaDisplay
  };
}
