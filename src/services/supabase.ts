import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type {
  Product,
  Category,
  VendorShop,
  Order,
  PaymentConfirmation,
  Coupon,
  AdminMessage,
  AdminNotification,
  AdminNotificationCategory,
  CustomerProblemReport,
  ProductReview,
  AppSettings,
  AuditLog,
  CustomerUser,
  InventoryLog,
  AdminUser
} from '../types.ts';
import { toCategorySlug } from '../data/categoryStructure.ts';

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

  let { data, error } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password: password
  });

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
      // ignore
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
 * Sign in using Supabase Google OAuth
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
    products: false,
    orders: false,
    order_items: false,
    payments: false,
    users: false,
    categories: false,
    shops: false,
    messages: false,
    customer_problems: false,
    coupons: false,
    inventory_logs: false,
    audit_logs: false,
    supplier_applications: false,
    supplier_payouts: false,
    app_settings: false
  };

  try {
    const checks = await Promise.allSettled(
      Object.keys(tableStatus).map(async (table) => {
        const res = await supabase.from(table).select('id').limit(1);
        return { table, ok: !res.error };
      })
    );

    checks.forEach((c) => {
      if (c.status === 'fulfilled') {
        tableStatus[c.value.table] = c.value.ok;
      }
    });

    const anyTableExists = Object.values(tableStatus).some(Boolean);
    const allTablesExist = Object.values(tableStatus).every(Boolean);

    if (allTablesExist) {
      return {
        success: true,
        message: 'Successfully connected to Supabase PostgreSQL! All modules are connected.',
        tableExists: true,
        tableStatus
      };
    } else if (anyTableExists) {
      return {
        success: true,
        message: 'Connected to Supabase PostgreSQL! Active tables detected. Safe migrations available for remaining modules.',
        tableExists: true,
        tableStatus
      };
    } else {
      return {
        success: true,
        message: 'Connected to Supabase project contactreachmarket. Tables ready for migration.',
        tableExists: false,
        tableStatus
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Failed to connect to Supabase database',
      tableExists: false,
      tableStatus
    };
  }
}

// -------------------------------------------------------------
// 1. PRODUCTS CRUD & SYNC
// -------------------------------------------------------------
export function mapSupabaseRowToProduct(row: any): Product {
  return {
    id: String(row.id),
    name: row.name || 'Product',
    sku: row.sku || undefined,
    description: row.description || '',
    price: Number(row.price_rwf ?? row.price) || 0,
    costPrice: row.cost_price !== null && row.cost_price !== undefined ? Number(row.cost_price) : undefined,
    costOverriddenByAdmin: Boolean(row.cost_overridden_by_admin),
    commissionRate: row.commission_rate !== null && row.commission_rate !== undefined ? Number(row.commission_rate) : 10,
    discountPercent: Number(row.discount_pct ?? row.discount_percent) || 0,
    discountPrice: row.discount_price !== null && row.discount_price !== undefined ? Number(row.discount_price) : undefined,
    category: row.category || 'clothing',
    subcategory: row.subcategory || undefined,
    mainCategoryId: row.main_category_id || undefined,
    subCategoryId: row.sub_category_id || undefined,
    categoryName: row.category_name || undefined,
    subCategoryName: row.sub_category_name || undefined,
    stock: Number(row.stock_quantity ?? row.stock ?? 0),
    imageUrl: row.image_url || (Array.isArray(row.images) && row.images[0]) || '',
    images: Array.isArray(row.images) ? row.images : (row.image_url ? [row.image_url] : []),
    videoUrl: row.video_url || undefined,
    youtubeUrl: row.youtube_url || undefined,
    shopName: row.shop_name || 'ContactReach Market',
    shopId: row.shop_id || undefined,
    receiverName: row.receiver_name || undefined,
    receiverPhone: row.receiver_phone || undefined,
    merchantCode: row.merchant_code || undefined,
    location: row.location || 'Kigali, Rwanda',
    deliveryInfo: row.delivery_info || undefined,
    status: (row.status || (row.visible === false ? 'Out of Stock' : 'Available')) as any,
    isFeatured: Boolean(row.featured ?? row.is_featured),
    isNewArrival: Boolean(row.is_new ?? row.is_new_arrival),
    isBestSeller: Boolean(row.is_best_seller),
    brand: row.brand || undefined,
    unit: row.unit || 'Piece',
    shippingCost: Number(row.shipping_cost) || 0,
    specifications: row.specifications || undefined,
    storage: row.storage || undefined,
    packagingInfo: row.packaging_info || undefined,
    attributes: Array.isArray(row.attributes) ? row.attributes : [],
    variations: Array.isArray(row.variations) ? row.variations : [],
    rating: Number(row.rating) || 5.0,
    reviewsCount: Number(row.reviews_count) || 0,
    source: row.source || 'local',
    alibabaProductId: row.alibaba_product_id || undefined,
    cjProductId: row.cj_product_id || undefined,
    createdAt: row.created_at || new Date().toISOString()
  };
}

