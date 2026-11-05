import { Product, Category, AppSettings, VendorShop } from '../types.ts';

export const initialSettings: AppSettings = {
  companyName: '',
  marketName: '',
  slogan: '',
  phone: '',
  email: '',
  address: '',
  receiverName: '',
  paymentNumber: '',
  merchantCode: '',
  mtnUssdPattern: '',
  airtelUssdPattern: '',
  whatsAppNumber: '',
  socials: {},
  deliveryFeeKigali: 0,
  deliveryFeeUpcountry: 0,
  pickupAddress: '',
  kigaliAreas: [],
  freeDeliveryThreshold: 0,
  outsideKigaliNotice: '',
  isMaintenanceMode: false,
  maintenanceTitle: '',
  maintenanceMessage: '',
  maintenanceEstimatedTime: '',
  cjConfig: {
    apiKey: '',
    email: '',
    autoUploadEnabled: false,
    syncFrequency: 'daily',
    defaultMarkupPercent: 10,
    usdToRwfRate: 1435,
    autoPublish: true,
    selectedCategories: []
  },
  driveBackupStatus: {
    status: 'idle',
    fileName: 'ContactReach_Market_Products.json',
    autoSyncEnabled: false
  },
  googleSheetConfig: {
    sheetUrl: '',
    sheetId: '',
    sheetTabName: 'Sheet1',
    autoSyncEnabled: false,
    syncDirection: 'two_way'
  },
  alibabaConfig: {
    appKey: '',
    hasAppKey: false,
    appSecret: '',
    hasAppSecret: false,
    accessToken: '',
    hasAccessToken: false,
    autoUploadEnabled: false,
    syncFrequency: 'daily',
    defaultMarkupPercent: 10,
    usdToRwfRate: 1435,
    autoPublish: false,
    requireAdminApproval: false,
    destinationCountry: 'RW',
    destinationCity: 'Kigali',
    destinationPostalCode: '00000',
    selectedCategories: []
  },
  dsersConfig: {
    hasCredentials: false,
    isConnected: false,
    connectionStatus: 'unconfigured',
    autoFulfillApprovedOrders: false,
    defaultShippingCarrier: 'AliExpress Standard Shipping'
  }
};

export const initialCategories: Category[] = [];

export const initialShops: VendorShop[] = [];

export const initialProducts: Product[] = [];
