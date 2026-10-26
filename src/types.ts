export type OrderStatus =
  | 'Awaiting Payment'
  | 'Payment Submitted'
  | 'Under Verification'
  | 'Paid'
  | 'Payment Rejected'
  | 'Cancelled'
  | 'New'
  | 'Confirmed'
  | 'Preparing'
  | 'Ready for Delivery'
  | 'Out for Delivery'
  | 'Delivered'
  | 'Returned'
  | 'Refunded'
  // Legacy aliases for backwards compatibility
  | 'Payment Under Review'
  | 'Payment Confirmed'
  | 'Processing'
  | 'Completed';

export type PaymentStatus =
  | 'Awaiting Payment'
  | 'Payment Submitted'
  | 'Under Verification'
  | 'Paid'
  | 'Payment Rejected'
  | 'Cancelled'
  | 'Pending Payment'
  | 'Pending Verification'
  | 'Partially Paid'
  | 'Failed'
  | 'Refunded'
  | 'Partially Refunded'
  // Legacy aliases
  | 'Pending Review'
  | 'Approved'
  | 'Rejected';

export type PaymentMethod =
  | 'MTN Mobile Money'
  | 'MTN Merchant Code'
  | 'Airtel Money'
  | 'Bank Transfer'
  | 'Cash on Delivery';

export type ProductStatus = 'Available' | 'Out of Stock' | 'Hidden' | 'Archived';

export type AdminRole =
  | 'owner'
  | 'administrator'
  | 'product_manager'
  | 'shop_manager'
  | 'order_manager'
  | 'customer_support';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  active: boolean;
  lastLogin?: string;
  phone?: string;
}

export interface ProductVariation {
  name: string; // e.g. "Size", "Color", "Model"
  options: string[]; // e.g. ["S", "M", "L", "XL"]
}

export interface Product {
  id: string;
  name: string;
  sku?: string;
  description: string;
  price: number; // in RWF (Customer selling price)
  costPrice?: number; // Supplier cost price in RWF
  commissionRate?: number; // Commission percentage for ContactReach (e.g. 10 for 10%)
  supplierId?: string;
  supplierName?: string;
  approvalStatus?: 'approved' | 'pending' | 'rejected';
  discountPercent?: number; // Discount in percentage (e.g. 15 for 15% OFF)
  discountPrice?: number; // Calculated discounted price in RWF
  promoStartDate?: string;
  promoEndDate?: string;
  category: string;
  subcategory?: string;
  stock: number;
  imageUrl: string;
  images?: string[];
  videoUrl?: string; // YouTube video link or embed URL
  shopName?: string;
  shopId?: string;
  receiverName?: string;
  paymentMethods?: PaymentMethod[];
  merchantCode?: string;
  receiverPhone?: string;
  location?: string;
  deliveryInfo?: string;
  status: ProductStatus;
  isFeatured?: boolean;
  isNewArrival?: boolean;
  isBestSeller?: boolean;
  brand?: string;
  variations?: ProductVariation[];
  rating?: number;
  reviewsCount?: number;
  unit?: string;
  // CJ Dropshipping & Supplier Cost Automation & Google Drive
  source?: 'local' | 'cjdropshipping' | 'googledrive';
  cjProductId?: string;
  cjProductSku?: string;
  cjOriginalCostUsd?: number;
  costOverriddenByAdmin?: boolean; // Admin can update product cost
  profitMargin?: number; // Calculated profit margin in RWF
  cjLastSyncAt?: string;
  reviewStatus?: 'Pending Approval' | 'Approved' | 'Rejected';
  createdAt: string;
  updatedAt?: string;
  lastVerifiedAt?: string;
  history?: { timestamp: string; action: string; user?: string }[];
}

export interface Category {
  id: string;
  nameEn: string;
  nameRw: string;
  icon: string;
  description?: string;
  imageUrl?: string; // Custom category image URL set by admin or uploaded
  subcategories?: string[];
  isActive?: boolean;
  order?: number;
  itemCount?: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedVariation?: { [key: string]: string };
}

export interface OrderItem {
  productId: string;
  productName: string;
  price: number;
  costPrice?: number;
  supplierName?: string;
  quantity: number;
  imageUrl: string;
  variation?: string;
  sku?: string;
}

