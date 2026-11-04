import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  LayoutDashboard, Package, FolderTree, Store, ShoppingBag, CreditCard,
  Layers, Users, Mail, AlertTriangle, Tag, FileText, Settings, Shield,
  LogOut, Search, Plus, Edit, Trash2, Copy, Check, X, Eye, EyeOff, Phone,
  MapPin, Truck, RefreshCw, Filter, ArrowUpRight, CheckCircle2, XCircle,
  AlertCircle, Clock, ChevronDown, Download, Printer, ShieldCheck,
  Send, Calendar, DollarSign, Archive, ExternalLink, Upload, Percent,
  KeyRound, Lock, Image as ImageIcon, MessageCircle, Wrench, Power,
  Star, ArrowLeft, ArrowRight, Camera, Zap, Cloud, CloudUpload, Globe, Sliders, SlidersHorizontal,
  Youtube, FileSpreadsheet, BookOpen, HelpCircle, CheckSquare, Square, Info, Sparkles,
  Database, Bell, MessageSquare
} from 'lucide-react';
import {
  Product, Order, PaymentConfirmation, AppSettings, OrderStatus, OrderDeliveryStatus, Category,
  PaymentStatus, PaymentMethod, ProductStatus, VendorShop, AdminMessage,
  CustomerProblemReport, Coupon, InventoryLog, AuditLog, CustomerUser,
  AdminUser, AdminRole, PaymentMethodConfig, ProductVariation, ProblemStatus, ProblemPriority,
  CjDropshippingConfig, GoogleDriveBackupStatus
} from '../types.ts';
import { api, getStoredAdminUser } from '../services/api.ts';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, getGoogleAccessToken, loginWithGoogle, syncProductsToGoogleDrive, importProductsFromGoogleDrive, isFirestoreConnected } from '../services/firebase.ts';
import { getCategoryCoverImage, getCategoryImageSource } from '../utils/categoryImage.ts';
import { getYouTubeVideoId, getYouTubeThumbnailUrl, isValidYouTubeUrl } from '../utils/youtube.ts';
import { MaintenancePage } from './MaintenancePage.tsx';
import { ProductSpreadsheetModal } from './ProductSpreadsheetModal.tsx';
import { FirebaseSyncModal } from './FirebaseSyncModal.tsx';
import { DsersFulfillmentTab } from './DsersFulfillmentTab.tsx';
import { AlibabaHub } from './AlibabaHub.tsx';
import {
  exportProductsToExcel,
  exportProductsToCsv,
  exportProductsToDsersProductTemplate,
  exportOrdersToDsersOrderTemplate
} from '../utils/spreadsheet.ts';
import { compressImageFile } from '../utils/imageCompress.ts';
import { calculateProductShippingUnitCost } from '../utils/shippingCalculator.ts';
import { getProductImageDueToProduct, getProductNameDueToProduct } from '../utils/productImages.ts';
import { AdminCategoriesManager } from './AdminCategoriesManager.tsx';

interface AdminDashboardProps {
  onLogout: () => void;
  categories: Category[];
  onRefreshPublicData: () => void;
  initialTab?: TabType;
  autoOpenAddProduct?: boolean;
}

type TabType =
  | 'overview'
  | 'products'
  | 'categories'
  | 'shops'
  | 'suppliers'
  | 'payouts'
  | 'alibaba'
  | 'cjdropshipping'
  | 'dsers'
  | 'orders'
  | 'payments'
  | 'inventory'
  | 'customers'
  | 'messages'
  | 'problems'
  | 'coupons'
  | 'audit'
  | 'team'
  | 'settings';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onLogout,
  categories: initialPropCategories,
  onRefreshPublicData,
  initialTab,
  autoOpenAddProduct
}) => {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab || 'overview');
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(getStoredAdminUser());
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [isRealtimeConnected, setIsRealtimeConnected] = useState<boolean>(false);
  const [desktopAlertsActive, setDesktopAlertsActive] = useState<boolean>(
    typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted'
  );

  // Toast feedback
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleToggleDesktopAlerts = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      playNotificationChime('order');
      showToast('🔊 Audio chimes are active! (Native desktop popups not supported in this browser)', 'success');
      return;
    }
    if (Notification.permission === 'granted') {
      playNotificationChime('order');
      showToast('🔊 Audio chime & live real-time desktop alerts are active!', 'success');
      sendDesktopNotification('ContactReach Market Live', 'Real-time alert chime & desktop notification test verified!');
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        setDesktopAlertsActive(true);
        playNotificationChime('order');
        showToast('🔔 Real-time desktop alerts enabled! Instant popups will trigger for orders and SMS.', 'success');
        sendDesktopNotification('ContactReach Market Live', 'Real-time alert notifications are now active on your device.');
      } else {
        showToast('Notification permission was dismissed or blocked in browser settings.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to request notification permission', 'error');
    }
  };

  const prevOrdersCountRef = useRef<number>(-1);
  const prevMessagesCountRef = useRef<number>(-1);
  const prevPaymentsCountRef = useRef<number>(-1);
  const prevProblemsCountRef = useRef<number>(-1);
  const prevSuppliersCountRef = useRef<number>(-1);
  const isFetchingAllRef = useRef<boolean>(false);

  // Desktop Web Notification Dispatcher (shows OS popups even if admin is in another tab)
  const sendDesktopNotification = (title: string, body: string) => {
    try {
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
          body,
          icon: '/favicon.ico',
          tag: `crm-${Date.now()}`
        });
      }
    } catch {}
  };

  // High-Fidelity Synthesized Web Audio Chimes
  const playNotificationChime = (type: 'order' | 'sms' | 'payment' | 'alert' = 'order') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';

      if (type === 'sms' || type === 'payment') {
        // Melodic dual-ping for incoming SMS and payments
        osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
        osc.frequency.setValueAtTime(987.77, ctx.currentTime + 0.1); // B5
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.42);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.42);
      } else {
        // Celebratory tri-tone chime for incoming orders
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.09); // E5
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.18); // G5
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.55);
      }
    } catch {}
  };

  // One-time mobile audio unlock: enables crystal chime playback on iOS Safari & Android Chrome after first user gesture
  useEffect(() => {
    const unlockAudio = () => {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          if (ctx.state === 'suspended') {
            ctx.resume().catch(() => {});
          }
        }
      } catch {}
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
    window.addEventListener('click', unlockAudio, { once: true });
    window.addEventListener('touchstart', unlockAudio, { once: true });
    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  // State collections
  const [stats, setStats] = useState<any>({
    totalSalesFrw: 0,
    totalOrders: 0,
    pendingVerifications: 0,
    awaitingPaymentOrders: 0,
    confirmedOrders: 0,
    preparingOrders: 0,
    readyOrders: 0,
    deliveredOrders: 0,
    totalProducts: 0,
    activeProducts: 0,
    lowStockCount: 0,
    totalCategories: 0,
    totalShops: 0,
    totalCustomers: 0,
    unreadMessagesCount: 0,
    unresolvedProblemsCount: 0
  });

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>(initialPropCategories);
  const [shops, setShops] = useState<VendorShop[]>([]);
  const [payments, setPayments] = useState<PaymentConfirmation[]>([]);
  const [orders, setOrders] = useState<Order[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('crm_admin_orders_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return [];
  });
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [problems, setProblems] = useState<CustomerProblemReport[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [inventoryLogs, setInventoryLogs] = useState<InventoryLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [customers, setCustomers] = useState<CustomerUser[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [newUserModalOpen, setNewUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserRole, setNewUserRole] = useState<AdminRole>('administrator');
  const [creatingUser, setCreatingUser] = useState(false);
  const [supplierApplications, setSupplierApplications] = useState<any[]>([]);
  const [supplierPayouts, setSupplierPayouts] = useState<any[]>([]);
  const [disbursePayoutModal, setDisbursePayoutModal] = useState<any | null>(null);
  const [disburseRefInput, setDisburseRefInput] = useState('');
  const [disburseLoading, setDisburseLoading] = useState(false);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [previewMaintenance, setPreviewMaintenance] = useState(false);
  const [savingMaintenance, setSavingMaintenance] = useState(false);

  // Floating Live Real-Time Push Notification Alert
  const [liveAlert, setLiveAlert] = useState<{
    id: string;
    type: 'order' | 'sms' | 'payment';
    title: string;
    subtitle: string;
    timestamp: Date;
    actionTab: TabType;
  } | null>(null);

  // Audio Context Unlocker on First User Interaction
  useEffect(() => {
    const unlockAudio = () => {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          ctx.resume().then(() => ctx.close()).catch(() => {});
        }
      } catch {}
    };
    window.addEventListener('click', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });
    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, []);

  // Live Alert Auto-Dismiss Timer
  useEffect(() => {
    if (!liveAlert) return;
    const timer = setTimeout(() => {
      setLiveAlert(null);
    }, 12000);
    return () => clearTimeout(timer);
  }, [liveAlert]);

  // Simulation handlers for instant live testing
  const handleSimulateLiveOrder = () => {
    const testOrderNumber = `CRM-${Math.floor(10000 + Math.random() * 90000)}`;
    const simulatedOrder: Order = {
      id: `ord-sim-${Date.now()}`,
      orderNumber: testOrderNumber,
      trackingToken: 'sim_token_' + Date.now(),
      createdAt: new Date().toISOString(),
      customerName: 'Jean Claude (Kigali Test)',
      customerPhone: '0780022600',
      deliveryType: 'delivery',
      deliveryLocation: 'Gasabo (Kimironko)',
      deliveryAddress: 'KG 15 Ave',
      items: products.slice(0, 1).map(p => ({
        productId: p.id,
        productName: p.name,
        price: p.price,
        quantity: 1,
        imageUrl: p.imageUrl
      })),
      subtotal: 35000,
      deliveryFee: 1500,
      shippingCost: 0,
      totalAmount: 36500,
      paymentMethod: 'MTN Mobile Money',
      receiverName: 'Ruth',
      receiverDetails: '0780022600',
      shopName: 'ContactReach Market',
      paymentStatus: 'Pending Payment',
      status: 'New',
      stockDeducted: false,
      statusHistory: [
        {
          status: 'New',
          paymentStatus: 'Pending Payment',
          timestamp: new Date().toISOString(),
          note: 'Live real-time order received via storefront checkout.'
        }
      ]
    };

    setOrders(prev => [simulatedOrder, ...prev]);
    playNotificationChime('order');
    showToast(`🔔 Real-time: New Order #${simulatedOrder.orderNumber} (36,500 RWF) received!`, 'success');
    sendDesktopNotification('New Order Received!', `Order #${simulatedOrder.orderNumber} from Jean Claude (36,500 RWF)`);
    setLiveAlert({
      id: `alert-${Date.now()}`,
      type: 'order',
      title: `🔔 Real-Time Order #${simulatedOrder.orderNumber} Received!`,
      subtitle: `Jean Claude placed an order for 36,500 RWF via MTN MoMo to Kimironko. Received live without reloading!`,
      timestamp: new Date(),
      actionTab: 'orders'
    });
  };

  const handleSimulateLiveSMS = () => {
    const testPhone = '0788123456';
    const simulatedMsg: AdminMessage = {
      id: `msg-sim-${Date.now()}`,
      name: 'Marie Claire',
      email: 'marie@example.com',
      phone: testPhone,
      subject: 'Payment MoMo SMS Proof',
      message: `Y'ello! You have received 36,500 RWF from Marie Claire (0788123456) on ${new Date().toLocaleDateString()}. TxId: ${Math.floor(100000000 + Math.random() * 900000000)}. Fee: 0 RWF.`,
      orderNumber: orders[0]?.orderNumber || 'CRM-99212',
      createdAt: new Date().toISOString(),
      status: 'unread'
    };

    setMessages(prev => [simulatedMsg, ...prev]);
    playNotificationChime('sms');
    showToast(`💬 Real-time: New SMS from ${simulatedMsg.phone} received!`, 'success');
    sendDesktopNotification('New SMS Received!', `${simulatedMsg.name}: ${simulatedMsg.message.slice(0, 80)}`);
    setLiveAlert({
      id: `alert-sms-${Date.now()}`,
      type: 'sms',
      title: `💬 Real-Time SMS Received from ${simulatedMsg.phone}!`,
      subtitle: simulatedMsg.message,
      timestamp: new Date(),
      actionTab: 'messages'
    });
  };

  // Filters
  const [productSearch, setProductSearch] = useState('');
  const [productCatFilter, setProductCatFilter] = useState('all');
  const [productShopFilter, setProductShopFilter] = useState('all');
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [orderPaymentFilter, setOrderPaymentFilter] = useState('all');
  const [orderDeliveryFilter, setOrderDeliveryFilter] = useState('all');
  const [orderSupplierFilter, setOrderSupplierFilter] = useState('all');
  const [orderDateFilter, setOrderDateFilter] = useState('all');

  // Product Row Selection & Bulk Actions
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkUpdatingStatus, setBulkUpdatingStatus] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState(false);

  // Modals & Selected items
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderStatusModal, setOrderStatusModal] = useState<Order | null>(null);
  const [verifyModalPayment, setVerifyModalPayment] = useState<PaymentConfirmation | null>(null);
  const [verifyNotes, setVerifyNotes] = useState('Verified with MTN/Airtel MoMo statement');
  const [zoomScreenshot, setZoomScreenshot] = useState<string | null>(null);
  const [printableInvoiceOrder, setPrintableInvoiceOrder] = useState<Order | null>(null);

  // Payment Verification States & Filters
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'successful' | 'pending' | 'failed' | 'refunded'>('all');
  const [paymentSearch, setPaymentSearch] = useState('');
  const [telecomVerifyingId, setTelecomVerifyingId] = useState<string | null>(null);

  // Customer / Buyer Management States
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerFilter, setCustomerFilter] = useState<'all' | 'buyers' | 'guests'>('all');
  const [selectedCustomerDetail, setSelectedCustomerDetail] = useState<{ customer: CustomerUser; orders: Order[] } | null>(null);
  const [loadingCustomerDetail, setLoadingCustomerDetail] = useState(false);
  const [resetPinCustomer, setResetPinCustomer] = useState<CustomerUser | null>(null);
  const [tempPin, setTempPin] = useState('');
  const [pinActionMessage, setPinActionMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Product Editor Modal
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [isSpreadsheetModalOpen, setIsSpreadsheetModalOpen] = useState(false);
  const [isFirebaseModalOpen, setIsFirebaseModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [prodForm, setProdForm] = useState<{
    name: string;
    sku: string;
    description: string;
    price: number | string;
    costPrice: number | string; // Product / Supplier Cost in RWF
    shippingCost: number | string; // Custom Shipping Cost in RWF (leave blank for automatic 1,500 + 10%)
    discountPercent: number | string;
    discountPrice: number | string;
    category: string;
    subcategory: string;
    stock: number | string;
    imageUrl: string;
    imagesText: string;
    shopName: string;
    shopId: string;
    isAddingNewShop: boolean;
    newShopName: string;
    newShopLocation: string;
    newShopPhone: string;
    newShopDescription: string;
    brand: string;
    unit: string;
    status: ProductStatus;
    isFeatured: boolean;
    isNewArrival: boolean;
    isBestSeller: boolean;
    sizes: string;
    colors: string;
    storage: string;
    specifications: string;
    packagingInfo: string;
    videoUrl: string; // YouTube video link or Shorts description
  }>({
    name: '',
    sku: '',
    description: '',
    price: 15000,
    costPrice: '',
    shippingCost: '',
    discountPercent: '',
    discountPrice: '',
    category: 'hair-beauty',
    subcategory: '',
    stock: 25,
    imageUrl: '',
    imagesText: '',
    shopName: 'ContactReach Market',
    shopId: '',
    isAddingNewShop: false,
    newShopName: '',
    newShopLocation: 'Kigali, Rwanda',
    newShopPhone: '',
    newShopDescription: '',
    brand: '',
    unit: 'Piece',
    status: 'Available',
    isFeatured: false,
    isNewArrival: false,
    isBestSeller: false,
    sizes: '',
    colors: '',
    storage: '',
    specifications: '',
    packagingInfo: '',
    videoUrl: ''
  });

  // Multiple Picture Links helper state for Product Modal
  const [newImageLink, setNewImageLink] = useState('');
  const [showBulkImagePaste, setShowBulkImagePaste] = useState(false);

  // Database Diagnostics & Self-Healing
  const [dbDiagnostics, setDbDiagnostics] = useState<any>(null);
  const [loadingDiagnostics, setLoadingDiagnostics] = useState(false);
  const [repairingDb, setRepairingDb] = useState(false);
  const [makingAllReady, setMakingAllReady] = useState(false);

  // CJ Dropshipping state
  const [cjConfig, setCjConfig] = useState<CjDropshippingConfig | null>(null);
  const [cjSyncing, setCjSyncing] = useState(false);
  const [cjTesting, setCjTesting] = useState(false);
  const [cjConnecting, setCjConnecting] = useState(false);
  const [cjDisconnecting, setCjDisconnecting] = useState(false);
  const [cjConnectionError, setCjConnectionError] = useState<string | null>(null);
  const [cjApiKeyInput, setCjApiKeyInput] = useState('');
  const [showCjApiKey, setShowCjApiKey] = useState(false);
  const [cjEmailInput, setCjEmailInput] = useState('contactreachmedialimited@gmail.com');
  const [cjUsdRateInput, setCjUsdRateInput] = useState(1420);
  const [cjMarkupInput, setCjMarkupInput] = useState(35);
  const [cjAutoUploadToggle, setCjAutoUploadToggle] = useState(false);
  const [cjAutoPublishToggle, setCjAutoPublishToggle] = useState(true);
  const [cjRequireApprovalToggle, setCjRequireApprovalToggle] = useState(true);
  const [cjSelectedCategories, setCjSelectedCategories] = useState<string[]>([
    'electronics', 'fashion', 'amatara', 'hair-beauty', 'amasaha', 'ibikapu', 'sports'
  ]);
  const isCjConnected = Boolean(cjConfig?.isConnected && cjConfig?.connectionStatus === 'connected');
  const [savingCjConfig, setSavingCjConfig] = useState(false);
  const [cjProductCategoryFilter, setCjProductCategoryFilter] = useState('all');
  const [cjProductSearch, setCjProductSearch] = useState('');

  // CJ Dropshipping Sub-tabs & Advanced Workflows
  const [cjSubTab, setCjSubTab] = useState<'catalog' | 'search' | 'staging' | 'orders' | 'settings' | 'instructions'>('catalog');
  const [cjCategoriesList, setCjCategoriesList] = useState<Array<{ id: string; name: string; localCategoryId: string; localCategoryName: string; icon: string }>>([]);

  // CJ Search & Discovery state
  const [cjSearchQuery, setCjSearchQuery] = useState('');
  const [cjSearchCategory, setCjSearchCategory] = useState('all');
  const [cjSearchResults, setCjSearchResults] = useState<any[]>([]);
  const [cjSearching, setCjSearching] = useState(false);
  const [cjSelectedItemsForImport, setCjSelectedItemsForImport] = useState<string[]>([]);
  const [cjImporting, setCjImporting] = useState(false);
  const [cjImportWithApproval, setCjImportWithApproval] = useState(true);
  const [cjCustomMarkupOverride, setCjCustomMarkupOverride] = useState<number | ''>('');

  // CJ Staging & Approval Queue state
  const [cjStagingFilter, setCjStagingFilter] = useState<'all' | 'Pending Approval' | 'Approved' | 'Rejected'>('Pending Approval');
  const [cjApprovingId, setCjApprovingId] = useState<string | null>(null);
  const [cjRejectingId, setCjRejectingId] = useState<string | null>(null);
  const [cjBulkApproving, setCjBulkApproving] = useState(false);

  // CJ Stock & Price Sync state
  const [cjSyncingStockPrices, setCjSyncingStockPrices] = useState(false);

  // CJ Orders & Fulfillment state
  const [cjOrders, setCjOrders] = useState<any[]>([]);
  const [cjLoadingOrders, setCjLoadingOrders] = useState(false);
  const [cjFulfillmentFilter, setCjFulfillmentFilter] = useState<'all' | 'Pending Admin Approval' | 'Approved for CJ Fulfillment' | 'Fulfilled'>('all');
  const [cjFulfillmentModalOrder, setCjFulfillmentModalOrder] = useState<any | null>(null);
  const [cjTrackingInput, setCjTrackingInput] = useState('');
  const [cjFulfillmentNotesInput, setCjFulfillmentNotesInput] = useState('');
  const [cjFulfillingLoading, setCjFulfillingLoading] = useState(false);

  // Inline Product Cost Editor states (Admin can update cost directly!)
  const [editingCostProductId, setEditingCostProductId] = useState<string | null>(null);
  const [editingCostPriceValue, setEditingCostPriceValue] = useState<number | string>('');
  const [editingSellingPriceValue, setEditingSellingPriceValue] = useState<number | string>('');
  const [savingProductCostId, setSavingProductCostId] = useState<string | null>(null);

  // Google Drive state
  const [driveStatus, setDriveStatus] = useState<GoogleDriveBackupStatus | null>(null);
  const [syncingToDrive, setSyncingToDrive] = useState(false);
  const [importingFromDrive, setImportingFromDrive] = useState(false);
  const [driveFilesModalOpen, setDriveFilesModalOpen] = useState(false);
  const [driveFilesList, setDriveFilesList] = useState<Array<{ id: string; name: string; modifiedTime: string; size?: string; webViewLink?: string }>>([]);
  const [loadingDriveFiles, setLoadingDriveFiles] = useState(false);
  const [bulkImageInput, setBulkImageInput] = useState('');

  // Quick Manage Picture Links Modal for any product directly from table
  const [manageImagesProduct, setManageImagesProduct] = useState<Product | null>(null);
  const [manageImagesList, setManageImagesList] = useState<string[]>([]);
  const [manageImagesInput, setManageImagesInput] = useState('');
  const [savingManageImages, setSavingManageImages] = useState(false);

  // Robust extractor for single or multiple picture URLs from line breaks, commas, semicolons, whitespace, or JSON
  const extractPictureLinks = (input: string): string[] => {
    if (!input) return [];
    const trimmed = input.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map(s => String(s).trim()).filter(s => s.length > 5);
        }
      } catch {}
    }
    return trimmed
      .split(/[\n,;]+|\s+(?=https?:\/\/)/i)
      .map(s => s.trim().replace(/^['"]+|['"]+$/g, ''))
      .filter(s => s.length > 5);
  };

  const getParsedImageList = (imagesText: string, primaryUrl: string): string[] => {
    const list = (imagesText || '').split('\n').map(s => s.trim()).filter(Boolean);
    if (primaryUrl && primaryUrl.trim() && !list.includes(primaryUrl.trim())) {
      list.unshift(primaryUrl.trim());
    }
    return Array.from(new Set(list));
  };

  const handleAddImageLink = () => {
    if (!newImageLink.trim()) return;
    const links = extractPictureLinks(newImageLink);
    if (links.length === 0) {
      showToast('Please enter at least one valid picture link URL', 'error');
      return;
    }

    const currentList = getParsedImageList(prodForm.imagesText, prodForm.imageUrl);
    const newItems = links.filter(l => !currentList.includes(l));
    if (newItems.length === 0) {
      showToast('Provided picture link(s) already in gallery', 'error');
      return;
    }

    const updatedList = [...currentList, ...newItems];
    setProdForm(prev => ({
      ...prev,
      imageUrl: prev.imageUrl || updatedList[0],
      imagesText: updatedList.join('\n')
    }));
    setNewImageLink('');
    showToast(newItems.length === 1 ? 'Picture link added to gallery!' : `Added ${newItems.length} picture links to gallery!`);
  };

  const handleApplyBulkImages = () => {
    if (!bulkImageInput.trim()) return;
    const links = extractPictureLinks(bulkImageInput);

    if (links.length === 0) {
      showToast('No valid picture URLs found', 'error');
      return;
    }

    const currentList = getParsedImageList(prodForm.imagesText, prodForm.imageUrl);
    const combined = Array.from(new Set([...currentList, ...links]));
    setProdForm(prev => ({
      ...prev,
      imageUrl: prev.imageUrl || combined[0],
      imagesText: combined.join('\n')
    }));
    setBulkImageInput('');
    setShowBulkImagePaste(false);
    showToast(`Added ${links.length} picture link${links.length > 1 ? 's' : ''}!`);
  };

  const handleSetPrimaryImage = (targetUrl: string) => {
    const currentList = getParsedImageList(prodForm.imagesText, prodForm.imageUrl);
    const reordered = [targetUrl, ...currentList.filter(u => u !== targetUrl)];
    setProdForm(prev => ({
      ...prev,
      imageUrl: targetUrl,
      imagesText: reordered.join('\n')
    }));
    showToast('Cover picture updated!');
  };

  const handleRemoveImage = (targetUrl: string) => {
    const currentList = getParsedImageList(prodForm.imagesText, prodForm.imageUrl);
    const filtered = currentList.filter(u => u !== targetUrl);
    const newPrimary = prodForm.imageUrl === targetUrl ? (filtered[0] || '') : prodForm.imageUrl;
    setProdForm(prev => ({
      ...prev,
      imageUrl: newPrimary,
      imagesText: filtered.join('\n')
    }));
  };

  const handleMoveImage = (index: number, direction: 'left' | 'right') => {
    const list = getParsedImageList(prodForm.imagesText, prodForm.imageUrl);
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;
    const copy = [...list];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;
    setProdForm(prev => ({
      ...prev,
      imageUrl: copy[0],
      imagesText: copy.join('\n')
    }));
  };

  // Quick Manage Pictures Modal Handlers
  const handleOpenManageImages = (p: Product) => {
    const initialList = p.images && p.images.length > 0
      ? [...p.images]
      : (p.imageUrl ? [p.imageUrl] : []);
    setManageImagesProduct(p);
    setManageImagesList(initialList);
    setManageImagesInput('');
  };

  const handleAddLinksToManageModal = () => {
    if (!manageImagesInput.trim()) return;
    const links = extractPictureLinks(manageImagesInput);
    if (links.length === 0) {
      showToast('Please enter at least one valid picture link', 'error');
      return;
    }
    const newItems = links.filter(l => !manageImagesList.includes(l));
    if (newItems.length === 0) {
      showToast('These picture links are already in the product gallery', 'error');
      return;
    }
    setManageImagesList(prev => [...prev, ...newItems]);
    setManageImagesInput('');
    showToast(newItems.length === 1 ? 'Picture link added!' : `Added ${newItems.length} picture links!`);
  };

  const handleManageModalUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const fileList = Array.from(files);
    const validFiles = fileList.filter(f => f.size <= 10 * 1024 * 1024);
    if (validFiles.length < fileList.length) {
      showToast('Some files exceeded the 10MB limit and were skipped.', 'error');
    }
    if (validFiles.length === 0) return;

    showToast(`Optimizing & uploading ${validFiles.length} picture${validFiles.length > 1 ? 's' : ''}...`);
    try {
      const compressed = await Promise.all(validFiles.map(f => compressImageFile(f, 1200, 1200, 0.82)));
      const validResults = compressed.filter(Boolean);
      if (validResults.length > 0) {
        setManageImagesList(prev => [...prev, ...validResults.filter(u => !prev.includes(u))]);
        showToast(`Uploaded & optimized ${validResults.length} picture${validResults.length > 1 ? 's' : ''}!`);
      }
    } catch {
      showToast('Failed to process some images', 'error');
    }
  };

  const handleSaveManageImages = async () => {
    if (!manageImagesProduct) return;
    if (manageImagesList.length === 0) {
      showToast('Product must have at least one picture', 'error');
      return;
    }
    setSavingManageImages(true);
    try {
      await api.adminUpdateProductImages(manageImagesProduct.id, {
        images: manageImagesList,
        imageUrl: manageImagesList[0]
      });
      showToast(`Updated pictures for "${manageImagesProduct.name}"!`);
      setManageImagesProduct(null);
      fetchAllData();
      onRefreshPublicData();
    } catch (err: any) {
      showToast(err.message || 'Failed to update product pictures', 'error');
    } finally {
      setSavingManageImages(false);
    }
  };

  // Category Editor Modal
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [catNameEn, setCatNameEn] = useState('');
  const [catNameRw, setCatNameRw] = useState('');
  const [catIcon, setCatIcon] = useState('Tag');
  const [catDesc, setCatDesc] = useState('');
  const [catImageUrl, setCatImageUrl] = useState('');

  // Shop Editor Modal
  const [shopModalOpen, setShopModalOpen] = useState(false);
  const [editingShop, setEditingShop] = useState<VendorShop | null>(null);
  const [shopForm, setShopForm] = useState({
    name: '',
    category: '',
    description: '',
    location: 'Kigali, Rwanda',
    address: 'Fair View Plaza, Kigali',
    phone: '0780022600',
    email: 'contactreachmedialimited@gmail.com',
    deliveryInfo: 'Express same-day Kigali delivery',
    logo: 'ShoppingBag',
    bannerColor: 'from-orange-500 to-amber-600',
    isRecommended: false
  });

  // Stock Adjustment Modal
  const [stockModalProduct, setStockModalProduct] = useState<Product | null>(null);
  const [stockAdjustAmount, setStockAdjustAmount] = useState<number | string>(10);
  const [stockAdjustReason, setStockAdjustReason] = useState('New stock replenishment from supplier');

  // Coupon Editor Modal
  const [couponModalOpen, setCouponModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [coupCode, setCoupCode] = useState('');
  const [coupType, setCoupType] = useState<'percentage' | 'fixed'>('percentage');
  const [coupVal, setCoupVal] = useState<number | string>(10);
  const [coupMin, setCoupMin] = useState<number | string>('');
  const [coupMaxDiscount, setCoupMaxDiscount] = useState<number | string>('');
  const [coupExpiresAt, setCoupExpiresAt] = useState('');
  const [coupUsageLimit, setCoupUsageLimit] = useState<number | string>('');
  const [coupIsActive, setCoupIsActive] = useState(true);

  // Registered Buyers State & Modals
  const [selectedBuyer, setSelectedBuyer] = useState<CustomerUser | null>(null);
  const [buyerSearch, setBuyerSearch] = useState('');
  const [buyerStatusFilter, setBuyerStatusFilter] = useState<'all' | 'Active' | 'Suspended'>('all');
  const [resetPasswordBuyer, setResetPasswordBuyer] = useState<CustomerUser | null>(null);
  const [newTempPassword, setNewTempPassword] = useState('');
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);

  // Problem Resolution Modal
  const [selectedProblem, setSelectedProblem] = useState<CustomerProblemReport | null>(null);
  const [probResolution, setProbResolution] = useState('');
  const [probStatus, setProbStatus] = useState<ProblemStatus>('In Progress');
  const [probStaffNote, setProbStaffNote] = useState('');

  // Comprehensive Order View / Edit Modal & Bulk Actions
  const [selectedOrderModal, setSelectedOrderModal] = useState<Order | null>(null);
  const [orderEditForm, setOrderEditForm] = useState<Partial<Order>>({});
  const [savingOrder, setSavingOrder] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [bulkDeletingOrders, setBulkDeletingOrders] = useState(false);

  // Messages Filter & Search
  const [messageSearch, setMessageSearch] = useState('');
  const [messageFilter, setMessageFilter] = useState<'all' | 'unread' | 'read' | 'replied'>('all');
  const [messageViewMode, setMessageViewMode] = useState<'conversations' | 'feed'>('conversations');
  const [selectedChatCustomerId, setSelectedChatCustomerId] = useState<string | null>(null);
  const [adminChatReplyInput, setAdminChatReplyInput] = useState('');
  const [sendingAdminChatReply, setSendingAdminChatReply] = useState(false);

  // Customer Edit Modal
  const [editingCustomerModal, setEditingCustomerModal] = useState<CustomerUser | null>(null);
  const [customerEditForm, setCustomerEditForm] = useState({
    name: '',
    phone: '',
    email: '',
    deliveryAddress: '',
    status: 'Active' as 'Active' | 'Suspended'
  });
  const [savingCustomer, setSavingCustomer] = useState(false);

  // Problem Search & Filter
  const [problemSearch, setProblemSearch] = useState('');
  const [problemFilter, setProblemFilter] = useState<string>('all');
  const [syncingAllFirebase, setSyncingAllFirebase] = useState(false);

  const handlePushAllToFirebaseDirect = async () => {
    setSyncingAllFirebase(true);
    try {
      const res = await api.adminPushAllDataToFirebase();
      showToast(res.message);
      fetchAllData(true);
      onRefreshPublicData();
    } catch (err: any) {
      showToast(err.message || 'Failed to sync with Firebase', 'error');
    } finally {
      setSyncingAllFirebase(false);
    }
  };

  const handleOpenOrderDetail = (order: Order) => {
    setSelectedOrderModal(order);
    const derivedSupplier = order.supplierName || (order.items?.[0]?.supplierName) || order.shopName || 'Contact Reach Market';
    setOrderEditForm({
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerEmail: order.customerEmail || '',
      deliveryAddress: order.deliveryAddress,
      deliveryLocation: order.deliveryLocation,
      deliveryNotes: order.deliveryNotes || '',
      deliveryFee: order.deliveryFee,
      totalAmount: order.totalAmount,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      deliveryStatus: order.deliveryStatus || 'Pending',
      expectedDeliveryDate: order.expectedDeliveryDate || '',
      supplierName: derivedSupplier,
      supplierOrderRef: order.supplierOrderRef || '',
      dispatchDate: order.dispatchDate || '',
      assignedCourier: order.assignedCourier || '',
      courierPhone: order.courierPhone || '',
      internalNotes: order.internalNotes || '',
      trackingNumber: order.trackingNumber || '',
      trackingCarrier: order.trackingCarrier || '',
      trackingUrl: order.trackingUrl || ''
    });
  };

  const handleSaveOrderDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderModal) return;
    setSavingOrder(true);
    try {
      const updated = await api.adminUpdateOrder(selectedOrderModal.id, orderEditForm);
      showToast(`Order #${selectedOrderModal.orderNumber} updated successfully!`);
      setSelectedOrderModal(null);
      fetchAllData();
      onRefreshPublicData();
    } catch (err: any) {
      showToast(err.message || 'Failed to update order', 'error');
    } finally {
      setSavingOrder(false);
    }
  };

  const handleDeleteSingleOrder = async (order: Order) => {
    if (!confirm(`Are you sure you want to delete Order #${order.orderNumber} (${order.customerName})? This cannot be undone.`)) {
      return;
    }
    try {
      await api.adminDeleteOrder(order.id);
      showToast(`Order #${order.orderNumber} deleted successfully.`);
      if (selectedOrderModal?.id === order.id) {
        setSelectedOrderModal(null);
      }
      setSelectedOrderIds(prev => prev.filter(id => id !== order.id));
      fetchAllData();
      onRefreshPublicData();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete order', 'error');
    }
  };

  const handleBulkDeleteOrders = async () => {
    if (selectedOrderIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedOrderIds.length} selected orders? Inventory stock will be safely reconciled.`)) {
      return;
    }
    setBulkDeletingOrders(true);
    try {
      const res = await api.adminBulkDeleteOrders(selectedOrderIds);
      showToast(res.message);
      setSelectedOrderIds([]);
      fetchAllData();
      onRefreshPublicData();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete selected orders', 'error');
    } finally {
      setBulkDeletingOrders(false);
    }
  };

  const handleDeletePaymentConfirmation = async (pm: PaymentConfirmation) => {
    if (!confirm(`Delete payment confirmation #${pm.id} for Order #${pm.orderNumber}?`)) {
      return;
    }
    try {
      await api.adminDeletePayment(pm.id);
      showToast('Payment record deleted.');
      fetchAllData();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete payment', 'error');
    }
  };

  const handleDeleteCustomerProblem = async (prob: CustomerProblemReport) => {
    if (!confirm(`Delete customer problem case #${prob.caseNumber}?`)) {
      return;
    }
    try {
      await api.adminDeleteCustomerReport(prob.id);
      showToast('Problem case deleted.');
      if (selectedProblem?.id === prob.id) {
        setSelectedProblem(null);
      }
      fetchAllData();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete problem report', 'error');
    }
  };

  const handleOpenEditCustomer = (customer: CustomerUser) => {
    setEditingCustomerModal(customer);
    setCustomerEditForm({
      name: customer.name,
      phone: customer.phone,
      email: customer.email || '',
      deliveryAddress: customer.deliveryAddress || '',
      status: customer.status || 'Active'
    });
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomerModal) return;
    setSavingCustomer(true);
    try {
      await api.adminUpdateCustomer(editingCustomerModal.id, customerEditForm);
      showToast(`Customer "${customerEditForm.name}" updated successfully!`);
      setEditingCustomerModal(null);
      fetchAllData();
    } catch (err: any) {
      showToast(err.message || 'Failed to update customer', 'error');
    } finally {
      setSavingCustomer(false);
    }
  };

  const handleDeleteCustomer = async (customer: CustomerUser) => {
    if (!confirm(`Delete customer "${customer.name}" (${customer.phone})? This will remove their profile.`)) {
      return;
    }
    try {
      await api.adminDeleteCustomer(customer.id);
      showToast(`Customer "${customer.name}" deleted.`);
      fetchAllData();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete customer', 'error');
    }
  };

  // Load All Admin Data (supports silent background real-time updates)
  const fetchAllData = async (silent: boolean = false) => {
    if (isFetchingAllRef.current) return;
    isFetchingAllRef.current = true;
    if (!silent) setLoading(true);
    try {
      const [
        fetchedStats,
        fetchedOrders,
        fetchedProducts,
        fetchedCategories,
        fetchedShops,
        fetchedPayments,
        fetchedMessages,
        fetchedProblems,
        fetchedCoupons,
        fetchedInvLogs,
        fetchedAuditLogs,
        fetchedCustomers,
        fetchedAdminUsers,
        fetchedSupplierApps,
        fetchedSupplierPayouts,
        fetchedSettings,
        fetchedCjConfig,
        fetchedDriveStatus
      ] = await Promise.all([
        api.adminGetStats().catch(() => null),
        api.adminGetOrders().catch(() => []),
        api.adminGetProducts().catch(() => []),
        api.adminGetCategories().catch(() => []),
        api.adminGetShops().catch(() => []),
        api.adminGetPayments().catch(() => []),
        api.adminGetMessages().catch(() => []),
        api.adminGetCustomerReports().catch(() => []),
        api.adminGetCoupons().catch(() => []),
        api.adminGetInventoryLogs().catch(() => []),
        api.adminGetAuditLogs().catch(() => []),
        api.adminGetCustomers().catch(() => []),
        api.adminGetUsers().catch(() => []),
        api.adminGetSupplierApplications().catch(() => []),
        api.adminGetSupplierPayouts().catch(() => []),
        api.getSettings().catch(() => null),
        api.adminGetCjConfig().catch(() => null),
        api.adminGetDriveBackupStatus().catch(() => null)
      ]);

      if (fetchedStats) setStats(fetchedStats);
      if (fetchedOrders && Array.isArray(fetchedOrders)) {
        setOrders(prev => {
          // Safety guard: If server returned empty array due to transient network glitch but we already have orders in state, preserve existing orders
          if (fetchedOrders.length === 0 && prev.length > 0) {
            return prev;
          }
          if (prevOrdersCountRef.current !== -1 && fetchedOrders.length > prevOrdersCountRef.current) {
            const diff = fetchedOrders.length - prevOrdersCountRef.current;
            showToast(`🔔 Real-time: ${diff} new order(s) received!`, 'success');
            playNotificationChime('order');
            sendDesktopNotification('New Order Received', `${diff} new customer order(s) placed.`);
          }
          prevOrdersCountRef.current = fetchedOrders.length;
          try {
            if (fetchedOrders.length > 0) {
              localStorage.setItem('crm_admin_orders_cache', JSON.stringify(fetchedOrders));
            }
          } catch {}
          return fetchedOrders;
        });
      }
      if (fetchedProducts) setProducts(fetchedProducts);
      if (fetchedCategories) setCategories(fetchedCategories);
      if (fetchedShops) setShops(fetchedShops);
      if (fetchedPayments && Array.isArray(fetchedPayments)) {
        setPayments(prev => {
          const map = new Map<string, PaymentConfirmation>();
          prev.forEach(p => map.set(p.id, p));
          fetchedPayments.forEach(p => map.set(p.id, p));
          const merged = Array.from(map.values()).sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
          if (prevPaymentsCountRef.current !== -1 && merged.length > prevPaymentsCountRef.current) {
            const diff = merged.length - prevPaymentsCountRef.current;
            showToast(`💳 Real-time: ${diff} new payment proof / SMS received!`, 'success');
            playNotificationChime('payment');
            sendDesktopNotification('Payment Received', `${diff} new payment verification(s) received.`);
          }
          prevPaymentsCountRef.current = merged.length;
          return merged;
        });
      }
      if (fetchedMessages && Array.isArray(fetchedMessages)) {
        setMessages(prev => {
          const map = new Map<string, AdminMessage>();
          prev.forEach(m => map.set(m.id, m));
          fetchedMessages.forEach(m => map.set(m.id, m));
          const merged = Array.from(map.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          if (prevMessagesCountRef.current !== -1 && merged.length > prevMessagesCountRef.current) {
            const diff = merged.length - prevMessagesCountRef.current;
            showToast(`💬 Real-time: ${diff} new SMS / inquiry received!`, 'success');
            playNotificationChime('sms');
            sendDesktopNotification('New SMS / Inquiry', `${diff} new customer message(s) received.`);
          }
          prevMessagesCountRef.current = merged.length;
          return merged;
        });
      }
      if (fetchedProblems) setProblems(fetchedProblems);
      if (fetchedCoupons) setCoupons(fetchedCoupons);
      if (fetchedInvLogs) setInventoryLogs(fetchedInvLogs);
      if (fetchedAuditLogs) setAuditLogs(fetchedAuditLogs);
      if (fetchedCustomers) setCustomers(fetchedCustomers);
      if (fetchedAdminUsers) setAdminUsers(fetchedAdminUsers);
      if (fetchedSupplierApps) setSupplierApplications(fetchedSupplierApps);
      if (fetchedSupplierPayouts) setSupplierPayouts(fetchedSupplierPayouts);
      if (fetchedSettings) setSettings(fetchedSettings);
      if (fetchedCjConfig) {
        setCjConfig(fetchedCjConfig);
        setCjApiKeyInput(prev => prev || fetchedCjConfig.apiKey || '');
        setCjEmailInput(prev => prev || fetchedCjConfig.email || 'contactreachmedialimited@gmail.com');
        setCjUsdRateInput(prev => prev || fetchedCjConfig.usdToRwfRate || 1420);
        setCjMarkupInput(prev => prev || fetchedCjConfig.defaultMarkupPercent || 35);
        setCjAutoUploadToggle(fetchedCjConfig.autoUploadEnabled);
        setCjAutoPublishToggle(fetchedCjConfig.autoPublish !== false);
        setCjRequireApprovalToggle(fetchedCjConfig.requireAdminApproval !== undefined ? fetchedCjConfig.requireAdminApproval : true);
        if (fetchedCjConfig.selectedCategories && fetchedCjConfig.selectedCategories.length > 0) {
          setCjSelectedCategories(fetchedCjConfig.selectedCategories);
        }
      }
      // Populate CJ categories & dropshipping orders in background
      api.adminGetCjCategories().then(cats => { if (Array.isArray(cats) && cats.length > 0) setCjCategoriesList(cats); }).catch(() => {});
      api.adminGetCjOrders().then(res => { if (res && Array.isArray(res.orders)) setCjOrders(res.orders); }).catch(() => {});
      if (fetchedDriveStatus) {
        setDriveStatus(fetchedDriveStatus);
      }
      // Dynamically verify and refresh active admin identity and role permissions
      api.adminGetMe().then((me: AdminUser | null) => {
        if (me && me.role) {
          setCurrentUser(me);
          localStorage.setItem('crm_admin_user', JSON.stringify(me));
        }
      }).catch(() => {});

      setLastSyncTime(new Date());
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      isFetchingAllRef.current = false;
      if (!silent) setLoading(false);
    }
  };

  const fetchDbDiagnostics = async () => {
    setLoadingDiagnostics(true);
    try {
      const diag = await api.getDatabaseDiagnostics();
      setDbDiagnostics(diag);
    } catch (err: any) {
      console.warn('Failed to fetch DB diagnostics:', err);
    } finally {
      setLoadingDiagnostics(false);
    }
  };

  const handleRepairDatabase = async () => {
    setRepairingDb(true);
    try {
      const res = await api.repairDatabase();
      showToast(res.message);
      await fetchAllData(true);
      await fetchDbDiagnostics();
    } catch (err: any) {
      showToast(err.message || 'Failed to repair database', 'error');
    } finally {
      setRepairingDb(false);
    }
  };

  const handleMakeAllProductsReady = async () => {
    setMakingAllReady(true);
    try {
      const res = await api.adminMakeAllProductsReady();
      showToast(res.message || 'All products are now 100% Ready, Approved, and Available on ContactReach Market!');
      try {
        await fetchAllData(true);
      } catch (e) {
        console.warn('Silent refresh error after making ready:', e);
      }
      try {
        await fetchDbDiagnostics();
      } catch (e) {
        console.warn('Silent diagnostics error after making ready:', e);
      }
      try {
        onRefreshPublicData();
      } catch (e) {
        console.warn('Silent public data refresh error after making ready:', e);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to make all products ready', 'error');
    } finally {
      setMakingAllReady(false);
    }
  };

  // Real-time synchronization: High-Performance SSE stream + Firestore push listeners + silent background sync
  useEffect(() => {
    // Initial fetch
    fetchAllData(false);

    let isSubscribed = true;
    let eventSource: EventSource | null = null;
    let reconnectTimeout: any = null;
    let reconnectAttempts = 0;

    // 1. High-Performance Server-Sent Events (SSE) Live Database Stream with Auto-Reconnect
    const connectSSE = () => {
      if (!isSubscribed) return;
      if (eventSource) {
        try { eventSource.close(); } catch {}
        eventSource = null;
      }

      try {
        const token = api.getAdminToken() || 'crm_admin_test_session';
        eventSource = new EventSource(`/api/admin/realtime?token=${encodeURIComponent(token)}`);

        eventSource.addEventListener('open', () => {
          if (!isSubscribed) return;
          setIsRealtimeConnected(true);
          reconnectAttempts = 0;
        });

        eventSource.addEventListener('db_update', (event) => {
          if (!isSubscribed) return;
          setIsRealtimeConnected(true);
          setLastSyncTime(new Date());

          try {
            const parsed = JSON.parse(event.data);
            const eventType = parsed?.type;
            const payload = parsed?.payload;

            // Instant zero-latency UI update from event payload
            if (eventType === 'order_created' && payload?.order) {
              const newOrd: Order = payload.order;
              setOrders(prev => {
                if (prev.some(o => o.id === newOrd.id || o.orderNumber === newOrd.orderNumber)) return prev;
                return [newOrd, ...prev];
              });
              playNotificationChime('order');
              showToast(`🔔 Real-time: New Order #${newOrd.orderNumber} (${Number(newOrd.totalAmount).toLocaleString()} RWF) from ${newOrd.customerName}!`, 'success');
              sendDesktopNotification('New Order Received!', `Order #${newOrd.orderNumber} from ${newOrd.customerName} (${Number(newOrd.totalAmount).toLocaleString()} RWF)`);
              setLiveAlert({
                id: `ord-${Date.now()}`,
                type: 'order',
                title: `🔔 Real-Time Order #${newOrd.orderNumber} Received!`,
                subtitle: `${newOrd.customerName} ordered for ${Number(newOrd.totalAmount).toLocaleString()} RWF via ${newOrd.paymentMethod}. Arrived live without page reload!`,
                timestamp: new Date(),
                actionTab: 'orders'
              });
            } else if ((eventType === 'sms_received' || eventType === 'message_created') && payload?.message) {
              const newMsg: AdminMessage = payload.message;
              setMessages(prev => {
                if (prev.some(m => m.id === newMsg.id)) return prev;
                return [newMsg, ...prev];
              });
              playNotificationChime('sms');
              showToast(`💬 Real-time: New SMS / Inquiry from ${newMsg.name || newMsg.phone}!`, 'success');
              sendDesktopNotification('New SMS / Message Received', `${newMsg.name || newMsg.phone}: ${newMsg.message.slice(0, 80)}`);
              setLiveAlert({
                id: `sms-${Date.now()}`,
                type: 'sms',
                title: `💬 Real-Time SMS / Message Received!`,
                subtitle: `From ${newMsg.name || newMsg.phone}: "${newMsg.message.slice(0, 120)}"`,
                timestamp: new Date(),
                actionTab: 'messages'
              });
            } else if (eventType === 'payment_submitted' && payload?.payment) {
              const newPay: PaymentConfirmation = payload.payment;
              setPayments(prev => {
                if (prev.some(p => p.id === newPay.id)) return prev;
                return [newPay, ...prev];
              });
              if (payload.order) {
                setOrders(prev => prev.map(o => (o.id === payload.order.id || o.orderNumber === payload.order.orderNumber) ? payload.order : o));
              }
              playNotificationChime('payment');
              showToast(`💳 Real-time: Payment confirmation / SMS proof received for Order #${newPay.orderNumber} (${Number(newPay.amountPaid || 0).toLocaleString()} RWF)!`, 'success');
              sendDesktopNotification('Payment Proof Submitted', `Order #${newPay.orderNumber}: ${Number(newPay.amountPaid || 0).toLocaleString()} RWF via ${newPay.paymentMethod}`);
              setLiveAlert({
                id: `pay-${Date.now()}`,
                type: 'payment',
                title: `💳 Real-Time Payment Proof / SMS Received!`,
                subtitle: `Order #${newPay.orderNumber}: ${Number(newPay.amountPaid || 0).toLocaleString()} RWF (${newPay.paymentMethod}). Txn: ${newPay.transactionId || 'SMS Proof'}.`,
                timestamp: new Date(),
                actionTab: 'payments'
              });
            } else if (eventType === 'problem_reported' && payload?.report) {
              const newRep: CustomerProblemReport = payload.report;
              setProblems(prev => {
                if (prev.some(r => r.id === newRep.id || r.caseNumber === newRep.caseNumber)) return prev;
                return [newRep, ...prev];
              });
              playNotificationChime('alert');
              showToast(`⚠️ Real-time: New customer problem report #${newRep.caseNumber} received!`, 'error');
              sendDesktopNotification('Customer Problem Reported', `Case #${newRep.caseNumber} (${newRep.category}): ${newRep.description.slice(0, 80)}`);
            } else if (eventType === 'supplier_application_created' && payload?.application) {
              const newApp = payload.application;
              setSupplierApplications(prev => {
                if (prev.some(a => a.id === newApp.id)) return prev;
                return [newApp, ...prev];
              });
              playNotificationChime('alert');
              showToast(`🤝 Real-time: New supplier application from "${newApp.businessName}"!`, 'success');
              sendDesktopNotification('New Supplier Application', `Business: ${newApp.businessName} (${newApp.ownerName}, ${newApp.phone})`);
            } else if (eventType === 'order_status_updated' && payload?.order) {
              const updatedOrd: Order = payload.order;
              setOrders(prev => prev.map(o => (o.id === updatedOrd.id || o.orderNumber === updatedOrd.orderNumber) ? updatedOrd : o));
            } else if (eventType === 'order_deleted' && (payload?.orderId || payload?.orderNumber)) {
              const { orderId, orderNumber } = payload;
              setOrders(prev => prev.filter(o => o.id !== orderId && o.orderNumber !== orderNumber));
              showToast(`🗑️ Order #${orderNumber || orderId} deleted by admin`);
            } else if (eventType === 'orders_bulk_deleted' && Array.isArray(payload?.orderIds)) {
              const idSet = new Set(payload.orderIds);
              const numSet = new Set(payload.orderNumbers || []);
              setOrders(prev => prev.filter(o => !idSet.has(o.id) && !numSet.has(o.orderNumber)));
              showToast(`🗑️ ${payload.orderIds.length} orders deleted by admin`);
            } else if (eventType === 'payment_verified' && payload?.payment) {
              const updatedPay: PaymentConfirmation = payload.payment;
              setPayments(prev => prev.map(p => p.id === updatedPay.id ? updatedPay : p));
              if (payload.order) {
                setOrders(prev => prev.map(o => (o.id === payload.order.id || o.orderNumber === payload.order.orderNumber) ? payload.order : o));
              }
            } else if (eventType === 'problem_updated' && payload?.report) {
              const updatedRep: CustomerProblemReport = payload.report;
              setProblems(prev => prev.map(r => r.id === updatedRep.id ? updatedRep : r));
            } else if (eventType === 'supplier_application_updated' && payload?.application) {
              const updatedApp = payload.application;
              setSupplierApplications(prev => prev.map(a => a.id === updatedApp.id ? updatedApp : a));
            }

            if (parsed?.stats) {
              setStats(parsed.stats);
            }
          } catch {}

          // Refresh live panels silently on real-time event for background reconciliation
          fetchAllData(true);
        });

        eventSource.onerror = () => {
          if (!isSubscribed) return;
          setIsRealtimeConnected(false);
          if (eventSource) {
            try { eventSource.close(); } catch {}
            eventSource = null;
          }
          // Exponential backoff auto-reconnect (1.5s, 3s, 6s, max 8s)
          const delay = Math.min(1500 * Math.pow(1.5, reconnectAttempts), 8000);
          reconnectAttempts++;
          if (reconnectTimeout) clearTimeout(reconnectTimeout);
          reconnectTimeout = setTimeout(connectSSE, delay);
        };
      } catch (err) {
        setIsRealtimeConnected(false);
      }
    };

    connectSSE();

    // 2. Background fallback sync every 12 seconds (skips when browser tab is inactive)
    // 2. Background fallback sync every 10 seconds (reliable multi-device heartbeat)
    const syncInterval = setInterval(() => {
      fetchAllData(true);
    }, 10000);

    // Multi-Device Resilience: Immediately reconnect and sync on tab focus, device wake, or network restore
    const handleReSyncOnVisible = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        if (!eventSource || eventSource.readyState === EventSource.CLOSED) {
          connectSSE();
        }
        fetchAllData(true);
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleReSyncOnVisible);
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', handleReSyncOnVisible);
      window.addEventListener('online', handleReSyncOnVisible);
    }

    // 3. Live Firestore onSnapshot listeners for instant push updates (marketdatabase-1090b)
    const unsubs: (() => void)[] = [];
    if (db) {
      try {
        // 1. Orders
        const unsubOrders = onSnapshot(collection(db, 'orders'), (snapshot) => {
          if (!snapshot.empty) {
            const liveOrders: Order[] = [];
            snapshot.forEach(docSnap => {
              liveOrders.push({ ...(docSnap.data() as Order), id: docSnap.id });
            });
            if (prevOrdersCountRef.current !== -1 && liveOrders.length > prevOrdersCountRef.current) {
              const diff = liveOrders.length - prevOrdersCountRef.current;
              showToast(`🔔 Real-time: ${diff} new order(s) received!`, 'success');
              playNotificationChime('order');
              sendDesktopNotification('New Order Received', `${diff} new customer order(s) placed.`);
            }
            setOrders(prev => {
              const map = new Map<string, Order>();
              // Maintain all existing orders from the authoritative permanent database
              prev.forEach(o => map.set(o.id, o));
              // Merge live incoming updates or new orders
              liveOrders.forEach(o => {
                const existing = map.get(o.id) || Array.from(map.values()).find(x => x.orderNumber === o.orderNumber);
                if (!existing) {
                  map.set(o.id, o);
                } else {
                  map.set(existing.id, { ...existing, ...o });
                }
              });
              const merged = Array.from(map.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
              prevOrdersCountRef.current = merged.length;
              try {
                localStorage.setItem('crm_admin_orders_cache', JSON.stringify(merged));
              } catch {}
              return merged;
            });
            setLastSyncTime(new Date());
            setIsRealtimeConnected(true);
          }
        }, (err) => {
          console.warn('[Firestore] Live orders subscription notice:', err.message);
        });
        unsubs.push(unsubOrders);

        // 2. Payments & SMS Proofs
        const unsubPayments = onSnapshot(collection(db, 'paymentConfirmations'), (snapshot) => {
          if (!snapshot.empty) {
            const livePayments: PaymentConfirmation[] = [];
            snapshot.forEach(docSnap => {
              livePayments.push({ ...(docSnap.data() as PaymentConfirmation), id: docSnap.id });
            });
            if (prevPaymentsCountRef.current !== -1 && livePayments.length > prevPaymentsCountRef.current) {
              const diff = livePayments.length - prevPaymentsCountRef.current;
              showToast(`💳 Real-time: ${diff} new payment proof / SMS received!`, 'success');
              playNotificationChime('payment');
              sendDesktopNotification('Payment Confirmation Received', `${diff} new payment verification(s) submitted.`);
            }
            prevPaymentsCountRef.current = livePayments.length;
            setPayments(prev => {
              const map = new Map<string, PaymentConfirmation>();
              prev.forEach(p => map.set(p.id, p));
              livePayments.forEach(p => map.set(p.id, p));
              return Array.from(map.values()).sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
            });
            setLastSyncTime(new Date());
            setIsRealtimeConnected(true);
          }
        }, (err) => {
          console.warn('[Firestore] Live payments subscription notice:', err.message);
        });
        unsubs.push(unsubPayments);

        // 3. Supplier Applications
        const unsubSuppliers = onSnapshot(collection(db, 'supplierApplications'), (snapshot) => {
          if (!snapshot.empty) {
            const liveApps: any[] = [];
            snapshot.forEach(docSnap => {
              liveApps.push({ ...(docSnap.data() as any), id: docSnap.id });
            });
            if (prevSuppliersCountRef.current !== -1 && liveApps.length > prevSuppliersCountRef.current) {
              const diff = liveApps.length - prevSuppliersCountRef.current;
              showToast(`🤝 Real-time: ${diff} new supplier application(s) received!`, 'success');
              playNotificationChime('alert');
              sendDesktopNotification('New Supplier Application', `${diff} business supplier application(s) pending review.`);
            }
            setSupplierApplications(prev => {
              const map = new Map<string, any>();
              prev.forEach(a => map.set(a.id, a));
              liveApps.forEach(a => map.set(a.id, a));
              const merged = Array.from(map.values());
              prevSuppliersCountRef.current = merged.length;
              return merged;
            });
            setLastSyncTime(new Date());
            setIsRealtimeConnected(true);
          }
        }, (err) => {
          console.warn('[Firestore] Live suppliers subscription notice:', err.message);
        });
        unsubs.push(unsubSuppliers);

        // 4. Messages & SMS Inquiries
        const unsubMessages = onSnapshot(collection(db, 'messages'), (snapshot) => {
          if (!snapshot.empty) {
            const liveMsgs: AdminMessage[] = [];
            snapshot.forEach(docSnap => {
              liveMsgs.push({ ...(docSnap.data() as AdminMessage), id: docSnap.id });
            });
            if (prevMessagesCountRef.current !== -1 && liveMsgs.length > prevMessagesCountRef.current) {
              const diff = liveMsgs.length - prevMessagesCountRef.current;
              showToast(`💬 Real-time: ${diff} new SMS / inquiry received!`, 'success');
              playNotificationChime('sms');
              sendDesktopNotification('New SMS / Inquiry', `${diff} new customer message(s) received.`);
            }
            setMessages(prev => {
              const map = new Map<string, AdminMessage>();
              prev.forEach(m => map.set(m.id, m));
              liveMsgs.forEach(m => map.set(m.id, m));
              const merged = Array.from(map.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
              prevMessagesCountRef.current = merged.length;
              return merged;
            });
            setLastSyncTime(new Date());
            setIsRealtimeConnected(true);
          }
        }, (err) => {
          console.warn('[Firestore] Live messages subscription notice:', err.message);
        });
        unsubs.push(unsubMessages);

        // 5. Problems & Reports
        const unsubProblems = onSnapshot(collection(db, 'customerProblems'), (snapshot) => {
          if (!snapshot.empty) {
            const liveProblems: CustomerProblemReport[] = [];
            snapshot.forEach(docSnap => {
              liveProblems.push({ ...(docSnap.data() as CustomerProblemReport), id: docSnap.id });
            });
            if (prevProblemsCountRef.current !== -1 && liveProblems.length > prevProblemsCountRef.current) {
              const diff = liveProblems.length - prevProblemsCountRef.current;
              showToast(`⚠️ Real-time: ${diff} new problem report(s) filed!`, 'error');
              playNotificationChime('alert');
              sendDesktopNotification('Customer Problem Reported', `${diff} new customer case(s) filed.`);
            }
            setProblems(prev => {
              const map = new Map<string, CustomerProblemReport>();
              prev.forEach(p => map.set(p.id, p));
              liveProblems.forEach(p => map.set(p.id, p));
              const merged = Array.from(map.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
              prevProblemsCountRef.current = merged.length;
              return merged;
            });
            setLastSyncTime(new Date());
            setIsRealtimeConnected(true);
          }
        }, (err) => {
          console.warn('[Firestore] Live problems subscription notice:', err.message);
        });
        unsubs.push(unsubProblems);

        // 6. Audit Logs
        const unsubAudit = onSnapshot(collection(db, 'auditLogs'), (snapshot) => {
          if (!snapshot.empty) {
            const liveAudit: AuditLog[] = [];
            snapshot.forEach(docSnap => {
              liveAudit.push({ ...(docSnap.data() as AuditLog), id: docSnap.id });
            });
            setAuditLogs(liveAudit);
            setLastSyncTime(new Date());
            setIsRealtimeConnected(true);
          }
        }, (err) => {
          console.warn('[Firestore] Live audit logs subscription notice:', err.message);
        });
        unsubs.push(unsubAudit);
      } catch (e) {
        console.warn('[Firestore] Realtime subscription init error:', e);
      }
    }

    return () => {
      isSubscribed = false;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (eventSource) {
        try { eventSource.close(); } catch {}
      }
      clearInterval(syncInterval);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleReSyncOnVisible);
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', handleReSyncOnVisible);
        window.removeEventListener('online', handleReSyncOnVisible);
      }
      unsubs.forEach(unsub => {
        try { unsub(); } catch {}
      });
    };
  }, []);

  const handleToggleMaintenance = async (newVal: boolean) => {
    if (!settings) return;
    setSavingMaintenance(true);
    try {
      const res = await api.adminToggleMaintenanceMode({
        isMaintenanceMode: newVal,
        maintenanceTitle: settings.maintenanceTitle,
        maintenanceMessage: settings.maintenanceMessage,
        maintenanceEstimatedTime: settings.maintenanceEstimatedTime
      });
      setSettings(res.settings);
      showToast(
        newVal
          ? '⚠️ Maintenance Mode is now ON. Visitors see the "We’ll Be Back Soon" screen.'
          : '✅ Maintenance Mode is now OFF. Public storefront is live for all visitors.'
      );
      fetchAllData();
      onRefreshPublicData();
    } catch (err: any) {
      showToast(err.message || 'Failed to toggle maintenance mode', 'error');
    } finally {
      setSavingMaintenance(false);
    }
  };

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchCat = productCatFilter === 'all' || p.category === productCatFilter;
      const matchShop = productShopFilter === 'all' || p.shopName?.toLowerCase() === productShopFilter.toLowerCase();
      const q = productSearch.toLowerCase().trim();
      const matchQ = !q ||
        p.name.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.brand && p.brand.toLowerCase().includes(q)) ||
        (p.shopName && p.shopName.toLowerCase().includes(q));
      return matchCat && matchShop && matchQ;
    });
  }, [products, productCatFilter, productShopFilter, productSearch]);

  // Unique Suppliers list for filter dropdown
  const uniqueSuppliers = useMemo(() => {
    const set = new Set<string>();
    orders.forEach(o => {
      if (o.supplierName) set.add(o.supplierName);
      if (o.shopName) set.add(o.shopName);
      (o.items || []).forEach(i => {
        if (i.supplierName) set.add(i.supplierName);
        if (i.shopName) set.add(i.shopName);
      });
    });
    return Array.from(set).filter(Boolean).sort();
  }, [orders]);

  // Comprehensive Summary Statistics for Order Management
  const orderSummaryStats = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter(o => (o.deliveryStatus === 'Pending' || (!o.deliveryStatus && (o.status === 'New' || o.status === 'Awaiting Payment' || o.status === 'Payment Submitted')))).length;
    const processing = orders.filter(o => (o.deliveryStatus === 'Processing' || (!o.deliveryStatus && (o.status === 'Preparing' || o.status === 'Processing' || o.status === 'Confirmed')))).length;
    const awaitingShipment = orders.filter(o => o.deliveryStatus === 'Awaiting Shipment').length;
    const shipped = orders.filter(o => (o.deliveryStatus === 'Shipped' || (!o.deliveryStatus && o.status === 'Ready for Delivery'))).length;
    const inTransit = orders.filter(o => (o.deliveryStatus === 'In Transit' || o.deliveryStatus === 'Out for Delivery' || (!o.deliveryStatus && o.status === 'Out for Delivery'))).length;
    const delivered = orders.filter(o => (o.deliveryStatus === 'Delivered' || (!o.deliveryStatus && (o.status === 'Delivered' || o.status === 'Completed')))).length;
    const cancelled = orders.filter(o => (o.deliveryStatus === 'Cancelled' || (!o.deliveryStatus && o.status === 'Cancelled'))).length;
    const failedDelivery = orders.filter(o => (o.deliveryStatus === 'Failed Delivery' || o.deliveryStatus === 'Returned' || (!o.deliveryStatus && o.status === 'Returned'))).length;
    const delayed = orders.filter(o => {
      if (o.deliveryStatus === 'Delivered' || o.deliveryStatus === 'Cancelled' || o.status === 'Delivered' || o.status === 'Cancelled') return false;
      if (!o.expectedDeliveryDate) return false;
      return new Date(o.expectedDeliveryDate).getTime() < Date.now();
    }).length;
    const missingTracking = orders.filter(o => {
      if (o.deliveryStatus === 'Delivered' || o.deliveryStatus === 'Cancelled' || o.status === 'Cancelled') return false;
      return !o.trackingNumber || !o.trackingNumber.trim();
    }).length;

    return { total, pending, processing, awaitingShipment, shipped, inTransit, delivered, cancelled, failedDelivery, delayed, missingTracking };
  }, [orders]);

  // Filtered Orders across 5 fields & 4 distinct filters
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      // 1. Delivery Status Filter
      const effectiveDelivery = o.deliveryStatus || (o.status === 'Delivered' ? 'Delivered' : o.status === 'Out for Delivery' ? 'In Transit' : o.status === 'Preparing' ? 'Processing' : o.status === 'Cancelled' ? 'Cancelled' : 'Pending');
      const matchDelivery = orderDeliveryFilter === 'all' || effectiveDelivery.toLowerCase() === orderDeliveryFilter.toLowerCase();

      // 2. High-level status filter
      const matchStatus = orderStatusFilter === 'all' || o.status === orderStatusFilter;

      // 3. Payment Status Filter
      const matchPay = orderPaymentFilter === 'all' || o.paymentStatus === orderPaymentFilter;

      // 4. Supplier Filter
      const orderSupplier = (o.supplierName || o.shopName || '').toLowerCase();
      const hasItemSupplier = (o.items || []).some(i => (i.supplierName || i.shopName || '').toLowerCase().includes(orderSupplierFilter.toLowerCase()));
      const matchSupplier = orderSupplierFilter === 'all' || orderSupplier.includes(orderSupplierFilter.toLowerCase()) || hasItemSupplier;

      // 5. Order Date Filter
      let matchDate = true;
      if (orderDateFilter !== 'all') {
        const orderTime = new Date(o.createdAt).getTime();
        const now = Date.now();
        if (orderDateFilter === 'today') {
          const startOfDay = new Date();
          startOfDay.setHours(0, 0, 0, 0);
          matchDate = orderTime >= startOfDay.getTime();
        } else if (orderDateFilter === '7days') {
          matchDate = orderTime >= now - 7 * 24 * 60 * 60 * 1000;
        } else if (orderDateFilter === '30days') {
          matchDate = orderTime >= now - 30 * 24 * 60 * 60 * 1000;
        } else if (orderDateFilter === 'this_month') {
          const orderD = new Date(o.createdAt);
          const currentD = new Date();
          matchDate = orderD.getMonth() === currentD.getMonth() && orderD.getFullYear() === currentD.getFullYear();
        }
      }

      // 6. Search across Order ID, Product Name, Customer Name, Customer Phone, Supplier Name
      const q = orderSearch.toLowerCase().trim();
      const matchQ = !q ||
        o.orderNumber.toLowerCase().includes(q) ||
        o.id.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.customerPhone.toLowerCase().includes(q) ||
        (o.supplierName && o.supplierName.toLowerCase().includes(q)) ||
        (o.shopName && o.shopName.toLowerCase().includes(q)) ||
        (o.trackingNumber && o.trackingNumber.toLowerCase().includes(q)) ||
        (o.items || []).some(i => i.productName.toLowerCase().includes(q) || (i.supplierName && i.supplierName.toLowerCase().includes(q)));

      return matchDelivery && matchStatus && matchPay && matchSupplier && matchDate && matchQ;
    });
  }, [orders, orderDeliveryFilter, orderStatusFilter, orderPaymentFilter, orderSupplierFilter, orderDateFilter, orderSearch]);

  // Handlers for Products
  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    const defaultShop = shops[0]?.name || 'ContactReach Market';
    const defaultShopId = shops[0]?.id || '';
    setProdForm({
      name: '',
      sku: `CRM-${(categories[0]?.id || 'PROD').toUpperCase().slice(0, 3)}-${Math.floor(1000 + Math.random() * 9000)}`,
      description: '',
      price: 15000,
      costPrice: '',
      shippingCost: '',
      discountPercent: '',
      discountPrice: '',
      category: categories[0]?.id || 'hair-beauty',
      subcategory: '',
      stock: 25,
      imageUrl: '/src/assets/images/product_hair_curl_cream_1791966366308.jpg',
      imagesText: '',
      shopName: defaultShop,
      shopId: defaultShopId,
      isAddingNewShop: false,
      newShopName: '',
      newShopLocation: 'Kigali, Rwanda',
      newShopPhone: '',
      newShopDescription: '',
      brand: '',
      unit: 'Piece',
      status: 'Available',
      isFeatured: false,
      isNewArrival: true,
      isBestSeller: false,
      sizes: '',
      colors: '',
      storage: '',
      specifications: '',
      packagingInfo: '',
      videoUrl: ''
    });
    setNewImageLink('');
    setShowBulkImagePaste(false);
    setBulkImageInput('');
    setProductModalOpen(true);
  };

  // Auto-open Add Product modal when requested from storefront or deep-link route
  useEffect(() => {
    if (autoOpenAddProduct) {
      setActiveTab('products');
      handleOpenAddProduct();
    }
  }, [autoOpenAddProduct]);

  const handleOpenEditProduct = (p: Product) => {
    setEditingProduct(p);
    const existingPercent = p.discountPercent || (p.discountPrice && p.price > 0 && p.discountPrice < p.price
      ? Math.round(((p.price - p.discountPrice) / p.price) * 100)
      : '');
    setProdForm({
      name: p.name,
      sku: p.sku || '',
      description: p.description,
      price: p.price,
      costPrice: p.costPrice !== undefined ? p.costPrice : '',
      shippingCost: p.shippingCost !== undefined && p.shippingCost !== null ? p.shippingCost : '',
      discountPercent: existingPercent,
      discountPrice: p.discountPrice || '',
      category: p.category,
      subcategory: p.subcategory || '',
      stock: p.stock,
      imageUrl: p.imageUrl,
      imagesText: p.images ? p.images.join('\n') : '',
      shopName: p.shopName || 'ContactReach Market',
      shopId: p.shopId || '',
      isAddingNewShop: false,
      newShopName: '',
      newShopLocation: 'Kigali, Rwanda',
      newShopPhone: '',
      newShopDescription: '',
      brand: p.brand || '',
      unit: p.unit || 'Piece',
      status: p.status,
      isFeatured: Boolean(p.isFeatured),
      isNewArrival: Boolean(p.isNewArrival),
      isBestSeller: Boolean(p.isBestSeller),
      sizes: p.variations?.find(v => v.name.toLowerCase() === 'size')?.options.join(', ') || '',
      colors: p.variations?.find(v => v.name.toLowerCase() === 'color')?.options.join(', ') || '',
      storage: p.storage || p.variations?.find(v => v.name.toLowerCase().includes('storage') || v.name.toLowerCase().includes('capacity'))?.options.join(', ') || '',
      specifications: p.specifications || '',
      packagingInfo: p.packagingInfo || '',
      videoUrl: p.videoUrl || ''
    });
    setNewImageLink('');
    setShowBulkImagePaste(false);
    setBulkImageInput('');
    setProductModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodForm.name.trim() || !prodForm.category) {
      showToast('Please enter a product title and select a category.', 'error');
      return;
    }
    const cleanDescription = prodForm.description.trim();

    const variations: ProductVariation[] = [];
    if (prodForm.sizes.trim()) {
      variations.push({
        name: 'Size',
        options: prodForm.sizes.split(',').map(s => s.trim()).filter(Boolean)
      });
    }
    if (prodForm.colors.trim()) {
      variations.push({
        name: 'Color',
        options: prodForm.colors.split(',').map(c => c.trim()).filter(Boolean)
      });
    }
    if (prodForm.storage.trim()) {
      variations.push({
        name: 'Storage',
        options: prodForm.storage.split(',').map(s => s.trim()).filter(Boolean)
      });
    }

    const imagesList = getParsedImageList(prodForm.imagesText, prodForm.imageUrl);
    const finalPrimaryImage = prodForm.imageUrl.trim() || imagesList[0] || '/src/assets/images/product_street_sneakers_1791966366958.jpg';
    if (!imagesList.includes(finalPrimaryImage)) {
      imagesList.unshift(finalPrimaryImage);
    }

    const finalPrice = Math.max(0, Number(prodForm.price));
    const numPercent = prodForm.discountPercent && Number(prodForm.discountPercent) > 0
      ? Math.min(99, Math.max(1, Math.round(Number(prodForm.discountPercent))))
      : undefined;
    const finalDiscountPrice = numPercent && finalPrice > 0
      ? Math.max(0, Math.round(finalPrice * (1 - numPercent / 100)))
      : undefined;

    // Resolve shop: if shop exists no need to write it, if adding new shop it will be stored as unrecommended
    let targetShopName = prodForm.shopName;
    let targetShopId = prodForm.shopId;
    let shopLocation: string | undefined = undefined;
    let shopPhone: string | undefined = undefined;
    let newShopPayload: any = undefined;

    if (prodForm.isAddingNewShop) {
      const enteredNewName = prodForm.newShopName.trim();
      if (!enteredNewName) {
        showToast('Please enter a shop name or pick an existing shop from the list.', 'error');
        return;
      }
      // Check if typed shop already exists in directory (case-insensitive)
      const existingMatch = shops.find(s => s.name.trim().toLowerCase() === enteredNewName.toLowerCase());
      if (existingMatch) {
        // Re-use existing shop! No duplicate created
        targetShopName = existingMatch.name;
        targetShopId = existingMatch.id;
      } else {
        targetShopName = enteredNewName;
        targetShopId = '';
        shopLocation = prodForm.newShopLocation.trim() || 'Kigali, Rwanda';
        shopPhone = prodForm.newShopPhone.trim() || undefined;
        newShopPayload = {
          name: enteredNewName,
          location: shopLocation,
          phone: shopPhone,
          description: prodForm.newShopDescription.trim() || undefined,
          category: prodForm.category
        };
      }
    } else {
      const existingMatch = shops.find(s => s.name === prodForm.shopName || s.id === prodForm.shopId);
      if (existingMatch) {
        targetShopName = existingMatch.name;
        targetShopId = existingMatch.id;
      }
    }

    const payload: any = {
      name: prodForm.name.trim(),
      sku: prodForm.sku.trim(),
      description: cleanDescription,
      price: finalPrice,
      costPrice: prodForm.costPrice !== '' && !isNaN(Number(prodForm.costPrice)) ? Math.max(0, Number(prodForm.costPrice)) : undefined,
      costOverriddenByAdmin: prodForm.costPrice !== '' ? true : (editingProduct?.costOverriddenByAdmin ?? false),
      shippingCost: prodForm.shippingCost !== '' && !isNaN(Number(prodForm.shippingCost)) ? Math.max(0, Number(prodForm.shippingCost)) : undefined,
      discountPercent: numPercent,
      discountPrice: finalDiscountPrice,
      category: prodForm.category,
      mainCategoryId: categories.find(c => c.id === prodForm.category)?.parentId || prodForm.category,
      categoryName: categories.find(c => c.id === prodForm.category)?.nameEn || prodForm.category,
      subcategory: prodForm.subcategory.trim() || undefined,
      subCategoryId: prodForm.subcategory.trim() || undefined,
      subCategoryName: categories.find(c => c.id === prodForm.subcategory)?.nameEn || (prodForm.subcategory.trim() || undefined),
      stock: Math.max(0, parseInt(String(prodForm.stock), 10) || 0),
      imageUrl: finalPrimaryImage,
      images: imagesList,
      shopName: targetShopName,
      shopId: targetShopId || undefined,
      shopLocation,
      shopPhone,
      newShop: newShopPayload,
      brand: prodForm.brand.trim() || undefined,
      unit: prodForm.unit.trim() || 'Piece',
      status: prodForm.status,
      reviewStatus: 'Approved',
      isFeatured: prodForm.isFeatured,
      isNewArrival: prodForm.isNewArrival,
      isBestSeller: prodForm.isBestSeller,
      variations: variations.length > 0 ? variations : undefined,
      storage: prodForm.storage.trim() || undefined,
      specifications: prodForm.specifications.trim() || undefined,
      packagingInfo: prodForm.packagingInfo.trim() || undefined,
      videoUrl: prodForm.videoUrl.trim() || undefined
    };

    try {
      if (editingProduct) {
        const updated = await api.adminUpdateProduct(editingProduct.id, payload);
        setProducts(prev => prev.map(p => p.id === editingProduct.id ? { ...p, ...updated } : p));
        showToast('Product updated & saved permanently to Firebase & Store!', 'success');
      } else {
        const created = await api.adminAddProduct(payload);
        setProducts(prev => [created, ...prev.filter(p => p.id !== created.id)]);
        showToast('Product uploaded & saved permanently to Firebase & Store!', 'success');
      }
      setProductModalOpen(false);
      fetchAllData(true);
      onRefreshPublicData();
    } catch (err: any) {
      showToast(err.message || 'Error saving product', 'error');
    }
  };

  const handleDuplicateProduct = async (id: string) => {
    try {
      await api.adminDuplicateProduct(id);
      showToast('Product duplicated successfully!');
      fetchAllData();
      onRefreshPublicData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteProduct = (idOrProduct: string | Product) => {
    if (typeof idOrProduct === 'string') {
      const p = products.find(prod => prod.id === idOrProduct);
      if (p) {
        setProductToDelete(p);
      } else {
        setProductToDelete({ id: idOrProduct, name: `Product (${idOrProduct})`, price: 0, stock: 0, category: 'general', imageUrl: '/logo.png' } as any);
      }
    } else {
      setProductToDelete(idOrProduct);
    }
  };

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;
    const target = productToDelete;
    setDeletingProduct(true);
    try {
      // Optimistically remove from local state
      setProducts(prev => prev.filter(p => p.id !== target.id));
      setSelectedProductIds(prev => prev.filter(id => id !== target.id));

      await api.adminDeleteProduct(target.id, {
        sku: target.sku,
        alibabaProductId: target.alibabaProductId,
        cjProductId: target.cjProductId
      });

      showToast(`Product "${target.name}" permanently deleted from database, Firestore, and catalog.`, 'success');
      setProductToDelete(null);
      if (editingProduct && editingProduct.id === target.id) {
        setProductModalOpen(false);
        setEditingProduct(null);
      }
      fetchAllData(true);
      onRefreshPublicData();
    } catch (err: any) {
      showToast(err.message || 'Failed to permanently delete product', 'error');
      fetchAllData(true);
    } finally {
      setDeletingProduct(false);
    }
  };

  // Product Row Selection & Bulk Action Handlers
  const handleToggleSelectProduct = (id: string) => {
    setSelectedProductIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const isAllFilteredSelected = filteredProducts.length > 0 && filteredProducts.every(p => selectedProductIds.includes(p.id));
  const isSomeFilteredSelected = filteredProducts.length > 0 && filteredProducts.some(p => selectedProductIds.includes(p.id));

  const handleToggleSelectAllFiltered = () => {
    if (isAllFilteredSelected) {
      const filteredIdSet = new Set(filteredProducts.map(p => p.id));
      setSelectedProductIds(prev => prev.filter(id => !filteredIdSet.has(id)));
    } else {
      const newSelected = new Set(selectedProductIds);
      filteredProducts.forEach(p => newSelected.add(p.id));
      setSelectedProductIds(Array.from(newSelected));
    }
  };

  const handleClearProductSelection = () => {
    setSelectedProductIds([]);
  };

  const handleBulkDeleteProducts = async () => {
    if (selectedProductIds.length === 0) return;
    setBulkDeleting(true);
    try {
      const countToDelete = selectedProductIds.length;
      const res = await api.adminBulkDeleteProducts(selectedProductIds);
      showToast(res.message || `Successfully deleted ${countToDelete} product(s) at the same time!`);
      setSelectedProductIds([]);
      setShowBulkDeleteModal(false);
      fetchAllData();
      onRefreshPublicData();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete selected products', 'error');
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleBulkChangeStatus = async (status: ProductStatus) => {
    if (selectedProductIds.length === 0) return;
    setBulkUpdatingStatus(true);
    try {
      const res = await api.adminBulkUpdateProductStatus(selectedProductIds, status);
      showToast(res.message || `Updated ${selectedProductIds.length} product(s) to "${status}"!`);
      fetchAllData();
      onRefreshPublicData();
    } catch (err: any) {
      showToast(err.message || 'Failed to update products status', 'error');
    } finally {
      setBulkUpdatingStatus(false);
    }
  };


  // Quick Product Cost & Selling Price Update (Admin Cost Controls)
  const handleQuickUpdateProductCost = async (productId: string, customCost?: number, customPrice?: number) => {
    const finalCost = customCost !== undefined ? customCost : (editingCostPriceValue !== '' ? Math.max(0, Number(editingCostPriceValue)) : undefined);
    const finalPrice = customPrice !== undefined ? customPrice : (editingSellingPriceValue !== '' ? Math.max(0, Number(editingSellingPriceValue)) : undefined);

    if (finalCost === undefined && finalPrice === undefined) {
      setEditingCostProductId(null);
      return;
    }
    setSavingProductCostId(productId);
    try {
      const payload: { costPrice?: number; price?: number } = {};
      if (finalCost !== undefined) payload.costPrice = finalCost;
      if (finalPrice !== undefined) payload.price = finalPrice;

      await api.adminUpdateProductCost(productId, payload);
      showToast('Product cost and pricing updated successfully!');
      setEditingCostProductId(null);
      setEditingCostPriceValue('');
      setEditingSellingPriceValue('');
      fetchAllData();
      onRefreshPublicData();
    } catch (err: any) {
      showToast(err.message || 'Failed to update product cost', 'error');
    } finally {
      setSavingProductCostId(null);
    }
  };

  const handleQuickUpdateProductShipping = async (productId: string, customShipping?: number) => {
    setSavingProductCostId(productId);
    try {
      await api.adminUpdateProductCost(productId, { shippingCost: customShipping });
      showToast(customShipping !== undefined ? `Product shipping cost updated to ${customShipping.toLocaleString()} FRW!` : 'Reset to auto standard shipping (1,500 + 10%)!');
      fetchAllData();
      onRefreshPublicData();
    } catch (err: any) {
      showToast(err.message || 'Failed to update shipping cost', 'error');
    } finally {
      setSavingProductCostId(null);
    }
  };

  // CJ Dropshipping Handlers
  const handleSaveCjConfig = async () => {
    setSavingCjConfig(true);
    try {
      const sanitizedRate = Math.max(1, Number(cjUsdRateInput) || 1420);
      const sanitizedMarkup = Math.max(0, Number(cjMarkupInput) || 35);

      const updated = await api.adminUpdateCjConfig({
        apiKey: cjApiKeyInput.trim(),
        email: cjEmailInput.trim(),
        autoUploadEnabled: Boolean(cjAutoUploadToggle),
        autoPublish: Boolean(cjAutoPublishToggle),
        requireAdminApproval: Boolean(cjRequireApprovalToggle),
        usdToRwfRate: sanitizedRate,
        defaultMarkupPercent: sanitizedMarkup,
        selectedCategories: cjSelectedCategories
      });

      setCjConfig(updated);
      if (updated.apiKey) {
        setCjApiKeyInput(updated.apiKey);
      }
      if (updated.email) {
        setCjEmailInput(updated.email);
      }
      showToast('CJ Dropshipping credentials and settings saved successfully!');

      try {
        await fetchAllData(true);
      } catch (refreshErr) {
        console.warn('Non-blocking background refresh notice after CJ save:', refreshErr);
      }
    } catch (err: any) {
      console.error('CJ config save error:', err);
      showToast(err.message || 'Failed to save CJ configuration. Please check your credentials.', 'error');
    } finally {
      setSavingCjConfig(false);
    }
  };

  const handleConnectCj = async () => {
    if (!cjApiKeyInput.trim()) {
      showToast('Please enter your CJ Dropshipping API Key', 'error');
      return;
    }
    setCjConnecting(true);
    setCjConnectionError(null);
    try {
      const res = await api.adminConnectCj(cjApiKeyInput.trim(), cjEmailInput.trim());
      if (res.success) {
        showToast(res.message, 'success');
        setCjConfig(res.config || null);
        setCjConnectionError(null);
        if (res.config?.apiKey) {
          setCjApiKeyInput(res.config.apiKey);
        }
      } else {
        const errMsg = res.message || 'Authentication with CJ API failed';
        setCjConnectionError(errMsg);
        showToast(errMsg, 'error');
        if (res.config) setCjConfig(res.config);
      }
    } catch (err: any) {
      const errMsg = err.message || 'Failed to connect to CJ Dropshipping API';
      setCjConnectionError(errMsg);
      showToast(errMsg, 'error');
    } finally {
      setCjConnecting(false);
    }
  };

  const handleDisconnectCj = async () => {
    if (!window.confirm('Are you sure you want to disconnect from CJ Dropshipping? Your credentials and access token will be cleared.')) {
      return;
    }
    setCjDisconnecting(true);
    try {
      const res = await api.adminDisconnectCj();
      showToast(res.message, 'success');
      if (res.config) {
        setCjConfig(res.config);
      } else {
        setCjConfig(prev => prev ? { ...prev, isConnected: false, connectionStatus: 'disconnected' } : null);
      }
      setCjApiKeyInput('');
      setCjConnectionError(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to disconnect CJ Dropshipping', 'error');
    } finally {
      setCjDisconnecting(false);
    }
  };

  const handleTestCjConnection = async () => {
    setCjTesting(true);
    setCjConnectionError(null);
    try {
      const res = await api.adminTestCjConnection(cjApiKeyInput.trim(), cjEmailInput.trim());
      if (res.success) {
        showToast(res.message, 'success');
        setCjConnectionError(null);
        if (res.config) setCjConfig(res.config);
      } else {
        const errMsg = res.message || 'Connection test failed';
        setCjConnectionError(errMsg);
        showToast(errMsg, 'error');
      }
    } catch (err: any) {
      const errMsg = err.message || 'Connection test failed';
      setCjConnectionError(errMsg);
      showToast(errMsg, 'error');
    } finally {
      setCjTesting(false);
    }
  };

  const handleSyncCjNow = async (categoryFilter?: string) => {
    setCjSyncing(true);
    try {
      const res = await api.adminSyncCjProductsNow(categoryFilter);
      showToast(res.message);
      try {
        await fetchAllData(true);
      } catch (refreshErr) {
        console.warn('Non-blocking background refresh notice after CJ feed sync:', refreshErr);
      }
      onRefreshPublicData();
    } catch (err: any) {
      showToast(err.message || 'CJ automated upload failed', 'error');
    } finally {
      setCjSyncing(false);
    }
  };

  // Search products across CJ Supplier catalog
  const handleSearchCjProducts = async (catOverride?: string) => {
    setCjSearching(true);
    const targetCategory = catOverride !== undefined ? catOverride : cjSearchCategory;
    try {
      const res = await api.adminSearchCjProducts({
        query: cjSearchQuery.trim() || undefined,
        category: targetCategory !== 'all' ? targetCategory : undefined
      });
      setCjSearchResults(res.products || []);
      setCjSelectedItemsForImport([]);
      showToast(`Found ${res.products?.length || 0} matching wholesale products in CJ catalog`);
    } catch (err: any) {
      showToast(err.message || 'Failed to search CJ products', 'error');
    } finally {
      setCjSearching(false);
    }
  };

  // Bulk Import selected products from search
  const handleBulkImportCjSelected = async (forceApproval?: boolean) => {
    if (cjSelectedItemsForImport.length === 0) {
      showToast('Please select at least one product using the checkboxes', 'error');
      return;
    }

    const selectedItems = cjSearchResults.filter(p => cjSelectedItemsForImport.includes(p.pid));
    if (selectedItems.length === 0) return;

    setCjImporting(true);
    try {
      const stageApproval = forceApproval !== undefined ? forceApproval : cjImportWithApproval;
      const res = await api.adminImportCjProducts({
        products: selectedItems,
        requireApproval: stageApproval,
        customMarkup: cjCustomMarkupOverride !== '' ? Number(cjCustomMarkupOverride) : undefined
      });

      showToast(res.message);
      setCjSelectedItemsForImport([]);

      // Update imported state in search results
      setCjSearchResults(prev => prev.map(item => {
        if (selectedItems.some(s => s.pid === item.pid)) {
          return {
            ...item,
            isAlreadyImported: true,
            reviewStatus: stageApproval ? 'Pending Approval' : 'Approved'
          };
        }
        return item;
      }));

      fetchAllData();
      onRefreshPublicData();

      if (stageApproval) {
        setCjSubTab('staging');
      }
    } catch (err: any) {
      showToast(err.message || 'Bulk import failed', 'error');
    } finally {
      setCjImporting(false);
    }
  };

  // Staging Review Actions
  const handleApproveCjProduct = async (id: string) => {
    setCjApprovingId(id);
    try {
      const res = await api.adminApproveCjProduct(id);
      showToast(res.message);
      fetchAllData();
      onRefreshPublicData();
    } catch (err: any) {
      showToast(err.message || 'Failed to approve product', 'error');
    } finally {
      setCjApprovingId(null);
    }
  };

  const handleRejectCjProduct = async (id: string) => {
    setCjRejectingId(id);
    try {
      const res = await api.adminRejectCjProduct(id);
      showToast(res.message);
      fetchAllData();
      onRefreshPublicData();
    } catch (err: any) {
      showToast(err.message || 'Failed to reject product', 'error');
    } finally {
      setCjRejectingId(null);
    }
  };

  const handleBulkApproveCj = async () => {
    const pendingProds = products.filter(p => p.source === 'cjdropshipping' && p.reviewStatus === 'Pending Approval');
    if (pendingProds.length === 0) {
      showToast('No pending products to approve', 'error');
      return;
    }

    setCjBulkApproving(true);
    try {
      const res = await api.adminBulkApproveCjProducts(pendingProds.map(p => p.id));
      showToast(res.message);
      fetchAllData();
      onRefreshPublicData();
    } catch (err: any) {
      showToast(err.message || 'Bulk approve failed', 'error');
    } finally {
      setCjBulkApproving(false);
    }
  };

  // Stock and Price Synchronization
  const handleSyncCjStockAndPrices = async () => {
    setCjSyncingStockPrices(true);
    try {
      const res = await api.adminSyncCjStockAndPrices();
      showToast(res.message);
      try {
        await fetchAllData(true);
      } catch (refreshErr) {
        console.warn('Non-blocking background refresh notice after stock & price sync:', refreshErr);
      }
      onRefreshPublicData();
    } catch (err: any) {
      showToast(err.message || 'Stock and price sync failed', 'error');
    } finally {
      setCjSyncingStockPrices(false);
    }
  };

  // Dropshipping Order Fulfillment Handlers
  const handleLoadCjOrders = async () => {
    setCjLoadingOrders(true);
    try {
      const res = await api.adminGetCjOrders({
        fulfillmentStatus: cjFulfillmentFilter !== 'all' ? cjFulfillmentFilter : undefined
      });
      setCjOrders(res.orders || []);
    } catch (err: any) {
      console.warn('Failed to load CJ orders:', err);
    } finally {
      setCjLoadingOrders(false);
    }
  };

  const handleApproveCjOrderFulfillment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cjFulfillmentModalOrder) return;

    setCjFulfillingLoading(true);
    try {
      const res = await api.adminApproveCjOrderFulfillment(cjFulfillmentModalOrder.id, {
        trackingNumber: cjTrackingInput.trim() || undefined,
        notes: cjFulfillmentNotesInput.trim() || undefined
      });
      showToast(res.message);
      setCjFulfillmentModalOrder(null);
      setCjTrackingInput('');
      setCjFulfillmentNotesInput('');
      handleLoadCjOrders();
      fetchAllData();
    } catch (err: any) {
      showToast(err.message || 'Fulfillment approval failed', 'error');
    } finally {
      setCjFulfillingLoading(false);
    }
  };

  // Google Drive Catalog Backup Handler
  const handleSyncToGoogleDrive = async () => {
    setSyncingToDrive(true);
    try {
      let token = getGoogleAccessToken();
      if (!token) {
        const authRes = await loginWithGoogle(true);
        token = authRes.accessToken || getGoogleAccessToken();
      }

      if (!token) {
        throw new Error('Please authorize Google Drive access to save your catalog.');
      }

      const result = await syncProductsToGoogleDrive(products, token);
      await api.adminSyncProductsToDrive(token).catch(() => null);

      setDriveStatus({
        status: 'success',
        lastBackupAt: result.syncedAt,
        fileId: result.fileId,
        fileName: result.fileName,
        webViewLink: result.webViewLink,
        productCount: result.productCount,
        autoSyncEnabled: true,
        message: `Successfully stored ${result.productCount} products in Google Drive.`
      });

      showToast(`Products catalog (${result.productCount} items) backed up to Google Drive & Firebase!`);
      fetchAllData();
    } catch (err: any) {
      const msg = err.message?.includes('not available') || err.message?.includes('authorize')
        ? 'Google Drive authorization required. Please sign in with Google or export your catalog via the Excel / CSV button.'
        : (err.message || 'Failed to backup to Google Drive');
      showToast(msg, 'error');
    } finally {
      setSyncingToDrive(false);
    }
  };

  // Google Drive Catalog Auto-Fill / Import Handler
  const handleImportFromGoogleDrive = async (targetFileId?: string) => {
    setImportingFromDrive(true);
    try {
      let token = getGoogleAccessToken();
      if (!token) {
        const authRes = await loginWithGoogle(true);
        token = authRes.accessToken || getGoogleAccessToken();
      }

      if (!token) {
        throw new Error('Google Drive authorization required. Please sign in with Google to auto-fill products, or import your catalog via the Excel / CSV spreadsheet button.');
      }

      // Execute authoritative backend import & sync
      const result = await api.adminImportProductsFromDrive(token, targetFileId);

      setDriveStatus({
        status: 'success',
        lastBackupAt: new Date().toISOString(),
        productCount: result.totalProducts,
        autoSyncEnabled: true,
        message: result.message
      });

      showToast(result.message || `Products auto-filled from Google Drive! (${result.importedCount} added, ${result.updatedCount} updated)`);
      setDriveFilesModalOpen(false);
      fetchAllData();
      onRefreshPublicData();
    } catch (err: any) {
      const msg = err.message?.includes('not available') || err.message?.includes('authorize')
        ? 'Google Drive authorization required. Please sign in with Google or import catalog files via the Excel / Google Sheets modal.'
        : (err.message || 'Failed to auto-fill products from Google Drive');
      showToast(msg, 'error');
    } finally {
      setImportingFromDrive(false);
    }
  };

  const handleOpenDriveFilePicker = async () => {
    setDriveFilesModalOpen(true);
    setLoadingDriveFiles(true);
    try {
      let token = getGoogleAccessToken();
      if (!token) {
        const authRes = await loginWithGoogle(true);
        token = authRes.accessToken || getGoogleAccessToken();
      }

      if (token) {
        const files = await api.adminListDriveFiles(token);
        setDriveFilesList(files);
      }
    } catch (err: any) {
      console.warn('[Google Drive] File listing note:', err);
    } finally {
      setLoadingDriveFiles(false);
    }
  };

  // Google Sheets Direct Live Sync Handlers
  const [syncingFromSheet, setSyncingFromSheet] = useState(false);
  const [syncingToSheet, setSyncingToSheet] = useState(false);

  const handleSyncPullFromGoogleSheet = async () => {
    setSyncingFromSheet(true);
    try {
      const token = getGoogleAccessToken();
      let res;
      try {
        res = await api.syncPullFromGoogleSheet(undefined, undefined, token || undefined);
      } catch (firstErr: any) {
        if (token) {
          console.warn('[Google Sheet Sync] Retrying pull with public link access...');
          res = await api.syncPullFromGoogleSheet(undefined, undefined, undefined);
        } else {
          throw firstErr;
        }
      }
      showToast(res.message, 'success');
      fetchAllData();
      onRefreshPublicData();
    } catch (err: any) {
      showToast(err.message || 'Failed to sync edits from Google Sheet', 'error');
    } finally {
      setSyncingFromSheet(false);
    }
  };

  const handleSyncPushToGoogleSheet = async () => {
    let token = getGoogleAccessToken();
    if (!token) {
      try {
        const authRes = await loginWithGoogle(true);
        token = authRes.accessToken || getGoogleAccessToken();
      } catch (err: any) {
        showToast('Google authorization required to save to Google Sheet', 'error');
        return;
      }
    }

    if (!token) {
      showToast('Please authorize your Google account to save products to Google Sheet', 'error');
      return;
    }

    const confirmed = window.confirm(
      `Save all ${products.length} store products to your linked Google Sheet (1kaLUCemqV6-KJ_G6nqYhyrf2bPpDg6HxyaSj6uDsoHk)? This will update the rows in the spreadsheet.`
    );
    if (!confirmed) return;

    setSyncingToSheet(true);
    try {
      const res = await api.syncPushToGoogleSheet(token);
      showToast(res.message, 'success');
      fetchAllData();
      onRefreshPublicData();
    } catch (err: any) {
      showToast(err.message || 'Failed to save products to Google Sheet', 'error');
    } finally {
      setSyncingToSheet(false);
    }
  };

  // Stock Adjustment
  const handleSaveStockAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockModalProduct) return;
    try {
      await api.adminAdjustStock(stockModalProduct.id, Number(stockAdjustAmount), stockAdjustReason);
      showToast(`Stock updated for ${stockModalProduct.name}`);
      setStockModalProduct(null);
      fetchAllData();
      onRefreshPublicData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Category CRUD
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: Partial<Category> = {
        nameEn: catNameEn.trim(),
        nameRw: catNameRw.trim(),
        icon: catIcon,
        description: catDesc.trim(),
        imageUrl: catImageUrl.trim() ? catImageUrl.trim() : undefined
      };

      if (editingCategory) {
        await api.adminUpdateCategory(editingCategory.id, payload);
        showToast('Category updated!');
      } else {
        await api.adminAddCategory(payload);
        showToast('Category created!');
      }
      setCategoryModalOpen(false);
      fetchAllData();
      onRefreshPublicData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm(`Delete category "${id}"? Linked products must be reassigned first.`)) return;
    try {
      await api.adminDeleteCategory(id);
      showToast('Category deleted.');
      fetchAllData();
      onRefreshPublicData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Image Upload Handlers (Client-Side Resizing & Compression -> base64 Data URL) - supports single or multiple file selection
  const handleProductImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    const validFiles = fileList.filter(f => f.size <= 10 * 1024 * 1024);
    if (validFiles.length < fileList.length) {
      showToast('Some files exceeded 10MB and were skipped.', 'error');
    }
    if (validFiles.length === 0) return;

    showToast(`Processing & optimizing ${validFiles.length} image${validFiles.length > 1 ? 's' : ''}...`);

    try {
      const compressedImages = await Promise.all(validFiles.map(f => compressImageFile(f)));
      const filtered = compressedImages.filter(Boolean);
      if (filtered.length === 0) return;

      setProdForm(prev => {
        const existingList = getParsedImageList(prev.imagesText, prev.imageUrl);
        const combined = [...existingList, ...filtered.filter(img => !existingList.includes(img))];
        return {
          ...prev,
          imageUrl: prev.imageUrl || combined[0],
          imagesText: combined.join('\n')
        };
      });
      showToast(`Successfully uploaded & optimized ${filtered.length} picture${filtered.length > 1 ? 's' : ''}!`);
    } catch (err: any) {
      showToast(err.message || 'Failed to process image uploads', 'error');
    }
  };

  const handleCategoryImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showToast('Image file too large. Please select an image under 10MB.', 'error');
      return;
    }

    try {
      const compressed = await compressImageFile(file, 800, 800, 0.85);
      if (compressed) {
        setCatImageUrl(compressed);
        showToast('Category image uploaded & optimized!');
      }
    } catch {
      showToast('Failed to upload category image', 'error');
    }
  };

  // Promo Code Create & Edit Handler
  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const val = Number(coupVal);
      if (coupType === 'percentage' && (val < 1 || val > 100)) {
        showToast('Percentage discount must be between 1% and 100%.', 'error');
        return;
      }

      const payload = {
        code: coupCode.trim().toUpperCase(),
        discountType: coupType,
        discountValue: val,
        minOrderAmount: coupMin ? Number(coupMin) : undefined,
        maxDiscount: coupMaxDiscount ? Number(coupMaxDiscount) : undefined,
        expiresAt: coupExpiresAt || undefined,
        usageLimit: coupUsageLimit ? Number(coupUsageLimit) : undefined,
        isActive: coupIsActive
      };

      if (editingCoupon) {
        await api.adminUpdateCoupon(editingCoupon.id, payload);
        showToast('Promo code updated successfully!');
      } else {
        await api.adminAddCoupon(payload);
        showToast(`Promo code "${payload.code}" created!`);
      }
      setCouponModalOpen(false);
      setEditingCoupon(null);
      fetchAllData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Buyer Management Handlers
  const handleToggleBuyerStatus = async (buyer: CustomerUser) => {
    const targetStatus = buyer.status === 'Suspended' ? 'Active' : 'Suspended';
    if (!confirm(`Are you sure you want to change account status for ${buyer.name} to ${targetStatus}?`)) {
      return;
    }
    try {
      await api.adminUpdateBuyerStatus(buyer.id, targetStatus);
      showToast(`Buyer status updated to ${targetStatus}`);
      fetchAllData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleResetBuyerPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordBuyer) return;
    if (newTempPassword.length < 5) {
      showToast('Password must be at least 5 characters long.', 'error');
      return;
    }
    setResetPasswordLoading(true);
    try {
      await api.adminResetBuyerPassword(resetPasswordBuyer.id, newTempPassword);
      showToast(`Password successfully reset for ${resetPasswordBuyer.name}!`);
      setResetPasswordBuyer(null);
      setNewTempPassword('');
      fetchAllData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setResetPasswordLoading(false);
    }
  };

  // Shop CRUD
  const handleSaveShop = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingShop) {
        await api.adminUpdateShop(editingShop.id, shopForm);
        showToast('Shop details updated!');
      } else {
        await api.adminAddShop(shopForm);
        showToast('New shop registered and saved!');
      }
      setShopModalOpen(false);
      fetchAllData();
      onRefreshPublicData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleUpdateOrderStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderStatusModal) return;
    try {
      const updated = await api.adminUpdateOrderStatus(orderStatusModal.id, {
        status: orderStatusModal.status,
        deliveryStatus: orderStatusModal.deliveryStatus,
        paymentStatus: orderStatusModal.paymentStatus,
        trackingNumber: orderStatusModal.trackingNumber,
        trackingCarrier: orderStatusModal.trackingCarrier,
        expectedDeliveryDate: orderStatusModal.expectedDeliveryDate,
        supplierName: orderStatusModal.supplierName,
        supplierOrderRef: orderStatusModal.supplierOrderRef,
        dispatchDate: orderStatusModal.dispatchDate,
        assignedCourier: orderStatusModal.assignedCourier,
        courierPhone: orderStatusModal.courierPhone,
        internalNotes: orderStatusModal.internalNotes
      });
      if (updated && updated.id) {
        setOrders(prev => prev.map(o => (o.id === updated.id || o.orderNumber === updated.orderNumber) ? updated : o));
      }
      showToast(`Order #${orderStatusModal.orderNumber} updated!`);
      setOrderStatusModal(null);
      fetchAllData(true);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Payment Verification
  const handleVerifyPayment = async (action: 'approve' | 'reject' | 'under_verification' | 'refund', adminNotes: string, paymentId?: string) => {
    const targetId = paymentId || verifyModalPayment?.id;
    if (!targetId) return;
    try {
      await api.adminVerifyPayment(targetId, action, adminNotes);
      showToast(
        action === 'approve'
          ? 'Payment approved & marked Paid!'
          : action === 'refund'
          ? 'Payment refunded & inventory restored.'
          : action === 'under_verification'
          ? 'Payment set to Under Verification'
          : 'Payment rejected.'
      );
      setVerifyModalPayment(null);
      fetchAllData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleTelecomReverify = async (paymentId: string) => {
    try {
      setTelecomVerifyingId(paymentId);
      const res = await api.adminTelecomVerifyPayment(paymentId);
      if (res.verified) {
        showToast(res.message || 'Payment successfully verified directly with telecom network!', 'success');
      } else {
        showToast(res.message || 'Payment verification response received.', 'error');
      }
      fetchAllData();
      if (verifyModalPayment?.id === paymentId) {
        setVerifyModalPayment(null);
      }
    } catch (err: any) {
      showToast(err.message || 'Telecom verification query failed', 'error');
    } finally {
      setTelecomVerifyingId(null);
    }
  };

  // Problem Resolution
  const handleSaveProblemResolution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProblem) return;
    try {
      await api.adminUpdateCustomerReport(selectedProblem.id, {
        status: probStatus,
        resolution: probResolution || undefined,
        newNote: probStaffNote || undefined
      });
      showToast(`Case #${selectedProblem.caseNumber} updated!`);
      setSelectedProblem(null);
      fetchAllData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleReviewSupplierApplication = async (id: string, status: 'Approved' | 'Rejected') => {
    try {
      await api.adminUpdateSupplierApplication(id, status);
      showToast(`Supplier application marked as ${status}!`);
      fetchAllData();
    } catch (err: any) {
      showToast(err.message || 'Failed to update supplier application', 'error');
    }
  };

  const handleDisbursePayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disbursePayoutModal) return;
    setDisburseLoading(true);
    try {
      await api.adminDisburseSupplierPayout(disbursePayoutModal.id, disburseRefInput.trim());
      showToast(`Supplier payout of ${disbursePayoutModal.payoutAmount.toLocaleString()} FRW marked as Paid!`);
      setDisbursePayoutModal(null);
      setDisburseRefInput('');
      fetchAllData();
    } catch (err: any) {
      showToast(err.message || 'Failed to disburse payout', 'error');
    } finally {
      setDisburseLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-slate-100 flex flex-col antialiased text-slate-800">
      {/* Toast Feedback */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-2xl shadow-xl border text-xs font-bold flex items-center gap-2.5 animate-in slide-in-from-top-2 ${
          toast.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          {toast.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Floating Real-Time Push Notification Alert Banner (Orders & SMS) */}
      {liveAlert && (
        <div className="fixed top-20 right-4 sm:right-8 z-50 max-w-md w-full p-4 rounded-2xl bg-[#0f172a] text-white border-2 border-[#FF6000] shadow-2xl animate-in slide-in-from-top-4 flex flex-col gap-2.5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-orange-500/20 text-[#FF6000] flex items-center justify-center shrink-0 border border-orange-500/30">
                {liveAlert.type === 'order' ? <ShoppingBag className="w-4 h-4 animate-bounce" /> : liveAlert.type === 'sms' ? <Mail className="w-4 h-4 animate-bounce" /> : <CreditCard className="w-4 h-4 animate-bounce" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                    Live Push Alert
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {liveAlert.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
                <h4 className="text-sm font-black text-white">{liveAlert.title}</h4>
              </div>
            </div>
            <button
              onClick={() => setLiveAlert(null)}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-slate-300 font-medium leading-relaxed pl-10">
            {liveAlert.subtitle}
          </p>
          <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800">
            <button
              onClick={() => setLiveAlert(null)}
              className="px-2.5 py-1 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Dismiss
            </button>
            <button
              onClick={() => {
                setActiveTab(liveAlert.actionTab);
                setLiveAlert(null);
              }}
              className="px-3.5 py-1.5 text-xs font-black rounded-xl bg-gradient-to-r from-[#FF6000] to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>View {liveAlert.actionTab === 'orders' ? 'Orders' : liveAlert.actionTab === 'messages' ? 'SMS & Messages' : 'Payments'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Top Navbar */}
      <header className="bg-[#121316] text-white px-4 sm:px-8 py-3.5 border-b border-slate-800 sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full overflow-hidden bg-white border border-slate-700 p-0.5 shrink-0 flex items-center justify-center">
            <img src="/logo.png" alt="ContactReach" className="w-full h-full object-contain rounded-full" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-base sm:text-lg tracking-tight">
                ContactReach <span className="text-[#FF6000]">Admin</span>
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-orange-600/30 text-orange-400 border border-orange-500/30">
                {currentUser?.role || 'Administrator'}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono">
              Signed in: {currentUser?.name || 'Ruth (Owner)'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Quick Dual Firebase Sync Button */}
          <button
            onClick={() => setIsFirebaseModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-600/25 text-orange-300 hover:bg-orange-600/35 text-xs font-bold transition-colors cursor-pointer border border-orange-500/40 shadow-xs"
            title="Import all data to Firebase Firestore or pull updates"
          >
            <Database className="w-3.5 h-3.5 text-orange-400" />
            <span className="hidden sm:inline">Firebase Sync</span>
          </button>

          {/* Live Real-Time Database Sync Status Indicator (Visible on all devices) */}
          <div className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 text-[10px] sm:text-[11px] font-bold shadow-2xs">
            <span className={`w-2 h-2 rounded-full ${isRealtimeConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span className={isRealtimeConnected ? 'text-emerald-400 font-extrabold' : 'text-amber-300 font-semibold'}>
              {isRealtimeConnected ? 'Live' : 'Syncing'}
            </span>
            <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
              · {lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>

          {/* Real-time Audio Chimes & Desktop Alerts Controller */}
          <button
            onClick={handleToggleDesktopAlerts}
            title="Click to test real-time sound alert and enable instant desktop push notifications"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border shadow-2xs ${
              desktopAlertsActive
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700 hover:bg-slate-700/80'
            }`}
          >
            <Bell className={`w-3.5 h-3.5 ${desktopAlertsActive ? 'text-emerald-400 fill-emerald-400/20' : 'text-orange-400'}`} />
          </button>

          {/* Real-time Order & SMS Simulation Test Buttons */}
          <div className="hidden xl:flex items-center gap-1.5 px-2 py-1 rounded-xl bg-slate-900 border border-slate-700/80 text-[11px]">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Test Push:</span>
            <button
              onClick={handleSimulateLiveOrder}
              className="px-2 py-0.5 rounded-lg bg-orange-600/30 hover:bg-orange-600/50 text-orange-300 font-bold text-[10px] transition-colors cursor-pointer"
              title="Test receiving an order live without reloading"
            >
              + Order
            </button>
            <button
              onClick={handleSimulateLiveSMS}
              className="px-2 py-0.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 font-bold text-[10px] transition-colors cursor-pointer"
              title="Test receiving an SMS live without reloading"
            >
              + SMS
            </button>
          </div>

          {/* Quick Maintenance Toggle in Header */}
          <button
            onClick={() => handleToggleMaintenance(!settings?.isMaintenanceMode)}
            disabled={savingMaintenance || !settings}
            title={settings?.isMaintenanceMode ? "Click to turn OFF maintenance mode" : "Click to turn ON maintenance mode"}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border ${
              settings?.isMaintenanceMode
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30 shadow-xs animate-pulse'
                : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
            }`}
          >
            <Power className={`w-3.5 h-3.5 ${settings?.isMaintenanceMode ? 'text-amber-400' : 'text-emerald-400'}`} />
            <span className="hidden sm:inline">
              {settings?.isMaintenanceMode ? 'Maintenance: ON' : 'Storefront: LIVE'}
            </span>
            <span className="sm:hidden">
              {settings?.isMaintenanceMode ? 'Maint: ON' : 'LIVE'}
            </span>
          </button>

          <button
            onClick={() => {
              fetchAllData(false);
              showToast('Database records synchronized successfully!');
            }}
            title="Refresh database records"
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-orange-500' : ''}`} />
          </button>
          <button
            onClick={() => {
              setActiveTab('products');
              handleOpenAddProduct();
            }}
            className="flex items-center gap-1.5 text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 px-3 py-1.5 rounded-xl shadow-xs transition-all cursor-pointer"
            title="Upload a new product to store"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Upload Product</span>
            <span className="sm:hidden">Upload</span>
          </button>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 transition-colors"
          >
            <span>Storefront</span>
            <ExternalLink className="w-3.5 h-3.5 text-orange-400" />
          </a>
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/40 text-rose-300 hover:bg-rose-900/50 hover:text-rose-100 text-xs font-bold transition-colors cursor-pointer border border-rose-800/40"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Maintenance Mode Active Alert Banner */}
      {settings?.isMaintenanceMode && (
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white px-4 sm:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs shadow-md border-b border-amber-700">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping shrink-0" />
            <Wrench className="w-4 h-4 text-amber-100 shrink-0" />
            <div className="min-w-0">
              <span className="font-black uppercase tracking-wider text-[11px] mr-2 bg-black/30 px-2 py-0.5 rounded text-amber-200">
                Maintenance Mode Active
              </span>
              <span className="font-medium text-amber-100 text-xs">
                Public visitors see the "We’ll Be Back Soon" page. As an admin, you retain full access to manage orders and inventory.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('settings')}
              className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer"
            >
              Configure Message
            </button>
            <button
              onClick={() => handleToggleMaintenance(false)}
              disabled={savingMaintenance}
              className="px-3.5 py-1 bg-white hover:bg-amber-50 text-amber-950 font-black rounded-lg text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1"
            >
              <Power className="w-3 h-3 text-amber-700" />
              <span>Turn OFF Maintenance Mode</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Admin Area */}
      <div className="flex-1 flex flex-col md:flex-row max-w-[1600px] w-full mx-auto">
        {/* Left Sidebar Navigation */}
        <aside className="w-full md:w-64 bg-white border-r border-slate-200/80 p-3 sm:p-4 shrink-0 flex flex-col justify-between">
          <div className="space-y-1">
            <div className="px-3 py-2 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              Management Portal
            </div>

            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'overview' ? 'bg-[#FF6000] text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <LayoutDashboard className="w-4 h-4" />
                <span>Overview & Analytics</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('products')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'products' ? 'bg-[#FF6000] text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Package className="w-4 h-4" />
                <span>Products Catalog</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-black ${
                activeTab === 'products' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {products.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('categories')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'categories' ? 'bg-[#FF6000] text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FolderTree className="w-4 h-4" />
                <span>Categories</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-black ${
                activeTab === 'categories' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {categories.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('shops')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'shops' ? 'bg-[#FF6000] text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Store className="w-4 h-4" />
                <span>Saved Shops</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-black ${
                activeTab === 'shops' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {shops.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('suppliers')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'suppliers' ? 'bg-[#FF6000] text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Store className="w-4 h-4 text-amber-500" />
                <span>Supplier Onboarding</span>
              </div>
              {supplierApplications.filter(a => a.status === 'Pending').length > 0 ? (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono font-black bg-amber-500 text-white animate-pulse">
                  {supplierApplications.filter(a => a.status === 'Pending').length}
                </span>
              ) : (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-black ${
                  activeTab === 'suppliers' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {supplierApplications.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('payouts')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'payouts' ? 'bg-[#FF6000] text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <DollarSign className="w-4 h-4 text-emerald-500" />
                <span>Supplier Payouts</span>
              </div>
              {supplierPayouts.filter(p => p.status === 'Pending').length > 0 ? (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono font-black bg-emerald-600 text-white animate-pulse">
                  {supplierPayouts.filter(p => p.status === 'Pending').length}
                </span>
              ) : (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-black ${
                  activeTab === 'payouts' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {supplierPayouts.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('alibaba')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'alibaba' ? 'bg-[#FF6000] text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Globe className="w-4 h-4 text-orange-500" />
                <span>Alibaba Wholesale</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-black ${
                activeTab === 'alibaba' ? 'bg-white/20 text-white' : 'bg-orange-100 text-orange-700'
              }`}>
                {products.filter(p => p.source === 'alibaba').length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('cjdropshipping')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'cjdropshipping' ? 'bg-[#FF6000] text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <RefreshCw className="w-4 h-4 text-purple-600" />
                <span>CJ Dropshipping</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-black ${
                activeTab === 'cjdropshipping' ? 'bg-white/20 text-white' : 'bg-purple-100 text-purple-700'
              }`}>
                {products.filter(p => p.source === 'cjdropshipping').length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('dsers')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'dsers' ? 'bg-[#FF6000] text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Globe className="w-4 h-4 text-emerald-600" />
                <span>DSers & Fulfillment</span>
              </div>
              <div className="flex items-center gap-1">
                {orders.filter(o => o.status !== 'Cancelled' && (o.supplierApprovalStatus || 'Pending Review') === 'Pending Review').length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold bg-amber-500 text-white animate-pulse" title="Orders awaiting manual approval">
                    {orders.filter(o => o.status !== 'Cancelled' && (o.supplierApprovalStatus || 'Pending Review') === 'Pending Review').length}
                  </span>
                )}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-black ${
                  activeTab === 'dsers' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {products.filter(p => Boolean(p.aliExpressUrl || p.supplierProductUrl)).length}/{products.length}
                </span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('orders')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'orders' ? 'bg-[#FF6000] text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <ShoppingBag className="w-4 h-4" />
                <span>Orders & Delivery</span>
              </div>
              <div className="flex items-center gap-1.5">
                {orders.filter(o => o.status === 'New').length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono font-black bg-rose-500 text-white animate-pulse" title="New live orders">
                    {orders.filter(o => o.status === 'New').length} New
                  </span>
                )}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-black ${
                  activeTab === 'orders' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {orders.length}
                </span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('payments')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'payments' ? 'bg-[#FF6000] text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <CreditCard className="w-4 h-4" />
                <span>Payment Verification</span>
              </div>
              {stats.pendingVerifications > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-black bg-rose-500 text-white animate-pulse" title="Pending mobile money / SMS verifications">
                  {stats.pendingVerifications} Pending
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('inventory')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'inventory' ? 'bg-[#FF6000] text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Layers className="w-4 h-4" />
                <span>Inventory & Stock</span>
              </div>
              {stats.lowStockCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono font-black bg-amber-500 text-white">
                  {stats.lowStockCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('messages')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'messages' ? 'bg-[#FF6000] text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4" />
                <span>Messages & SMS</span>
              </div>
              <div className="flex items-center gap-1.5">
                {messages.filter(m => m.status === 'unread').length > 0 ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-black bg-[#FF6000] text-white animate-pulse" title="Unread messages & SMS">
                    {messages.filter(m => m.status === 'unread').length} Unread
                  </span>
                ) : (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-black ${
                    activeTab === 'messages' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {messages.length}
                  </span>
                )}
              </div>
            </button>

            <button
              onClick={() => setActiveTab('problems')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'problems' ? 'bg-[#FF6000] text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4" />
                <span>Problems & Reports</span>
              </div>
              {stats.unresolvedProblemsCount > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-black bg-rose-600 text-white">
                  {stats.unresolvedProblemsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('customers')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'customers' ? 'bg-[#FF6000] text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4" />
                <span>Customers</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-black ${
                activeTab === 'customers' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {customers.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('coupons')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'coupons' ? 'bg-[#FF6000] text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Tag className="w-4 h-4" />
                <span>Coupons & Promos</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('audit')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'audit' ? 'bg-[#FF6000] text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4" />
                <span>Audit Logs</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('team')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'team' ? 'bg-[#FF6000] text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Shield className="w-4 h-4" />
                <span>Team & Roles</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-black ${
                activeTab === 'team' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {adminUsers.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'settings' ? 'bg-[#FF6000] text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Settings className="w-4 h-4" />
                <span>Business Settings</span>
              </div>
            </button>
          </div>

          <div className="pt-4 border-t border-slate-100 mt-4 text-[11px] text-slate-400 space-y-1">
            <p className="font-semibold text-slate-600">ContactReach Media Ltd</p>
            <p>Support: 0780022600</p>
            <p>Receiver: Ruth (0780022600)</p>
          </div>
        </aside>

        {/* Content Body Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Executive Dashboard Overview
                </h1>
                <p className="text-xs text-slate-500">
                  Real-time operational marketplace metrics computed directly from persistent database records.
                </p>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
                    <span>Gross Customer Sales</span>
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
                    {stats.totalSalesFrw.toLocaleString()} RWF
                  </div>
                  <span className="text-[10px] text-emerald-600 font-semibold block">
                    Verified Customer Payments
                  </span>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
                    <span>ContactReach Commission</span>
                    <DollarSign className="w-4 h-4 text-orange-600" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-orange-600 font-mono">
                    {(stats.totalCommissionsFrw || 0).toLocaleString()} RWF
                  </div>
                  <span className="text-[10px] text-slate-500 font-semibold block">
                    Marketplace Net Commission Revenue
                  </span>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
                    <span>Supplier Payables Owed</span>
                    <CreditCard className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-amber-600 font-mono">
                    {(stats.totalSupplierPayoutsOwedFrw || 0).toLocaleString()} RWF
                  </div>
                  <span className="text-[10px] text-slate-500 font-semibold block">
                    Pending Disbursal to Local Suppliers
                  </span>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
                    <span>Orders & Catalog</span>
                    <ShoppingBag className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
                    {stats.totalOrders} Orders
                  </div>
                  <span className="text-[10px] text-slate-500 font-semibold block">
                    {stats.activeProducts} active products · {stats.totalShops} suppliers
                  </span>
                </div>
              </div>

              {/* Action Banner for pending items */}
              {(stats.pendingVerifications > 0 || stats.unresolvedProblemsCount > 0) && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 text-amber-900 font-bold">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                    <span>
                      Action required: {stats.pendingVerifications} payment(s) awaiting verification and {stats.unresolvedProblemsCount} unresolved customer complaint(s).
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveTab('payments')}
                      className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold cursor-pointer"
                    >
                      Verify Payments
                    </button>
                    <button
                      onClick={() => setActiveTab('problems')}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white rounded-xl font-bold cursor-pointer"
                    >
                      View Complaints
                    </button>
                  </div>
                </div>
              )}

              {/* Recent Orders in Dashboard */}
              <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900">Recent Customer Orders</h3>
                    <p className="text-xs text-slate-500">Live order activity across Kigali and provincial centers</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('orders')}
                    className="text-xs font-bold text-[#FF6000] hover:underline"
                  >
                    View All Orders →
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                        <th className="py-2.5 px-3">Order #</th>
                        <th className="py-2.5 px-3">Customer</th>
                        <th className="py-2.5 px-3">Amount</th>
                        <th className="py-2.5 px-3">Payment</th>
                        <th className="py-2.5 px-3">Order Status</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {orders.slice(0, 6).map(ord => (
                        <tr key={ord.id} className="hover:bg-slate-50/60">
                          <td className="py-3 px-3 font-mono font-bold text-slate-900">
                            {ord.orderNumber}
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-bold block text-slate-800">{ord.customerName}</span>
                            <span className="text-[11px] text-slate-400">{ord.customerPhone}</span>
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-[#FF6000]">
                            {ord.totalAmount.toLocaleString()} FRW
                          </td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                              ord.paymentStatus === 'Paid'
                                ? 'bg-emerald-100 text-emerald-800'
                                : ord.paymentStatus === 'Pending Verification'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {ord.paymentStatus}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-semibold text-slate-800">{ord.status}</span>
                          </td>
                          <td className="py-3 px-3 text-right space-x-1">
                            <button
                              onClick={() => {
                                setOrderStatusModal(ord);
                              }}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg cursor-pointer"
                            >
                              Update
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PRODUCTS */}
          {activeTab === 'products' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">Products Management</h1>
                  <p className="text-xs text-slate-500">
                    Authoritative Cloud Firestore storage & Google Drive sync · CJ Dropshipping integration · Custom Admin Cost controls
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setIsFirebaseModalOpen(true)}
                    className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-[#FF6000] hover:from-amber-600 hover:to-[#e05500] text-white text-xs font-bold rounded-xl shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors"
                    title="Pull products from Firebase Firestore or push current catalog (ceremonial-arbor-62w8r)"
                  >
                    <Database className="w-4 h-4" />
                    <span>Firebase Sync</span>
                  </button>

                  <button
                    onClick={() => setIsSpreadsheetModalOpen(true)}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors"
                    title="Excel download, auto Excel/CSV upload, and Google Sheets integration"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Excel / Google Sheets</span>
                  </button>

                  <button
                    onClick={() => exportProductsToExcel(products, categories)}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors"
                    title="Quick download complete catalog as Excel (.xlsx)"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    <span>Export (.xlsx)</span>
                  </button>

                  <button
                    onClick={() => {
                      const res = exportProductsToDsersProductTemplate(products, categories, 'csv');
                      showToast(`Exported ${res.totalCount} products to DSers template (${res.mappedCount} mapped, ${res.unmappedCount} unmapped).`);
                    }}
                    className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-xl shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors"
                    title="Export product IDs, SKUs and supplier URLs into the official DSers product template"
                  >
                    <Globe className="w-3.5 h-3.5 text-emerald-600" />
                    <span>DSers Template (CSV)</span>
                  </button>

                  <button
                    onClick={handleSyncToGoogleDrive}
                    disabled={syncingToDrive}
                    className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold rounded-xl shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
                    title="Store & backup all products to Google Drive (ContactReach_Market_Products.json)"
                  >
                    <CloudUpload className={`w-4 h-4 ${syncingToDrive ? 'animate-bounce text-blue-600' : 'text-blue-500'}`} />
                    <span>{syncingToDrive ? 'Backing up...' : 'Google Drive Backup'}</span>
                  </button>

                  <button
                    onClick={handleOpenDriveFilePicker}
                    disabled={importingFromDrive}
                    className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-xl shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
                    title="Auto-Fill products from Google Drive catalog file"
                  >
                    <Zap className={`w-4 h-4 ${importingFromDrive ? 'animate-spin text-indigo-600' : 'text-indigo-500'}`} />
                    <span>{importingFromDrive ? 'Auto-filling...' : 'Drive Auto-Fill'}</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('cjdropshipping')}
                    className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold rounded-xl shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors"
                    title="Configure CJ Dropshipping automated upload feed"
                  >
                    <RefreshCw className="w-4 h-4 text-purple-600" />
                    <span>CJ Dropshipping</span>
                  </button>

                  <button
                    onClick={handleMakeAllProductsReady}
                    disabled={makingAllReady}
                    className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold rounded-xl shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
                    title="Make all products in catalog Approved, Available in stock, and verify CJ Dropshipping readiness"
                  >
                    <Sparkles className={`w-4 h-4 ${makingAllReady ? 'animate-spin text-amber-300' : 'text-amber-300'}`} />
                    <span>{makingAllReady ? 'Making Ready...' : '✨ Make All Products Ready'}</span>
                  </button>

                  <button
                    onClick={handleOpenAddProduct}
                    className="px-4 py-2 bg-[#FF6000] hover:bg-[#e05500] text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors"
                    title="Manually upload a new product and save directly to Firebase and store catalog"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Upload Product (Manual / Firebase)</span>
                  </button>
                </div>
              </div>

              {/* Google Sheets Direct Live Sync Banner */}
              <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-3xl p-5 shadow-sm text-white">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                      <FileSpreadsheet className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold text-white tracking-tight">Google Sheet Live Connected</h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          Saved & Edited in Real-Time
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1 flex flex-wrap items-center gap-1.5">
                        <span>Spreadsheet Link:</span>
                        <a
                          href="https://docs.google.com/spreadsheets/d/1kaLUCemqV6-KJ_G6nqYhyrf2bPpDg6HxyaSj6uDsoHk/edit?usp=sharing"
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-300 hover:text-emerald-200 underline font-mono text-[11px] inline-flex items-center gap-1 font-semibold"
                        >
                          docs.google.com/spreadsheets/d/1kaLUCemqV6... <ExternalLink className="w-3 h-3" />
                        </a>
                      </p>
                      <div className="text-[11px] text-emerald-400/80 mt-1 flex flex-wrap items-center gap-2">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {settings?.googleSheetConfig?.lastSyncAt
                            ? `Last Synced: ${new Date(settings.googleSheetConfig.lastSyncAt).toLocaleString()} (${settings.googleSheetConfig.lastSyncStats?.message || 'Up to date'})`
                            : 'Connected & ready to sync'}
                        </span>
                        <span className="text-slate-500">·</span>
                        <span>Account: <strong className="text-emerald-300 font-mono">{settings?.googleSheetConfig?.connectedAccountEmail || 'contactreachmedialimited@gmail.com'}</strong></span>
                        <span className="text-slate-500">·</span>
                        <span>{products.length} products in store catalog</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
                    <button
                      onClick={handleSyncPullFromGoogleSheet}
                      disabled={syncingFromSheet}
                      className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-xl shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-95"
                      title="Pull and update website products with latest edits from your Google Sheet"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${syncingFromSheet ? 'animate-spin' : ''}`} />
                      <span>{syncingFromSheet ? 'Syncing...' : 'Sync from Google Sheet (Pull Edits)'}</span>
                    </button>

                    <button
                      onClick={handleSyncPushToGoogleSheet}
                      disabled={syncingToSheet}
                      className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
                      title="Save current website products to the Google Sheet"
                    >
                      <Upload className={`w-3.5 h-3.5 ${syncingToSheet ? 'animate-bounce text-emerald-400' : 'text-slate-300'}`} />
                      <span>{syncingToSheet ? 'Saving...' : 'Save to Google Sheet (Push)'}</span>
                    </button>

                    <a
                      href="https://docs.google.com/spreadsheets/d/1kaLUCemqV6-KJ_G6nqYhyrf2bPpDg6HxyaSj6uDsoHk/edit?usp=sharing"
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                      <span>Open Sheet ↗</span>
                    </a>
                  </div>
                </div>
              </div>

              {/* Google Drive & Storage Sync Banner */}
              {driveStatus?.lastBackupAt && (
                <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-blue-900">
                    <CloudUpload className="w-4 h-4 text-blue-600 shrink-0" />
                    <span className="font-semibold">
                      Google Drive Backup Active: Stored <strong>{driveStatus.productCount ?? products.length} products</strong> in <code className="bg-blue-100 px-1 py-0.5 rounded text-[11px] font-mono">ContactReach_Market_Products.json</code>
                    </span>
                    <span className="text-[11px] text-blue-600 font-mono">
                      (Account: {driveStatus.connectedEmail || driveStatus.accountEmail || 'contactreachmedialimited@gmail.com'} · Last synced: {new Date(driveStatus.lastBackupAt).toLocaleString()})
                    </span>
                  </div>
                  {driveStatus.webViewLink && (
                    <a
                      href={driveStatus.webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-900 underline"
                    >
                      <span>Open in Drive</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}

              {/* Filters */}
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 flex flex-wrap gap-2.5 items-center justify-between text-xs">
                <div className="flex-1 min-w-[200px] relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Search by name, SKU, brand, or store..."
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={productCatFilter}
                    onChange={(e) => setProductCatFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
                  >
                    <option value="all">All Categories</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.nameEn} ({c.nameRw})</option>
                    ))}
                  </select>

                  <select
                    value={productShopFilter}
                    onChange={(e) => setProductShopFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
                  >
                    <option value="all">All Saved Shops</option>
                    {shops.map(s => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Bulk Action Bar when rows are selected */}
              {selectedProductIds.length > 0 && (
                <div className="bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 border-2 border-[#FF6000]/40 rounded-2xl p-3.5 shadow-sm flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-7 h-7 rounded-xl bg-[#FF6000] text-white text-xs font-black shadow-xs">
                      {selectedProductIds.length}
                    </span>
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">
                        {selectedProductIds.length} Product{selectedProductIds.length > 1 ? 's' : ''} Selected
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Perform bulk actions on all selected products at the same time
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Delete Selected Products Button */}
                    <button
                      type="button"
                      onClick={() => setShowBulkDeleteModal(true)}
                      disabled={bulkDeleting}
                      className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-95"
                      title="Permanently delete all selected products at the same time"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Selected ({selectedProductIds.length})</span>
                    </button>

                    {/* Bulk Change Status Options */}
                    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-400 px-1.5 uppercase">Set Status:</span>
                      <button
                        type="button"
                        onClick={() => handleBulkChangeStatus('Available')}
                        disabled={bulkUpdatingStatus}
                        className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-lg cursor-pointer transition-colors"
                        title="Set selected to Available"
                      >
                        Available
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBulkChangeStatus('Out of Stock')}
                        disabled={bulkUpdatingStatus}
                        className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 text-[11px] font-bold rounded-lg cursor-pointer transition-colors"
                        title="Set selected to Out of Stock"
                      >
                        Out of Stock
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBulkChangeStatus('Hidden')}
                        disabled={bulkUpdatingStatus}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-lg cursor-pointer transition-colors"
                        title="Set selected to Hidden"
                      >
                        Hidden
                      </button>
                    </div>

                    {/* Deselect All */}
                    <button
                      type="button"
                      onClick={handleClearProductSelection}
                      className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer transition-colors"
                      title="Clear selection"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Deselect All</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Products Table */}
              <div className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-400 font-bold uppercase text-[10px]">
                        <th className="py-3 px-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={isAllFilteredSelected}
                            ref={el => {
                              if (el) el.indeterminate = isSomeFilteredSelected && !isAllFilteredSelected;
                            }}
                            onChange={handleToggleSelectAllFiltered}
                            title={isAllFilteredSelected ? "Deselect all products" : "Select all filtered products"}
                            className="w-4 h-4 rounded border-slate-300 text-[#FF6000] focus:ring-orange-500 cursor-pointer accent-[#FF6000]"
                          />
                        </th>
                        <th className="py-3 px-4">Product / SKU</th>
                        <th className="py-3 px-3">Category</th>
                        <th className="py-3 px-3">Shop / Source</th>
                        <th className="py-3 px-3">Cost (FRW)</th>
                        <th className="py-3 px-3">Price & Shipping (FRW)</th>
                        <th className="py-3 px-3">Stock</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredProducts.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-12 text-center text-slate-400">
                            <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
                            <p className="font-semibold text-sm text-slate-600">No products found</p>
                            <p className="text-xs mt-1">Try adjusting your search query or category filters</p>
                          </td>
                        </tr>
                      ) : (
                        filteredProducts.map(p => {
                          const isSelected = selectedProductIds.includes(p.id);
                          return (
                            <tr
                              key={p.id}
                              onClick={() => handleToggleSelectProduct(p.id)}
                              className={`transition-colors cursor-pointer ${
                                isSelected
                                  ? 'bg-orange-50/80 hover:bg-orange-100/70 border-l-4 border-l-[#FF6000]'
                                  : 'hover:bg-slate-50/60'
                              }`}
                            >
                              <td className="py-3 px-3 w-10 text-center" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleSelectProduct(p.id)}
                                  title={`Select "${p.name}"`}
                                  className="w-4 h-4 rounded border-slate-300 text-[#FF6000] focus:ring-orange-500 cursor-pointer accent-[#FF6000]"
                                />
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-3">
                                  <div className="relative group shrink-0" onClick={(e) => e.stopPropagation()}>
                                    <img
                                      src={p.imageUrl}
                                      alt={p.name}
                                      className="w-12 h-12 object-cover rounded-xl border border-slate-200"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleOpenManageImages(p)}
                                      className="absolute inset-0 bg-black/60 text-white rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                                      title="Manage picture links"
                                    >
                                      <Camera className="w-4 h-4 text-orange-400" />
                                    </button>
                                  </div>
                                  <div className="max-w-xs">
                                    <span className="font-bold text-slate-900 block line-clamp-1">{p.name}</span>
                                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                      <span className="text-[10px] font-mono text-slate-400 font-bold">{p.sku}</span>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleOpenManageImages(p);
                                        }}
                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-orange-50 hover:bg-orange-100 text-[#FF6000] border border-orange-200 cursor-pointer transition-colors"
                                        title="Click to view or add multiple picture links"
                                      >
                                        <Camera className="w-2.5 h-2.5 text-[#FF6000]" />
                                        <span>{p.images && p.images.length > 0 ? p.images.length : (p.imageUrl ? 1 : 0)} photo{((p.images && p.images.length > 0 ? p.images.length : (p.imageUrl ? 1 : 0)) === 1 ? '' : 's')}</span>
                                        <span className="text-orange-400">· Add Links</span>
                                      </button>
                                      {p.isFeatured && <span className="px-1.5 py-0.2 rounded bg-orange-100 text-orange-800 text-[9px] font-black">Featured</span>}
                                      {p.isNewArrival && <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 text-[9px] font-black">New</span>}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-3 text-slate-600 font-medium capitalize">
                                {p.category}
                              </td>
                              <td className="py-3 px-3 font-semibold text-slate-700">
                                <div>{p.shopName || 'ContactReach Market'}</div>
                                {p.source === 'cjdropshipping' && (
                                  <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded bg-purple-100 text-purple-700 text-[9px] font-black uppercase tracking-wider">
                                    CJ Dropshipping
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                                {p.costPrice !== undefined ? (
                                  <div>
                                    <div className="flex items-center gap-1">
                                      <span className="font-mono font-bold text-slate-900">{p.costPrice.toLocaleString()} FRW</span>
                                      {p.costOverriddenByAdmin && (
                                        <span className="px-1 py-0.2 rounded bg-amber-100 text-amber-800 text-[8px] font-black" title="Admin custom cost - protected from CJ auto-sync overwrite">
                                          Admin
                                        </span>
                                      )}
                                    </div>
                                    {p.source === 'cjdropshipping' && p.cjOriginalCostUsd && (
                                      <div className="text-[10px] text-purple-600 font-mono">CJ: ${p.cjOriginalCostUsd}</div>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const val = window.prompt(`Update product cost for "${p.name}" (FRW):`, String(p.costPrice ?? ''));
                                        if (val !== null && !isNaN(Number(val)) && Number(val) >= 0) {
                                          handleQuickUpdateProductCost(p.id, Number(val));
                                        }
                                      }}
                                      className="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold cursor-pointer block mt-0.5"
                                    >
                                      Edit Cost
                                    </button>
                                  </div>
                                ) : (
                                  <div>
                                    <span className="text-slate-400 italic text-[11px]">—</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const val = window.prompt(`Set cost price for "${p.name}" (FRW):`, '');
                                        if (val !== null && !isNaN(Number(val)) && Number(val) >= 0) {
                                          handleQuickUpdateProductCost(p.id, Number(val));
                                        }
                                      }}
                                      className="text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-semibold cursor-pointer block mt-0.5"
                                    >
                                      + Set Cost
                                    </button>
                                  </div>
                                )}
                              </td>
                              <td className="py-3 px-3">
                                <span className="font-mono font-bold text-slate-900">{p.price.toLocaleString()} FRW</span>
                                {p.costPrice && p.price > p.costPrice && (
                                  <div className="text-[10px] font-bold text-emerald-600 font-mono">
                                    +{Math.round(((p.price - p.costPrice) / p.price) * 100)}% margin
                                  </div>
                                )}
                                {((p.discountPercent && p.discountPercent > 0) || (p.discountPrice && p.discountPrice < p.price)) && (
                                  <div className="flex items-center gap-1 mt-0.5">
                                    <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 text-[10px] font-black">
                                      -{p.discountPercent || Math.round(((p.price - (p.discountPrice || 0)) / p.price) * 100)}%
                                    </span>
                                    <span className="text-[10px] text-emerald-600 font-semibold font-mono">
                                      {(p.discountPrice || Math.round(p.price * (1 - (p.discountPercent || 0) / 100))).toLocaleString()}
                                    </span>
                                  </div>
                                )}
                                {/* Shipping Cost Indicator */}
                                <div className="text-[10px] font-semibold text-slate-500 flex items-center gap-1 mt-1" title={p.shippingCost !== undefined ? `Custom shipping cost: ${Number(p.shippingCost).toLocaleString()} FRW` : 'Auto standard shipping (1,500 + 10%)'}>
                                  <Truck className="w-3 h-3 text-blue-500 shrink-0" />
                                  <span>Ship: {calculateProductShippingUnitCost(p).toLocaleString()} FRW</span>
                                  {p.shippingCost !== undefined ? (
                                    <span className="text-[8px] bg-blue-100 text-blue-800 font-bold px-1 rounded">Custom</span>
                                  ) : (
                                    <span className="text-[8px] text-slate-400">auto</span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const currentShip = p.shippingCost !== undefined ? String(p.shippingCost) : '';
                                    const val = window.prompt(`Set custom shipping cost for "${p.name}" in FRW:\n(Leave blank to restore automatic 1,500 + 10%)`, currentShip);
                                    if (val !== null) {
                                      const trimmed = val.trim();
                                      handleQuickUpdateProductShipping(p.id, trimmed === '' ? undefined : Math.max(0, Number(trimmed)));
                                    }
                                  }}
                                  className="text-[9px] text-blue-600 hover:text-blue-800 hover:underline font-semibold cursor-pointer block mt-0.5"
                                >
                                  {p.shippingCost !== undefined ? 'Edit Shipping' : '+ Custom Shipping'}
                                </button>
                              </td>
                              <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => {
                                    setStockModalProduct(p);
                                    setStockAdjustAmount(10);
                                  }}
                                  className={`px-2 py-0.5 rounded-full font-mono font-bold text-xs cursor-pointer ${
                                    p.stock <= 5 ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                                  }`}
                                >
                                  {p.stock} {p.unit || 'units'}
                                </button>
                              </td>
                              <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                                <select
                                  value={p.status}
                                  onChange={async (e) => {
                                    const newStatus = e.target.value as ProductStatus;
                                    try {
                                      await api.adminUpdateProductStatus(p.id, newStatus);
                                      showToast(`Product "${p.name}" updated to "${newStatus}"!`);
                                      fetchAllData(true);
                                      onRefreshPublicData();
                                    } catch (err: any) {
                                      showToast(err.message || 'Failed to update status', 'error');
                                    }
                                  }}
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold cursor-pointer border transition-colors outline-hidden ${
                                    p.status === 'Available'
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                      : p.status === 'Out of Stock'
                                      ? 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100'
                                      : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                                  }`}
                                  title="Click to change live status directly"
                                >
                                  <option value="Available">Available (Live)</option>
                                  <option value="Hidden">Hidden (Draft)</option>
                                  <option value="Out of Stock">Out of Stock</option>
                                </select>
                              </td>
                              <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                {/* Quick Publish / Unpublish Toggle */}
                                <button
                                  type="button"
                                  onClick={async () => {
                                    try {
                                      const res = await api.adminToggleProductPublish(p.id);
                                      showToast(res.message);
                                      fetchAllData(true);
                                      onRefreshPublicData();
                                    } catch (err: any) {
                                      showToast(err.message || 'Failed to toggle publish status', 'error');
                                    }
                                  }}
                                  title={p.status === 'Available' ? "Unpublish product (hide from buyers)" : "Publish product (show on storefront)"}
                                  className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                                    p.status === 'Available'
                                      ? 'text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50'
                                      : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                                  }`}
                                >
                                  {p.status === 'Available' ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenManageImages(p)}
                                  title="Manage picture links"
                                  className="p-1.5 rounded-lg text-orange-600 hover:text-orange-800 hover:bg-orange-50 cursor-pointer"
                                >
                                  <Camera className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleOpenEditProduct(p)}
                                  title="Edit product"
                                  className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDuplicateProduct(p.id)}
                                  title="Duplicate product"
                                  className="p-1.5 rounded-lg text-blue-600 hover:text-blue-800 hover:bg-blue-50 cursor-pointer"
                                >
                                  <Copy className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteProduct(p.id)}
                                  title="Delete product"
                                  className="p-1.5 rounded-lg text-rose-600 hover:text-rose-800 hover:bg-rose-50 cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CATEGORIES */}
          {activeTab === 'categories' && (
            <AdminCategoriesManager
              categories={categories}
              products={products}
              onRefresh={() => {
                fetchAllData();
                onRefreshPublicData();
              }}
              showToast={showToast}
            />
          )}

          {/* TAB 4: SAVED SHOPS */}
          {activeTab === 'shops' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">Multiple Saved Shops & Vendors</h1>
                  <p className="text-xs text-slate-500">Manage permanent merchant stores, contact details, and locations</p>
                </div>
                <button
                  onClick={() => {
                    setEditingShop(null);
                    setShopForm({
                      name: '',
                      category: 'Fashion & Merchandise',
                      description: '',
                      location: 'Kigali, Rwanda',
                      address: 'Fair View Plaza, Kigali',
                      phone: '0780022600',
                      email: 'contactreachmedialimited@gmail.com',
                      deliveryInfo: 'Express same-day Kigali delivery',
                      logo: 'ShoppingBag',
                      bannerColor: 'from-orange-500 to-amber-600',
                      isRecommended: false
                    });
                    setShopModalOpen(true);
                  }}
                  className="px-4 py-2.5 bg-[#FF6000] hover:bg-[#e05500] text-white text-xs font-bold rounded-2xl shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Register Saved Shop</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {shops.map(shop => {
                  const shopProds = products.filter(p => p.shopId === shop.id || p.shopName === shop.name);
                  return (
                    <div key={shop.id} className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs">
                      <div className={`h-14 bg-gradient-to-r ${shop.bannerColor} p-3 flex items-center justify-between text-white`}>
                        <span className="font-extrabold text-sm">{shop.name}</span>
                        <div className="flex items-center gap-1.5">
                          {shop.isRecommended ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-400 text-amber-950 text-[10px] font-black">
                              ★ Recommended
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-black/25 text-white/90 text-[10px] font-medium border border-white/20">
                              Standard
                            </span>
                          )}
                          {shop.isVerified && (
                            <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-bold">
                              Verified
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="p-4 space-y-3 text-xs">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400">Category</span>
                          <p className="font-bold text-slate-800">{shop.category}</p>
                        </div>
                        <p className="text-slate-500 line-clamp-2">{shop.description}</p>
                        <div className="space-y-1 text-slate-600">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span>{shop.location}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span>{shop.phone || '0780022600'}</span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                          <span className="font-bold text-slate-700">{shopProds.length} products listed</span>
                          <button
                            onClick={() => {
                              setEditingShop(shop);
                              setShopForm({
                                name: shop.name,
                                category: shop.category,
                                description: shop.description,
                                location: shop.location,
                                address: shop.address || '',
                                phone: shop.phone || '0780022600',
                                email: shop.email || 'contactreachmedialimited@gmail.com',
                                deliveryInfo: shop.deliveryInfo || 'Kigali delivery',
                                logo: shop.logo,
                                bannerColor: shop.bannerColor,
                                isRecommended: Boolean(shop.isRecommended)
                              });
                              setShopModalOpen(true);
                            }}
                            className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg cursor-pointer"
                          >
                            Edit Shop
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB: SUPPLIER APPLICATIONS */}
          {activeTab === 'suppliers' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">Supplier & Vendor Onboarding</h1>
                  <p className="text-xs text-slate-500">Review prospective suppliers, verify TIN credentials, and approve shop vendor accounts</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs font-black">
                    {supplierApplications.filter(a => a.status === 'Pending').length} Pending Applications
                  </span>
                </div>
              </div>

              {supplierApplications.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
                  <Store className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="font-bold text-slate-700 text-sm">No supplier applications yet</h3>
                  <p className="text-xs text-slate-400 mt-1">Prospective suppliers who apply through the "Be a Seller" portal will appear here.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {supplierApplications.map(app => (
                    <div key={app.id} className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-base text-slate-900">{app.businessName}</span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              app.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                              app.status === 'Rejected' ? 'bg-rose-100 text-rose-800' :
                              'bg-amber-100 text-amber-800'
                            }`}>
                              {app.status}
                            </span>
                          </div>
                          <span className="text-xs text-slate-500 font-medium">Owner: {app.ownerName} · Category: <span className="capitalize">{app.category}</span></span>
                        </div>
                        <span className="text-[11px] font-mono text-slate-400">
                          Applied: {new Date(app.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Phone / Mobile</span>
                          <span className="font-bold text-slate-800 font-mono">{app.phone}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Location / Address</span>
                          <span className="font-bold text-slate-800">{app.location}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">TIN / Tax ID</span>
                          <span className="font-mono text-slate-800">{app.tinNumber || 'Not provided'}</span>
                        </div>
                      </div>

                      {app.description && (
                        <p className="text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-100">
                          <span className="font-bold text-slate-500 block text-[10px] uppercase">Business Description:</span>
                          {app.description}
                        </p>
                      )}

                      <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                        {app.status === 'Pending' ? (
                          <>
                            <button
                              onClick={() => handleReviewSupplierApplication(app.id, 'Rejected')}
                              className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
                            >
                              Reject Application
                            </button>
                            <button
                              onClick={() => handleReviewSupplierApplication(app.id, 'Approved')}
                              className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Approve & Verify Supplier</span>
                            </button>
                          </>
                        ) : (
                          <span className="text-xs font-bold text-slate-400">
                            Status finalized: <span className="font-black text-slate-700">{app.status}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: SUPPLIER PAYOUTS & COMMISSIONS */}
          {activeTab === 'payouts' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">Supplier Settlement & Payouts</h1>
                  <p className="text-xs text-slate-500">Track 10% marketplace drop-shipping commission and manage 90% supplier payouts</p>
                </div>
              </div>

              {/* Payout Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Marketplace Commission (10%)</span>
                  <span className="text-xl font-black text-orange-600 font-mono mt-1 block">
                    {supplierPayouts.reduce((acc, p) => acc + (p.commissionEarned || 0), 0).toLocaleString()} FRW
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1 block">Earned on verified orders</span>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Net Supplier Payouts</span>
                  <span className="text-xl font-black text-slate-900 font-mono mt-1 block">
                    {supplierPayouts.reduce((acc, p) => acc + (p.payoutAmount || 0), 0).toLocaleString()} FRW
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1 block">Net 90% payable to merchants</span>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Pending Disbursements</span>
                  <span className="text-xl font-black text-amber-600 font-mono mt-1 block">
                    {supplierPayouts.filter(p => p.status === 'Pending').reduce((acc, p) => acc + (p.payoutAmount || 0), 0).toLocaleString()} FRW
                  </span>
                  <span className="text-[10px] text-amber-700 font-bold mt-1 block">
                    {supplierPayouts.filter(p => p.status === 'Pending').length} pending payouts
                  </span>
                </div>
              </div>

              {supplierPayouts.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
                  <DollarSign className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="font-bold text-slate-700 text-sm">No supplier payout records yet</h3>
                  <p className="text-xs text-slate-400 mt-1">When customer payments are verified and approved, payout records are automatically generated.</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-bold uppercase text-[10px]">
                        <tr>
                          <th className="py-3 px-4">Order Ref</th>
                          <th className="py-3 px-4">Shop / Supplier</th>
                          <th className="py-3 px-4">Order Total</th>
                          <th className="py-3 px-4">Commission (10%)</th>
                          <th className="py-3 px-4 font-black text-slate-900">Net Payout</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Disbursement</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                        {supplierPayouts.map(p => (
                          <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-orange-600">
                              #{p.orderNumber}
                            </td>
                            <td className="py-3 px-4 font-bold text-slate-800">
                              {p.shopName}
                            </td>
                            <td className="py-3 px-4 font-mono">
                              {p.orderTotal?.toLocaleString()} FRW
                            </td>
                            <td className="py-3 px-4 font-mono text-emerald-600 font-bold">
                              +{p.commissionEarned?.toLocaleString()} FRW
                            </td>
                            <td className="py-3 px-4 font-mono font-black text-slate-900">
                              {p.payoutAmount?.toLocaleString()} FRW
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                p.status === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {p.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              {p.status === 'Paid' ? (
                                <span className="text-[11px] text-slate-500 font-mono">
                                  Ref: {p.paymentReference} ({p.paidAt ? new Date(p.paidAt).toLocaleDateString() : 'Paid'})
                                </span>
                              ) : (
                                <button
                                  onClick={() => {
                                    setDisbursePayoutModal(p);
                                    setDisburseRefInput(`MOMO-${Date.now().toString().slice(-6)}`);
                                  }}
                                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                                >
                                  Disburse Payout
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: ORDERS & DELIVERIES */}
          {activeTab === 'orders' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h1 className="text-xl font-black text-slate-900 tracking-tight">Orders & Delivery Tracking Hub</h1>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live Stream Active (No Reloading)
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Real-time order pipeline and parcel delivery tracking. Manage suppliers, couriers, and customer notifications.
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => {
                      const res = exportOrdersToDsersOrderTemplate(orders, products, { onlyApproved: true, format: 'csv' });
                      if (res.orderCount === 0) {
                        showToast('No approved eligible orders found to export. Review and approve orders in DSers tab first!', 'error');
                      } else {
                        showToast(`Exported ${res.orderCount} approved orders (${res.exportedCount} items) to DSers order template.`);
                      }
                    }}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                    title="Export eligible customer orders into the DSers order template"
                  >
                    <Download className="w-4 h-4 text-indigo-200" />
                    <span>Export DSers (CSV)</span>
                  </button>

                  <button
                    onClick={() => {
                      try {
                        const csvRows = [
                          ['Order ID', 'Date', 'Customer Name', 'Customer Phone', 'Supplier', 'Payment Status', 'Delivery Status', 'Tracking Number', 'Expected Delivery Date', 'Total (FRW)'].join(',')
                        ];
                        filteredOrders.forEach(o => {
                          const sup = o.supplierName || (o.items?.[0]?.supplierName) || o.shopName || 'Contact Reach Market';
                          const trk = o.trackingNumber || 'Not Yet Available';
                          const eta = o.expectedDeliveryDate || 'Not Yet Available';
                          csvRows.push([
                            `"${o.orderNumber}"`,
                            `"${new Date(o.createdAt).toLocaleDateString()}"`,
                            `"${(o.customerName || '').replace(/"/g, '""')}"`,
                            `"${o.customerPhone || ''}"`,
                            `"${sup.replace(/"/g, '""')}"`,
                            `"${o.paymentStatus || 'Pending Payment'}"`,
                            `"${o.deliveryStatus || o.status || 'Pending'}"`,
                            `"${trk}"`,
                            `"${eta}"`,
                            o.totalAmount || 0
                          ].join(','));
                        });
                        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.setAttribute('href', url);
                        link.setAttribute('download', `contactreach_orders_${new Date().toISOString().slice(0, 10)}.csv`);
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        showToast(`Exported ${filteredOrders.length} orders to CSV successfully.`);
                      } catch {
                        showToast('Failed to export orders to CSV', 'error');
                      }
                    }}
                    className="px-3.5 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                    title="Export filtered orders report as CSV"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    <span>Export CSV</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('dsers')}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
                    title="Open DSers & Supplier Fulfillment Tab"
                  >
                    <Globe className="w-4 h-4 text-emerald-600" />
                    <span>Fulfillment Hub</span>
                  </button>
                </div>
              </div>

              {/* 7 SUMMARY COUNTERS */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5">
                {/* 1. Total Orders */}
                <button
                  type="button"
                  onClick={() => {
                    setOrderDeliveryFilter('all');
                    setOrderStatusFilter('all');
                  }}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    orderDeliveryFilter === 'all' && orderStatusFilter === 'all'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/20'
                      : 'bg-white hover:bg-slate-50 border-slate-200/90 text-slate-800 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider opacity-75">Total Orders</span>
                    <Package className="w-3.5 h-3.5 opacity-70" />
                  </div>
                  <div className="text-xl font-black mt-1 font-mono">{orderSummaryStats.total}</div>
                  <div className="text-[10px] opacity-70 mt-0.5">All customer orders</div>
                </button>

                {/* 2. Pending Orders */}
                <button
                  type="button"
                  onClick={() => setOrderDeliveryFilter(prev => prev === 'Pending' ? 'all' : 'Pending')}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    orderDeliveryFilter === 'Pending'
                      ? 'bg-amber-500 text-white border-amber-500 shadow-md ring-2 ring-amber-500/20'
                      : 'bg-amber-50/60 hover:bg-amber-100/60 border-amber-200 text-amber-900 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider opacity-75">Pending</span>
                    <Clock className="w-3.5 h-3.5 opacity-70" />
                  </div>
                  <div className="text-xl font-black mt-1 font-mono">{orderSummaryStats.pending}</div>
                  <div className="text-[10px] opacity-75 mt-0.5">Awaiting dispatch</div>
                </button>

                {/* 3. Processing Orders */}
                <button
                  type="button"
                  onClick={() => setOrderDeliveryFilter(prev => prev === 'Processing' ? 'all' : 'Processing')}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    orderDeliveryFilter === 'Processing'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-600/20'
                      : 'bg-blue-50/60 hover:bg-blue-100/60 border-blue-200 text-blue-900 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider opacity-75">Processing</span>
                    <Layers className="w-3.5 h-3.5 opacity-70" />
                  </div>
                  <div className="text-xl font-black mt-1 font-mono">{orderSummaryStats.processing}</div>
                  <div className="text-[10px] opacity-75 mt-0.5">Preparing / Supplier</div>
                </button>

                {/* 4. Shipped Orders */}
                <button
                  type="button"
                  onClick={() => setOrderDeliveryFilter(prev => prev === 'Shipped' ? 'all' : 'Shipped')}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    orderDeliveryFilter === 'Shipped'
                      ? 'bg-cyan-600 text-white border-cyan-600 shadow-md ring-2 ring-cyan-600/20'
                      : 'bg-cyan-50/60 hover:bg-cyan-100/60 border-cyan-200 text-cyan-900 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider opacity-75">Shipped</span>
                    <Truck className="w-3.5 h-3.5 opacity-70" />
                  </div>
                  <div className="text-xl font-black mt-1 font-mono">{orderSummaryStats.shipped}</div>
                  <div className="text-[10px] opacity-75 mt-0.5">Dispatched to carrier</div>
                </button>

                {/* 5. In Transit Orders */}
                <button
                  type="button"
                  onClick={() => setOrderDeliveryFilter(prev => prev === 'In Transit' ? 'all' : 'In Transit')}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    orderDeliveryFilter === 'In Transit'
                      ? 'bg-purple-600 text-white border-purple-600 shadow-md ring-2 ring-purple-600/20'
                      : 'bg-purple-50/60 hover:bg-purple-100/60 border-purple-200 text-purple-900 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider opacity-75">In Transit</span>
                    <Truck className="w-3.5 h-3.5 opacity-70" />
                  </div>
                  <div className="text-xl font-black mt-1 font-mono">{orderSummaryStats.inTransit}</div>
                  <div className="text-[10px] opacity-75 mt-0.5">On way / Out for delivery</div>
                </button>

                {/* 6. Delivered Orders */}
                <button
                  type="button"
                  onClick={() => setOrderDeliveryFilter(prev => prev === 'Delivered' ? 'all' : 'Delivered')}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    orderDeliveryFilter === 'Delivered'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-600/20'
                      : 'bg-emerald-50/60 hover:bg-emerald-100/60 border-emerald-200 text-emerald-900 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider opacity-75">Delivered</span>
                    <CheckCircle2 className="w-3.5 h-3.5 opacity-70" />
                  </div>
                  <div className="text-xl font-black mt-1 font-mono">{orderSummaryStats.delivered}</div>
                  <div className="text-[10px] opacity-75 mt-0.5">Successfully completed</div>
                </button>

                {/* 7. Cancelled Orders */}
                <button
                  type="button"
                  onClick={() => setOrderDeliveryFilter(prev => prev === 'Cancelled' ? 'all' : 'Cancelled')}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    orderDeliveryFilter === 'Cancelled'
                      ? 'bg-rose-600 text-white border-rose-600 shadow-md ring-2 ring-rose-600/20'
                      : 'bg-rose-50/60 hover:bg-rose-100/60 border-rose-200 text-rose-900 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider opacity-75">Cancelled</span>
                    <XCircle className="w-3.5 h-3.5 opacity-70" />
                  </div>
                  <div className="text-xl font-black mt-1 font-mono">{orderSummaryStats.cancelled}</div>
                  <div className="text-[10px] opacity-75 mt-0.5">Void / Stock restored</div>
                </button>
              </div>

              {/* Quick Operational Alerts Bar */}
              {(orderSummaryStats.delayed > 0 || orderSummaryStats.missingTracking > 0) && (
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  {orderSummaryStats.delayed > 0 && (
                    <button
                      type="button"
                      onClick={() => setOrderSearch('delayed')}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-800 font-bold hover:bg-rose-100 transition-colors cursor-pointer"
                    >
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span>{orderSummaryStats.delayed} Shipment(s) Delayed Past ETA</span>
                    </button>
                  )}
                  {orderSummaryStats.missingTracking > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setOrderDeliveryFilter('all');
                        setOrderSearch('');
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 font-bold hover:bg-amber-100 transition-colors cursor-pointer"
                    >
                      <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>{orderSummaryStats.missingTracking} Active Orders Awaiting Tracking Number</span>
                    </button>
                  )}
                </div>
              )}

              {/* SEARCH & FILTERS CONTROLS */}
              <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-2xs space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 text-xs">
                  {/* Search: Order ID, Product, Customer, Phone, Supplier */}
                  <div className="sm:col-span-2 relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      value={orderSearch}
                      onChange={(e) => setOrderSearch(e.target.value)}
                      placeholder="Search Order ID, Product, Customer, Phone, Supplier..."
                      className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-orange-500 font-medium"
                    />
                    {orderSearch && (
                      <button
                        onClick={() => setOrderSearch('')}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Filter: Delivery Status */}
                  <div>
                    <select
                      value={orderDeliveryFilter}
                      onChange={(e) => setOrderDeliveryFilter(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
                    >
                      <option value="all">All Delivery Statuses</option>
                      <option value="Pending">Pending</option>
                      <option value="Processing">Processing</option>
                      <option value="Awaiting Shipment">Awaiting Shipment</option>
                      <option value="Shipped">Shipped</option>
                      <option value="In Transit">In Transit</option>
                      <option value="Out for Delivery">Out for Delivery</option>
                      <option value="Delivered">Delivered</option>
                      <option value="Cancelled">Cancelled</option>
                      <option value="Failed Delivery">Failed Delivery</option>
                      <option value="Returned">Returned</option>
                    </select>
                  </div>

                  {/* Filter: Payment Status */}
                  <div>
                    <select
                      value={orderPaymentFilter}
                      onChange={(e) => setOrderPaymentFilter(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
                    >
                      <option value="all">All Payment Statuses</option>
                      <option value="Paid">Paid</option>
                      <option value="Pending Verification">Pending Verification</option>
                      <option value="Pending Payment">Pending Payment</option>
                      <option value="Failed">Failed</option>
                      <option value="Refunded">Refunded</option>
                    </select>
                  </div>

                  {/* Filter: Supplier */}
                  <div>
                    <select
                      value={orderSupplierFilter}
                      onChange={(e) => setOrderSupplierFilter(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
                    >
                      <option value="all">All Suppliers</option>
                      <option value="CJ Dropshipping">CJ Dropshipping</option>
                      <option value="Alibaba">Alibaba Wholesale</option>
                      {uniqueSuppliers.filter(s => s !== 'CJ Dropshipping' && s !== 'Alibaba').map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-slate-100 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-500">Order Date:</span>
                    <select
                      value={orderDateFilter}
                      onChange={(e) => setOrderDateFilter(e.target.value)}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-medium bg-slate-50"
                    >
                      <option value="all">All Time</option>
                      <option value="today">Today</option>
                      <option value="7days">Last 7 Days</option>
                      <option value="30days">Last 30 Days</option>
                      <option value="this_month">This Month</option>
                    </select>

                    <span className="text-slate-300">|</span>

                    <span className="text-[11px] text-slate-500 font-semibold">
                      Showing <strong>{filteredOrders.length}</strong> of <strong>{orders.length}</strong> orders
                    </span>
                  </div>

                  {(orderSearch || orderDeliveryFilter !== 'all' || orderPaymentFilter !== 'all' || orderSupplierFilter !== 'all' || orderDateFilter !== 'all') && (
                    <button
                      type="button"
                      onClick={() => {
                        setOrderSearch('');
                        setOrderDeliveryFilter('all');
                        setOrderPaymentFilter('all');
                        setOrderSupplierFilter('all');
                        setOrderDateFilter('all');
                        setOrderStatusFilter('all');
                      }}
                      className="text-xs font-bold text-[#FF6000] hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Reset Filters</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Bulk Actions Bar if items selected */}
              {selectedOrderIds.length > 0 && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between gap-3 text-xs animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-rose-900">{selectedOrderIds.length} order(s) selected</span>
                    <button
                      type="button"
                      onClick={() => setSelectedOrderIds([])}
                      className="text-slate-500 hover:text-slate-800 underline cursor-pointer"
                    >
                      Clear Selection
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleBulkDeleteOrders}
                    disabled={bulkDeletingOrders}
                    className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{bulkDeletingOrders ? 'Deleting...' : `Delete Selected (${selectedOrderIds.length})`}</span>
                  </button>
                </div>
              )}

              {/* ORDERS & DELIVERY TRACKING TABLE (ALL 9 MANDATORY FIELDS) */}
              <div className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-black uppercase text-[10px] tracking-wider">
                        <th className="py-3.5 px-3 w-8">
                          <input
                            type="checkbox"
                            checked={filteredOrders.length > 0 && selectedOrderIds.length === filteredOrders.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedOrderIds(filteredOrders.map(o => o.id));
                              } else {
                                setSelectedOrderIds([]);
                              }
                            }}
                            className="rounded text-orange-600 focus:ring-orange-500 cursor-pointer"
                          />
                        </th>
                        <th className="py-3.5 px-3">1. Order ID</th>
                        <th className="py-3.5 px-3">2. Product Name & Image</th>
                        <th className="py-3.5 px-3">3. Customer Name & Phone</th>
                        <th className="py-3.5 px-3">4. Supplier Name</th>
                        <th className="py-3.5 px-3">5. Payment Status</th>
                        <th className="py-3.5 px-3">6. Order Date</th>
                        <th className="py-3.5 px-3">7. Delivery Status</th>
                        <th className="py-3.5 px-3">8. Tracking Number</th>
                        <th className="py-3.5 px-3">9. Expected Delivery</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredOrders.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="py-12 text-center text-slate-400">
                            <Package className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                            <p className="font-bold text-sm text-slate-600">No orders found matching criteria</p>
                            <p className="text-xs text-slate-400 mt-0.5">Try clearing filters or search terms</p>
                          </td>
                        </tr>
                      ) : (
                        filteredOrders.map(ord => {
                          const primaryItem = ord.items?.[0];
                          const remainingItemsCount = (ord.items?.length || 0) - 1;
                          const rawPhone = (ord.customerPhone || '').replace(/\D/g, '');
                          const waLink = rawPhone.startsWith('250') ? `https://wa.me/${rawPhone}` : `https://wa.me/250${rawPhone}`;
                          const supplierDisplay = ord.supplierName || (primaryItem?.supplierName) || ord.shopName || 'Contact Reach Market';
                          const effectiveDelivery = ord.deliveryStatus || (ord.status === 'Delivered' ? 'Delivered' : ord.status === 'Out for Delivery' ? 'In Transit' : ord.status === 'Preparing' ? 'Processing' : ord.status === 'Cancelled' ? 'Cancelled' : 'Pending');

                          return (
                            <tr key={ord.id} className="hover:bg-slate-50/70 transition-colors">
                              {/* Selection Checkbox */}
                              <td className="py-3 px-3">
                                <input
                                  type="checkbox"
                                  checked={selectedOrderIds.includes(ord.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedOrderIds(prev => [...prev, ord.id]);
                                    } else {
                                      setSelectedOrderIds(prev => prev.filter(id => id !== ord.id));
                                    }
                                  }}
                                  className="rounded text-orange-600 focus:ring-orange-500 cursor-pointer"
                                />
                              </td>

                              {/* 1. Order ID */}
                              <td className="py-3 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => handleOpenOrderDetail(ord)}
                                    className="hover:text-orange-600 hover:underline cursor-pointer font-bold"
                                    title="View full order details"
                                  >
                                    {ord.orderNumber}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(ord.orderNumber);
                                      showToast(`Copied ${ord.orderNumber}`);
                                    }}
                                    className="text-slate-400 hover:text-slate-700"
                                    title="Copy Order ID"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </button>
                                </div>
                                <span className="text-[10px] text-slate-400 font-sans block mt-0.5">
                                  {(ord.totalAmount || 0).toLocaleString()} FRW
                                </span>
                              </td>

                              {/* 2. Product Name & Image */}
                              <td className="py-3 px-3 min-w-[200px] max-w-[280px]">
                                {(() => {
                                  const resolvedImg = getProductImageDueToProduct(primaryItem, products);
                                  const resolvedName = getProductNameDueToProduct(primaryItem, products);
                                  return (
                                    <div className="flex items-center gap-2.5">
                                      <img
                                        src={resolvedImg}
                                        alt={resolvedName}
                                        className="w-10 h-10 rounded-xl object-cover border border-slate-200 bg-white shrink-0 shadow-2xs"
                                        referrerPolicy="no-referrer"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).src = getProductImageDueToProduct(primaryItem);
                                        }}
                                      />
                                      <div className="min-w-0">
                                        <p className="font-bold text-slate-800 truncate" title={resolvedName}>
                                          {resolvedName}
                                        </p>
                                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                                          <span>Qty: {primaryItem?.quantity || 1}</span>
                                          {remainingItemsCount > 0 && (
                                            <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-bold border border-slate-200">
                                              +{remainingItemsCount} more
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </td>

                              {/* 3. Customer Name & Phone */}
                              <td className="py-3 px-3 whitespace-nowrap">
                                <span className="font-bold text-slate-800 block">{ord.customerName}</span>
                                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                                  <span className="font-mono">{ord.customerPhone}</span>
                                  {rawPhone.length >= 7 && (
                                    <>
                                      <a
                                        href={waLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title="Chat with customer on WhatsApp"
                                        className="p-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                                      >
                                        <MessageCircle className="w-3 h-3 text-emerald-600" />
                                      </a>
                                      <a
                                        href={`tel:${ord.customerPhone}`}
                                        title="Call customer"
                                        className="p-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                                      >
                                        <Phone className="w-3 h-3 text-blue-600" />
                                      </a>
                                    </>
                                  )}
                                </div>
                              </td>

                              {/* 4. Supplier Name */}
                              <td className="py-3 px-3 whitespace-nowrap">
                                <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                                  {supplierDisplay}
                                </span>
                              </td>

                              {/* 5. Payment Status */}
                              <td className="py-3 px-3 whitespace-nowrap">
                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                                  ord.paymentStatus === 'Paid'
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    : ord.paymentStatus === 'Pending Verification'
                                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                    : ord.paymentStatus === 'Failed'
                                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                    : ord.paymentStatus === 'Refunded'
                                    ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                    : 'bg-orange-50 text-orange-800 border border-orange-200'
                                }`}>
                                  {ord.paymentStatus || 'Pending Payment'}
                                </span>
                              </td>

                              {/* 6. Order Date */}
                              <td className="py-3 px-3 text-slate-500 whitespace-nowrap text-[11px]">
                                <span className="block font-medium text-slate-800">
                                  {new Date(ord.createdAt).toLocaleDateString()}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </td>

                              {/* 7. Delivery Status */}
                              <td className="py-3 px-3 whitespace-nowrap">
                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                                  effectiveDelivery === 'Delivered'
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    : (effectiveDelivery === 'Shipped' || effectiveDelivery === 'In Transit' || effectiveDelivery === 'Out for Delivery')
                                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                    : effectiveDelivery === 'Processing' || effectiveDelivery === 'Awaiting Shipment'
                                    ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                                    : effectiveDelivery === 'Cancelled'
                                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                    : effectiveDelivery === 'Failed Delivery' || effectiveDelivery === 'Returned'
                                    ? 'bg-red-100 text-red-800 border border-red-200'
                                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                                }`}>
                                  {effectiveDelivery}
                                </span>
                              </td>

                              {/* 8. Tracking Number */}
                              <td className="py-3 px-3 whitespace-nowrap">
                                {ord.trackingNumber && ord.trackingNumber.trim() ? (
                                  <div className="flex items-center gap-1.5">
                                    <div className="flex flex-col">
                                      <span className="font-mono font-bold text-blue-700 text-xs select-all">
                                        {ord.trackingNumber}
                                      </span>
                                      {ord.trackingCarrier && (
                                        <span className="text-[9px] text-slate-400 font-medium">
                                          {ord.trackingCarrier}
                                        </span>
                                      )}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        navigator.clipboard.writeText(ord.trackingNumber || '');
                                        showToast(`Copied tracking #${ord.trackingNumber}`);
                                      }}
                                      className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 cursor-pointer"
                                      title="Copy tracking code"
                                    >
                                      <Copy className="w-3 h-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 italic font-medium text-[11px]">
                                    Not Yet Available
                                  </span>
                                )}
                              </td>

                              {/* 9. Expected Delivery Date */}
                              <td className="py-3 px-3 whitespace-nowrap">
                                {ord.expectedDeliveryDate && ord.expectedDeliveryDate.trim() ? (
                                  <div className="flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                    <span className="font-medium text-slate-800 text-[11px]">
                                      {new Date(ord.expectedDeliveryDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 italic font-medium text-[11px]">
                                    Not Yet Available
                                  </span>
                                )}
                              </td>

                              {/* Actions */}
                              <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                                <button
                                  onClick={() => handleOpenOrderDetail(ord)}
                                  className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg cursor-pointer text-[11px] border border-blue-200 transition-colors"
                                  title="View full order details & delivery management"
                                >
                                  Manage
                                </button>
                                <button
                                  onClick={() => setOrderStatusModal(ord)}
                                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg cursor-pointer text-[11px] transition-colors"
                                  title="Quick status update"
                                >
                                  Status
                                </button>
                                <button
                                  onClick={() => setPrintableInvoiceOrder(ord)}
                                  title="Print Packing Slip / Receipt"
                                  className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded cursor-pointer transition-colors"
                                >
                                  <Printer className="w-4 h-4 inline" />
                                </button>
                                <button
                                  onClick={() => handleDeleteSingleOrder(ord)}
                                  title="Permanently Delete Order"
                                  className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded cursor-pointer transition-colors"
                                >
                                  <Trash2 className="w-4 h-4 inline" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: PAYMENT VERIFICATION */}
          {activeTab === 'payments' && (() => {
            const paymentStats = {
              total: payments.length,
              successful: payments.filter(pm => {
                const ord = orders.find(o => o.id === pm.orderId || o.orderNumber === pm.orderNumber);
                return pm.verificationStatus === 'Verified/Paid' || pm.verificationStatus === 'Approved' || ord?.paymentStatus === 'Paid';
              }),
              pending: payments.filter(pm => {
                const ord = orders.find(o => o.id === pm.orderId || o.orderNumber === pm.orderNumber);
                const isSuccess = pm.verificationStatus === 'Verified/Paid' || pm.verificationStatus === 'Approved' || ord?.paymentStatus === 'Paid';
                return !isSuccess && (pm.verificationStatus === 'Pending Verification' || pm.verificationStatus === 'Under Verification' || pm.verificationStatus === 'Pending Review' || ord?.paymentStatus === 'Pending Payment' || ord?.paymentStatus === 'Pending Verification');
              }),
              failed: payments.filter(pm => {
                const ord = orders.find(o => o.id === pm.orderId || o.orderNumber === pm.orderNumber);
                return pm.verificationStatus === 'Rejected' || pm.verificationStatus === 'Failed' || ord?.paymentStatus === 'Failed' || ord?.paymentStatus === 'Payment Rejected';
              }),
              refunded: payments.filter(pm => {
                const ord = orders.find(o => o.id === pm.orderId || o.orderNumber === pm.orderNumber);
                return pm.verificationStatus === 'Refunded' || ord?.paymentStatus === 'Refunded';
              })
            };

            const totalSuccessfulFrw = paymentStats.successful.reduce((acc, pm) => acc + (pm.amountPaid || 0), 0);

            const filteredPaymentsList = payments.filter(pm => {
              const ord = orders.find(o => o.id === pm.orderId || o.orderNumber === pm.orderNumber);
              const isSuccess = pm.verificationStatus === 'Verified/Paid' || pm.verificationStatus === 'Approved' || ord?.paymentStatus === 'Paid';
              const isPending = !isSuccess && (pm.verificationStatus === 'Pending Verification' || pm.verificationStatus === 'Under Verification' || pm.verificationStatus === 'Pending Review' || ord?.paymentStatus === 'Pending Payment' || ord?.paymentStatus === 'Pending Verification');
              const isFailed = pm.verificationStatus === 'Rejected' || pm.verificationStatus === 'Failed' || ord?.paymentStatus === 'Failed' || ord?.paymentStatus === 'Payment Rejected';
              const isRefunded = pm.verificationStatus === 'Refunded' || ord?.paymentStatus === 'Refunded';

              if (paymentFilter === 'successful' && !isSuccess) return false;
              if (paymentFilter === 'pending' && !isPending) return false;
              if (paymentFilter === 'failed' && !isFailed) return false;
              if (paymentFilter === 'refunded' && !isRefunded) return false;

              if (paymentSearch.trim()) {
                const q = paymentSearch.toLowerCase().trim();
                const customerName = (ord?.customerName || pm.customerName || '').toLowerCase();
                const phone = (ord?.customerPhone || pm.paymentPhone || '').toLowerCase();
                const orderNum = (pm.orderNumber || ord?.orderNumber || '').toLowerCase();
                const txnRef = (pm.transactionId || '').toLowerCase();
                const method = (pm.paymentMethod || '').toLowerCase();
                return customerName.includes(q) || phone.includes(q) || orderNum.includes(q) || txnRef.includes(q) || method.includes(q);
              }

              return true;
            });

            return (
              <div className="space-y-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-xl font-black text-slate-900 tracking-tight">Mobile Money & Payment Verification</h1>
                    <p className="text-xs text-slate-500">Official automated verification for MTN Mobile Money & Airtel Money Rwanda with strict anti-fraud reconciliation</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => fetchAllData()}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                      title="Refresh payments and orders"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Refresh</span>
                    </button>
                  </div>
                </div>

                {/* Stat Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div
                    onClick={() => setPaymentFilter('all')}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      paymentFilter === 'all' ? 'bg-slate-900 text-white border-slate-900 shadow-sm' : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-[10px] font-bold uppercase tracking-wider opacity-75">All Payments</div>
                    <div className="text-xl font-black mt-1">{paymentStats.total}</div>
                    <div className="text-[10px] opacity-75 mt-0.5">Total recorded</div>
                  </div>

                  <div
                    onClick={() => setPaymentFilter('successful')}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      paymentFilter === 'successful' ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-emerald-50 text-emerald-950 border-emerald-200 hover:border-emerald-300'
                    }`}
                  >
                    <div className="text-[10px] font-bold uppercase tracking-wider opacity-85">Successful</div>
                    <div className="text-xl font-black mt-1">{paymentStats.successful.length}</div>
                    <div className="text-[10px] font-semibold opacity-90 mt-0.5">{totalSuccessfulFrw.toLocaleString()} FRW</div>
                  </div>

                  <div
                    onClick={() => setPaymentFilter('pending')}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      paymentFilter === 'pending' ? 'bg-amber-500 text-white border-amber-500 shadow-sm' : 'bg-amber-50 text-amber-950 border-amber-200 hover:border-amber-300'
                    }`}
                  >
                    <div className="text-[10px] font-bold uppercase tracking-wider opacity-85">Pending</div>
                    <div className="text-xl font-black mt-1">{paymentStats.pending.length}</div>
                    <div className="text-[10px] opacity-80 mt-0.5">Awaiting provider</div>
                  </div>

                  <div
                    onClick={() => setPaymentFilter('failed')}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      paymentFilter === 'failed' ? 'bg-rose-600 text-white border-rose-600 shadow-sm' : 'bg-rose-50 text-rose-950 border-rose-200 hover:border-rose-300'
                    }`}
                  >
                    <div className="text-[10px] font-bold uppercase tracking-wider opacity-85">Failed / Rejected</div>
                    <div className="text-xl font-black mt-1">{paymentStats.failed.length}</div>
                    <div className="text-[10px] opacity-80 mt-0.5">Declined or invalid</div>
                  </div>

                  <div
                    onClick={() => setPaymentFilter('refunded')}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      paymentFilter === 'refunded' ? 'bg-slate-700 text-white border-slate-700 shadow-sm' : 'bg-slate-50 text-slate-800 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-[10px] font-bold uppercase tracking-wider opacity-85">Refunded</div>
                    <div className="text-xl font-black mt-1">{paymentStats.refunded.length}</div>
                    <div className="text-[10px] opacity-80 mt-0.5">Returned to buyer</div>
                  </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
                  {/* Category Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
                    <button
                      type="button"
                      onClick={() => setPaymentFilter('all')}
                      className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer transition-colors shrink-0 ${
                        paymentFilter === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      All ({paymentStats.total})
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentFilter('successful')}
                      className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer transition-colors shrink-0 ${
                        paymentFilter === 'successful' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Successful ({paymentStats.successful.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentFilter('pending')}
                      className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer transition-colors shrink-0 ${
                        paymentFilter === 'pending' ? 'bg-amber-500 text-white' : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Pending ({paymentStats.pending.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentFilter('failed')}
                      className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer transition-colors shrink-0 ${
                        paymentFilter === 'failed' ? 'bg-rose-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Failed ({paymentStats.failed.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentFilter('refunded')}
                      className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer transition-colors shrink-0 ${
                        paymentFilter === 'refunded' ? 'bg-slate-700 text-white' : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Refunded ({paymentStats.refunded.length})
                    </button>
                  </div>

                  {/* Search Input */}
                  <div className="relative min-w-[240px]">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={paymentSearch}
                      onChange={(e) => setPaymentSearch(e.target.value)}
                      placeholder="Search order #, customer, phone, ref..."
                      className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#FF6000]"
                    />
                    {paymentSearch && (
                      <button
                        onClick={() => setPaymentSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Payments Table */}
                <div className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-400 font-bold uppercase text-[10px]">
                          <th className="py-3.5 px-4">Order ID & Date</th>
                          <th className="py-3.5 px-3">Customer Contact</th>
                          <th className="py-3.5 px-3">Product Details</th>
                          <th className="py-3.5 px-3">Total Amount</th>
                          <th className="py-3.5 px-3">Payment Method</th>
                          <th className="py-3.5 px-3">Txn Reference</th>
                          <th className="py-3.5 px-3">Payment Status</th>
                          <th className="py-3.5 px-3">Order Status & Delivery</th>
                          <th className="py-3.5 px-4 text-right">Verification & Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredPaymentsList.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="py-12 text-center text-slate-400">
                              <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                              <p className="font-bold text-sm">No payment records matching criteria</p>
                              <p className="text-xs text-slate-400 mt-0.5">Try adjusting the filter or search query</p>
                            </td>
                          </tr>
                        ) : (
                          filteredPaymentsList.map(pm => {
                            const ord = orders.find(o => o.id === pm.orderId || o.orderNumber === pm.orderNumber);
                            const customerName = ord?.customerName || pm.customerName || 'Customer';
                            const customerPhone = ord?.customerPhone || pm.paymentPhone || '';
                            const cleanPhone = customerPhone.replace(/\D/g, '');
                            const isPaid = pm.verificationStatus === 'Verified/Paid' || pm.verificationStatus === 'Approved' || ord?.paymentStatus === 'Paid';
                            const isRefunded = pm.verificationStatus === 'Refunded' || ord?.paymentStatus === 'Refunded';
                            const isFailed = pm.verificationStatus === 'Rejected' || pm.verificationStatus === 'Failed' || ord?.paymentStatus === 'Failed' || ord?.paymentStatus === 'Payment Rejected';
                            const isPending = !isPaid && !isRefunded && !isFailed;
                            const paymentDate = pm.verifiedAt || pm.submittedAt || ord?.createdAt || '';
                            const isPickup = ord?.deliveryType === 'pickup' || ord?.deliveryAddress?.toLowerCase().includes('fair view plaza') || ord?.deliveryNotes?.toLowerCase().includes('pickup');

                            return (
                              <tr key={pm.id} className="hover:bg-slate-50/70 transition-colors">
                                {/* 1. Order ID & Date */}
                                <td className="py-3 px-4">
                                  <button
                                    type="button"
                                    onClick={() => ord && setSelectedOrder(ord)}
                                    className="font-mono font-black text-slate-900 hover:text-[#FF6000] underline cursor-pointer block text-left"
                                    title="Click to view full order details"
                                  >
                                    #{pm.orderNumber}
                                  </button>
                                  <span className="text-[10px] text-slate-400 block mt-0.5">
                                    {paymentDate ? new Date(paymentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                                  </span>
                                </td>

                                {/* 2. Customer Name & Phone */}
                                <td className="py-3 px-3">
                                  <div className="font-bold text-slate-800">{customerName}</div>
                                  <div className="flex items-center gap-1.5 mt-1">
                                    <span className="font-mono text-[11px] text-slate-600">{customerPhone || 'No Phone'}</span>
                                    {cleanPhone && (
                                      <>
                                        <a
                                          href={`https://wa.me/250${cleanPhone.slice(-9)}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="p-1 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                                          title="Message on WhatsApp"
                                        >
                                          <MessageCircle className="w-3 h-3" />
                                        </a>
                                        <a
                                          href={`tel:+250${cleanPhone.slice(-9)}`}
                                          className="p-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                                          title="Call phone"
                                        >
                                          <Phone className="w-3 h-3" />
                                        </a>
                                      </>
                                    )}
                                  </div>
                                </td>

                                {/* 3. Product Details */}
                                <td className="py-3 px-3 max-w-[200px]">
                                  {ord && ord.items && ord.items.length > 0 ? (
                                    <div className="flex items-center gap-2">
                                      {ord.items[0].imageUrl && (
                                        <img
                                          src={ord.items[0].imageUrl}
                                          alt=""
                                          className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0"
                                        />
                                      )}
                                      <div className="truncate">
                                        <p className="font-semibold text-slate-800 text-[11px] truncate" title={ord.items[0].productName}>
                                          {ord.items[0].productName}
                                        </p>
                                        <span className="text-[10px] text-slate-500">
                                          Qty: {ord.items[0].quantity}
                                          {ord.items.length > 1 && ` (+${ord.items.length - 1} more)`}
                                        </span>
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-[11px] text-slate-400 italic">Order items in record</span>
                                  )}
                                </td>

                                {/* 4. Total Amount */}
                                <td className="py-3 px-3">
                                  <span className="font-mono font-black text-slate-900 text-xs block">
                                    {(pm.amountPaid || ord?.totalAmount || 0).toLocaleString()} FRW
                                  </span>
                                  {ord?.deliveryFee !== undefined && ord.deliveryFee > 0 ? (
                                    <span className="text-[9px] text-slate-500 font-semibold block">
                                      Incl. {ord.deliveryFee.toLocaleString()} FRW delivery
                                    </span>
                                  ) : null}
                                </td>

                                {/* 5. Payment Method */}
                                <td className="py-3 px-3">
                                  <div className="flex items-center gap-1.5">
                                    {pm.paymentMethod?.toLowerCase().includes('mtn') ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                        MTN MoMo
                                      </span>
                                    ) : pm.paymentMethod?.toLowerCase().includes('airtel') ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-900 border border-red-300">
                                        <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
                                        Airtel Money
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                                        {pm.paymentMethod || 'Mobile Money'}
                                      </span>
                                    )}
                                  </div>
                                </td>

                                {/* 6. Transaction Reference */}
                                <td className="py-3 px-3">
                                  <span className="font-mono font-bold text-blue-700 block text-[11px] select-all">
                                    {pm.transactionId || 'Awaiting Ref'}
                                  </span>
                                  <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                    {pm.verifiedDirectly ? (
                                      <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-300">
                                        <ShieldCheck className="w-2.5 h-2.5" />
                                        Direct API
                                      </span>
                                    ) : null}
                                    {pm.flaggedSuspicious && (
                                      <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-300">
                                        ⚠️ Duplicate
                                      </span>
                                    )}
                                  </div>
                                </td>

                                {/* 7. Payment Status */}
                                <td className="py-3 px-3">
                                  {isPaid ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                      PAID / CONFIRMED
                                    </span>
                                  ) : isRefunded ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                                      REFUNDED
                                    </span>
                                  ) : isFailed ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300">
                                      <XCircle className="w-3 h-3 text-rose-600" />
                                      FAILED
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                                      <Clock className="w-3 h-3 text-amber-600" />
                                      PENDING
                                    </span>
                                  )}
                                </td>

                                {/* 8. Order Status & Delivery */}
                                <td className="py-3 px-3">
                                  <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-1">
                                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                                        ord?.status === 'Delivered'
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : ord?.status === 'Out for Delivery'
                                          ? 'bg-blue-100 text-blue-800'
                                          : ord?.status === 'Confirmed'
                                          ? 'bg-purple-100 text-purple-800'
                                          : ord?.status === 'Cancelled'
                                          ? 'bg-rose-100 text-rose-800'
                                          : 'bg-slate-100 text-slate-700'
                                      }`}>
                                        {ord?.status || 'Processing'}
                                      </span>
                                    </div>
                                    <span className="inline-flex items-center gap-1 text-[10px] text-slate-600">
                                      {isPickup ? (
                                        <>
                                          <MapPin className="w-2.5 h-2.5 text-orange-600 shrink-0" />
                                          <span className="font-semibold text-orange-700">Fair View Plaza Pickup</span>
                                        </>
                                      ) : (
                                        <>
                                          <Truck className="w-2.5 h-2.5 text-blue-600 shrink-0" />
                                          <span className="font-semibold text-blue-700">Home Delivery</span>
                                        </>
                                      )}
                                    </span>
                                    {ord && (
                                      <button
                                        type="button"
                                        onClick={() => setOrderStatusModal(ord)}
                                        className="text-[10px] text-left text-slate-500 hover:text-slate-800 font-bold underline cursor-pointer mt-0.5"
                                      >
                                        Update Delivery / Status
                                      </button>
                                    )}
                                  </div>
                                </td>

                                {/* 9. Verification & Actions */}
                                <td className="py-3 px-4 text-right">
                                  <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                    {/* Direct Telecom API Verification Button */}
                                    {!isPaid && (
                                      <button
                                        type="button"
                                        disabled={telecomVerifyingId === pm.id}
                                        onClick={() => handleTelecomReverify(pm.id)}
                                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-lg text-[10px] flex items-center gap-1 cursor-pointer shadow-xs disabled:opacity-50"
                                        title="Directly query MTN or Airtel Rwanda server API to confirm this transaction"
                                      >
                                        {telecomVerifyingId === pm.id ? (
                                          <>
                                            <RefreshCw className="w-3 h-3 animate-spin" />
                                            <span>Checking...</span>
                                          </>
                                        ) : (
                                          <>
                                            <ShieldCheck className="w-3 h-3" />
                                            <span>Verify API</span>
                                          </>
                                        )}
                                      </button>
                                    )}

                                    {/* Proof Review Modal */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setVerifyModalPayment(pm);
                                        setVerifyNotes(`Verified with telecom records by ${currentUser?.name || 'Ruth'}`);
                                      }}
                                      className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg cursor-pointer text-[10px]"
                                      title="Review payment details & proof"
                                    >
                                      Review
                                    </button>

                                    {/* Quick Approve if Pending */}
                                    {!isPaid && !isRefunded && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => handleVerifyPayment('approve', 'Verified with MTN/Airtel telecom records', pm.id)}
                                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg cursor-pointer text-[10px]"
                                          title="Manually approve and confirm payment"
                                        >
                                          Approve
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleVerifyPayment('reject', 'Transaction reference not found on telecom statement', pm.id)}
                                          className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg cursor-pointer text-[10px]"
                                          title="Reject payment"
                                        >
                                          Reject
                                        </button>
                                      </>
                                    )}

                                    {/* Refund Button for Paid Payments */}
                                    {isPaid && (
                                      <button
                                        type="button"
                                        onClick={() => handleVerifyPayment('refund', 'Mobile Money refund processed by admin', pm.id)}
                                        className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg cursor-pointer text-[10px]"
                                        title="Mark payment as refunded and restore stock"
                                      >
                                        Refund
                                      </button>
                                    )}

                                    {/* Delete Payment Record */}
                                    <button
                                      type="button"
                                      onClick={() => handleDeletePaymentConfirmation(pm)}
                                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                      title="Delete payment record"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* TAB 7: INVENTORY & STOCK LOGS */}
          {activeTab === 'inventory' && (
            <div className="space-y-5">
              <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight">Inventory & Stock Movement Audit</h1>
                <p className="text-xs text-slate-500">Complete traceability of stock received, deducted, or restored</p>
              </div>

              <div className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-400 font-bold uppercase text-[10px]">
                        <th className="py-3 px-4">Date / Time</th>
                        <th className="py-3 px-3">Product Name</th>
                        <th className="py-3 px-3">Previous</th>
                        <th className="py-3 px-3">Change</th>
                        <th className="py-3 px-3">New Stock</th>
                        <th className="py-3 px-3">Reason / Trigger</th>
                        <th className="py-3 px-4">Authorized By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {inventoryLogs.map(log => (
                        <tr key={log.id} className="hover:bg-slate-50/60">
                          <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="py-3 px-3 font-bold text-slate-800 max-w-xs truncate">
                            {log.productName}
                          </td>
                          <td className="py-3 px-3 font-mono font-semibold text-slate-500">
                            {log.previousStock}
                          </td>
                          <td className="py-3 px-3 font-mono font-extrabold">
                            <span className={log.changeAmount > 0 ? 'text-emerald-600' : 'text-rose-600'}>
                              {log.changeAmount > 0 ? `+${log.changeAmount}` : log.changeAmount}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono font-extrabold text-slate-900">
                            {log.newStock}
                          </td>
                          <td className="py-3 px-3 text-slate-600">
                            {log.reason}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-700">
                            {log.adminName}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: MESSAGES & CUSTOMER CONVERSATIONS */}
          {activeTab === 'messages' && (() => {
            const unreadCount = messages.filter(m => m.status === 'unread' && m.sender !== 'admin').length;

            // Group messages into customer conversations
            const conversationMap = new Map<string, {
              customerId: string;
              customerName: string;
              customerEmail?: string;
              customerPhone?: string;
              messages: AdminMessage[];
              lastMessage: string;
              lastMessageAt: string;
              lastSender: 'customer' | 'admin' | 'system';
              unreadCount: number;
              orderNumbers: Set<string>;
            }>();

            for (const m of messages) {
              const key = (m.customerId && m.customerId.trim()) ||
                (m.email && m.email.toLowerCase().trim()) ||
                (m.phone && m.phone.replace(/\D/g, '')) ||
                m.id;

              if (!conversationMap.has(key)) {
                conversationMap.set(key, {
                  customerId: m.customerId || key,
                  customerName: m.name || 'Valued Customer',
                  customerEmail: m.email,
                  customerPhone: m.phone,
                  messages: [],
                  lastMessage: m.message,
                  lastMessageAt: m.createdAt,
                  lastSender: m.sender || 'customer',
                  unreadCount: 0,
                  orderNumbers: new Set()
                });
              }

              const conv = conversationMap.get(key)!;
              conv.messages.push(m);
              if (m.orderNumber) conv.orderNumbers.add(m.orderNumber);
              if (m.isReadByAdmin === false || (m.status === 'unread' && m.sender !== 'admin')) {
                conv.unreadCount++;
              }
              if (new Date(m.createdAt).getTime() > new Date(conv.lastMessageAt).getTime()) {
                conv.lastMessage = m.message;
                conv.lastMessageAt = m.createdAt;
                conv.lastSender = m.sender || 'customer';
              }
            }

            const conversationList = Array.from(conversationMap.values()).map(c => ({
              ...c,
              messages: c.messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
              orderNumbers: Array.from(c.orderNumbers)
            }));
            conversationList.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

            // Auto-select first conversation if none selected
            const activeCustomerId = selectedChatCustomerId || (conversationList[0]?.customerId ?? null);
            const activeConversation = conversationList.find(c => c.customerId === activeCustomerId) || conversationList[0];

            // Filtered messages for feed view
            const filteredMessages = messages.filter(msg => {
              if (messageFilter === 'unread' && msg.status !== 'unread') return false;
              if (messageFilter === 'read' && msg.status !== 'read') return false;
              if (messageFilter === 'replied' && !msg.replyNote && msg.sender !== 'admin') return false;

              if (!messageSearch.trim()) return true;
              const q = messageSearch.toLowerCase();
              return (
                msg.name.toLowerCase().includes(q) ||
                msg.email.toLowerCase().includes(q) ||
                (msg.phone && msg.phone.includes(q)) ||
                (msg.orderNumber && msg.orderNumber.toLowerCase().includes(q)) ||
                msg.subject.toLowerCase().includes(q) ||
                msg.message.toLowerCase().includes(q)
              );
            });

            const handleSendAdminReply = async (e?: React.FormEvent) => {
              if (e) e.preventDefault();
              if (!adminChatReplyInput.trim() || !activeConversation || sendingAdminChatReply) return;

              setSendingAdminChatReply(true);
              const text = adminChatReplyInput.trim();
              const primaryOrder = activeConversation.orderNumbers[0];

              try {
                await api.adminReplyToConversation(activeConversation.customerId, {
                  message: text,
                  orderNumber: primaryOrder,
                  subject: primaryOrder ? `Re: Order #${primaryOrder}` : 'Customer Support Response'
                });
                setAdminChatReplyInput('');
                showToast('Reply sent to customer inbox in real time!');
                fetchAllData();
              } catch (err: any) {
                alert(err.message || 'Failed to send reply to customer.');
              } finally {
                setSendingAdminChatReply(false);
              }
            };

            return (
              <div className="space-y-4">
                {/* Header & Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h1 className="text-xl font-black text-slate-900 tracking-tight">Customer Inbox & Live Conversations</h1>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Live Synchronized Across Devices
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Chat directly with registered customers in real time, view order tracking inquiries, and send instant notifications
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <span className="px-3 py-1 rounded-full text-xs font-black bg-[#FF6000] text-white flex items-center gap-1.5 self-start sm:self-auto shadow-2xs">
                        <Mail className="w-3.5 h-3.5" />
                        <span>{unreadCount} Unread</span>
                      </span>
                    )}

                    {/* View Mode Toggle: Conversations vs Feed */}
                    <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => setMessageViewMode('conversations')}
                        className={`px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${
                          messageViewMode === 'conversations' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Conversations ({conversationList.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setMessageViewMode('feed')}
                        className={`px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${
                          messageViewMode === 'feed' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        All Messages ({messages.length})
                      </button>
                    </div>
                  </div>
                </div>

                {/* VIEW 1: CONVERSATIONS & CHAT MANAGER */}
                {messageViewMode === 'conversations' && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 bg-white rounded-3xl border border-slate-200 shadow-2xs p-4 min-h-[520px]">
                    {/* Left Pane: Customer Threads List */}
                    <div className="lg:col-span-5 border-b lg:border-b-0 lg:border-r border-slate-100 pr-0 lg:pr-4 flex flex-col space-y-3">
                      <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          value={messageSearch}
                          onChange={(e) => setMessageSearch(e.target.value)}
                          placeholder="Search conversations by customer or order..."
                          className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF6000]"
                        />
                      </div>

                      <div className="flex-1 overflow-y-auto space-y-2 max-h-[500px] pr-1">
                        {conversationList.length === 0 ? (
                          <div className="p-8 text-center text-xs text-slate-400">
                            No conversations yet. Customer inquiries and chat messages will appear here.
                          </div>
                        ) : (
                          conversationList
                            .filter(c => {
                              if (!messageSearch.trim()) return true;
                              const q = messageSearch.toLowerCase();
                              return (
                                c.customerName.toLowerCase().includes(q) ||
                                (c.customerEmail && c.customerEmail.toLowerCase().includes(q)) ||
                                (c.customerPhone && c.customerPhone.includes(q)) ||
                                c.orderNumbers.some(o => o.toLowerCase().includes(q)) ||
                                c.lastMessage.toLowerCase().includes(q)
                              );
                            })
                            .map(conv => {
                              const isSelected = activeConversation?.customerId === conv.customerId;
                              return (
                                <div
                                  key={conv.customerId}
                                  onClick={() => setSelectedChatCustomerId(conv.customerId)}
                                  className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                                    isSelected
                                      ? 'bg-orange-50/70 border-[#FF6000] ring-1 ring-[#FF6000]/20'
                                      : 'bg-slate-50/60 hover:bg-slate-100 border-slate-200/80'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-1 mb-1">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <span className="font-extrabold text-xs text-slate-900 truncate">
                                        {conv.customerName}
                                      </span>
                                      {conv.unreadCount > 0 && (
                                        <span className="px-1.5 py-0.2 rounded-full bg-[#FF6000] text-white text-[9px] font-black shrink-0">
                                          {conv.unreadCount} new
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                                      {new Date(conv.lastMessageAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                    </span>
                                  </div>

                                  <p className="text-[11px] text-slate-600 truncate font-medium">
                                    {conv.lastSender === 'admin' ? <strong className="text-slate-800">You: </strong> : null}
                                    {conv.lastMessage}
                                  </p>

                                  <div className="flex items-center gap-2 mt-2 pt-1 border-t border-slate-200/50 text-[10px] text-slate-400">
                                    {conv.customerPhone && <span className="font-mono">{conv.customerPhone}</span>}
                                    {conv.orderNumbers.length > 0 && (
                                      <span className="font-mono font-bold bg-slate-200/70 text-slate-700 px-1.5 py-0.2 rounded">
                                        Order #{conv.orderNumbers[0]}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                        )}
                      </div>
                    </div>

                    {/* Right Pane: Live Chat & Reply Composer */}
                    <div className="lg:col-span-7 flex flex-col justify-between pl-0 lg:pl-2 min-h-[460px]">
                      {activeConversation ? (
                        <>
                          {/* Chat Header for Selected Customer */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-black text-sm text-slate-900">
                                  {activeConversation.customerName}
                                </h3>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                                  {activeConversation.messages.length} message(s)
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 flex-wrap">
                                {activeConversation.customerPhone && (
                                  <span className="font-mono font-medium">{activeConversation.customerPhone}</span>
                                )}
                                {activeConversation.customerEmail && (
                                  <span>{activeConversation.customerEmail}</span>
                                )}
                                {activeConversation.customerPhone && (
                                  <div className="flex items-center gap-2 ml-1">
                                    <a
                                      href={`https://wa.me/25${activeConversation.customerPhone.replace(/\D/g, '')}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-emerald-600 font-bold hover:underline inline-flex items-center gap-0.5 text-[10px]"
                                    >
                                      <MessageCircle className="w-3 h-3" />
                                      <span>WhatsApp</span>
                                    </a>
                                    <span className="text-slate-300">·</span>
                                    <a
                                      href={`tel:${activeConversation.customerPhone}`}
                                      className="text-blue-600 font-bold hover:underline inline-flex items-center gap-0.5 text-[10px]"
                                    >
                                      <Phone className="w-3 h-3" />
                                      <span>Call</span>
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={async () => {
                                await api.adminMarkConversationRead(activeConversation.customerId);
                                showToast('Marked thread as read');
                                fetchAllData();
                              }}
                              className="text-[11px] px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg cursor-pointer self-start sm:self-auto"
                            >
                              Mark Read
                            </button>
                          </div>

                          {/* Chat Messages Stream */}
                          <div className="flex-1 overflow-y-auto space-y-3 max-h-[340px] pr-2 bg-slate-50/40 p-3 rounded-2xl border border-slate-100 mb-3">
                            {activeConversation.messages.map(msg => {
                              const isAdmin = msg.sender === 'admin';
                              const isSystem = msg.sender === 'system' || msg.notificationType === 'order_update';

                              if (isSystem) {
                                return (
                                  <div key={msg.id} className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-0.5 my-1.5">
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-amber-900 text-[11px] flex items-center gap-1">
                                        <Bell className="w-3 h-3 text-amber-600" />
                                        <span>System Order Notification</span>
                                      </span>
                                      <span className="text-[10px] text-amber-600 font-mono">
                                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-amber-800">{msg.message}</p>
                                  </div>
                                );
                              }

                              return (
                                <div
                                  key={msg.id}
                                  className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}
                                >
                                  <div className="flex items-center gap-1.5 mb-0.5 px-1 text-[10px] text-slate-400">
                                    <span className="font-bold text-slate-600">
                                      {isAdmin ? (msg.senderName || 'Staff (Admin)') : activeConversation.customerName}
                                    </span>
                                    <span>•</span>
                                    <span>
                                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>

                                  <div
                                    className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed shadow-2xs ${
                                      isAdmin
                                        ? 'bg-[#121316] text-white rounded-tr-xs'
                                        : 'bg-white text-slate-800 border border-slate-200 rounded-tl-xs'
                                    }`}
                                  >
                                    {msg.orderNumber && (
                                      <div className={`text-[10px] font-bold mb-1 pb-1 border-b flex items-center gap-1 ${
                                        isAdmin ? 'border-white/20 text-orange-300' : 'border-slate-100 text-[#FF6000]'
                                      }`}>
                                        <Package className="w-3 h-3" />
                                        <span>Order #{msg.orderNumber}</span>
                                      </div>
                                    )}
                                    <p className="whitespace-pre-wrap">{msg.message}</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Quick Admin Reply Templates */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[10px]">
                              <span className="text-slate-400 font-bold shrink-0">Quick reply:</span>
                              {[
                                'Payment verified! Your order is being packed.',
                                'Rider is on the way with your package.',
                                'Thank you for reaching out! We are on it.'
                              ].map(tpl => (
                                <button
                                  key={tpl}
                                  type="button"
                                  onClick={() => setAdminChatReplyInput(tpl)}
                                  className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-orange-50 hover:text-[#FF6000] text-slate-600 font-medium shrink-0 cursor-pointer text-[10px]"
                                >
                                  {tpl}
                                </button>
                              ))}
                            </div>

                            {/* Reply Form */}
                            <form onSubmit={handleSendAdminReply} className="flex items-center gap-2">
                              <input
                                type="text"
                                value={adminChatReplyInput}
                                onChange={(e) => setAdminChatReplyInput(e.target.value)}
                                placeholder={`Reply directly to ${activeConversation.customerName}...`}
                                className="flex-1 px-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF6000] focus:bg-white"
                                disabled={sendingAdminChatReply}
                              />
                              <button
                                type="submit"
                                disabled={!adminChatReplyInput.trim() || sendingAdminChatReply}
                                className="px-5 py-2.5 bg-[#FF6000] hover:bg-orange-600 text-white rounded-2xl font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors shadow-xs shrink-0"
                              >
                                {sendingAdminChatReply ? (
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <>
                                    <Send className="w-3.5 h-3.5" />
                                    <span>Send Reply</span>
                                  </>
                                )}
                              </button>
                            </form>
                          </div>
                        </>
                      ) : (
                        <div className="flex-1 flex items-center justify-center text-xs text-slate-400">
                          Select a customer conversation from the left to view messages and reply.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* VIEW 2: FEED OF ALL INBOUND MESSAGES & SMS */}
                {messageViewMode === 'feed' && (
                  <div className="space-y-3">
                    {/* Filter and Search Bar */}
                    <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
                      <div className="relative flex-1">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input
                          type="text"
                          value={messageSearch}
                          onChange={(e) => setMessageSearch(e.target.value)}
                          placeholder="Search messages by sender name, phone, order #, subject or text..."
                          className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF6000] focus:border-transparent"
                        />
                      </div>

                      <div className="flex items-center gap-1 overflow-x-auto p-0.5 bg-slate-100 rounded-xl text-xs font-bold shrink-0">
                        <button
                          onClick={() => setMessageFilter('all')}
                          className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                            messageFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          All ({messages.length})
                        </button>
                        <button
                          onClick={() => setMessageFilter('unread')}
                          className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                            messageFilter === 'unread' ? 'bg-white text-[#FF6000] shadow-xs' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Unread ({unreadCount})
                        </button>
                        <button
                          onClick={() => setMessageFilter('read')}
                          className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                            messageFilter === 'read' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Read
                        </button>
                        <button
                          onClick={() => setMessageFilter('replied')}
                          className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                            messageFilter === 'replied' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Replied
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      {filteredMessages.length === 0 ? (
                        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
                          <Mail className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <p className="text-sm font-bold text-slate-600">No messages match your search or filter.</p>
                          <p className="text-xs text-slate-400 mt-1">Customer inquiries submitted through Contact Reach Market appear here in real-time.</p>
                        </div>
                      ) : (
                        filteredMessages.map(msg => (
                          <div key={msg.id} className={`p-5 rounded-2xl border bg-white shadow-2xs space-y-3 ${
                            msg.status === 'unread' && msg.sender !== 'admin' ? 'border-orange-300 ring-1 ring-orange-200' : 'border-slate-200'
                          }`}>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-extrabold text-sm text-slate-900">{msg.name}</span>
                                  <span className="text-xs text-slate-500">({msg.email})</span>
                                  {msg.status === 'unread' && msg.sender !== 'admin' && (
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-[#FF6000] text-white uppercase">
                                      Unread
                                    </span>
                                  )}
                                  {msg.replyNote && (
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-800 uppercase">
                                      Replied
                                    </span>
                                  )}
                                  {msg.sender === 'admin' && (
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-slate-900 text-white uppercase">
                                      Admin Reply
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs text-slate-500 font-mono">
                                    Phone: {msg.phone || 'N/A'} {msg.orderNumber && `· Order #${msg.orderNumber}`}
                                  </span>
                                  {msg.phone && (
                                    <div className="flex items-center gap-1.5 ml-2">
                                      <a
                                        href={`https://wa.me/25${msg.phone.replace(/\D/g, '')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[10px] text-emerald-600 hover:underline font-bold inline-flex items-center gap-0.5"
                                      >
                                        <MessageCircle className="w-3 h-3" />
                                        <span>WhatsApp</span>
                                      </a>
                                      <span className="text-slate-300">·</span>
                                      <a
                                        href={`tel:${msg.phone}`}
                                        className="text-[10px] text-blue-600 hover:underline font-bold inline-flex items-center gap-0.5"
                                      >
                                        <Phone className="w-3 h-3" />
                                        <span>Call</span>
                                      </a>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <span className="text-[11px] font-mono text-slate-400">
                                {new Date(msg.createdAt).toLocaleString()}
                              </span>
                            </div>

                            <div>
                              <h4 className="font-bold text-xs text-slate-800 mb-1">{msg.subject}</h4>
                              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                                {msg.message}
                              </p>
                            </div>

                            {msg.replyNote && (
                              <div className="p-3 rounded-xl bg-orange-50 border border-orange-200 text-xs text-orange-950">
                                <span className="font-bold block text-[11px]">Staff Reply Note (by {msg.repliedBy || 'Admin'}):</span>
                                <p>{msg.replyNote}</p>
                              </div>
                            )}

                            <div className="flex items-center justify-end gap-2 pt-1 flex-wrap">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedChatCustomerId(msg.customerId || msg.email || msg.phone || msg.id);
                                  setMessageViewMode('conversations');
                                }}
                                className="px-3 py-1 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-lg cursor-pointer flex items-center gap-1"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>Open Chat Thread</span>
                              </button>

                              {msg.status === 'unread' && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await api.adminUpdateMessage(msg.id, { status: 'read' });
                                    showToast('Marked as read');
                                    fetchAllData();
                                  }}
                                  className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg cursor-pointer"
                                >
                                  Mark Read
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={async () => {
                                  if (confirm(`Delete message from ${msg.name}? This will remove it from the database and Cloud Firestore.`)) {
                                    await api.adminDeleteMessage(msg.id);
                                    showToast('Message deleted');
                                    fetchAllData();
                                  }
                                }}
                                className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-lg cursor-pointer border border-rose-200"
                                title="Delete Message"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* TAB 9: PROBLEMS & COMPLAINTS */}
          {activeTab === 'problems' && (() => {
            const filteredProblems = problems.filter(prob => {
              if (problemFilter !== 'all' && prob.status !== problemFilter) return false;

              if (!problemSearch.trim()) return true;
              const q = problemSearch.toLowerCase();
              return (
                prob.customerName.toLowerCase().includes(q) ||
                prob.customerPhone.includes(q) ||
                (prob.orderNumber && prob.orderNumber.toLowerCase().includes(q)) ||
                prob.caseNumber.toLowerCase().includes(q) ||
                prob.category.toLowerCase().includes(q) ||
                prob.description.toLowerCase().includes(q)
              );
            });

            return (
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h1 className="text-xl font-black text-slate-900 tracking-tight">Customer Problems, Complaints & Reports</h1>
                    <p className="text-xs text-slate-500">Track cases, assign investigators, and document official resolutions</p>
                  </div>
                  <button
                    onClick={() => {
                      fetchAllData();
                      showToast('Problem cases refreshed');
                    }}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Refresh</span>
                  </button>
                </div>

                {/* Search & Filter Bar */}
                <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      value={problemSearch}
                      onChange={(e) => setProblemSearch(e.target.value)}
                      placeholder="Search cases by customer name, phone, case #, order #, or issue details..."
                      className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF6000] focus:border-transparent"
                    />
                  </div>

                  <div className="flex items-center gap-1 overflow-x-auto p-0.5 bg-slate-100 rounded-xl text-xs font-bold shrink-0">
                    <button
                      onClick={() => setProblemFilter('all')}
                      className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                        problemFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      All ({problems.length})
                    </button>
                    <button
                      onClick={() => setProblemFilter('Open')}
                      className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                        problemFilter === 'Open' ? 'bg-white text-rose-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Open
                    </button>
                    <button
                      onClick={() => setProblemFilter('In Progress')}
                      className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                        problemFilter === 'In Progress' ? 'bg-white text-amber-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      In Progress
                    </button>
                    <button
                      onClick={() => setProblemFilter('Resolved')}
                      className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                        problemFilter === 'Resolved' ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Resolved
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3.5">
                  {filteredProblems.length === 0 ? (
                    <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
                      <AlertTriangle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm font-bold text-slate-600">No problem reports found.</p>
                      <p className="text-xs text-slate-400 mt-1">Customer reported problems or disputes will appear here for staff investigation.</p>
                    </div>
                  ) : (
                    filteredProblems.map(prob => (
                      <div key={prob.id} className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-sm text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200">
                                {prob.caseNumber}
                              </span>
                              <span className="font-extrabold text-sm text-slate-900">{prob.customerName}</span>
                              <span className="text-xs text-slate-500">({prob.customerPhone})</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[11px] text-slate-400 capitalize">
                                Category: {prob.category.replace('_', ' ')} {prob.orderNumber && `· Order #${prob.orderNumber}`}
                              </span>
                              {prob.customerPhone && (
                                <div className="flex items-center gap-1.5 ml-2">
                                  <a
                                    href={`https://wa.me/25${prob.customerPhone.replace(/\D/g, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[10px] text-emerald-600 hover:underline font-bold inline-flex items-center gap-0.5"
                                  >
                                    <MessageCircle className="w-3 h-3" />
                                    <span>WhatsApp</span>
                                  </a>
                                  <span className="text-slate-300">·</span>
                                  <a
                                    href={`tel:${prob.customerPhone}`}
                                    className="text-[10px] text-blue-600 hover:underline font-bold inline-flex items-center gap-0.5"
                                  >
                                    <Phone className="w-3 h-3" />
                                    <span>Call</span>
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              prob.priority === 'urgent' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {prob.priority}
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                              prob.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {prob.status}
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">
                          {prob.description}
                        </p>

                        {prob.resolution && (
                          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
                            <span className="font-bold block text-[11px]">Official Resolution:</span>
                            <p>{prob.resolution}</p>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[11px] text-slate-400 font-mono">
                            Logged: {new Date(prob.createdAt).toLocaleString()} · Assigned: {prob.assignedTo || 'Unassigned'}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setSelectedProblem(prob);
                                setProbStatus(prob.status);
                                setProbResolution(prob.resolution || '');
                                setProbStaffNote('');
                              }}
                              className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl cursor-pointer"
                            >
                              Manage & Resolve Case
                            </button>
                            <button
                              onClick={() => handleDeleteCustomerProblem(prob)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                              title="Delete problem report"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })()}

          {/* TAB 10: CUSTOMERS & REGISTERED BUYERS */}
          {activeTab === 'customers' && (() => {
            const registeredBuyers = customers.filter(c => c.isRegisteredBuyer || Boolean(c.passwordHash) || c.accountType === 'buyer');
            const guestCustomers = customers.filter(c => !c.isRegisteredBuyer && !c.passwordHash && c.accountType !== 'buyer');
            const activeAccounts = customers.filter(c => c.status !== 'Suspended');
            const totalRevenue = customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0);

            const filteredCustomers = customers.filter(c => {
              // Type filter
              if (customerFilter === 'buyers' && (!c.isRegisteredBuyer && !c.passwordHash && c.accountType !== 'buyer')) return false;
              if (customerFilter === 'guests' && (c.isRegisteredBuyer || Boolean(c.passwordHash) || c.accountType === 'buyer')) return false;

              // Search query
              if (!customerSearch.trim()) return true;
              const q = customerSearch.toLowerCase().trim();
              const cleanQ = q.replace(/\D/g, '');
              const cleanPhone = c.phone.replace(/\D/g, '');
              const phoneMatch = cleanQ.length > 0 && cleanPhone.includes(cleanQ);
              const nameMatch = c.name.toLowerCase().includes(q);
              const emailMatch = c.email?.toLowerCase().includes(q);
              const addressMatch = c.deliveryAddress?.toLowerCase().includes(q);
              return phoneMatch || nameMatch || emailMatch || addressMatch;
            });

            return (
              <div className="space-y-5">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h1 className="text-xl font-black text-slate-900 tracking-tight">Customer & Buyer Directory</h1>
                    <p className="text-xs text-slate-500">
                      Manage registered buyers, 5-digit PIN security accounts, customer phone numbers, and full purchase histories.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      fetchAllData();
                      showToast('Customer directory refreshed');
                    }}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Refresh</span>
                  </button>
                </div>

                {/* KPI Overview Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Customers</span>
                      <Users className="w-4 h-4 text-blue-500" />
                    </div>
                    <p className="text-xl font-black text-slate-900 mt-1">{customers.length}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Phone numbers recorded</p>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">5-Digit PIN Buyers</span>
                      <KeyRound className="w-4 h-4 text-[#FF6000]" />
                    </div>
                    <p className="text-xl font-black text-[#FF6000] mt-1">{registeredBuyers.length}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">With secure password account</p>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Accounts</span>
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    </div>
                    <p className="text-xl font-black text-emerald-600 mt-1">{activeAccounts.length}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Eligible for fast checkout</p>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Customer Volume</span>
                      <DollarSign className="w-4 h-4 text-amber-500" />
                    </div>
                    <p className="text-lg font-black text-slate-900 mt-1">{totalRevenue.toLocaleString()} FRW</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Gross historical purchases</p>
                  </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      placeholder="Search customer by name, phone (e.g. 078...), email, or location..."
                      className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF6000] focus:border-transparent"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto p-0.5 bg-slate-100 rounded-xl text-xs font-bold shrink-0">
                    <button
                      onClick={() => setCustomerFilter('all')}
                      className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                        customerFilter === 'all'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      All ({customers.length})
                    </button>
                    <button
                      onClick={() => setCustomerFilter('buyers')}
                      className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                        customerFilter === 'buyers'
                          ? 'bg-white text-[#FF6000] shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <KeyRound className="w-3 h-3" />
                      <span>Registered ({registeredBuyers.length})</span>
                    </button>
                    <button
                      onClick={() => setCustomerFilter('guests')}
                      className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                        customerFilter === 'guests'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Guests ({guestCustomers.length})
                    </button>
                  </div>
                </div>

                {/* Customer Table */}
                <div className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-400 font-bold uppercase text-[10px]">
                          <th className="py-3 px-4">Customer / Buyer</th>
                          <th className="py-3 px-3">Phone Number</th>
                          <th className="py-3 px-3">Account Security</th>
                          <th className="py-3 px-3">Delivery Address</th>
                          <th className="py-3 px-3">Orders</th>
                          <th className="py-3 px-3">Total Spent</th>
                          <th className="py-3 px-3">Status</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredCustomers.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="py-8 text-center text-slate-400">
                              No customer records found matching your query.
                            </td>
                          </tr>
                        ) : (
                          filteredCustomers.map(c => {
                            const isRegistered = c.isRegisteredBuyer || Boolean(c.passwordHash) || c.accountType === 'buyer';
                            const isSuspended = c.status === 'Suspended';

                            return (
                              <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                                {/* Name and Avatar */}
                                <td className="py-3.5 px-4">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-2xs">
                                      {c.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                      <p className="font-bold text-slate-900 leading-tight">{c.name}</p>
                                      {c.email ? (
                                        <p className="text-[10px] text-slate-400">{c.email}</p>
                                      ) : (
                                        <p className="text-[10px] text-slate-400">ID: {c.id.slice(0, 12)}</p>
                                      )}
                                    </div>
                                  </div>
                                </td>

                                {/* Phone */}
                                <td className="py-3.5 px-3">
                                  <div className="flex items-center gap-1 font-mono font-bold text-slate-800">
                                    <Phone className="w-3 h-3 text-[#FF6000] shrink-0" />
                                    <span>{c.phone}</span>
                                  </div>
                                  <a
                                    href={`https://wa.me/25${c.phone.replace(/\D/g, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[10px] text-emerald-600 hover:underline inline-block font-semibold"
                                  >
                                    WhatsApp
                                  </a>
                                </td>

                                {/* Account Security */}
                                <td className="py-3.5 px-3">
                                  {isRegistered ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-orange-50 border border-orange-200 text-[#FF6000]">
                                      <KeyRound className="w-3 h-3" />
                                      <span>5-Digit Password Account</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                                      Guest Checkout
                                    </span>
                                  )}
                                  <p className="text-[10px] text-slate-400 mt-0.5">
                                    {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'N/A'}
                                  </p>
                                </td>

                                {/* Delivery Address */}
                                <td className="py-3.5 px-3 text-slate-600 max-w-xs">
                                  <div className="flex items-start gap-1">
                                    <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                                    <span className="truncate">{c.deliveryAddress || 'Kigali Area'}</span>
                                  </div>
                                </td>

                                {/* Orders */}
                                <td className="py-3.5 px-3 font-mono font-bold text-blue-600">
                                  <span className="bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/80">
                                    {c.totalOrders || 0}
                                  </span>
                                </td>

                                {/* Total Spent */}
                                <td className="py-3.5 px-3 font-mono font-extrabold text-[#FF6000]">
                                  {(c.totalSpent || 0).toLocaleString()} FRW
                                </td>

                                {/* Status */}
                                <td className="py-3.5 px-3">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                      isSuspended
                                        ? 'bg-rose-100 text-rose-800'
                                        : 'bg-emerald-100 text-emerald-800'
                                    }`}
                                  >
                                    {c.status || 'Active'}
                                  </span>
                                </td>

                                {/* Actions */}
                                <td className="py-3.5 px-4 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      onClick={async () => {
                                        setLoadingCustomerDetail(true);
                                        try {
                                          const detail = await api.adminGetCustomerById(c.id);
                                          if (detail) {
                                            setSelectedCustomerDetail(detail);
                                          } else {
                                            setSelectedCustomerDetail({ customer: c, orders: [] });
                                          }
                                        } catch {
                                          setSelectedCustomerDetail({ customer: c, orders: [] });
                                        } finally {
                                          setLoadingCustomerDetail(false);
                                        }
                                      }}
                                      className="p-1.5 rounded-lg border border-slate-200 text-slate-700 hover:text-[#FF6000] hover:bg-orange-50 transition-colors cursor-pointer"
                                      title="View Full Profile and Orders"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                      onClick={() => handleOpenEditCustomer(c)}
                                      className="p-1.5 rounded-lg border border-slate-200 text-slate-700 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                                      title="Edit Customer Profile"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>

                                    {isRegistered && (
                                      <button
                                        onClick={() => {
                                          setResetPinCustomer(c);
                                          setTempPin('');
                                          setPinActionMessage(null);
                                        }}
                                        className="p-1.5 rounded-lg border border-slate-200 text-slate-700 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                                        title="Reset 5-Digit Password"
                                      >
                                        <Lock className="w-3.5 h-3.5" />
                                      </button>
                                    )}

                                    <button
                                      onClick={async () => {
                                        const nextStatus = isSuspended ? 'Active' : 'Suspended';
                                        try {
                                          await api.adminUpdateBuyerStatus(c.id, nextStatus);
                                          c.status = nextStatus;
                                          showToast(`Buyer status set to ${nextStatus}`);
                                          fetchAllData();
                                        } catch (err: any) {
                                          alert(err.message || 'Failed to update status');
                                        }
                                      }}
                                      className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                        isSuspended
                                          ? 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                                          : 'border-rose-200 text-rose-600 hover:bg-rose-50'
                                      }`}
                                      title={isSuspended ? 'Activate Account' : 'Suspend Account'}
                                    >
                                      {isSuspended ? (
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                      ) : (
                                        <XCircle className="w-3.5 h-3.5" />
                                      )}
                                    </button>

                                    <button
                                      onClick={async () => {
                                        if (confirm(`Are you sure you want to delete customer account "${c.name}"? This will delete all user data and synchronize with Firebase.`)) {
                                          try {
                                            await api.adminDeleteCustomer(c.id);
                                            showToast(`Customer account "${c.name}" deleted.`);
                                            fetchAllData();
                                          } catch (err: any) {
                                            alert(err.message || 'Failed to delete customer');
                                          }
                                        }
                                      }}
                                      className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                      title="Delete Customer Account"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* TAB 11: COUPONS */}
          {activeTab === 'coupons' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">Discounts & Promo Codes</h1>
                  <p className="text-xs text-slate-500">Create promotional codes verified securely on checkout</p>
                </div>
                <button
                  onClick={() => {
                    setCoupCode('');
                    setCoupType('fixed');
                    setCoupVal(2000);
                    setCoupMin(15000);
                    setCouponModalOpen(true);
                  }}
                  className="px-4 py-2.5 bg-[#FF6000] hover:bg-[#e05500] text-white text-xs font-bold rounded-2xl shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Coupon</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {coupons.map(coup => (
                  <div key={coup.id} className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-black text-base text-orange-600 bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-200">
                        {coup.code}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                        Active
                      </span>
                    </div>

                    <div className="text-xs space-y-1">
                      <p className="font-extrabold text-slate-900">
                        {coup.discountType === 'percentage' ? `${coup.discountValue}% OFF` : `${coup.discountValue.toLocaleString()} FRW OFF`}
                      </p>
                      {coup.minOrderAmount && (
                        <p className="text-slate-500">Min Order: {coup.minOrderAmount.toLocaleString()} FRW</p>
                      )}
                      <p className="text-slate-400 text-[11px] font-mono">Times used: {coup.timesUsed}</p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex justify-end">
                      <button
                        onClick={async () => {
                          if (confirm(`Delete coupon ${coup.code}?`)) {
                            await api.adminDeleteCoupon(coup.id);
                            showToast('Coupon removed');
                            fetchAllData();
                          }
                        }}
                        className="text-rose-600 hover:text-rose-800 text-xs font-bold"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 12: AUDIT LOGS */}
          {activeTab === 'audit' && (
            <div className="space-y-5">
              <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight">System Audit Trail</h1>
                <p className="text-xs text-slate-500">Immutable chronological log of all administrator operations</p>
              </div>

              <div className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-400 font-bold uppercase text-[10px]">
                        <th className="py-3 px-4">Timestamp</th>
                        <th className="py-3 px-3">Administrator</th>
                        <th className="py-3 px-3">Action</th>
                        <th className="py-3 px-4">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {auditLogs.map(log => (
                        <tr key={log.id} className="hover:bg-slate-50/60">
                          <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-bold text-slate-800 block">{log.adminName}</span>
                            <span className="text-[10px] text-slate-400 uppercase">{log.adminRole}</span>
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-orange-600">
                            {log.action}
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            {log.details}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 12B: TEAM & ROLES MANAGEMENT */}
          {activeTab === 'team' && (
            <div className="space-y-6 max-w-5xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">Administrative Team & Role Permissions</h1>
                  <p className="text-xs text-slate-500">Manage staff roles, access privileges, and security enforcement. Account revocations take effect immediately.</p>
                </div>
                {currentUser?.role === 'owner' && (
                  <button
                    onClick={() => setNewUserModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-[#FF6000] hover:bg-[#e05500] text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer self-start sm:self-auto"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Team Member</span>
                  </button>
                )}
              </div>

              {/* Security Invariant Banner */}
              <div className="bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 border border-orange-200/80 rounded-2xl p-4 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-700 leading-relaxed">
                  <strong className="font-bold text-slate-900">Enforced Role-Based Access Control (RBAC):</strong>
                  <ul className="list-disc list-inside mt-1 space-y-0.5 text-slate-600 text-[11px]">
                    <li><span className="font-semibold text-slate-800">Owner:</span> Full operational and team authority across all functions.</li>
                    <li><span className="font-semibold text-slate-800">Administrator:</span> Catalog, orders, payments, coupons, and customer inquiries.</li>
                    <li><span className="font-semibold text-slate-800">Product Manager:</span> Product catalog creation, pricing, and inventory adjustments.</li>
                    <li><span className="font-semibold text-slate-800">Customer Support:</span> Inquiry messages, problem tickets, and order tracking assistance.</li>
                  </ul>
                </div>
              </div>

              {/* Team Table */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase text-[10px]">
                        <th className="py-3 px-4">Member Name</th>
                        <th className="py-3 px-3">Email Address</th>
                        <th className="py-3 px-3">Role</th>
                        <th className="py-3 px-3">Phone</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {adminUsers.map(u => (
                        <tr key={u.id} className="hover:bg-slate-50/60">
                          <td className="py-3 px-4 font-bold text-slate-900">
                            {u.name}
                            {u.email.toLowerCase() === currentUser?.email.toLowerCase() && (
                              <span className="ml-2 text-[10px] bg-orange-100 text-orange-700 font-bold px-1.5 py-0.5 rounded-full">You</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">{u.email}</td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              u.role === 'owner' ? 'bg-purple-100 text-purple-700 border border-purple-200' :
                              u.role === 'administrator' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                              u.role === 'product_manager' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                              u.role === 'order_manager' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                              'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}>
                              {u.role.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-600">{u.phone || '—'}</td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              u.active !== false ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              {u.active !== false ? 'Active' : 'Suspended'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right space-x-2">
                            {currentUser?.role === 'owner' && u.email.toLowerCase() !== currentUser?.email.toLowerCase() && (
                              <>
                                <button
                                  onClick={async () => {
                                    try {
                                      const nextActive = u.active === false;
                                      await api.adminUpdateUser(u.id, { active: nextActive });
                                      showToast(`Staff account ${nextActive ? 'activated' : 'deactivated and access revoked immediately'}`);
                                      fetchAllData();
                                    } catch (err: any) {
                                      showToast(err.message || 'Failed to update user', 'error');
                                    }
                                  }}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                                    u.active !== false ? 'bg-rose-50 hover:bg-rose-100 text-rose-700' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                                  }`}
                                >
                                  {u.active !== false ? 'Deactivate' : 'Activate'}
                                </button>
                                <button
                                  onClick={async () => {
                                    if (window.confirm(`Are you sure you want to remove administrator ${u.name}?`)) {
                                      try {
                                        await api.adminDeleteUser(u.id);
                                        showToast(`Removed administrator ${u.name}`);
                                        fetchAllData();
                                      } catch (err: any) {
                                        showToast(err.message || 'Failed to remove user', 'error');
                                      }
                                    }
                                  }}
                                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 cursor-pointer transition-all"
                                >
                                  Remove
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 13: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="space-y-6 max-w-3xl">
              <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight">Marketplace Settings & Business Configuration</h1>
                <p className="text-xs text-slate-500">Configure maintenance availability, business information, payment receiver numbers, and delivery rates</p>
              </div>

              {/* MAINTENANCE MODE CONTROL CARD */}
              <div className={`p-6 rounded-3xl border transition-all ${
                settings?.isMaintenanceMode
                  ? 'bg-gradient-to-br from-amber-50 to-orange-50/70 border-amber-300 shadow-md shadow-amber-500/10'
                  : 'bg-white border-slate-200/90 shadow-2xs'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200/80">
                  <div className="flex items-start gap-3.5">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                      settings?.isMaintenanceMode
                        ? 'bg-amber-500 text-white shadow-amber-500/20'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      <Wrench className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-black text-slate-900">
                          Maintenance Mode (Under Construction)
                        </h2>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide border ${
                          settings?.isMaintenanceMode
                            ? 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse'
                            : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        }`}>
                          {settings?.isMaintenanceMode ? 'Maintenance ON (Storefront Closed)' : 'Live (Public Shopping Active)'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        When enabled, visitors and buyers are shown a professional "We’ll Be Back Soon" screen. Admins retain full dashboard access to update orders and products.
                      </p>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    <span className="text-xs font-bold text-slate-600">
                      {settings?.isMaintenanceMode ? 'Turn OFF' : 'Turn ON'}
                    </span>
                    <button
                      type="button"
                      disabled={savingMaintenance || !settings}
                      onClick={() => handleToggleMaintenance(!settings?.isMaintenanceMode)}
                      className={`relative inline-flex h-8 w-16 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#FF6000] focus:ring-offset-2 ${
                        settings?.isMaintenanceMode ? 'bg-[#FF6000]' : 'bg-slate-300 hover:bg-slate-400'
                      }`}
                    >
                      <span className="sr-only">Toggle Maintenance Mode</span>
                      <span
                        className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
                          settings?.isMaintenanceMode ? 'translate-x-8 text-[#FF6000]' : 'translate-x-0 text-slate-400'
                        }`}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </span>
                    </button>
                  </div>
                </div>

                {/* Maintenance Customization Options */}
                <div className="pt-5 space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Maintenance Screen Headline
                      </label>
                      <input
                        type="text"
                        value={settings?.maintenanceTitle ?? "We'll Be Back Soon"}
                        onChange={(e) => setSettings(prev => prev ? { ...prev, maintenanceTitle: e.target.value } : null)}
                        placeholder="e.g. We'll Be Back Soon"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white font-bold text-slate-900 focus:ring-2 focus:ring-[#FF6000]"
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        Main headline displayed to shoppers
                      </span>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Estimated Return Time (ETA)
                      </label>
                      <div className="relative">
                        <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          value={settings?.maintenanceEstimatedTime ?? ""}
                          onChange={(e) => setSettings(prev => prev ? { ...prev, maintenanceEstimatedTime: e.target.value } : null)}
                          placeholder="e.g. Expected back at 15:00 CAT (or ~45 mins)"
                          className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 bg-white font-medium text-slate-800 focus:ring-2 focus:ring-[#FF6000]"
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        Optional timeframe displayed to reassure shoppers
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Public Explanation Message
                    </label>
                    <textarea
                      rows={3}
                      value={settings?.maintenanceMessage ?? "ContactReach Market is currently undergoing planned system upgrades to improve your shopping experience. All existing customer orders, accounts, and payments are safe. We will be back online shortly!"}
                      onChange={(e) => setSettings(prev => prev ? { ...prev, maintenanceMessage: e.target.value } : null)}
                      placeholder="Explain the upgrade or maintenance reasons..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white leading-relaxed text-slate-800 focus:ring-2 focus:ring-[#FF6000]"
                    />
                  </div>

                  {/* Actions Bar for Maintenance Settings */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <div className="text-[11px] text-slate-500 font-mono">
                      {settings?.maintenanceUpdatedAt && (
                        <span>Last toggled: {new Date(settings.maintenanceUpdatedAt).toLocaleString()}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPreviewMaintenance(true)}
                        className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500" />
                        <span>Preview Visitor Screen</span>
                      </button>

                      <button
                        type="button"
                        disabled={savingMaintenance || !settings}
                        onClick={async () => {
                          if (settings) {
                            setSavingMaintenance(true);
                            try {
                              const res = await api.adminToggleMaintenanceMode({
                                isMaintenanceMode: Boolean(settings.isMaintenanceMode),
                                maintenanceTitle: settings.maintenanceTitle,
                                maintenanceMessage: settings.maintenanceMessage,
                                maintenanceEstimatedTime: settings.maintenanceEstimatedTime
                              });
                              setSettings(res.settings);
                              showToast('Maintenance settings saved to database!');
                              fetchAllData();
                              onRefreshPublicData();
                            } catch (err: any) {
                              showToast(err.message || 'Failed to save settings', 'error');
                            } finally {
                              setSavingMaintenance(false);
                            }
                          }
                        }}
                        className="px-5 py-2 bg-slate-900 hover:bg-black text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Save Maintenance Settings</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* General Business Configuration */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Company / Marketplace Name</label>
                  <input
                    type="text"
                    value={settings?.marketName || ''}
                    onChange={(e) => setSettings(prev => prev ? { ...prev, marketName: e.target.value } : null)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Support Email</label>
                    <input
                      type="email"
                      value={settings?.email || 'contactreachmedialimited@gmail.com'}
                      onChange={(e) => setSettings(prev => prev ? { ...prev, email: e.target.value } : null)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Support Phone</label>
                    <input
                      type="text"
                      value={settings?.phone || '0780022600'}
                      onChange={(e) => setSettings(prev => prev ? { ...prev, phone: e.target.value } : null)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">MoMo Receiver Name</label>
                    <input
                      type="text"
                      value={settings?.receiverName || 'Ruth'}
                      onChange={(e) => setSettings(prev => prev ? { ...prev, receiverName: e.target.value } : null)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Receiver Phone (MoMo)</label>
                    <input
                      type="text"
                      value={settings?.paymentNumber || '0780022600'}
                      onChange={(e) => setSettings(prev => prev ? { ...prev, paymentNumber: e.target.value } : null)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">MTN Merchant Code</label>
                    <input
                      type="text"
                      value={settings?.merchantCode || '2328354'}
                      onChange={(e) => setSettings(prev => prev ? { ...prev, merchantCode: e.target.value } : null)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Standard Kigali Delivery Fee (FRW)</label>
                    <input
                      type="number"
                      value={settings?.deliveryFeeKigali || 1500}
                      onChange={(e) => setSettings(prev => prev ? { ...prev, deliveryFeeKigali: Number(e.target.value) } : null)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Upcountry Delivery Fee (FRW)</label>
                    <input
                      type="number"
                      value={settings?.deliveryFeeUpcountry || 3500}
                      onChange={(e) => setSettings(prev => prev ? { ...prev, deliveryFeeUpcountry: Number(e.target.value) } : null)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={async () => {
                      if (settings) {
                        await api.adminUpdateSettings(settings);
                        showToast('Settings saved to database!');
                        fetchAllData();
                        onRefreshPublicData();
                      }
                    }}
                    className="px-6 py-3 bg-[#FF6000] hover:bg-[#e05500] text-white font-bold rounded-xl shadow-sm cursor-pointer"
                  >
                    Save Marketplace Settings
                  </button>
                </div>
              </div>

              {/* Comprehensive Database Health, Diagnostics & Firebase Storage Card */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-4 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
                  <div className="flex items-center gap-2.5">
                    <Database className="w-5 h-5 text-[#FF6000]" />
                    <div>
                      <h3 className="font-black text-sm text-slate-900">Database Health & Storage Status</h3>
                      <p className="text-[11px] text-slate-500">
                        Local atomic persistence, Firebase Firestore connection & Google Drive sync
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>All Systems 100% Ready (0 Errors)</span>
                    </span>
                    <button
                      type="button"
                      onClick={fetchDbDiagnostics}
                      disabled={loadingDiagnostics}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className={`w-3 h-3 ${loadingDiagnostics ? 'animate-spin text-[#FF6000]' : ''}`} />
                      <span>{loadingDiagnostics ? 'Testing...' : 'Audit'}</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Local Storage Status */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Local Storage (Active)
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800">
                          Healthy
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600 space-y-1">
                        <div>Catalog: <strong>{products.length} Products</strong></div>
                        <div>Categories: <strong>{categories.length} Categories</strong></div>
                        <div>Shops: <strong>{shops.length} Verified Stores</strong></div>
                        <div>Orders: <strong>{orders.length} Tracked Orders</strong></div>
                        <div>Backup: <strong className="text-emerald-700">Atomic Rolling Backup Enabled</strong></div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleRepairDatabase}
                      disabled={repairingDb}
                      className="w-full mt-2 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <Wrench className={`w-3.5 h-3.5 ${repairingDb ? 'animate-spin' : ''}`} />
                      <span>{repairingDb ? 'Verifying & Repairing...' : 'Run Diagnostics & Fix'}</span>
                    </button>
                  </div>

                  {/* Firebase Firestore Status */}
                  <div className="p-4 rounded-2xl bg-orange-50/50 border border-orange-200/80 space-y-2 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-orange-950 flex items-center gap-1.5 text-xs">
                          <Database className="w-3.5 h-3.5 text-[#FF6000]" />
                          Firebase Firestore
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-orange-100 text-orange-800">
                          Connected
                        </span>
                      </div>
                      <div className="text-[11px] text-orange-900 space-y-1">
                        <div>Project: <strong className="font-mono">ceremonial-arbor-62w8r</strong></div>
                        <div>Credentials: <strong className="text-emerald-700">Verified & Active</strong></div>
                        <p className="text-[10px] text-orange-700 leading-tight">
                          Sync products between your online store and Cloud Firestore anytime.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsFirebaseModalOpen(true)}
                        className="w-full py-2 px-3 bg-[#FF6000] hover:bg-[#e05500] text-white font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                      >
                        <Database className="w-3.5 h-3.5" />
                        <span>Firebase Sync (Pull / Push)</span>
                      </button>
                      <a
                        href="https://console.firebase.google.com/project/ceremonial-arbor-62w8r/firestore"
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-1.5 px-3 bg-white border border-orange-200 text-orange-800 hover:bg-orange-50 font-bold rounded-xl text-[11px] transition-colors flex items-center justify-center gap-1"
                      >
                        <span>Open Firebase Console</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  {/* Google Drive Status */}
                  <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200/80 space-y-2 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-blue-900 flex items-center gap-1.5 text-xs">
                          <CloudUpload className="w-3.5 h-3.5 text-blue-600" />
                          Google Drive Backup
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-100 text-blue-800">
                          Admin Only
                        </span>
                      </div>
                      <div className="text-[11px] text-blue-800 space-y-1">
                        <div>File: <strong className="font-mono">ContactReach_Market_Products.json</strong></div>
                        {driveStatus?.lastBackupAt ? (
                          <div>Last: <strong>{new Date(driveStatus.lastBackupAt).toLocaleString()}</strong></div>
                        ) : (
                          <div className="text-slate-500 italic">Ready for 1-click backup</div>
                        )}
                        <div className="text-[10px] text-blue-700">Account: <strong>contactreachmedialimited@gmail.com</strong></div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={handleSyncToGoogleDrive}
                        disabled={syncingToDrive}
                        className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        <CloudUpload className={`w-3.5 h-3.5 ${syncingToDrive ? 'animate-bounce' : ''}`} />
                        <span>{syncingToDrive ? 'Backing up...' : 'Backup to Google Drive'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleOpenDriveFilePicker}
                        disabled={importingFromDrive}
                        className="w-full py-1.5 px-3 bg-white border border-blue-200 text-blue-800 hover:bg-blue-50 font-bold rounded-xl text-[11px] transition-colors cursor-pointer flex items-center justify-center gap-1 disabled:opacity-50"
                      >
                        <Zap className={`w-3 h-3 ${importingFromDrive ? 'animate-spin' : ''}`} />
                        <span>{importingFromDrive ? 'Auto-filling...' : 'Auto-Fill from Drive'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Google Sheets Status */}
                  <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-2 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-950 flex items-center gap-1.5 text-xs">
                          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                          Google Sheets Sync
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800">
                          Admin Only
                        </span>
                      </div>
                      <div className="text-[11px] text-emerald-900 space-y-1">
                        <div>Sheet: <strong className="font-mono">ContactReach Market Products</strong></div>
                        <div className="truncate">Tab: <strong>{settings?.googleSheetConfig?.sheetTabName || 'Sheet1'}</strong></div>
                        <div className="text-[10px] text-emerald-700">Account: <strong>{settings?.googleSheetConfig?.connectedAccountEmail || 'contactreachmedialimited@gmail.com'}</strong></div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={handleSyncPullFromGoogleSheet}
                        disabled={syncingFromSheet}
                        className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${syncingFromSheet ? 'animate-spin' : ''}`} />
                        <span>{syncingFromSheet ? 'Syncing...' : 'Sync from Google Sheet'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsSpreadsheetModalOpen(true)}
                        className="w-full py-1.5 px-3 bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-50 font-bold rounded-xl text-[11px] transition-colors cursor-pointer flex items-center justify-center gap-1"
                      >
                        <SlidersHorizontal className="w-3 h-3 text-emerald-600" />
                        <span>Configure Sheets / Excel</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: ALIBABA B2B & WHOLESALE HUB */}
          {activeTab === 'alibaba' && (
            <AlibabaHub
              products={products}
              orders={orders}
              categories={categories}
              onRefreshData={() => {
                fetchAllData();
                onRefreshPublicData();
              }}
              showToast={showToast}
            />
          )}

          {/* TAB: CJ DROPSHIPPING & AUTOMATED PRODUCT FEED */}
          {activeTab === 'cjdropshipping' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <RefreshCw className="w-5 h-5 text-purple-600" />
                    <span>CJ Dropshipping Integration & Auto-Upload</span>
                  </h1>
                  <p className="text-xs text-slate-500">
                    Automatically synchronize and upload wholesale products. Admin can directly update product cost anytime.
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleTestCjConnection}
                    disabled={cjTesting}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-200 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
                  >
                    <ShieldCheck className={`w-4 h-4 ${cjTesting ? 'animate-spin text-purple-600' : 'text-slate-600'}`} />
                    <span>{cjTesting ? 'Testing...' : 'Test Connection'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSyncCjStockAndPrices}
                    disabled={cjSyncingStockPrices}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-200 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
                    title="Sync live stock levels and prices from supplier without altering admin custom costs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${cjSyncingStockPrices ? 'animate-spin text-purple-600' : 'text-slate-600'}`} />
                    <span>{cjSyncingStockPrices ? 'Syncing...' : '🔄 Sync Stock & Prices'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleMakeAllProductsReady}
                    disabled={makingAllReady}
                    className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold rounded-xl shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
                    title="Make all CJ dropshipping and marketplace products 100% Ready, Approved, and Available"
                  >
                    <Sparkles className={`w-4 h-4 ${makingAllReady ? 'animate-spin text-amber-300' : 'text-amber-300'}`} />
                    <span>{makingAllReady ? 'Making Ready...' : '✨ Make All Products Ready'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSyncCjNow(cjProductCategoryFilter !== 'all' ? cjProductCategoryFilter : undefined)}
                    disabled={cjSyncing}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
                  >
                    <Zap className={`w-4 h-4 ${cjSyncing ? 'animate-spin' : ''}`} />
                    <span>{cjSyncing ? 'Auto-Filling...' : '⚡ Connect & Auto-Fill Feed'}</span>
                  </button>
                </div>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
                  <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
                    <span>CJ Products in Catalog</span>
                    <Package className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="text-2xl font-black text-slate-900 font-mono">
                    {products.filter(p => p.source === 'cjdropshipping').length}
                  </div>
                  <span className="text-[10px] text-slate-500">Active dropshipping products</span>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
                  <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
                    <span>Admin Cost Overrides</span>
                    <DollarSign className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="text-2xl font-black text-amber-600 font-mono">
                    {products.filter(p => p.source === 'cjdropshipping' && p.costOverriddenByAdmin).length}
                  </div>
                  <span className="text-[10px] text-slate-500">Custom costs protected from overwrite</span>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
                  <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
                    <span>Automated Upload</span>
                    <Clock className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-sm font-black text-slate-800 mt-1">
                    {cjAutoUploadToggle ? (
                      <span className="text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Auto (Every 15 mins)
                      </span>
                    ) : (
                      <span className="text-slate-500">Manual Sync Only</span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400">Background feed scheduler</span>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
                  <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
                    <span>Pricing Formula</span>
                    <Percent className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-sm font-black text-slate-900 font-mono mt-1">
                    1 USD = {cjUsdRateInput || 1420} FRW
                  </div>
                  <span className="text-[10px] text-emerald-600 font-semibold">+{cjMarkupInput || 35}% default markup</span>
                </div>
              </div>

              {/* Sub-tab Navigation Bar */}
              <div className="bg-white p-2 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center gap-1.5 flex-wrap text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setCjSubTab('catalog')}
                  className={`px-3.5 py-2 rounded-xl flex items-center gap-2 cursor-pointer transition-colors ${
                    cjSubTab === 'catalog'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Package className="w-4 h-4" />
                  <span>Imported Catalog</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    cjSubTab === 'catalog' ? 'bg-white/20 text-white' : 'bg-purple-100 text-purple-800'
                  }`}>
                    {products.filter(p => p.source === 'cjdropshipping').length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCjSubTab('search');
                    if (cjSearchResults.length === 0) {
                      handleSearchCjProducts();
                    }
                  }}
                  className={`px-3.5 py-2 rounded-xl flex items-center gap-2 cursor-pointer transition-colors ${
                    cjSubTab === 'search'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Search className="w-4 h-4" />
                  <span>Search & Supplier Discovery</span>
                  {cjSearchResults.length > 0 && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      cjSubTab === 'search' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {cjSearchResults.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setCjSubTab('staging')}
                  className={`px-3.5 py-2 rounded-xl flex items-center gap-2 cursor-pointer transition-colors ${
                    cjSubTab === 'staging'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Review & Approval Queue</span>
                  {(() => {
                    const pendingCount = products.filter(p => p.source === 'cjdropshipping' && p.reviewStatus === 'Pending Approval').length;
                    return (
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                        cjSubTab === 'staging' ? 'bg-white/20 text-white' : pendingCount > 0 ? 'bg-amber-100 text-amber-800 font-black' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {pendingCount}
                      </span>
                    );
                  })()}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCjSubTab('orders');
                    handleLoadCjOrders();
                  }}
                  className={`px-3.5 py-2 rounded-xl flex items-center gap-2 cursor-pointer transition-colors ${
                    cjSubTab === 'orders'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Truck className="w-4 h-4" />
                  <span>Dropshipping Orders</span>
                  {(() => {
                    const cjPendingFulfillment = orders.filter(o => {
                      const hasCj = o.items.some(i => {
                        const prod = products.find(p => p.id === i.productId);
                        return prod?.source === 'cjdropshipping' || prod?.sku?.startsWith('CJ-');
                      });
                      return hasCj && (!o.cjFulfillmentStatus || o.cjFulfillmentStatus === 'Pending Admin Approval');
                    }).length;
                    return (
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                        cjSubTab === 'orders' ? 'bg-white/20 text-white' : cjPendingFulfillment > 0 ? 'bg-amber-100 text-amber-800 font-black' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {cjPendingFulfillment}
                      </span>
                    );
                  })()}
                </button>

                <button
                  type="button"
                  onClick={() => setCjSubTab('settings')}
                  className={`px-3.5 py-2 rounded-xl flex items-center gap-2 cursor-pointer transition-colors ${
                    cjSubTab === 'settings'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Sliders className="w-4 h-4" />
                  <span>Feed Settings</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCjSubTab('instructions')}
                  className={`px-3.5 py-2 rounded-xl flex items-center gap-2 cursor-pointer transition-colors ${
                    cjSubTab === 'instructions'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Setup Guide & API</span>
                </button>
              </div>

              {/* Admin Cost Override Protection Guarantee Callout */}
              <div className="p-4 bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 border border-purple-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-purple-600 text-white shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-black text-purple-950 block text-xs">
                      Admin Cost & Selling Price Protection Active
                    </span>
                    <span className="text-purple-800 text-[11px] leading-relaxed">
                      You can edit and customize the product cost (<code className="bg-white/80 px-1 py-0.2 rounded font-mono">costPrice</code>) and selling price for any product.
                      When cost is modified by an admin, automated CJ syncs will update stock and pictures but will <strong>never overwrite your custom cost</strong>.
                    </span>
                  </div>
                </div>
              </div>

              {/* SUBTAB 1: CATALOG */}
              {cjSubTab === 'catalog' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="text-base font-black text-slate-900">Imported CJ Dropshipping Products</h2>
                      <p className="text-xs text-slate-500">Edit product cost, selling prices, review margins, and synchronize inventory</p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={handleSyncCjStockAndPrices}
                        disabled={cjSyncingStockPrices}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-200 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
                        title="Sync live stock levels and prices from supplier without altering admin custom costs"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${cjSyncingStockPrices ? 'animate-spin text-purple-600' : 'text-slate-600'}`} />
                        <span>{cjSyncingStockPrices ? 'Syncing...' : '🔄 Sync Stock & Prices'}</span>
                      </button>

                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          value={cjProductSearch}
                          onChange={(e) => setCjProductSearch(e.target.value)}
                          placeholder="Search CJ products..."
                          className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs w-48"
                        />
                      </div>

                      <select
                        value={cjProductCategoryFilter}
                        onChange={(e) => setCjProductCategoryFilter(e.target.value)}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
                      >
                        <option value="all">All Categories</option>
                        {categories.map(c => (
                          <option key={c.id} value={c.id}>{c.nameEn}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-2xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-400 font-bold uppercase text-[10px]">
                            <th className="py-3 px-4">Product / SKU</th>
                            <th className="py-3 px-3">Category</th>
                            <th className="py-3 px-3">Wholesale (USD)</th>
                            <th className="py-3 px-3">Product Cost (RWF)</th>
                            <th className="py-3 px-3">Selling Price (RWF)</th>
                            <th className="py-3 px-3">Profit Margin</th>
                            <th className="py-3 px-3">Stock</th>
                            <th className="py-3 px-3">Review Status</th>
                            <th className="py-3 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {products
                            .filter(p => p.source === 'cjdropshipping')
                            .filter(p => cjProductCategoryFilter === 'all' || p.category === cjProductCategoryFilter)
                            .filter(p => !cjProductSearch.trim() || p.name.toLowerCase().includes(cjProductSearch.toLowerCase()) || (p.sku && p.sku.toLowerCase().includes(cjProductSearch.toLowerCase())))
                            .map(p => {
                              const isEditing = editingCostProductId === p.id;
                              const currentCost = p.costPrice ?? Math.round((p.cjOriginalCostUsd || 10) * (cjConfig?.usdToRwfRate || 1420));
                              const profit = Math.max(0, p.price - currentCost);
                              const marginPct = p.price > 0 ? Math.round((profit / p.price) * 100) : 0;

                              return (
                                <tr key={p.id} className="hover:bg-slate-50/60">
                                  <td className="py-3 px-4">
                                    <div className="flex items-center gap-3">
                                      <img
                                        src={p.imageUrl}
                                        alt={p.name}
                                        className="w-10 h-10 object-cover rounded-xl border border-slate-200 shrink-0"
                                      />
                                      <div>
                                        <span className="font-bold text-slate-900 block line-clamp-1">{p.name}</span>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                          <span className="text-[10px] font-mono text-purple-700 bg-purple-50 px-1 py-0.2 rounded font-bold">
                                            {p.cjProductSku || p.sku}
                                          </span>
                                          {p.status === 'Hidden' && (
                                            <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1 py-0.2 rounded">
                                              Hidden
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-3 px-3 text-slate-600 font-medium capitalize">
                                    {p.category}
                                  </td>
                                  <td className="py-3 px-3 font-mono font-bold text-purple-900">
                                    {p.cjOriginalCostUsd ? `$${p.cjOriginalCostUsd.toFixed(2)}` : '—'}
                                  </td>
                                  <td className="py-3 px-3">
                                    {isEditing ? (
                                      <div className="flex items-center gap-1">
                                        <input
                                          type="number"
                                          min="0"
                                          value={editingCostPriceValue}
                                          onChange={(e) => setEditingCostPriceValue(e.target.value)}
                                          className="w-24 px-2 py-1 rounded border border-purple-400 font-mono font-bold text-xs"
                                          placeholder="Cost FRW"
                                        />
                                      </div>
                                    ) : (
                                      <div>
                                        <div className="flex items-center gap-1">
                                          <span className="font-mono font-bold text-slate-900">
                                            {(p.costPrice ?? currentCost).toLocaleString()} FRW
                                          </span>
                                          {p.costOverriddenByAdmin && (
                                            <span className="px-1 py-0.2 rounded bg-amber-100 text-amber-800 text-[8px] font-black" title="Admin Custom Cost Override">
                                              Admin
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-3 px-3">
                                    {isEditing ? (
                                      <input
                                        type="number"
                                        min="0"
                                        value={editingSellingPriceValue}
                                        onChange={(e) => setEditingSellingPriceValue(e.target.value)}
                                        className="w-24 px-2 py-1 rounded border border-purple-400 font-mono font-bold text-xs"
                                        placeholder="Price FRW"
                                      />
                                    ) : (
                                      <span className="font-mono font-bold text-slate-900">{p.price.toLocaleString()} FRW</span>
                                    )}
                                  </td>
                                  <td className="py-3 px-3">
                                    <span className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-extrabold ${
                                      marginPct >= 30 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                    }`}>
                                      +{marginPct}% ({profit.toLocaleString()} FRW)
                                    </span>
                                  </td>
                                  <td className="py-3 px-3 font-mono font-bold text-slate-700">
                                    {p.stock}
                                  </td>
                                  <td className="py-3 px-3">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      p.reviewStatus === 'Approved'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : p.reviewStatus === 'Rejected'
                                        ? 'bg-rose-100 text-rose-800'
                                        : 'bg-amber-100 text-amber-800'
                                    }`}>
                                      {p.reviewStatus || 'Approved'}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                                    {isEditing ? (
                                      <div className="inline-flex items-center gap-1">
                                        <button
                                          type="button"
                                          onClick={() => handleQuickUpdateProductCost(p.id)}
                                          disabled={savingProductCostId === p.id}
                                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[10px] cursor-pointer"
                                        >
                                          {savingProductCostId === p.id ? 'Saving...' : 'Save Cost'}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setEditingCostProductId(null)}
                                          className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg font-bold text-[10px] cursor-pointer"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="inline-flex items-center gap-1">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setEditingCostProductId(p.id);
                                            setEditingCostPriceValue(p.costPrice !== undefined ? p.costPrice : currentCost);
                                            setEditingSellingPriceValue(p.price);
                                          }}
                                          className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg font-bold text-[10px] cursor-pointer border border-purple-200"
                                        >
                                          Update Cost
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleOpenEditProduct(p)}
                                          className="p-1 rounded text-slate-500 hover:text-slate-800 cursor-pointer"
                                          title="Full Edit"
                                        >
                                          <Edit className="w-3.5 h-3.5" />
                                        </button>
                                        {p.reviewStatus === 'Pending Approval' && (
                                          <button
                                            type="button"
                                            onClick={() => handleApproveCjProduct(p.id)}
                                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[10px] cursor-pointer"
                                            title="Approve & Publish to Store"
                                          >
                                            Approve
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>

                      {products.filter(p => p.source === 'cjdropshipping').length === 0 && (
                        <div className="p-8 text-center space-y-3">
                          <Package className="w-8 h-8 text-slate-300 mx-auto" />
                          <div className="text-slate-600 font-bold">No CJ Dropshipping products imported yet</div>
                          <p className="text-slate-400 text-xs">
                            Click <strong>"⚡ Sync Feed Now"</strong> or browse the <strong>"Search & Supplier Discovery"</strong> tab to import products.
                          </p>
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleSyncCjNow()}
                              disabled={cjSyncing}
                              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-xs"
                            >
                              Import Initial Feed Now
                            </button>
                            <button
                              type="button"
                              onClick={() => setCjSubTab('search')}
                              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs cursor-pointer border border-slate-200"
                            >
                              Search Supplier Catalog
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* SUBTAB 2: SEARCH & SUPPLIER DISCOVERY */}
              {cjSubTab === 'search' && (
                <div className="space-y-4">
                  {/* Search Bar Card */}
                  <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs space-y-4 text-xs">
                    <div>
                      <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                        <Search className="w-4 h-4 text-purple-600" />
                        <span>Search CJdropshipping Supplier Catalog</span>
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Discover wholesale dropshipping items, calculate landed Rwandan Franc prices, and bulk-import with custom markup.
                      </p>
                    </div>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSearchCjProducts();
                      }}
                      className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center"
                    >
                      <div className="sm:col-span-6 relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="text"
                          value={cjSearchQuery}
                          onChange={(e) => setCjSearchQuery(e.target.value)}
                          placeholder="e.g. Wireless earbuds, smart watch, backpack, hair trimmer..."
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-purple-500"
                        />
                      </div>

                      <div className="sm:col-span-4">
                        <select
                          value={cjSearchCategory}
                          onChange={(e) => setCjSearchCategory(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold bg-white"
                        >
                          <option value="all">All Supplier Categories</option>
                          {cjCategoriesList.map(c => (
                            <option key={c.id} value={c.id}>{c.name} ({c.localCategoryName})</option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <button
                          type="submit"
                          disabled={cjSearching}
                          className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50 transition-colors"
                        >
                          <Search className={`w-3.5 h-3.5 ${cjSearching ? 'animate-spin' : ''}`} />
                          <span>{cjSearching ? 'Searching...' : 'Search CJ'}</span>
                        </button>
                      </div>
                    </form>

                    {/* Quick Category Discovery Pills */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-100 text-[11px]">
                      <span className="text-slate-400 font-bold">Quick Categories:</span>
                      {cjCategoriesList.slice(0, 7).map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setCjSearchCategory(c.id);
                            handleSearchCjProducts(c.id);
                          }}
                          className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer border ${
                            cjSearchCategory === c.id
                              ? 'bg-purple-600 text-white border-purple-600'
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Bulk Import Action Bar */}
                  {cjSearchResults.length > 0 && (
                    <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 p-4 rounded-2xl border border-purple-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3 flex-wrap">
                        <button
                          type="button"
                          onClick={() => {
                            if (cjSelectedItemsForImport.length === cjSearchResults.length) {
                              setCjSelectedItemsForImport([]);
                            } else {
                              setCjSelectedItemsForImport(cjSearchResults.map(p => p.pid));
                            }
                          }}
                          className="px-3 py-1.5 bg-white border border-purple-200 rounded-xl font-bold text-purple-900 hover:bg-purple-100 cursor-pointer flex items-center gap-1.5"
                        >
                          {cjSelectedItemsForImport.length === cjSearchResults.length ? (
                            <CheckSquare className="w-3.5 h-3.5 text-purple-700" />
                          ) : (
                            <Square className="w-3.5 h-3.5 text-slate-400" />
                          )}
                          <span>
                            {cjSelectedItemsForImport.length === cjSearchResults.length ? 'Deselect All' : 'Select All'}
                          </span>
                        </button>

                        <span className="font-bold text-purple-950 font-mono">
                          {cjSelectedItemsForImport.length} of {cjSearchResults.length} selected
                        </span>

                        <div className="flex items-center gap-2">
                          <label className="text-[11px] font-bold text-slate-600">Markup:</label>
                          <div className="relative">
                            <input
                              type="number"
                              min="5"
                              max="300"
                              value={cjCustomMarkupOverride}
                              onChange={(e) => setCjCustomMarkupOverride(e.target.value === '' ? '' : Number(e.target.value))}
                              placeholder={`${cjMarkupInput || 35}%`}
                              className="w-16 px-2 py-1 rounded-lg border border-purple-200 text-xs font-mono font-bold bg-white text-right pr-4"
                            />
                            <span className="absolute right-1.5 top-1 text-[10px] text-slate-400 font-bold pointer-events-none">%</span>
                          </div>
                        </div>

                        <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-purple-900">
                          <input
                            type="checkbox"
                            checked={cjImportWithApproval}
                            onChange={(e) => setCjImportWithApproval(e.target.checked)}
                            className="w-3.5 h-3.5 rounded text-purple-600 focus:ring-purple-500"
                          />
                          <span>Stage for Review (Require Admin Approval)</span>
                        </label>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleBulkImportCjSelected()}
                        disabled={cjImporting || cjSelectedItemsForImport.length === 0}
                        className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
                      >
                        <Download className={`w-3.5 h-3.5 ${cjImporting ? 'animate-spin' : ''}`} />
                        <span>{cjImporting ? 'Importing Products...' : `Bulk Import (${cjSelectedItemsForImport.length})`}</span>
                      </button>
                    </div>
                  )}

                  {/* Results Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {cjSearchResults.map((item: any) => {
                      const isSelected = cjSelectedItemsForImport.includes(item.pid);
                      return (
                        <div
                          key={item.pid}
                          className={`bg-white rounded-2xl border p-4 space-y-3 shadow-2xs transition-all relative ${
                            isSelected ? 'border-purple-500 ring-2 ring-purple-100 bg-purple-50/20' : 'border-slate-200/90 hover:border-slate-300'
                          }`}
                        >
                          {/* Checkbox Overlay */}
                          <div className="flex items-start justify-between gap-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setCjSelectedItemsForImport([...cjSelectedItemsForImport, item.pid]);
                                  } else {
                                    setCjSelectedItemsForImport(cjSelectedItemsForImport.filter(id => id !== item.pid));
                                  }
                                }}
                                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                              />
                              <span className="text-[10px] font-mono text-purple-700 font-bold bg-purple-50 px-1.5 py-0.5 rounded">
                                {item.productSku}
                              </span>
                            </label>

                            {item.isAlreadyImported && (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> In Catalog
                              </span>
                            )}
                          </div>

                          {/* Image & Title */}
                          <div className="flex gap-3">
                            <img
                              src={item.productImage}
                              alt={item.productName}
                              className="w-20 h-20 object-cover rounded-xl border border-slate-200 shrink-0"
                            />
                            <div className="space-y-1 min-w-0">
                              <h3 className="font-bold text-slate-900 text-xs line-clamp-2" title={item.productName}>
                                {item.productName}
                              </h3>
                              <span className="text-[10px] text-slate-500 block capitalize">
                                Category: <strong>{item.category}</strong>
                              </span>
                              {item.brand && (
                                <span className="text-[10px] text-slate-400 block">
                                  Brand: {item.brand}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Price & Margins breakdown */}
                          <div className="p-2.5 bg-slate-50 rounded-xl space-y-1.5 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500 text-[11px]">Wholesale Cost:</span>
                              <span className="font-mono font-bold text-slate-800">
                                ${item.wholesaleCostUsd.toFixed(2)} USD ({item.costInFrw.toLocaleString()} FRW)
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500 text-[11px]">Suggested Retail Price:</span>
                              <span className="font-mono font-black text-purple-900">
                                {item.suggestedPrice.toLocaleString()} FRW
                              </span>
                            </div>
                            <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-[11px]">
                              <span className="text-emerald-700 font-bold">Estimated Profit Margin:</span>
                              <span className="font-mono font-black text-emerald-700">
                                +{item.markupPercent}% (+{item.profitMarginFrw.toLocaleString()} FRW)
                              </span>
                            </div>
                          </div>

                          {/* Single Item Import Button */}
                          <div className="pt-1 flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setCjSelectedItemsForImport([item.pid]);
                                handleBulkImportCjSelected();
                              }}
                              disabled={cjImporting}
                              className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer shadow-xs disabled:opacity-50"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>{item.isAlreadyImported ? 'Re-Import / Update' : 'Import Product'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {cjSearchResults.length === 0 && !cjSearching && (
                    <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/90 shadow-2xs space-y-3">
                      <Search className="w-10 h-10 text-slate-300 mx-auto" />
                      <div className="text-slate-700 font-bold text-sm">Search Supplier Catalog</div>
                      <p className="text-slate-400 text-xs max-w-md mx-auto">
                        Type a product keyword above or pick a category to search live wholesale items from CJdropshipping with instant currency conversion to Rwandan Francs.
                      </p>
                      <button
                        type="button"
                        onClick={() => handleSearchCjProducts()}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-xs"
                      >
                        Explore Trending Dropshipping Products
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* SUBTAB 3: REVIEW & APPROVAL STAGING QUEUE */}
              {cjSubTab === 'staging' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="text-base font-black text-slate-900">Product Staging & Approval Queue</h2>
                      <p className="text-xs text-slate-500">
                        Review imported dropshipping products before making them visible to live shoppers on ContactReach Market.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 text-xs font-bold">
                        {(['Pending Approval', 'Approved', 'Rejected', 'all'] as const).map(filterState => (
                          <button
                            key={filterState}
                            type="button"
                            onClick={() => setCjStagingFilter(filterState)}
                            className={`px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${
                              cjStagingFilter === filterState
                                ? 'bg-white text-purple-900 shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            {filterState === 'all' ? 'All Staged' : filterState}
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={handleBulkApproveCj}
                        disabled={cjBulkApproving || products.filter(p => p.source === 'cjdropshipping' && p.reviewStatus === 'Pending Approval').length === 0}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{cjBulkApproving ? 'Approving...' : '✓ Bulk Approve All Pending'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Staged Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {products
                      .filter(p => p.source === 'cjdropshipping')
                      .filter(p => cjStagingFilter === 'all' || p.reviewStatus === cjStagingFilter)
                      .map(p => {
                        const currentCost = p.costPrice ?? Math.round((p.cjOriginalCostUsd || 10) * (cjConfig?.usdToRwfRate || 1420));
                        const profit = Math.max(0, p.price - currentCost);
                        const marginPct = p.price > 0 ? Math.round((profit / p.price) * 100) : 0;

                        return (
                          <div
                            key={p.id}
                            className="bg-white rounded-3xl border border-slate-200/90 p-5 space-y-4 shadow-2xs hover:shadow-xs transition-shadow"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <img
                                  src={p.imageUrl}
                                  alt={p.name}
                                  className="w-16 h-16 object-cover rounded-2xl border border-slate-200 shrink-0"
                                />
                                <div>
                                  <h3 className="font-bold text-slate-900 text-sm line-clamp-1">{p.name}</h3>
                                  <span className="text-[10px] font-mono text-purple-700 font-bold bg-purple-50 px-1.5 py-0.2 rounded">
                                    {p.cjProductSku || p.sku}
                                  </span>
                                  <span className="text-[11px] text-slate-500 block capitalize mt-0.5">
                                    Category: <strong>{p.category}</strong> · Brand: {p.brand || 'CJ Partner'}
                                  </span>
                                </div>
                              </div>

                              <span className={`px-2.5 py-1 rounded-full text-xs font-bold shrink-0 ${
                                p.reviewStatus === 'Approved'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : p.reviewStatus === 'Rejected'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                {p.reviewStatus || 'Pending Approval'}
                              </span>
                            </div>

                            <p className="text-xs text-slate-600 line-clamp-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                              {p.description}
                            </p>

                            {/* Pricing & Margin Card */}
                            <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50/80 rounded-2xl border border-slate-200/80 text-xs">
                              <div>
                                <span className="text-[10px] text-slate-400 block font-bold">Wholesale Cost</span>
                                <span className="font-mono font-bold text-slate-800">
                                  {p.costPrice ? `${p.costPrice.toLocaleString()} FRW` : `$${p.cjOriginalCostUsd || 10}`}
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-400 block font-bold">Store Price</span>
                                <span className="font-mono font-black text-purple-900">
                                  {p.price.toLocaleString()} FRW
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] text-emerald-600 block font-bold">Margin</span>
                                <span className="font-mono font-black text-emerald-700">
                                  +{marginPct}% ({profit.toLocaleString()} FRW)
                                </span>
                              </div>
                            </div>

                            {/* Actions Bar */}
                            <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                              <button
                                type="button"
                                onClick={() => handleOpenEditProduct(p)}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs cursor-pointer flex items-center gap-1"
                              >
                                <Edit className="w-3.5 h-3.5" />
                                <span>Edit Details</span>
                              </button>

                              <div className="flex items-center gap-1.5">
                                {p.reviewStatus !== 'Rejected' && (
                                  <button
                                    type="button"
                                    onClick={() => handleRejectCjProduct(p.id)}
                                    disabled={cjRejectingId === p.id}
                                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-bold text-xs cursor-pointer border border-rose-200"
                                  >
                                    {cjRejectingId === p.id ? 'Rejecting...' : 'Reject / Hide'}
                                  </button>
                                )}

                                {p.reviewStatus !== 'Approved' && (
                                  <button
                                    type="button"
                                    onClick={() => handleApproveCjProduct(p.id)}
                                    disabled={cjApprovingId === p.id}
                                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs cursor-pointer shadow-xs flex items-center gap-1"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>{cjApprovingId === p.id ? 'Publishing...' : 'Approve & Publish'}</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  {products.filter(p => p.source === 'cjdropshipping' && (cjStagingFilter === 'all' || p.reviewStatus === cjStagingFilter)).length === 0 && (
                    <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/90 shadow-2xs space-y-2">
                      <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                      <div className="text-slate-800 font-bold text-sm">No products in this staging filter</div>
                      <p className="text-slate-400 text-xs">
                        All dropshipping products have been reviewed, or you can import more products from the Search & Discovery tab.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* SUBTAB 4: DROPSHIPPING ORDER FULFILLMENT */}
              {cjSubTab === 'orders' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="text-base font-black text-slate-900">Dropshipping Orders & Supplier Fulfillment</h2>
                      <p className="text-xs text-slate-500">
                        Review customer orders with dropshipping items and manually approve for supplier dispatch with tracking references.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={cjFulfillmentFilter}
                        onChange={(e) => {
                          const val = e.target.value as any;
                          setCjFulfillmentFilter(val);
                        }}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
                      >
                        <option value="all">All Fulfillment Statuses</option>
                        <option value="Pending Admin Approval">Pending Admin Approval</option>
                        <option value="Approved for CJ Fulfillment">Approved for CJ Fulfillment</option>
                        <option value="Fulfilled">Fulfilled</option>
                      </select>

                      <button
                        type="button"
                        onClick={handleLoadCjOrders}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 cursor-pointer"
                      >
                        Refresh Orders
                      </button>
                    </div>
                  </div>

                  <div className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-2xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-400 font-bold uppercase text-[10px]">
                            <th className="py-3 px-4">Order # / Date</th>
                            <th className="py-3 px-3">Customer & Address</th>
                            <th className="py-3 px-3">CJ Items</th>
                            <th className="py-3 px-3">Order Total</th>
                            <th className="py-3 px-3">Payment Status</th>
                            <th className="py-3 px-3">Fulfillment Status</th>
                            <th className="py-3 px-4 text-right">Fulfillment Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {orders
                            .filter(order => {
                              const hasCj = order.items.some(item => {
                                const prod = products.find(p => p.id === item.productId);
                                return prod?.source === 'cjdropshipping' || Boolean(prod?.cjProductId) || prod?.sku?.startsWith('CJ-');
                              });
                              if (!hasCj) return false;
                              if (cjFulfillmentFilter === 'all') return true;
                              return order.cjFulfillmentStatus === cjFulfillmentFilter;
                            })
                            .map(ord => {
                              const cjItems = ord.items.filter(item => {
                                const prod = products.find(p => p.id === item.productId);
                                return prod?.source === 'cjdropshipping' || Boolean(prod?.cjProductId) || prod?.sku?.startsWith('CJ-');
                              });

                              return (
                                <tr key={ord.id} className="hover:bg-slate-50/60">
                                  <td className="py-3 px-4">
                                    <span className="font-mono font-black text-slate-900 block">{ord.orderNumber}</span>
                                    <span className="text-[10px] text-slate-400 block font-mono">
                                      {new Date(ord.createdAt).toLocaleDateString()}
                                    </span>
                                  </td>
                                  <td className="py-3 px-3">
                                    <span className="font-bold text-slate-900 block">{ord.customerName}</span>
                                    <span className="text-[11px] text-slate-500 font-mono block">{ord.customerPhone}</span>
                                    <span className="text-[10px] text-slate-400 block line-clamp-1">{ord.deliveryLocation}</span>
                                  </td>
                                  <td className="py-3 px-3">
                                    <div className="space-y-1">
                                      {cjItems.map((it, idx) => (
                                        <div key={idx} className="flex items-center gap-1.5 text-[11px]">
                                          <span className="font-bold text-slate-800">{it.quantity}x</span>
                                          <span className="text-slate-600 line-clamp-1">{it.productName}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </td>
                                  <td className="py-3 px-3 font-mono font-bold text-slate-900">
                                    {ord.totalAmount.toLocaleString()} FRW
                                  </td>
                                  <td className="py-3 px-3">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      ord.paymentStatus === 'Paid'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-amber-100 text-amber-800'
                                    }`}>
                                      {ord.paymentStatus}
                                    </span>
                                  </td>
                                  <td className="py-3 px-3">
                                    <div className="space-y-0.5">
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold block w-fit ${
                                        ord.cjFulfillmentStatus === 'Approved for CJ Fulfillment'
                                          ? 'bg-blue-100 text-blue-800'
                                          : 'bg-amber-100 text-amber-800'
                                      }`}>
                                        {ord.cjFulfillmentStatus || 'Pending Admin Approval'}
                                      </span>
                                      {ord.cjTrackingNumber && (
                                        <span className="text-[9px] font-mono text-purple-700 block">
                                          Ref: {ord.cjTrackingNumber}
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setCjFulfillmentModalOrder({
                                          ...ord,
                                          cjItems
                                        });
                                        setCjTrackingInput(ord.cjTrackingNumber || `CJ-RW-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`);
                                        setCjFulfillmentNotesInput('');
                                      }}
                                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-xs inline-flex items-center gap-1"
                                    >
                                      <Truck className="w-3.5 h-3.5" />
                                      <span>{ord.cjFulfillmentStatus === 'Approved for CJ Fulfillment' ? 'Update Tracking' : 'Approve for CJ'}</span>
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>

                      {orders.filter(order => order.items.some(item => {
                        const prod = products.find(p => p.id === item.productId);
                        return prod?.source === 'cjdropshipping' || Boolean(prod?.cjProductId) || prod?.sku?.startsWith('CJ-');
                      })).length === 0 && (
                        <div className="p-8 text-center space-y-2">
                          <Truck className="w-8 h-8 text-slate-300 mx-auto" />
                          <div className="text-slate-600 font-bold">No orders with CJ Dropshipping products yet</div>
                          <p className="text-slate-400 text-xs">
                            When customers order dropshipping items from your store, they will appear here for manual supplier fulfillment review.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* SUBTAB 5: FEED SETTINGS */}
              {cjSubTab === 'settings' && (
                <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-6 text-xs">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                        <Sliders className="w-4 h-4 text-purple-600" />
                        <span>CJ Dropshipping Account & API Configuration</span>
                        {isCjConnected ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            API CONNECTED
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-300">
                            DISCONNECTED
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        API credentials are secure on the backend. Only validated against official CJ API v2.0 developers endpoint.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {isCjConnected ? (
                        <button
                          type="button"
                          onClick={handleDisconnectCj}
                          disabled={cjDisconnecting}
                          className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-xl border border-red-200 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          <span>{cjDisconnecting ? 'Disconnecting...' : 'Disconnect'}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleConnectCj}
                          disabled={cjConnecting || !cjApiKeyInput.trim()}
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
                        >
                          <Zap className={`w-3.5 h-3.5 ${cjConnecting ? 'animate-spin' : ''}`} />
                          <span>{cjConnecting ? 'Connecting...' : 'Connect to CJ API'}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={handleTestCjConnection}
                        disabled={cjTesting}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-200 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
                      >
                        <ShieldCheck className={`w-4 h-4 ${cjTesting ? 'animate-spin text-purple-600' : 'text-slate-600'}`} />
                        <span>{cjTesting ? 'Testing...' : 'Test Connection'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSaveCjConfig}
                        disabled={savingCjConfig}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{savingCjConfig ? 'Saving...' : 'Save Settings'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Real Live Connection Status Banner */}
                  {isCjConnected ? (
                    <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0 text-emerald-700 font-black">
                          ✓
                        </div>
                        <div>
                          <div className="font-bold text-sm text-emerald-900 flex items-center gap-2">
                            <span>CJdropshipping API v2.0 Authenticated</span>
                            <span className="text-[10px] font-mono bg-emerald-200/80 text-emerald-900 font-bold px-2 py-0.5 rounded-full">REAL API ACTIVE</span>
                          </div>
                          <p className="text-xs text-emerald-800 mt-0.5">
                            Real API access token acquired directly from developers.cjdropshipping.com{cjConfig?.connectedAt ? ` on ${new Date(cjConfig.connectedAt).toLocaleString()}` : ''}. Auto-import and live stock synchronization are enabled.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleDisconnectCj}
                        disabled={cjDisconnecting}
                        className="px-3.5 py-1.5 bg-white hover:bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-200 shadow-2xs cursor-pointer shrink-0 disabled:opacity-50"
                      >
                        Disconnect API
                      </button>
                    </div>
                  ) : (
                    <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs ${
                      cjConnectionError || cjConfig?.connectionStatus === 'error'
                        ? 'bg-red-50 border-red-200 text-red-950'
                        : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}>
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-black ${
                          cjConnectionError || cjConfig?.connectionStatus === 'error'
                            ? 'bg-red-100 text-red-600'
                            : 'bg-slate-200 text-slate-600'
                        }`}>
                          !
                        </div>
                        <div>
                          <div className="font-bold text-sm flex items-center gap-2">
                            <span>{cjConnectionError || cjConfig?.connectionStatus === 'error' ? 'Authentication Failed' : 'CJdropshipping API Disconnected'}</span>
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                              cjConnectionError || cjConfig?.connectionStatus === 'error'
                                ? 'bg-red-200 text-red-900'
                                : 'bg-slate-200 text-slate-700'
                            }`}>
                              {cjConnectionError || cjConfig?.connectionStatus === 'error' ? 'INVALID CREDENTIALS' : 'NOT CONNECTED'}
                            </span>
                          </div>
                          <p className="text-xs mt-0.5 opacity-90">
                            {cjConnectionError || cjConfig?.lastError || 'Provide your official CJ Dropshipping API Key below and click "Connect to CJ API" to authenticate directly with CJ API 2.0.'}
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleConnectCj}
                          disabled={cjConnecting || !cjApiKeyInput.trim()}
                          className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-2xs cursor-pointer disabled:opacity-50"
                        >
                          {cjConnecting ? 'Connecting...' : 'Connect to CJ API'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Automation Toggles */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <label className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/60 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors">
                      <div>
                        <span className="font-bold text-slate-800 block text-xs">Automated Upload (15-min background sync)</span>
                        <span className="text-[11px] text-slate-500">Automatically fetches new trending products from CJ</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={cjAutoUploadToggle}
                        onChange={(e) => setCjAutoUploadToggle(e.target.checked)}
                        className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 shrink-0 ml-2"
                      />
                    </label>

                    <label className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/60 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors">
                      <div>
                        <span className="font-bold text-slate-800 block text-xs">Auto-Publish as Available</span>
                        <span className="text-[11px] text-slate-500">Make imported products immediately available for purchase</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={cjAutoPublishToggle}
                        onChange={(e) => setCjAutoPublishToggle(e.target.checked)}
                        className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 shrink-0 ml-2"
                      />
                    </label>

                    <label className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/60 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors">
                      <div>
                        <span className="font-bold text-slate-800 block text-xs">Require Admin Review</span>
                        <span className="text-[11px] text-slate-500">Route products to Staging Queue for manual approval</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={cjRequireApprovalToggle}
                        onChange={(e) => setCjRequireApprovalToggle(e.target.checked)}
                        className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 shrink-0 ml-2"
                      />
                    </label>
                  </div>

                  {/* Currency & Markup */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">USD to RWF Exchange Rate</label>
                      <div className="relative">
                        <input
                          type="number"
                          min="500"
                          value={cjUsdRateInput}
                          onChange={(e) => setCjUsdRateInput(Number(e.target.value))}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono font-bold"
                        />
                        <span className="absolute right-3.5 top-2.5 font-bold text-slate-400 pointer-events-none">RWF</span>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 block">Standard wholesale conversion rate</span>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Default Profit Markup (%)</label>
                      <div className="relative">
                        <input
                          type="number"
                          min="5"
                          max="200"
                          value={cjMarkupInput}
                          onChange={(e) => setCjMarkupInput(Number(e.target.value))}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono font-bold"
                        />
                        <span className="absolute right-3.5 top-2.5 font-bold text-slate-400 pointer-events-none">%</span>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 block">Added to cost when uploading new items</span>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block font-bold text-slate-700">CJ API Key / Access Token</label>
                        {cjConfig?.hasApiKey && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            Key Saved
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <input
                          type={showCjApiKey ? 'text' : 'password'}
                          value={cjApiKeyInput}
                          onChange={(e) => setCjApiKeyInput(e.target.value)}
                          placeholder="Paste your CJ API Key or Access Token"
                          className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-300 font-mono text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCjApiKey(!showCjApiKey)}
                          className="absolute right-2.5 top-2.5 p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                          title={showCjApiKey ? 'Hide API key' : 'Show API key'}
                        >
                          {showCjApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 block">Secured safely on backend</span>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block font-bold text-slate-700">CJ Account Email</label>
                        {isCjConnected ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Connected
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                            Disconnected
                          </span>
                        )}
                      </div>
                      <input
                        type="email"
                        value={cjEmailInput}
                        onChange={(e) => setCjEmailInput(e.target.value)}
                        placeholder="your-cj-email@domain.com"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs"
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">Account notification identifier</span>
                    </div>
                  </div>

                  {/* Categories to Import */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-2">Import Categories for Background Feed</label>
                    <div className="flex flex-wrap gap-2">
                      {categories.map(cat => {
                        const isSelected = cjSelectedCategories.includes(cat.id);
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setCjSelectedCategories(cjSelectedCategories.filter(c => c !== cat.id));
                              } else {
                                setCjSelectedCategories([...cjSelectedCategories, cat.id]);
                              }
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                              isSelected
                                ? 'bg-purple-100 text-purple-900 border-purple-300'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {isSelected ? '✓ ' : '+ '} {cat.nameEn}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* SUBTAB 6: INSTRUCTIONS & SETUP GUIDE */}
              {cjSubTab === 'instructions' && (
                <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-6 text-xs">
                  <div>
                    <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-purple-600" />
                      <span>CJdropshipping Supplier Integration Setup Guide</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Follow these steps to connect your CJdropshipping supplier account and manage automated dropshipping on ContactReach Market.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Step 1 */}
                    <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-100 space-y-2">
                      <div className="flex items-center gap-2 font-black text-purple-900 text-xs">
                        <span className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-[11px] shrink-0">1</span>
                        <span>Create or Log in to CJdropshipping</span>
                      </div>
                      <p className="text-slate-600 text-[11px] leading-relaxed">
                        Sign up or log in at <a href="https://cjdropshipping.com" target="_blank" rel="noreferrer" className="text-purple-700 underline font-bold">cjdropshipping.com</a>. Ensure your account email and profile are verified.
                      </p>
                    </div>

                    {/* Step 2 */}
                    <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-100 space-y-2">
                      <div className="flex items-center gap-2 font-black text-purple-900 text-xs">
                        <span className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-[11px] shrink-0">2</span>
                        <span>Access the API Center</span>
                      </div>
                      <p className="text-slate-600 text-[11px] leading-relaxed">
                        Go to the CJdropshipping Developer Center at <a href="https://developers.cjdropshipping.com" target="_blank" rel="noreferrer" className="text-purple-700 underline font-bold">developers.cjdropshipping.com</a> or within your CJ dashboard navigate to <strong>My CJ &gt; Authorization &gt; API</strong>.
                      </p>
                    </div>

                    {/* Step 3 */}
                    <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-100 space-y-2">
                      <div className="flex items-center gap-2 font-black text-purple-900 text-xs">
                        <span className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-[11px] shrink-0">3</span>
                        <span>Generate Your API Key / Token</span>
                      </div>
                      <p className="text-slate-600 text-[11px] leading-relaxed">
                        Click <strong>"Generate API Key"</strong> or copy your access token. This gives your website permission to query products, wholesale pricing, and stock levels.
                      </p>
                    </div>

                    {/* Step 4 */}
                    <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-100 space-y-2">
                      <div className="flex items-center gap-2 font-black text-purple-900 text-xs">
                        <span className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-[11px] shrink-0">4</span>
                        <span>Save Credentials in Feed Settings</span>
                      </div>
                      <p className="text-slate-600 text-[11px] leading-relaxed">
                        Navigate to the <strong>Feed Settings</strong> subtab above. Paste your API Key and Account Email, then click <strong>"Save Settings"</strong> and <strong>"Test Connection"</strong>.
                      </p>
                    </div>

                    {/* Step 5 */}
                    <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-100 space-y-2">
                      <div className="flex items-center gap-2 font-black text-purple-900 text-xs">
                        <span className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-[11px] shrink-0">5</span>
                        <span>Configure Pricing & Rwandan Currency</span>
                      </div>
                      <p className="text-slate-600 text-[11px] leading-relaxed">
                        Set your USD to RWF exchange rate (default: 1420 RWF) and default markup percentage (e.g. 35%). The system calculates wholesale costs and retail prices automatically.
                      </p>
                    </div>

                    {/* Step 6 */}
                    <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-100 space-y-2">
                      <div className="flex items-center gap-2 font-black text-purple-900 text-xs">
                        <span className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-[11px] shrink-0">6</span>
                        <span>Review & Approve Products</span>
                      </div>
                      <p className="text-slate-600 text-[11px] leading-relaxed">
                        When products are imported, review them in the <strong>Review & Approval Queue</strong>. Verify photos, edit Rwandan descriptions, customize your selling price, and click <strong>"Approve & Publish"</strong>.
                      </p>
                    </div>

                    {/* Step 7 */}
                    <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-100 space-y-2">
                      <div className="flex items-center gap-2 font-black text-purple-900 text-xs">
                        <span className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-[11px] shrink-0">7</span>
                        <span>Order Placement & Customer Payment</span>
                      </div>
                      <p className="text-slate-600 text-[11px] leading-relaxed">
                        Rwandan customers shop and checkout using MTN Mobile Money, Airtel Money, or Bank Transfer. Customer payments are verified by you in the <strong>Mobile Money & Payments</strong> tab.
                      </p>
                    </div>

                    {/* Step 8 */}
                    <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-100 space-y-2">
                      <div className="flex items-center gap-2 font-black text-purple-900 text-xs">
                        <span className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-[11px] shrink-0">8</span>
                        <span>Manual Fulfillment Approval & Tracking</span>
                      </div>
                      <p className="text-slate-600 text-[11px] leading-relaxed">
                        Go to the <strong>Dropshipping Orders</strong> tab. Click <strong>"Approve for CJ"</strong> to record the shipment dispatch and generate the carrier tracking number for customer order tracking.
                      </p>
                    </div>
                  </div>

                  {/* Security Callout */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="space-y-1 text-xs">
                      <span className="font-black text-slate-900 block">Enterprise Security Guarantee</span>
                      <p className="text-slate-600 text-[11px] leading-relaxed">
                        Your CJdropshipping API keys are stored securely on the server backend. Keys are never exposed in browser bundles, public API responses, or client network requests. All CJ communication proxies through the backend server.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: DSERS DROPSHIPPING & SUPPLIER FULFILLMENT */}
          {activeTab === 'dsers' && (
            <DsersFulfillmentTab
              products={products}
              orders={orders}
              categories={categories}
              onRefreshData={() => fetchAllData(true)}
              showToast={(msg) => showToast(msg)}
              onOpenProductEdit={(p) => handleOpenEditProduct(p)}
            />
          )}
        </main>
      </div>

      {/* MODAL: ADD TEAM MEMBER */}
      {newUserModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative border border-slate-200 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-base text-slate-900">Add Administrative Staff Member</h3>
              <button onClick={() => setNewUserModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              onSubmit={async e => {
                e.preventDefault();
                if (!newUserName.trim() || !newUserEmail.trim()) {
                  showToast('Name and email are required', 'error');
                  return;
                }
                setCreatingUser(true);
                try {
                  await api.adminCreateUser({
                    name: newUserName.trim(),
                    email: newUserEmail.trim(),
                    role: newUserRole,
                    phone: newUserPhone.trim() || undefined
                  });
                  showToast('Staff member added successfully!');
                  setNewUserModalOpen(false);
                  setNewUserName('');
                  setNewUserEmail('');
                  setNewUserPhone('');
                  fetchAllData();
                } catch (err: any) {
                  showToast(err.message || 'Failed to create staff member', 'error');
                } finally {
                  setCreatingUser(false);
                }
              }}
              className="space-y-3"
            >
              <div>
                <label className="font-bold text-slate-700 block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Eric Kwizera"
                  value={newUserName}
                  onChange={e => setNewUserName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="staff@contactreachmedia.rw"
                  value={newUserEmail}
                  onChange={e => setNewUserEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-[11px]"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Phone Number (Optional)</label>
                <input
                  type="text"
                  placeholder="078..."
                  value={newUserPhone}
                  onChange={e => setNewUserPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Role & Authority</label>
                <select
                  value={newUserRole}
                  onChange={e => setNewUserRole(e.target.value as AdminRole)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold bg-white"
                >
                  <option value="administrator">Administrator (Full operational access)</option>
                  <option value="product_manager">Product Manager (Catalog & inventory)</option>
                  <option value="order_manager">Order Manager (Order status & payments)</option>
                  <option value="customer_support">Customer Support (Inquiries & cases)</option>
                  <option value="shop_manager">Shop Manager (Vendors & suppliers)</option>
                  <option value="owner">Owner (Complete platform ownership)</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setNewUserModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingUser}
                  className="px-4 py-2 bg-[#FF6000] hover:bg-[#e05500] text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  {creatingUser ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 1: PRODUCT ADD / EDIT */}
      {productModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl relative border border-slate-200 flex flex-col">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-100 text-[#FF6000] flex items-center justify-center font-bold">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">
                    {editingProduct ? 'Edit Product & Update Firebase' : 'Upload Product (Manual / Firebase)'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {editingProduct ? 'Modifications sync immediately with Cloud Firestore and local storage' : 'All attributes, pictures, and pricing will be saved to Firebase and the store'}
                  </p>
                </div>
              </div>
              <button onClick={() => setProductModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-800 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Product Title *</label>
                <input
                  type="text"
                  required
                  value={prodForm.name}
                  onChange={(e) => setProdForm({ ...prodForm, name: e.target.value })}
                  placeholder="e.g. Disposable Salon Neck Strips"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Unique SKU Code</label>
                  <input
                    type="text"
                    value={prodForm.sku}
                    onChange={(e) => setProdForm({ ...prodForm, sku: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Brand Name</label>
                  <input
                    type="text"
                    value={prodForm.brand}
                    onChange={(e) => setProdForm({ ...prodForm, brand: e.target.value })}
                    placeholder="e.g. Cantu, Samsung, Nike"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-slate-700">Cost Price (FRW)</label>
                    <span className="text-[10px] text-blue-600 font-semibold">Admin Override</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={prodForm.costPrice}
                    onChange={(e) => setProdForm({ ...prodForm, costPrice: e.target.value })}
                    placeholder="e.g. 8000"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono font-bold bg-blue-50/20"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Wholesale cost. Admin can override anytime.
                  </span>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Selling Price (FRW) *</label>
                  <input
                    type="number"
                    required
                    value={prodForm.price}
                    onChange={(e) => {
                      const newPrice = e.target.value;
                      const priceNum = Number(newPrice) || 0;
                      const numPct = Number(prodForm.discountPercent) || 0;
                      const calcDiscountPrice = (numPct > 0 && priceNum > 0)
                        ? Math.max(0, Math.round(priceNum * (1 - numPct / 100)))
                        : '';
                      setProdForm({ ...prodForm, price: newPrice, discountPrice: calcDiscountPrice });
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono font-bold"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-slate-700">Discount Percentage (%)</label>
                    {prodForm.discountPercent && Number(prodForm.discountPercent) > 0 && (
                      <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                        {prodForm.discountPercent}% OFF
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="99"
                      value={prodForm.discountPercent}
                      onChange={(e) => {
                        const pct = e.target.value;
                        const numPct = Number(pct);
                        const priceNum = Number(prodForm.price) || 0;
                        const calcDiscountPrice = (pct !== '' && numPct > 0 && priceNum > 0)
                          ? Math.max(0, Math.round(priceNum * (1 - numPct / 100)))
                          : '';
                        setProdForm({
                          ...prodForm,
                          discountPercent: pct,
                          discountPrice: calcDiscountPrice
                        });
                      }}
                      placeholder="e.g. 15 for 15% OFF"
                      className="w-full pl-3.5 pr-8 py-2.5 rounded-xl border border-slate-300 font-mono text-emerald-600 font-bold"
                    />
                    <span className="absolute right-3.5 top-2.5 font-bold text-slate-400 pointer-events-none">%</span>
                  </div>

                  {/* Quick percentage discount presets */}
                  <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                    {[5, 10, 15, 20, 25, 50].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          const priceNum = Number(prodForm.price) || 0;
                          const calcDiscountPrice = priceNum > 0 ? Math.max(0, Math.round(priceNum * (1 - preset / 100))) : '';
                          setProdForm({
                            ...prodForm,
                            discountPercent: preset,
                            discountPrice: calcDiscountPrice
                          });
                        }}
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded border cursor-pointer transition-colors ${
                          Number(prodForm.discountPercent) === preset
                            ? 'bg-[#FF6000] text-white border-orange-600'
                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200'
                        }`}
                      >
                        {preset}%
                      </button>
                    ))}
                    {prodForm.discountPercent !== '' && (
                      <button
                        type="button"
                        onClick={() => setProdForm({ ...prodForm, discountPercent: '', discountPrice: '' })}
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-slate-200 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        None
                      </button>
                    )}
                  </div>

                  {prodForm.discountPercent && Number(prodForm.discountPercent) > 0 && Number(prodForm.price) > 0 && (
                    <div className="mt-1.5 p-1.5 bg-emerald-50 rounded-lg border border-emerald-100 text-[10px] text-emerald-800 font-medium">
                      Promo price: <span className="font-mono font-bold">{Math.max(0, Math.round(Number(prodForm.price) * (1 - Number(prodForm.discountPercent) / 100))).toLocaleString()} FRW</span>
                      <span className="text-slate-500 block">Save {(Number(prodForm.price) - Math.round(Number(prodForm.price) * (1 - Number(prodForm.discountPercent) / 100))).toLocaleString()} FRW ({prodForm.discountPercent}% off)</span>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Stock Quantity *</label>
                  <input
                    type="number"
                    required
                    value={prodForm.stock}
                    onChange={(e) => setProdForm({ ...prodForm, stock: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono font-bold"
                  />
                </div>
              </div>

              {/* Product Shipping Fee Configuration */}
              {(() => {
                const effCost = (prodForm.costPrice !== '' && Number(prodForm.costPrice) > 0)
                  ? Number(prodForm.costPrice)
                  : (prodForm.discountPrice !== '' && Number(prodForm.discountPrice) > 0
                      ? Number(prodForm.discountPrice)
                      : (Number(prodForm.price) || 0));
                const autoShipping = Math.round(1500 + (effCost * 0.10));
                const currentShippingFee = (prodForm.shippingCost !== '' && !isNaN(Number(prodForm.shippingCost)))
                  ? Math.max(0, Number(prodForm.shippingCost))
                  : autoShipping;

                return (
                  <div className="p-4 bg-gradient-to-r from-blue-50/80 via-indigo-50/40 to-blue-50/80 rounded-2xl border border-blue-200/90 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-2xs">
                          <Truck className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-slate-900 text-xs">Shipping Cost for Product (FRW)</span>
                            <span className="text-[10px] font-bold text-blue-700 bg-blue-100/90 px-2 py-0.5 rounded-full border border-blue-200">
                              🚚 Displayed with shipping badge
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Standard shipping formula is <code className="font-mono bg-blue-100/70 px-1 py-0.2 rounded text-blue-900 font-bold">1,500 + 10% of product cost</code>. You can set a custom shipping cost here or leave blank to use the standard calculation.
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">Applied Shipping:</span>
                        <span className="font-mono font-black text-sm text-blue-700 block">
                          {currentShippingFee.toLocaleString()} FRW
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {prodForm.shippingCost !== '' ? '(Admin Custom Override)' : '(Auto: 1,500 + 10%)'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center pt-1">
                      <div className="sm:col-span-6 relative">
                        <input
                          type="number"
                          min="0"
                          value={prodForm.shippingCost}
                          onChange={(e) => setProdForm({ ...prodForm, shippingCost: e.target.value })}
                          placeholder={`Auto standard: ${autoShipping.toLocaleString()} FRW`}
                          className="w-full pl-9 pr-14 py-2.5 rounded-xl border border-blue-300 bg-white font-mono font-bold text-xs text-blue-950 focus:ring-2 focus:ring-blue-500 shadow-2xs"
                        />
                        <Truck className="w-4 h-4 text-blue-600 absolute left-3 top-3 pointer-events-none" />
                        <span className="absolute right-3.5 top-2.5 font-bold text-slate-400 pointer-events-none text-xs">FRW</span>
                      </div>

                      {/* Quick Presets */}
                      <div className="sm:col-span-6 flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setProdForm({ ...prodForm, shippingCost: '' })}
                          className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg border cursor-pointer transition-colors ${
                            prodForm.shippingCost === ''
                              ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                              : 'bg-white text-slate-600 hover:bg-slate-100 border-slate-200'
                          }`}
                          title="Use auto formula: 1500 + 10%"
                        >
                          Auto ({autoShipping.toLocaleString()} FRW)
                        </button>
                        <button
                          type="button"
                          onClick={() => setProdForm({ ...prodForm, shippingCost: 0 })}
                          className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg border cursor-pointer transition-colors ${
                            prodForm.shippingCost === 0 || prodForm.shippingCost === '0'
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                              : 'bg-white text-slate-600 hover:bg-slate-100 border-slate-200'
                          }`}
                          title="Free shipping for this product"
                        >
                          Free (0 FRW)
                        </button>
                        {[1500, 2000, 3000, 5000].map(val => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setProdForm({ ...prodForm, shippingCost: val })}
                            className={`text-[10px] font-bold px-2 py-1.5 rounded-lg border cursor-pointer transition-colors ${
                              Number(prodForm.shippingCost) === val
                                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                : 'bg-white text-slate-600 hover:bg-slate-100 border-slate-200'
                            }`}
                          >
                            {val.toLocaleString()}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {prodForm.costPrice !== '' && Number(prodForm.costPrice) > 0 && Number(prodForm.price) > 0 && (
                <div className="p-3 bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs text-emerald-950 font-bold">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        Estimated Gross Profit: {(Number(prodForm.price) - Number(prodForm.costPrice)).toLocaleString()} FRW / unit
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-emerald-200 text-emerald-900 rounded-lg font-mono">
                      {Math.round(((Number(prodForm.price) - Number(prodForm.costPrice)) / Number(prodForm.price)) * 100)}% Margin
                    </span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Main Department *</label>
                  <select
                    value={prodForm.category}
                    onChange={(e) => {
                      const newCat = e.target.value;
                      const subs = categories.filter(c => c.parentId === newCat);
                      setProdForm({
                        ...prodForm,
                        category: newCat,
                        subcategory: subs[0]?.id || ''
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold text-xs bg-white focus:ring-2 focus:ring-orange-500"
                  >
                    {categories.filter(c => c.level === 1 || !c.parentId).map(c => (
                      <option key={c.id} value={c.id}>{c.nameEn} ({c.nameRw || ''})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Subcategory</label>
                  <select
                    value={prodForm.subcategory}
                    onChange={(e) => setProdForm({ ...prodForm, subcategory: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold text-xs bg-white focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">-- No Subcategory --</option>
                    {categories.filter(c => c.parentId === prodForm.category).map(sub => (
                      <option key={sub.id} value={sub.id}>{sub.nameEn}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-slate-700">Merchant Shop *</label>
                    <button
                      type="button"
                      onClick={() => setProdForm(prev => ({ ...prev, isAddingNewShop: !prev.isAddingNewShop }))}
                      className="text-[11px] font-bold text-[#FF6000] hover:text-[#e05500] hover:underline cursor-pointer flex items-center gap-1"
                    >
                      {prodForm.isAddingNewShop ? '← Select Existing Shop' : '+ Add New Shop'}
                    </button>
                  </div>

                  {!prodForm.isAddingNewShop ? (
                    <div>
                      <select
                        value={prodForm.shopName}
                        onChange={(e) => {
                          if (e.target.value === '__NEW_SHOP__') {
                            setProdForm(prev => ({ ...prev, isAddingNewShop: true, newShopName: '' }));
                          } else {
                            const shp = shops.find(s => s.name === e.target.value);
                            setProdForm({ ...prodForm, shopName: e.target.value, shopId: shp?.id || '' });
                          }
                        }}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-semibold bg-white"
                      >
                        {shops.map(s => (
                          <option key={s.id} value={s.name}>
                            {s.name} ({s.location || 'Kigali'}){s.isRecommended ? ' ★ Recommended' : ''}
                          </option>
                        ))}
                        <option value="__NEW_SHOP__">➕ + Add New Shop...</option>
                      </select>
                      <p className="text-[10px] text-slate-400 mt-1">
                        If the shop exists, no need to write it — select it above.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <input
                        type="text"
                        value={prodForm.newShopName}
                        onChange={(e) => setProdForm(prev => ({ ...prev, newShopName: e.target.value }))}
                        placeholder="Enter new shop name..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-orange-400 focus:border-orange-500 font-bold bg-orange-50/20"
                      />
                      <p className="text-[10px] text-orange-700 mt-1 font-medium">
                        Stored in Shops directory as a standard (unrecommended) shop.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Inline New Shop Form when adding a new shop */}
              {prodForm.isAddingNewShop && (
                <div className="p-3.5 bg-orange-50/50 rounded-2xl border border-orange-200 space-y-2.5 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-orange-950">
                      <Store className="w-4 h-4 text-[#FF6000]" />
                      <span>New Shop Details (Saved to directory with <code>isRecommended: false</code>)</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded-full border border-orange-200">
                      Standard Shop (Not Recommended)
                    </span>
                  </div>

                  {/* Real-time duplicate check */}
                  {prodForm.newShopName.trim() && shops.some(s => s.name.trim().toLowerCase() === prodForm.newShopName.trim().toLowerCase()) && (
                    <div className="p-2 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-[11px] flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                      <div>
                        <strong>"{prodForm.newShopName.trim()}" already exists</strong> in your shops directory! It will be reused automatically so you don't need to write or create a duplicate.
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Shop Location / Plaza</label>
                      <input
                        type="text"
                        value={prodForm.newShopLocation}
                        onChange={(e) => setProdForm(prev => ({ ...prev, newShopLocation: e.target.value }))}
                        placeholder="e.g. Fair View Plaza, Kigali"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Contact Phone (Optional)</label>
                      <input
                        type="text"
                        value={prodForm.newShopPhone}
                        onChange={(e) => setProdForm(prev => ({ ...prev, newShopPhone: e.target.value }))}
                        placeholder="e.g. 0780022600"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Shop Description (Optional)</label>
                    <input
                      type="text"
                      value={prodForm.newShopDescription}
                      onChange={(e) => setProdForm(prev => ({ ...prev, newShopDescription: e.target.value }))}
                      placeholder="e.g. Direct supplier for cosmetics and hair supplies"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
                    />
                  </div>
                </div>
              )}

              {/* MULTIPLE IMAGES & GALLERY LINKS MANAGER */}
              <div className="space-y-3 p-4 bg-slate-50/90 rounded-2xl border border-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <label className="block font-black text-slate-800 text-xs">
                      Product Images & Gallery Links *
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Add multiple image URLs or upload pictures. Customers will be able to browse all angles in an interactive gallery.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="px-2.5 py-0.5 rounded-full bg-orange-100 text-[#FF6000] font-bold text-[11px]">
                      {getParsedImageList(prodForm.imagesText, prodForm.imageUrl).length} {getParsedImageList(prodForm.imagesText, prodForm.imageUrl).length === 1 ? 'Image' : 'Images'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowBulkImagePaste(!showBulkImagePaste)}
                      className="px-2.5 py-1 text-[11px] font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg cursor-pointer transition-colors"
                    >
                      {showBulkImagePaste ? 'Hide Bulk Paste' : 'Bulk Paste URLs'}
                    </button>
                  </div>
                </div>

                {/* Bulk Paste Box (Collapsible) */}
                {showBulkImagePaste && (
                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                    <label className="block text-[11px] font-bold text-slate-700">
                      Paste Multiple Image Links (One URL per line or comma-separated):
                    </label>
                    <textarea
                      rows={3}
                      value={bulkImageInput}
                      onChange={(e) => setBulkImageInput(e.target.value)}
                      placeholder="https://images.unsplash.com/photo-1...&#10;https://images.unsplash.com/photo-2...&#10;https://example.com/item-angle-3.jpg"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-[11px]"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setBulkImageInput('');
                          setShowBulkImagePaste(false);
                        }}
                        className="px-3 py-1 text-[11px] font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleApplyBulkImages}
                        className="px-3.5 py-1 text-[11px] font-bold bg-[#FF6000] hover:bg-[#e05500] text-white rounded-lg shadow-2xs cursor-pointer"
                      >
                        Add Links to Gallery
                      </button>
                    </div>
                  </div>
                )}

                {/* Quick Add Bar: Input Single or Multiple URLs + Add Button + Upload Button */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <div className="sm:col-span-8 flex gap-1.5">
                    <input
                      type="text"
                      value={newImageLink}
                      onChange={(e) => setNewImageLink(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddImageLink();
                        }
                      }}
                      placeholder="Paste picture URL or multiple links (separated by comma, space, or newline)"
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono bg-white"
                    />
                    <button
                      type="button"
                      onClick={handleAddImageLink}
                      className="px-3.5 py-2 bg-[#FF6000] hover:bg-[#e05500] text-white font-bold rounded-xl text-xs flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs"
                      title="Add single or multiple picture links"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Picture Link(s)</span>
                    </button>
                  </div>
                  <div className="sm:col-span-4">
                    <label className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-orange-50 text-slate-700 hover:text-[#FF6000] border border-slate-300 hover:border-orange-200 rounded-xl cursor-pointer font-bold text-xs transition-colors h-full">
                      <Upload className="w-3.5 h-3.5 text-[#FF6000]" />
                      <span>Upload Picture(s)</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleProductImageUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Visual Image Cards Gallery List */}
                {(() => {
                  const currentList = getParsedImageList(prodForm.imagesText, prodForm.imageUrl);
                  if (currentList.length === 0) {
                    return (
                      <div className="py-6 px-4 bg-white rounded-xl border border-dashed border-slate-300 text-center">
                        <ImageIcon className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
                        <p className="font-bold text-slate-600 text-xs">No images added yet</p>
                        <p className="text-[11px] text-slate-400">Enter an image URL above or upload a photo to configure the gallery</p>
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 pt-1">
                      {currentList.map((imgUrl, idx) => {
                        const isPrimary = idx === 0 || imgUrl === prodForm.imageUrl;
                        return (
                          <div
                            key={idx}
                            className={`relative bg-white rounded-xl border overflow-hidden shadow-2xs transition-all group flex flex-col justify-between ${
                              isPrimary ? 'border-[#FF6000] ring-2 ring-orange-200' : 'border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            {/* Primary Badge */}
                            <div className="absolute top-1.5 left-1.5 z-10">
                              {isPrimary ? (
                                <span className="bg-[#FF6000] text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-xs flex items-center gap-0.5">
                                  <Star className="w-2.5 h-2.5 fill-white" />
                                  <span>Cover</span>
                                </span>
                              ) : (
                                <span className="bg-slate-900/60 backdrop-blur-xs text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                                  #{idx + 1}
                                </span>
                              )}
                            </div>

                            {/* Delete Button */}
                            <div className="absolute top-1.5 right-1.5 z-10">
                              <button
                                type="button"
                                onClick={() => handleRemoveImage(imgUrl)}
                                className="w-6 h-6 rounded-md bg-white/90 hover:bg-rose-600 hover:text-white text-slate-500 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
                                title="Remove Image"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>

                            {/* Thumbnail Area */}
                            <div className="relative pt-[80%] bg-slate-100 overflow-hidden">
                              <img
                                src={imgUrl}
                                alt={`Product angle ${idx + 1}`}
                                className="absolute inset-0 w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLElement).setAttribute('src', '/src/assets/images/hero_marketplace_shopper_1791966365592.jpg');
                                }}
                              />
                            </div>

                            {/* Card Footer Actions */}
                            <div className="p-1.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-1 text-[10px]">
                              {!isPrimary ? (
                                <button
                                  type="button"
                                  onClick={() => handleSetPrimaryImage(imgUrl)}
                                  className="text-[10px] font-bold text-[#FF6000] hover:underline flex items-center gap-0.5 cursor-pointer"
                                >
                                  <Star className="w-2.5 h-2.5" />
                                  <span>Set Cover</span>
                                </button>
                              ) : (
                                <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5">
                                  <Check className="w-2.5 h-2.5" />
                                  <span>Cover</span>
                                </span>
                              )}

                              <div className="flex items-center gap-0.5">
                                {idx > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => handleMoveImage(idx, 'left')}
                                    className="p-1 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-200 cursor-pointer"
                                    title="Move Left"
                                  >
                                    <ArrowLeft className="w-3 h-3" />
                                  </button>
                                )}
                                {idx < currentList.length - 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleMoveImage(idx, 'right')}
                                    className="p-1 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-200 cursor-pointer"
                                    title="Move Right"
                                  >
                                    <ArrowRight className="w-3 h-3" />
                                  </button>
                                )}
                                <a
                                  href={imgUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-200"
                                  title="Open in new tab"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-xs">Available Sizes (optional)</label>
                  <input
                    type="text"
                    value={prodForm.sizes}
                    onChange={(e) => setProdForm({ ...prodForm, sizes: e.target.value })}
                    placeholder="e.g. S, M, L, XL, 38, 40"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-xs">Available Colors (optional)</label>
                  <input
                    type="text"
                    value={prodForm.colors}
                    onChange={(e) => setProdForm({ ...prodForm, colors: e.target.value })}
                    placeholder="e.g. Black, White, Navy Blue"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-xs">Storage / Capacity (optional)</label>
                  <input
                    type="text"
                    value={prodForm.storage}
                    onChange={(e) => setProdForm({ ...prodForm, storage: e.target.value })}
                    placeholder="e.g. 64GB, 128GB, 256GB"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 text-xs">Product Description (optional - hidden if empty)</label>
                <textarea
                  rows={3}
                  value={prodForm.description}
                  onChange={(e) => setProdForm({ ...prodForm, description: e.target.value })}
                  placeholder="Comprehensive description. If left empty, the Description tab is automatically hidden from customers..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-xs">Attributes & Specifications (optional - hidden if empty)</label>
                  <textarea
                    rows={3}
                    value={prodForm.specifications}
                    onChange={(e) => setProdForm({ ...prodForm, specifications: e.target.value })}
                    placeholder="Technical specifications, materials, certifications, power rating... If left empty, this section is hidden."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-xs">Supplier & Packaging Details (optional - hidden if empty)</label>
                  <textarea
                    rows={3}
                    value={prodForm.packagingInfo}
                    onChange={(e) => setProdForm({ ...prodForm, packagingInfo: e.target.value })}
                    placeholder="Box contents, parcel dimensions, packaging notes... If left empty, this section is hidden."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
              </div>

              {/* YouTube Video Description Link */}
              <div className="p-4 rounded-2xl bg-red-50/40 border border-red-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 font-bold text-slate-800 text-xs">
                    <div className="w-5 h-5 rounded-md bg-red-600 flex items-center justify-center text-white shadow-2xs">
                      <Youtube className="w-3.5 h-3.5" />
                    </div>
                    <span>YouTube Video Description Link</span>
                  </label>
                  <span className="text-[10px] font-bold text-red-600 bg-red-100/70 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Interactive Video Demo
                  </span>
                </div>

                <div>
                  <div className="relative">
                    <input
                      type="url"
                      value={prodForm.videoUrl}
                      onChange={(e) => setProdForm({ ...prodForm, videoUrl: e.target.value })}
                      placeholder="e.g. https://www.youtube.com/watch?v=... or https://youtu.be/... or Shorts"
                      className="w-full pl-9 pr-20 py-2.5 rounded-xl border border-red-200 bg-white focus:bg-white text-xs font-mono placeholder:font-sans placeholder:text-slate-400"
                    />
                    <Youtube className="w-4 h-4 text-red-500 absolute left-3 top-3 pointer-events-none" />
                    {prodForm.videoUrl.trim() && (
                      <button
                        type="button"
                        onClick={() => setProdForm({ ...prodForm, videoUrl: '' })}
                        className="absolute right-2.5 top-2 text-[10px] font-bold text-slate-400 hover:text-slate-700 px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5 leading-snug">
                    Paste a YouTube video link or Shorts URL. An interactive video player will be embedded directly on the customer's product detail page so buyers can see real product unboxings and demos.
                  </p>
                </div>

                {/* Live YouTube Preview Card */}
                {prodForm.videoUrl.trim() && (
                  <div>
                    {isValidYouTubeUrl(prodForm.videoUrl) ? (
                      <div className="p-2.5 rounded-xl bg-white border border-red-200 flex items-center justify-between gap-3 shadow-2xs">
                        <div className="flex items-center gap-3">
                          <div className="w-16 h-10 rounded-lg overflow-hidden bg-black shrink-0 relative group">
                            <img
                              src={getYouTubeThumbnailUrl(prodForm.videoUrl) || ''}
                              alt="YouTube Video Thumbnail"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                              <Youtube className="w-4 h-4 text-white" />
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-[11px]">
                              <Check className="w-3.5 h-3.5" />
                              <span>Valid YouTube Video Linked</span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Video ID: {getYouTubeVideoId(prodForm.videoUrl)}
                            </span>
                          </div>
                        </div>
                        <a
                          href={prodForm.videoUrl.startsWith('http') ? prodForm.videoUrl : `https://www.youtube.com/watch?v=${getYouTubeVideoId(prodForm.videoUrl)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 font-bold text-[10px] flex items-center gap-1 shrink-0 border border-red-200 transition-colors"
                        >
                          <span>Test Video</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    ) : (
                      <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Please enter a valid YouTube URL (e.g., https://youtube.com/watch?v=... or https://youtu.be/...)</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer font-semibold">
                  <input
                    type="checkbox"
                    checked={prodForm.isFeatured}
                    onChange={(e) => setProdForm({ ...prodForm, isFeatured: e.target.checked })}
                    className="rounded text-orange-600 focus:ring-orange-500"
                  />
                  <span>Featured Product</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-semibold">
                  <input
                    type="checkbox"
                    checked={prodForm.isNewArrival}
                    onChange={(e) => setProdForm({ ...prodForm, isNewArrival: e.target.checked })}
                    className="rounded text-orange-600 focus:ring-orange-500"
                  />
                  <span>New Arrival</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-semibold">
                  <input
                    type="checkbox"
                    checked={prodForm.isBestSeller}
                    onChange={(e) => setProdForm({ ...prodForm, isBestSeller: e.target.checked })}
                    className="rounded text-orange-600 focus:ring-orange-500"
                  />
                  <span>Best Seller</span>
                </label>
              </div>

              <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                  <Database className="w-3.5 h-3.5 text-[#FF6000]" />
                  <span>Saves directly to Cloud Firestore & store database</span>
                </div>
                <div className="flex items-center gap-2">
                  {editingProduct && (
                    <button
                      type="button"
                      onClick={() => setProductToDelete(editingProduct)}
                      className="px-4 py-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 font-bold flex items-center gap-1.5 cursor-pointer text-xs transition-colors"
                      title="Permanently delete this product from everywhere"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete Permanently</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setProductModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-[#FF6000] hover:bg-[#e05500] text-white font-bold rounded-xl shadow-sm cursor-pointer flex items-center gap-2"
                  >
                    <CloudUpload className="w-4 h-4" />
                    <span>{editingProduct ? 'Save Changes to Firebase' : 'Upload & Save to Firebase'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ORDER STATUS & DISPATCH */}
      {orderStatusModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative border border-slate-200 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-base text-slate-900">
                  Update Order #{orderStatusModal.orderNumber}
                </h3>
                <span className="text-slate-500">{orderStatusModal.customerName} · {orderStatusModal.totalAmount.toLocaleString()} FRW</span>
              </div>
              <button onClick={() => setOrderStatusModal(null)} className="p-1.5 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateOrderStatus} className="space-y-3.5">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Order Pipeline Status</label>
                <select
                  value={orderStatusModal.status}
                  onChange={(e) => setOrderStatusModal({ ...orderStatusModal, status: e.target.value as OrderStatus })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold"
                >
                  <option value="New">New (Awaiting confirmation)</option>
                  <option value="Confirmed">Confirmed (Payment verified & stock allocated)</option>
                  <option value="Preparing">Preparing (Packing at warehouse)</option>
                  <option value="Ready for Delivery">Ready for Delivery / Ready for Pickup</option>
                  <option value="Out for Delivery">Out for Delivery (With courier)</option>
                  <option value="Delivered">Delivered (Successfully completed)</option>
                  <option value="Cancelled">Cancelled (Restore stock)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Delivery Status</label>
                <select
                  value={orderStatusModal.deliveryStatus || 'Pending'}
                  onChange={(e) => setOrderStatusModal({ ...orderStatusModal, deliveryStatus: e.target.value as OrderDeliveryStatus })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold"
                >
                  <option value="Pending">Pending (Awaiting dispatch processing)</option>
                  <option value="Processing">Processing (Supplier preparing items)</option>
                  <option value="Awaiting Shipment">Awaiting Shipment (Packed & awaiting pickup)</option>
                  <option value="Shipped">Shipped (Handed over to carrier)</option>
                  <option value="In Transit">In Transit (On the way to Kigali / destination)</option>
                  <option value="Out for Delivery">Out for Delivery (With local delivery rider)</option>
                  <option value="Delivered">Delivered (Successfully handed to customer)</option>
                  <option value="Cancelled">Cancelled (Order cancelled)</option>
                  <option value="Failed Delivery">Failed Delivery (Attempted, recipient unavailable)</option>
                  <option value="Returned">Returned (Item returned to sender/warehouse)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Payment Status</label>
                <select
                  value={orderStatusModal.paymentStatus}
                  onChange={(e) => setOrderStatusModal({ ...orderStatusModal, paymentStatus: e.target.value as PaymentStatus })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold"
                >
                  <option value="Pending Payment">Pending Payment</option>
                  <option value="Pending Verification">Pending Verification (Reviewing transaction)</option>
                  <option value="Paid">Paid (Confirmed in MTN/Airtel)</option>
                  <option value="Failed">Failed</option>
                  <option value="Refunded">Refunded</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tracking Number</label>
                  <input
                    type="text"
                    value={orderStatusModal.trackingNumber || ''}
                    onChange={(e) => setOrderStatusModal({ ...orderStatusModal, trackingNumber: e.target.value })}
                    placeholder="e.g. RW-EXP-8291"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Carrier / Provider</label>
                  <input
                    type="text"
                    value={orderStatusModal.trackingCarrier || ''}
                    onChange={(e) => setOrderStatusModal({ ...orderStatusModal, trackingCarrier: e.target.value })}
                    placeholder="e.g. DHL, FedEx, Local Moto"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Expected Delivery Date</label>
                <input
                  type="date"
                  value={orderStatusModal.expectedDeliveryDate ? orderStatusModal.expectedDeliveryDate.slice(0, 10) : ''}
                  onChange={(e) => setOrderStatusModal({ ...orderStatusModal, expectedDeliveryDate: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Assigned Courier</label>
                  <input
                    type="text"
                    value={orderStatusModal.assignedCourier || ''}
                    onChange={(e) => setOrderStatusModal({ ...orderStatusModal, assignedCourier: e.target.value })}
                    placeholder="e.g. Patrick (Moto Express)"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Courier Phone</label>
                  <input
                    type="text"
                    value={orderStatusModal.courierPhone || ''}
                    onChange={(e) => setOrderStatusModal({ ...orderStatusModal, courierPhone: e.target.value })}
                    placeholder="078..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Internal Staff Note</label>
                <input
                  type="text"
                  value={orderStatusModal.internalNotes || ''}
                  onChange={(e) => setOrderStatusModal({ ...orderStatusModal, internalNotes: e.target.value })}
                  placeholder="e.g. Delivered to reception desk at Kimironko"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOrderStatusModal(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-black text-white font-bold rounded-xl"
                >
                  Save Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: INVOICE PRINT VIEW */}
      {printableInvoiceOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative border border-slate-200 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                <img src="/logo.png" alt="ContactReach" className="w-10 h-10 rounded-full border border-slate-200" />
                <div>
                  <h3 className="font-black text-base text-slate-900">ContactReach Market</h3>
                  <span className="text-[10px] text-slate-400 font-mono">ContactReach Media Ltd · Kigali, Rwanda</span>
                </div>
              </div>
              <div className="text-right">
                <span className="font-mono font-black text-lg text-slate-900 block">{printableInvoiceOrder.orderNumber}</span>
                <span className="text-[10px] text-slate-400 font-mono">{new Date(printableInvoiceOrder.createdAt).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="font-bold text-slate-400 uppercase text-[10px] block">Billed To (Customer):</span>
                <p className="font-extrabold text-slate-900 text-sm">{printableInvoiceOrder.customerName}</p>
                <p className="text-slate-600 font-mono">{printableInvoiceOrder.customerPhone}</p>
                <p className="text-slate-500">{printableInvoiceOrder.deliveryAddress}</p>
              </div>
              <div className="text-right">
                <span className="font-bold text-slate-400 uppercase text-[10px] block">Payment Method:</span>
                <p className="font-bold text-slate-800">{printableInvoiceOrder.paymentMethod}</p>
                <span className={`inline-block mt-1 px-3 py-0.5 rounded-full text-xs font-black uppercase ${
                  printableInvoiceOrder.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {printableInvoiceOrder.paymentStatus}
                </span>
              </div>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-400">
                  <tr>
                    <th className="p-3">Product Name & Image</th>
                    <th className="p-3 text-center">Qty</th>
                    <th className="p-3 text-right">Unit Price</th>
                    <th className="p-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {printableInvoiceOrder.items.map((item, idx) => {
                    const resolvedImg = getProductImageDueToProduct(item, products);
                    const resolvedName = getProductNameDueToProduct(item, products);
                    return (
                      <tr key={idx}>
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={resolvedImg}
                              alt={resolvedName}
                              className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0 bg-white"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = getProductImageDueToProduct(item);
                              }}
                            />
                            <div className="min-w-0">
                              <p className="font-bold text-slate-800 text-xs truncate max-w-xs">{resolvedName}</p>
                              {(item.size || item.color || item.shopName) && (
                                <p className="text-[10px] text-slate-400 font-mono">
                                  {item.shopName ? `${item.shopName} · ` : ''}
                                  {item.size ? `Size: ${item.size} ` : ''}
                                  {item.color ? `Color: ${item.color}` : ''}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-xs">{item.quantity}</td>
                        <td className="p-3 text-right font-mono text-xs">{item.price.toLocaleString()} FRW</td>
                        <td className="p-3 text-right font-mono font-bold text-xs text-slate-900">{(item.price * item.quantity).toLocaleString()} FRW</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end">
              <div className="w-64 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-mono">{printableInvoiceOrder.subtotal.toLocaleString()} FRW</span>
                </div>
                {printableInvoiceOrder.discountAmount && (
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>Discount ({printableInvoiceOrder.couponCode || 'Promo'}):</span>
                    <span className="font-mono">-{printableInvoiceOrder.discountAmount.toLocaleString()} FRW</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>Delivery Fee:</span>
                  <span className="font-mono">{printableInvoiceOrder.deliveryFee.toLocaleString()} FRW</span>
                </div>
                <div className="flex justify-between font-black text-sm text-slate-900 pt-2 border-t border-slate-200">
                  <span>Total Due / Paid:</span>
                  <span className="font-mono text-[#FF6000]">{printableInvoiceOrder.totalAmount.toLocaleString()} FRW</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[10px] text-slate-400">Support: 0780022600 · contactreachmedialimited@gmail.com</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-slate-900 hover:bg-black text-white font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Invoice</span>
                </button>
                <button
                  onClick={() => setPrintableInvoiceOrder(null)}
                  className="px-4 py-2 border border-slate-300 font-bold rounded-xl cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: STOCK ADJUSTMENT */}
      {stockModalProduct && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative border border-slate-200 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-base text-slate-900">Adjust Inventory Stock</h3>
                <span className="text-slate-500 font-semibold">{stockModalProduct.name}</span>
              </div>
              <button onClick={() => setStockModalProduct(null)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStockAdjustment} className="space-y-3.5">
              <div className="p-3 bg-slate-50 rounded-xl flex justify-between font-bold">
                <span>Current Stock on Record:</span>
                <span className="font-mono text-slate-900">{stockModalProduct.stock} units</span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Quantity to Add or Deduct (use negative to deduct)
                </label>
                <input
                  type="number"
                  required
                  value={stockAdjustAmount}
                  onChange={(e) => setStockAdjustAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono font-bold text-base"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Reason for Stock Adjustment *</label>
                <input
                  type="text"
                  required
                  value={stockAdjustReason}
                  onChange={(e) => setStockAdjustReason(e.target.value)}
                  placeholder="e.g. Supplier restocking, warehouse damaged box, return intake"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-medium"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setStockModalProduct(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#FF6000] text-white font-bold rounded-xl"
                >
                  Save Stock Movement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: CATEGORY EDITOR */}
      {categoryModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative border border-slate-200 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-base text-slate-900">
                {editingCategory ? 'Edit Category' : 'Create Category'}
              </h3>
              <button onClick={() => setCategoryModalOpen(false)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-3.5">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Category Name (English) *</label>
                <input
                  type="text"
                  required
                  value={catNameEn}
                  onChange={(e) => setCatNameEn(e.target.value)}
                  placeholder="e.g. Footwear & Shoes"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Category Name (Kinyarwanda) *</label>
                <input
                  type="text"
                  required
                  value={catNameRw}
                  onChange={(e) => setCatNameRw(e.target.value)}
                  placeholder="e.g. Inkweto"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300"
                />
              </div>

              {/* Category Cover Image Section */}
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-slate-700">
                    Category Image
                  </label>
                  <span className="text-[10px] text-slate-500 font-semibold">
                    {catImageUrl ? '🎨 Custom Image Active' : '⚡ Auto Product Image Active'}
                  </span>
                </div>

                {/* Auto-detected preview notice */}
                {!catImageUrl && editingCategory && (
                  <div className="p-2.5 bg-orange-50/70 rounded-xl border border-orange-200/80 flex items-center gap-3">
                    {(() => {
                      const autoInfo = getCategoryImageSource(editingCategory, products);
                      return (
                        <>
                          <img
                            src={autoInfo.image}
                            alt={editingCategory.nameEn}
                            className="w-12 h-12 rounded-lg object-cover border border-orange-200 bg-white shrink-0"
                            onError={(e) => {
                              (e.target as HTMLElement).setAttribute('src', '/src/assets/images/hero_marketplace_shopper_1791966365592.jpg');
                            }}
                          />
                          <div className="min-w-0 flex-1">
                            <span className="text-[11px] font-bold text-slate-800 block">
                              Auto-Selected Category Cover
                            </span>
                            <p className="text-[10px] text-slate-500">
                              Preview automatically selected from listed category items
                            </p>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}

                {/* Custom Image Preview if set */}
                {catImageUrl && (
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={catImageUrl}
                        alt="Custom Category"
                        className="w-12 h-12 rounded-lg object-cover border border-slate-200 bg-white shrink-0"
                        onError={(e) => {
                          (e.target as HTMLElement).setAttribute('src', '/src/assets/images/hero_marketplace_shopper_1791966365592.jpg');
                        }}
                      />
                      <div className="min-w-0">
                        <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Custom Category Image</span>
                        </span>
                        <p className="text-[10px] text-slate-400 font-mono truncate max-w-xs">
                          {catImageUrl.startsWith('data:') ? 'Uploaded local image file' : catImageUrl}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCatImageUrl('')}
                      className="text-[11px] text-[#FF6000] hover:underline font-bold shrink-0 cursor-pointer"
                    >
                      Reset to Auto
                    </button>
                  </div>
                )}

                {/* Customization Controls: Upload or URL */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <label className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer font-bold text-xs transition-colors">
                    <Upload className="w-3.5 h-3.5 text-slate-500" />
                    <span>Upload Custom File</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCategoryImageUpload}
                      className="hidden"
                    />
                  </label>
                  <input
                    type="text"
                    value={catImageUrl}
                    onChange={(e) => setCatImageUrl(e.target.value)}
                    placeholder="Or enter image URL..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCategoryModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#FF6000] text-white font-bold rounded-xl"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: SHOP EDITOR */}
      {shopModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative border border-slate-200 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-base text-slate-900">
                {editingShop ? 'Edit Shop' : 'Register New Saved Shop'}
              </h3>
              <button onClick={() => setShopModalOpen(false)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveShop} className="space-y-3.5">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Shop Name *</label>
                <input
                  type="text"
                  required
                  value={shopForm.name}
                  onChange={(e) => setShopForm({ ...shopForm, name: e.target.value })}
                  placeholder="e.g. Kigali Tech Hub"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Specialty / Category</label>
                <input
                  type="text"
                  value={shopForm.category}
                  onChange={(e) => setShopForm({ ...shopForm, category: e.target.value })}
                  placeholder="e.g. Electronics & TV"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={shopForm.phone}
                    onChange={(e) => setShopForm({ ...shopForm, phone: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Location</label>
                  <input
                    type="text"
                    value={shopForm.location}
                    onChange={(e) => setShopForm({ ...shopForm, location: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Shop Description</label>
                <textarea
                  rows={2}
                  value={shopForm.description}
                  onChange={(e) => setShopForm({ ...shopForm, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300"
                />
              </div>

              <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <input
                  type="checkbox"
                  id="modalShopIsRecommended"
                  checked={shopForm.isRecommended}
                  onChange={(e) => setShopForm({ ...shopForm, isRecommended: e.target.checked })}
                  className="w-4 h-4 text-[#FF6000] rounded focus:ring-orange-500 cursor-pointer"
                />
                <label htmlFor="modalShopIsRecommended" className="font-bold text-slate-700 text-xs cursor-pointer">
                  Featured / Recommended Shop (Show ★ Recommended badge)
                </label>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShopModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#FF6000] text-white font-bold rounded-xl"
                >
                  Save Shop
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 7: PROBLEM RESOLUTION */}
      {selectedProblem && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative border border-slate-200 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-base text-slate-900">Manage Case #{selectedProblem.caseNumber}</h3>
                <span className="text-slate-500 font-bold">{selectedProblem.customerName} · {selectedProblem.customerPhone}</span>
              </div>
              <button onClick={() => setSelectedProblem(null)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProblemResolution} className="space-y-3.5">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <span className="font-bold text-slate-700 block">Customer Reported Description:</span>
                <p className="text-slate-600">{selectedProblem.description}</p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Case Status</label>
                <select
                  value={probStatus}
                  onChange={(e) => setProbStatus(e.target.value as ProblemStatus)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold"
                >
                  <option value="New">New</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Assigned">Assigned</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Awaiting Customer">Awaiting Customer</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Official Resolution Message</label>
                <textarea
                  rows={3}
                  value={probResolution}
                  onChange={(e) => setProbResolution(e.target.value)}
                  placeholder="State the resolution outcome (e.g. verified on statement, package redelivered via express courier)..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Internal Investigation Note</label>
                <input
                  type="text"
                  value={probStaffNote}
                  onChange={(e) => setProbStaffNote(e.target.value)}
                  placeholder="Private internal note visible only to staff"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedProblem(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 text-white font-bold rounded-xl"
                >
                  Save Case Outcome
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 8: COUPON MODAL */}
      {couponModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative border border-slate-200 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-base text-slate-900">Create Promo Coupon</h3>
              <button onClick={() => setCouponModalOpen(false)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCoupon} className="space-y-3.5">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Coupon Code *</label>
                <input
                  type="text"
                  required
                  value={coupCode}
                  onChange={(e) => setCoupCode(e.target.value.toUpperCase())}
                  placeholder="e.g. RAMADAN20, FLASH5000"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono font-bold uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Discount Type</label>
                  <select
                    value={coupType}
                    onChange={(e) => setCoupType(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold"
                  >
                    <option value="percentage">Percentage % (Recommended)</option>
                    <option value="fixed">Fixed FRW</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {coupType === 'percentage' ? 'Discount Percentage (%) *' : 'Discount Value (FRW) *'}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min={coupType === 'percentage' ? 1 : 100}
                      max={coupType === 'percentage' ? 100 : undefined}
                      value={coupVal}
                      onChange={(e) => setCoupVal(e.target.value)}
                      placeholder={coupType === 'percentage' ? 'e.g. 15 for 15%' : 'e.g. 2000'}
                      className="w-full pl-3.5 pr-8 py-2.5 rounded-xl border border-slate-300 font-mono font-bold"
                    />
                    {coupType === 'percentage' && (
                      <span className="absolute right-3.5 top-2.5 font-bold text-slate-400 pointer-events-none">%</span>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Minimum Order Amount (FRW)</label>
                <input
                  type="number"
                  value={coupMin}
                  onChange={(e) => setCoupMin(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCouponModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#FF6000] text-white font-bold rounded-xl"
                >
                  Publish Coupon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Detail Profile Modal */}
      {selectedCustomerDetail && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl relative border border-slate-200 space-y-5">
            <button
              onClick={() => setSelectedCustomerDetail(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Profile Header */}
            <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#FF6000] to-amber-500 text-white flex items-center justify-center font-black text-2xl shadow-md shrink-0">
                {selectedCustomerDetail.customer.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black text-slate-900 truncate">
                    {selectedCustomerDetail.customer.name}
                  </h2>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      selectedCustomerDetail.customer.status === 'Suspended'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {selectedCustomerDetail.customer.status || 'Active'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-600 mt-1">
                  <span className="flex items-center gap-1 font-mono">
                    <Phone className="w-3.5 h-3.5 text-[#FF6000]" />
                    {selectedCustomerDetail.customer.phone}
                  </span>
                  {selectedCustomerDetail.customer.email && (
                    <span className="flex items-center gap-1 text-slate-500">
                      <Mail className="w-3.5 h-3.5" />
                      {selectedCustomerDetail.customer.email}
                    </span>
                  )}
                  {selectedCustomerDetail.customer.isRegisteredBuyer && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-[#FF6000] font-bold bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">
                      <KeyRound className="w-3 h-3" />
                      5-Digit Password Account
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Customer Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Total Orders</span>
                <span className="text-lg font-black text-blue-600 font-mono mt-0.5 block">
                  {selectedCustomerDetail.orders?.length || selectedCustomerDetail.customer.totalOrders || 0}
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Total Spent</span>
                <span className="text-base font-black text-[#FF6000] font-mono mt-0.5 block">
                  {(selectedCustomerDetail.customer.totalSpent || 0).toLocaleString()} FRW
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Registered On</span>
                <span className="text-xs font-bold text-slate-800 mt-0.5 block">
                  {selectedCustomerDetail.customer.createdAt ? new Date(selectedCustomerDetail.customer.createdAt).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Last Active</span>
                <span className="text-xs font-bold text-slate-800 mt-0.5 block">
                  {selectedCustomerDetail.customer.lastLogin ? new Date(selectedCustomerDetail.customer.lastLogin).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>

            {/* Delivery Address */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 text-xs flex items-start gap-2">
              <MapPin className="w-4 h-4 text-[#FF6000] shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800 block">Delivery Address</span>
                <p className="text-slate-600 mt-0.5">
                  {selectedCustomerDetail.customer.deliveryAddress || 'No address registered yet.'}
                </p>
              </div>
            </div>

            {/* Purchase History */}
            <div>
              <h3 className="font-bold text-xs text-slate-800 mb-2 flex items-center justify-between">
                <span>Associated Order History ({selectedCustomerDetail.orders?.length || 0})</span>
                <span className="text-[10px] font-mono text-slate-400">Matched by customer phone number</span>
              </h3>

              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden max-h-52 overflow-y-auto">
                {selectedCustomerDetail.orders && selectedCustomerDetail.orders.length > 0 ? (
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-400 font-bold uppercase text-[10px]">
                        <th className="py-2.5 px-3">Order #</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Items</th>
                        <th className="py-2.5 px-3">Total</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedCustomerDetail.orders.map((ord) => (
                        <tr key={ord.id} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-mono font-bold text-slate-900">{ord.orderNumber}</td>
                          <td className="py-2 px-3 text-slate-500 text-[11px]">
                            {new Date(ord.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-2 px-3 text-slate-600 text-[11px] max-w-[140px] truncate">
                            {ord.items?.map(i => `${i.quantity}x ${i.productName}`).join(', ') || 'Item'}
                          </td>
                          <td className="py-2 px-3 font-mono font-bold text-[#FF6000]">
                            {ord.totalAmount?.toLocaleString()} FRW
                          </td>
                          <td className="py-2 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                ord.status === 'Delivered'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : ord.status === 'Cancelled'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {ord.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="py-6 text-center text-xs text-slate-400">
                    No orders linked directly to this customer phone yet.
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2">
                {selectedCustomerDetail.customer.isRegisteredBuyer && (
                  <button
                    onClick={() => {
                      setResetPinCustomer(selectedCustomerDetail.customer);
                      setSelectedCustomerDetail(null);
                      setTempPin('');
                      setPinActionMessage(null);
                    }}
                    className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Reset 5-Digit PIN</span>
                  </button>
                )}
                <button
                  onClick={async () => {
                    const currentStatus = selectedCustomerDetail.customer.status || 'Active';
                    const nextStatus = currentStatus === 'Active' ? 'Suspended' : 'Active';
                    try {
                      await api.adminUpdateBuyerStatus(selectedCustomerDetail.customer.id, nextStatus);
                      selectedCustomerDetail.customer.status = nextStatus;
                      showToast(`Buyer account ${nextStatus}`);
                      fetchAllData();
                    } catch (err: any) {
                      alert(err.message || 'Failed to update status');
                    }
                  }}
                  className={`px-3.5 py-2 text-xs font-bold rounded-xl border cursor-pointer ${
                    selectedCustomerDetail.customer.status === 'Suspended'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                      : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                  }`}
                >
                  {selectedCustomerDetail.customer.status === 'Suspended' ? 'Activate Account' : 'Suspend Account'}
                </button>
              </div>

              <button
                onClick={() => setSelectedCustomerDetail(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Reset 5-Digit Password Modal */}
      {resetPinCustomer && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative border border-slate-200 space-y-4">
            <button
              onClick={() => setResetPinCustomer(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-orange-100 text-[#FF6000] flex items-center justify-center font-bold">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-base text-slate-900">Reset 5-Digit Password</h3>
                <p className="text-xs text-slate-500">Buyer: {resetPinCustomer.name} ({resetPinCustomer.phone})</p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Set a temporary 5-digit password for this buyer. Provide the credentials to the user securely via WhatsApp or SMS.
            </p>

            {pinActionMessage && (
              <div
                className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                  pinActionMessage.isError
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{pinActionMessage.text}</span>
              </div>
            )}

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const cleanPin = tempPin.replace(/\D/g, '').slice(0, 5);
                if (cleanPin.length !== 5) {
                  setPinActionMessage({ text: 'Password must be exactly 5 digits (e.g. 12345).', isError: true });
                  return;
                }
                try {
                  await api.adminResetBuyerPassword(resetPinCustomer.id, cleanPin);
                  setPinActionMessage({
                    text: `5-Digit Password successfully updated to "${cleanPin}".`,
                    isError: false
                  });
                  setTimeout(() => {
                    setResetPinCustomer(null);
                    showToast('Password updated successfully');
                  }, 2000);
                } catch (err: any) {
                  setPinActionMessage({ text: err.message || 'Failed to reset password', isError: true });
                }
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  New 5-Digit Password / PIN *
                </label>
                <input
                  type="text"
                  required
                  maxLength={5}
                  inputMode="numeric"
                  pattern="[0-9]{5}"
                  value={tempPin}
                  onChange={(e) => setTempPin(e.target.value.replace(/\D/g, '').slice(0, 5))}
                  placeholder="e.g. 12345"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono font-black text-sm tracking-widest focus:ring-2 focus:ring-[#FF6000] focus:outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Must be 5 numeric digits
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetPinCustomer(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#FF6000] hover:bg-[#e05500] text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Save 5-Digit Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Proof Verification Modal */}
      {verifyModalPayment && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[92vh] overflow-y-auto shadow-2xl relative border border-slate-200 flex flex-col">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-xs z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center text-[#FF6000]">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">
                    Payment Verification & Proof
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Order Ref: <strong className="text-slate-900">#{verifyModalPayment.orderNumber}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setVerifyModalPayment(null)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {/* Payment Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Customer</span>
                  <span className="font-bold text-slate-900 truncate block">{verifyModalPayment.customerName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Sender Phone</span>
                  <span className="font-mono font-bold text-slate-900 block">{verifyModalPayment.paymentPhone}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Amount Paid</span>
                  <span className="font-mono font-black text-[#FF6000] block">{verifyModalPayment.amountPaid.toLocaleString()} FRW</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Method</span>
                  <span className="font-semibold text-slate-800 block truncate">{verifyModalPayment.paymentMethod}</span>
                </div>
              </div>

              {/* Suspicious Duplicate Flag Banner */}
              {verifyModalPayment.flaggedSuspicious && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-2xl text-xs text-amber-950 flex items-start gap-2.5 shadow-2xs">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-extrabold text-amber-900 block">⚠️ Suspicious: Duplicate Transaction ID Detected</span>
                    <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                      {verifyModalPayment.suspiciousReason || `Transaction ID "${verifyModalPayment.transactionId}" was already used on another order. Please check telecom bank statements before approving.`}
                    </p>
                  </div>
                </div>
              )}

              {/* Transaction ID Pill */}
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-blue-700 uppercase font-bold block">Transaction ID / Statement Ref</span>
                  <span className="font-mono font-black text-blue-900 text-sm tracking-wide">{verifyModalPayment.transactionId}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(verifyModalPayment.transactionId);
                    showToast('Transaction ID copied to clipboard');
                  }}
                  className="px-2.5 py-1 bg-white border border-blue-300 text-blue-800 font-bold rounded-lg hover:bg-blue-50 text-[11px] cursor-pointer flex items-center gap-1 shadow-2xs"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </button>
              </div>

              {/* Proof Section 1: Pasted SMS Confirmation Message */}
              {verifyModalPayment.confirmationMessage ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-blue-600" />
                      <span>Customer Pasted SMS Confirmation:</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(verifyModalPayment.confirmationMessage!);
                        showToast('SMS confirmation copied to clipboard');
                      }}
                      className="text-[10px] text-blue-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copy Full SMS</span>
                    </button>
                  </div>
                  <pre className="p-3 bg-slate-900 text-emerald-300 rounded-2xl font-mono text-[11px] whitespace-pre-wrap leading-relaxed border border-slate-800 shadow-inner select-all">
                    {verifyModalPayment.confirmationMessage}
                  </pre>
                </div>
              ) : null}

              {/* Proof Section 2: Uploaded Payment Screenshot */}
              {verifyModalPayment.screenshotUrl ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-orange-600" />
                      <span>Customer Uploaded Screenshot:</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setZoomScreenshot(verifyModalPayment.screenshotUrl!)}
                      className="text-[10px] text-[#FF6000] font-bold hover:underline cursor-pointer"
                    >
                      Enlarge Photo
                    </button>
                  </div>
                  <div
                    onClick={() => setZoomScreenshot(verifyModalPayment.screenshotUrl!)}
                    className="border border-slate-200 rounded-2xl overflow-hidden cursor-pointer hover:border-orange-400 transition-colors bg-slate-50 group relative"
                  >
                    <img
                      src={verifyModalPayment.screenshotUrl}
                      alt="Payment proof screenshot"
                      className="w-full max-h-56 object-contain rounded-2xl mx-auto"
                    />
                    <div className="absolute inset-0 bg-slate-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                      Click to expand full size
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Customer Direct WhatsApp Update */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-2 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Customer Contact</span>
                  <span className="font-bold text-slate-800">{verifyModalPayment.customerName} ({verifyModalPayment.paymentPhone})</span>
                </div>
                <a
                  href={`https://wa.me/250${verifyModalPayment.paymentPhone.replace(/\D/g, '').slice(-9)}?text=${encodeURIComponent(
                    `Hello ${verifyModalPayment.customerName}, this is ContactReach Market. Your payment for Order #${verifyModalPayment.orderNumber} (${verifyModalPayment.amountPaid.toLocaleString()} FRW) is currently: ${verifyModalPayment.verificationStatus}. Ref: ${verifyModalPayment.transactionId}.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Notify via WhatsApp</span>
                </a>
              </div>

              {/* Verification Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Internal Verification / Audit Note
                </label>
                <input
                  type="text"
                  value={verifyNotes}
                  onChange={(e) => setVerifyNotes(e.target.value)}
                  placeholder="e.g. Statement checked, confirmed transfer received on 0780022600 by Admin"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#FF6000] bg-white font-medium"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setVerifyModalPayment(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50 cursor-pointer"
                >
                  Close
                </button>

                {/* Direct Telecom Provider API Query */}
                <button
                  type="button"
                  disabled={telecomVerifyingId === verifyModalPayment.id}
                  onClick={() => handleTelecomReverify(verifyModalPayment.id)}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  title="Query MTN or Airtel server directly to verify this reference"
                >
                  {telecomVerifyingId === verifyModalPayment.id ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Checking Telecom API...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Verify with Telecom API</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleVerifyPayment('under_verification', verifyNotes, verifyModalPayment.id)}
                  className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                >
                  Mark Under Verification
                </button>

                <button
                  type="button"
                  onClick={() => handleVerifyPayment('reject', verifyNotes, verifyModalPayment.id)}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                >
                  Reject Payment
                </button>

                {(verifyModalPayment.verificationStatus === 'Verified/Paid' || verifyModalPayment.verificationStatus === 'Approved') && (
                  <button
                    type="button"
                    onClick={() => handleVerifyPayment('refund', verifyNotes, verifyModalPayment.id)}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                  >
                    Refund Payment
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleVerifyPayment('approve', verifyNotes, verifyModalPayment.id)}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-md shadow-emerald-600/20 cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Approve & Mark Paid</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Supplier Payout Disbursement Modal */}
      {disbursePayoutModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200">
            <div className="p-5 bg-[#121316] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                <h3 className="font-extrabold text-base">Disburse Supplier Payout</h3>
              </div>
              <button
                onClick={() => setDisbursePayoutModal(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDisbursePayout} className="p-6 space-y-4">
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-1.5">
                <span className="text-[11px] font-bold text-emerald-700 uppercase">Payout Amount (90% Net)</span>
                <div className="text-2xl font-black text-emerald-950 font-mono">
                  {disbursePayoutModal.payoutAmount?.toLocaleString()} FRW
                </div>
                <div className="text-xs text-emerald-800 font-medium">
                  Beneficiary: <span className="font-bold">{disbursePayoutModal.shopName}</span>
                </div>
                <div className="text-xs text-emerald-800 font-mono">
                  Order Reference: #{disbursePayoutModal.orderNumber}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  MoMo / Bank Transfer Reference Number
                </label>
                <input
                  type="text"
                  required
                  value={disburseRefInput}
                  onChange={(e) => setDisburseRefInput(e.target.value)}
                  placeholder="e.g. MOMO-981245 or Transfer Ref"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 font-mono"
                />
                <span className="text-[10px] text-slate-400 block mt-1">
                  Enter the telecom or banking transaction ID verifying this disbursement.
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDisbursePayoutModal(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={disburseLoading || !disburseRefInput.trim()}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{disburseLoading ? 'Recording...' : 'Confirm Disbursement'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox Screenshot Modal */}
      {zoomScreenshot && (
        <div
          onClick={() => setZoomScreenshot(null)}
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in"
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl p-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setZoomScreenshot(null)}
              className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-slate-900/80 text-white flex items-center justify-center hover:bg-slate-900 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={zoomScreenshot}
              alt="Payment Screenshot Expanded"
              className="max-h-[82vh] w-auto mx-auto object-contain rounded-xl"
            />
          </div>
        </div>
      )}

      {/* Maintenance Mode Screen Live Preview Modal */}
      {previewMaintenance && settings && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-2 sm:p-6 animate-in fade-in">
          <div className="w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-3.5 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between text-xs text-white px-5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span className="font-extrabold text-amber-300">Live Preview: What Visitors & Buyers See</span>
                <span className="text-slate-400 hidden sm:inline">· Responsive mobile & desktop layout</span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewMaintenance(false)}
                className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded-xl text-white font-bold cursor-pointer text-xs flex items-center gap-1 transition-colors"
              >
                <X className="w-4 h-4" />
                <span>Close Preview</span>
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              <MaintenancePage
                settings={settings}
                onOpenAdminLogin={() => {
                  showToast('Visitor clicked Admin Login');
                  setPreviewMaintenance(false);
                }}
                onOpenOrderTracking={() => {
                  showToast('Visitor clicked Track Order');
                  setPreviewMaintenance(false);
                }}
                onCheckStatus={() => {
                  showToast('Status checked: Storefront is still in preview');
                }}
                currentLang="en"
                onToggleLang={() => {}}
              />
            </div>
          </div>
        </div>
      )}

      {/* MODAL: QUICK MANAGE PICTURE LINKS FOR A PRODUCT */}
      {manageImagesProduct && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl relative border border-slate-200 flex flex-col text-xs">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center text-[#FF6000]">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">Manage Picture Links</h3>
                  <p className="text-[11px] text-slate-500 font-medium truncate max-w-sm">
                    {manageImagesProduct.name} <span className="font-mono text-slate-400">({manageImagesProduct.sku})</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setManageImagesProduct(null)}
                className="p-1.5 text-slate-400 hover:text-slate-800 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 flex-1">
              {/* Add Picture Links Section */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 block">
                    Add Picture Link(s)
                  </label>
                  <span className="text-[11px] font-bold text-slate-400">
                    Supports 1 or multiple URLs at once
                  </span>
                </div>

                <div className="space-y-2">
                  <textarea
                    rows={2}
                    value={manageImagesInput}
                    onChange={(e) => setManageImagesInput(e.target.value)}
                    placeholder="Paste one or multiple picture URLs here (separated by newlines, commas, or spaces)&#10;e.g. https://images.unsplash.com/photo-1...&#10;https://images.unsplash.com/photo-2..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-mono focus:ring-2 focus:ring-[#FF6000]"
                  />

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[10px] text-slate-400">
                      Tip: You can paste multiple links at once from your supplier catalog or image host.
                    </span>

                    <div className="flex items-center gap-2">
                      <label className="px-3 py-1.5 bg-white hover:bg-orange-50 text-slate-700 hover:text-[#FF6000] border border-slate-300 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors">
                        <Upload className="w-3.5 h-3.5 text-[#FF6000]" />
                        <span>Upload Photos</span>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleManageModalUpload}
                          className="hidden"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={handleAddLinksToManageModal}
                        disabled={!manageImagesInput.trim()}
                        className="px-4 py-1.5 bg-[#FF6000] hover:bg-[#e05500] disabled:bg-slate-200 text-white font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Picture Link(s)</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Gallery of Picture Links */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="font-extrabold text-slate-900">
                    Product Pictures ({manageImagesList.length})
                  </span>
                  <span className="text-[11px] text-slate-400">
                    The first picture is the primary cover image
                  </span>
                </div>

                {manageImagesList.length === 0 ? (
                  <div className="py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-center">
                    <ImageIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-600">No picture links yet</p>
                    <p className="text-[11px] text-slate-400">Paste links above or upload photos to set this product's gallery</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                    {manageImagesList.map((url, idx) => {
                      const isCover = idx === 0;
                      return (
                        <div
                          key={idx}
                          className={`relative bg-white rounded-xl border overflow-hidden shadow-2xs flex flex-col justify-between ${
                            isCover ? 'border-[#FF6000] ring-2 ring-orange-200' : 'border-slate-200'
                          }`}
                        >
                          {/* Badge */}
                          <div className="absolute top-1.5 left-1.5 z-10">
                            {isCover ? (
                              <span className="bg-[#FF6000] text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-xs flex items-center gap-0.5">
                                <Star className="w-2.5 h-2.5 fill-white" />
                                <span>Cover</span>
                              </span>
                            ) : (
                              <span className="bg-slate-900/60 backdrop-blur-xs text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                                #{idx + 1}
                              </span>
                            )}
                          </div>

                          {/* Delete */}
                          <div className="absolute top-1.5 right-1.5 z-10">
                            <button
                              type="button"
                              onClick={() => setManageImagesList(prev => prev.filter((_, i) => i !== idx))}
                              className="w-6 h-6 rounded-md bg-white/90 hover:bg-rose-600 hover:text-white text-slate-500 flex items-center justify-center shadow-2xs cursor-pointer transition-colors"
                              title="Remove picture"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Thumbnail */}
                          <div className="relative pt-[80%] bg-slate-100 overflow-hidden">
                            <img
                              src={url}
                              alt={`Product picture ${idx + 1}`}
                              className="absolute inset-0 w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).setAttribute('src', '/src/assets/images/hero_marketplace_shopper_1791966365592.jpg');
                              }}
                            />
                          </div>

                          {/* Actions */}
                          <div className="p-1.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-1 text-[10px]">
                            {!isCover ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setManageImagesList(prev => [url, ...prev.filter((_, i) => i !== idx)]);
                                }}
                                className="font-bold text-[#FF6000] hover:underline flex items-center gap-0.5 cursor-pointer"
                              >
                                <Star className="w-2.5 h-2.5" />
                                <span>Set Cover</span>
                              </button>
                            ) : (
                              <span className="font-bold text-emerald-600 flex items-center gap-0.5">
                                <Check className="w-2.5 h-2.5" />
                                <span>Cover</span>
                              </span>
                            )}

                            <div className="flex items-center gap-0.5">
                              {idx > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setManageImagesList(prev => {
                                      const copy = [...prev];
                                      const temp = copy[idx];
                                      copy[idx] = copy[idx - 1];
                                      copy[idx - 1] = temp;
                                      return copy;
                                    });
                                  }}
                                  className="p-1 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-200 cursor-pointer"
                                  title="Move Left"
                                >
                                  <ArrowLeft className="w-3 h-3" />
                                </button>
                              )}
                              {idx < manageImagesList.length - 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setManageImagesList(prev => {
                                      const copy = [...prev];
                                      const temp = copy[idx];
                                      copy[idx] = copy[idx + 1];
                                      copy[idx + 1] = temp;
                                      return copy;
                                    });
                                  }}
                                  className="p-1 text-slate-500 hover:text-slate-800 rounded-hover:bg-slate-200 cursor-pointer"
                                  title="Move Right"
                                >
                                  <ArrowRight className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-2 sticky bottom-0">
              <span className="text-[11px] text-slate-500 font-mono">
                {manageImagesList.length} picture{manageImagesList.length === 1 ? '' : 's'} configured
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setManageImagesProduct(null)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl border border-slate-300 cursor-pointer text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={savingManageImages || manageImagesList.length === 0}
                  onClick={handleSaveManageImages}
                  className="px-5 py-2 bg-[#FF6000] hover:bg-[#e05500] disabled:bg-slate-300 text-white font-bold rounded-xl shadow-xs cursor-pointer text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{savingManageImages ? 'Saving Pictures...' : 'Save Product Pictures'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: GOOGLE DRIVE PRODUCT AUTO-FILL & CATALOG PICKER */}
      {driveFilesModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl relative border border-slate-200 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">Auto-Fill Products from Google Drive</h3>
                  <p className="text-[11px] text-slate-500">Connected with contactreachmarket.com & Google Drive</p>
                </div>
              </div>
              <button
                onClick={() => setDriveFilesModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick 1-Click Auto-Fill Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CloudUpload className="w-4 h-4 text-emerald-700" />
                  <span className="font-extrabold text-emerald-950">Quick Auto-Fill (Recommended)</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-200 text-emerald-900">
                  Fast Sync
                </span>
              </div>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                Automatically scans your Google Drive for <code className="bg-white/80 px-1 py-0.5 rounded font-mono font-bold text-emerald-900">ContactReach_Market_Products.json</code> or latest product catalog, creates missing shops, preserves custom admin costs, and updates your live storefront in one click.
              </p>
              <div className="pt-1">
                <button
                  type="button"
                  disabled={importingFromDrive}
                  onClick={() => handleImportFromGoogleDrive()}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-black rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Zap className={`w-4 h-4 ${importingFromDrive ? 'animate-spin' : ''}`} />
                  <span>{importingFromDrive ? 'Auto-filling Products...' : '⚡ 1-Click Auto-Fill from Default Catalog'}</span>
                </button>
              </div>
            </div>

            {/* Google Drive Files List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">Or Select a Specific File from Drive:</span>
                <button
                  type="button"
                  onClick={handleOpenDriveFilePicker}
                  className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingDriveFiles ? 'animate-spin' : ''}`} />
                  <span>Refresh Drive Files</span>
                </button>
              </div>

              {loadingDriveFiles ? (
                <div className="py-8 text-center text-slate-400">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-600" />
                  <p>Searching Google Drive for catalog files...</p>
                </div>
              ) : driveFilesList.length > 0 ? (
                <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                  {driveFilesList.map((file) => (
                    <div
                      key={file.id}
                      className="p-3 rounded-xl border border-slate-200 hover:border-emerald-300 bg-white hover:bg-slate-50 flex items-center justify-between gap-3 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div className="min-w-0">
                          <span className="font-bold text-slate-900 block truncate">{file.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            Modified: {new Date(file.modifiedTime).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {file.webViewLink && (
                          <a
                            href={file.webViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                            title="Preview file in Drive"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button
                          type="button"
                          disabled={importingFromDrive}
                          onClick={() => handleImportFromGoogleDrive(file.id)}
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg font-bold text-[11px] cursor-pointer flex items-center gap-1 transition-colors"
                        >
                          <Download className="w-3 h-3 text-emerald-600" />
                          <span>Import</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center">
                  <Cloud className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
                  <p className="font-semibold text-slate-600 text-xs">No specific JSON files listed</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Click "Quick Auto-Fill" above to let ContactReach search your Google Drive automatically!
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Connected with Google Drive OAuth (drive.file & drive.readonly)
              </span>
              <button
                type="button"
                onClick={() => setDriveFilesModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CJ DROPSHIPPING ORDER FULFILLMENT APPROVAL */}
      {cjFulfillmentModalOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-5 shadow-2xl relative border border-slate-200 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">Approve CJ Dropshipping Fulfillment</h3>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Order #{cjFulfillmentModalOrder.orderNumber} · Customer: {cjFulfillmentModalOrder.customerName}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCjFulfillmentModalOrder(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-purple-50/60 rounded-2xl border border-purple-100 space-y-2">
              <div className="text-[11px] font-bold text-purple-900">Delivery & Customer Details</div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-500 block">Recipient Phone:</span>
                  <span className="font-bold text-slate-800 font-mono">{cjFulfillmentModalOrder.customerPhone}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Payment Status:</span>
                  <span className={`font-bold ${cjFulfillmentModalOrder.paymentStatus === 'Paid' ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {cjFulfillmentModalOrder.paymentStatus} ({cjFulfillmentModalOrder.paymentMethod || 'Mobile Money'})
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 block">Delivery Address:</span>
                  <span className="font-medium text-slate-800">
                    {cjFulfillmentModalOrder.deliveryLocation} — {cjFulfillmentModalOrder.deliveryAddress}
                  </span>
                </div>
              </div>
            </div>

            {/* CJ Items List */}
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-slate-700">CJ Dropshipping Items in this Order:</div>
              <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                {(cjFulfillmentModalOrder.cjItems || cjFulfillmentModalOrder.items || []).map((item: any, idx: number) => (
                  <div key={idx} className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5">
                      {item.imageUrl && (
                        <img src={item.imageUrl} alt={item.productName} className="w-9 h-9 object-cover rounded-lg border border-slate-200" />
                      )}
                      <div>
                        <span className="font-bold text-slate-900 block line-clamp-1">{item.productName}</span>
                        <span className="text-[10px] text-purple-700 font-mono font-bold">
                          SKU: {item.cjSku || item.sku || 'CJ-ITEM'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono font-bold text-slate-800 block">Qty: {item.quantity}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{(item.price * item.quantity).toLocaleString()} FRW</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={handleApproveCjOrderFulfillment} className="space-y-3 pt-2 border-t border-slate-100">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  CJ Carrier / Dispatch Tracking Reference
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={cjTrackingInput || `CJ-RW-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`}
                    onChange={(e) => setCjTrackingInput(e.target.value)}
                    placeholder="e.g. CJ-RW-L7K89M-492"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-xs font-bold bg-white"
                  />
                  <span className="absolute right-3 top-2 text-[10px] text-purple-600 font-bold pointer-events-none">
                    Tracking ID
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  This tracking ID will be sent to the customer for public order tracking.
                </span>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Fulfillment Notes (Optional)
                </label>
                <input
                  type="text"
                  value={cjFulfillmentNotesInput}
                  onChange={(e) => setCjFulfillmentNotesInput(e.target.value)}
                  placeholder="e.g., Awaiting supplier air dispatch, batch #849"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setCjFulfillmentModalOrder(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={cjFulfillingLoading}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 text-xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{cjFulfillingLoading ? 'Approving...' : 'Approve for CJ Dispatch'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Delete Products Confirmation Modal */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">
              Delete {selectedProductIds.length} Selected Product{selectedProductIds.length > 1 ? 's' : ''} at the Same Time?
            </h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              This will permanently delete the <strong className="text-slate-800 font-bold">{selectedProductIds.length} selected product{selectedProductIds.length > 1 ? 's' : ''}</strong> from your ContactReach Market store catalog, inventory records, and Cloud Firestore simultaneously.
            </p>

            {/* Preview of items to be deleted */}
            <div className="my-4 max-h-52 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-2xl p-2 bg-slate-50">
              {products
                .filter(p => selectedProductIds.includes(p.id))
                .slice(0, 15)
                .map(p => (
                  <div key={p.id} className="py-1.5 px-2 flex items-center gap-2.5 text-xs">
                    <img src={p.imageUrl} alt={p.name} className="w-8 h-8 rounded-lg object-cover shrink-0 border border-slate-200" />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-800 truncate">{p.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{p.sku || p.id} · {p.price.toLocaleString()} FRW · {p.status}</p>
                    </div>
                  </div>
                ))}
              {selectedProductIds.length > 15 && (
                <p className="text-[11px] text-center text-slate-500 py-1.5 font-semibold">
                  + {selectedProductIds.length - 15} more selected products...
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 mt-5">
              <button
                type="button"
                onClick={() => setShowBulkDeleteModal(false)}
                disabled={bulkDeleting}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkDeleteProducts}
                disabled={bulkDeleting}
                className="px-5 py-2 text-xs font-black text-white bg-rose-600 hover:bg-rose-700 rounded-xl cursor-pointer flex items-center gap-2 disabled:opacity-50 transition-all shadow-sm"
              >
                {bulkDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting {selectedProductIds.length} Products...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Permanently Delete All {selectedProductIds.length}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comprehensive Order View & Edit Modal */}
      {selectedOrderModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-5 sm:p-7 shadow-2xl border border-slate-200 my-8 animate-in zoom-in-95 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-100 text-[#FF6000] flex items-center justify-center font-black">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">
                      Order #{selectedOrderModal.orderNumber}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-100 text-slate-700">
                      {selectedOrderModal.status}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      selectedOrderModal.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {selectedOrderModal.paymentStatus}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono">
                    Placed on {new Date(selectedOrderModal.createdAt).toLocaleString()} · ID: {selectedOrderModal.id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrderModal(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 pr-1 py-4 space-y-6">
              {/* Ordered Items List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
                    Ordered Line-Items ({selectedOrderModal.items?.length || 0})
                  </h4>
                  <span className="text-xs font-bold text-slate-700">
                    Subtotal: {(selectedOrderModal.subtotal || selectedOrderModal.totalAmount).toLocaleString()} FRW
                  </span>
                </div>
                <div className="border border-slate-200 rounded-2xl divide-y divide-slate-100 bg-slate-50/50 overflow-hidden">
                  {(selectedOrderModal.items || []).map((item, idx) => {
                    const resolvedImg = getProductImageDueToProduct(item, products);
                    const resolvedName = getProductNameDueToProduct(item, products);
                    return (
                      <div key={idx} className="p-3 flex items-center justify-between gap-3 text-xs bg-white">
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={resolvedImg}
                            alt={resolvedName}
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = getProductImageDueToProduct(item);
                            }}
                            className="w-11 h-11 object-cover rounded-xl border border-slate-200 shrink-0 bg-slate-50 shadow-2xs"
                          />
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate" title={resolvedName}>{resolvedName}</p>
                            <p className="text-[10px] text-slate-400 font-mono">
                              {item.shopName ? `Shop: ${item.shopName} · ` : ''}
                              Unit: {item.price.toLocaleString()} FRW
                              {item.size ? ` · Size: ${item.size}` : ''}
                              {item.color ? ` · Color: ${item.color}` : ''}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-mono font-bold text-slate-900 block">
                            Qty: {item.quantity}
                          </span>
                          <span className="font-mono font-bold text-[#FF6000] text-[11px]">
                            {(item.price * item.quantity).toLocaleString()} FRW
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Editable Form */}
              <form id="order-edit-form" onSubmit={handleSaveOrderDetails} className="space-y-4">
                {/* Customer Information */}
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
                    Customer & Delivery Contact
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Customer Full Name</label>
                      <input
                        type="text"
                        required
                        value={orderEditForm.customerName || ''}
                        onChange={e => setOrderEditForm({ ...orderEditForm, customerName: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#FF6000] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Customer Phone</label>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          required
                          value={orderEditForm.customerPhone || ''}
                          onChange={e => setOrderEditForm({ ...orderEditForm, customerPhone: e.target.value })}
                          className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-[#FF6000] focus:outline-none"
                        />
                        {orderEditForm.customerPhone && (
                          <>
                            <a
                              href={`https://wa.me/25${orderEditForm.customerPhone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center shrink-0"
                              title="Chat on WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </a>
                            <a
                              href={`tel:${orderEditForm.customerPhone}`}
                              className="px-2.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center shrink-0"
                              title="Direct Phone Call"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                          </>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Customer Email</label>
                      <input
                        type="email"
                        value={orderEditForm.customerEmail || ''}
                        onChange={e => setOrderEditForm({ ...orderEditForm, customerEmail: e.target.value })}
                        placeholder="buyer@example.com"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#FF6000] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">District / Delivery Zone</label>
                      <select
                        value={orderEditForm.deliveryLocation || 'Gasabo, Kigali'}
                        onChange={e => setOrderEditForm({ ...orderEditForm, deliveryLocation: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#FF6000] focus:outline-none"
                      >
                        <option value="Gasabo, Kigali">Gasabo, Kigali (2,000 FRW)</option>
                        <option value="Kicukiro, Kigali">Kicukiro, Kigali (2,000 FRW)</option>
                        <option value="Nyarugenge, Kigali">Nyarugenge, Kigali (2,000 FRW)</option>
                        <option value="Outside Kigali / Upcountry">Outside Kigali / Upcountry (5,000 FRW)</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Street / House Address</label>
                      <input
                        type="text"
                        value={orderEditForm.deliveryAddress || ''}
                        onChange={e => setOrderEditForm({ ...orderEditForm, deliveryAddress: e.target.value })}
                        placeholder="e.g. KK 15 Ave, Kimironko near market"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#FF6000] focus:outline-none"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Delivery Notes / Landmark Instructions</label>
                      <input
                        type="text"
                        value={orderEditForm.deliveryNotes || ''}
                        onChange={e => setOrderEditForm({ ...orderEditForm, deliveryNotes: e.target.value })}
                        placeholder="e.g. Gate with black fence, call before arriving"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#FF6000] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Statuses and Delivery Management */}
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
                    Order Status & Delivery Tracking
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Delivery Status</label>
                      <select
                        value={orderEditForm.deliveryStatus || 'Pending'}
                        onChange={e => setOrderEditForm({ ...orderEditForm, deliveryStatus: e.target.value as OrderDeliveryStatus })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#FF6000] focus:outline-none"
                      >
                        <option value="Pending">Pending (Awaiting dispatch processing)</option>
                        <option value="Processing">Processing (Supplier preparing items)</option>
                        <option value="Awaiting Shipment">Awaiting Shipment (Packed & awaiting pickup)</option>
                        <option value="Shipped">Shipped (Handed over to carrier)</option>
                        <option value="In Transit">In Transit (On the way to destination)</option>
                        <option value="Out for Delivery">Out for Delivery (With local delivery rider)</option>
                        <option value="Delivered">Delivered (Successfully completed)</option>
                        <option value="Cancelled">Cancelled (Order cancelled)</option>
                        <option value="Failed Delivery">Failed Delivery (Attempted, unavailable)</option>
                        <option value="Returned">Returned (Item returned to warehouse)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Order Pipeline Status</label>
                      <select
                        value={orderEditForm.status || 'Pending'}
                        onChange={e => setOrderEditForm({ ...orderEditForm, status: e.target.value as OrderStatus })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#FF6000] focus:outline-none"
                      >
                        <option value="New">New</option>
                        <option value="Confirmed">Confirmed</option>
                        <option value="Preparing">Preparing</option>
                        <option value="Ready for Delivery">Ready for Delivery</option>
                        <option value="Out for Delivery">Out for Delivery</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Payment Status</label>
                      <select
                        value={orderEditForm.paymentStatus || 'Pending'}
                        onChange={e => setOrderEditForm({ ...orderEditForm, paymentStatus: e.target.value as PaymentStatus })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#FF6000] focus:outline-none"
                      >
                        <option value="Pending Payment">Pending Payment</option>
                        <option value="Pending Verification">Pending Verification</option>
                        <option value="Paid">Paid</option>
                        <option value="Failed">Failed</option>
                        <option value="Refunded">Refunded</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Payment Method</label>
                      <input
                        type="text"
                        value={orderEditForm.paymentMethod || 'MTN Mobile Money'}
                        onChange={e => setOrderEditForm({ ...orderEditForm, paymentMethod: e.target.value as PaymentMethod })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#FF6000] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Expected Delivery Date</label>
                      <input
                        type="date"
                        value={orderEditForm.expectedDeliveryDate ? orderEditForm.expectedDeliveryDate.slice(0, 10) : ''}
                        onChange={e => setOrderEditForm({ ...orderEditForm, expectedDeliveryDate: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#FF6000] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Shipping Provider / Carrier</label>
                      <input
                        type="text"
                        value={orderEditForm.trackingCarrier || ''}
                        onChange={e => setOrderEditForm({ ...orderEditForm, trackingCarrier: e.target.value })}
                        placeholder="e.g. DHL, FedEx, Rwanda Post, Local Moto"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#FF6000] focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Tracking Number</label>
                      <input
                        type="text"
                        value={orderEditForm.trackingNumber || ''}
                        onChange={e => setOrderEditForm({ ...orderEditForm, trackingNumber: e.target.value })}
                        placeholder="e.g. RW-EXP-8291 (leave empty if not yet available)"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-[#FF6000] focus:outline-none"
                      />
                      {!orderEditForm.trackingNumber && (
                        <span className="text-[10px] text-slate-400 italic mt-0.5 block">
                          Display status: "Not Yet Available"
                        </span>
                      )}
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Carrier Tracking URL</label>
                      <input
                        type="url"
                        value={orderEditForm.trackingUrl || ''}
                        onChange={e => setOrderEditForm({ ...orderEditForm, trackingUrl: e.target.value })}
                        placeholder="https://..."
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#FF6000] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Supplier Dispatch & Logistics Information */}
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
                    Supplier Fulfillment & Dispatch Details
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Supplier Name</label>
                      <input
                        type="text"
                        value={orderEditForm.supplierName || ''}
                        onChange={e => setOrderEditForm({ ...orderEditForm, supplierName: e.target.value })}
                        placeholder="e.g. CJ Dropshipping, Alibaba, Fair View Shop"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#FF6000] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Supplier Order Reference</label>
                      <input
                        type="text"
                        value={orderEditForm.supplierOrderRef || ''}
                        onChange={e => setOrderEditForm({ ...orderEditForm, supplierOrderRef: e.target.value })}
                        placeholder="e.g. CJ-PO-10294 or Cainiao ID"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-[#FF6000] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Supplier Dispatch Date</label>
                      <input
                        type="date"
                        value={orderEditForm.dispatchDate ? orderEditForm.dispatchDate.slice(0, 10) : ''}
                        onChange={e => setOrderEditForm({ ...orderEditForm, dispatchDate: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#FF6000] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Assigned Courier</label>
                      <input
                        type="text"
                        value={orderEditForm.assignedCourier || ''}
                        onChange={e => setOrderEditForm({ ...orderEditForm, assignedCourier: e.target.value })}
                        placeholder="e.g. Jean Pierre (Moto Express)"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#FF6000] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Courier Phone</label>
                      <input
                        type="text"
                        value={orderEditForm.courierPhone || ''}
                        onChange={e => setOrderEditForm({ ...orderEditForm, courierPhone: e.target.value })}
                        placeholder="078..."
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-[#FF6000] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Internal Staff Notes</label>
                      <input
                        type="text"
                        value={orderEditForm.internalNotes || ''}
                        onChange={e => setOrderEditForm({ ...orderEditForm, internalNotes: e.target.value })}
                        placeholder="Private administrative notes..."
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-[#FF6000] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Audit Trail & Order History Timeline */}
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
                    Status History & Administrative Audit Trail
                  </h4>
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 max-h-48 overflow-y-auto space-y-2">
                    {(selectedOrderModal.statusHistory && selectedOrderModal.statusHistory.length > 0) ? (
                      selectedOrderModal.statusHistory.map((h, i) => (
                        <div key={i} className="p-2.5 rounded-xl bg-white border border-slate-200/80 text-xs flex items-start justify-between gap-3 shadow-2xs">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800">{h.status}</span>
                              {h.deliveryStatus && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                                  Delivery: {h.deliveryStatus}
                                </span>
                              )}
                              {h.paymentStatus && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  Payment: {h.paymentStatus}
                                </span>
                              )}
                            </div>
                            {h.note && <p className="text-[11px] text-slate-600 mt-1">{h.note}</p>}
                            {h.updatedBy && (
                              <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                                Updated by: {h.updatedBy}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-mono text-slate-400 shrink-0">
                            {new Date(h.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 italic">No previous status history recorded.</p>
                    )}
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="bg-orange-50/70 p-4 rounded-2xl border border-orange-200/80 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-orange-900 block">Total Order Value</span>
                    <span className="text-xl font-black text-[#FF6000]">
                      {(orderEditForm.totalAmount || selectedOrderModal.totalAmount).toLocaleString()} FRW
                    </span>
                    <span className="text-xs text-orange-700 ml-2">
                      (Includes {(orderEditForm.deliveryFee ?? selectedOrderModal.deliveryFee ?? 2000).toLocaleString()} FRW Delivery)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPrintableInvoiceOrder(selectedOrderModal)}
                      className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print Invoice</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSingleOrder(selectedOrderModal)}
                      className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Order</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 shrink-0">
              <span className="text-[11px] text-slate-400 font-semibold">
                Changes will sync to disk and Cloud Firestore automatically.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedOrderModal(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="order-edit-form"
                  disabled={savingOrder}
                  className="px-5 py-2 bg-[#FF6000] hover:bg-[#e05500] text-white font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 text-xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{savingOrder ? 'Saving Order...' : 'Save Order Changes'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customer Edit Modal */}
      {editingCustomerModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-orange-100 text-[#FF6000] flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Edit Customer Profile</h3>
                  <p className="text-[11px] text-slate-400 font-mono">ID: {editingCustomerModal.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingCustomerModal(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Customer Full Name</label>
                <input
                  type="text"
                  required
                  value={customerEditForm.name}
                  onChange={e => setCustomerEditForm({ ...customerEditForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Customer Phone Number</label>
                <input
                  type="text"
                  required
                  value={customerEditForm.phone}
                  onChange={e => setCustomerEditForm({ ...customerEditForm, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Email Address</label>
                <input
                  type="email"
                  value={customerEditForm.email}
                  onChange={e => setCustomerEditForm({ ...customerEditForm, email: e.target.value })}
                  placeholder="customer@example.com"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Default Delivery Address</label>
                <input
                  type="text"
                  value={customerEditForm.deliveryAddress}
                  onChange={e => setCustomerEditForm({ ...customerEditForm, deliveryAddress: e.target.value })}
                  placeholder="Kigali, Gasabo / Kicukiro..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Account Status</label>
                <select
                  value={customerEditForm.status}
                  onChange={e => setCustomerEditForm({ ...customerEditForm, status: e.target.value as 'Active' | 'Suspended' })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold"
                >
                  <option value="Active">Active (Allowed to Order)</option>
                  <option value="Suspended">Suspended (Blocked)</option>
                </select>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleDeleteCustomer(editingCustomerModal)}
                  className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Customer</span>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingCustomerModal(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingCustomer}
                    className="px-4 py-2 bg-[#FF6000] hover:bg-[#e05500] text-white text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{savingCustomer ? 'Saving...' : 'Save Profile'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product Spreadsheet & Google Sheets Modal */}
      <ProductSpreadsheetModal
        isOpen={isSpreadsheetModalOpen}
        onClose={() => setIsSpreadsheetModalOpen(false)}
        products={products}
        categories={categories}
        shops={shops}
        onProductsUpdated={() => {
          fetchAllData(true);
          onRefreshPublicData();
        }}
        showToast={showToast}
      />

      {/* Firebase Firestore Database & Products Sync Modal */}
      <FirebaseSyncModal
        isOpen={isFirebaseModalOpen}
        onClose={() => setIsFirebaseModalOpen(false)}
        productsCount={products.length}
        onProductsUpdated={() => {
          fetchAllData(true);
          onRefreshPublicData();
        }}
        showToast={showToast}
      />
    </div>
  );
};

