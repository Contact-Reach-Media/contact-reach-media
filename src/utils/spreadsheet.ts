import * as XLSX from 'xlsx';
import { Product, Category, VendorShop } from '../types.ts';

export interface SpreadsheetPreviewItem {
  id?: string;
  name: string;
  sku: string;
  price: number;
  oldPrice?: number;
  stock: number;
  oldStock?: number;
  costPrice?: number;
  oldCostPrice?: number;
  discountPercent?: number;
  category: string;
  categoryName?: string;
  shopName: string;
  shopId?: string;
  description?: string;
  imageUrl?: string;
  status?: string;
  matchType: 'new' | 'update' | 'duplicate_in_file';
  matchedExistingId?: string;
  matchedBy?: 'id' | 'sku' | 'name';
  priceDifference?: number;
  stockDifference?: number;
  hasPriceChange?: boolean;
  hasStockChange?: boolean;
  warnings: string[];
  errors: string[];
  isValid: boolean;
  selected: boolean;
}

export interface SpreadsheetPreviewSummary {
  totalRows: number;
  validCount: number;
  newCount: number;
  updateCount: number;
  priceChangesCount: number;
  stockChangesCount: number;
  duplicateInFileCount: number;
  errorCount: number;
  items: SpreadsheetPreviewItem[];
}

export interface FieldMapping {
  nameCol: number | string;
  skuCol: number | string;
  priceCol: number | string;
  costPriceCol: number | string;
  stockCol: number | string;
  categoryCol: number | string;
  shopCol: number | string;
  discountCol: number | string;
  descriptionCol: number | string;
  imageUrlCol: number | string;
  statusCol: number | string;
}

// -------------------------------------------------------------
// EXCEL / CSV EXPORT UTILITIES
// -------------------------------------------------------------