export interface Order {
  id: string;
  orderNumber: string; // e.g. CRM-78291
  trackingToken?: string; // Secure unguessable token for tracking
  createdAt: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  deliveryType?: 'delivery' | 'pickup';
  deliveryLocation: string; // e.g. 'Gasabo' or 'Outside Kigali (Upcountry)'
  deliveryAddress: string;
  deliveryNotes?: string;
  items: OrderItem[];
  subtotal: number;
  discountAmount?: number;
  couponCode?: string;
  deliveryFee: number;
  totalAmount: number;
  // Commission & Supplier Payout calculations
  commissionRate?: number; // e.g. 10%
  commissionEarned?: number; // Net earned by ContactReach Media
  supplierPayoutAmount?: number; // Net owed to supplier (subtotal - commission)
  supplierPayoutStatus?: 'Pending' | 'Processing' | 'Paid';
  supplierFulfillmentStatus?: 'Pending' | 'Confirmed' | 'Dispatched' | 'Delivered';
  supplierPayoutRef?: string;
  paymentMethod: PaymentMethod;
  receiverName: string;
  receiverDetails: string; // phone number or merchant code
  shopName?: string;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  stockDeducted: boolean;
  paymentConfirmation?: PaymentConfirmation;
  assignedCourier?: string;
  courierPhone?: string;
  internalNotes?: string;
  userId?: string;
  // CJ Dropshipping Fulfillment Approval
  cjFulfillmentStatus?: 'Pending Admin Approval' | 'Approved for CJ Fulfillment' | 'Fulfilled' | 'Not Applicable';
  cjFulfillmentApprovedAt?: string;
  cjFulfillmentApprovedBy?: string;
  cjTrackingNumber?: string;
  statusHistory: {
    status: OrderStatus;
    paymentStatus?: PaymentStatus;
    timestamp: string;
    note?: string;
    updatedBy?: string;
  }[];
}

export interface PaymentConfirmation {
  id: string;
  orderNumber: string;
  orderId: string;
  customerName: string;
  paymentPhone: string;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  transactionId: string;
  screenshotUrl?: string;
  confirmationMessage?: string; // Pasted SMS or text confirmation message
  submittedAt: string;
  verifiedAt?: string;
  verifiedBy?: string;
  verificationStatus:
    | 'Pending Verification'
    | 'Under Verification'
    | 'Verified/Paid'
    | 'Approved'
    | 'Rejected'
    | 'Pending Review';
  adminNotes?: string;
  isDuplicateTxn?: boolean;
  duplicateOrderNumbers?: string[];
  flaggedSuspicious?: boolean;
  suspiciousReason?: string;
  customerNotified?: boolean;
  notificationMessage?: string;
}

export interface PaymentMethodConfig {
  id: string;
  name: string;
  type: PaymentMethod;
  receiverName: string;
  receiverAccount: string;
  instructions: string;
  isActive: boolean;
  acceptedShops?: string[];
}

export interface KigaliDeliveryArea {
  id: string;
  name: string;
  fee: number;
  estimatedTime: string;
}

export interface AppSettings {
  companyName: string;
  marketName: string;
  slogan: string;
  phone: string;
  email: string;
  address: string;
  receiverName: string;
  paymentNumber: string;
  merchantCode: string;
  mtnUssdPattern: string;
  airtelUssdPattern: string;
  whatsAppNumber: string;
  socials: {
    tiktok: string;
    instagram: string;
    youtube: string;
    facebook: string;
  };
  deliveryFeeKigali: number;
  deliveryFeeUpcountry: number;
  pickupAddress?: string;
  kigaliAreas: KigaliDeliveryArea[];
  freeDeliveryThreshold: number;
  outsideKigaliNotice: string;
  // Maintenance Mode Configuration
  isMaintenanceMode?: boolean;
  maintenanceTitle?: string;
  maintenanceMessage?: string;
  maintenanceEstimatedTime?: string;
  maintenanceUpdatedAt?: string;
  // CJ Dropshipping & Automation
  cjConfig?: CjDropshippingConfig;
  // Google Drive & Cloud Backup
  driveBackupStatus?: GoogleDriveBackupStatus;
}

