export interface Alibaba1000Item {
  pid: string;
  name: string;
  nameRw?: string;
  category: string;
  priceUsd: number;
  priceRwf: number;
  originalPriceRwf?: number;
  imageUrl: string;
  images: string[];
  description: string;
  supplierName: string;
  supplierLocation: string;
  moq: number;
  weightKg: number;
  tradeAssurance: boolean;
  verifiedSupplier: boolean;
  alibabaItemUrl: string;
  leadTimeDays: number;
  stock: number;
  productSku?: string;
  specs?: string;
}

// Supplier items are now stored dynamically in Supabase.
// Hardcoded and demo items removed.
export const ALIBABA_1000_CATALOG: Alibaba1000Item[] = [];