export function exportProductsToExcel(
  products: Product[],
  categories?: Category[],
  filename?: string
): void {
  const categoryMap = new Map((categories || []).map(c => [c.id, c.nameEn || c.id]));

  const rows = products.map((p, idx) => ({
    'ID': p.id,
    'Product Name': p.name,
    'SKU / Code': p.sku || `CRM-${p.id.slice(-6).toUpperCase()}`,
    'Category': categoryMap.get(p.category) || p.category,
    'Category Slug': p.category,
    'Price (RWF)': p.price,
    'Discount %': p.discountPercent || 0,
    'Promotional Price (RWF)': p.discountPrice || p.price,
    'Cost Price (RWF)': p.costPrice ?? '',
    'Stock Quantity': p.stock,
    'Status': p.status || 'Available',
    'Supplier / Shop': p.shopName || 'ContactReach Market',
    'Primary Image URL': p.imageUrl || (p.images && p.images[0]) || '',
    'Featured': p.isFeatured ? 'Yes' : 'No',
    'Best Seller': p.isBestSeller ? 'Yes' : 'No',
    'New Arrival': p.isNewArrival ? 'Yes' : 'No',
    'Rating': p.rating || 5,
    'Reviews Count': p.reviewsCount || 0,
    'Description': p.description || '',
    'Video URL': p.videoUrl || '',
    'Last Updated': p.updatedAt || p.createdAt || new Date().toISOString()
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Set intelligent column widths
  worksheet['!cols'] = [
    { wch: 18 }, // ID
    { wch: 35 }, // Name
    { wch: 16 }, // SKU
    { wch: 20 }, // Category
    { wch: 16 }, // Category Slug
    { wch: 14 }, // Price
    { wch: 12 }, // Discount %
    { wch: 22 }, // Promo Price
    { wch: 16 }, // Cost Price
    { wch: 14 }, // Stock
    { wch: 12 }, // Status
    { wch: 25 }, // Shop
    { wch: 40 }, // Image URL
    { wch: 10 }, // Featured
    { wch: 12 }, // Best Seller
    { wch: 12 }, // New Arrival
    { wch: 8 },  // Rating
    { wch: 14 }, // Reviews
    { wch: 45 }, // Description
    { wch: 30 }, // Video URL
    { wch: 22 }, // Last Updated
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'ContactReach Products');

  const nowStr = new Date().toISOString().split('T')[0];
  const targetFilename = filename || `ContactReach_Market_Products_${nowStr}.xlsx`;

  XLSX.writeFile(workbook, targetFilename);
}

export function exportProductsToCsv(
  products: Product[],
  categories?: Category[],
  filename?: string
): void {
  const categoryMap = new Map((categories || []).map(c => [c.id, c.nameEn || c.id]));

  const rows = products.map((p) => ({
    'ID': p.id,
    'Product Name': p.name,
    'SKU': p.sku || `CRM-${p.id.slice(-6).toUpperCase()}`,
    'Category': categoryMap.get(p.category) || p.category,
    'Price (RWF)': p.price,
    'Discount %': p.discountPercent || 0,
    'Discount Price (RWF)': p.discountPrice || p.price,
    'Cost Price (RWF)': p.costPrice ?? '',
    'Stock': p.stock,
    'Status': p.status || 'Available',
    'Shop': p.shopName || 'ContactReach Market',
    'Image URL': p.imageUrl || '',
    'Description': (p.description || '').replace(/[\r\n]+/g, ' ')
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const csvContent = XLSX.utils.sheet_to_csv(worksheet);

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const nowStr = new Date().toISOString().split('T')[0];
  link.setAttribute('download', filename || `ContactReach_Market_Products_${nowStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// -------------------------------------------------------------
// SPREADSHEET PARSING & AUTOMATIC FIELD DETECTION
// -------------------------------------------------------------

export async function parseUploadedSpreadsheet(file: File): Promise<{
  sheetNames: string[];
  activeSheet: string;
  headers: string[];
  rawRows: any[][];
}> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });

  const sheetNames = workbook.SheetNames;
  if (sheetNames.length === 0) {
    throw new Error('Spreadsheet does not contain any sheets or tabs.');
  }

  const activeSheet = sheetNames[0];
  const worksheet = workbook.Sheets[activeSheet];
  const data: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  if (data.length === 0) {
    throw new Error('Spreadsheet sheet is empty.');
  }

  // Find header row (first non-empty row)
  let headerRowIndex = 0;
  for (let i = 0; i < Math.min(data.length, 5); i++) {
    const row = data[i];
    if (row && row.some(cell => String(cell).trim().length > 0)) {
      headerRowIndex = i;
      break;
    }
  }

  const headers = data[headerRowIndex].map(h => String(h || '').trim());
  const rawRows = data.slice(headerRowIndex + 1).filter(r => r && r.some(c => String(c).trim().length > 0));

  return {
    sheetNames,
    activeSheet,
    headers,
    rawRows
  };
}

/**
 * Intelligent automatic column detection based on header keywords
 */
export function autoDetectFieldMapping(headers: string[]): FieldMapping {
  const normalized = headers.map(h => h.toLowerCase().trim().replace(/[^a-z0-9]/g, ''));

  const findIdx = (patterns: string[]): number => {
    for (const pattern of patterns) {
      const idx = normalized.findIndex(h => h === pattern || h.includes(pattern));
      if (idx !== -1) return idx;
    }
    return -1;
  };

  return {
    nameCol: findIdx(['productname', 'producttitle', 'itemname', 'name', 'title', 'designation', 'description']),
    skuCol: findIdx(['sku', 'itemcode', 'productcode', 'barcode', 'code', 'ref', 'reference']),
    priceCol: findIdx(['pricerwf', 'pricefrw', 'unitprice', 'sellingprice', 'price', 'amount', 'costrwf', 'cost']),
    costPriceCol: findIdx(['costprice', 'wholesaleprice', 'purchaseprice', 'unitcost', 'cost']),
    stockCol: findIdx(['stockquantity', 'quantity', 'stock', 'qty', 'units', 'inventory', 'count']),
    categoryCol: findIdx(['categoryname', 'categoryslug', 'category', 'department', 'dept', 'type', 'group']),
    shopCol: findIdx(['shopname', 'suppliershop', 'supplier', 'shop', 'store', 'vendor', 'seller']),
    discountCol: findIdx(['discountpercent', 'discount', 'discountprice', 'promo', 'reduction', 'off']),
    descriptionCol: findIdx(['description', 'productdescription', 'details', 'summary', 'specs', 'features']),
    imageUrlCol: findIdx(['imageurl', 'primaryimageurl', 'image', 'picture', 'photo', 'photourl', 'thumbnail']),
    statusCol: findIdx(['status', 'availability', 'state'])
  };
}

export function parseNumberValue(val: any, fallback = 0): number {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'number') return isNaN(val) ? fallback : val;
  const cleaned = String(val).replace(/[^0-9.-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? fallback : num;
}

export function parseStringValue(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

/**
 * Generates an interactive preview analyzing new vs existing products,
 * detecting price/stock diffs, validating fields, and identifying duplicates.
 */
export function buildSpreadsheetPreview(
  rawRows: any[][],
  headers: string[],
  mapping: FieldMapping,
  existingProducts: Product[],
  categories: Category[],
  shops: VendorShop[]
): SpreadsheetPreviewSummary {
  const items: SpreadsheetPreviewItem[] = [];
  const seenSkusInFile = new Set<string>();
  const seenNamesInFile = new Set<string>();

  const categoryMap = new Map<string, string>(); // slug -> name or id
  categories.forEach(c => {
    categoryMap.set(c.id.toLowerCase(), c.id);
    if (c.nameEn) categoryMap.set(c.nameEn.toLowerCase(), c.id);
    if (c.nameRw) categoryMap.set(c.nameRw.toLowerCase(), c.id);
  });

  const shopMap = new Map<string, { id: string; name: string }>();
  shops.forEach(s => {
    shopMap.set(s.id.toLowerCase(), { id: s.id, name: s.name });
    shopMap.set(s.name.toLowerCase(), { id: s.id, name: s.name });
  });

  let duplicateInFileCount = 0;
  let priceChangesCount = 0;
  let stockChangesCount = 0;
  let newCount = 0;
  let updateCount = 0;
  let errorCount = 0;

  for (let rowIndex = 0; rowIndex < rawRows.length; rowIndex++) {
    const row = rawRows[rowIndex];
    if (!row || row.length === 0) continue;

    const getCell = (colIdx: number | string): any => {
      const idx = typeof colIdx === 'string' ? parseInt(colIdx, 10) : colIdx;
      return idx >= 0 && idx < row.length ? row[idx] : undefined;
    };

    const rawName = parseStringValue(getCell(mapping.nameCol));
    const rawSku = parseStringValue(getCell(mapping.skuCol));
    const rawPrice = parseNumberValue(getCell(mapping.priceCol), -1);
    const rawCostPrice = getCell(mapping.costPriceCol) !== undefined && parseStringValue(getCell(mapping.costPriceCol)) !== ''
      ? parseNumberValue(getCell(mapping.costPriceCol))
      : undefined;
    const rawStock = parseNumberValue(getCell(mapping.stockCol), 20);
    const rawCategory = parseStringValue(getCell(mapping.categoryCol));
    const rawShop = parseStringValue(getCell(mapping.shopCol));
    const rawDiscount = parseNumberValue(getCell(mapping.discountCol), 0);
    const rawDesc = parseStringValue(getCell(mapping.descriptionCol));
    const rawImage = parseStringValue(getCell(mapping.imageUrlCol));
    const rawStatus = parseStringValue(getCell(mapping.statusCol)) || 'Available';

    const warnings: string[] = [];
    const errors: string[] = [];

    // Validation
    if (!rawName) {
      errors.push('Product name is required.');
    }

    if (rawPrice < 0) {
      errors.push('Price is required and must be a positive number.');
    }

    const normalizedSku = rawSku.toLowerCase();
    const normalizedName = rawName.toLowerCase();

    // Check duplicate inside the uploaded spreadsheet
    let isDuplicateInFile = false;
    if (normalizedSku && seenSkusInFile.has(normalizedSku)) {
      isDuplicateInFile = true;
      warnings.push(`Duplicate SKU "${rawSku}" appears multiple times in this spreadsheet.`);
      duplicateInFileCount++;
    } else if (normalizedSku) {
      seenSkusInFile.add(normalizedSku);
    }

    if (!isDuplicateInFile && normalizedName && seenNamesInFile.has(normalizedName)) {
      warnings.push(`Product with name "${rawName}" appears multiple times in this file.`);
    } else if (normalizedName) {
      seenNamesInFile.add(normalizedName);
    }

    // Resolve category
    let resolvedCategory = 'electronics';
    if (rawCategory) {
      const match = categoryMap.get(rawCategory.toLowerCase());
      if (match) {
        resolvedCategory = match;
      } else {
        warnings.push(`Category "${rawCategory}" not found in system. Defaulting to general department.`);
      }
    }

    // Resolve shop
    let resolvedShopName = 'ContactReach Market';
    let resolvedShopId: string | undefined = undefined;
    if (rawShop) {
      const match = shopMap.get(rawShop.toLowerCase());
      if (match) {
        resolvedShopName = match.name;
        resolvedShopId = match.id;
      } else {
        resolvedShopName = rawShop;
      }
    }

    // Match against existing database products
    let matchType: 'new' | 'update' | 'duplicate_in_file' = 'new';
    let matchedExisting: Product | undefined = undefined;
    let matchedBy: 'id' | 'sku' | 'name' | undefined = undefined;

    if (rawSku) {
      matchedExisting = existingProducts.find(p => p.sku && p.sku.toLowerCase() === normalizedSku);
      if (matchedExisting) matchedBy = 'sku';
    }

    if (!matchedExisting && rawName) {
      matchedExisting = existingProducts.find(p =>
        p.name.toLowerCase() === normalizedName &&
        (!rawShop || (p.shopName || '').toLowerCase() === rawShop.toLowerCase())
      );
      if (matchedExisting) matchedBy = 'name';
    }

    let hasPriceChange = false;
    let hasStockChange = false;
    let priceDiff = 0;
    let stockDiff = 0;

    if (matchedExisting) {
      matchType = 'update';
      updateCount++;
      priceDiff = (rawPrice >= 0 ? rawPrice : matchedExisting.price) - matchedExisting.price;
      stockDiff = rawStock - matchedExisting.stock;
      hasPriceChange = priceDiff !== 0;
      hasStockChange = stockDiff !== 0;

      if (hasPriceChange) priceChangesCount++;
      if (hasStockChange) stockChangesCount++;
    } else {
      matchType = isDuplicateInFile ? 'duplicate_in_file' : 'new';
      newCount++;
    }

    if (errors.length > 0) {
      errorCount++;
    }

    items.push({
      name: rawName || `Row #${rowIndex + 1} (Unnamed)`,
      sku: rawSku || (matchedExisting?.sku ?? `CRM-${Date.now().toString().slice(-4)}${rowIndex}`),
      price: rawPrice >= 0 ? rawPrice : (matchedExisting?.price ?? 0),
      oldPrice: matchedExisting?.price,
      stock: rawStock,
      oldStock: matchedExisting?.stock,
      costPrice: rawCostPrice ?? matchedExisting?.costPrice,
      oldCostPrice: matchedExisting?.costPrice,
      discountPercent: rawDiscount,
      category: resolvedCategory,
      shopName: resolvedShopName,
      shopId: resolvedShopId,
      description: rawDesc || matchedExisting?.description || '',
      imageUrl: rawImage || matchedExisting?.imageUrl || '',
      status: rawStatus,
      matchType,
      matchedExistingId: matchedExisting?.id,
      matchedBy,
      priceDifference: priceDiff,
      stockDifference: stockDiff,
      hasPriceChange,
      hasStockChange,
      warnings,
      errors,
      isValid: errors.length === 0,
      selected: errors.length === 0
    });
  }

  return {
    totalRows: items.length,
    validCount: items.filter(i => i.isValid).length,
    newCount,
    updateCount,
    priceChangesCount,
    stockChangesCount,
    duplicateInFileCount,
    errorCount,
    items
  };
}

// -------------------------------------------------------------
// GOOGLE SHEETS API UTILITIES
// -------------------------------------------------------------

export function extractGoogleSheetId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  // Direct ID check (Google Sheet IDs are typically 44 characters of letters, numbers, hyphens, underscores)
  if (/^[a-zA-Z0-9_-]{25,}$/.test(trimmed)) {
    return trimmed;
  }
  // Match URL: https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/...
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

export async function fetchGoogleSheetMetadata(
  spreadsheetId: string,
  accessToken: string
): Promise<{ title: string; sheets: Array<{ title: string; sheetId: number }> }> {
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title,sheets.properties`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google Sheets API returned error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const sheets = (data.sheets || []).map((s: any) => ({
    title: s.properties?.title || 'Sheet1',
    sheetId: s.properties?.sheetId || 0
  }));

  return {
    title: data.properties?.title || 'ContactReach Market Spreadsheet',
    sheets
  };
}

export async function fetchGoogleSheetValues(
  spreadsheetId: string,
  sheetTitle: string,
  accessToken: string
): Promise<{ headers: string[]; rows: any[][] }> {
  const encodedTitle = encodeURIComponent(sheetTitle);
  const range = `${encodedTitle}!A1:Z500`;
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to read sheet "${sheetTitle}" (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const values: any[][] = data.values || [];

  if (values.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = values[0].map((h: any) => String(h || '').trim());
  const rows = values.slice(1).filter((r: any[]) => r && r.some(c => String(c || '').trim().length > 0));

  return { headers, rows };
}

export async function fetchGoogleSheetValuesFromCsv(
  spreadsheetId: string,
  sheetTitle = 'Sheet1'
): Promise<{ headers: string[]; rows: any[][] }> {
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetTitle)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch spreadsheet CSV (${res.status}). Ensure the sheet link is shared.`);
  }
  const arrayBuf = await res.arrayBuffer();
  const workbook = XLSX.read(new Uint8Array(arrayBuf), { type: 'array' });
  const sheetName = workbook.SheetNames[0] || sheetTitle;
  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) {
    return { headers: [], rows: [] };
  }
  const matrix: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
  if (matrix.length === 0) return { headers: [], rows: [] };
  const headers = (matrix[0] || []).map((h: any) => String(h || '').trim());
  const rows = matrix.slice(1).filter((r: any[]) => r && r.some(c => String(c || '').trim().length > 0));
  return { headers, rows };
}

export async function writeProductsToGoogleSheet(
  spreadsheetId: string,
  sheetTitle: string,
  products: Product[],
  categories: Category[],
  accessToken: string
): Promise<{ updatedRows: number; spreadsheetUrl: string }> {
  const categoryMap = new Map((categories || []).map(c => [c.id, c.nameEn || c.id]));

  const headers = [
    'ID',
    'Product Name',
    'SKU',
    'Category',
    'Price (RWF)',
    'Discount %',
    'Promo Price (RWF)',
    'Cost Price (RWF)',
    'Stock',
    'Status',
    'Shop Name',
    'Image URL',
    'Featured',
    'Description',
    'Last Updated'
  ];

  const rows = products.map(p => [
    p.id,
    p.name,
    p.sku || `CRM-${p.id.slice(-6).toUpperCase()}`,
    categoryMap.get(p.category) || p.category,
    p.price,
    p.discountPercent || 0,
    p.discountPrice || p.price,
    p.costPrice ?? '',
    p.stock,
    p.status || 'Available',
    p.shopName || 'ContactReach Market',
    p.imageUrl || (p.images && p.images[0]) || '',
    p.isFeatured ? 'Yes' : 'No',
    (p.description || '').replace(/[\r\n]+/g, ' '),
    p.updatedAt || new Date().toISOString()
  ]);

  const allValues = [headers, ...rows];
  const encodedTitle = encodeURIComponent(sheetTitle);
  const range = `${encodedTitle}!A1`;

  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      range,
      majorDimension: 'ROWS',
      values: allValues
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to write products to Google Sheet (${res.status}): ${errText}`);
  }

  return {
    updatedRows: products.length,
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
  };
}

export async function createNewGoogleSheetWithProducts(
  title: string,
  products: Product[],
  categories: Category[],
  accessToken: string
): Promise<{ spreadsheetId: string; spreadsheetUrl: string; updatedRows: number }> {
  // 1. Create spreadsheet
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: {
        title: title || `ContactReach Market Products - ${new Date().toISOString().split('T')[0]}`
      },
      sheets: [
        {
          properties: {
            title: 'Products'
          }
        }
      ]
    })
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Failed to create Google Sheet (${createRes.status}): ${errText}`);
  }

  const sheetData = await createRes.json();
  const spreadsheetId = sheetData.spreadsheetId;

  // 2. Write products into newly created sheet
  const writeResult = await writeProductsToGoogleSheet(spreadsheetId, 'Products', products, categories, accessToken);

  return {
    spreadsheetId,
    spreadsheetUrl: writeResult.spreadsheetUrl,
    updatedRows: writeResult.updatedRows
  };
}
