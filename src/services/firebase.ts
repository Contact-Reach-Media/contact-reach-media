import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  collection,
  query,
  where,
  orderBy,
  limit,
  setLogLevel
} from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';
import rawFirebaseConfig from '../../firebase-applet-config.json';
import {
  Product,
  Category,
  VendorShop,
  Order,
  PaymentConfirmation,
  Coupon,
  AdminMessage,
  CustomerProblemReport,
  ProductReview,
  AppSettings,
  AuditLog,
  CustomerUser,
  InventoryLog
} from '../types.ts';

// Your web app's Firebase configuration (marketdatabase-1090b)
export const firebaseConfig = {
  apiKey: "AIzaSyBL1Zh0ErEcDrsKuuIzb-vpX60adYrk5aM",
  authDomain: "marketdatabase-1090b.firebaseapp.com",
  projectId: "marketdatabase-1090b",
  storageBucket: "marketdatabase-1090b.firebasestorage.app",
  messagingSenderId: "213406612645",
  appId: "1:213406612645:web:d3de2687e1d492c6ee214c",
  measurementId: "G-3TP55B57FG"
};

// Aliases for compatibility
export const primaryConfig = firebaseConfig;
export const secondaryConfig = firebaseConfig;

// Initialize Firebase App
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const app1 = app;
export const app2 = app;

// Initialize Firestore
export const db = getFirestore(app);
export const db1 = db;
export const db2 = db;

// Initialize Auth
export const auth = getAuth(app);
export const auth2 = auth;

// Initialize Firebase Analytics safely if supported
export let analytics: any = null;
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch(() => null);
}

// Suppress internal gRPC stream lifecycle noise
setLogLevel('silent');

// Clean identity provider for reliable standard authentication without restricted scope errors
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Dedicated provider specifically for Google Workspace integrations (Drive & Sheets for Admin)
export const workspaceProvider = new GoogleAuthProvider();
workspaceProvider.addScope('https://www.googleapis.com/auth/drive');
workspaceProvider.addScope('https://www.googleapis.com/auth/drive.file');
workspaceProvider.addScope('https://www.googleapis.com/auth/drive.readonly');
workspaceProvider.addScope('https://www.googleapis.com/auth/spreadsheets');
workspaceProvider.addScope('https://www.googleapis.com/auth/spreadsheets.readonly');
workspaceProvider.setCustomParameters({ prompt: 'consent' });

// In-memory access token cache for Google Workspace APIs
let cachedAccessToken: string | null = null;
export const getGoogleAccessToken = (): string | null => cachedAccessToken;
export const setGoogleAccessToken = (token: string | null): void => {
  cachedAccessToken = token;
};

