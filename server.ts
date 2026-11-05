import dotenv from 'dotenv';
dotenv.config();
process.env.DISABLE_HMR = 'true';

import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { initializeApp as initFirebaseApp, getApps as getFirebaseApps } from 'firebase/app';
import {
  getFirestore as initFirestore,
  doc as firestoreDoc,
  getDoc as firestoreGetDoc,
  getDocs as firestoreGetDocs,
  setDoc as firestoreSetDoc,
  deleteDoc as firestoreDeleteDoc,
  collection as firestoreCollection
} from 'firebase/firestore/lite';
import { initialProducts, initialCategories, initialSettings, initialShops } from './src/data/initialData.ts';
import {
  MAIN_CATEGORY_DEFINITIONS,
  generateFlatCategoryRecords,
  mapProductToCategoryHierarchy
} from './src/data/categoryStructure.ts';
import * as XLSX from 'xlsx';
import {
  Product, Order, PaymentConfirmation, AppSettings, OrderStatus, Category,
  PaymentStatus, PaymentMethod, ProductStatus, VendorShop, AdminMessage,
  CustomerProblemReport, Coupon, InventoryLog, AuditLog, CustomerUser,
  AdminUser, AdminRole, PaymentMethodConfig, ProductReview, ProductVariation,
  CjDropshippingConfig, GoogleSheetSyncConfig,
  AlibabaConfig, AlibabaShippingQuote, PaymentTransaction
} from './src/types.ts';
import { calculateAlibabaShipping, calculateAlibabaLandedPricing } from './src/utils/alibabaShipping.ts';
import { calculateLandedCostAndSellingPrice } from './src/utils/pricing.ts';
import {
  saveProductToPostgres,
  saveOrderToPostgres,
  savePaymentToPostgres,
  saveCategoryToPostgres,
  saveShopToPostgres,
  saveSettingsToPostgres,
  saveProblemToPostgres,
  saveMessageToPostgres,
  deleteProductFromPostgres,
  bulkSyncProductsToPostgres
} from './src/db/repository.ts';
import { db as drizzleDb } from './src/db/index.ts';
import {
  products as productsTable,
  orders as ordersTable,
  categories as categoriesTable,
  paymentConfirmations as paymentsTable,
  vendorShops as shopsTable
} from './src/db/schema.ts';
import { count } from 'drizzle-orm';