export interface CjDropshippingConfig {
  apiKey?: string;
  hasApiKey?: boolean;
  email?: string;
  autoUploadEnabled: boolean; // Auto product upload
  syncFrequency: 'hourly' | 'daily' | 'manual';
  defaultMarkupPercent: number; // e.g. 35% markup over supplier cost
  usdToRwfRate: number; // e.g. 1420 RWF per USD
  autoPublish: boolean; // Available immediately vs Hidden/Draft
  requireAdminApproval?: boolean; // Review queue before publishing to live store
  selectedCategories: string[];
  lastSyncAt?: string;
  lastSyncStats?: {
    uploadedCount: number;
    updatedCount: number;
    totalCjProducts: number;
    timestamp: string;
    status: 'success' | 'failed' | 'idle';
    message?: string;
  };
}

export interface GoogleDriveBackupStatus {
  lastBackupAt?: string;
  fileId?: string;
  fileName?: string;
  webViewLink?: string;
  fileSize?: number;
  productCount?: number;
  autoSyncEnabled?: boolean;
  status: 'idle' | 'syncing' | 'success' | 'failed';
  message?: string;
}

export interface VendorShop {
  id: string;
  name: string;
  category: string;
  description: string;
  location: string;
  address?: string;
  phone?: string;
  email?: string;
  contactPerson?: string;
  commissionRate?: number; // Default agreed commission e.g. 10%
  payoutMethod?: PaymentMethod;
  payoutAccount?: string; // MTN MoMo / Airtel / Bank account for payouts
  payoutReceiverName?: string;
  totalSales?: number;
  totalPayoutsPaid?: number;
  pendingPayout?: number;
  logo: string;
  bannerColor: string;
  isVerified: boolean;
  isRecommended?: boolean;
  followersCount: number;
  deliveryInfo?: string;
  isActive?: boolean;
  createdAt?: string;
}

export interface CustomerUser {
  id: string;
  name: string;
  phone: string;
  email?: string;
  deliveryAddress?: string;
  createdAt: string;
  totalOrders: number;
  totalSpent: number;
  wishlist?: string[];
  notes?: string;
  status?: 'Active' | 'Suspended';
  lastLogin?: string;
  accountType?: 'buyer' | 'guest';
  passwordHash?: string; // Legacy hashed password; never exposed in public client views
  isRegisteredBuyer?: boolean;
  hasPassword?: boolean;
  photoURL?: string;
  googleUid?: string;
  authProvider?: 'google';
}

export interface AdminMessage {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  orderNumber?: string;
  createdAt: string;
  status: 'unread' | 'read' | 'replied' | 'archived';
  replyNote?: string;
  repliedAt?: string;
  repliedBy?: string;
}

export type ProblemCategory =
  | 'payment_issue'
  | 'delivery_delay'
  | 'missing_item'
  | 'damaged_item'
  | 'refund_request'
  | 'account_issue'
  | 'other';

export type ProblemStatus =
  | 'New'
  | 'Under Review'
  | 'Assigned'
  | 'In Progress'
  | 'Awaiting Customer'
  | 'Resolved'
  | 'Closed';

export type ProblemPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface CustomerProblemReport {
  id: string;
  caseNumber: string; // e.g. CASE-10492
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  orderNumber?: string;
  category: ProblemCategory;
  description: string;
  priority: ProblemPriority;
  status: ProblemStatus;
  assignedTo?: string;
  privateNotes?: {
    timestamp: string;
    note: string;
    author: string;
  }[];
  resolution?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Coupon {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderAmount?: number;
  maxDiscount?: number;
  expiresAt?: string;
  usageLimit?: number;
  timesUsed: number;
  isActive: boolean;
}

export interface InventoryLog {
  id: string;
  productId: string;
  productName: string;
  previousStock: number;
  newStock: number;
  changeAmount: number;
  reason: string;
  adminName: string;
  timestamp: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  adminName: string;
  adminRole: string;
  action: string;
  details: string;
  entityType?: string;
  entityId?: string;
}

export interface ProductReview {
  id: string;
  productId: string;
  customerName: string;
  customerPhone?: string;
  rating: number;
  comment: string;
  verifiedPurchase: boolean;
  status: 'approved' | 'pending' | 'hidden';
  createdAt: string;
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