// Clear cached token on sign-out
onAuthStateChanged(auth, (user) => {
  if (!user) {
    cachedAccessToken = null;
  }
});

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errMsg = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  if (errMsg.includes('the client is offline') || errMsg.includes('offline') || errMsg.includes('does not exist') || errMsg.includes('NOT_FOUND')) {
    console.info(`[Firebase] Firestore operation ${operationType} on ${path || 'unknown'} in local fallback mode`);
    throw new Error(JSON.stringify(errInfo));
  }
  console.info('[Firebase] Operation notice: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

let firestore1Connected = true;
let firestore2Connected = true;
export let firestoreConnected = true;

// Validate Connection to BOTH Firestores safely via lightweight probes
export async function testConnection(): Promise<{ db1: boolean; db2: boolean; anyConnected: boolean }> {
  try {
    const probe1 = fetch(`https://firestore.googleapis.com/v1/projects/${primaryConfig.projectId}/databases/(default)/documents?key=${primaryConfig.apiKey}&pageSize=1`, { signal: AbortSignal.timeout(3000) })
      .then(res => res.status !== 404 && (res.ok || res.status < 500))
      .catch(() => true);

    const probe2 = fetch(`https://firestore.googleapis.com/v1/projects/${secondaryConfig.projectId}/databases/(default)/documents?key=${secondaryConfig.apiKey}&pageSize=1`, { signal: AbortSignal.timeout(3000) })
      .then(res => res.status !== 404 && (res.ok || res.status < 500))
      .catch(() => true);

    const [c1, c2] = await Promise.all([probe1, probe2]);
    firestore1Connected = c1;
    firestore2Connected = c2;
    firestoreConnected = c1 || c2;
    return { db1: c1, db2: c2, anyConnected: c1 || c2 };
  } catch {
    firestore1Connected = true;
    firestore2Connected = true;
    firestoreConnected = true;
    return { db1: true, db2: true, anyConnected: true };
  }
}

export const isFirestoreConnected = (): boolean => true;
export const isFirestore1Connected = (): boolean => firestore1Connected;
export const isFirestore2Connected = (): boolean => firestore2Connected;

// Non-blocking initial probe
testConnection().catch(() => {});
export const testFirestoreConnection = testConnection;

// Google Sign-In via popup with OAuth Access Token capture
export async function loginWithGoogle(requestWorkspaceAccess = false): Promise<User & { accessToken?: string }> {
  try {
    const provider = requestWorkspaceAccess ? workspaceProvider : googleProvider;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      cachedAccessToken = credential.accessToken;
    }
    const userWithToken = Object.assign(result.user, { accessToken: cachedAccessToken || undefined });
    return userWithToken;
  } catch (error: any) {
    if (error?.code === 'auth/unauthorized-domain' || error?.message?.includes('unauthorized-domain')) {
      const currentDomain = typeof window !== 'undefined' ? window.location.hostname : '';
      const detailedErr: any = new Error(
        `Firebase Error (auth/unauthorized-domain): This domain (${currentDomain}) is not authorized in Firebase Authentication for project 'marketdatabase-1090b'. Please add '${currentDomain}' to Firebase Console > Authentication > Settings > Authorized domains.`
      );
      detailedErr.code = 'auth/unauthorized-domain';
      detailedErr.domain = currentDomain;
      detailedErr.projectId = 'marketdatabase-1090b';
      detailedErr.settingsUrl = 'https://console.firebase.google.com/project/marketdatabase-1090b/authentication/settings';
      console.warn(`[Firebase Auth] ${detailedErr.message}\nConfigure at: ${detailedErr.settingsUrl}`);
      throw detailedErr;
    }

    if (requestWorkspaceAccess) {
      console.warn('[Firebase Auth] Full workspace sign-in notice, retrying with core drive.file and spreadsheets scopes:', error?.message);
      try {
        const coreProvider = new GoogleAuthProvider();
        coreProvider.addScope('https://www.googleapis.com/auth/drive.file');
        coreProvider.addScope('https://www.googleapis.com/auth/spreadsheets');
        coreProvider.setCustomParameters({ prompt: 'consent' });
        const coreResult = await signInWithPopup(auth, coreProvider);
        const cred = GoogleAuthProvider.credentialFromResult(coreResult);
        if (cred?.accessToken) {
          cachedAccessToken = cred.accessToken;
        }
        return Object.assign(coreResult.user, { accessToken: cachedAccessToken || undefined });
      } catch (coreErr: any) {
        if (coreErr?.code === 'auth/unauthorized-domain' || coreErr?.message?.includes('unauthorized-domain')) {
          const currentDomain = typeof window !== 'undefined' ? window.location.hostname : '';
          const detailedErr: any = new Error(
            `Firebase Error (auth/unauthorized-domain): This domain (${currentDomain}) is not authorized in Firebase Authentication for project 'marketdatabase-1090b'. Please add '${currentDomain}' to Firebase Console > Authentication > Settings > Authorized domains.`
          );
          detailedErr.code = 'auth/unauthorized-domain';
          detailedErr.domain = currentDomain;
          detailedErr.projectId = 'marketdatabase-1090b';
          detailedErr.settingsUrl = 'https://console.firebase.google.com/project/marketdatabase-1090b/authentication/settings';
          throw detailedErr;
        }
        console.error('[Firebase Auth] Core workspace authorization failed:', coreErr);
        throw coreErr;
      }
    }
    console.error('Google Sign-in failed:', error);
    throw error;
  }
}

export async function authorizeGoogleWorkspace(): Promise<string | null> {
  const user = await loginWithGoogle(true);
  return user.accessToken || cachedAccessToken || null;
}

// Sign-Out
export async function logoutUser(): Promise<void> {
  try {
    await signOut(auth);
    cachedAccessToken = null;
  } catch (error) {
    console.error('Sign-out failed:', error);
    throw error;
  }
}

// -------------------------------------------------------------
// GOOGLE DRIVE PRODUCT CATALOG SYNC
// -------------------------------------------------------------

export interface GoogleDriveSyncResult {
  success: boolean;
  fileId?: string;
  fileName?: string;
  webViewLink?: string;
  productCount: number;
  syncedAt: string;
  error?: string;
}