export async function getProductsFromSupabase(): Promise<Product[]> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map(mapSupabaseRowToProduct);
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
      price: Math.max(0, Number(p.price) || 0),
      cost_price: p.costPrice !== undefined ? Number(p.costPrice) : null,
      cost_overridden_by_admin: Boolean(p.costOverriddenByAdmin),
      commission_rate: p.commissionRate !== undefined ? Number(p.commissionRate) : 10,
      profit_margin: p.profitMargin !== undefined ? Number(p.profitMargin) : 0,
      discount_percent: Number(p.discountPercent) || 0,
      discount_price: p.discountPrice !== undefined ? Number(p.discountPrice) : null,
      category: p.category || 'clothing',
      subcategory: p.subcategory || null,
      main_category_id: p.mainCategoryId || null,
      sub_category_id: p.subCategoryId || null,
      category_name: p.categoryName || null,
      sub_category_name: p.subCategoryName || null,
      stock: Math.max(0, Number(p.stock ?? 0)),
      image_url: p.imageUrl || (Array.isArray(p.images) && p.images[0]) || '',
      images: Array.isArray(p.images) ? p.images : (p.imageUrl ? [p.imageUrl] : []),
      video_url: p.videoUrl || null,
      youtube_url: p.youtubeUrl || null,
      shop_name: p.shopName || 'ContactReach Market',
      shop_id: p.shopId || null,
      receiver_name: p.receiverName || null,
      receiver_phone: p.receiverPhone || null,
      payment_methods: Array.isArray(p.paymentMethods) ? p.paymentMethods : [],
      merchant_code: p.merchantCode || null,
      location: p.location || 'Kigali, Rwanda',
      delivery_info: p.deliveryInfo || null,
      status: p.status || 'Available',
      is_featured: Boolean(p.isFeatured),
      is_new_arrival: Boolean(p.isNewArrival),
      is_best_seller: Boolean(p.isBestSeller),
      brand: p.brand || null,
      unit: p.unit || 'Piece',
      shipping_cost: Math.max(0, Number(p.shippingCost) || 0),
      specifications: p.specifications || null,
      storage: p.storage || null,
      packaging_info: p.packagingInfo || null,
      attributes: Array.isArray(p.attributes) ? p.attributes : [],
      variations: Array.isArray(p.variations) ? p.variations : [],
      rating: Number(p.rating) || 5.0,
      reviews_count: Number(p.reviewsCount) || 0,
      source: p.source || 'local',
      review_status: (p as any).reviewStatus || 'Approved',
      alibaba_product_id: p.alibabaProductId || null,
      cj_product_id: p.cjProductId || null,
      updated_at: new Date().toISOString()
    };

    if (p.id) {
      row.id = p.id;
    }
    if (p.createdAt) {
      row.created_at = p.createdAt;
    }

    const { data, error } = await supabase.from('products').upsert(row, { onConflict: 'id' }).select();
    if (error) {
      console.error('[Supabase] Failed to save product:', error);
      return { success: false, error: error.message };
    }
    return { success: true, data: data?.[0] };
  } catch (err: any) {
    console.error('[Supabase] Error saving product:', err);
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

export async function updateProductStatusInSupabase(
  productId: string,
  status: string
): Promise<{ success: boolean; product?: Product; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('products')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', productId)
      .select()
      .maybeSingle();

    if (error) {
      return { success: false, error: error.message };
    }
    if (!data) {
      return { success: false, error: 'Product not found in Supabase database' };
    }
    return { success: true, product: mapSupabaseRowToProduct(data) };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Supabase status update failed' };
  }
}

export async function bulkUpdateProductStatusInSupabase(
  productIds: string[],
  status: string
): Promise<{ success: boolean; count: number; products?: Product[]; error?: string }> {
  try {
    const cleanIds = productIds.map(id => String(id).trim()).filter(Boolean);
    if (cleanIds.length === 0) {
      return { success: false, count: 0, error: 'No product IDs provided' };
    }
    const { data, error } = await supabase
      .from('products')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .in('id', cleanIds)
      .select();

    if (error) {
      return { success: false, count: 0, error: error.message };
    }
    const mapped = Array.isArray(data) ? data.map(mapSupabaseRowToProduct) : [];
    return { success: true, count: mapped.length || cleanIds.length, products: mapped };
  } catch (err: any) {
    return { success: false, count: 0, error: err?.message || 'Supabase bulk status update failed' };
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
  for (let i = 0; i < products.length; i += 50) {
    const chunk = products.slice(i, i + 50);
    const rows = chunk.map(p => ({
      id: p.id,
      name: p.name,
      sku: p.sku || null,
      description: p.description || '',
      price: Math.max(0, Number(p.price) || 0),
      cost_price: p.costPrice !== undefined ? Number(p.costPrice) : null,
      category: p.category,
      stock: Math.max(0, Number(p.stock ?? 0)),
      image_url: p.imageUrl || '',
      images: Array.isArray(p.images) ? p.images : (p.imageUrl ? [p.imageUrl] : []),
      shop_name: p.shopName || null,
      status: p.status || 'Available',
      created_at: p.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    try {
      const { error } = await supabase.from('products').upsert(rows, { onConflict: 'id' });
      if (!error) count += chunk.length;
    } catch {}
  }

  return { success: count > 0, syncedCount: count };
}

// -------------------------------------------------------------
// 2. CATEGORIES CRUD
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
      slug: c.slug || toCategorySlug(c.name_en || c.name || c.id),
      level: c.parent_id ? 2 : 1,
      imageUrl: c.image_url || undefined,
      description: c.description || undefined,
      parentId: c.parent_id || null,
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
      icon: c.icon || 'Tag',
      image_url: c.imageUrl || null,
      description: c.description || null,
      parent_id: c.parentId || null,
      sort_order: c.sortOrder ?? 0,
      is_active: c.isActive !== false,
      subcategories: c.subcategories || [],
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });
  } catch (err) {
    console.warn('[Supabase] Save category error:', err);
  }
}

export async function deleteCategoryFromSupabase(categoryId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('categories').delete().eq('id', categoryId);
    return !error;
  } catch {
    return false;
  }
}

export async function syncAllCategoriesToSupabase(categories: Category[] = []): Promise<number> {
  try {
    let count = 0;
    for (const c of categories) {
      await saveCategoryToSupabase(c);
      count++;
    }
    return count;
  } catch {
    return 0;
  }
}

// -------------------------------------------------------------
// 3. SHOPS CRUD
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
      logo: s.logo || 'ShoppingBag',
      bannerColor: s.banner_color || 'from-orange-500 to-amber-600',
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
      description: s.description || null,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });
  } catch (err) {
    console.warn('[Supabase] Save shop error:', err);
  }
}

export async function deleteShopFromSupabase(shopId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('shops').delete().eq('id', shopId);
    return !error;
  } catch {
    return false;
  }
}

export async function syncAllShopsToSupabase(shops: VendorShop[] = []): Promise<number> {
  try {
    let count = 0;
    for (const s of shops) {
      await saveShopToSupabase(s);
      count++;
    }
    return count;
  } catch {
    return 0;
  }
}

