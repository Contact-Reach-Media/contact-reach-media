import { db } from './index.ts';
import {
  products as productsTable,
  categories as categoriesTable,
  orders as ordersTable,
  paymentConfirmations as paymentsTable,
  vendorShops as shopsTable,
  appSettings as settingsTable,
  customerProblems as problemsTable,
  supplierApplications as applicationsTable,
  auditLogs as auditLogsTable,
  messages as messagesTable,
  coupons as couponsTable,
  users as usersTable
} from './schema.ts';
import { eq } from 'drizzle-orm';

// -------------------------------------------------------------
// PRODUCTS
// -------------------------------------------------------------
export async function saveProductToPostgres(product: any) {
  try {
    const row = {
      id: String(product.id),
      name: String(product.name || 'Untitled Product'),
      sku: product.sku ? String(product.sku) : null,
      description: product.description ? String(product.description) : null,
      price: Math.max(0, parseInt(String(product.price), 10) || 0),
      costPrice: product.costPrice !== undefined ? parseInt(String(product.costPrice), 10) : null,
      costOverriddenByAdmin: Boolean(product.costOverriddenByAdmin),
      category: String(product.category || 'clothing'),
      subcategory: product.subcategory ? String(product.subcategory) : null,
      stock: Math.max(0, parseInt(String(product.stock), 10) || 0),
      imageUrl: product.imageUrl ? String(product.imageUrl) : null,
      images: Array.isArray(product.images) ? product.images : (product.imageUrl ? [product.imageUrl] : []),
      shopName: product.shopName ? String(product.shopName) : null,
      shopId: product.shopId ? String(product.shopId) : null,
      receiverName: product.receiverName ? String(product.receiverName) : null,
      paymentMethods: Array.isArray(product.paymentMethods) ? product.paymentMethods : [],
      merchantCode: product.merchantCode ? String(product.merchantCode) : null,
      receiverPhone: product.receiverPhone ? String(product.receiverPhone) : null,
      location: product.location ? String(product.location) : null,
      deliveryInfo: product.deliveryInfo ? String(product.deliveryInfo) : null,
      status: String(product.status || 'Available'),
      isFeatured: Boolean(product.isFeatured),
      isNewArrival: Boolean(product.isNewArrival),
      isBestSeller: Boolean(product.isBestSeller),
      brand: product.brand ? String(product.brand) : null,
      unit: String(product.unit || 'Piece'),
      videoUrl: product.videoUrl ? String(product.videoUrl) : null,
      variations: Array.isArray(product.variations) ? product.variations : [],
      rating: parseFloat(String(product.rating || 5.0)),
      reviewsCount: parseInt(String(product.reviewsCount || 0), 10),
      source: product.source ? String(product.source) : null,
      alibabaProductId: product.alibabaProductId ? String(product.alibabaProductId) : null,
      cjProductId: product.cjProductId ? String(product.cjProductId) : null,
      createdAt: product.createdAt ? String(product.createdAt) : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.insert(productsTable)
      .values(row)
      .onConflictDoUpdate({
        target: productsTable.id,
        set: row,
      });

    return true;
  } catch (error) {
    console.error('Failed to save product to PostgreSQL:', error);
    return false;
  }
}

export async function getProductsFromPostgres() {
  try {
    return await db.select().from(productsTable);
  } catch (error) {
    console.error('Failed to get products from PostgreSQL:', error);
    return [];
  }
}

export async function deleteProductFromPostgres(productId: string) {
  try {
    await db.delete(productsTable).where(eq(productsTable.id, productId));
    return true;
  } catch (error) {
    console.error('Failed to delete product from PostgreSQL:', error);
    return false;
  }
}

export async function bulkSyncProductsToPostgres(productsList: any[]) {
  let synced = 0;
  for (const p of productsList) {
    const ok = await saveProductToPostgres(p);
    if (ok) synced++;
  }
  return synced;
}

// -------------------------------------------------------------
// ORDERS
// -------------------------------------------------------------
export async function saveOrderToPostgres(order: any) {
  try {
    const row = {
      id: String(order.id),
      orderNumber: String(order.orderNumber || order.id),
      customerName: String(order.customerName || 'Customer'),
      customerPhone: String(order.customerPhone || ''),
      customerEmail: order.customerEmail ? String(order.customerEmail) : null,
      deliveryDistrict: order.deliveryDistrict ? String(order.deliveryDistrict) : null,
      deliveryAddress: order.deliveryAddress ? String(order.deliveryAddress) : null,
      items: Array.isArray(order.items) ? order.items : [],
      subtotal: Math.max(0, parseInt(String(order.subtotal), 10) || 0),
      deliveryFee: Math.max(0, parseInt(String(order.deliveryFee), 10) || 0),
      total: Math.max(0, parseInt(String(order.total), 10) || 0),
      paymentMethod: String(order.paymentMethod || 'MTN Mobile Money'),
      paymentStatus: String(order.paymentStatus || 'Pending'),
      orderStatus: String(order.orderStatus || 'Pending'),
      trackingNumber: order.trackingNumber ? String(order.trackingNumber) : null,
      notes: order.notes ? String(order.notes) : null,
      createdAt: order.createdAt ? String(order.createdAt) : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.insert(ordersTable)
      .values(row)
      .onConflictDoUpdate({
        target: ordersTable.id,
        set: row,
      });

    return true;
  } catch (error) {
    console.error('Failed to save order to PostgreSQL:', error);
    return false;
  }
}

export async function getOrdersFromPostgres() {
  try {
    return await db.select().from(ordersTable);
  } catch (error) {
    console.error('Failed to get orders from PostgreSQL:', error);
    return [];
  }
}

// -------------------------------------------------------------
// CATEGORIES
// -------------------------------------------------------------
export async function saveCategoryToPostgres(cat: any) {
  try {
    const row = {
      id: String(cat.id),
      name: String(cat.name || 'Category'),
      nameRw: cat.nameRw ? String(cat.nameRw) : null,
      nameFr: cat.nameFr ? String(cat.nameFr) : null,
      icon: cat.icon ? String(cat.icon) : null,
      description: cat.description ? String(cat.description) : null,
      parentId: cat.parentId ? String(cat.parentId) : null,
      sortOrder: parseInt(String(cat.sortOrder || 0), 10),
      isActive: cat.isActive !== undefined ? Boolean(cat.isActive) : true,
    };

    await db.insert(categoriesTable)
      .values(row)
      .onConflictDoUpdate({
        target: categoriesTable.id,
        set: row,
      });

    return true;
  } catch (error) {
    console.error('Failed to save category to PostgreSQL:', error);
    return false;
  }
}

export async function getCategoriesFromPostgres() {
  try {
    return await db.select().from(categoriesTable);
  } catch (error) {
    console.error('Failed to get categories from PostgreSQL:', error);
    return [];
  }
}

// -------------------------------------------------------------
// PAYMENT CONFIRMATIONS
// -------------------------------------------------------------
export async function savePaymentToPostgres(payment: any) {
  try {
    const row = {
      id: String(payment.id),
      orderNumber: String(payment.orderNumber || ''),
      customerPhone: String(payment.customerPhone || ''),
      amount: Math.max(0, parseInt(String(payment.amount), 10) || 0),
      transactionId: payment.transactionId ? String(payment.transactionId) : null,
      senderName: payment.senderName ? String(payment.senderName) : null,
      paymentMethod: String(payment.paymentMethod || 'MTN Mobile Money'),
      status: String(payment.status || 'Pending'),
      proofUrl: payment.proofUrl ? String(payment.proofUrl) : null,
      createdAt: payment.createdAt ? String(payment.createdAt) : new Date().toISOString(),
      verifiedAt: payment.verifiedAt ? String(payment.verifiedAt) : null,
      verifiedBy: payment.verifiedBy ? String(payment.verifiedBy) : null,
    };

    await db.insert(paymentsTable)
      .values(row)
      .onConflictDoUpdate({
        target: paymentsTable.id,
        set: row,
      });

    return true;
  } catch (error) {
    console.error('Failed to save payment confirmation to PostgreSQL:', error);
    return false;
  }
}

export async function getPaymentsFromPostgres() {
  try {
    return await db.select().from(paymentsTable);
  } catch (error) {
    console.error('Failed to get payment confirmations from PostgreSQL:', error);
    return [];
  }
}

// -------------------------------------------------------------
// VENDOR SHOPS
// -------------------------------------------------------------
export async function saveShopToPostgres(shop: any) {
  try {
    const row = {
      id: String(shop.id),
      name: String(shop.name || 'Vendor Shop'),
      nameRw: shop.nameRw ? String(shop.nameRw) : null,
      ownerName: shop.ownerName ? String(shop.ownerName) : null,
      phone: shop.phone ? String(shop.phone) : null,
      email: shop.email ? String(shop.email) : null,
      tinNumber: shop.tinNumber ? String(shop.tinNumber) : null,
      location: shop.location ? String(shop.location) : null,
      logoUrl: shop.logoUrl ? String(shop.logoUrl) : null,
      bannerUrl: shop.bannerUrl ? String(shop.bannerUrl) : null,
      rating: parseFloat(String(shop.rating || 5.0)),
      totalSales: parseInt(String(shop.totalSales || 0), 10),
      status: String(shop.status || 'Active'),
      categories: Array.isArray(shop.categories) ? shop.categories : [],
      description: shop.description ? String(shop.description) : null,
      createdAt: shop.createdAt ? String(shop.createdAt) : new Date().toISOString(),
    };

    await db.insert(shopsTable)
      .values(row)
      .onConflictDoUpdate({
        target: shopsTable.id,
        set: row,
      });

    return true;
  } catch (error) {
    console.error('Failed to save shop to PostgreSQL:', error);
    return false;
  }
}

export async function getShopsFromPostgres() {
  try {
    return await db.select().from(shopsTable);
  } catch (error) {
    console.error('Failed to get shops from PostgreSQL:', error);
    return [];
  }
}

// -------------------------------------------------------------
// SETTINGS
// -------------------------------------------------------------
export async function saveSettingsToPostgres(settings: any) {
  try {
    const row = {
      id: 'global',
      companyName: settings.companyName ? String(settings.companyName) : null,
      marketName: settings.marketName ? String(settings.marketName) : null,
      slogan: settings.slogan ? String(settings.slogan) : null,
      phone: settings.phone ? String(settings.phone) : null,
      email: settings.email ? String(settings.email) : null,
      tinNumber: settings.tinNumber ? String(settings.tinNumber) : null,
      location: settings.location ? String(settings.location) : null,
      logoUrl: settings.logoUrl ? String(settings.logoUrl) : null,
      deliveryFees: settings.deliveryFees || null,
      paymentConfig: settings.paymentConfig || null,
      isMaintenanceMode: Boolean(settings.isMaintenanceMode),
      maintenanceMessage: settings.maintenanceMessage ? String(settings.maintenanceMessage) : null,
      createdAt: settings.createdAt ? String(settings.createdAt) : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.insert(settingsTable)
      .values(row)
      .onConflictDoUpdate({
        target: settingsTable.id,
        set: row,
      });

    return true;
  } catch (error) {
    console.error('Failed to save settings to PostgreSQL:', error);
    return false;
  }
}

export async function getSettingsFromPostgres() {
  try {
    const rows = await db.select().from(settingsTable).where(eq(settingsTable.id, 'global'));
    return rows[0] || null;
  } catch (error) {
    console.error('Failed to get settings from PostgreSQL:', error);
    return null;
  }
}

// -------------------------------------------------------------
// MESSAGES & FEEDBACK
// -------------------------------------------------------------
export async function saveMessageToPostgres(msg: any) {
  try {
    const row = {
      id: String(msg.id),
      name: msg.name ? String(msg.name) : null,
      email: msg.email ? String(msg.email) : null,
      phone: msg.phone ? String(msg.phone) : null,
      subject: msg.subject ? String(msg.subject) : null,
      message: msg.message ? String(msg.message) : null,
      isRead: Boolean(msg.isRead),
      createdAt: msg.createdAt ? String(msg.createdAt) : new Date().toISOString(),
    };

    await db.insert(messagesTable)
      .values(row)
      .onConflictDoUpdate({
        target: messagesTable.id,
        set: row,
      });

    return true;
  } catch (error) {
    console.error('Failed to save message to PostgreSQL:', error);
    return false;
  }
}

// -------------------------------------------------------------
// CUSTOMER PROBLEMS
// -------------------------------------------------------------
export async function saveProblemToPostgres(problem: any) {
  try {
    const row = {
      id: String(problem.id),
      orderNumber: String(problem.orderNumber || ''),
      customerName: String(problem.customerName || ''),
      customerPhone: String(problem.customerPhone || ''),
      customerEmail: problem.customerEmail ? String(problem.customerEmail) : null,
      issueType: String(problem.issueType || 'General Inquiry'),
      description: String(problem.description || ''),
      status: String(problem.status || 'Pending'),
      adminNotes: problem.adminNotes ? String(problem.adminNotes) : null,
      createdAt: problem.createdAt ? String(problem.createdAt) : new Date().toISOString(),
      resolvedAt: problem.resolvedAt ? String(problem.resolvedAt) : null,
    };

    await db.insert(problemsTable)
      .values(row)
      .onConflictDoUpdate({
        target: problemsTable.id,
        set: row,
      });

    return true;
  } catch (error) {
    console.error('Failed to save customer problem to PostgreSQL:', error);
    return false;
  }
}