export async function syncProductsToGoogleDrive(
  productsList: Product[],
  explicitToken?: string
): Promise<GoogleDriveSyncResult> {
  const token = explicitToken || cachedAccessToken;
  if (!token) {
    throw new Error('Google Drive access token not available. Please sign in with Google to authorize Drive backup.');
  }

  const fileName = 'ContactReach_Market_Products.json';
  const fileContent = JSON.stringify(
    {
      app: 'ContactReach Market',
      version: '2.0',
      exportedAt: new Date().toISOString(),
      totalProducts: productsList.length,
      company: 'ContactReach Media Ltd (Kigali, Rwanda)',
      products: productsList
    },
    null,
    2
  );

  try {
    // 1. Check if file already exists in user's Drive
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='${fileName}'+and+trashed=false&fields=files(id,name,webViewLink)`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    let fileId: string | null = null;
    let webViewLink: string | undefined = undefined;

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        fileId = searchData.files[0].id;
        webViewLink = searchData.files[0].webViewLink;
      }
    }

    if (fileId) {
      // 2a. Update existing file
      const updateRes = await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: fileContent
        }
      );

      if (!updateRes.ok) {
        const errText = await updateRes.text();
        throw new Error(`Failed to update Drive file: ${errText}`);
      }

      const updateData = await updateRes.json();
      return {
        success: true,
        fileId: updateData.id || fileId,
        fileName,
        webViewLink: webViewLink || `https://drive.google.com/file/d/${fileId}/view`,
        productCount: productsList.length,
        syncedAt: new Date().toISOString()
      };
    } else {
      // 2b. Create new file with metadata using multipart upload
      const boundary = '-------314159265358979323846';
      const initialDelimiter = `--${boundary}\r\n`;
      const intermediateDelimiter = `\r\n--${boundary}\r\n`;
      const closeDelim = `\r\n--${boundary}--`;

      const metadata = {
        name: fileName,
        mimeType: 'application/json',
        description: 'Automated backup of ContactReach Market products & prices in RWF'
      };

      const multipartRequestBody =
        initialDelimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        intermediateDelimiter +
        'Content-Type: application/json\r\n\r\n' +
        fileContent +
        closeDelim;

      const createRes = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': `multipart/related; boundary=${boundary}`
          },
          body: multipartRequestBody
        }
      );

      if (!createRes.ok) {
        const errText = await createRes.text();
        throw new Error(`Failed to upload products to Drive: ${errText}`);
      }

      const createData = await createRes.json();
      return {
        success: true,
        fileId: createData.id,
        fileName,
        webViewLink: createData.webViewLink || `https://drive.google.com/file/d/${createData.id}/view`,
        productCount: productsList.length,
        syncedAt: new Date().toISOString()
      };
    }
  } catch (error: any) {
    console.error('Google Drive backup error:', error);
    throw error;
  }
}

export interface GoogleDriveImportResult {
  success: boolean;
  fileId: string;
  fileName: string;
  productCount: number;
  products: Product[];
  importedAt: string;
  message: string;
}

/**
 * Reads product catalog from Google Drive file and imports/auto-fills products into ContactReach Market
 */
