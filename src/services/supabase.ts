import { createClient, SupabaseClient } from '@supabase/supabase-js';
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

// -------------------------------------------------------------
// SUPABASE PROJECT CONFIGURATION
// Project Name: contactreachmarket
// Project ID: hfwfjbvwhkjfrdodqyyw
// -------------------------------------------------------------
export const SUPABASE_PROJECT_NAME = 'contactreachmarket';
export const SUPABASE_PROJECT_ID = 'hfwfjbvwhkjfrdodqyyw';
export const SUPABASE_URL = 'https://hfwfjbvwhkjfrdodqyyw.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_vBneCzN_L_4VDjE_mPwxHw_vib-ua-5';

// Initialize Supabase Client
export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

export interface SupabaseAuthResult {
  user: any;
  session: any;
  token?: string;
}

/**
 * Sign in or sign up with Supabase using email and password
 */
export async function loginWithSupabasePassword(email: string, password: string): Promise<SupabaseAuthResult> {
  const cleanEmail = email.trim().toLowerCase();

  // Attempt login
  let { data, error } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password: password
  });

  // If user does not exist in Supabase auth yet, auto-register them
  if (error && (
    error.message.includes('Invalid login credentials') ||
    error.message.includes('user_not_found') ||
    error.message.includes('Email not confirmed')
  )) {
    try {
      const signupRes = await supabase.auth.signUp({
        email: cleanEmail,
        password: password,
        options: {
          data: {
            role: 'owner',
            name: 'ContactReach Administrator'
          }
        }
      });
      if (signupRes.data?.user) {
        data = signupRes.data as any;
        error = null;
      }
    } catch {
      // ignore signup error if signup is restricted
    }
  }

  if (error && !data?.user) {
    throw new Error(error.message || 'Supabase authentication failed');
  }

  return {
    user: data.user,
    session: data.session,
    token: data.session?.access_token
  };
}

/**
 * Sign in using Supabase Google OAuth (domain-independent)
 */
export async function loginWithSupabaseGoogle(): Promise<void> {
  const redirectUrl = typeof window !== 'undefined'
    ? window.location.origin
    : undefined;

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl
    }
  });

  if (error) {
    throw new Error(error.message || 'Supabase Google sign-in failed');
  }
}

/**
 * Get current Supabase session
 */
export async function getSupabaseSession() {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session;
  } catch {
    return null;
  }
}

/**
 * Sign out from Supabase
 */
export async function logoutSupabase(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.warn('[Supabase] Sign-out warning:', err);
  }
}

