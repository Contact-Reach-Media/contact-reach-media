import { Product, Category, AppSettings, VendorShop } from '../types.ts';

export const initialSettings: AppSettings = {
  companyName: 'ContactReach Media Ltd',
  marketName: 'ContactReach Market',
  slogan: 'Discover Products. Pay Easily. Shop with Confidence.',
  phone: '+250 780 022 600',
  email: 'contactreachmedialimited@gmail.com',
  address: 'KG 622 St, Fair View Plaza, Kigali, Rwanda',
  receiverName: 'Ruth',
  paymentNumber: '078002260',
  merchantCode: '078002',
  mtnUssdPattern: '*182*1*1*078002260*{AMOUNT}#',
  airtelUssdPattern: '*182*1*2*078002260*{AMOUNT}#',
  whatsAppNumber: '+250780022600',
  socials: {
    tiktok: 'https://tiktok.com/@contactreachmedia',
    instagram: 'https://instagram.com/@contactreachmedia',
    youtube: 'https://youtube.com/@contactreachmedia',
    facebook: 'https://facebook.com/@contactreachmedia'
  },
  deliveryFeeKigali: 1500,
  deliveryFeeUpcountry: 3500,
  pickupAddress: 'Fair View Plaza, KG 622 St, Kigali, Rwanda',
  kigaliAreas: [
    { id: 'gasabo', name: 'Gasabo (Kimironko, Remera, Kacyiru, Gisozi, Kibagabaga)', fee: 1500, estimatedTime: '2 - 4 hours' },
    { id: 'nyarugenge', name: 'Nyarugenge (Downtown, Kiyovu, Nyamirambo, Muhima)', fee: 1500, estimatedTime: '2 - 4 hours' },
    { id: 'kicukiro', name: 'Kicukiro (Sonatubes, Gikondo, Kanombe, Niboye, Kagarama)', fee: 1500, estimatedTime: '2 - 4 hours' },
    { id: 'express', name: 'Kigali Express Direct Courier (Within 60-90 Mins)', fee: 3000, estimatedTime: '60 - 90 mins' }
  ],
  freeDeliveryThreshold: 50000,
  outsideKigaliNotice: 'Locations outside the configured Kigali delivery areas: Additional delivery charges apply. Please contact our seller/support team on WhatsApp (+250 780 022 600) to confirm transport cost and delivery arrangements before completing your order.',
  isMaintenanceMode: false,
  maintenanceTitle: "We'll Be Back Soon",
  maintenanceMessage: "ContactReach Market is currently undergoing planned system upgrades to improve your shopping experience. All existing customer orders, accounts, and payments are safe. We will be back online shortly!",
  maintenanceEstimatedTime: "",
  cjConfig: {
    apiKey: '',
    email: '',
    autoUploadEnabled: false,
    syncFrequency: 'daily',
    defaultMarkupPercent: 35,
    usdToRwfRate: 1420,
    autoPublish: true,
    selectedCategories: ['electronics', 'fashion', 'amatara', 'hair-beauty', 'amasaha', 'ibikapu', 'sports'],
    lastSyncStats: {
      uploadedCount: 0,
      updatedCount: 0,
      totalCjProducts: 0,
      timestamp: new Date().toISOString(),
      status: 'idle'
    }
  },
  driveBackupStatus: {
    status: 'idle',
    fileName: 'ContactReach_Market_Products.json',
    autoSyncEnabled: true
  }
};

export const initialCategories: Category[] = [
  { id: 'hair-beauty', nameEn: 'Beauty & Cosmetics', nameRw: 'Ubwiza', icon: 'Sparkles', itemCount: 0, description: 'Salon supplies, cosmetics, hair care, and personal wellness.' },
  { id: 'electronics', nameEn: 'Electronics & TV', nameRw: 'Ibyuma', icon: 'Tv', itemCount: 0, description: 'Smartphones, TV accessories, audio devices, and gadgets.' },
  { id: 'fashion', nameEn: 'Fashion & Apparel', nameRw: 'Imyenda', icon: 'Shirt', itemCount: 0, description: 'Clothing, shoes, bags, and modern Rwandan & international styles.' },
  { id: 'amatara', nameEn: 'Lighting & Gadgets', nameRw: 'Amatara', icon: 'Lightbulb', itemCount: 0, description: 'Home lighting, LED strips, rechargeable lamps, and decor.' },
  { id: 'impano', nameEn: 'Gifts & Home Decor', nameRw: 'Impano', icon: 'Gift', itemCount: 0, description: 'Curated gift hampers, decorative accents, and special packages.' },
  { id: 'abana', nameEn: 'Kids & Toys', nameRw: 'Abana', icon: 'Baby', itemCount: 0, description: 'Educational toys, kids essentials, clothing, and baby care.' },
  { id: 'amasaha', nameEn: 'Watches & Jewelry', nameRw: 'Amasaha', icon: 'Watch', itemCount: 0, description: 'Wristwatches, necklaces, bracelets, and fashion accessories.' },
  { id: 'ibikapu', nameEn: 'Bags & Luggage', nameRw: 'Ibikapu', icon: 'Briefcase', itemCount: 0, description: 'Backpacks, handbags, travel luggage, and laptop cases.' },
  { id: 'sports', nameEn: 'Sports & Fitness', nameRw: 'Imikino', icon: 'Dumbbell', itemCount: 0, description: 'Workout accessories, activewear, and fitness gear.' },
  { id: 'books', nameEn: 'Books & Learning', nameRw: 'Books', icon: 'BookOpen', itemCount: 0, description: 'School materials, stationery, books, and business planners.' }
];

// No fake or invented demo shops. Real verified suppliers are added via the Supplier Onboarding portal or Admin.
export const initialShops: VendorShop[] = [];

// No demo/fake products with invented prices or fake reviews.
// Real products will be listed from verified suppliers with genuine pricing in RWF.
export const initialProducts: Product[] = [];