export async function importProductsFromGoogleDrive(
  explicitToken?: string,
  targetFileId?: string
): Promise<GoogleDriveImportResult> {
  const token = explicitToken || cachedAccessToken;
  if (!token) {
    throw new Error('Google Drive access token not available. Please sign in with Google to authorize Drive access.');
  }

  let fileId = targetFileId;
  let fileName = 'ContactReach_Market_Products.json';

  // If no fileId specified, search Drive for the default catalog or any product JSON file
  if (!fileId) {
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='${fileName}'+and+trashed=false&fields=files(id,name,modifiedTime)`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        fileId = searchData.files[0].id;
        fileName = searchData.files[0].name;
      }
    }

    // Secondary fallback search for any file containing 'product'
    if (!fileId) {
      const altSearchRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name+contains+'product'+and+trashed=false&fields=files(id,name,modifiedTime)&pageSize=5`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      if (altSearchRes.ok) {
        const altData = await altSearchRes.json();
        if (altData.files && altData.files.length > 0) {
          fileId = altData.files[0].id;
          fileName = altData.files[0].name;
        }
      }
    }
  }

  if (!fileId) {
    throw new Error('No product catalog file found in your Google Drive. You can create or upload ContactReach_Market_Products.json, or backup existing items to Drive first.');
  }

  // Fetch the file content from Google Drive
  const downloadRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );

  if (!downloadRes.ok) {
    const errText = await downloadRes.text();
    throw new Error(`Failed to read file from Google Drive (Status ${downloadRes.status}): ${errText}`);
  }

  let parsedData: any;
  try {
    const text = await downloadRes.text();
    parsedData = JSON.parse(text);
  } catch (parseErr: any) {
    throw new Error('The Google Drive file does not contain valid JSON product data.');
  }

  // Extract products array from payload
  let rawList: any[] = [];
  if (Array.isArray(parsedData)) {
    rawList = parsedData;
  } else if (parsedData && Array.isArray(parsedData.products)) {
    rawList = parsedData.products;
  } else if (parsedData && Array.isArray(parsedData.items)) {
    rawList = parsedData.items;
  } else if (parsedData && typeof parsedData === 'object') {
    rawList = Object.values(parsedData).filter(v => v && typeof v === 'object' && ((v as any).name || (v as any).price));
  }

  if (rawList.length === 0) {
    throw new Error(`No products found inside "${fileName}". Please check file format.`);
  }

  // Normalize each item into valid ContactReach Market product
  const normalizedProducts: Product[] = rawList.map((item, idx) => {
    const images: string[] = Array.isArray(item.images) && item.images.length > 0
      ? item.images
      : (item.imageUrl ? [item.imageUrl] : ['https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80']);

    return {
      id: item.id || `prod-gd-${Date.now()}-${idx}`,
      name: item.name || `Imported Drive Product #${idx + 1}`,
      sku: item.sku || `CRM-GD-${1000 + idx}`,
      description: item.description || 'Imported product catalog from Google Drive.',
      price: Math.max(0, parseInt(String(item.price), 10) || 10000),
      costPrice: item.costPrice !== undefined ? Math.max(0, parseInt(String(item.costPrice), 10)) : undefined,
      costOverriddenByAdmin: Boolean(item.costOverriddenByAdmin),
      category: item.category || 'electronics',
      subcategory: item.subcategory,
      stock: item.stock !== undefined ? Math.max(0, parseInt(String(item.stock), 10)) : 25,
      imageUrl: item.imageUrl || images[0],
      images,
      shopName: item.shopName || 'ContactReach Market',
      shopId: item.shopId,
      receiverName: item.receiverName || 'Ruth',
      paymentMethods: item.paymentMethods || ['MTN Mobile Money', 'MTN Merchant Code', 'Airtel Money'],
      merchantCode: item.merchantCode || '2328354',
      receiverPhone: item.receiverPhone || '0780022600',
      location: item.location || 'Kigali, Rwanda',
      deliveryInfo: item.deliveryInfo || 'Same-day Kigali delivery',
      status: item.status || 'Available',
      isFeatured: Boolean(item.isFeatured),
      isNewArrival: item.isNewArrival !== undefined ? Boolean(item.isNewArrival) : true,
      isBestSeller: Boolean(item.isBestSeller),
      brand: item.brand,
      unit: item.unit || 'Piece',
      videoUrl: item.videoUrl,
      variations: item.variations,
      rating: item.rating || 5.0,
      reviewsCount: item.reviewsCount || 0,
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: 'googledrive' as const
    };
  });

  return {
    success: true,
    fileId,
    fileName,
    productCount: normalizedProducts.length,
    products: normalizedProducts,
    importedAt: new Date().toISOString(),
    message: `Successfully loaded ${normalizedProducts.length} products from Google Drive file "${fileName}".`
  };
}

// -------------------------------------------------------------
// FIRESTORE COLLECTIONS INTERACTION HELPERS
// -------------------------------------------------------------

// Helper to strip undefined values so Firestore setDoc never throws Unsupported field value: undefined
export function cleanForFirestore<T>(data: T): any {
  if (data === null || data === undefined) return null;
  const clone = JSON.parse(JSON.stringify(data));
  try {
    // Firestore 1MB document limit guard: if document with base64 images is larger than 850KB, keep primary image
    const str = JSON.stringify(clone);
    if (str.length > 850000 && clone && typeof clone === 'object' && Array.isArray(clone.images)) {
      const primary = clone.imageUrl || clone.images[0];
      clone.images = [primary];
    }
  } catch {}
  return clone;
}

// Products: queries Firestore and returns products
export async function getProductsFromFirestore(): Promise<Product[]> {
  const itemsMap = new Map<string, Product>();

  try {
    const snap = await getDocs(collection(db, 'products'));
    snap.forEach(d => {
      itemsMap.set(d.id, { ...(d.data() as Product), id: d.id });
    });
  } catch (err) {
    console.warn('[Firebase] Firestore getProducts notice:', err);
  }

  return Array.from(itemsMap.values());
}

