export interface AlibabaCuratedItem {
  pid: string;
  name: string;
  productName?: string;
  productSku?: string;
  nameRw?: string;
  category: string;
  priceUsd: number;
  unitCostUsd?: number;
  priceRwf: number;
  originalPriceRwf?: number;
  imageUrl: string;
  images: string[];
  productImages?: string[];
  description: string;
  originalDescription?: string;
  supplierName: string;
  supplierLocation: string;
  moq: number;
  weightKg: number;
  dimensionsCm?: { length: number; width: number; height: number };
  isFreeShipping?: boolean;
  tradeAssurance: boolean;
  verifiedSupplier: boolean;
  alibabaItemUrl: string;
  leadTimeDays: number;
  stock: number;
  brand?: string;
  variations?: any[];
  unit?: string;
}

// Supplier items are now stored dynamically in Supabase.
// Hardcoded and demo items removed.
export const ALIBABA_CURATED_FEED: AlibabaCuratedItem[] = [];
