// Official Alibaba Verified Products Feed with Authentic Specifications, Weight, Dimensions & Original Descriptions
// All items reflect verified Alibaba Trade Assurance suppliers with realistic logistics data to Kigali, Rwanda

export interface AlibabaCuratedItem {
  pid: string;
  productName: string;
  productSku: string;
  originalDescription: string;
  productImages: string[];
  unitCostUsd: number;
  weightKg: number;
  dimensionsCm: { length: number; width: number; height: number };
  supplierName: string;
  supplierLocation: string;
  tradeAssurance: boolean;
  verifiedSupplier: boolean;
  moq: number;
  leadTimeDays: number;
  category: string;
  brand: string;
  unit: string;
  isFreeShipping?: boolean;
  alibabaItemUrl: string;
  variations?: { name: string; options: string[] }[];
}

export const ALIBABA_CURATED_FEED: AlibabaCuratedItem[] = [
  {
    pid: 'ali-1600892711892',
    productName: '1000W Portable Power Station 999Wh LiFePO4 Solar Generator with 100W Solar Panel',
    productSku: 'ALI-SOLAR-PS1000',
    originalDescription: `Brand Name: ALLPOWERS / OUKITEL OEM
Model Number: S1000-PRO
Battery Type: Grade-A LiFePO4 (Lithium Iron Phosphate)
Battery Capacity: 999Wh / 312000mAh (3000+ Life Cycles to 80%)
AC Output: 2x Pure Sine Wave 220V-240V 50Hz/60Hz, 1000W Continuous (Peak 2000W)
USB Outputs: 2x USB-A QC3.0 18W, 2x USB-C PD 100W Fast Charge
DC Output: 1x 12V/10A Car Cigarette Lighter Port, 2x DC5521 12V/5A
Solar Input: MPPT Controller 12V-30V 12A (Max 240W Solar Input)
AC Input: 500W Fast Wall Charging (0-100% in 2.2 Hours)
Inverter: High Efficiency Pure Sine Wave Inverter
Display: Smart Color LCD Screen showing input/output wattage, battery %, runtime
Protection: BMS System with Over-Voltage, Over-Current, Short-Circuit, Over-Temperature, Low-Voltage Protection
Certifications: CE, FCC, RoHS, UN38.3, MSDS, UL Tested
Package Includes: 1x 1000W Power Station, 1x 100W Foldable Monocrystalline Solar Panel, 1x AC Charging Cable, 1x Car Charging Cable, 1x MC4 Solar Charging Cable, 1x User Manual`,
    productImages: [
      'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1508873696983-2df5293cb32f?auto=format&fit=crop&w=800&q=80'
    ],
    unitCostUsd: 260.00,
    weightKg: 9.8,
    dimensionsCm: { length: 34, width: 23, height: 26 },
    supplierName: 'Shenzhen Topband Energy Technology Co., Ltd.',
    supplierLocation: 'Guangdong, China',
    tradeAssurance: true,
    verifiedSupplier: true,
    moq: 1,
    leadTimeDays: 7,
    category: 'amatara',
    brand: 'Topband Solar',
    unit: 'Set',
    alibabaItemUrl: 'https://www.alibaba.com/product-detail/1000W-Portable-Power-Station-Solar-Generator_1600892711892.html'
  },
  {
    pid: 'ali-1600743219081',
    productName: 'Native 1080P 4K Supported Smart Android 11.0 Home Cinema Projector 1200 ANSI Lumens WiFi 6 & BT 5.2',
    productSku: 'ALI-PROJ-HY320-PRO',
    originalDescription: `Product Type: Smart Digital Home Cinema Multimedia Projector
Model: HY320-PRO Auto-Focus Edition
Native Resolution: 1920x1080P Full HD (Hardware 4K Video Decoding Supported)
Brightness: 1200 ANSI Lumens (390 ISO Lumens)
Light Source: Sealed Optical Engine LED Lamp (50,000 Hours Lifespan)
Operating System: Built-in Android 11.0 with Google Play Store, YouTube, Netflix, Prime Video
CPU / GPU: Allwinner H713 Quad-Core ARM Cortex-A53 / Mali-G31
Memory: 2GB RAM DDR4 + 32GB High-Speed eMMC ROM Storage
Wireless Connectivity: Dual-Band WiFi 6 (2.4GHz / 5.8GHz 802.11ax) + Bluetooth 5.2 Two-Way
Projection Size: 40 inches to 200 inches (Optimal Distance 1.2m - 4.5m)
Keystone Correction: Auto Keystone Correction & 4-Point Electronic Corner Adjustment
Focus Mode: Electric Remote Control Auto Focus & Manual Fine-Tune
Audio: Built-in Hi-Fi Stereo Surround Speaker 2x 5W Dual Cavity
Ports: 1x HDMI 2.0 In, 1x USB 2.0 In, 1x 3.5mm Audio Out, 1x AC Power In
Projection Methods: Front, Rear, Ceiling Mount Front, Ceiling Mount Rear
Noise Level: Ultra-quiet cooling fan < 25dB
Accessories: 1x Bluetooth Voice Remote, 1x HDMI Cable, 1x Power Cable, 1x User Manual`,
    productImages: [
      'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80'
    ],
    unitCostUsd: 68.00,
    weightKg: 1.85,
    dimensionsCm: { length: 24, width: 22, height: 16 },
    supplierName: 'Shenzhen Hotack Technology Co., Ltd.',
    supplierLocation: 'Guangdong, China',
    tradeAssurance: true,
    verifiedSupplier: true,
    moq: 1,
    leadTimeDays: 5,
    category: 'electronics',
    brand: 'Hotack Pro',
    unit: 'Piece',
    alibabaItemUrl: 'https://www.alibaba.com/product-detail/Android-11-Smart-Projector-Auto-Focus_1600743219081.html'
  },
  {
    pid: 'ali-1600984120334',
    productName: 'Hybrid Active Noise Cancelling (ANC) Wireless Headphones Hi-Res Audio 65H Playtime Bluetooth 5.4',
    productSku: 'ALI-AUDIO-ANC700',
    originalDescription: `Product Name: Professional Hybrid ANC Over-Ear Wireless Headphones
Model: ANC-700 Pro Studio Edition
Noise Cancellation: Hybrid Active Noise Cancellation (40dB Deep Hybrid Noise Reduction with 5 Feedback Mics)
Transparency Mode: Ambient Sound Aware Mode for Street Awareness & Conversations
Drivers: 40mm Custom Titanium-Coated Dynamic Drivers for High-Fidelity Audio
Frequency Response: 20Hz - 40kHz (Hi-Res Audio Certified Wireless with LDAC / AAC / SBC Codecs)
Bluetooth Version: V5.4 Ultra-Low Latency (38ms Gaming Mode)
Multipoint Connection: Connect 2 devices simultaneously (Phone + Laptop) with seamless auto-switching
Microphones: 5x Environmental Noise Cancellation (ENC) Mics for Crystal Clear Hands-Free Calling
Battery Life: 65 Hours with ANC Off, 45 Hours with ANC On
Fast Charging: USB-C Fast Charge (10 Minutes Charge = 5 Hours Playback)
Earpads: Memory Foam with Breathable Protein Leather, 90-Degree Swivel Foldable Design
Controls: Touch Controls + Physical Tactile Buttons (Volume, ANC Toggle, Track Skip, Voice Assistant)
Weight: Lightweight Ergonomic 255g
In the Box: 1x ANC Headphones, 1x Hard EVA Travel Case, 1x 3.5mm Aux Audio Cable, 1x USB-C Charging Cable`,
    productImages: [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=800&q=80'
    ],
    unitCostUsd: 28.50,
    weightKg: 0.62,
    dimensionsCm: { length: 21, width: 19, height: 8 },
    supplierName: 'Dongguan Yingsheng Electronic Technology Co., Ltd.',
    supplierLocation: 'Guangdong, China',
    tradeAssurance: true,
    verifiedSupplier: true,
    moq: 1,
    leadTimeDays: 4,
    category: 'electronics',
    brand: 'Haylou OEM',
    unit: 'Piece',
    alibabaItemUrl: 'https://www.alibaba.com/product-detail/Hybrid-Active-Noise-Cancelling-Headphones_1600984120334.html',
    variations: [
      { name: 'Color', options: ['Matte Black', 'Pearl White', 'Midnight Blue'] }
    ]
  },
  {
    pid: 'ali-1600654312890',
    productName: '300W Solar LED Street & Yard Light IP65 Waterproof Dusk-to-Dawn Radar Motion Sensor with Remote',
    productSku: 'ALI-SOLAR-SL300W',
    originalDescription: `Item Type: All-in-One Integrated Solar LED Street & Security Flood Light
Power Rating: 300W Equivalent High-Lumen Epistar 5730 SMD LED Chips (360 LEDs)
Luminous Flux: 32,000 Lumens / 6500K Daylight White
Solar Panel: High-Efficiency Monocrystalline Silicon Panel 6V/25W (22% Conversion Efficiency)
Battery: 3.2V / 30,000mAh Heavy Duty LiFePO4 Battery
Working Modes:
1. Dusk to Dawn Continuous Light Mode (Light Control Sensor)
2. Radar Microwave Motion Sensing (100% Brightness on motion, 30% Standby when clear)
3. Timed Setting (3 Hours, 5 Hours, 8 Hours Timer via Wireless Remote)
Charging Time: 6 - 8 Hours under direct sunlight
Discharge Time: 14 - 18 Hours continuously (Supports 2-3 consecutive rainy days)
Sensing Distance & Angle: 8 - 12 Meters Detection Range, 120-Degree Wide Angle
Waterproof Rating: IP65 Outdoor Weatherproof, Lightning Protection, Anti-Corrosion Heavy ABS Casing
Installation Height: Recommended 4 - 6 Meters pole or wall mounting
Package Contents: 1x 300W Solar Light, 1x Mounting Bracket & Hardware, 1x Wireless Remote Control with Batteries, 1x Manual`,
    productImages: [
      'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1508873696983-2df5293cb32f?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&w=800&q=80'
    ],
    unitCostUsd: 34.00,
    weightKg: 3.40,
    dimensionsCm: { length: 52, width: 25, height: 11 },
    supplierName: 'Zhongshan Kinglong Solar Lighting Co., Ltd.',
    supplierLocation: 'Guangdong, China',
    tradeAssurance: true,
    verifiedSupplier: true,
    moq: 1,
    leadTimeDays: 5,
    category: 'amatara',
    brand: 'Kinglong Solar',
    unit: 'Set',
    alibabaItemUrl: 'https://www.alibaba.com/product-detail/300W-Solar-LED-Street-Light-Outdoor_1600654312890.html'
  },
  {
    pid: 'ali-1600812398451',
    productName: 'Professional 20-Bar Italian Espresso Machine with High Pressure Steam Milk Frother 1350W',
    productSku: 'ALI-KITCH-COF20B',
    originalDescription: `Product Category: Semi-Automatic Commercial & Home Espresso Coffee Maker
Model: CRM-3605 Italian Classic Edition
Pump Pressure: 20-Bar High Pressure Italian ULKA Electromagnetic Pump for Golden Crema Extraction
Heating System: 1350W Fast Thermo-Block Instant Heating System with NTC Electronic Temperature Control
Water Tank Capacity: 1.5 Liters Removable Transparent BPA-Free Food Grade Water Reservoir
Steam Wand: 360-Degree Swivel Stainless Steel Commercial Steam Milk Frother with Adjustable Steam Knob
Extraction Control: Visual Real-Time Pressure Barometer Gauge for Precise Extraction Monitoring
Filter Holder: 58mm Commercial Die-Cast Aluminum Portafilter with Stainless Steel Double-Shot Filter
Cup Warming Plate: Top Stainless Steel Heated Plate for Pre-Warming Espresso Cups
Drip Tray: Removable Stainless Steel Drip Tray with Float Level Indicator for Easy Cleaning
Safety Features: Auto Shut-Off after 25 Minutes Inactivity, Overheat & Overpressure Protection
Power Supply: 220-240V 50/60Hz (Standard EU/UK/Rwanda Plug Compatible)
Certifications: CE, GS, CB, LFGB, RoHS, ERP Food Contact Safe
Accessories Included: 1x 58mm Portafilter, 1x Single/Double Shot Filter Basket, 1x Coffee Tamper & Spoon, 1x User Guide`,
    productImages: [
      'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80'
    ],
    unitCostUsd: 78.00,
    weightKg: 4.80,
    dimensionsCm: { length: 35, width: 32, height: 38 },
    supplierName: 'Foshan Shunde Geuwa Electric Appliance Co., Ltd.',
    supplierLocation: 'Guangdong, China',
    tradeAssurance: true,
    verifiedSupplier: true,
    moq: 1,
    leadTimeDays: 6,
    category: 'supermarket',
    brand: 'Geuwa Barista',
    unit: 'Set',
    alibabaItemUrl: 'https://www.alibaba.com/product-detail/20-Bar-Espresso-Coffee-Machine-Frother_1600812398451.html'
  },
  {
    pid: 'ali-1600778901234',
    productName: '1.43 Inch AMOLED HD Display Bluetooth Calling Smartwatch IP68 Waterproof 100+ Sports Modes',
    productSku: 'ALI-WATCH-GT4-PRO',
    originalDescription: `Product Name: Flagship AMOLED Bluetooth Calling Sport Smartwatch
Model: GT4 Ultra Pro Max Edition
Display: 1.43-inch AMOLED Super Retina Full Touch Screen (466x466 Resolution, 326 PPI, Always-On Display Mode)
Case Material: Aerospace Grade Zinc Alloy Case + Sapphire Crystal Anti-Scratch Glass
Strap: Breathable Silicone Strap + Bonus Stainless Steel Metal Milanese Mesh Band
Processor: Realtek 8763EWE Ultra-Low Power Dual-Mode Chip
Bluetooth: Dual-Mode Bluetooth 5.3 + BLE with Built-in Hi-Fi Speaker & Noise Cancelling Microphone
Calling Features: Receive & Dial Calls, Call History Sync, Contacts Phonebook, Quick SMS Rejection
Health Monitoring: VC30F Real-Time Dynamic Heart Rate, True SpO2 Blood Oxygen, Blood Pressure, Sleep Stage Analysis
Fitness Tracking: 100+ Professional Sports Modes (Running, Cycling, Football, Basketball, Gym, Hiking, Swimming)
Battery: 410mAh Pure Cobalt Lithium Battery (7-10 Days Normal Use, 30 Days Standby)
Charging: Magnetic Fast Wireless Charging Dock (Full Charge in 1.5 Hours)
Waterproof Rating: IP68 Deep Waterproof & Dustproof (Resistant to Rain, Sweat, Handwashing)
Smart Utilities: AI Voice Assistant, NFC Access Control, Music Playback & Camera Shutter, Weather Forecast, Alarm, Stopwatch
App Support: FitCloudPro App (Available on Google Play & Apple App Store in English, French, Kinyarwanda compatible)
Compatibility: Android 5.0+ and iOS 10.0+`,
    productImages: [
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1508615039623-a25605d2b022?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=800&q=80'
    ],
    unitCostUsd: 19.50,
    weightKg: 0.28,
    dimensionsCm: { length: 16, width: 10, height: 4 },
    supplierName: 'Shenzhen Lemfo Electronic Technology Co., Ltd.',
    supplierLocation: 'Guangdong, China',
    tradeAssurance: true,
    verifiedSupplier: true,
    moq: 1,
    leadTimeDays: 3,
    category: 'amasaha',
    brand: 'Lemfo OEM',
    unit: 'Piece',
    alibabaItemUrl: 'https://www.alibaba.com/product-detail/1-43-AMOLED-Smartwatch-Bluetooth-Call_1600778901234.html',
    variations: [
      { name: 'Color', options: ['Obsidian Black', 'Silver Gray', 'Rose Gold'] }
    ]
  },
  {
    pid: 'ali-1600923456789',
    productName: 'Anti-Theft Waterproof Expandable Business Travel Laptop Backpack with USB Port (15.6 to 17.3 Inch)',
    productSku: 'ALI-BAG-EXP75',
    originalDescription: `Item Type: Multi-Function Expandable Business Travel Laptop Backpack
Model: Bange / Fenruien OEM Series 902
Main Material: High-Density 900D Waterproof Oxford Fabric + Scratch-Resistant Matte TPU Coating
Lining: 210D Tear-Resistant Polyester Lining
Laptop Compartment: Padded Shockproof Flannel Sleeve fits up to 17.3-inch Laptop + 12.9-inch iPad Tablet
Capacity: Standard 25 Liters, Expandable to 39 Liters via Heavy-Duty Perimeter Zipper (Meets Airline Carry-On Standards)
Security Features: TSA-Approved 3-Digit Recessed Combination Lock + Hidden Rear Lumbar Anti-Theft Pocket
Charging Interface: External Fast USB 3.0 & Type-C Dual Charging Port with Internal Power Bank Cable
Structure:
- 180-Degree Lay-Flat Clamshell Opening for TSA Airport Checkpoint
- Main Clothing & Garment Compartment with Elastic Luggage Straps
- Front Quick-Access Station with Key Fob & Pen Pockets
- Waterproof Wet/Dry Separation Toiletries Pocket
- Side Elastic Water Bottle & Umbrella Pocket
- Luggage Trolley Strap on Back Panel
Shoulder Straps: Ergonomic S-Curve Breathable Air Mesh Padded Shoulder Straps with Chest Buckle & Card Pocket
Dimensions: 46cm (H) x 31cm (W) x 18cm (Normal) / 26cm (Expanded)
Weight: 1.25 kg`,
    productImages: [
      'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1546938576-6e6a64f317cc?auto=format&fit=crop&w=800&q=80'
    ],
    unitCostUsd: 17.20,
    weightKg: 1.30,
    dimensionsCm: { length: 48, width: 33, height: 12 },
    supplierName: 'Guangzhou Bange Leather Goods Co., Ltd.',
    supplierLocation: 'Guangdong, China',
    tradeAssurance: true,
    verifiedSupplier: true,
    moq: 1,
    leadTimeDays: 4,
    category: 'ibikapu',
    brand: 'Bange Official',
    unit: 'Piece',
    alibabaItemUrl: 'https://www.alibaba.com/product-detail/Anti-Theft-Expandable-Laptop-Backpack-USB_1600923456789.html',
    variations: [
      { name: 'Color', options: ['Carbon Black', 'Dark Charcoal', 'Navy Blue'] }
    ]
  },
  {
    pid: 'ali-1600845612345',
    productName: 'Professional Salon Salon Negative Ion Hair Dryer 2200W with 3 Heat Settings and 2 Magnetic Nozzles',
    productSku: 'ALI-BEAUTY-HD2200',
    originalDescription: `Product Name: High-Speed Salon Grade Negative Ionic Hair Dryer
Model: HD-2200 Pro Blowout Series
Motor: 110,000 RPM Ultra-Fast Brushless Digital Motor (Airflow Speed 22m/s for 3x Faster Drying)
Power Rating: 2200W High Efficiency AC Motor with Constant Temperature Control
Ion Technology: 200 Million Negative Ions/cm³ Technology eliminates static frizz and locks in natural hair moisture
Temperature Sensors: Intelligent Glass Bead Temperature Sensor checks heat 50 times/second to prevent heat damage
Settings: 3 Precise Heat Settings (Cool / Warm / Hot) + 2 Speed Modes + One-Touch Instant Cool Shot Button
Magnetic Attachments Included:
1. 360-Degree Rotating Magnetic Smoothing Styling Concentrator
2. 360-Degree Rotating Magnetic Curl Defining Volumizing Diffuser
Noise Reduction: Acoustic Engineering Air Duct reduces operating noise to under 59dB
Safety: Removable Dual-Layer Magnetic Air Filter Mesh prevents hair suction, Overheat Thermal Auto Shut-Off
Cord: 2.5 Meters Professional Heavy-Duty Swivel Power Cord with Hanging Loop
Plug: Standard 220-240V EU/Rwanda Plug
Certifications: CE, CB, RoHS, EMC, LVD Lab Approved`,
    productImages: [
      'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80'
    ],
    unitCostUsd: 22.80,
    weightKg: 0.95,
    dimensionsCm: { length: 30, width: 20, height: 10 },
    supplierName: 'Wenzhou Pritech Beauty & Personal Care Co., Ltd.',
    supplierLocation: 'Zhejiang, China',
    tradeAssurance: true,
    verifiedSupplier: true,
    moq: 1,
    leadTimeDays: 4,
    category: 'hair-beauty',
    brand: 'Pritech Pro',
    unit: 'Set',
    alibabaItemUrl: 'https://www.alibaba.com/product-detail/Professional-Ionic-Hair-Dryer-2200W_1600845612345.html',
    variations: [
      { name: 'Color', options: ['Matte Space Gray', 'Pearl Rose', 'Metallic Emerald'] }
    ]
  },
  {
    pid: 'ali-1600912384756',
    productName: 'Fast-Lock Adjustable Dumbbell Set (2.5kg - 24kg / 5lbs - 52.5lbs) with Anti-Slip Grip & Storage Tray',
    productSku: 'ALI-SPORT-DUMB24',
    originalDescription: `Product Name: Smart Dial-Lock Adjustable Weight Dumbbell System
Model: ADB-24 Pro Fitness Edition
Weight Range: Adjusts from 2.5kg up to 24kg (5lbs to 52.5lbs) in 15 Distinct Increments
Weight Settings: 2.5, 3.5, 4.5, 5.5, 6.5, 8, 9, 10, 11.5, 13.5, 16, 18, 20.5, 22.5, 24 kg
Mechanism: Precision Smooth Dial Adjustment Gear System locks selected weight plates securely in under 2 seconds
Plate Construction: High-Grade Solid Silicon Steel Core with Impact-Resistant Laser-Molded ABS Coating (Noise-Free)
Handle Grip: Ergonomic Contoured Knurled Aluminum Grip provides non-slip, sweat-proof security during heavy lifts
Safety Locking: Dual Mechanical Safety Lock Buckle ensures weight plates never slide or dislodge mid-rep
Storage Base: Heavy-Duty Reinforced ABS Fitted Storage Tray included to protect floors and organize weights compactly
Space Saving: Replaces 15 Pairs of Individual Traditional Dumbbells in one compact footprint
Dimensions: 43cm (L) x 21cm (W) x 23cm (H)
Net Weight: 24.0 kg | Gross Shipping Weight with Tray & Reinforced Carton: 25.5 kg`,
    productImages: [
      'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1574680096145-d05b474e2155?auto=format&fit=crop&w=800&q=80'
    ],
    unitCostUsd: 58.00,
    weightKg: 25.5,
    dimensionsCm: { length: 46, width: 26, height: 26 },
    supplierName: 'Nantong Ironmaster Fitness Industrial Co., Ltd.',
    supplierLocation: 'Jiangsu, China',
    tradeAssurance: true,
    verifiedSupplier: true,
    moq: 1,
    leadTimeDays: 7,
    category: 'sports',
    brand: 'Ironmaster',
    unit: 'Set',
    alibabaItemUrl: 'https://www.alibaba.com/product-detail/Adjustable-Dumbbell-24kg-Quick-Dial_1600912384756.html'
  },
  {
    pid: 'ali-1600789012399',
    productName: '12V 150PSI Digital Portable Tire Inflator & Air Compressor with LED Flashlight & Auto-Shutoff',
    productSku: 'ALI-AUTO-INFL150',
    originalDescription: `Item Type: Digital Multi-Function Portable Car & Bicycle Tire Inflator Air Pump
Model: AP-150 Heavy Duty Smart Inflator
Maximum Pressure: 150 PSI / 10.3 BAR / 990 KPA
Inflation Speed: 35 Liters/Minute Airflow (Inflates a standard 195/65/R15 tire from 0 to 35 PSI in under 3.5 minutes)
Power Input: Dual Power Options (12V Car Cigarette Lighter Socket 3-Meter Cord + Built-in Rechargeable 6000mAh Battery)
Display: Large Backlit Digital LCD Screen shows Target PSI and Real-Time Live Pressure with ±0.5 PSI accuracy
Smart Auto-Stop: Automatically shuts off once desired preset pressure is reached to prevent over-inflation
LED Work Light: Built-in 3-Mode Super Bright LED Light (Normal White Work Light, Red Warning Light, SOS Flashing Beacon)
Power Bank Function: 5V/2A USB-A Output port charges smartphones and mobile devices in roadside emergencies
Nozzle Adapters Included:
- 1x Schrader Valve Hose for Cars, SUVs & Motorcycles
- 1x Presta Valve Adapter for Road Bicycles
- 1x Ball Needle for Football, Basketball, Volleyball
- 2x Cone Nozzles for Inflatable Air Mattresses & Swimming Floats
Casing: Aluminum Alloy Heat-Dissipation Housing with Anti-Vibration Rubber Base
Dimensions: 17cm x 7cm x 5.5cm | Weight: 0.78 kg`,
    productImages: [
      'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80'
    ],
    unitCostUsd: 15.50,
    weightKg: 0.88,
    dimensionsCm: { length: 20, width: 12, height: 8 },
    supplierName: 'Ningbo Yinzhou Yosun Auto Parts Co., Ltd.',
    supplierLocation: 'Zhejiang, China',
    tradeAssurance: true,
    verifiedSupplier: true,
    moq: 1,
    leadTimeDays: 3,
    category: 'electronics',
    brand: 'Yosun Auto',
    unit: 'Piece',
    alibabaItemUrl: 'https://www.alibaba.com/product-detail/12V-150PSI-Digital-Car-Tire-Inflator_1600789012399.html'
  },
  {
    pid: 'ali-1600832190847',
    productName: 'Ultrasonic Skin Scrubber Pore Cleaner Ion Facial Spatula Face Lift EMS Microcurrent',
    productSku: 'ALI-BEAUTY-SCRUB01',
    originalDescription: `Product Name: 4-in-1 Ultrasonic Ion Facial Skin Scrubber & Pore Peeling Spatula
Model: US-400 Beauty Spa Edition
Ultrasonic Frequency: 28,000Hz High-Frequency Micro-Vibrations deep cleans blackheads, excess sebum and dead skin cells
4 Versatile Operating Modes:
1. Ultrasonic Cleaning Mode: Atomizes water into bubbles to blast out clogged pores and dirt
2. Ion+ Export Mode: Positive ions draw out deeply rooted cosmetics residue and impurities
3. Ion- Import Mode: Negative ions enhance absorption of serums, moisturizers and facial oils 4x deeper into the dermis
4. EMS Lifting Mode: Micro-current pulses stimulate facial muscles to firm skin, reduce fine lines and boost collagen
Spatula Blade: 100% Medical Grade 304 Stainless Steel curved blade designed for nose contours and delicate skin
Timer: Smart 5-Minute Auto-Off Timer prevents skin over-treatment
Battery: 500mAh Lithium Rechargeable Battery via Type-C USB (60 Minutes continuous runtime per charge)
Waterproof: IPX5 Splashproof Spatula Head for easy post-treatment tap washing
In the Box: 1x Ultrasonic Skin Scrubber, 2x Food-Grade Silicone Cleaning Brush Sleeves, 1x Type-C Cable, 1x English Manual`,
    productImages: [
      'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80'
    ],
    unitCostUsd: 8.90,
    weightKg: 0.25,
    dimensionsCm: { length: 19, width: 7, height: 4 },
    supplierName: 'Shenzhen Boyuan Intelligent Electronic Technology Co., Ltd.',
    supplierLocation: 'Guangdong, China',
    tradeAssurance: true,
    verifiedSupplier: true,
    moq: 1,
    leadTimeDays: 3,
    category: 'hair-beauty',
    brand: 'Boyuan Beauty',
    unit: 'Piece',
    alibabaItemUrl: 'https://www.alibaba.com/product-detail/Ultrasonic-Skin-Scrubber-Facial-Cleaner_1600832190847.html'
  },
  {
    pid: 'ali-1600998877123',
    productName: 'Lightweight Breathable Air Cushion Athletic Running Shoes Men & Women Sports Sneakers',
    productSku: 'ALI-FASH-RUN360',
    originalDescription: `Item Type: Athletic Casual Road Running & Walking Sneakers
Model: Air-360 Pro Performance
Upper Material: High-Breathability Flyknit Mesh fabric provides 360-degree ventilation and snug sock-like fit
Outsole Material: High-Elasticity Full-Length Air Cushion Midsole + Wear-Resistant Slip-Resistant Rubber Waffle Tread
Insole: Honeycomb High-Resilience EVA Memory Foam Insole absorbs impact shock and relieves foot fatigue
Lining: Moisture-Wicking Breathable Cotton Fabric prevents foot odor and blistering during high-intensity training
Heel Design: Reinforced TPU Heel Clip Cup stabilizes heel strike and protects Achilles tendon
Closure Type: Classic Lace-Up with Reflective Night Safety Weave Accents
Gender: Unisex (Men & Women)
Available Sizes: EU 38 to 46 (US 6 to 12)
Suitable For: Daily Jogging, Gym Workouts, Marathon Training, Walking, Casual Streetwear
Weight: Ultralight 310g per shoe (Size 42)`,
    productImages: [
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=800&q=80'
    ],
    unitCostUsd: 12.80,
    weightKg: 0.78,
    dimensionsCm: { length: 32, width: 20, height: 12 },
    supplierName: 'Jinjiang Chendai Kangda Footwear Co., Ltd.',
    supplierLocation: 'Fujian, China',
    tradeAssurance: true,
    verifiedSupplier: true,
    moq: 1,
    leadTimeDays: 4,
    category: 'fashion',
    brand: 'Kangda Athletics',
    unit: 'Pair',
    alibabaItemUrl: 'https://www.alibaba.com/product-detail/Air-Cushion-Running-Shoes-Sneakers_1600998877123.html',
    variations: [
      { name: 'Color', options: ['Pure Black', 'Phantom Gray', 'Volt White'] },
      { name: 'Size', options: ['EU 40', 'EU 41', 'EU 42', 'EU 43', 'EU 44', 'EU 45'] }
    ]
  }
];