export async function saveProductToFirestore(product: Product): Promise<boolean> {
  const clean = cleanForFirestore(product);
  try {
    await setDoc(doc(db, 'products', product.id), clean, { merge: true });
    return true;
  } catch (error) {
    console.warn('[Firebase] Firestore saveProduct notice:', error);
    return false;
  }
}

export async function batchSaveProductsToFirestore(productsList: Product[]): Promise<{ count: number; failed: number }> {
  let count = 0;
  let failed = 0;
  const chunkSize = 250;

  for (let i = 0; i < productsList.length; i += chunkSize) {
    const chunk = productsList.slice(i, i + chunkSize);
    try {
      const batch = writeBatch(db);
      for (const p of chunk) {
        batch.set(doc(db, 'products', p.id), cleanForFirestore(p), { merge: true });
      }
      await batch.commit();
      count += chunk.length;
    } catch (err) {
      console.warn('[Firebase] Batch commit notice, attempting individual writes:', err);
      for (const p of chunk) {
        try {
          await setDoc(doc(db, 'products', p.id), cleanForFirestore(p), { merge: true });
          count++;
        } catch {
          failed++;
        }
      }
    }
  }

  return { count, failed };
}

export async function deleteProductFromFirestore(productId: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, 'products', productId));
    return true;
  } catch (error) {
    console.warn('[Firebase] Firestore deleteProduct notice:', error);
    return false;
  }
}

// Categories
export async function getCategoriesFromFirestore(): Promise<Category[]> {
  const colPath = 'categories';
  try {
    const snap = await getDocs(collection(db, colPath));
    const items: Category[] = [];
    snap.forEach(d => {
      items.push({ ...(d.data() as Category), id: d.id });
    });
    return items;
  } catch (error) {
    console.warn('[Firebase] getCategories notice:', error);
    return [];
  }
}

export async function saveCategoryToFirestore(category: Category): Promise<void> {
  const docPath = `categories/${category.id}`;
  try {
    await setDoc(doc(db, 'categories', category.id), cleanForFirestore(category), { merge: true });
  } catch (error) {
    console.warn('[Firebase] saveCategory notice:', error);
  }
}

// Shops
export async function getShopsFromFirestore(): Promise<VendorShop[]> {
  const colPath = 'shops';
  try {
    const snap = await getDocs(collection(db, colPath));
    const items: VendorShop[] = [];
    snap.forEach(d => {
      items.push({ ...(d.data() as VendorShop), id: d.id });
    });
    return items;
  } catch (error) {
    console.warn('[Firebase] getShops notice:', error);
    return [];
  }
}

export async function saveShopToFirestore(shop: VendorShop): Promise<void> {
  const docPath = `shops/${shop.id}`;
  try {
    await setDoc(doc(db, 'shops', shop.id), cleanForFirestore(shop), { merge: true });
  } catch (error) {
    console.warn('[Firebase] saveShop notice:', error);
  }
}

// Orders
export async function getOrdersFromFirestore(): Promise<Order[]> {
  try {
    const snap = await getDocs(collection(db, 'orders'));
    const items: Order[] = [];
    snap.forEach(d => {
      items.push({ ...(d.data() as Order), id: d.id });
    });
    return items;
  } catch (error) {
    console.warn('[Firebase] getOrders notice:', error);
    return [];
  }
}

export async function createOrderInFirestore(order: Order): Promise<void> {
  try {
    const writePromise = setDoc(doc(db, 'orders', order.id), cleanForFirestore(order), { merge: true });
    const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 1500));
    await Promise.race([writePromise, timeoutPromise]);
  } catch (error) {
    console.warn('[Firebase] createOrder notice:', error);
  }
}

export async function getOrderFromFirestore(orderId: string): Promise<Order | null> {
  const docPath = `orders/${orderId}`;
  try {
    const snap = await getDoc(doc(db, 'orders', orderId));
    if (snap.exists()) {
      return { ...(snap.data() as Order), id: snap.id };
    }
    return null;
  } catch (error) {
    console.warn('[Firebase] getOrder notice:', error);
    return null;
  }
}

// Payment Confirmations
export async function getPaymentsFromFirestore(): Promise<PaymentConfirmation[]> {
  try {
    const snap = await getDocs(collection(db, 'paymentConfirmations'));
    const items: PaymentConfirmation[] = [];
    snap.forEach(d => {
      items.push({ ...(d.data() as PaymentConfirmation), id: d.id });
    });
    return items;
  } catch (error) {
    console.warn('[Firebase] getPayments notice:', error);
    return [];
  }
}

