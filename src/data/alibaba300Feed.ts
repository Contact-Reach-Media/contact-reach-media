export interface Alibaba300Item {
  pid: string;
  productName: string;
  productSku: string;
  originalDescription: string;
  productImages: string[];
  unitCostUsd: number;
  weightKg: number;
  dimensionsCm: { length: number; width: number; height: number };
  supplierName: string;
  supplierLocation: string;
  tradeAssurance: boolean;
  verifiedSupplier: boolean;
  moq: number;
  leadTimeDays: number;
  category: string;
  brand: string;
  unit: string;
  alibabaItemUrl: string;
}

export const ALIBABA_300_CATALOG: Alibaba300Item[] = [];