// -------------------------------------------------------------
// 4. ORDERS CRUD & SYNC
// -------------------------------------------------------------
export function mapSupabaseRowToOrder(o: any): Order {
  return {
    id: String(o.id),
    orderNumber: o.order_no || o.order_number || '',
    customerName: o.customer_name || 'Customer',
    customerPhone: o.phone || o.customer_phone || '',
    customerEmail: o.email || o.customer_email || undefined,
    deliveryType: 'delivery',
    deliveryLocation: o.delivery_location || o.zone || o.delivery_district || o.delivery_city || 'Kigali',
    deliveryAddress: o.delivery_address || o.address || 'Kigali, Rwanda',
    deliveryNotes: o.delivery_notes || o.instructions || undefined,
    items: Array.isArray(o.items) && o.items.length > 0
      ? o.items
      : (Array.isArray(o.order_items) && o.order_items.length > 0 ? o.order_items.map((it: any) => ({
          productId: it.product_id ? String(it.product_id) : undefined,
          name: it.product_name,
          productName: it.product_name,
          price: Number(it.unit_price_rwf ?? it.unit_price) || 0,
          quantity: Number(it.qty ?? it.quantity) || 1,
          imageUrl: it.image_url || '/logo.png'
        })) : []),
    subtotal: Number(o.subtotal ?? o.total_amount ?? o.subtotal_rwf ?? o.total_rwf) || 0,
    deliveryFee: Number(o.delivery_fee ?? o.delivery_fee_rwf) || 0,
    shippingCost: Number(o.shipping_cost) || 0,
    discountAmount: Number(o.discount_amount ?? o.discount_rwf) || 0,
    couponCode: o.coupon_code || undefined,
    totalAmount: Number(o.total_amount ?? o.total ?? o.total_rwf) || 0,
    commissionRate: Number(o.commission_rate) || 10,
    commissionEarned: Number(o.commission_earned) || 0,
    supplierPayoutAmount: Number(o.supplier_payout_amount) || 0,
    supplierPayoutStatus: o.supplier_payout_status || 'Pending',
    paymentMethod: o.payment_method || 'MTN Mobile Money',
    receiverName: o.receiver_name || 'Ruth',
    receiverDetails: o.receiver_details || '0780022600',
    paymentStatus: o.payment_status || 'Pending Payment',
    deliveryStatus: o.delivery_status || 'Pending',
    status: o.status || o.order_status || 'New',
    stockDeducted: Boolean(o.stock_deducted),
    trackingNumber: o.tracking_number || o.tracking_ref || undefined,
    trackingToken: o.tracking_token || undefined,
    trackingCarrier: o.tracking_carrier || undefined,
    statusHistory: Array.isArray(o.status_history) ? o.status_history : [],
    createdAt: o.created_at || new Date().toISOString(),
    updatedAt: o.updated_at || undefined
  };
}

export async function getOrdersFromSupabase(): Promise<Order[]> {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    return data.map(mapSupabaseRowToOrder);
  } catch {
    return [];
  }
}

export async function saveOrderToSupabase(order: any): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const orderRecord: Record<string, any> = {
      id: String(order.id || `ord-${Date.now()}`),
      order_number: String(order.orderNumber || order.order_number),
      tracking_token: order.trackingToken || null,
      tracking_number: order.trackingNumber || null,
      tracking_carrier: order.trackingCarrier || null,
      tracking_url: order.trackingUrl || null,
      tracking_added_at: order.trackingAddedAt || null,
      customer_name: order.customerName || 'Customer',
      customer_phone: order.customerPhone || '',
      customer_email: order.customerEmail || null,
      delivery_type: order.deliveryType || 'delivery',
      delivery_location: order.deliveryLocation || 'Kigali Area',
      delivery_address: order.deliveryAddress || 'Kigali, Rwanda',
      delivery_notes: order.deliveryNotes || null,
      items: Array.isArray(order.items) ? order.items : [],
      subtotal: Math.round(Number(order.subtotal || order.totalAmount) || 0),
      delivery_fee: Math.round(Number(order.deliveryFee) || 0),
      shipping_cost: Math.round(Number(order.shippingCost) || 0),
      discount_amount: Math.round(Number(order.discountAmount) || 0),
      coupon_code: order.couponCode || null,
      total_amount: Math.round(Number(order.totalAmount || order.total) || 0),
      commission_rate: Number(order.commissionRate) || 10,
      commission_earned: Math.round(Number(order.commissionEarned) || 0),
      supplier_payout_amount: Math.round(Number(order.supplierPayoutAmount) || 0),
      supplier_payout_status: order.supplierPayoutStatus || 'Pending',
      supplier_fulfillment_status: order.supplierFulfillmentStatus || 'Pending',
      supplier_payout_ref: order.supplierPayoutRef || null,
      payment_method: order.paymentMethod || 'MTN Mobile Money',
      receiver_name: order.receiverName || 'Ruth',
      receiver_details: order.receiverDetails || '0780022600',
      shop_name: order.shopName || null,
      payment_status: order.paymentStatus || 'Pending Payment',
      status: order.status || 'New',
      delivery_status: order.deliveryStatus || 'Pending',
      expected_delivery_date: order.expectedDeliveryDate || null,
      supplier_name: order.supplierName || null,
      supplier_order_ref: order.supplierOrderRef || null,
      dispatch_date: order.dispatchDate || null,
      stock_deducted: Boolean(order.stockDeducted),
      assigned_courier: order.assignedCourier || null,
      courier_phone: order.courierPhone || null,
      internal_notes: order.internalNotes || null,
      user_id: order.userId || null,
      supplier_approval_status: order.supplierApprovalStatus || 'Pending Review',
      supplier_approved_at: order.supplierApprovedAt || null,
      supplier_approved_by: order.supplierApprovedBy || null,
      supplier_rejection_reason: order.supplierRejectionReason || null,
      cj_fulfillment_status: order.cjFulfillmentStatus || 'Not Applicable',
      cj_fulfillment_approved_at: order.cjFulfillmentApprovedAt || null,
      cj_fulfillment_approved_by: order.cjFulfillmentApprovedBy || null,
      cj_tracking_number: order.cjTrackingNumber || null,
      alibaba_fulfillment_status: order.alibabaFulfillmentStatus || 'Not Applicable',
      alibaba_fulfillment_approved_at: order.alibabaFulfillmentApprovedAt || null,
      alibaba_fulfillment_approved_by: order.alibabaFulfillmentApprovedBy || null,
      alibaba_order_ref: order.alibabaOrderRef || null,
      alibaba_tracking_number: order.alibabaTrackingNumber || null,
      alibaba_shipping_method: order.alibabaShippingMethod || null,
      status_history: Array.isArray(order.statusHistory) ? order.statusHistory : [],
      payment_confirmation: order.paymentConfirmation || null,
      created_at: order.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Safe upsert: check existing record by id or order_number first to avoid orders_pkey constraint conflict
    const queryParts: string[] = [];
    if (orderRecord.id) queryParts.push(`id.eq.${orderRecord.id}`);
    if (orderRecord.order_number) queryParts.push(`order_number.eq.${orderRecord.order_number}`);

    let existingOrder: { id: string; order_number: string } | null = null;
    if (queryParts.length > 0) {
      const { data: matched } = await supabase
        .from('orders')
        .select('id, order_number')
        .or(queryParts.join(','))
        .limit(1)
        .maybeSingle();
      if (matched) existingOrder = matched;
    }

    if (existingOrder) {
      orderRecord.id = existingOrder.id;
      if (existingOrder.order_number) {
        orderRecord.order_number = existingOrder.order_number;
      }
      const { data: updatedOrder, error: updateErr } = await supabase
        .from('orders')
        .update(orderRecord)
        .eq('id', existingOrder.id)
        .select();

      if (updateErr) {
        console.error('[Supabase Save Order] Error:', updateErr.message);
        return { success: false, error: updateErr.message };
      }
      return { success: true, data: updatedOrder?.[0] };
    } else {
      const { data: insertedOrder, error: insertErr } = await supabase
        .from('orders')
        .insert(orderRecord)
        .select();

      if (insertErr) {
        if (insertErr.code === '23505' && queryParts.length > 0) {
          const { data: fallbackOrder, error: fbErr } = await supabase
            .from('orders')
            .update(orderRecord)
            .or(queryParts.join(','))
            .select();
          if (fbErr) {
            console.error('[Supabase Save Order] Error:', fbErr.message);
            return { success: false, error: fbErr.message };
          }
          return { success: true, data: fallbackOrder?.[0] };
        }
        console.error('[Supabase Save Order] Error:', insertErr.message);
        return { success: false, error: insertErr.message };
      }
      return { success: true, data: insertedOrder?.[0] };
    }
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

export async function deleteOrderFromSupabase(orderId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('orders').delete().eq('id', orderId);
    return !error;
  } catch {
    return false;
  }
}