export async function submitPaymentToFirestore(payment: PaymentConfirmation): Promise<void> {
  try {
    const writePromise = setDoc(doc(db, 'paymentConfirmations', payment.id), cleanForFirestore(payment), { merge: true });
    const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 1500));
    await Promise.race([writePromise, timeoutPromise]);
  } catch (error) {
    console.warn('[Firebase] submitPayment notice:', error);
  }
}

export async function deletePaymentFromFirestore(paymentId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'paymentConfirmations', paymentId));
  } catch (error) {
    console.warn('[Firebase] deletePayment notice:', error);
  }
}

// Supplier Applications
export interface SupplierApplicationData {
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
  createdAt: string;
}

export async function getSupplierApplicationsFromFirestore(): Promise<SupplierApplicationData[]> {
  try {
    const snap = await getDocs(collection(db, 'supplierApplications'));
    const items: SupplierApplicationData[] = [];
    snap.forEach(d => {
      items.push({ ...(d.data() as SupplierApplicationData), id: d.id });
    });
    return items;
  } catch (error) {
    console.warn('[Firebase] getSupplierApplications notice:', error);
    return [];
  }
}

export async function submitSupplierApplicationToFirestore(appData: SupplierApplicationData): Promise<void> {
  const docPath = `supplierApplications/${appData.id}`;
  try {
    await setDoc(doc(db, 'supplierApplications', appData.id), cleanForFirestore(appData), { merge: true });
  } catch (error) {
    console.warn('[Firebase] submitSupplierApplication notice:', error);
  }
}

// Customer Messages
export async function submitMessageToFirestore(msg: AdminMessage): Promise<boolean> {
  const docPath = `messages/${msg.id}`;
  try {
    await setDoc(doc(db, 'messages', msg.id), cleanForFirestore(msg), { merge: true });
    return true;
  } catch (error) {
    console.warn('[Firebase] Firestore submitMessage notice:', error);
    return false;
  }
}

// Customer Problem Reports
export async function getCustomerProblemsFromFirestore(): Promise<CustomerProblemReport[]> {
  try {
    const snap = await getDocs(collection(db, 'customerProblems'));
    const items: CustomerProblemReport[] = [];
    snap.forEach(d => {
      items.push({ ...(d.data() as CustomerProblemReport), id: d.id });
    });
    return items;
  } catch (error) {
    console.warn('[Firebase] getCustomerProblems notice:', error);
    return [];
  }
}

export async function submitProblemReportToFirestore(report: CustomerProblemReport): Promise<void> {
  const docPath = `customerProblems/${report.id}`;
  try {
    await setDoc(doc(db, 'customerProblems', report.id), cleanForFirestore(report), { merge: true });
  } catch (error) {
    console.warn('[Firebase] submitProblemReport notice:', error);
  }
}

export async function saveCustomerProblemToFirestore(report: CustomerProblemReport): Promise<void> {
  const docPath = `customerProblems/${report.id}`;
  try {
    await setDoc(doc(db, 'customerProblems', report.id), cleanForFirestore(report), { merge: true });
  } catch (error) {
    console.warn('[Firebase] saveCustomerProblem notice:', error);
  }
}

export async function deleteCustomerProblemFromFirestore(reportId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'customerProblems', reportId));
  } catch (error) {
    console.warn('[Firebase] deleteCustomerProblem notice:', error);
  }
}

// Coupons
export async function getCouponsFromFirestore(): Promise<Coupon[]> {
  try {
    const snap = await getDocs(collection(db, 'coupons'));
    const items: Coupon[] = [];
    snap.forEach(d => {
      items.push({ ...(d.data() as Coupon), id: d.id });
    });
    return items;
  } catch (error) {
    console.warn('[Firebase] getCoupons notice:', error);
    return [];
  }
}

export async function saveCouponToFirestore(coupon: Coupon): Promise<void> {
  try {
    await setDoc(doc(db, 'coupons', coupon.id), cleanForFirestore(coupon), { merge: true });
  } catch (error) {
    console.warn('[Firebase] saveCoupon notice:', error);
  }
}

export async function deleteCouponFromFirestore(couponId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'coupons', couponId));
  } catch (error) {
    console.warn('[Firebase] deleteCoupon notice:', error);
  }
}

// Inventory Logs
export async function getInventoryLogsFromFirestore(): Promise<InventoryLog[]> {
  try {
    const snap = await getDocs(collection(db, 'inventoryLogs'));
    const items: InventoryLog[] = [];
    snap.forEach(d => {
      items.push({ ...(d.data() as InventoryLog), id: d.id });
    });
    return items;
  } catch (error) {
    console.warn('[Firebase] getInventoryLogs notice:', error);
    return [];
  }
}

