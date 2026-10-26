import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  LayoutDashboard, Package, FolderTree, Store, ShoppingBag, CreditCard,
  Layers, Users, Mail, AlertTriangle, Tag, FileText, Settings, Shield,
  LogOut, Search, Plus, Edit, Trash2, Copy, Check, X, Eye, Phone,
  MapPin, Truck, RefreshCw, Filter, ArrowUpRight, CheckCircle2, XCircle,
  AlertCircle, Clock, ChevronDown, Download, Printer, ShieldCheck,
  Send, Calendar, DollarSign, Archive, ExternalLink, Upload, Percent,
  KeyRound, Lock, Image as ImageIcon, MessageCircle, Wrench, Power,
  Star, ArrowLeft, ArrowRight, Camera, Zap, Cloud, CloudUpload, Globe, Sliders,
  Youtube, FileSpreadsheet
} from 'lucide-react';
import {
  Product, Order, PaymentConfirmation, AppSettings, OrderStatus, Category,
  PaymentStatus, PaymentMethod, ProductStatus, VendorShop, AdminMessage,
  CustomerProblemReport, Coupon, InventoryLog, AuditLog, CustomerUser,
  AdminUser, AdminRole, PaymentMethodConfig, ProductVariation, ProblemStatus, ProblemPriority,
  CjDropshippingConfig, GoogleDriveBackupStatus
} from '../types.ts';
import { api, getStoredAdminUser } from '../services/api.ts';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, getGoogleAccessToken, loginWithGoogle, syncProductsToGoogleDrive, importProductsFromGoogleDrive } from '../services/firebase.ts';
import { getCategoryCoverImage, getCategoryImageSource } from '../utils/categoryImage.ts';
import { getYouTubeVideoId, getYouTubeThumbnailUrl, isValidYouTubeUrl } from '../utils/youtube.ts';
import { MaintenancePage } from './MaintenancePage.tsx';
import { ProductSpreadsheetModal } from './ProductSpreadsheetModal.tsx';
import { exportProductsToExcel, exportProductsToCsv } from '../utils/spreadsheet.ts';

interface AdminDashboardProps {
  onLogout: () => void;
  categories: Category[];
  onRefreshPublicData: () => void;
}