export async function syncAllOrdersToSupabase(orders: any[] = []): Promise<{
  success: boolean;
  syncedCount: number;
}> {
  let count = 0;
  for (const ord of orders) {
    const res = await saveOrderToSupabase(ord);
    if (res.success) count++;
  }
  return { success: count > 0, syncedCount: count };
}

// -------------------------------------------------------------
// 5. PAYMENTS & VERIFICATIONS CRUD
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
      paymentPhone: p.payer_phone || p.payment_phone || p.customer_phone || p.sender_phone || '',
      amountPaid: Number(p.amount_rwf ?? p.amount_paid ?? p.amount) || 0,
      paymentMethod: p.payment_method || 'MTN Mobile Money',
      transactionId: p.transaction_id || '',
      screenshotUrl: p.screenshot_url || p.payment_proof_url || (Array.isArray(p.evidence_paths) && p.evidence_paths[0]) || undefined,
      confirmationMessage: p.confirmation_message || undefined,
      verificationStatus: (p.verification_status || (p.status === 'verified' ? 'Verified' : (p.status === 'rejected' ? 'Rejected' : 'Pending Verification'))) as any,
      verifiedAt: p.verified_at || undefined,
      verifiedBy: p.verified_by || undefined,
      adminNotes: p.reject_reason || p.admin_notes || p.notes || undefined,
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
      payer_phone: p.paymentPhone,
      amount: p.amountPaid,
      amount_paid: p.amountPaid,
      amount_rwf: Math.round(Number(p.amountPaid) || 0),
      payment_method: p.paymentMethod,
      transaction_id: p.transactionId,
      payment_proof_url: p.screenshotUrl || null,
      screenshot_url: p.screenshotUrl || null,
      evidence_paths: p.screenshotUrl ? [p.screenshotUrl] : [],
      confirmation_message: p.confirmationMessage || null,
      status: (String(p.verificationStatus || '').toLowerCase().includes('verif') || String(p.verificationStatus || '').toLowerCase().includes('approv')) ? 'verified' : (String(p.verificationStatus || '').toLowerCase().includes('reject') ? 'rejected' : 'submitted'),
      verified_at: p.verifiedAt || null,
      verified_by: p.verifiedBy || null,
      notes: p.adminNotes || null,
      admin_notes: p.adminNotes || null,
      reject_reason: p.adminNotes || null,
      submitted_at: p.submittedAt || new Date().toISOString(),
      created_at: p.submittedAt || new Date().toISOString()
    }, { onConflict: 'id' });
  } catch (err) {
    console.warn('[Supabase] Save payment error:', err);
  }
}

export async function deletePaymentFromSupabase(paymentId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('payments').delete().eq('id', paymentId);
    return !error;
  } catch {
    return false;
  }
}

export async function syncAllPaymentsToSupabase(payments: PaymentConfirmation[] = []): Promise<number> {
  let count = 0;
  for (const p of payments) {
    await savePaymentToSupabase(p);
    count++;
  }
  return count;
}

// -------------------------------------------------------------
// 6. CUSTOMERS & USERS CRUD
// -------------------------------------------------------------
export async function getAccountsFromSupabase(): Promise<any[]> {
  try {
    const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
    if (error || !data) return [];
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
    if (account.id) {
      row.id = account.id;
    }
    await supabase.from('users').upsert(row, { onConflict: 'email' });
  } catch (err) {
    console.warn('[Supabase] Save user error:', err);
  }
}

export async function deleteAccountFromSupabase(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('users').delete().eq('id', userId);
    return !error;
  } catch {
    return false;
  }
}

export async function syncAllAccountsToSupabase(accounts: any[] = []): Promise<{
  success: boolean;
  syncedCount: number;
  message?: string;
}> {
  let count = 0;
  for (const acc of accounts) {
    try {
      await saveAccountToSupabase(acc);
      count++;
    } catch {}
  }
  return { success: count > 0 || accounts.length === 0, syncedCount: count };
}

// -------------------------------------------------------------
// 7. CUSTOMER MESSAGES & ADMIN NOTIFICATIONS CRUD
// -------------------------------------------------------------
export function isAdminNotificationSupabaseRow(m: any): boolean {
  if (!m) return false;
  const sender = String(m.sender || '').toLowerCase().trim();
  const notifType = String(m.notification_type || '').toLowerCase().trim();
  return sender === 'admin_notification' || notifType.startsWith('admin_notif');
}