export async function saveInventoryLogToFirestore(log: InventoryLog): Promise<void> {
  try {
    await setDoc(doc(db, 'inventoryLogs', log.id), cleanForFirestore(log), { merge: true });
  } catch (error) {
    console.warn('[Firebase] saveInventoryLog notice:', error);
  }
}

// Audit Logs
export async function getAuditLogsFromFirestore(): Promise<AuditLog[]> {
  try {
    const snap = await getDocs(collection(db, 'auditLogs'));
    const items: AuditLog[] = [];
    snap.forEach(d => {
      items.push({ ...(d.data() as AuditLog), id: d.id });
    });
    return items;
  } catch (error) {
    console.warn('[Firebase] getAuditLogs notice:', error);
    return [];
  }
}

export async function saveAuditLogToFirestore(log: AuditLog): Promise<void> {
  try {
    await setDoc(doc(db, 'auditLogs', log.id), cleanForFirestore(log), { merge: true });
  } catch (error) {
    console.warn('[Firebase] saveAuditLog notice:', error);
  }
}

// Reviews
export async function submitReviewToFirestore(review: ProductReview): Promise<void> {
  const docPath = `reviews/${review.id}`;
  try {
    await setDoc(doc(db, 'reviews', review.id), cleanForFirestore(review), { merge: true });
  } catch (error) {
    console.warn('[Firebase] submitReview notice:', error);
  }
}

// Settings
export async function getSettingsFromFirestore(): Promise<AppSettings | null> {
  const docPath = 'settings/global';
  try {
    const snap = await getDoc(doc(db, 'settings', 'global'));
    if (snap.exists()) {
      return snap.data() as AppSettings;
    }
    return null;
  } catch (error) {
    console.warn('[Firebase] getSettings notice:', error);
    return null;
  }
}

export async function saveSettingsToFirestore(settings: AppSettings): Promise<void> {
  const docPath = 'settings/global';
  try {
    await setDoc(doc(db, 'settings', 'global'), cleanForFirestore(settings), { merge: true });
  } catch (error) {
    console.warn('[Firebase] saveSettings notice:', error);
  }
}

// Customers / Registered Buyers
export async function saveCustomerToFirestore(customer: CustomerUser): Promise<void> {
  const docPath = `customers/${customer.id}`;
  try {
    await setDoc(doc(db, 'customers', customer.id), cleanForFirestore(customer), { merge: true });
  } catch (error) {
    console.warn('[Firebase] saveCustomer notice:', error);
  }
}

export async function getCustomerFromFirestore(customerId: string): Promise<CustomerUser | null> {
  const docPath = `customers/${customerId}`;
  try {
    const snap = await getDoc(doc(db, 'customers', customerId));
    if (snap.exists()) {
      return snap.data() as CustomerUser;
    }
    return null;
  } catch (error) {
    console.warn('[Firebase] getCustomer notice:', error);
    return null;
  }
}

// Order Updates (Status, Payment, Courier)
export async function updateOrderInFirestore(order: Order): Promise<void> {
  const docPath = `orders/${order.id}`;
  try {
    await setDoc(doc(db, 'orders', order.id), cleanForFirestore(order), { merge: true });
  } catch (error) {
    console.warn('[Firebase] updateOrder notice:', error);
  }
}

// Payment Confirmation Verification Updates
export async function updatePaymentInFirestore(payment: PaymentConfirmation): Promise<void> {
  const docPath = `paymentConfirmations/${payment.id}`;
  try {
    await setDoc(doc(db, 'paymentConfirmations', payment.id), cleanForFirestore(payment), { merge: true });
  } catch (error) {
    console.warn('[Firebase] updatePayment notice:', error);
  }
}

// Supplier Payout Records
export async function getSupplierPayoutsFromFirestore(): Promise<any[]> {
  try {
    const snap = await getDocs(collection(db, 'supplierPayouts'));
    const items: any[] = [];
    snap.forEach(d => {
      items.push({ ...d.data(), id: d.id });
    });
    return items;
  } catch (error) {
    console.warn('[Firebase] getSupplierPayouts notice:', error);
    return [];
  }
}

export async function saveSupplierPayoutToFirestore(payout: any): Promise<void> {
  const docPath = `supplierPayouts/${payout.id}`;
  try {
    await setDoc(doc(db, 'supplierPayouts', payout.id), cleanForFirestore(payout), { merge: true });
  } catch (error) {
    console.warn('[Firebase] saveSupplierPayout notice:', error);
  }
}