type TabType =
  | 'overview'
  | 'products'
  | 'categories'
  | 'shops'
  | 'suppliers'
  | 'payouts'
  | 'orders'
  | 'payments'
  | 'inventory'
  | 'customers'
  | 'messages'
  | 'problems'
  | 'coupons'
  | 'audit'
  | 'team'
  | 'settings'
  | 'cjdropshipping';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onLogout,
  categories: initialPropCategories,
  onRefreshPublicData
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(getStoredAdminUser());
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());

  // Toast feedback
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

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
  const [orders, setOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<PaymentConfirmation[]>([]);
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

  // Filters
  const [productSearch, setProductSearch] = useState('');
  const [productCatFilter, setProductCatFilter] = useState('all');
  const [productShopFilter, setProductShopFilter] = useState('all');
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [orderPaymentFilter, setOrderPaymentFilter] = useState('all');

  // Modals & Selected items
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderStatusModal, setOrderStatusModal] = useState<Order | null>(null);
  const [verifyModalPayment, setVerifyModalPayment] = useState<PaymentConfirmation | null>(null);
  const [verifyNotes, setVerifyNotes] = useState('Verified with MTN/Airtel MoMo statement');
  const [zoomScreenshot, setZoomScreenshot] = useState<string | null>(null);
  const [printableInvoiceOrder, setPrintableInvoiceOrder] = useState<Order | null>(null);

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
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [prodForm, setProdForm] = useState<{
    name: string;
    sku: string;
    description: string;
    price: number | string;
    costPrice: number | string; // Product / Supplier Cost in RWF
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
    videoUrl: string; // YouTube video link or Shorts description
  }>({
    name: '',
    sku: '',
    description: '',
    price: 15000,
    costPrice: '',
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
    videoUrl: ''
  });

  // Multiple Picture Links helper state for Product Modal
  const [newImageLink, setNewImageLink] = useState('');
  const [showBulkImagePaste, setShowBulkImagePaste] = useState(false);

  // CJ Dropshipping state
  const [cjConfig, setCjConfig] = useState<CjDropshippingConfig | null>(null);
  const [cjSyncing, setCjSyncing] = useState(false);
  const [cjTesting, setCjTesting] = useState(false);
  const [cjApiKeyInput, setCjApiKeyInput] = useState('');
  const [cjEmailInput, setCjEmailInput] = useState('');
  const [cjUsdRateInput, setCjUsdRateInput] = useState(1420);
  const [cjMarkupInput, setCjMarkupInput] = useState(35);
  const [cjAutoUploadToggle, setCjAutoUploadToggle] = useState(false);
  const [cjAutoPublishToggle, setCjAutoPublishToggle] = useState(true);
  const [cjRequireApprovalToggle, setCjRequireApprovalToggle] = useState(true);
  const [cjSelectedCategories, setCjSelectedCategories] = useState<string[]>([
    'electronics', 'fashion', 'amatara', 'hair-beauty', 'amasaha', 'ibikapu', 'sports'
  ]);
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

  const handleManageModalUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const fileList = Array.from(files);
    const validFiles = fileList.filter(f => f.size <= 5 * 1024 * 1024);
    if (validFiles.length < fileList.length) {
      showToast('Some files exceeded the 5MB limit and were skipped.', 'error');
    }
    if (validFiles.length === 0) return;

    let loadedCount = 0;
    const uploaded: string[] = [];
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        uploaded.push(reader.result as string);
        loadedCount++;
        if (loadedCount === validFiles.length) {
          setManageImagesList(prev => [...prev, ...uploaded.filter(u => !prev.includes(u))]);
          showToast(`Uploaded ${uploaded.length} picture${uploaded.length > 1 ? 's' : ''}!`);
        }
      };
      reader.readAsDataURL(file);
    });
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

  // Load All Admin Data (supports silent background real-time updates)
  const fetchAllData = async (silent: boolean = false) => {
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
      if (fetchedOrders) setOrders(fetchedOrders);
      if (fetchedProducts) setProducts(fetchedProducts);
      if (fetchedCategories) setCategories(fetchedCategories);
      if (fetchedShops) setShops(fetchedShops);
      if (fetchedPayments) setPayments(fetchedPayments);
      if (fetchedMessages) setMessages(fetchedMessages);
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
        setCjEmailInput(prev => prev || fetchedCjConfig.email || '');
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
      setLastSyncTime(new Date());
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Real-time synchronization: Firestore snapshot listeners + silent interval polling
  useEffect(() => {
    // Initial fetch
    fetchAllData(false);

    // Background interval sync every 4 seconds to guarantee freshness across all 14 panels
    const syncInterval = setInterval(() => {
      fetchAllData(true);
    }, 4000);

    // Live Firestore onSnapshot listeners for instant push updates
    const unsubs: (() => void)[] = [];
    try {
      // 1. Orders
      const unsubOrders = onSnapshot(collection(db, 'orders'), (snapshot) => {
        if (!snapshot.empty) {
          const liveOrders: Order[] = [];
          snapshot.forEach(docSnap => {
            liveOrders.push({ ...(docSnap.data() as Order), id: docSnap.id });
          });
          setOrders(liveOrders);
          setLastSyncTime(new Date());
        }
      }, (err) => {
        console.warn('[Firestore] Live orders subscription notice:', err.message);
      });
      unsubs.push(unsubOrders);

      // 2. Payments
      const unsubPayments = onSnapshot(collection(db, 'paymentConfirmations'), (snapshot) => {
        if (!snapshot.empty) {
          const livePayments: PaymentConfirmation[] = [];
          snapshot.forEach(docSnap => {
            livePayments.push({ ...(docSnap.data() as PaymentConfirmation), id: docSnap.id });
          });
          setPayments(livePayments);
          setLastSyncTime(new Date());
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
          setSupplierApplications(liveApps);
          setLastSyncTime(new Date());
        }
      }, (err) => {
        console.warn('[Firestore] Live suppliers subscription notice:', err.message);
      });
      unsubs.push(unsubSuppliers);

      // 4. Messages
      const unsubMessages = onSnapshot(collection(db, 'messages'), (snapshot) => {
        if (!snapshot.empty) {
          const liveMsgs: AdminMessage[] = [];
          snapshot.forEach(docSnap => {
            liveMsgs.push({ ...(docSnap.data() as AdminMessage), id: docSnap.id });
          });
          setMessages(liveMsgs);
          setLastSyncTime(new Date());
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
          setProblems(liveProblems);
          setLastSyncTime(new Date());
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
        }
      }, (err) => {
        console.warn('[Firestore] Live audit logs subscription notice:', err.message);
      });
      unsubs.push(unsubAudit);
    } catch (e) {
      console.warn('[Firestore] Realtime subscription init error:', e);
    }

    return () => {
      clearInterval(syncInterval);
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

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchStatus = orderStatusFilter === 'all' || o.status === orderStatusFilter;
      const matchPay = orderPaymentFilter === 'all' || o.paymentStatus === orderPaymentFilter;
      const q = orderSearch.toLowerCase().trim();
      const matchQ = !q ||
        o.orderNumber.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.customerPhone.toLowerCase().includes(q);
      return matchStatus && matchPay && matchQ;
    });
  }, [orders, orderStatusFilter, orderPaymentFilter, orderSearch]);

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
      videoUrl: ''
    });
    setNewImageLink('');
    setShowBulkImagePaste(false);
    setBulkImageInput('');
    setProductModalOpen(true);
  };

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
      videoUrl: p.videoUrl || ''
    });
    setNewImageLink('');
    setShowBulkImagePaste(false);
    setBulkImageInput('');
    setProductModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodForm.name.trim() || !prodForm.category || !prodForm.description.trim()) {
      showToast('Please fill all required product fields.', 'error');
      return;
    }

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
      description: prodForm.description.trim(),
      price: finalPrice,
      costPrice: prodForm.costPrice !== '' && !isNaN(Number(prodForm.costPrice)) ? Math.max(0, Number(prodForm.costPrice)) : undefined,
      costOverriddenByAdmin: prodForm.costPrice !== '' ? true : (editingProduct?.costOverriddenByAdmin ?? false),
      discountPercent: numPercent,
      discountPrice: finalDiscountPrice,
      category: prodForm.category,
      subcategory: prodForm.subcategory.trim() || undefined,
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
      isFeatured: prodForm.isFeatured,
      isNewArrival: prodForm.isNewArrival,
      isBestSeller: prodForm.isBestSeller,
      variations: variations.length > 0 ? variations : undefined,
      videoUrl: prodForm.videoUrl.trim() || undefined
    };

    try {
      if (editingProduct) {
        await api.adminUpdateProduct(editingProduct.id, payload);
        showToast('Product updated successfully!');
      } else {
        await api.adminAddProduct(payload);
        showToast('Product created and published!');
      }
      setProductModalOpen(false);
      fetchAllData();
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

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this product?')) return;
    try {
      await api.adminDeleteProduct(id);
      showToast('Product removed.');
      fetchAllData();
      onRefreshPublicData();
    } catch (err: any) {
      showToast(err.message, 'error');
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

  // CJ Dropshipping Handlers
  const handleSaveCjConfig = async () => {
    setSavingCjConfig(true);
    try {
      const updated = await api.adminUpdateCjConfig({
        apiKey: cjApiKeyInput.trim(),
        email: cjEmailInput.trim(),
        autoUploadEnabled: cjAutoUploadToggle,
        autoPublish: cjAutoPublishToggle,
        requireAdminApproval: cjRequireApprovalToggle,
        usdToRwfRate: Number(cjUsdRateInput) || 1420,
        defaultMarkupPercent: Number(cjMarkupInput) || 35,
        selectedCategories: cjSelectedCategories
      });
      setCjConfig(updated);
      showToast('CJ Dropshipping settings saved successfully!');
    } catch (err: any) {
      showToast(err.message || 'Failed to save CJ configuration', 'error');
    } finally {
      setSavingCjConfig(false);
    }
  };

  const handleTestCjConnection = async () => {
    setCjTesting(true);
    try {
      const res = await api.adminTestCjConnection(cjApiKeyInput.trim(), cjEmailInput.trim());
      showToast(res.message, res.success ? 'success' : 'error');
    } catch (err: any) {
      showToast(err.message || 'Connection test failed', 'error');
    } finally {
      setCjTesting(false);
    }
  };

  const handleSyncCjNow = async (categoryFilter?: string) => {
    setCjSyncing(true);
    try {
      const res = await api.adminSyncCjProductsNow(categoryFilter);
      showToast(res.message);
      fetchAllData();
      onRefreshPublicData();
    } catch (err: any) {
      showToast(err.message || 'CJ automated upload failed', 'error');
    } finally {
      setCjSyncing(false);
    }
  };

  // Search products across CJ Supplier catalog
  const handleSearchCjProducts = async () => {
    setCjSearching(true);
    try {
      const res = await api.adminSearchCjProducts({
        query: cjSearchQuery.trim() || undefined,
        category: cjSearchCategory !== 'all' ? cjSearchCategory : undefined
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
      fetchAllData();
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
        const authRes = await loginWithGoogle();
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
      showToast(err.message || 'Failed to backup to Google Drive', 'error');
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
        const authRes = await loginWithGoogle();
        token = authRes.accessToken || getGoogleAccessToken();
      }

      if (!token) {
        throw new Error('Please authorize Google Drive access to auto-fill products.');
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
      showToast(err.message || 'Failed to auto-fill products from Google Drive', 'error');
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
        const authRes = await loginWithGoogle();
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

  // Image Upload Handlers (FileReader -> base64 Data URL) - supports single or multiple file selection
  const handleProductImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    const validFiles = fileList.filter(f => f.size <= 5 * 1024 * 1024);
    if (validFiles.length < fileList.length) {
      showToast('Some files exceeded the 5MB limit and were skipped.', 'error');
    }
    if (validFiles.length === 0) return;

    let loadedCount = 0;
    const newBase64Images: string[] = [];

    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        newBase64Images.push(result);
        loadedCount++;
        if (loadedCount === validFiles.length) {
          setProdForm(prev => {
            const existingList = getParsedImageList(prev.imagesText, prev.imageUrl);
            const combined = [...existingList, ...newBase64Images.filter(img => !existingList.includes(img))];
            return {
              ...prev,
              imageUrl: prev.imageUrl || combined[0],
              imagesText: combined.join('\n')
            };
          });
          showToast(`Uploaded ${newBase64Images.length} picture${newBase64Images.length > 1 ? 's' : ''}!`);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleCategoryImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('Image file too large. Please select an image under 5MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setCatImageUrl(result);
      showToast('Category image uploaded!');
    };
    reader.readAsDataURL(file);
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

  // Order Update
  const handleUpdateOrderStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderStatusModal) return;
    try {
      await api.adminUpdateOrderStatus(orderStatusModal.id, {
        status: orderStatusModal.status,
        paymentStatus: orderStatusModal.paymentStatus,
        assignedCourier: orderStatusModal.assignedCourier,
        courierPhone: orderStatusModal.courierPhone,
        internalNotes: orderStatusModal.internalNotes
      });
      showToast(`Order #${orderStatusModal.orderNumber} updated!`);
      setOrderStatusModal(null);
      fetchAllData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Payment Verification
  const handleVerifyPayment = async (action: 'approve' | 'reject' | 'under_verification', adminNotes: string, paymentId?: string) => {
    const targetId = paymentId || verifyModalPayment?.id;
    if (!targetId) return;
    try {
      await api.adminVerifyPayment(targetId, action, adminNotes);
      showToast(action === 'approve' ? 'Payment approved & marked Paid!' : action === 'under_verification' ? 'Payment set to Under Verification' : 'Payment rejected.');
      setVerifyModalPayment(null);
      fetchAllData();
    } catch (err: any) {
      showToast(err.message, 'error');
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
          {/* Live Sync Status Indicator */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 text-[11px] font-bold text-emerald-400 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Live Sync Active</span>
            <span className="text-[10px] text-slate-400 font-mono hidden xl:inline">
              · {lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
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
              onClick={() => setActiveTab('orders')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'orders' ? 'bg-[#FF6000] text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <ShoppingBag className="w-4 h-4" />
                <span>Orders & Delivery</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-black ${
                activeTab === 'orders' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {orders.length}
              </span>
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
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-black bg-rose-500 text-white animate-pulse">
                  {stats.pendingVerifications}
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
                <span>Messages Inbox</span>
              </div>
              {stats.unreadMessagesCount > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-black bg-[#FF6000] text-white">
                  {stats.unreadMessagesCount}
                </span>
              )}
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
            <p>Receiver: Ruth (078002260)</p>
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
                    onClick={handleSyncToGoogleDrive}
                    disabled={syncingToDrive}
                    className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold rounded-xl shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
                    title="Store & backup all products to Google Drive (ContactReach_Market_Products.json)"
                  >
                    <CloudUpload className={`w-4 h-4 ${syncingToDrive ? 'animate-bounce text-blue-600' : 'text-blue-500'}`} />
                    <span>{syncingToDrive ? 'Backing up...' : 'Google Drive Backup'}</span>
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
                    onClick={handleOpenAddProduct}
                    className="px-4 py-2 bg-[#FF6000] hover:bg-[#e05500] text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add New Product</span>
                  </button>
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
                      (Last synced: {new Date(driveStatus.lastBackupAt).toLocaleString()})
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

              {/* Products Table */}
              <div className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-400 font-bold uppercase text-[10px]">
                        <th className="py-3 px-4">Product / SKU</th>
                        <th className="py-3 px-3">Category</th>
                        <th className="py-3 px-3">Shop / Source</th>
                        <th className="py-3 px-3">Cost (FRW)</th>
                        <th className="py-3 px-3">Price (FRW)</th>
                        <th className="py-3 px-3">Stock</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredProducts.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50/60">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="relative group shrink-0">
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
                                    onClick={() => handleOpenManageImages(p)}
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
                          <td className="py-3 px-3">
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
                          </td>
                          <td className="py-3 px-3">
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
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                              p.status === 'Available' ? 'bg-emerald-100 text-emerald-800' : p.status === 'Out of Stock' ? 'bg-rose-100 text-rose-800' : 'bg-slate-200 text-slate-600'
                            }`}>
                              {p.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
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
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CATEGORIES */}
          {activeTab === 'categories' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">Categories & Subcategories</h1>
                  <p className="text-xs text-slate-500">Organize products into customer-facing departments</p>
                </div>
                <button
                  onClick={() => {
                    setEditingCategory(null);
                    setCatNameEn('');
                    setCatNameRw('');
                    setCatIcon('Tag');
                    setCatDesc('');
                    setCategoryModalOpen(true);
                  }}
                  className="px-4 py-2.5 bg-[#FF6000] hover:bg-[#e05500] text-white text-xs font-bold rounded-2xl shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Category</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.map(cat => {
                  const prodCount = products.filter(p => p.category === cat.id).length;
                  const coverImg = getCategoryCoverImage(cat, products);
                  return (
                    <div key={cat.id} className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-3 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 relative">
                            <img
                              src={coverImg}
                              alt={cat.nameEn}
                              className="w-full h-full object-cover"
                            />
                            {cat.imageUrl && (
                              <span className="absolute bottom-0 right-0 bg-[#FF6000] text-white px-1 py-0.2 rounded-tl text-[8px] font-black">
                                Custom
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <h3 className="font-extrabold text-sm text-slate-900 truncate">{cat.nameEn}</h3>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 text-slate-700 shrink-0">
                                {prodCount} items
                              </span>
                            </div>
                            <span className="text-xs text-slate-500 block truncate">{cat.nameRw}</span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              {cat.imageUrl ? '🎨 Custom Image' : '⚡ Auto product image'}
                            </span>
                          </div>
                        </div>

                        {cat.description && (
                          <p className="text-xs text-slate-500 line-clamp-2">{cat.description}</p>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-[10px] font-mono text-slate-400">ID: {cat.id}</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEditingCategory(cat);
                              setCatNameEn(cat.nameEn);
                              setCatNameRw(cat.nameRw);
                              setCatIcon(cat.icon || 'Tag');
                              setCatDesc(cat.description || '');
                              setCatImageUrl(cat.imageUrl || '');
                              setCategoryModalOpen(true);
                            }}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold"
                          >
                            Edit & Image
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(cat.id)}
                            className="text-rose-600 hover:text-rose-800 font-bold px-2 py-1"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
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
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">Orders & Delivery Management</h1>
                  <p className="text-xs text-slate-500">Track shipments, assign dispatch couriers, and generate invoices</p>
                </div>
              </div>

              {/* Filters */}
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 flex flex-wrap gap-2.5 items-center justify-between text-xs">
                <div className="flex-1 min-w-[200px] relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    placeholder="Search by order CRM-..., name, or phone..."
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={orderStatusFilter}
                    onChange={(e) => setOrderStatusFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
                  >
                    <option value="all">All Order Statuses</option>
                    <option value="New">New</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Preparing">Preparing</option>
                    <option value="Ready for Delivery">Ready for Delivery</option>
                    <option value="Out for Delivery">Out for Delivery</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>

                  <select
                    value={orderPaymentFilter}
                    onChange={(e) => setOrderPaymentFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
                  >
                    <option value="all">All Payment Statuses</option>
                    <option value="Paid">Paid</option>
                    <option value="Pending Verification">Pending Verification</option>
                    <option value="Pending Payment">Pending Payment</option>
                    <option value="Failed">Failed</option>
                  </select>
                </div>
              </div>

              {/* Orders Table */}
              <div className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-400 font-bold uppercase text-[10px]">
                        <th className="py-3 px-4">Order #</th>
                        <th className="py-3 px-3">Date</th>
                        <th className="py-3 px-3">Customer</th>
                        <th className="py-3 px-3">Delivery Destination</th>
                        <th className="py-3 px-3">Total Amount</th>
                        <th className="py-3 px-3">Payment</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredOrders.map(ord => (
                        <tr key={ord.id} className="hover:bg-slate-50/60">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">
                            {ord.orderNumber}
                          </td>
                          <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                            {new Date(ord.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-bold text-slate-800 block">{ord.customerName}</span>
                            <span className="text-[11px] text-slate-500">{ord.customerPhone}</span>
                          </td>
                          <td className="py-3 px-3 text-slate-600 max-w-xs truncate">
                            {ord.deliveryAddress}
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-[#FF6000]">
                            {ord.totalAmount.toLocaleString()} FRW
                          </td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                              ord.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-800' : ord.paymentStatus === 'Pending Verification' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {ord.paymentStatus}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-semibold text-slate-800">{ord.status}</span>
                            {ord.assignedCourier && (
                              <span className="block text-[10px] text-slate-400">Courier: {ord.assignedCourier}</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                            {(() => {
                              const pm = ord.paymentConfirmation || payments.find(p => p.orderNumber === ord.orderNumber);
                              if (pm) {
                                return (
                                  <button
                                    onClick={() => {
                                      setVerifyModalPayment(pm);
                                      setVerifyNotes('Verified with telecom statement');
                                    }}
                                    className="px-2 py-1 bg-orange-50 border border-orange-200 text-[#FF6000] font-bold rounded-lg cursor-pointer text-[11px] hover:bg-orange-100 inline-flex items-center gap-1"
                                    title="View submitted payment proof"
                                  >
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                    <span>Proof</span>
                                  </button>
                                );
                              }
                              return null;
                            })()}
                            <button
                              onClick={() => setOrderStatusModal(ord)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg cursor-pointer text-[11px]"
                            >
                              Update Status
                            </button>
                            <button
                              onClick={() => setPrintableInvoiceOrder(ord)}
                              title="Invoice"
                              className="p-1 text-slate-500 hover:text-slate-800"
                            >
                              <FileText className="w-4 h-4 inline" />
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

          {/* TAB 6: PAYMENT VERIFICATION */}
          {activeTab === 'payments' && (
            <div className="space-y-5">
              <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight">Mobile Money & Payment Verification</h1>
                <p className="text-xs text-slate-500">Audit customer payment submissions against telecom statements</p>
              </div>

              <div className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-400 font-bold uppercase text-[10px]">
                        <th className="py-3 px-4">Order #</th>
                        <th className="py-3 px-3">Sender Phone</th>
                        <th className="py-3 px-3">Method</th>
                        <th className="py-3 px-3">Txn ID / Ref</th>
                        <th className="py-3 px-3">Amount Paid</th>
                        <th className="py-3 px-3">Proof (Screenshot / SMS)</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-4 text-right">Verification</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {payments.map(pm => (
                        <tr key={pm.id} className="hover:bg-slate-50/60">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">
                            {pm.orderNumber}
                          </td>
                          <td className="py-3 px-3 font-bold text-slate-800 font-mono">
                            {pm.paymentPhone}
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-600">
                            {pm.paymentMethod}
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-mono font-bold text-blue-600 block">{pm.transactionId}</span>
                            {pm.flaggedSuspicious && (
                              <span className="inline-flex items-center gap-0.5 mt-0.5 text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-300">
                                ⚠️ Duplicate Txn
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-slate-900">
                            {pm.amountPaid.toLocaleString()} FRW
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {pm.screenshotUrl && (
                                <button
                                  type="button"
                                  onClick={() => setZoomScreenshot(pm.screenshotUrl!)}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-50 border border-orange-200 text-orange-700 text-[10px] font-bold hover:bg-orange-100 transition-colors cursor-pointer"
                                  title="Click to view payment screenshot"
                                >
                                  <ImageIcon className="w-3 h-3" />
                                  <span>Screenshot</span>
                                </button>
                              )}
                              {pm.confirmationMessage && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setVerifyModalPayment(pm);
                                    setVerifyNotes('Verified with MTN/Airtel MoMo statement');
                                  }}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-bold hover:bg-blue-100 transition-colors cursor-pointer"
                                  title={pm.confirmationMessage}
                                >
                                  <FileText className="w-3 h-3" />
                                  <span>SMS Text</span>
                                </button>
                              )}
                              {!pm.screenshotUrl && !pm.confirmationMessage && (
                                <span className="text-[10px] text-slate-400 italic">ID Only</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                              pm.verificationStatus === 'Verified/Paid' || pm.verificationStatus === 'Approved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : pm.verificationStatus === 'Under Verification'
                                ? 'bg-purple-100 text-purple-800'
                                : pm.verificationStatus === 'Rejected'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {pm.verificationStatus === 'Verified/Paid' || pm.verificationStatus === 'Approved'
                                ? 'Verified / Paid'
                                : pm.verificationStatus}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {pm.verificationStatus !== 'Verified/Paid' && pm.verificationStatus !== 'Approved' ? (
                              <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                <button
                                  onClick={() => {
                                    setVerifyModalPayment(pm);
                                    setVerifyNotes('Verified with MTN/Airtel statement');
                                  }}
                                  className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg cursor-pointer text-[11px]"
                                  title="Review proof and verify"
                                >
                                  Review
                                </button>
                                <button
                                  onClick={() => handleVerifyPayment('approve', 'Verified with MTN/Airtel statement', pm.id)}
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg cursor-pointer text-[11px]"
                                  title="Approve and mark Paid"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleVerifyPayment('under_verification', 'Checking telecom bank records', pm.id)}
                                  className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg cursor-pointer text-[11px]"
                                  title="Mark Under Verification"
                                >
                                  Audit
                                </button>
                                <button
                                  onClick={() => handleVerifyPayment('reject', 'Transaction reference not found in telecom records', pm.id)}
                                  className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg cursor-pointer text-[11px]"
                                  title="Reject payment"
                                >
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setVerifyModalPayment(pm);
                                  setVerifyNotes(pm.adminNotes || `Verified by ${pm.verifiedBy || 'Ruth'}`);
                                }}
                                className="text-[11px] text-slate-500 hover:text-slate-800 font-semibold underline cursor-pointer"
                              >
                                View Details
                              </button>
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

          {/* TAB 8: MESSAGES INBOX */}
          {activeTab === 'messages' && (
            <div className="space-y-5">
              <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight">Admin Messages Inbox</h1>
                <p className="text-xs text-slate-500">Customer contact inquiries, wholesale requests, and general messages</p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {messages.map(msg => (
                  <div key={msg.id} className={`p-5 rounded-2xl border bg-white shadow-2xs space-y-3 ${
                    msg.status === 'unread' ? 'border-orange-300 ring-1 ring-orange-200' : 'border-slate-200'
                  }`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-slate-900">{msg.name}</span>
                          <span className="text-xs text-slate-500">({msg.email})</span>
                          {msg.status === 'unread' && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-[#FF6000] text-white uppercase">
                              Unread
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-400 font-mono">
                          Phone: {msg.phone || 'N/A'} {msg.orderNumber && `· Ref: ${msg.orderNumber}`}
                        </span>
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
                        <span className="font-bold block text-[11px]">Staff Reply Note (by {msg.repliedBy}):</span>
                        <p>{msg.replyNote}</p>
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-1">
                      {msg.status === 'unread' && (
                        <button
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
                        onClick={async () => {
                          const note = prompt('Enter staff resolution or reply note:');
                          if (note) {
                            await api.adminUpdateMessage(msg.id, { replyNote: note });
                            showToast('Reply logged!');
                            fetchAllData();
                          }
                        }}
                        className="px-3 py-1 bg-[#121316] hover:bg-black text-white font-bold text-xs rounded-lg cursor-pointer"
                      >
                        Add Reply Note
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 9: PROBLEMS & COMPLAINTS */}
          {activeTab === 'problems' && (
            <div className="space-y-5">
              <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight">Customer Problems, Complaints & Reports</h1>
                <p className="text-xs text-slate-500">Track cases, assign investigators, and document official resolutions</p>
              </div>

              <div className="grid grid-cols-1 gap-3.5">
                {problems.map(prob => (
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
                        <span className="text-[11px] text-slate-400 capitalize">
                          Category: {prob.category.replace('_', ' ')} {prob.orderNumber && `· Order #${prob.orderNumber}`}
                        </span>
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
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
                      value={settings?.paymentNumber || '078002260'}
                      onChange={(e) => setSettings(prev => prev ? { ...prev, paymentNumber: e.target.value } : null)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">MTN Merchant Code</label>
                    <input
                      type="text"
                      value={settings?.merchantCode || '078002'}
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

              {/* Cloud Firestore & Google Drive Persistence Status Card */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-4 text-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <CloudUpload className="w-5 h-5 text-blue-600" />
                    <div>
                      <h3 className="font-black text-sm text-slate-900">Database Storage & Google Drive Backup</h3>
                      <p className="text-[11px] text-slate-500">Products are stored live in Cloud Firestore and can be synchronized to Google Drive</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Cloud Firestore Active</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                    <span className="font-bold text-slate-700 block">Authoritative Firestore Database:</span>
                    <code className="text-[11px] font-mono text-slate-600 block bg-white p-2 rounded-lg border border-slate-200 break-all">
                      ai-studio-contactreachmark-e7c8fa82-d820-4699-9810-672e9d5a0b74
                    </code>
                    <p className="text-[10px] text-slate-500">
                      Real-time live listeners sync orders, products, audit logs, and payments across all devices.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-200 space-y-2">
                    <span className="font-bold text-blue-900 block">Google Drive Catalog Backup:</span>
                    <div className="text-[11px] text-blue-800 space-y-1">
                      <div>File: <strong className="font-mono">ContactReach_Market_Products.json</strong></div>
                      {driveStatus?.lastBackupAt ? (
                        <div>Last Synced: <strong>{new Date(driveStatus.lastBackupAt).toLocaleString()}</strong> ({driveStatus.productCount || products.length} products)</div>
                      ) : (
                        <div className="text-slate-500 italic">No backup performed yet in this session.</div>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleSyncToGoogleDrive}
                        disabled={syncingToDrive}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <CloudUpload className={`w-3.5 h-3.5 ${syncingToDrive ? 'animate-bounce' : ''}`} />
                        <span>{syncingToDrive ? 'Syncing...' : 'Backup to Google Drive'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleOpenDriveFilePicker}
                        disabled={importingFromDrive}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <Zap className={`w-3.5 h-3.5 ${importingFromDrive ? 'animate-spin' : ''}`} />
                        <span>{importingFromDrive ? 'Auto-filling...' : '⚡ Auto-Fill Products from Drive'}</span>
                      </button>
                      {driveStatus?.webViewLink && (
                        <a
                          href={driveStatus.webViewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-white border border-blue-300 text-blue-700 hover:bg-blue-50 font-bold rounded-xl text-xs flex items-center gap-1"
                        >
                          <span>Open in Drive</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
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
                    onClick={handleTestCjConnection}
                    disabled={cjTesting}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-200 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
                  >
                    <ShieldCheck className={`w-4 h-4 ${cjTesting ? 'animate-spin text-purple-600' : 'text-slate-600'}`} />
                    <span>{cjTesting ? 'Testing...' : 'Test Connection'}</span>
                  </button>
                  <button
                    onClick={() => handleSyncCjNow(cjProductCategoryFilter !== 'all' ? cjProductCategoryFilter : undefined)}
                    disabled={cjSyncing}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
                  >
                    <RefreshCw className={`w-4 h-4 ${cjSyncing ? 'animate-spin' : ''}`} />
                    <span>{cjSyncing ? 'Syncing Products...' : '⚡ Sync Feed Now'}</span>
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

              {/* Configuration Form Card */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-5 text-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-purple-600" />
                    <span>CJ Dropshipping Feed Settings</span>
                  </h3>
                  <button
                    type="button"
                    onClick={handleSaveCjConfig}
                    disabled={savingCjConfig}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{savingCjConfig ? 'Saving...' : 'Save Settings'}</span>
                  </button>
                </div>

                {/* Automation Toggles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/60 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors">
                    <div>
                      <span className="font-bold text-slate-800 block text-xs">Automated Upload (15-min background sync)</span>
                      <span className="text-[11px] text-slate-500">Automatically fetches new trending products from CJ and uploads to your catalog</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={cjAutoUploadToggle}
                      onChange={(e) => setCjAutoUploadToggle(e.target.checked)}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                    />
                  </label>

                  <label className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/60 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors">
                    <div>
                      <span className="font-bold text-slate-800 block text-xs">Auto-Publish as Available</span>
                      <span className="text-[11px] text-slate-500">Set newly imported products to "Available" immediately for public shoppers</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={cjAutoPublishToggle}
                      onChange={(e) => setCjAutoPublishToggle(e.target.checked)}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
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
                    <label className="block font-bold text-slate-700 mb-1">CJ API Key / Access Token</label>
                    <input
                      type="password"
                      value={cjApiKeyInput}
                      onChange={(e) => setCjApiKeyInput(e.target.value)}
                      placeholder="Optional API token (pre-configured)"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">Default connected feed active</span>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">CJ Account Email</label>
                    <input
                      type="email"
                      value={cjEmailInput}
                      onChange={(e) => setCjEmailInput(e.target.value)}
                      placeholder="contactreachmedialimited@gmail.com"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">Account notification identifier</span>
                  </div>
                </div>

                {/* Categories to Import */}
                <div>
                  <label className="block font-bold text-slate-700 mb-2">Import Categories</label>
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

              {/* CJ Products Catalog Table with Inline Cost Update */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-black text-slate-900">Imported CJ Dropshipping Products</h2>
                    <p className="text-xs text-slate-500">Edit product cost, selling prices, and review margins</p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
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
                          <th className="py-3 px-3">CJ Wholesale (USD)</th>
                          <th className="py-3 px-3">Product Cost (RWF)</th>
                          <th className="py-3 px-3">Selling Price (RWF)</th>
                          <th className="py-3 px-3">Profit Margin</th>
                          <th className="py-3 px-3">Stock</th>
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
                          Click <strong>"⚡ Sync Feed Now"</strong> above to instantly upload curated dropshipping products.
                        </p>
                        <button
                          type="button"
                          onClick={() => handleSyncCjNow()}
                          disabled={cjSyncing}
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs cursor-pointer"
                        >
                          Import Initial Feed Now
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
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
              <h3 className="font-black text-base text-slate-900">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
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

              {prodForm.costPrice !== '' && Number(prodForm.costPrice) > 0 && Number(prodForm.price) > 0 && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-950 font-bold">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      Estimated Profit: {(Number(prodForm.price) - Number(prodForm.costPrice)).toLocaleString()} FRW / unit
                    </span>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-200 text-emerald-900 rounded-lg font-mono">
                    {Math.round(((Number(prodForm.price) - Number(prodForm.costPrice)) / Number(prodForm.price)) * 100)}% Margin
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category *</label>
                  <select
                    value={prodForm.category}
                    onChange={(e) => setProdForm({ ...prodForm, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-semibold"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.nameEn} ({c.nameRw})</option>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Available Sizes (comma separated)</label>
                  <input
                    type="text"
                    value={prodForm.sizes}
                    onChange={(e) => setProdForm({ ...prodForm, sizes: e.target.value })}
                    placeholder="e.g. S, M, L, XL, 38, 40, 42"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Available Colors (comma separated)</label>
                  <input
                    type="text"
                    value={prodForm.colors}
                    onChange={(e) => setProdForm({ ...prodForm, colors: e.target.value })}
                    placeholder="e.g. Black, White, Navy Blue"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Product Description *</label>
                <textarea
                  rows={4}
                  required
                  value={prodForm.description}
                  onChange={(e) => setProdForm({ ...prodForm, description: e.target.value })}
                  placeholder="Comprehensive specifications, materials, and usage details..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300"
                />
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

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setProductModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#FF6000] hover:bg-[#e05500] text-white font-bold rounded-xl shadow-sm cursor-pointer"
                >
                  {editingProduct ? 'Save Changes' : 'Publish Product'}
                </button>
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
                    <th className="p-3">Item Description</th>
                    <th className="p-3 text-center">Qty</th>
                    <th className="p-3 text-right">Unit Price</th>
                    <th className="p-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {printableInvoiceOrder.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-3 font-bold text-slate-800">{item.productName}</td>
                      <td className="p-3 text-center font-mono">{item.quantity}</td>
                      <td className="p-3 text-right font-mono">{item.price.toLocaleString()} FRW</td>
                      <td className="p-3 text-right font-mono font-bold">{(item.price * item.quantity).toLocaleString()} FRW</td>
                    </tr>
                  ))}
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
                              Auto-Selected from Products
                            </span>
                            <p className="text-[10px] text-slate-500 truncate">
                              {autoInfo.sourceLabel}
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
                  placeholder="e.g. Statement checked, confirmed transfer received on 078002260 by Admin"
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
    </div>
  );
};

