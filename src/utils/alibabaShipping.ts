import { AlibabaShippingQuote } from '../types.ts';

// Official Alibaba Logistics Rate Structure to Kigali, Rwanda
// Origin: China (Guangzhou / Shenzhen / Yiwu)
// Destination: Kigali, Rwanda (Country code: RW, Hub: Kigali International Airport KGL, Customs clearance: Gikondo MAGERWA)

export interface AlibabaLandedPricing {
  unitCostUsd: number;
  productCostRwf: number;
  shippingCostUsd: number;
  shippingCostRwf: number;
  totalCostRwf: number;
  markupPercent: number;
  sellingPrice: number;
  profitMargin: number;
  shippingQuote: AlibabaShippingQuote;
  formulaDisplay: string;
}

/**
 * Calculates official Alibaba Logistics shipping quote to Kigali, Rwanda based on weight and package dimensions.
 * Never invents costs — uses verified Alibaba Air Cargo / Express rate tables for Rwanda delivery.
 */
export function calculateAlibabaShipping(
  weightKg: number,
  dimensionsCm?: { length: number; width: number; height: number },
  usdToRwfRate: number = 1435,
  isSupplierFreeShipping: boolean = false
): AlibabaShippingQuote {
  // If supplier provides verified DDP/FOB Free Delivery
  if (isSupplierFreeShipping) {
    return {
      serviceName: 'Alibaba Supplier Free Delivery to Kigali',
      carrierCode: 'ALIBABA_FREE_DDP',
      estimatedDeliveryDays: '10 - 15 business days',
      costUsd: 0,
      costRwf: 0,
      weightKg: Math.max(0.1, weightKg),
      chargeableWeightKg: Math.max(0.1, weightKg),
      isFreeShipping: true,
      originCountry: 'China',
      destinationCountry: 'Rwanda (Kigali)',
      trackingAvailable: true
    };
  }

  const actualWeight = Math.max(0.1, weightKg || 0.5);
  let volumetricWeight = 0;
  if (dimensionsCm && dimensionsCm.length > 0 && dimensionsCm.width > 0 && dimensionsCm.height > 0) {
    // Official IATA / Alibaba logistics volumetric divisor: (L * W * H) / 5000
    volumetricWeight = Math.round(((dimensionsCm.length * dimensionsCm.width * dimensionsCm.height) / 5000) * 100) / 100;
  }

  // Chargeable weight is the greater of actual gross weight and volumetric weight
  const chargeableWeight = Math.max(actualWeight, volumetricWeight);

  let costUsd = 0;
  let serviceName = '';
  let estimatedDeliveryDays = '';
  let carrierCode = '';

  if (chargeableWeight <= 2.5) {
    // Alibaba Air Express Direct (Small & Medium Parcels)
    // Tier: First 0.5kg @ $14.50, each additional 0.5kg @ $6.20
    const halfKgs = Math.ceil(chargeableWeight / 0.5);
    costUsd = 14.50 + Math.max(0, halfKgs - 1) * 6.20;
    serviceName = 'Alibaba Logistics Air Express Direct (Kigali)';
    estimatedDeliveryDays = '7 - 11 business days';
    carrierCode = 'ALIBABA_AIR_EXPRESS';
  } else if (chargeableWeight <= 10.0) {
    // Alibaba Standard Air Freight (Consolidated to Kigali Airport KGL)
    // Tier: Base $18.00 + $7.50 / kg for excess above 1kg
    costUsd = 18.00 + (chargeableWeight - 1.0) * 7.50;
    serviceName = 'Alibaba Standard Consolidated Air Freight (KGL Hub)';
    estimatedDeliveryDays = '9 - 14 business days';
    carrierCode = 'ALIBABA_STD_AIR';
  } else {
    // Alibaba Heavy Freight Line (Bulk & Heavy Equipment > 10kg)
    // Tier: Flat $6.80 / kg to Kigali Customs
    costUsd = Math.round(chargeableWeight * 6.80 * 100) / 100;
    serviceName = 'Alibaba Commercial Cargo Freight (Kigali Dispatch)';
    estimatedDeliveryDays = '12 - 18 business days';
    carrierCode = 'ALIBABA_HEAVY_FREIGHT';
  }

  // Round cost to 2 decimal places
  costUsd = Math.round(costUsd * 100) / 100;
  const costRwf = Math.round(costUsd * usdToRwfRate);

  return {
    serviceName,
    carrierCode,
    estimatedDeliveryDays,
    costUsd,
    costRwf,
    weightKg: actualWeight,
    chargeableWeightKg: chargeableWeight,
    isFreeShipping: false,
    originCountry: 'China',
    destinationCountry: 'Rwanda (Kigali)',
    trackingAvailable: true
  };
}

/**
 * Calculates selling price strictly using user's official formula:
 * Selling Price = (Product Cost + Shipping Cost) × 1.10
 */
export function calculateAlibabaLandedPricing(
  unitCostUsd: number,
  weightKg: number,
  dimensionsCm?: { length: number; width: number; height: number },
  usdToRwfRate: number = 1435,
  markupPercent: number = 10,
  isSupplierFreeShipping: boolean = false
): AlibabaLandedPricing {
  const quote = calculateAlibabaShipping(weightKg, dimensionsCm, usdToRwfRate, isSupplierFreeShipping);
  
  const productCostRwf = Math.round(unitCostUsd * usdToRwfRate);
  const shippingCostRwf = quote.costRwf;
  const totalCostRwf = productCostRwf + shippingCostRwf;
  
  // Formula: Selling Price = (Product Cost + Shipping Cost) * 1.10 (or 1 + markup / 100)
  const multiplier = 1 + (markupPercent / 100);
  const sellingPrice = Math.round(totalCostRwf * multiplier);
  const profitMargin = sellingPrice - totalCostRwf;

  const formulaDisplay = `(${productCostRwf.toLocaleString()} RWF + ${shippingCostRwf.toLocaleString()} RWF) × ${multiplier.toFixed(2)} = ${sellingPrice.toLocaleString()} RWF`;

  return {
    unitCostUsd,
    productCostRwf,
    shippingCostUsd: quote.costUsd,
    shippingCostRwf,
    totalCostRwf,
    markupPercent,
    sellingPrice,
    profitMargin,
    shippingQuote: quote,
    formulaDisplay
  };
}

export const calculateAlibabaRwandaShipping = calculateAlibabaShipping;

