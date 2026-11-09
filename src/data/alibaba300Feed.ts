export interface Alibaba300Item {
  pid: string;
  name: string;
  category: string;
  priceUsd: number;
  priceRwf: number;
  imageUrl: string;
  images?: string[];
  description?: string;
  supplierName?: string;
  moq?: number;
  weightKg?: number;
  stock?: number;
  productSku?: string;
}

// Supplier items are now stored dynamically in Supabase.
// Hardcoded and demo items removed.
export const ALIBABA_300_CATALOG: Alibaba300Item[] = [];