export function mapSupabaseRowToMessage(m: any): AdminMessage {
  return {
    id: String(m.id),
    name: m.name || m.sender_name || 'Customer',
    email: m.email || m.sender_email || '',
    phone: m.phone || m.sender_phone || undefined,
    subject: m.subject || '',
    message: m.message || m.body || '',
    status: m.status || 'unread',
    orderNumber: m.order_number || undefined,
    customerId: m.customer_id || undefined,
    sender: m.sender || 'customer',
    senderName: m.name || m.sender_name || undefined,
    isReadByCustomer: m.is_read_by_customer !== undefined ? Boolean(m.is_read_by_customer) : undefined,
    isReadByAdmin: m.is_read_by_admin !== undefined ? Boolean(m.is_read_by_admin) : undefined,
    notificationType: (m.notification_type || undefined) as any,
    createdAt: m.created_at || new Date().toISOString(),
    readAt: m.read_at || undefined,
    repliedAt: m.replied_at || undefined,
    replyNote: m.reply_note || m.reply_message || undefined
  };
}

export function mapSupabaseRowToAdminNotification(row: any): AdminNotification {
  let parsedMeta: Record<string, any> = {};
  if (row.metadata && typeof row.metadata === 'object') {
    parsedMeta = row.metadata;
  } else if (typeof row.reply_note === 'string' && row.reply_note.trim().startsWith('{')) {
    try {
      parsedMeta = JSON.parse(row.reply_note);
    } catch {}
  }

  const rawCategory = String(
    row.category ||
    parsedMeta.category ||
    String(row.notification_type || '').replace(/^admin_notif_?/, '') ||
    'system'
  ).toLowerCase().trim();

  const validCategories: AdminNotificationCategory[] = ['order', 'payment', 'message', 'problem', 'supplier', 'system'];
  const category: AdminNotificationCategory = validCategories.includes(rawCategory as AdminNotificationCategory)
    ? (rawCategory as AdminNotificationCategory)
    : 'system';

  return {
    id: String(row.id),
    category,
    title: row.title || row.subject || 'Admin Notification',
    message: row.message || '',
    senderName: row.sender_name || row.name || undefined,
    senderPhone: row.sender_phone || row.phone || undefined,
    senderEmail: row.sender_email || row.email || undefined,
    orderNumber: row.order_number || undefined,
    customerId: row.customer_id || undefined,
    actionTab: row.action_tab || parsedMeta.actionTab || undefined,
    entityId: row.entity_id || parsedMeta.entityId || undefined,
    isRead: row.is_read !== undefined
      ? Boolean(row.is_read)
      : (row.is_read_by_admin !== undefined ? Boolean(row.is_read_by_admin) : row.status === 'read'),
    readAt: row.read_at || undefined,
    createdAt: row.created_at || new Date().toISOString(),
    metadata: parsedMeta.metadata || (Object.keys(parsedMeta).length > 0 ? parsedMeta : undefined)
  };
}

export async function getMessagesFromSupabase(): Promise<AdminMessage[]> {
  try {
    const { data, error } = await supabase.from('messages').select('*').order('created_at', { ascending: false });
    if (error || !data) return [];
    return data
      .filter((row: any) => !isAdminNotificationSupabaseRow(row))
      .map(mapSupabaseRowToMessage);
  } catch {
    return [];
  }
}

export async function saveMessageToSupabase(m: AdminMessage): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('messages').upsert({
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
      is_read_by_customer: m.isReadByCustomer !== undefined ? Boolean(m.isReadByCustomer) : (m.sender !== 'admin'),
      is_read_by_admin: m.isReadByAdmin !== undefined ? Boolean(m.isReadByAdmin) : (m.sender === 'admin' || m.status === 'read' || m.status === 'replied'),
      notification_type: m.notificationType || 'chat',
      read_at: m.readAt || null,
      reply_note: m.replyNote || null,
      replied_at: m.repliedAt || null,
      created_at: m.createdAt || new Date().toISOString()
    }, { onConflict: 'id' });
    if (error) {
      console.warn('[Supabase] Save message error:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.warn('[Supabase] Save message error:', err);
    return { success: false, error: err?.message };
  }
}

export async function deleteMessageFromSupabase(messageId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('messages').delete().eq('id', messageId);
    return !error;
  } catch {
    return false;
  }
}

