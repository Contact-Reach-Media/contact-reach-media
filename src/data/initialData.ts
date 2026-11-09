import { Product, Category, AppSettings, VendorShop } from '../types.ts';
import { generateFlatCategoryRecords } from './categoryStructure.ts';

export const initialSettings: AppSettings = {
  "companyName": "ContactReach Media Ltd",
  "marketName": "ContactReach Market",
  "slogan": "Discover Products. Pay Easily. Shop with Confidence.",
  "phone": "0780022600",
  "email": "contactreachmedialimited@gmail.com",
  "address": "KG 622 St, Fair View Plaza, Kigali, Rwanda",
  "receiverName": "Ruth",
  "paymentNumber": "0780022600",
  "merchantCode": "2328354",
  "mtnUssdPattern": "*182*1*1*0780022600*{AMOUNT}#",
  "airtelUssdPattern": "*182*1*2*0780022600*{AMOUNT}#",
  "whatsAppNumber": "+250780022600",
  "socials": {
    "tiktok": "https://tiktok.com/@contactreachmedia",
    "instagram": "https://instagram.com/@contactreachmedia",
    "youtube": "https://youtube.com/@contactreachmedia",
    "facebook": "https://facebook.com/@contactreachmedia"
  },
  "deliveryFeeKigali": 1500,
  "deliveryFeeUpcountry": 3500,
  "pickupAddress": "Fair View Plaza, KG 622 St, Kigali, Rwanda",
  "kigaliAreas": [
    {
      "id": "gasabo",
      "name": "Gasabo (Kimironko, Remera, Kacyiru, Gisozi, Kibagabaga)",
      "fee": 1500,
      "estimatedTime": "2 - 4 hours"
    },
    {
      "id": "nyarugenge",
      "name": "Nyarugenge (Downtown, Kiyovu, Nyamirambo, Muhima)",
      "fee": 1500,
      "estimatedTime": "2 - 4 hours"
    },
    {
      "id": "kicukiro",
      "name": "Kicukiro (Sonatubes, Gikondo, Kanombe, Niboye, Kagarama)",
      "fee": 1500,
      "estimatedTime": "2 - 4 hours"
    },
    {
      "id": "express",
      "name": "Kigali Express Direct Courier (Within 60-90 Mins)",
      "fee": 3000,
      "estimatedTime": "60 - 90 mins"
    }
  ],
  "freeDeliveryThreshold": 50000,
  "outsideKigaliNotice": "Locations outside the configured Kigali delivery areas: Additional delivery charges apply. Please contact our seller/support team on WhatsApp (+250 780 022 600) to confirm transport cost and delivery arrangements before completing your order.",
  "isMaintenanceMode": false,
  "maintenanceTitle": "We'll Be Back Soon",
  "maintenanceMessage": "ContactReach Market is currently under scheduled maintenance. We will return online shortly.",
  "maintenanceEstimatedTime": "",
  "cjConfig": {
    "apiKey": "",
    "email": "",
    "autoUploadEnabled": false,
    "syncFrequency": "daily",
    "defaultMarkupPercent": 15,
    "usdToRwfRate": 1435,
    "autoPublish": true,
    "selectedCategories": [],
    "lastSyncStats": {
      "uploadedCount": 0,
      "updatedCount": 0,
      "totalCjProducts": 0,
      "timestamp": new Date().toISOString(),
      "status": "idle",
      "message": "Ready to synchronize with Supabase"
    },
    "lastSyncAt": new Date().toISOString(),
    "requireAdminApproval": false
  },
  "driveBackupStatus": {
    "status": "idle",
    "fileName": "ContactReach_Market_Products.json",
    "autoSyncEnabled": true,
    "connectedEmail": "contactreachmedialimited@gmail.com",
    "accountEmail": "contactreachmedialimited@gmail.com"
  },
  "googleSheetConfig": {
    "sheetUrl": "",
    "sheetId": "",
    "sheetTabName": "Sheet1",
    "autoSyncEnabled": false,
    "syncDirection": "two_way",
    "connectedAccountEmail": "",
    "linkedEmail": "",
    "connectedAt": "",
    "lastSyncStats": {
      "status": "idle",
      "timestamp": new Date().toISOString(),
      "createdCount": 0,
      "updatedCount": 0,
      "totalProducts": 0,
      "syncedCount": 0,
      "message": "Connected to Supabase"
    },
    "lastSyncAt": ""
  },
  "alibabaConfig": {
    "appKey": "",
    "hasAppKey": false,
    "appSecret": "",
    "hasAppSecret": false,
    "accessToken": "",
    "hasAccessToken": false,
    "email": "contactreachmedialimited@gmail.com",
    "autoUploadEnabled": false,
    "syncFrequency": "daily",
    "defaultMarkupPercent": 10,
    "usdToRwfRate": 1435,
    "autoPublish": true,
    "requireAdminApproval": false,
    "destinationCountry": "RW",
    "destinationCity": "Kigali",
    "destinationPostalCode": "00000",
    "selectedCategories": [],
    "lastSyncStats": {
      "uploadedCount": 0,
      "updatedCount": 0,
      "totalAlibabaProducts": 0,
      "timestamp": new Date().toISOString(),
      "status": "idle",
      "message": "All product data resides in Supabase"
    }
  },
  "dsersConfig": {
    "hasCredentials": false,
    "isConnected": false,
    "connectionStatus": "unconfigured",
    "autoFulfillApprovedOrders": false,
    "defaultShippingCarrier": "AliExpress Standard Shipping"
  },
  "supabaseConfig": {
    "enabled": true,
    "projectUrl": "https://hfwfjbvwhkjfrdodqyyw.supabase.co",
    "anonKey": "sb_publishable_vBneCzN_L_4VDjE_mPwxHw_vib-ua-5",
    "projectId": "hfwfjbvwhkjfrdodqyyw",
    "projectName": "contactreachmarket",
    "tableName": "products",
    "autoSyncOrders": true
  },
  "maintenanceUpdatedAt": new Date().toISOString()
};

// Structural categories hierarchy (Clothing, Shoes, Electronics, etc.)
export const initialCategories: Category[] = generateFlatCategoryRecords();

// All vendor shops are loaded dynamically from Supabase
export const initialShops: VendorShop[] = [];

// All products are loaded dynamically from Supabase.
// Zero hardcoded, fixed, or demo products in code.
export const initialProducts: Product[] = [];