// -------------------------------------------------------------
// CONNECTION DIAGNOSTICS & SCHEMA STATUS
// -------------------------------------------------------------
export async function testSupabaseConnection(): Promise<{
  success: boolean;
  message: string;
  tableExists?: boolean;
  tableStatus?: Record<string, boolean>;
  details?: any;
}> {
  const tableStatus: Record<string, boolean> = {
    orders: false,
    products: false,
    categories: false,
    shops: false,
    accounts: false,
    payments: false,
    messages: false
  };

  try {
    // Check orders table
    const ordersRes = await supabase.from('orders').select('id').limit(1);
    tableStatus.orders = !ordersRes.error;

    // Check products table
    const prodRes = await supabase.from('products').select('id').limit(1);
    tableStatus.products = !prodRes.error;

    // Check categories table
    const catRes = await supabase.from('categories').select('id').limit(1);
    tableStatus.categories = !catRes.error;

    // Check shops table
    const shopRes = await supabase.from('shops').select('id').limit(1);
    tableStatus.shops = !shopRes.error;

    // Check accounts table
    const accRes = await supabase.from('accounts').select('id').limit(1);
    tableStatus.accounts = !accRes.error;

    // Check payments table
    const payRes = await supabase.from('payments').select('id').limit(1);
    tableStatus.payments = !payRes.error;

    // Check messages table
    const msgRes = await supabase.from('messages').select('id').limit(1);
    tableStatus.messages = !msgRes.error;

    const anyTableExists = Object.values(tableStatus).some(Boolean);
    const allTablesExist = Object.values(tableStatus).every(Boolean);

    if (allTablesExist) {
      return {
        success: true,
        message: 'Successfully connected to Supabase project contactreachmarket! All database tables are active and ready.',
        tableExists: true,
        tableStatus,
        details: { orders: ordersRes.data }
      };
    } else if (anyTableExists) {
      return {
        success: true,
        message: 'Connected to Supabase project contactreachmarket! Some tables exist. Run the migration SQL in Supabase SQL Editor to finish setting up all tables.',
        tableExists: true,
        tableStatus
      };
    } else {
      return {
        success: true,
        message: 'Connected to Supabase project contactreachmarket successfully! Please run the SQL schema migration in Supabase to create the tables.',
        tableExists: false,
        tableStatus,
        details: ordersRes.error
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Failed to connect to Supabase database',
      tableExists: false,
      tableStatus,
      details: err
    };
  }
}

// -------------------------------------------------------------
// PRODUCTS CRUD
// -------------------------------------------------------------
export async function getProductsFromSupabase(): Promise<Product[]> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) {
      return [];
    }

    return data.map((row: any) => ({
      id: row.id,
      name: row.name,
      sku: row.sku || undefined,
      description: row.description || '',
      price: Number(row.price) || 0,
      costPrice: row.cost_price !== null ? Number(row.cost_price) : undefined,
      costOverriddenByAdmin: Boolean(row.cost_overridden_by_admin),
      category: row.category || 'clothing',
      mainCategoryId: row.main_category_id || undefined,
      subCategoryId: row.sub_category_id || undefined,
      categoryName: row.category_name || undefined,
      subCategoryName: row.sub_category_name || undefined,
      stock: Number(row.stock) || 0,
      imageUrl: row.image_url || '',
      images: Array.isArray(row.images) ? row.images : (row.image_url ? [row.image_url] : []),
      shopName: row.shop_name || 'ContactReach Market Hub',
      shopId: row.shop_id || undefined,
      receiverName: row.receiver_name || undefined,
      paymentMethods: Array.isArray(row.payment_methods) ? row.payment_methods : [],
      merchantCode: row.merchant_code || undefined,
      receiverPhone: row.receiver_phone || undefined,
      location: row.location || 'Kigali, Rwanda',
      deliveryInfo: row.delivery_info || undefined,
      status: row.status || 'Available',
      isFeatured: Boolean(row.is_featured),
      isNewArrival: Boolean(row.is_new_arrival),
      isBestSeller: Boolean(row.is_best_seller),
      brand: row.brand || undefined,
      unit: row.unit || 'Piece',
      videoUrl: row.video_url || undefined,
      variations: Array.isArray(row.variations) ? row.variations : [],
      rating: Number(row.rating) || 5.0,
      reviewsCount: Number(row.reviews_count) || 0,
      source: row.source || undefined,
      alibabaProductId: row.alibaba_product_id || undefined,
      cjProductId: row.cj_product_id || undefined,
      createdAt: row.created_at || new Date().toISOString()
    }));
  } catch (err) {
    console.warn('[Supabase] Fetch products error:', err);
    return [];
  }
}