export async function getAdminNotificationsFromSupabase(): Promise<AdminNotification[]> {
  const merged = new Map<string, AdminNotification>();

  try {
    const { data: dedicatedRows, error: dedErr } = await supabase
      .from('admin_notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (!dedErr && Array.isArray(dedicatedRows)) {
      for (const row of dedicatedRows) {
        const mapped = mapSupabaseRowToAdminNotification(row);
        merged.set(mapped.id, mapped);
      }
    }
  } catch {}

  try {
    const { data: msgRows, error: msgErr } = await supabase
      .from('messages')
      .select('*')
      .eq('sender', 'admin_notification')
      .order('created_at', { ascending: false })
      .limit(200);
    if (!msgErr && Array.isArray(msgRows)) {
      for (const row of msgRows) {
        const mapped = mapSupabaseRowToAdminNotification(row);
        if (!merged.has(mapped.id)) {
          merged.set(mapped.id, mapped);
        }
      }
    }
  } catch {}

  return Array.from(merged.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function saveAdminNotificationToSupabase(n: AdminNotification): Promise<{ success: boolean; error?: string }> {
  let savedAny = false;
  let lastError: string | undefined;

  try {
    const { error: msgErr } = await supabase.from('messages').upsert({
      id: n.id,
      name: n.senderName || 'ContactReach Alert',
      sender_name: n.senderName || 'ContactReach Alert',
      phone: n.senderPhone || null,
      sender_phone: n.senderPhone || null,
      email: n.senderEmail || null,
      sender_email: n.senderEmail || null,
      subject: n.title,
      message: n.message,
      order_number: n.orderNumber || null,
      customer_id: n.customerId || null,
      sender: 'admin_notification',
      status: n.isRead ? 'read' : 'unread',
      is_read_by_customer: true,
      is_read_by_admin: Boolean(n.isRead),
      notification_type: `admin_notif_${n.category}`,
      read_at: n.readAt || null,
      reply_note: JSON.stringify({
        category: n.category,
        actionTab: n.actionTab || null,
        entityId: n.entityId || null,
        metadata: n.metadata || {}
      }),
      created_at: n.createdAt || new Date().toISOString()
    }, { onConflict: 'id' });
    if (!msgErr) {
      savedAny = true;
    } else {
      lastError = msgErr.message;
    }
  } catch (err: any) {
    lastError = err?.message;
  }

  // Also mirror to dedicated admin_notifications table if present in Supabase
  try {
    const { error: dedErr } = await supabase.from('admin_notifications').upsert({
      id: n.id,
      category: n.category,
      title: n.title,
      message: n.message,
      sender_name: n.senderName || null,
      sender_phone: n.senderPhone || null,
      sender_email: n.senderEmail || null,
      order_number: n.orderNumber || null,
      customer_id: n.customerId || null,
      action_tab: n.actionTab || null,
      entity_id: n.entityId || null,
      is_read: Boolean(n.isRead),
      read_at: n.readAt || null,
      metadata: n.metadata || {},
      created_at: n.createdAt || new Date().toISOString()
    }, { onConflict: 'id' });
    if (!dedErr) savedAny = true;
  } catch {}

  return { success: savedAny, error: savedAny ? undefined : lastError };
}

export async function deleteAdminNotificationFromSupabase(notificationId: string): Promise<boolean> {
  let deleted = false;
  try {
    const { error } = await supabase.from('messages').delete().eq('id', notificationId);
    if (!error) deleted = true;
  } catch {}
  try {
    const { error } = await supabase.from('admin_notifications').delete().eq('id', notificationId);
    if (!error) deleted = true;
  } catch {}
  return deleted;
}

// -------------------------------------------------------------
// 8. ISSUES & CUSTOMER PROBLEMS CRUD
// -------------------------------------------------------------
export async function getCustomerProblemsFromSupabase(): Promise<CustomerProblemReport[]> {
  try {
    const { data, error } = await supabase.from('customer_problems').select('*').order('created_at', { ascending: false });
    if (error || !data) return [];
    return data.map((p: any) => ({
      id: p.id,
      caseNumber: p.case_number || undefined,
      orderNumber: p.order_number,
      customerName: p.customer_name,
      customerPhone: p.customer_phone,
      customerEmail: p.customer_email || undefined,
      category: p.category || 'delivery_delay',
      issueType: p.issue_type || undefined,
      description: p.description,
      priority: p.priority || 'medium',
      status: p.status || 'New',
      assignedTo: p.assigned_to || undefined,
      adminNotes: p.admin_notes || undefined,
      resolution: p.resolution || undefined,
      resolvedAt: p.resolved_at || undefined,
      createdAt: p.created_at || new Date().toISOString()
    }));
  } catch {
    return [];
  }
}

export async function saveCustomerProblemToSupabase(p: CustomerProblemReport): Promise<void> {
  try {
    await supabase.from('customer_problems').upsert({
      id: p.id,
      case_number: p.caseNumber || null,
      order_number: p.orderNumber,
      customer_name: p.customerName,
      customer_phone: p.customerPhone,
      customer_email: p.customerEmail || null,
      category: p.category || 'delivery_delay',
      issue_type: (p as any).issueType || p.category || null,
      description: p.description,
      priority: p.priority || 'medium',
      status: p.status || 'New',
      assigned_to: p.assignedTo || null,
      admin_notes: (p as any).adminNotes || (p.privateNotes ? JSON.stringify(p.privateNotes) : null),
      resolution: p.resolution || null,
      resolved_at: p.resolvedAt || null,
      updated_at: new Date().toISOString(),
      created_at: p.createdAt || new Date().toISOString()
    }, { onConflict: 'id' });
  } catch (err) {
    console.warn('[Supabase] Save customer problem error:', err);
  }
}

export async function deleteCustomerProblemFromSupabase(problemId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('customer_problems').delete().eq('id', problemId);
    return !error;
  } catch {
    return false;
  }
}

// -------------------------------------------------------------
// 9. COUPONS & PROMO CODES CRUD
// -------------------------------------------------------------
export async function getCouponsFromSupabase(): Promise<Coupon[]> {
  try {
    const { data, error } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
    if (error || !data) return [];
    return data.map((c: any) => ({
      id: c.id,
      code: c.code,
      discountType: c.discount_type || 'percentage',
      discountValue: Number(c.discount_value) || 0,
      minOrderAmount: Number(c.min_order_amount) || 0,
      maxDiscount: c.max_discount !== null ? Number(c.max_discount) : undefined,
      expiresAt: c.expires_at || undefined,
      usageLimit: c.usage_limit !== null ? Number(c.usage_limit) : undefined,
      timesUsed: Number(c.times_used) || 0,
      isActive: c.is_active !== false
    }));
  } catch {
    return [];
  }
}

export async function saveCouponToSupabase(c: Coupon): Promise<void> {
  try {
    await supabase.from('coupons').upsert({
      id: c.id,
      code: c.code,
      discount_type: c.discountType || 'percentage',
      discount_value: c.discountValue,
      min_order_amount: c.minOrderAmount || 0,
      max_discount: c.maxDiscount || null,
      expires_at: c.expiresAt || null,
      usage_limit: c.usageLimit || null,
      times_used: c.timesUsed || 0,
      is_active: c.isActive !== false,
      created_at: new Date().toISOString()
    }, { onConflict: 'id' });
  } catch (err) {
    console.warn('[Supabase] Save coupon error:', err);
  }
}

export async function deleteCouponFromSupabase(couponId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('coupons').delete().eq('id', couponId);
    return !error;
  } catch {
    return false;
  }
}

// -------------------------------------------------------------
// 10. INVENTORY LOGS CRUD
// -------------------------------------------------------------
export async function getInventoryLogsFromSupabase(): Promise<InventoryLog[]> {
  try {
    const { data, error } = await supabase.from('inventory_logs').select('*').order('created_at', { ascending: false }).limit(200);
    if (error || !data) return [];
    return data.map((l: any) => ({
      id: l.id,
      productId: l.product_id,
      productName: l.product_name,
      previousStock: l.previous_stock,
      newStock: l.new_stock,
      changeAmount: l.change_amount || l.quantity_changed || 0,
      reason: l.reason,
      adminName: l.admin_name || l.performed_by || 'System',
      timestamp: l.timestamp || l.created_at || new Date().toISOString()
    }));
  } catch {
    return [];
  }
}

export async function saveInventoryLogToSupabase(l: InventoryLog): Promise<void> {
  try {
    await supabase.from('inventory_logs').upsert({
      id: l.id,
      product_id: l.productId,
      product_name: l.productName,
      previous_stock: l.previousStock,
      new_stock: l.newStock,
      change_amount: l.changeAmount,
      quantity_changed: l.changeAmount,
      reason: l.reason,
      performed_by: l.adminName,
      admin_name: l.adminName,
      timestamp: l.timestamp || new Date().toISOString(),
      created_at: l.timestamp || new Date().toISOString()
    }, { onConflict: 'id' });
  } catch (err) {
    console.warn('[Supabase] Save inventory log error:', err);
  }
}

