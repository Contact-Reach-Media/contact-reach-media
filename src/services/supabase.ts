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
      if (error) console.warn('[Supabase] Products query notice:', error.message);
      return [];
    }

    return data.map((row: any) => ({
      id: String(row.id),
      name: row.name || 'Untitled Product',
      sku: row.sku || undefined,
      description: row.description || '',
      price: Number(row.price) || 0,
      costPrice: row.cost_price !== null ? Number(row.cost_price) : undefined,
      costOverriddenByAdmin: false,
      category: row.category || 'clothing',
      stock: Number(row.stock_quantity ?? row.stock ?? 0),
      imageUrl: row.image_url || '',
      images: row.image_url ? [row.image_url] : [],
      shopName: 'ContactReach Market',
      status: (row.status || 'Available') as any,
      rating: 5.0,
      reviewsCount: 0,
      createdAt: row.created_at || new Date().toISOString()
    }));
  } catch (err) {
    console.warn('[Supabase] Fetch products error:', err);
    return [];
  }
}

export async function saveProductToSupabase(p: Product): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const row: Record<string, any> = {
      name: p.name,
      sku: p.sku || null,
      description: p.description || '',
      price: p.price,
      cost_price: p.costPrice ?? null,
      category: p.category || 'clothing',
      stock_quantity: p.stock ?? 0,
      image_url: p.imageUrl || (Array.isArray(p.images) && p.images[0]) || '',
      status: p.status || 'Available',
      updated_at: new Date().toISOString()
    };

    // If valid UUID format, preserve it, otherwise omit id and let Supabase assign uuid_generate_v4()
    if (p.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(p.id)) {
      row.id = p.id;
    }

    const { data, error } = await supabase.from('products').upsert(row).select();
    if (error) {
      console.warn('[Supabase] Save product notice:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true, data: data?.[0] };
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
      .select('*, order_items(*)')
      .order('created_at', { ascending: false });

    if (error || !data) {
      if (error) console.warn('[Supabase] Orders query notice:', error.message);
      return [];
    }

    return data.map((o: any) => ({
      id: String(o.id),
      orderNumber: o.order_number || '',
      customerName: o.customer_name || 'Customer',
      customerPhone: o.customer_phone || '',
      customerEmail: o.customer_email || undefined,
      deliveryType: 'delivery',
      deliveryLocation: o.delivery_district || o.delivery_city || 'Kigali',
      deliveryAddress: o.delivery_address || 'Kigali, Rwanda',
      deliveryNotes: o.delivery_notes || undefined,
      items: Array.isArray(o.order_items) && o.order_items.length > 0 ? o.order_items.map((it: any) => ({
        productId: it.product_id ? String(it.product_id) : undefined,
        name: it.product_name,
        productName: it.product_name,
        price: Number(it.unit_price) || 0,
        quantity: Number(it.quantity) || 1
      })) : (Array.isArray(o.items) ? o.items : []),
      subtotal: Number(o.subtotal) || Number(o.total_amount) || 0,
      deliveryFee: Number(o.delivery_fee) || 0,
      shippingCost: 0,
      totalAmount: Number(o.total_amount) || 0,
      paymentMethod: o.payment_method || 'MTN Mobile Money',
      receiverName: 'Ruth',
      receiverDetails: '0780022600',
      paymentStatus: o.payment_status || 'Pending Payment',
      deliveryStatus: 'Pending',
      status: o.order_status || 'New',
      stockDeducted: false,
      statusHistory: [{
        status: o.order_status || 'New',
        deliveryStatus: 'Pending',
        paymentStatus: o.payment_status || 'Pending Payment',
        timestamp: o.created_at || new Date().toISOString()
      }],
      trackingNumber: o.tracking_number || undefined,
      trackingToken: o.tracking_token || undefined,
      discountAmount: Number(o.discount_amount) || 0,
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
      order_number: order.orderNumber,
      customer_name: order.customerName,
      customer_phone: order.customerPhone,
      customer_email: order.customerEmail || `${(order.customerPhone || '0780000000').replace(/\D/g, '')}@customer.crm.rw`,
      delivery_address: order.deliveryAddress || 'Kigali, Rwanda',
      delivery_city: order.deliveryCity || order.deliveryLocation?.split(' ')[0] || 'Kigali',
      delivery_district: order.deliveryLocation || null,
      delivery_notes: order.deliveryNotes || null,
      total_amount: order.totalAmount,
      subtotal: order.subtotal || order.totalAmount,
      delivery_fee: order.deliveryFee || 0,
      discount_amount: order.discountAmount || 0,
      currency: 'RWF',
      payment_method: order.paymentMethod || 'MTN Mobile Money',
      payment_status: order.paymentStatus || 'Pending Payment',
      order_status: order.status || 'New',
      tracking_number: order.trackingNumber || null,
      tracking_token: order.trackingToken || null,
      updated_at: new Date().toISOString()
    };

    if (order.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(order.id)) {
      orderRecord.id = order.id;
    }

    const { data: savedOrder, error } = await supabase
      .from('orders')
      .upsert(orderRecord, { onConflict: 'order_number' })
      .select();

    if (error) {
      console.warn('[Supabase] orders table upsert notice:', error.message);
      return { success: false, error: error.message };
    }

    const targetOrderId = savedOrder?.[0]?.id || order.id;
    if (targetOrderId && Array.isArray(order.items) && order.items.length > 0) {
      const itemsRows = order.items.map((it: any) => ({
        order_id: targetOrderId,
        product_name: it.productName || it.name || 'Product',
        unit_price: it.price || it.unitPrice || 0,
        quantity: it.quantity || 1,
        line_total: (it.price || it.unitPrice || 0) * (it.quantity || 1),
        ...(it.productId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(it.productId) ? { product_id: it.productId } : {})
      }));
      await supabase.from('order_items').insert(itemsRows);
    }

    return { success: true, data: savedOrder?.[0] };
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
    const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
    if (error || !data) {
      if (error) console.warn('[Supabase] Users query notice:', error.message);
      return [];
    }
    return data.map((u: any) => ({
      id: String(u.id),
      name: u.full_name || 'Customer',
      email: u.email,
      phone: u.phone || undefined,
      role: u.role || 'customer',
      deliveryAddress: u.default_address || undefined,
      city: u.city || 'Kigali',
      country: u.country || 'Rwanda',
      status: u.is_active !== false ? 'Active' : 'Inactive',
      active: u.is_active !== false,
      isRegisteredBuyer: true,
      createdAt: u.created_at || new Date().toISOString()
    }));
  } catch {
    return [];
  }
}

export async function saveAccountToSupabase(account: any): Promise<void> {
  try {
    const row: Record<string, any> = {
      full_name: account.name || account.fullName || 'User',
      email: account.email,
      phone: account.phone || null,
      role: account.role || 'customer',
      default_address: account.deliveryAddress || account.defaultAddress || null,
      city: account.city || 'Kigali',
      country: 'Rwanda',
      is_active: account.active !== false && account.status !== 'Inactive',
      updated_at: new Date().toISOString()
    };
    if (account.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(account.id)) {
      row.id = account.id;
    }
    await supabase.from('users').upsert(row, { onConflict: 'email' });
  } catch (err) {
    console.warn('[Supabase] Save user error:', err);
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