export async function saveProductToSupabase(p: Product): Promise<{ success: boolean; error?: string }> {
  try {
    const row = {
      id: p.id,
      name: p.name,
      sku: p.sku || null,
      description: p.description || '',
      price: p.price,
      cost_price: p.costPrice ?? null,
      cost_overridden_by_admin: Boolean(p.costOverriddenByAdmin),
      category: p.category,
      main_category_id: p.mainCategoryId || null,
      sub_category_id: p.subCategoryId || null,
      category_name: p.categoryName || null,
      sub_category_name: p.subCategoryName || null,
      stock: p.stock,
      image_url: p.imageUrl || '',
      images: p.images || [],
      shop_name: p.shopName || null,
      shop_id: p.shopId || null,
      receiver_name: p.receiverName || null,
      payment_methods: p.paymentMethods || [],
      merchant_code: p.merchantCode || null,
      receiver_phone: p.receiverPhone || null,
      location: p.location || null,
      delivery_info: p.deliveryInfo || null,
      status: p.status || 'Available',
      is_featured: Boolean(p.isFeatured),
      is_new_arrival: Boolean(p.isNewArrival),
      is_best_seller: Boolean(p.isBestSeller),
      brand: p.brand || null,
      unit: p.unit || 'Piece',
      video_url: p.videoUrl || null,
      variations: p.variations || [],
      rating: p.rating || 5.0,
      reviews_count: p.reviewsCount || 0,
      source: p.source || null,
      alibaba_product_id: p.alibabaProductId || null,
      cj_product_id: p.cjProductId || null,
      created_at: p.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from('products').upsert(row, { onConflict: 'id' });
    if (error) {
      console.warn('[Supabase] Save product notice:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

export async function deleteProductFromSupabase(productId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('products').delete().eq('id', productId);
    return !error;
  } catch {
    return false;
  }
}

export async function syncAllProductsToSupabase(products: Product[] = []): Promise<{
  success: boolean;
  syncedCount: number;
  message?: string;
}> {
  if (!products || products.length === 0) {
    return { success: true, syncedCount: 0, message: 'No products to sync' };
  }

  let count = 0;
  // Batch in chunks of 50 for efficient Supabase insert
  for (let i = 0; i < products.length; i += 50) {
    const chunk = products.slice(i, i + 50);
    const rows = chunk.map(p => ({
      id: p.id,
      name: p.name,
      sku: p.sku || null,
      description: p.description || '',
      price: p.price,
      cost_price: p.costPrice ?? null,
      cost_overridden_by_admin: Boolean(p.costOverriddenByAdmin),
      category: p.category,
      main_category_id: p.mainCategoryId || null,
      sub_category_id: p.subCategoryId || null,
      category_name: p.categoryName || null,
      sub_category_name: p.subCategoryName || null,
      stock: p.stock,
      image_url: p.imageUrl || '',
      images: p.images || [],
      shop_name: p.shopName || null,
      shop_id: p.shopId || null,
      receiver_name: p.receiverName || null,
      payment_methods: p.paymentMethods || [],
      merchant_code: p.merchantCode || null,
      receiver_phone: p.receiverPhone || null,
      location: p.location || null,
      delivery_info: p.deliveryInfo || null,
      status: p.status || 'Available',
      is_featured: Boolean(p.isFeatured),
      is_new_arrival: Boolean(p.isNewArrival),
      is_best_seller: Boolean(p.isBestSeller),
      brand: p.brand || null,
      unit: p.unit || 'Piece',
      video_url: p.videoUrl || null,
      variations: p.variations || [],
      rating: p.rating || 5.0,
      reviews_count: p.reviewsCount || 0,
      source: p.source || null,
      alibaba_product_id: p.alibabaProductId || null,
      cj_product_id: p.cjProductId || null,
      created_at: p.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    try {
      const { error } = await supabase.from('products').upsert(rows, { onConflict: 'id' });
      if (!error) {
        count += chunk.length;
      }
    } catch {
      // continue next chunk
    }
  }

  return {
    success: count > 0,
    syncedCount: count,
    message: `Synchronized ${count} products to Supabase`
  };
}

// -------------------------------------------------------------
// CATEGORIES CRUD
// -------------------------------------------------------------
export async function getCategoriesFromSupabase(): Promise<Category[]> {
  try {
    const { data, error } = await supabase.from('categories').select('*').order('sort_order', { ascending: true });
    if (error || !data) return [];
    return data.map((c: any) => ({
      id: c.id,
      nameEn: c.name_en || c.name || '',
      nameRw: c.name_rw || c.name_en || c.name || '',
      icon: c.icon || 'Tag',
      imageUrl: c.image_url || undefined,
      description: c.description || undefined,
      parentId: c.parent_id || undefined,
      sortOrder: c.sort_order || 0,
      isActive: c.is_active !== false,
      subcategories: Array.isArray(c.subcategories) ? c.subcategories : []
    }));
  } catch {
    return [];
  }
}

export async function saveCategoryToSupabase(c: Category): Promise<void> {
  try {
    await supabase.from('categories').upsert({
      id: c.id,
      name: c.nameEn || '',
      name_en: c.nameEn,
      name_rw: c.nameRw || null,
      name_fr: null,
      icon: c.icon || 'Tag',
      image_url: c.imageUrl || null,
      description: c.description || null,
      parent_id: c.parentId || null,
      sort_order: c.sortOrder ?? c.order ?? 0,
      is_active: c.isActive !== false,
      subcategories: c.subcategories || []
    }, { onConflict: 'id' });
  } catch (err) {
    console.warn('[Supabase] Save category error:', err);
  }
}

export async function syncAllCategoriesToSupabase(categories: Category[] = []): Promise<number> {
  try {
    const rows = categories.map((c, idx) => ({
      id: c.id,
      name: c.nameEn || '',
      name_en: c.nameEn,
      name_rw: c.nameRw || null,
      name_fr: null,
      icon: c.icon || 'Tag',
      image_url: c.imageUrl || null,
      description: c.description || null,
      parent_id: c.parentId || null,
      sort_order: c.sortOrder ?? c.order ?? idx,
      is_active: c.isActive !== false,
      subcategories: c.subcategories || []
    }));
    const { error } = await supabase.from('categories').upsert(rows, { onConflict: 'id' });
    return error ? 0 : rows.length;
  } catch {
    return 0;
  }
}

// -------------------------------------------------------------
// SHOPS CRUD
// -------------------------------------------------------------
export async function getShopsFromSupabase(): Promise<VendorShop[]> {
  try {
    const { data, error } = await supabase.from('shops').select('*');
    if (error || !data) return [];
    return data.map((s: any) => ({
      id: s.id,
      name: s.name,
      category: s.category || 'all',
      description: s.description || '',
      location: s.location || 'Kigali, Rwanda',
      address: s.address || undefined,
      phone: s.phone || '',
      email: s.email || undefined,
      totalSales: Number(s.total_sales) || 0,
      logo: s.logo || s.logo_url || 'ShoppingBag',
      bannerColor: s.banner_color || s.banner_url || 'from-orange-500 to-amber-600',
      isVerified: Boolean(s.is_verified),
      isRecommended: Boolean(s.is_recommended),
      followersCount: Number(s.followers_count) || 0,
      isActive: s.is_active !== false && s.status !== 'Inactive',
      createdAt: s.created_at || new Date().toISOString()
    }));
  } catch {
    return [];
  }
}

export async function saveShopToSupabase(s: VendorShop): Promise<void> {
  try {
    await supabase.from('shops').upsert({
      id: s.id,
      name: s.name,
      category: s.category || 'all',
      phone: s.phone || '',
      email: s.email || null,
      location: s.location || 'Kigali, Rwanda',
      address: s.address || null,
      logo: s.logo || 'ShoppingBag',
      logo_url: s.logo || null,
      banner_color: s.bannerColor || 'from-orange-500 to-amber-600',
      total_sales: s.totalSales || 0,
      status: s.isActive === false ? 'Inactive' : 'Active',
      is_verified: Boolean(s.isVerified),
      is_recommended: Boolean(s.isRecommended),
      followers_count: s.followersCount || 0,
      description: s.description || null
    }, { onConflict: 'id' });
  } catch (err) {
    console.warn('[Supabase] Save shop error:', err);
  }
}

export async function syncAllShopsToSupabase(shops: VendorShop[] = []): Promise<number> {
  try {
    const rows = shops.map(s => ({
      id: s.id,
      name: s.name,
      category: s.category || 'all',
      phone: s.phone || '',
      email: s.email || null,
      location: s.location || 'Kigali, Rwanda',
      address: s.address || null,
      logo: s.logo || 'ShoppingBag',
      logo_url: s.logo || null,
      banner_color: s.bannerColor || 'from-orange-500 to-amber-600',
      total_sales: s.totalSales || 0,
      status: s.isActive === false ? 'Inactive' : 'Active',
      is_verified: Boolean(s.isVerified),
      is_recommended: Boolean(s.isRecommended),
      followers_count: s.followersCount || 0,
      description: s.description || null
    }));
    const { error } = await supabase.from('shops').upsert(rows, { onConflict: 'id' });
    return error ? 0 : rows.length;
  } catch {
    return 0;
  }
}

// -------------------------------------------------------------
// ORDERS CRUD & SYNC
// -------------------------------------------------------------
export async function getOrdersFromSupabase(): Promise<Order[]> {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map((o: any) => ({
      id: o.id,
      orderNumber: o.order_number || '',
      customerName: o.customer_name || 'Customer',
      customerPhone: o.customer_phone || '',
      customerEmail: o.customer_email || undefined,
      deliveryType: o.delivery_type || 'delivery',
      deliveryLocation: o.delivery_location || 'Gasabo',
      deliveryAddress: o.delivery_address || 'Kigali, Rwanda',
      deliveryNotes: o.delivery_notes || undefined,
      items: Array.isArray(o.items) ? o.items : [],
      subtotal: Number(o.subtotal) || Number(o.total_amount) || 0,
      deliveryFee: Number(o.delivery_fee) || 0,
      shippingCost: Number(o.shipping_cost) || 0,
      totalAmount: Number(o.total_amount) || 0,
      paymentMethod: o.payment_method || 'MTN Mobile Money',
      receiverName: o.receiver_name || 'Ruth',
      receiverDetails: o.receiver_details || '0780022600',
      paymentStatus: o.payment_status || 'Pending Payment',
      deliveryStatus: o.delivery_status || 'Pending',
      status: o.status || 'New',
      stockDeducted: Boolean(o.stock_deducted),
      statusHistory: Array.isArray(o.status_history) && o.status_history.length > 0 ? o.status_history : [{
        status: o.status || 'New',
        deliveryStatus: o.delivery_status || 'Pending',
        paymentStatus: o.payment_status || 'Pending Payment',
        timestamp: o.created_at || new Date().toISOString()
      }],
      trackingNumber: o.tracking_number || undefined,
      trackingToken: o.tracking_token || undefined,
      couponCode: o.coupon_code || undefined,
      discountAmount: Number(o.discount_amount) || 0,
      supplierName: o.supplier_name || undefined,
      shopName: o.shop_name || undefined,
      createdAt: o.created_at || new Date().toISOString(),
      updatedAt: o.updated_at || undefined
    }));
  } catch {
    return [];
  }
}

export async function saveOrderToSupabase(order: any): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const orderRecord: Record<string, any> = {
      id: order.id || `ord-${Date.now()}`,
      order_number: order.orderNumber,
      customer_name: order.customerName,
      customer_phone: order.customerPhone,
      customer_email: order.customerEmail || null,
      delivery_type: order.deliveryType || 'delivery',
      delivery_address: order.deliveryAddress || null,
      delivery_location: order.deliveryLocation || null,
      delivery_notes: order.deliveryNotes || null,
      total_amount: order.totalAmount,
      subtotal: order.subtotal || order.totalAmount,
      delivery_fee: order.deliveryFee || 0,
      shipping_cost: order.shippingCost || 0,
      payment_method: order.paymentMethod || null,
      receiver_name: order.receiverName || 'Ruth',
      receiver_details: order.receiverDetails || '0780022600',
      payment_status: order.paymentStatus || 'Pending Payment',
      delivery_status: order.deliveryStatus || 'Pending',
      status: order.status || 'New',
      stock_deducted: Boolean(order.stockDeducted),
      status_history: order.statusHistory || [],
      items: order.items || [],
      tracking_number: order.trackingNumber || null,
      tracking_token: order.trackingToken || null,
      coupon_code: order.couponCode || null,
      discount_amount: order.discountAmount || 0,
      supplier_name: order.supplierName || null,
      shop_name: order.shopName || null,
      created_at: order.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('orders')
      .upsert(orderRecord, { onConflict: 'id' });

    if (error) {
      console.warn('[Supabase] orders table upsert notice:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err: any) {
    console.warn('[Supabase] Save order error:', err);
    return { success: false, error: err?.message };
  }
}

export async function syncAllOrdersToSupabase(orders: any[] = []): Promise<{
  success: boolean;
  syncedCount: number;
  message?: string;
}> {
  if (!orders || orders.length === 0) {
    return { success: true, syncedCount: 0, message: 'No orders to sync' };
  }

  let count = 0;
  for (const ord of orders) {
    const res = await saveOrderToSupabase(ord);
    if (res.success) count++;
  }
  return {
    success: count > 0,
    syncedCount: count,
    message: `Successfully synchronized ${count} orders to Supabase`
  };
}

// -------------------------------------------------------------
// PAYMENTS CRUD
// -------------------------------------------------------------
export async function getPaymentsFromSupabase(): Promise<PaymentConfirmation[]> {
  try {
    const { data, error } = await supabase.from('payments').select('*').order('created_at', { ascending: false });
    if (error || !data) return [];
    return data.map((p: any) => ({
      id: p.id,
      orderId: p.order_id || '',
      orderNumber: p.order_number || '',
      customerName: p.customer_name || 'Customer',
      paymentPhone: p.payment_phone || p.customer_phone || p.sender_phone || '',
      amountPaid: Number(p.amount_paid) || Number(p.amount) || 0,
      paymentMethod: p.payment_method || 'MTN Mobile Money',
      transactionId: p.transaction_id || '',
      screenshotUrl: p.screenshot_url || p.payment_proof_url || undefined,
      confirmationMessage: p.confirmation_message || undefined,
      verificationStatus: p.verification_status || 'Pending Verification',
      verifiedAt: p.verified_at || undefined,
      verifiedBy: p.verified_by || undefined,
      adminNotes: p.admin_notes || p.notes || undefined,
      submittedAt: p.submitted_at || p.created_at || new Date().toISOString()
    }));
  } catch {
    return [];
  }
}

export async function savePaymentToSupabase(p: PaymentConfirmation): Promise<void> {
  try {
    await supabase.from('payments').upsert({
      id: p.id,
      order_id: p.orderId,
      order_number: p.orderNumber,
      customer_name: p.customerName,
      customer_phone: p.paymentPhone,
      payment_phone: p.paymentPhone,
      amount: p.amountPaid,
      amount_paid: p.amountPaid,
      payment_method: p.paymentMethod,
      transaction_id: p.transactionId,
      payment_proof_url: p.screenshotUrl || null,
      screenshot_url: p.screenshotUrl || null,
      confirmation_message: p.confirmationMessage || null,
      verification_status: p.verificationStatus || 'Pending Verification',
      verified_at: p.verifiedAt || null,
      verified_by: p.verifiedBy || null,
      notes: p.adminNotes || null,
      admin_notes: p.adminNotes || null,
      submitted_at: p.submittedAt || new Date().toISOString(),
      created_at: p.submittedAt || new Date().toISOString()
    }, { onConflict: 'id' });
  } catch (err) {
    console.warn('[Supabase] Save payment error:', err);
  }
}

export async function syncAllPaymentsToSupabase(payments: PaymentConfirmation[] = []): Promise<number> {
  try {
    let count = 0;
    for (const p of payments) {
      await savePaymentToSupabase(p);
      count++;
    }
    return count;
  } catch {
    return 0;
  }
}

// -------------------------------------------------------------
// ACCOUNTS & USERS CRUD
// -------------------------------------------------------------
export async function getAccountsFromSupabase(): Promise<any[]> {
  try {
    const { data, error } = await supabase.from('accounts').select('*');
    if (error || !data) return [];
    return data;
  } catch {
    return [];
  }
}

export async function saveAccountToSupabase(account: any): Promise<void> {
  try {
    await supabase.from('accounts').upsert({
      id: account.id,
      name: account.name || 'User',
      email: account.email || null,
      phone: account.phone || null,
      role: account.role || 'customer',
      status: account.status || 'Active',
      metadata: account.metadata || {},
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });
  } catch (err) {
    console.warn('[Supabase] Save account error:', err);
  }
}

export async function syncAllAccountsToSupabase(accounts: any[] = []): Promise<{
  success: boolean;
  syncedCount: number;
  message?: string;
}> {
  try {
    let count = 0;
    for (const acc of accounts) {
      const { error } = await supabase.from('accounts').upsert({
        id: acc.id,
        name: acc.name || 'Account User',
        email: acc.email || null,
        phone: acc.phone || null,
        role: acc.role || 'customer',
        status: acc.status || (acc.active === false ? 'Inactive' : 'Active'),
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
      if (!error) count++;
    }
    return {
      success: count > 0,
      syncedCount: count,
      message: `Successfully synchronized ${count} accounts to Supabase`
    };
  } catch (err: any) {
    return { success: false, syncedCount: 0, message: err?.message };
  }
}

// -------------------------------------------------------------
// MESSAGES CRUD
// -------------------------------------------------------------
export async function getMessagesFromSupabase(): Promise<AdminMessage[]> {
  try {
    const { data, error } = await supabase.from('messages').select('*').order('created_at', { ascending: false });
    if (error || !data) return [];
    return data.map((m: any) => ({
      id: m.id,
      name: m.name || m.sender_name || 'Customer',
      email: m.email || m.sender_email || '',
      phone: m.phone || m.sender_phone || undefined,
      subject: m.subject || '',
      message: m.message,
      status: m.status || 'unread',
      orderNumber: m.order_number || undefined,
      customerId: m.customer_id || undefined,
      sender: m.sender || 'customer',
      senderName: m.name || m.sender_name || undefined,
      createdAt: m.created_at || new Date().toISOString(),
      readAt: m.read_at || undefined,
      repliedAt: m.replied_at || undefined,
      replyNote: m.reply_note || m.reply_message || undefined
    }));
  } catch {
    return [];
  }
}

export async function saveMessageToSupabase(m: AdminMessage): Promise<void> {
  try {
    await supabase.from('messages').upsert({
      id: m.id,
      name: m.name || m.senderName || 'Customer',
      sender_name: m.name || m.senderName || 'Customer',
      phone: m.phone || null,
      sender_phone: m.phone || null,
      email: m.email || null,
      sender_email: m.email || null,
      subject: m.subject || null,
      message: m.message,
      order_number: m.orderNumber || null,
      customer_id: m.customerId || null,
      sender: m.sender || 'customer',
      status: m.status || 'unread',
      reply_note: m.replyNote || null,
      replied_at: m.repliedAt || null,
      created_at: m.createdAt || new Date().toISOString()
    }, { onConflict: 'id' });
  } catch (err) {
    console.warn('[Supabase] Save message error:', err);
  }
}

// -------------------------------------------------------------
// APP SETTINGS CRUD
// -------------------------------------------------------------
export async function getSettingsFromSupabase(): Promise<AppSettings | null> {
  try {
    const { data, error } = await supabase.from('app_settings').select('settings_data').eq('id', 'global').maybeSingle();
    if (error || !data) return null;
    return data.settings_data as AppSettings;
  } catch {
    return null;
  }
}

export async function saveSettingsToSupabase(settings: AppSettings): Promise<void> {
  try {
    await supabase.from('app_settings').upsert({
      id: 'global',
      market_name: settings.marketName || 'ContactReach Market',
      company_name: settings.companyName || 'ContactReach Media Ltd',
      phone: settings.phone || '+250780022600',
      email: settings.email || 'contactreachmedialimited@gmail.com',
      settings_data: settings,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });
  } catch (err) {
    console.warn('[Supabase] Save settings error:', err);
  }
}

// -------------------------------------------------------------
// FULL DATABASE MIGRATION HELPER
// Migrates live products, categories, shops, orders, etc. into Supabase
// -------------------------------------------------------------
export async function syncAllDataToSupabase(db: {
  products?: Product[];
  categories?: Category[];
  shops?: VendorShop[];
  orders?: Order[];
  payments?: PaymentConfirmation[];
  customers?: CustomerUser[];
  adminUsers?: any[];
  messages?: AdminMessage[];
  coupons?: Coupon[];
  settings?: AppSettings;
}): Promise<{
  success: boolean;
  results: Record<string, number>;
  message: string;
}> {
  const results: Record<string, number> = {
    products: 0,
    categories: 0,
    shops: 0,
    orders: 0,
    payments: 0,
    accounts: 0,
    messages: 0
  };

  try {
    if (db.products && db.products.length > 0) {
      const prodRes = await syncAllProductsToSupabase(db.products);
      results.products = prodRes.syncedCount;
    }
    if (db.categories && db.categories.length > 0) {
      results.categories = await syncAllCategoriesToSupabase(db.categories);
    }
    if (db.shops && db.shops.length > 0) {
      results.shops = await syncAllShopsToSupabase(db.shops);
    }
    if (db.orders && db.orders.length > 0) {
      const ordRes = await syncAllOrdersToSupabase(db.orders);
      results.orders = ordRes.syncedCount;
    }
    if (db.payments && db.payments.length > 0) {
      results.payments = await syncAllPaymentsToSupabase(db.payments);
    }
    const combinedAccounts = [...(db.adminUsers || []), ...(db.customers || [])];
    if (combinedAccounts.length > 0) {
      const accRes = await syncAllAccountsToSupabase(combinedAccounts);
      results.accounts = accRes.syncedCount;
    }
    if (db.settings) {
      await saveSettingsToSupabase(db.settings);
    }

    const totalSynced = Object.values(results).reduce((a, b) => a + b, 0);
    return {
      success: true,
      results,
      message: `Full database migration complete! Synchronized ${totalSynced} records to Supabase project contactreachmarket.`
    };
  } catch (err: any) {
    return {
      success: false,
      results,
      message: `Migration notice: ${err?.message || 'Partial sync completed'}`
    };
  }
}

// -------------------------------------------------------------
// REALTIME SUBSCRIPTIONS HELPER
// -------------------------------------------------------------
export function subscribeToSupabaseTable(
  tableName: string,
  onChange: (payload: any) => void
): () => void {
  try {
    const channel = supabase
      .channel(`realtime-${tableName}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: tableName },
        (payload) => {
          onChange(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('[Supabase] Subscription notice:', err);
    return () => {};
  }
}
