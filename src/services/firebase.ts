import { initializeApp } from 'firebase/app';
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
  collection,
  query,
  where,
  orderBy,
  limit,
  setLogLevel
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
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
  CustomerUser
} from '../types.ts';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Suppress internal gRPC stream lifecycle noise
setLogLevel('error');

// CRITICAL: The app will break without this line
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

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
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
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
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Startup connection verification
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDoc(doc(db, 'settings', 'global'));
    console.log('[Firebase] Connection to Firestore verified successfully.');
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('[Firebase] Offline or Firebase configuration issue:', error);
      return false;
    }
    // Probe acknowledged
    return true;
  }
}

// Initial probe
testFirestoreConnection();

// Google Sign-In via popup
export async function loginWithGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Google Sign-in failed:', error);
    throw error;
  }
}

// Sign-Out
export async function logoutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Sign-out failed:', error);
    throw error;
  }
}

// -------------------------------------------------------------
// FIRESTORE COLLECTIONS INTERACTION HELPERS
// -------------------------------------------------------------

// Helper to strip undefined values so Firestore setDoc never throws Unsupported field value: undefined
export function cleanForFirestore<T>(data: T): any {
  if (data === null || data === undefined) return null;
  return JSON.parse(JSON.stringify(data));
}

// Products
export async function getProductsFromFirestore(): Promise<Product[]> {
  const colPath = 'products';
  try {
    const snap = await getDocs(collection(db, colPath));
    const items: Product[] = [];
    snap.forEach(d => {
      items.push({ ...(d.data() as Product), id: d.id });
    });
    return items;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, colPath);
  }
}

export async function saveProductToFirestore(product: Product): Promise<void> {
  const docPath = `products/${product.id}`;
  try {
    await setDoc(doc(db, 'products', product.id), cleanForFirestore(product));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }
}

export async function deleteProductFromFirestore(productId: string): Promise<void> {
  const docPath = `products/${productId}`;
  try {
    await deleteDoc(doc(db, 'products', productId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
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
    handleFirestoreError(error, OperationType.LIST, colPath);
  }
}

export async function saveCategoryToFirestore(category: Category): Promise<void> {
  const docPath = `categories/${category.id}`;
  try {
    await setDoc(doc(db, 'categories', category.id), cleanForFirestore(category));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
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
    handleFirestoreError(error, OperationType.LIST, colPath);
  }
}

export async function saveShopToFirestore(shop: VendorShop): Promise<void> {
  const docPath = `shops/${shop.id}`;
  try {
    await setDoc(doc(db, 'shops', shop.id), cleanForFirestore(shop));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }
}

// Orders
export async function createOrderInFirestore(order: Order): Promise<void> {
  const docPath = `orders/${order.id}`;
  try {
    await setDoc(doc(db, 'orders', order.id), cleanForFirestore(order));
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, docPath);
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
    handleFirestoreError(error, OperationType.GET, docPath);
  }
}

// Payment Confirmations
export async function submitPaymentToFirestore(payment: PaymentConfirmation): Promise<void> {
  const docPath = `paymentConfirmations/${payment.id}`;
  try {
    await setDoc(doc(db, 'paymentConfirmations', payment.id), cleanForFirestore(payment));
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, docPath);
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

export async function submitSupplierApplicationToFirestore(appData: SupplierApplicationData): Promise<void> {
  const docPath = `supplierApplications/${appData.id}`;
  try {
    await setDoc(doc(db, 'supplierApplications', appData.id), cleanForFirestore(appData));
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, docPath);
  }
}

// Customer Messages
export async function submitMessageToFirestore(msg: AdminMessage): Promise<void> {
  const docPath = `messages/${msg.id}`;
  try {
    await setDoc(doc(db, 'messages', msg.id), cleanForFirestore(msg));
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, docPath);
  }
}

// Customer Problem Reports
export async function submitProblemReportToFirestore(report: CustomerProblemReport): Promise<void> {
  const docPath = `customerProblems/${report.id}`;
  try {
    await setDoc(doc(db, 'customerProblems', report.id), cleanForFirestore(report));
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, docPath);
  }
}

// Reviews
export async function submitReviewToFirestore(review: ProductReview): Promise<void> {
  const docPath = `reviews/${review.id}`;
  try {
    await setDoc(doc(db, 'reviews', review.id), cleanForFirestore(review));
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, docPath);
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
    handleFirestoreError(error, OperationType.GET, docPath);
  }
}

export async function saveSettingsToFirestore(settings: AppSettings): Promise<void> {
  const docPath = 'settings/global';
  // Settings in Firestore require verified admin authentication in security rules.
  // When no client-side Firebase Auth user is signed in, settings are stored authoritatively
  // via the server backend (/api/admin/settings), preventing permission errors.
  if (!auth.currentUser) {
    return;
  }
  try {
    await setDoc(doc(db, 'settings', 'global'), cleanForFirestore(settings));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }
}

// Customers / Registered Buyers
export async function saveCustomerToFirestore(customer: CustomerUser): Promise<void> {
  const docPath = `customers/${customer.id}`;
  try {
    await setDoc(doc(db, 'customers', customer.id), cleanForFirestore(customer));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
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
    handleFirestoreError(error, OperationType.GET, docPath);
  }
}

// Order Updates (Status, Payment, Courier)
export async function updateOrderInFirestore(order: Order): Promise<void> {
  const docPath = `orders/${order.id}`;
  try {
    await setDoc(doc(db, 'orders', order.id), cleanForFirestore(order), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, docPath);
  }
}

// Payment Confirmation Verification Updates
export async function updatePaymentInFirestore(payment: PaymentConfirmation): Promise<void> {
  const docPath = `paymentConfirmations/${payment.id}`;
  try {
    await setDoc(doc(db, 'paymentConfirmations', payment.id), cleanForFirestore(payment), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, docPath);
  }
}

// Supplier Payout Records
export async function saveSupplierPayoutToFirestore(payout: any): Promise<void> {
  const docPath = `supplierPayouts/${payout.id}`;
  try {
    await setDoc(doc(db, 'supplierPayouts', payout.id), cleanForFirestore(payout));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }
}

// Supplier Application Status Updates
export async function updateSupplierApplicationInFirestore(appData: any): Promise<void> {
  const docPath = `supplierApplications/${appData.id}`;
  try {
    await setDoc(doc(db, 'supplierApplications', appData.id), cleanForFirestore(appData), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, docPath);
  }
}


