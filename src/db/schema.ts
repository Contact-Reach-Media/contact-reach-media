import { relations } from 'drizzle-orm';
import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  real,
  jsonb,
  timestamp
} from 'drizzle-orm/pg-core';

// Users table (linked to Firebase Auth UID)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  name: text('name'),
  role: text('role').default('buyer'),
  phone: text('phone'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Products table
export const products = pgTable('products', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  sku: text('sku'),
  description: text('description'),
  price: integer('price').notNull().default(0),
  costPrice: integer('cost_price'),
  costOverriddenByAdmin: boolean('cost_overridden_by_admin').default(false),
  category: text('category').notNull().default('clothing'),
  subcategory: text('subcategory'),
  stock: integer('stock').notNull().default(0),
  imageUrl: text('image_url'),
  images: jsonb('images').$type<string[]>().default([]),
  shopName: text('shop_name'),
  shopId: text('shop_id'),
  receiverName: text('receiver_name'),
  paymentMethods: jsonb('payment_methods').$type<string[]>().default([]),
  merchantCode: text('merchant_code'),
  receiverPhone: text('receiver_phone'),
  location: text('location'),
  deliveryInfo: text('delivery_info'),
  status: text('status').notNull().default('Available'),
  isFeatured: boolean('is_featured').default(false),
  isNewArrival: boolean('is_new_arrival').default(false),
  isBestSeller: boolean('is_best_seller').default(false),
  brand: text('brand'),
  unit: text('unit').default('Piece'),
  videoUrl: text('video_url'),
  variations: jsonb('variations').default([]),
  rating: real('rating').default(5.0),
  reviewsCount: integer('reviews_count').default(0),
  source: text('source'),
  alibabaProductId: text('alibaba_product_id'),
  cjProductId: text('cj_product_id'),
  createdAt: text('created_at'),
  updatedAt: text('updated_at'),
});

// Categories table
export const categories = pgTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  nameRw: text('name_rw'),
  nameFr: text('name_fr'),
  icon: text('icon'),
  description: text('description'),
  parentId: text('parent_id'),
  sortOrder: integer('sort_order').default(0),
  isActive: boolean('is_active').default(true),
});

// Orders table
export const orders = pgTable('orders', {
  id: text('id').primaryKey(),
  orderNumber: text('order_number').notNull(),
  customerName: text('customer_name').notNull(),
  customerPhone: text('customer_phone').notNull(),
  customerEmail: text('customer_email'),
  deliveryDistrict: text('delivery_district'),
  deliveryAddress: text('delivery_address'),
  items: jsonb('items').notNull().default([]),
  subtotal: integer('subtotal').notNull().default(0),
  deliveryFee: integer('delivery_fee').notNull().default(0),
  total: integer('total').notNull().default(0),
  paymentMethod: text('payment_method').notNull().default('MTN Mobile Money'),
  paymentStatus: text('payment_status').notNull().default('Pending'),
  orderStatus: text('order_status').notNull().default('Pending'),
  trackingNumber: text('tracking_number'),
  notes: text('notes'),
  createdAt: text('created_at'),
  updatedAt: text('updated_at'),
});

// Payment Confirmations table
export const paymentConfirmations = pgTable('payment_confirmations', {
  id: text('id').primaryKey(),
  orderNumber: text('order_number').notNull(),
  customerPhone: text('customer_phone').notNull(),
  amount: integer('amount').notNull().default(0),
  transactionId: text('transaction_id'),
  senderName: text('sender_name'),
  paymentMethod: text('payment_method').notNull().default('MTN Mobile Money'),
  status: text('status').notNull().default('Pending'),
  proofUrl: text('proof_url'),
  createdAt: text('created_at'),
  verifiedAt: text('verified_at'),
  verifiedBy: text('verified_by'),
});

// Vendor Shops table
export const vendorShops = pgTable('vendor_shops', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  nameRw: text('name_rw'),
  ownerName: text('owner_name'),
  phone: text('phone'),
  email: text('email'),
  tinNumber: text('tin_number'),
  location: text('location'),
  logoUrl: text('logo_url'),
  bannerUrl: text('banner_url'),
  rating: real('rating').default(5.0),
  totalSales: integer('total_sales').default(0),
  status: text('status').default('Active'),
  categories: jsonb('categories').$type<string[]>().default([]),
  description: text('description'),
  createdAt: text('created_at'),
});

// Supplier Applications table
export const supplierApplications = pgTable('supplier_applications', {
  id: text('id').primaryKey(),
  businessName: text('business_name').notNull(),
  ownerName: text('owner_name').notNull(),
  phone: text('phone').notNull(),
  email: text('email'),
  tinNumber: text('tin_number'),
  location: text('location'),
  category: text('category'),
  description: text('description'),
  status: text('status').notNull().default('Pending'),
  reviewedBy: text('reviewed_by'),
  reviewedAt: text('reviewed_at'),
  createdAt: text('created_at'),
});

// Customer Problem Reports table
export const customerProblems = pgTable('customer_problems', {
  id: text('id').primaryKey(),
  orderNumber: text('order_number').notNull(),
  customerName: text('customer_name').notNull(),
  customerPhone: text('customer_phone').notNull(),
  customerEmail: text('customer_email'),
  issueType: text('issue_type').notNull(),
  description: text('description').notNull(),
  status: text('status').notNull().default('Pending'),
  adminNotes: text('admin_notes'),
  createdAt: text('created_at'),
  resolvedAt: text('resolved_at'),
});

// Coupons table
export const coupons = pgTable('coupons', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  discountType: text('discount_type').notNull().default('percentage'),
  discountValue: integer('discount_value').notNull().default(0),
  minOrderAmount: integer('min_order_amount').default(0),
  maxDiscountAmount: integer('max_discount_amount'),
  expiryDate: text('expiry_date'),
  usageLimit: integer('usage_limit'),
  timesUsed: integer('times_used').default(0),
  isActive: boolean('is_active').default(true),
  createdAt: text('created_at'),
});

// App Settings table
export const appSettings = pgTable('app_settings', {
  id: text('id').primaryKey().default('global'),
  companyName: text('company_name'),
  marketName: text('market_name'),
  slogan: text('slogan'),
  phone: text('phone'),
  email: text('email'),
  tinNumber: text('tin_number'),
  location: text('location'),
  logoUrl: text('logo_url'),
  deliveryFees: jsonb('delivery_fees'),
  paymentConfig: jsonb('payment_config'),
  isMaintenanceMode: boolean('is_maintenance_mode').default(false),
  maintenanceMessage: text('maintenance_message'),
  createdAt: text('created_at'),
  updatedAt: text('updated_at'),
});

// Audit Logs table
export const auditLogs = pgTable('audit_logs', {
  id: text('id').primaryKey(),
  adminEmail: text('admin_email'),
  adminName: text('admin_name'),
  action: text('action'),
  details: text('details'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: text('created_at'),
});

// Messages table
export const messages = pgTable('messages', {
  id: text('id').primaryKey(),
  name: text('name'),
  email: text('email'),
  phone: text('phone'),
  subject: text('subject'),
  message: text('message'),
  isRead: boolean('is_read').default(false),
  createdAt: text('created_at'),
});