// Universal category normalizer mapping arbitrary labels, subcategories & legacy IDs to the canonical categories
export function normalizeCategoryId(rawCategory?: string, name?: string): string {
  const combined = (String(rawCategory || '') + ' ' + String(name || '')).toLowerCase();
  const c = String(rawCategory || '').toLowerCase().trim();

  const exactMatch = MAIN_CATEGORY_DEFINITIONS.find(m => m.id === c);
  if (exactMatch) return exactMatch.id;

  if (['automobile-accessory-tools', 'auto', 'car', 'cars', 'automotive', 'vehicle', 'tools'].includes(c) || combined.includes('motorcycle') || combined.includes('helmet') || combined.includes('obd') || combined.includes('dashcam') || combined.includes('wrench') || combined.includes('diagnostic')) return 'automobile-accessory-tools';
  if (['computer-office', 'books', 'books & office', 'computer', 'office', 'stationery'].includes(c) || combined.includes('keyboard') || combined.includes('mouse') || combined.includes('laptop') || combined.includes('printer') || combined.includes('scanner') || combined.includes('pos') || combined.includes('paper')) return 'computer-office';
  if (['phones-tel', 'phones', 'phone', 'telephone', 'tel'].includes(c) || combined.includes('smartphone') || combined.includes('iphone') || combined.includes('samsung phone') || combined.includes('charger') || combined.includes('screen protector') || combined.includes('phone case') || combined.includes('power bank')) return 'phones-tel';
  if (['hair', 'wigs', 'human-hair', 'lace-wig'].includes(c) || combined.includes('wig') || combined.includes('lace frontal') || combined.includes('hair extension') || combined.includes('braid') || combined.includes('human hair') || combined.includes('hair curl') || combined.includes('lace closure')) return 'hair';
  if (['weddings', 'wedding', 'bridal', 'marriage'].includes(c) || combined.includes('wedding') || combined.includes('bridal') || combined.includes('wedding gown') || combined.includes('tuxedo') || combined.includes('veil')) return 'weddings';
  if (['shoes', 'footwear', 'fashion-shoes'].includes(c) || combined.includes('sneaker') || combined.includes('shoe') || combined.includes('loafers') || combined.includes('heels') || combined.includes('sandal') || combined.includes('boots') || combined.includes('oxford')) return 'shoes';
  if (['luggage-bags', 'ibikapu', 'bags & luggage', 'bags and fashion accessories', 'bags', 'backpacks', 'luggage'].includes(c) || combined.includes('backpack') || combined.includes('handbag') || combined.includes('suitcase') || combined.includes('crossbody') || combined.includes('wallet') || combined.includes('purse') || combined.includes('clutch')) return 'luggage-bags';
  if (['watch-jewelry', 'amasaha', 'watches & jewelry', 'watches', 'jewelry'].includes(c) || combined.includes('watch') || combined.includes('earring') || combined.includes('ring') || combined.includes('bracelet') || combined.includes('necklace') || combined.includes('anklet')) return 'watch-jewelry';
  if (['kids-toys', 'abana', 'kids & toys', 'kids', 'toys', 'baby'].includes(c) || combined.includes('toy') || combined.includes('baby') || combined.includes('kid') || combined.includes('stroller') || combined.includes('puzzle') || combined.includes('lego')) return 'kids-toys';
  if (['beauty', 'hair-beauty', 'beauty & cosmetics', 'beauty & personal care', 'salon', 'makeup', 'skincare'].includes(c) || combined.includes('serum') || combined.includes('cream') || combined.includes('lipstick') || combined.includes('cosmetic') || combined.includes('makeup') || combined.includes('mascara') || combined.includes('lotion')) return 'beauty';
  if (['home-appliances', 'amatara', 'lighting & gadgets', 'lighting', 'lights', 'lamps', 'impano', 'gifts & home decor', 'supermarket', 'supermarket & food', 'kitchen', 'home'].includes(c) || combined.includes('lamp') || combined.includes('light') || combined.includes('led') || combined.includes('blender') || combined.includes('appliance') || combined.includes('bedding') || combined.includes('curtain') || combined.includes('cookware') || combined.includes('pot') || combined.includes('knife')) return 'home-appliances';
  if (['clothing', 'fashion', 'fashion & apparel', 'apparel', 'clothes'].includes(c) || combined.includes('cloth') || combined.includes('apparel') || combined.includes('dress') || combined.includes('shirt') || combined.includes('jacket') || combined.includes('hoodie') || combined.includes('trouser') || combined.includes('pant') || combined.includes('sportswear') || combined.includes('jersey')) return 'clothing';
  if (['electronics', 'electronics & tv', 'tech accessories & smart gadgets', 'electronic'].includes(c) || combined.includes('speaker') || combined.includes('audio') || combined.includes('camera') || combined.includes('earbud') || combined.includes('headphone') || combined.includes('bluetooth') || combined.includes('cable')) return 'electronics';

  return 'clothing';
}

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const DB_FILE = path.resolve('data/market_db.json');

// Firestore Initialization Placeholder (if config supplied)
let firestoreDbInstance: any = null;
async function saveToFirestoreAsync(collectionName: string, docId: string, data: any) {
  if (!firestoreDbInstance) return;
  try {
    const docRef = firestoreDoc(firestoreDbInstance, collectionName, docId);
    await firestoreSetDoc(docRef, data, { merge: true });
  } catch (e) {
    // Silent fail if Firestore offline
  }
}

// Ensure data directory exists
if (!fs.existsSync(path.resolve('data'))) {
  fs.mkdirSync(path.resolve('data'), { recursive: true });
}