export async function deleteInventoryLogFromSupabase(logId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('inventory_logs').delete().eq('id', logId);
    return !error;
  } catch (err) {
    console.warn('[Supabase] Delete inventory log error:', err);
    return false;
  }
}

// -------------------------------------------------------------
// 11. AUDIT LOGS CRUD
// -------------------------------------------------------------
export async function getAuditLogsFromSupabase(): Promise<AuditLog[]> {
  try {
    const { data, error } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(250);
    if (error || !data) return [];
    return data.map((a: any) => ({
      id: a.id,
      adminName: a.admin_name || 'System Admin',
      adminRole: a.admin_role || 'owner',
      action: a.action,
      details: a.details || '',
      entityType: a.entity_type || undefined,
      entityId: a.entity_id || undefined,
      timestamp: a.timestamp || a.created_at || new Date().toISOString()
    }));
  } catch {
    return [];
  }
}

export async function saveAuditLogToSupabase(a: AuditLog): Promise<void> {
  try {
    await supabase.from('audit_logs').upsert({
      id: a.id,
      admin_name: a.adminName,
      admin_role: a.adminRole,
      action: a.action,
      details: a.details,
      entity_type: a.entityType || null,
      entity_id: a.entityId || null,
      timestamp: a.timestamp || new Date().toISOString(),
      created_at: a.timestamp || new Date().toISOString()
    }, { onConflict: 'id' });
  } catch (err) {
    console.warn('[Supabase] Save audit log error:', err);
  }
}

export async function deleteAuditLogFromSupabase(logId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('audit_logs').delete().eq('id', logId);
    return !error;
  } catch (err) {
    console.warn('[Supabase] Delete audit log error:', err);
    return false;
  }
}

// -------------------------------------------------------------
// 12. SUPPLIERS & APPLICATIONS CRUD
// -------------------------------------------------------------
export async function getSupplierApplicationsFromSupabase(): Promise<any[]> {
  try {
    const { data, error } = await supabase.from('supplier_applications').select('*').order('created_at', { ascending: false });
    if (error || !data) return [];
    return data.map((s: any) => ({
      id: s.id,
      businessName: s.business_name,
      ownerName: s.owner_name,
      phone: s.phone,
      email: s.email || undefined,
      tinNumber: s.tin_number || undefined,
      location: s.location || '',
      category: s.category || '',
      description: s.description || undefined,
      status: s.status || 'Pending',
      reviewedBy: s.reviewed_by || undefined,
      reviewedAt: s.reviewed_at || undefined,
      createdAt: s.created_at || new Date().toISOString()
    }));
  } catch {
    return [];
  }
}

export async function saveSupplierApplicationToSupabase(a: any): Promise<void> {
  try {
    await supabase.from('supplier_applications').upsert({
      id: a.id,
      business_name: a.businessName,
      owner_name: a.ownerName,
      phone: a.phone,
      email: a.email || null,
      tin_number: a.tinNumber || null,
      location: a.location || null,
      category: a.category || null,
      description: a.description || null,
      status: a.status || 'Pending',
      reviewed_by: a.reviewedBy || null,
      reviewed_at: a.reviewedAt || null,
      created_at: a.createdAt || new Date().toISOString()
    }, { onConflict: 'id' });
  } catch (err) {
    console.warn('[Supabase] Save supplier application error:', err);
  }
}

export async function deleteSupplierApplicationFromSupabase(appId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('supplier_applications').delete().eq('id', appId);
    return !error;
  } catch (err) {
    console.warn('[Supabase] Delete supplier application error:', err);
    return false;
  }
}

// -------------------------------------------------------------
// 13. SUPPLIER PAYOUTS CRUD
// -------------------------------------------------------------
export async function getSupplierPayoutsFromSupabase(): Promise<any[]> {
  try {
    const { data, error } = await supabase.from('supplier_payouts').select('*').order('created_at', { ascending: false });
    if (error || !data) return [];
    return data.map((p: any) => ({
      id: p.id,
      shopId: p.shop_id,
      shopName: p.shop_name,
      orderId: p.order_id,
      orderNumber: p.order_number,
      orderTotal: Number(p.order_total) || 0,
      commissionRate: Number(p.commission_rate) || 0.1,
      commissionEarned: Number(p.commission_earned) || 0,
      payoutAmount: Number(p.payout_amount) || 0,
      status: p.status || 'Pending',
      paymentReference: p.payment_reference || undefined,
      paidAt: p.paid_at || undefined,
      approvedBy: p.approved_by || undefined,
      createdAt: p.created_at || new Date().toISOString()
    }));
  } catch {
    return [];
  }
}

export async function saveSupplierPayoutToSupabase(p: any): Promise<void> {
  try {
    await supabase.from('supplier_payouts').upsert({
      id: p.id,
      shop_id: p.shopId,
      shop_name: p.shopName,
      order_id: p.orderId,
      order_number: p.orderNumber,
      order_total: p.orderTotal || 0,
      commission_rate: p.commissionRate || 0.1,
      commission_earned: p.commissionEarned || 0,
      payout_amount: p.payoutAmount || 0,
      status: p.status || 'Pending',
      payment_reference: p.paymentReference || null,
      paid_at: p.paidAt || null,
      approved_by: p.approvedBy || null,
      created_at: p.createdAt || new Date().toISOString()
    }, { onConflict: 'id' });
  } catch (err) {
    console.warn('[Supabase] Save supplier payout error:', err);
  }
}

export async function deleteSupplierPayoutFromSupabase(payoutId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('supplier_payouts').delete().eq('id', payoutId);
    return !error;
  } catch (err) {
    console.warn('[Supabase] Delete supplier payout error:', err);
    return false;
  }
}

// -------------------------------------------------------------
// 14. STORE SETTINGS CRUD
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
      receiver_name: settings.receiverName || 'Ruth',
      payment_number: settings.paymentNumber || '0780022600',
      merchant_code: settings.merchantCode || '2328354',
      mtn_ussd_pattern: settings.mtnUssdPattern || '*182*1*1*0780022600*{AMOUNT}#',
      airtel_ussd_pattern: settings.airtelUssdPattern || '*182*1*2*0780022600*{AMOUNT}#',
      delivery_fee_kigali: settings.deliveryFeeKigali || 1500,
      delivery_fee_upcountry: settings.deliveryFeeUpcountry || 3500,
      free_delivery_threshold: settings.freeDeliveryThreshold || 50000,
      is_maintenance_mode: Boolean(settings.isMaintenanceMode),
      maintenance_title: settings.maintenanceTitle || null,
      maintenance_message: settings.maintenanceMessage || null,
      settings_data: settings,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });
  } catch (err) {
    console.warn('[Supabase] Save settings error:', err);
  }
}