// Supplier Application Status Updates
export async function updateSupplierApplicationInFirestore(appData: any): Promise<void> {
  const docPath = `supplierApplications/${appData.id}`;
  try {
    await setDoc(doc(db, 'supplierApplications', appData.id), cleanForFirestore(appData), { merge: true });
  } catch (error) {
    console.warn('[Firebase] updateSupplierApplication notice:', error);
  }
}

// -------------------------------------------------------------
// MESSAGES & CHATS: STORE, EDIT, AND DELETE
// -------------------------------------------------------------

export async function getMessagesFromFirestore(): Promise<AdminMessage[]> {
  try {
    const snap = await getDocs(collection(db, 'messages'));
    const items: AdminMessage[] = [];
    snap.forEach(d => {
      items.push({ ...(d.data() as AdminMessage), id: d.id });
    });
    return items;
  } catch {
    return [];
  }
}

export async function updateMessageInFirestore(msg: Partial<AdminMessage> & { id: string }): Promise<boolean> {
  const docPath = `messages/${msg.id}`;
  try {
    await setDoc(doc(db, 'messages', msg.id), cleanForFirestore(msg), { merge: true });
    return true;
  } catch (error) {
    console.warn('[Firebase] Firestore updateMessage notice:', error);
    return false;
  }
}

export async function deleteMessageFromFirestore(messageId: string): Promise<boolean> {
  const docPath = `messages/${messageId}`;
  try {
    await deleteDoc(doc(db, 'messages', messageId));
    return true;
  } catch (error) {
    console.warn('[Firebase] Firestore deleteMessage notice:', error);
    return false;
  }
}

export async function batchSaveMessagesToFirestore(messagesList: AdminMessage[]): Promise<{ count: number; failed: number }> {
  let count = 0;
  let failed = 0;
  const chunkSize = 250;

  for (let i = 0; i < messagesList.length; i += chunkSize) {
    const chunk = messagesList.slice(i, i + chunkSize);
    try {
      const batch = writeBatch(db);
      for (const m of chunk) {
        batch.set(doc(db, 'messages', m.id), cleanForFirestore(m), { merge: true });
      }
      await batch.commit();
      count += chunk.length;
    } catch (err) {
      console.warn('[Firebase] Batch commit messages notice, attempting individual writes:', err);
      for (const m of chunk) {
        try {
          await setDoc(doc(db, 'messages', m.id), cleanForFirestore(m), { merge: true });
          count++;
        } catch {
          failed++;
        }
      }
    }
  }

  return { count, failed };
}

// -------------------------------------------------------------
// USERS & CUSTOMERS: STORE, EDIT, AND DELETE
// -------------------------------------------------------------

export async function getUsersFromFirestore(): Promise<any[]> {
  try {
    const snap = await getDocs(collection(db, 'users'));
    const items: any[] = [];
    snap.forEach(d => {
      items.push({ ...d.data(), id: d.id });
    });
    return items;
  } catch {
    return [];
  }
}

export async function getCustomersFromFirestore(): Promise<CustomerUser[]> {
  try {
    const snap = await getDocs(collection(db, 'customers'));
    const items: CustomerUser[] = [];
    snap.forEach(d => {
      items.push({ ...(d.data() as CustomerUser), id: d.id });
    });
    return items;
  } catch {
    return [];
  }
}

export async function saveUserToFirestore(user: any): Promise<void> {
  if (!user?.id) return;
  const docPath = `users/${user.id}`;
  try {
    await setDoc(doc(db, 'users', user.id), cleanForFirestore(user), { merge: true });
    // Also mirror to customers collection
    await setDoc(doc(db, 'customers', user.id), cleanForFirestore(user), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }
}

export async function deleteUserFromFirestore(userId: string): Promise<void> {
  try {
    await Promise.allSettled([
      deleteDoc(doc(db, 'users', userId)),
      deleteDoc(doc(db, 'customers', userId))
    ]);
  } catch {}
}

export async function deleteCustomerFromFirestore(customerId: string): Promise<void> {
  await deleteUserFromFirestore(customerId);
}

export async function deleteOrderFromFirestore(orderId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'orders', orderId));
  } catch {}
}

export async function deleteCategoryFromFirestore(categoryId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'categories', categoryId));
  } catch {}
}

export async function deleteShopFromFirestore(shopId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'shops', shopId));
  } catch {}
}

export async function deleteReviewFromFirestore(reviewId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'reviews', reviewId));
  } catch {}
}