export interface SupplierApplication {
  id: string;
  businessName: string;
  ownerName: string;
  phone: string;
  email?: string;
  tinNumber?: string;
  location: string;
  category: string;
  description?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface SupplierPayoutRecord {
  id: string;
  shopId: string;
  shopName: string;
  orderId: string;
  orderNumber: string;
  orderTotal: number;
  commissionRate: number;
  commissionEarned: number;
  payoutAmount: number;
  status: 'Pending' | 'Approved' | 'Paid' | 'Cancelled';
  paymentReference?: string;
  paidAt?: string;
  approvedBy?: string;
  createdAt: string;
}

interface MarketDatabase {
  products: Product[];
  cjPendingProducts?: Product[];
  categories: Category[];
  shops: VendorShop[];
  orders: Order[];
  paymentConfirmations: PaymentConfirmation[];
  paymentMethodsConfig: PaymentMethodConfig[];
  messages: AdminMessage[];
  customerProblems: CustomerProblemReport[];
  coupons: Coupon[];
  inventoryLogs: InventoryLog[];
  auditLogs: AuditLog[];
  customers: CustomerUser[];
  adminUsers: AdminUser[];
  reviews: ProductReview[];
  supplierApplications: SupplierApplication[];
  supplierPayouts: SupplierPayoutRecord[];
  paymentTransactions?: PaymentTransaction[];
  settings: AppSettings;
  deletedRecordIds: string[];
  adminTokens: Map<string, { user: AdminUser; expiresAt: number }>;
  customerTokens: Map<string, { customerId: string; expiresAt: number }>;
}

const defaultPaymentMethods: PaymentMethodConfig[] = [
  {
    id: 'pm-mtn-momo',
    name: 'MTN Mobile Money (Direct Transfer)',
    type: 'MTN Mobile Money',
    receiverName: 'Ruth',
    receiverAccount: '0780022600',
    instructions: 'Dial *182*1*1*0780022600*AMOUNT# to send mobile money directly to Ruth.',
    isActive: true
  },
  {
    id: 'pm-mtn-merchant',
    name: 'MTN MoMoPay (Merchant Code)',
    type: 'MTN Merchant Code',
    receiverName: 'ContactReach Market',
    receiverAccount: '2328354',
    instructions: 'Dial *182*8*1*2328354*AMOUNT# to pay Ruth / ContactReach Market merchant.',
    isActive: true
  },
  {
    id: 'pm-airtel',
    name: 'Airtel Money',
    type: 'Airtel Money',
    receiverName: 'Ruth',
    receiverAccount: '0780022600',
    instructions: 'Dial *182*1*2*0780022600*AMOUNT# to pay via Airtel Money.',
    isActive: true
  },
  {
    id: 'pm-bank',
    name: 'Bank Transfer / I&M Bank Rwanda',
    type: 'Bank Transfer',
    receiverName: 'ContactReach Media Ltd',
    receiverAccount: '00014-0239102-19 (I&M Bank)',
    instructions: 'Transfer to ContactReach Media Ltd, Account 00014-0239102-19. Use your Order # as reference.',
    isActive: true
  },
  {
    id: 'pm-cod',
    name: 'Cash on Pickup / Collection',
    type: 'Cash on Delivery',
    receiverName: 'Ruth / Warehouse Desk',
    receiverAccount: 'Fair View Plaza, Kigali',
    instructions: 'Pay in cash when picking up your packaged order at Fair View Plaza, Kigali.',
    isActive: true
  }
];

const defaultCoupons: Coupon[] = [
  {
    id: 'coup-welcome',
    code: 'WELCOME10',
    discountType: 'percentage',
    discountValue: 10,
    minOrderAmount: 10000,
    maxDiscount: 10000,
    expiresAt: '2026-12-31T23:59:59Z',
    usageLimit: 500,
    timesUsed: 0,
    isActive: true
  }
];

const defaultAdminUsers: AdminUser[] = [
  {
    id: 'adm-owner-ruth',
    name: 'Ruth (System Owner)',
    email: 'contactreachmedialimited@gmail.com',
    role: 'owner',
    active: true,
    phone: '0780022600'
  },
  {
    id: 'adm-owner-umuhuza',
    name: 'Umuhuza Market (Platform Owner)',
    email: 'umuhuzamarket@gmail.com',
    role: 'owner',
    active: true,
    phone: '0780022600'
  },
  {
    id: 'adm-owner-thierry-coss',
    name: 'Thierry Maniriho (Platform Owner)',
    email: 'manirihocoss@gmail.com',
    role: 'owner',
    active: true,
    phone: '0792412177'
  },
  {
    id: 'adm-owner-thierry-primary',
    name: 'Thierry Maniriho (Platform Owner)',
    email: 'manirihothierry36@gmail.com',
    role: 'owner',
    active: true,
    phone: '0792412177'
  }
];

// Clean Database initialization (Empty products array ensures no forced hardcoded/unwanted products)
let db: MarketDatabase = {
  products: [],
  cjPendingProducts: [],
  categories: [...initialCategories],
  shops: [...initialShops],
  orders: [],
  paymentConfirmations: [],
  paymentMethodsConfig: [...defaultPaymentMethods],
  messages: [],
  customerProblems: [],
  coupons: [...defaultCoupons],
  inventoryLogs: [],
  auditLogs: [],
  customers: [],
  adminUsers: [...defaultAdminUsers],
  reviews: [],
  supplierApplications: [],
  supplierPayouts: [],
  paymentTransactions: [],
  settings: {
    ...initialSettings,
    email: 'contactreachmedialimited@gmail.com',
    phone: '0780022600'
  },
  deletedRecordIds: [],
  adminTokens: new Map(),
  customerTokens: new Map()
};

function logAudit(admin: { name?: string; role?: string } | undefined | null, action: string, details: string, entityType?: string, entityId?: string) {
  const audit: AuditLog = {
    id: `aud-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
    timestamp: new Date().toISOString(),
    adminName: admin?.name || 'Ruth (System Owner)',
    adminRole: (admin?.role as AdminRole) || 'owner',
    action,
    details
  };
  if (entityType) audit.entityType = entityType;
  if (entityId) audit.entityId = entityId;

  db.auditLogs.unshift(audit);
  if (db.auditLogs.length > 500) db.auditLogs.pop();
  saveDbToDisk();
  saveToFirestoreAsync('auditLogs', audit.id, audit);
}

// Dynamic Product Image Resolver
const CANONICAL_PRODUCT_IMAGES: { match: RegExp; url: string }[] = [
  { match: /speaker|soundbar|audio box|loudspeaker/i, url: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600&auto=format&fit=crop&q=80' },
  { match: /headphone|earphone|airpod|earbud|headset/i, url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80' },
  { match: /watch|smartwatch|amasaha|fitness tracker|clock/i, url: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=600&auto=format&fit=crop&q=80' },
  { match: /sneaker|running shoe|athletic shoe|street sneaker|sport sneaker|canvas shoe/i, url: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=600&auto=format&fit=crop&q=80' },
  { match: /dress shoe|leather shoe|oxford|formal shoe/i, url: 'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=600&auto=format&fit=crop&q=80' },
  { match: /serum|skincare|facial|cream|lotion|beauty/i, url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&auto=format&fit=crop&q=80' },
  { match: /crossbody|bag|backpack|wallet|purse|tote|handbag/i, url: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&auto=format&fit=crop&q=80' }
];

function resolveProductImageDueToProduct(
  item?: { productName?: string; name?: string; imageUrl?: string; image?: string; productId?: string },
  catalogProducts?: Product[]
): string {
  if (!item) return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80';

  const name = (item.productName || item.name || '').trim();
  const currentUrl = (item.imageUrl || item.image || '').trim();
  const isGenericLogo = !currentUrl || currentUrl === '/logo.png' || currentUrl.endsWith('/logo.png');

  const productsList = catalogProducts || db.products;
  if (productsList && productsList.length > 0) {
    const match = productsList.find(p => (item.productId && p.id === item.productId) || (p.name && name && p.name.trim().toLowerCase() === name.toLowerCase()));
    if (match) {
      const uploadedImg = (match.imageUrl || match.images?.[0] || '').trim();
      if (uploadedImg && !uploadedImg.includes('logo.png')) return uploadedImg;
    }
  }

  if (currentUrl && !isGenericLogo) return currentUrl;

  for (const entry of CANONICAL_PRODUCT_IMAGES) {
    if (entry.match.test(name)) return entry.url;
  }

  return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80';
}

const sseClients = new Set<Response>();

export function calculateCurrentStats() {
  const confirmedOrDelivered = db.orders.filter(o =>
    ['Paid', 'Confirmed', 'Preparing', 'Ready for Delivery', 'Out for Delivery', 'Delivered', 'Completed'].includes(o.status || '')
  );

  return {
    totalSalesFrw: confirmedOrDelivered.reduce((sum, o) => sum + o.totalAmount, 0),
    totalOrders: db.orders.length,
    totalProducts: db.products.length,
    activeProducts: db.products.filter(p => p.status !== 'Hidden').length,
    totalCategories: db.categories.length,
    totalShops: db.shops.length,
    totalCustomers: db.customers.length
  };
}

export function broadcastDatabaseEvent(eventType: string = 'database_change', payload?: any) {
  if (sseClients.size === 0) return;
  const stats = calculateCurrentStats();
  const messageData = JSON.stringify({ type: eventType, timestamp: new Date().toISOString(), stats, payload: payload || null });
  const sseMessage = `event: db_update\ndata: ${messageData}\n\n`;

  for (const client of sseClients) {
    try {
      client.write(sseMessage);
    } catch {
      sseClients.delete(client);
    }
  }
}

function saveDbToDisk(eventType: string = 'database_change', payload?: any) {
  try {
    const dataToSave = {
      products: db.products,
      categories: db.categories,
      shops: db.shops,
      orders: db.orders,
      paymentConfirmations: db.paymentConfirmations,
      paymentMethodsConfig: db.paymentMethodsConfig,
      messages: db.messages,
      customerProblems: db.customerProblems,
      coupons: db.coupons,
      inventoryLogs: db.inventoryLogs,
      auditLogs: db.auditLogs,
      customers: db.customers,
      adminUsers: db.adminUsers,
      reviews: db.reviews,
      supplierApplications: db.supplierApplications,
      supplierPayouts: db.supplierPayouts,
      paymentTransactions: db.paymentTransactions || [],
      settings: db.settings,
      deletedRecordIds: db.deletedRecordIds || []
    };

    const tempFile = path.resolve('data/market_db.tmp.json');
    fs.writeFileSync(tempFile, JSON.stringify(dataToSave), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);

    broadcastDatabaseEvent(eventType, payload);
  } catch (err) {
    console.error('Failed to persist DB to disk:', err);
  }
}

function loadDbFromDisk() {
  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      
      // Load products cleanly, filtering invalid/broken entities
      if (parsed.products && Array.isArray(parsed.products)) {
        db.products = parsed.products
          .filter((p: any) => p && p.id && p.name)
          .map((p: any) => {
            const normCat = normalizeCategoryId(p.category, p.name);
            const mapped = mapProductToCategoryHierarchy(p);
            return {
              ...p,
              category: normCat,
              mainCategoryId: mapped.mainCategoryId,
              subCategoryId: mapped.subCategoryId,
              categoryName: mapped.categoryName,
              subCategoryName: mapped.subCategoryName,
              merchantCode: '2328354',
              receiverPhone: '0780022600'
            };
          });
      }
      if (parsed.categories && Array.isArray(parsed.categories)) db.categories = parsed.categories;
      if (parsed.shops && Array.isArray(parsed.shops)) db.shops = parsed.shops;
      if (parsed.orders && Array.isArray(parsed.orders)) db.orders = parsed.orders;
      if (parsed.paymentConfirmations && Array.isArray(parsed.paymentConfirmations)) db.paymentConfirmations = parsed.paymentConfirmations;
      if (parsed.paymentMethodsConfig && Array.isArray(parsed.paymentMethodsConfig)) {
        db.paymentMethodsConfig = parsed.paymentMethodsConfig.map((pm: any) => {
          const item = { ...pm };
          if (item.type === 'MTN Merchant Code' || item.name?.includes('Merchant Code')) {
            item.receiverAccount = '2328354';
            item.instructions = 'Dial *182*8*1*2328354*AMOUNT# to pay Ruth / ContactReach Market merchant.';
          }
          return item;
        });
      }
      if (parsed.messages && Array.isArray(parsed.messages)) db.messages = parsed.messages;
      if (parsed.customerProblems && Array.isArray(parsed.customerProblems)) db.customerProblems = parsed.customerProblems;
      if (parsed.coupons && Array.isArray(parsed.coupons)) db.coupons = parsed.coupons;
      if (parsed.auditLogs && Array.isArray(parsed.auditLogs)) db.auditLogs = parsed.auditLogs;
      if (parsed.customers && Array.isArray(parsed.customers)) db.customers = parsed.customers;
      if (parsed.adminUsers && Array.isArray(parsed.adminUsers)) db.adminUsers = parsed.adminUsers;
      if (parsed.settings) db.settings = parsed.settings;
    } catch (err) {
      console.error('Error loading disk database, initializing defaults:', err);
    }
  }
}

// Middlewares
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Express API Routes
app.get('/api/events', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  sseClients.add(res);
  req.on('close', () => sseClients.delete(res));
});

app.get('/api/products', (req: Request, res: Response) => {
  res.json({ success: true, products: db.products });
});

app.post('/api/products', (req: Request, res: Response) => {
  const newProduct: Product = {
    id: `prod-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...req.body
  };
  db.products.unshift(newProduct);
  saveDbToDisk('product_added', { product: newProduct });
  res.json({ success: true, product: newProduct });
});