// -------------------------------------------------------------
// 15. REVIEWS CRUD
// -------------------------------------------------------------
export async function getReviewsFromSupabase(productId?: string): Promise<ProductReview[]> {
  try {
    let query = supabase.from('reviews').select('*').order('created_at', { ascending: false });
    if (productId) query = query.eq('product_id', productId);
    const { data, error } = await query;
    if (error || !data) return [];
    return data.map((r: any) => ({
      id: r.id,
      productId: r.product_id,
      customerName: r.customer_name,
      rating: Number(r.rating) || 5.0,
      comment: r.comment || '',
      verifiedPurchase: Boolean(r.verified_purchase),
      status: (r.status as 'approved' | 'pending' | 'hidden') || 'approved',
      createdAt: r.created_at || new Date().toISOString()
    }));
  } catch {
    return [];
  }
}

export async function saveReviewToSupabase(review: ProductReview): Promise<void> {
  try {
    await supabase.from('reviews').upsert({
      id: review.id,
      product_id: review.productId,
      customer_name: review.customerName,
      customer_phone: review.customerPhone || null,
      rating: review.rating,
      comment: review.comment,
      verified_purchase: Boolean(review.verifiedPurchase),
      created_at: review.createdAt || new Date().toISOString()
    }, { onConflict: 'id' });
  } catch (err) {
    console.warn('[Supabase] Save review error:', err);
  }
}

// -------------------------------------------------------------
// 16. DELETED TOMBSTONES
// -------------------------------------------------------------
export async function getTombstonedProductIdsFromSupabase(): Promise<string[]> {
  try {
    const { data, error } = await supabase.from('deleted_tombstones').select('id');
    if (error || !data) return [];
    return data.map((d: any) => String(d.id));
  } catch {
    return [];
  }
}

export async function saveDeletedTombstoneToSupabase(id: string, name?: string, adminName?: string, reason?: string): Promise<void> {
  try {
    await supabase.from('deleted_tombstones').upsert({
      id: id,
      product_name: name || null,
      deleted_by: adminName || 'System Admin',
      deleted_at: new Date().toISOString(),
      reason: reason || 'Admin deleted product'
    }, { onConflict: 'id' });
  } catch (err) {
    console.warn('[Supabase] Save tombstone error:', err);
  }
}

// -------------------------------------------------------------
// 17. FULL DATABASE MIGRATION HELPER
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
  adminNotifications?: AdminNotification[];
  customerProblems?: CustomerProblemReport[];
  coupons?: Coupon[];
  inventoryLogs?: InventoryLog[];
  auditLogs?: AuditLog[];
  supplierApplications?: any[];
  supplierPayouts?: any[];
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
    messages: 0,
    notifications: 0,
    problems: 0,
    coupons: 0,
    inventoryLogs: 0,
    auditLogs: 0,
    supplierApps: 0,
    supplierPayouts: 0
  };

  try {
    if (db.products?.length) {
      const prodRes = await syncAllProductsToSupabase(db.products);
      results.products = prodRes.syncedCount;
    }
    if (db.categories?.length) {
      results.categories = await syncAllCategoriesToSupabase(db.categories);
    }
    if (db.shops?.length) {
      results.shops = await syncAllShopsToSupabase(db.shops);
    }
    if (db.orders?.length) {
      const ordRes = await syncAllOrdersToSupabase(db.orders);
      results.orders = ordRes.syncedCount;
    }
    if (db.payments?.length) {
      results.payments = await syncAllPaymentsToSupabase(db.payments);
    }
    if (db.customers?.length || db.adminUsers?.length) {
      const combined = [...(db.adminUsers || []), ...(db.customers || [])];
      results.accounts = (await syncAllAccountsToSupabase(combined)).syncedCount;
    }
    if (db.messages?.length) {
      for (const m of db.messages) {
        const res = await saveMessageToSupabase(m);
        if (res.success) results.messages++;
      }
    }
    if (db.adminNotifications?.length) {
      for (const n of db.adminNotifications) {
        const res = await saveAdminNotificationToSupabase(n);
        if (res.success) results.notifications++;
      }
    }
    if (db.customerProblems?.length) {
      for (const p of db.customerProblems) {
        await saveCustomerProblemToSupabase(p);
        results.problems++;
      }
    }
    if (db.coupons?.length) {
      for (const c of db.coupons) {
        await saveCouponToSupabase(c);
        results.coupons++;
      }
    }
    if (db.inventoryLogs?.length) {
      for (const l of db.inventoryLogs) {
        await saveInventoryLogToSupabase(l);
        results.inventoryLogs++;
      }
    }
    if (db.auditLogs?.length) {
      for (const a of db.auditLogs) {
        await saveAuditLogToSupabase(a);
        results.auditLogs++;
      }
    }
    if (db.supplierApplications?.length) {
      for (const app of db.supplierApplications) {
        await saveSupplierApplicationToSupabase(app);
        results.supplierApps++;
      }
    }
    if (db.supplierPayouts?.length) {
      for (const p of db.supplierPayouts) {
        await saveSupplierPayoutToSupabase(p);
        results.supplierPayouts++;
      }
    }
    if (db.settings) {
      await saveSettingsToSupabase(db.settings);
    }

    const totalSynced = Object.values(results).reduce((a, b) => a + b, 0);
    return {
      success: true,
      results,
      message: `Full database synchronization complete! Successfully synchronized ${totalSynced} records to Supabase.`
    };
  } catch (err: any) {
    return {
      success: false,
      results,
      message: `Sync notice: ${err?.message || 'Completed'}`
    };
  }
}

// -------------------------------------------------------------
// 18. REALTIME SUBSCRIPTIONS
// -------------------------------------------------------------
export function subscribeToSupabaseTable(
  tableName: string,
  onChange: (payload: any) => void
): () => void {
  try {
    const channel = supabase
      .channel(`realtime-${tableName}-${Date.now()}`)
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
    console.warn('[Supabase] Subscription error:', err);
    return () => {};
  }
}