app.delete('/api/products/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  db.products = db.products.filter(p => p.id !== id);
  db.deletedRecordIds.push(id);
  saveDbToDisk('product_deleted', { productId: id });
  res.json({ success: true, message: 'Product deleted successfully' });
});

app.get('/api/orders', (req: Request, res: Response) => {
  res.json({ success: true, orders: db.orders });
});

app.post('/api/orders', (req: Request, res: Response) => {
  const newOrder: Order = {
    id: `ord-${Date.now()}`,
    orderNumber: `CRM-${Math.floor(100000 + Math.random() * 900000)}`,
    createdAt: new Date().toISOString(),
    status: 'Pending',
    paymentStatus: 'Pending Payment',
    ...req.body
  };
  db.orders.unshift(newOrder);
  saveDbToDisk('order_created', { order: newOrder });
  res.json({ success: true, order: newOrder });
});

app.get('/api/categories', (req: Request, res: Response) => {
  res.json({ success: true, categories: db.categories });
});

app.get('/api/settings', (req: Request, res: Response) => {
  res.json({ success: true, settings: db.settings });
});

app.get('/api/stats', (req: Request, res: Response) => {
  res.json({ success: true, stats: calculateCurrentStats() });
});

// Load database on server launch
loadDbFromDisk();

// Vite / Static Assets Server integration
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom'
    });
    app.use(vite.middlewares);
    app.use('*', async (req, res, next) => {
      if (req.originalUrl.startsWith('/api')) return next();
      try {
        const template = fs.readFileSync(path.resolve('index.html'), 'utf-8');
        const page = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(page);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    app.use(express.static(path.resolve('dist')));
    app.get('*', (req, res) => {
      if (!req.originalUrl.startsWith('/api')) {
        res.sendFile(path.resolve('dist/index.html'));
      }
    });
  }

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();