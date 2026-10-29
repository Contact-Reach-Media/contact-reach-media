const fs = require('fs');
const path = require('path');

const NEW_CJ_ITEMS = [
  {
    pid: 'cj-mag-powerbank-10k-18',
    productName: '10,000mAh Ultra-Slim Magnetic Qi Wireless Fast Power Bank 20W with Digital Display',
    productSku: 'CJ-ELEC-PB10K-18',
    productImage: 'https://images.unsplash.com/photo-1609592424364-c7e6c46927e1?auto=format&fit=crop&w=800&q=80',
    productImageSet: [
      'https://images.unsplash.com/photo-1609592424364-c7e6c46927e1?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=800&q=80'
    ],
    sellPrice: 14.20,
    description: 'Ultra-strong magnetic snap-on wireless power bank with 20W PD Type-C fast output. Real-time LED battery percentage display and airline-approved compact aviation aluminum casing.',
    category: 'electronics',
    brand: 'MagVolt',
    unit: 'Piece',
    variations: [
      { name: 'Color', options: ['Obsidian Black', 'Alpine White', 'Ocean Blue'] }
    ]
  },
  {
    pid: 'cj-vert-rgb-mouse-19',
    productName: 'Ergonomic Vertical Wireless Optical Mouse with RGB Backlight & Silent Click',
    productSku: 'CJ-ELEC-VMSE-19',
    productImage: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=800&q=80',
    productImageSet: [
      'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=800&q=80'
    ],
    sellPrice: 8.90,
    description: 'Natural handshake 57-degree vertical ergonomic design reducing forearm tension. Dual 2.4G & Bluetooth connectivity with 3-level DPI switch (1000/1600/2400) and rechargeable battery.',
    category: 'electronics',
    brand: 'ErgoTech',
    unit: 'Piece',
    variations: [
      { name: 'Color', options: ['Matte Black', 'Pearl Grey'] }
    ]
  },
  {
    pid: 'cj-1080p-mini-projector-20',
    productName: 'Smart Portable Full HD 1080P Home Theater Mini Projector with WiFi & Screen Mirroring',
    productSku: 'CJ-ELEC-PROJ-20',
    productImage: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=800&q=80',
    productImageSet: [
      'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1535016120720-40c646be5580?auto=format&fit=crop&w=800&q=80'
    ],
    sellPrice: 38.50,
    description: 'Supports up to 200-inch projection with 9500 lumens brightness and built-in stereo HiFi speaker. Seamless wireless cast from Android, iPhone, and laptop. Includes HDMI and remote control.',
    category: 'electronics',
    brand: 'VisionBeam',
    unit: 'Set'
  },
  {
    pid: 'cj-rgbic-floor-lamp-21',
    productName: 'Minimalist Smart RGBIC Corner Floor Lamp with Voice & Music Rhythm Sync',
    productSku: 'CJ-LGT-FLR-21',
    productImage: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=80',
    productImageSet: [
      'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=80'
    ],
    sellPrice: 19.80,
    description: 'Sleek 140cm modern corner ambient floor lamp with dynamic segmented RGBIC color chasing. Smartphone app and wireless RF remote control with 16 million colors and timer functions.',
    category: 'amatara',
    brand: 'LumiAura',
    unit: 'Piece'
  },
  {
    pid: 'cj-shower-bluetooth-speaker-22',
    productName: 'IPX7 Waterproof Bluetooth 5.3 Portable Shower Speaker with Heavy Bass & Suction Cup',
    productSku: 'CJ-ELEC-SPK-22',
    productImage: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=800&q=80',
    productImageSet: [
      'https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=800&q=80'
    ],
    sellPrice: 9.50,
    description: 'Fully submergible waterproof speaker with 5W crystal clear audio driver and passive radiator. Detachable suction cup for tiles and glass. Built-in hands-free mic and 10h battery life.',
    category: 'electronics',
    brand: 'AcousticPro',
    unit: 'Piece',
    variations: [
      { name: 'Color', options: ['Aqua Teal', 'Midnight Black', 'Electric Orange'] }
    ]
  },
  {
    pid: 'cj-dual-lavalier-mic-23',
    productName: 'Dual Wireless Lavalier Lapel Microphone for Type-C & iPhone (Plug & Play Noise Reduction)',
    productSku: 'CJ-ELEC-MIC-23',
    productImage: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80',
    productImageSet: [
      'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80'
    ],
    sellPrice: 12.30,
    description: '2-Transmitter professional clip-on microphone set for TikTok, YouTube, interviews, and live streaming. Auto-sync real-time DSP intelligent noise cancellation with 20m transmission range.',
    category: 'electronics',
    brand: 'VocalClear',
    unit: 'Set',
    variations: [
      { name: 'Connector', options: ['USB-C (Android / iPad)', 'Lightning (iPhone)'] }
    ]
  },
  {
    pid: 'cj-amoled-bt-call-watch-24',
    productName: 'AMOLED 1.43-inch Always-On Display Bluetooth Calling Smartwatch with Heart Rate & NFC',
    productSku: 'CJ-WCH-AMOLED-24',
    productImage: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&w=800&q=80',
    productImageSet: [
      'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&w=800&q=80'
    ],
    sellPrice: 24.80,
    description: '466x466 high-resolution AMOLED display with zinc alloy bezel. Supports Bluetooth hands-free phone calls, AI voice assistant, 100+ fitness workout modes, and continuous health monitoring.',
    category: 'amasaha',
    brand: 'PulseGear',
    unit: 'Piece',
    variations: [
      { name: 'Strap Color', options: ['Midnight Black Leather', 'Titanium Steel', 'Orange Silicone'] }
    ]
  },
  {
    pid: 'cj-military-rugged-watch-25',
    productName: 'Rugged Military Outdoor Tactical Smartwatch 5ATM Waterproof with Compass & Flashlight',
    productSku: 'CJ-WCH-RUG-25',
    productImage: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80',
    productImageSet: [
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80'
    ],
    sellPrice: 22.50,
    description: 'Reinforced anti-drop carbon composite case with Gorilla Glass protection. 50m waterproof rating, built-in dual LED emergency flashlight, barometric altimeter, and 400mAh long-standby battery.',
    category: 'amasaha',
    brand: 'ApexTactical',
    unit: 'Piece',
    variations: [
      { name: 'Color', options: ['Camouflage Green', 'Tactical Black', 'Sand Desert'] }
    ]
  },
  {
    pid: 'cj-expandable-flight-backpack-26',
    productName: '40L Expandable Waterproof Flight Carry-On Travel Laptop Backpack with Shoe Compartment',
    productSku: 'CJ-BAG-EXP40-26',
    productImage: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80',
    productImageSet: [
      'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80'
    ],
    sellPrice: 22.00,
    description: 'Airline approved 180-degree flat opening design for quick security checks. High-density water-resistant nylon, separate ventilated sneaker pocket, wet-dry separation bag, and fits up to 17-inch laptops.',
    category: 'ibikapu',
    brand: 'UrbanCraft',
    unit: 'Piece',
    variations: [
      { name: 'Color', options: ['Matte Black', 'Heather Navy', 'Army Green'] }
    ]
  },
  {
    pid: 'cj-oxford-men-sling-bag-27',
    productName: 'Waterproof Oxford Crossbody Chest Sling Bag with Anti-Theft Lock & USB Charging Port',
    productSku: 'CJ-BAG-SLING-27',
    productImage: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=80',
    productImageSet: [
      'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=80'
    ],
    sellPrice: 9.20,
    description: 'Lightweight urban shoulder bag with TSA password combination lock, hidden anti-cut card slots, external USB port, and breathable honeycomb back padding for daily commute.',
    category: 'ibikapu',
    brand: 'UrbanCraft',
    unit: 'Piece',
    variations: [
      { name: 'Color', options: ['Carbon Black', 'Slate Grey', 'Dark Blue'] }
    ]
  },
  {
    pid: 'cj-vintage-canvas-messenger-28',
    productName: 'Vintage Waterproof Waxed Canvas Leather Messenger Shoulder Bag for Men',
    productSku: 'CJ-BAG-VNT-28',
    productImage: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80',
    productImageSet: [
      'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80'
    ],
    sellPrice: 26.00,
    description: 'Heavy-duty 16oz waterproof waxed canvas with genuine crazy horse leather accents and brass hardware. Padded shockproof sleeve fits 15.6-inch laptop with classic buckle magnetic closure.',
    category: 'ibikapu',
    brand: 'HeritageCraft',
    unit: 'Piece',
    variations: [
      { name: 'Color', options: ['Coffee Brown', 'Khaki Tan', 'Military Green'] }
    ]
  },
  {
    pid: 'cj-luxury-quilted-handbag-29',
    productName: 'Luxury Quilted Vegan Leather Women Crossbody Handbag with Gold Chain Strap',
    productSku: 'CJ-BAG-LUX-29',
    productImage: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80',
    productImageSet: [
      'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80'
    ],
    sellPrice: 18.50,
    description: 'Premium chevron quilted leather with polished gold-tone turn-lock hardware. Multi-way convertible sliding chain strap for shoulder and crossbody wear. Fits phone, wallet, cosmetics.',
    category: 'ibikapu',
    brand: 'EleganceParis',
    unit: 'Piece',
    variations: [
      { name: 'Color', options: ['Classic Black', 'Beige Cream', 'Emerald Green', 'Burgundy Red'] }
    ]
  },
  {
    pid: 'cj-diaper-bed-backpack-30',
    productName: 'Multi-Functional Baby Diaper Backpack with Foldable Bassinet Bed & Sun Shade',
    productSku: 'CJ-KID-DIAP-30',
    productImage: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=800&q=80',
    productImageSet: [
      'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=800&q=80'
    ],
    sellPrice: 21.50,
    description: 'Transforms in 60 seconds into a comfortable baby travel crib with soft mattress and mosquito net. Includes 3 insulated aluminum foil milk bottle warmers, waterproof wipe pocket, stroller hooks.',
    category: 'abana',
    brand: 'CozyCuddle',
    unit: 'Piece',
    variations: [
      { name: 'Color', options: ['Light Grey', 'Midnight Navy', 'Pastel Pink'] }
    ]
  },
  {
    pid: 'cj-5in1-hot-air-styler-31',
    productName: '5-in-1 Professional Hot Air Hair Styler & Curler Volumizer Blowout Brush',
    productSku: 'CJ-BTY-5IN1-31',
    productImage: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80',
    productImageSet: [
      'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80'
    ],
    sellPrice: 27.00,
    description: 'Interchangeable styling tool combining high-speed hairdryer, left/right auto-wrap air curlers, straightening smoothing brush, and round volumizing brush with negative ion anti-frizz technology.',
    category: 'hair-beauty',
    brand: 'SilkSalon',
    unit: 'Set',
    variations: [
      { name: 'Color', options: ['Rose Gold / Grey', 'Fuchsia / Nickel'] }
    ]
  },
  {
    pid: 'cj-cordless-hair-straightener-32',
    productName: 'Cordless Portable Ceramic Hair Straightener Brush with Anti-Scald Comb Teeth',
    productSku: 'CJ-BTY-STRT-32',
    productImage: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=800&q=80',
    productImageSet: [
      'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=800&q=80'
    ],
    sellPrice: 16.80,
    description: 'Compact rechargeable heated smoothing brush with 3 temperature settings (160C, 180C, 200C). Rapid 30-second MCH ceramic heating and fits right in handbag for on-the-go styling.',
    category: 'hair-beauty',
    brand: 'SilkSalon',
    unit: 'Piece',
    variations: [
      { name: 'Color', options: ['Pearl White', 'Blush Pink', 'Obsidian Black'] }
    ]
  },
  {
    pid: 'cj-led-photon-facial-mask-33',
    productName: '7-Color LED Photon Therapy Facial Rejuvenation & Anti-Aging Collagen Light Mask',
    productSku: 'CJ-BTY-LEDMSK-33',
    productImage: 'https://images.unsplash.com/photo-1512290900672-1f558a2c9763?auto=format&fit=crop&w=800&q=80',
    productImageSet: [
      'https://images.unsplash.com/photo-1512290900672-1f558a2c9763?auto=format&fit=crop&w=800&q=80'
    ],
    sellPrice: 25.40,
    description: 'Clinically proven photodynamic wavelengths (Red for collagen, Blue for acne, Green for pigmentation, Yellow, Cyan, Purple, Laser White). Wireless lightweight design with eye protection goggles.',
    category: 'hair-beauty',
    brand: 'GlowSkin',
    unit: 'Piece'
  },
  {
    pid: 'cj-heated-eyelash-curler-34',
    productName: 'Rechargeable Fast Electric Heated Eyelash Curler with Silicone Temperature Pad',
    productSku: 'CJ-BTY-CURL-34',
    productImage: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80',
    productImageSet: [
      'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80'
    ],
    sellPrice: 5.80,
    description: 'Gentle 10-second fast preheat temperature sensing silicone comb. Delivers 24-hour lifted and curled lashes without pinching or burning eyelids. USB-C rechargeable with auto shutoff.',
    category: 'hair-beauty',
    brand: 'GlowSkin',
    unit: 'Piece',
    variations: [
      { name: 'Color', options: ['White', 'Soft Pink'] }
    ]
  },
  {
    pid: 'cj-orthopedic-walking-sneakers-35',
    productName: 'Men Ultra-Lightweight Breathable Air Cushion Orthopedic Walking Shoes',
    productSku: 'CJ-FSH-ORTH-35',
    productImage: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80',
    productImageSet: [
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80'
    ],
    sellPrice: 18.00,
    description: 'Flyknit breathable upper with anatomical arch support insole. Visible air bubble midsole cushioning relieves foot fatigue and heel pressure. Non-slip grooved rubber traction outsole.',
    category: 'fashion',
    brand: 'StrideFit',
    unit: 'Pair',
    variations: [
      { name: 'Size', options: ['40', '41', '42', '43', '44', '45'] },
      { name: 'Color', options: ['All Black', 'Navy Grey', 'Carbon Red'] }
    ]
  },
  {
    pid: 'cj-sun-uv-jacket-36',
    productName: 'UPF 50+ Sun Protection Ultra-Thin Quick-Dry Hooded Windbreaker Jacket',
    productSku: 'CJ-FSH-UVJKT-36',
    productImage: 'https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=800&q=80',
    productImageSet: [
      'https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=800&q=80'
    ],
    sellPrice: 10.50,
    description: 'Blocks 99% of harmful UVA/UVB rays with breathable cooling ice-silk fabric. Packable featherlight jacket with zippered pockets, thumb holes, and adjustable brim hood for sports & outdoor.',
    category: 'fashion',
    brand: 'AeroShield',
    unit: 'Piece',
    variations: [
      { name: 'Size', options: ['M', 'L', 'XL', 'XXL'] },
      { name: 'Color', options: ['Ice Blue', 'Glacier Grey', 'Arctic White', 'Midnight Black'] }
    ]
  },
  {
    pid: 'cj-seamless-workout-leggings-37',
    productName: 'Women High-Waist Seamless Squat-Proof Tummy Control Yoga Leggings',
    productSku: 'CJ-FSH-LEGG-37',
    productImage: 'https://images.unsplash.com/photo-1506619216599-9d16d0903dfd?auto=format&fit=crop&w=800&q=80',
    productImageSet: [
      'https://images.unsplash.com/photo-1506619216599-9d16d0903dfd?auto=format&fit=crop&w=800&q=80'
    ],
    sellPrice: 8.90,
    description: '4-way stretch buttery-soft compression knit fabric. Wide ribbed waistband contours curves without rolling down. 100% squat-proof, non-see-through, moisture-wicking athletic tights.',
    category: 'fashion',
    brand: 'ActiveCurve',
    unit: 'Piece',
    variations: [
      { name: 'Size', options: ['S', 'M', 'L', 'XL'] },
      { name: 'Color', options: ['Charcoal Black', 'Sage Green', 'Berry Plum', 'Cobalt Blue'] }
    ]
  },
  {
    pid: 'cj-electric-garlic-chopper-38',
    productName: 'Wireless USB Electric Garlic & Vegetable Mini Food Processor 250ml',
    productSku: 'CJ-KTN-CHOP-38',
    productImage: 'https://images.unsplash.com/photo-1570222094114-d054a817e56b?auto=format&fit=crop&w=800&q=80',
    productImageSet: [
      'https://images.unsplash.com/photo-1570222094114-d054a817e56b?auto=format&fit=crop&w=800&q=80'
    ],
    sellPrice: 6.80,
    description: 'One-touch electric vegetable chopper with 3 reinforced 304 stainless steel blades. Chops garlic, onions, ginger, chili, meat, and nuts in 10 seconds. Waterproof cup for easy cleaning.',
    category: 'supermarket',
    brand: 'FreshBlend',
    unit: 'Piece',
    variations: [
      { name: 'Color', options: ['Mint Green', 'Snow White'] }
    ]
  },
  {
    pid: 'cj-motion-sensor-night-light-39',
    productName: 'Magnetic Ultra-Thin Wireless Motion Sensor LED Closet & Cabinet Bar Lights (3-Pack)',
    productSku: 'CJ-LGT-CAB-39',
    productImage: 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&w=800&q=80',
    productImageSet: [
      'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&w=800&q=80'
    ],
    sellPrice: 12.80,
    description: 'Sleek 9mm aluminum profile with magnetic adhesive strip. PIR infrared sensor detects movement up to 3 meters in dark. USB rechargeable battery lasts 60 days on motion-detect mode.',
    category: 'amatara',
    brand: 'LumiAura',
    unit: 'Pack',
    variations: [
      { name: 'Light Temperature', options: ['Warm White (3000K)', 'Cool White (6000K)'] }
    ]
  },
  {
    pid: 'cj-flame-aroma-diffuser-40',
    productName: 'Ultrasonic Flame Aroma Essential Oil Diffuser & Humidifier with Fire Effect LED',
    productSku: 'CJ-HOM-FLAME-40',
    productImage: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=800&q=80',
    productImageSet: [
      'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=800&q=80'
    ],
    sellPrice: 14.50,
    description: 'Realistic simulated fire flame effect using LED lighting and cold ultrasonic vapor mist. Ultra-quiet 20dB operation with waterless automatic safety shutoff. Aromatherapy essential oil ready.',
    category: 'amatara',
    brand: 'AromaMist',
    unit: 'Piece',
    variations: [
      { name: 'Body Color', options: ['Matte Black', 'Ceramic White'] }
    ]
  },
  {
    pid: 'cj-digital-kitchen-scale-41',
    productName: 'Precision Electronic Stainless Steel Digital Kitchen Food Scale 5kg / 1g',
    productSku: 'CJ-KTN-SCAL-41',
    productImage: 'https://images.unsplash.com/photo-1584269600519-112d071b35e6?auto=format&fit=crop&w=800&q=80',
    productImageSet: [
      'https://images.unsplash.com/photo-1584269600519-112d071b35e6?auto=format&fit=crop&w=800&q=80'
    ],
    sellPrice: 7.20,
    description: 'Anti-fingerprint brushed stainless steel weighing platform with high-precision strain gauge sensors. One-touch zero tare deduction and unit toggle (g, kg, oz, lb, ml). Backlit LCD display.',
    category: 'supermarket',
    brand: 'ChefScale',
    unit: 'Piece'
  },
  {
    pid: 'cj-lcd-drawing-tablet-42',
    productName: '10-Inch Color LCD Writing & Drawing Doodle Tablet with Stylus for Kids',
    productSku: 'CJ-KID-TAB-42',
    productImage: 'https://images.unsplash.com/photo-1535378917042-10a22c95931a?auto=format&fit=crop&w=800&q=80',
    productImageSet: [
      'https://images.unsplash.com/photo-1535378917042-10a22c95931a?auto=format&fit=crop&w=800&q=80'
    ],
    sellPrice: 6.50,
    description: 'Eye-protection radiation-free rainbow LCD screen. One-click instant erase button with anti-accidental erase lock switch. Zero paper waste for math practice, drawing, and spelling.',
    category: 'abana',
    brand: 'DoodlePlay',
    unit: 'Piece',
    variations: [
      { name: 'Frame Color', options: ['Ocean Blue', 'Candy Pink', 'Mint Green'] }
    ]
  },
  {
    pid: 'cj-smart-robot-dog-43',
    productName: 'Voice & Remote Control Smart Interactive Robotic Puppy with Stunt Acrobatics',
    productSku: 'CJ-KID-DOG-43',
    productImage: 'https://images.unsplash.com/photo-1535378917042-10a22c95931a?auto=format&fit=crop&w=800&q=80',
    productImageSet: [
      'https://images.unsplash.com/photo-1535378917042-10a22c95931a?auto=format&fit=crop&w=800&q=80'
    ],
    sellPrice: 29.00,
    description: 'Programmable bionic robotic dog with chin touch sensor, musical dance routines, handstand stunts, and voice command recognition. Child-safe ABS durable non-toxic casing.',
    category: 'abana',
    brand: 'RoboPup',
    unit: 'Piece'
  },
  {
    pid: 'cj-toddler-busy-board-44',
    productName: 'Montessori Sensory Activity Wooden Busy Board for Toddler Motor Development',
    productSku: 'CJ-KID-BUSY-44',
    productImage: 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?auto=format&fit=crop&w=800&q=80',
    productImageSet: [
      'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?auto=format&fit=crop&w=800&q=80'
    ],
    sellPrice: 15.80,
    description: 'Natural smooth birch wood board equipped with real metal latch, zipper, shoe lace, gear wheels, switch, bell, and clock. Develops hand-eye coordination and problem-solving skills.',
    category: 'abana',
    brand: 'TinyMinds',
    unit: 'Piece'
  }
];

// 1. Load data/market_db.json
const dbPath = path.resolve('data/market_db.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
const usdRate = db.settings?.cjConfig?.usdToRwfRate || 1435;
const markupPercent = 40; // 40% markup requested

console.log(`Current products in DB: ${db.products.length}`);

// Ensure cjConfig settings
if (!db.settings.cjConfig) {
  db.settings.cjConfig = {};
}
db.settings.cjConfig.defaultMarkupPercent = 40;
db.settings.cjConfig.autoUploadEnabled = true;
db.settings.cjConfig.autoPublish = true;
db.settings.cjConfig.requireAdminApproval = false;

// Update existing products: ensure costPrice and price = costPrice * 1.40 (+40% of cost)
let updatedExisting = 0;
for (const p of db.products) {
  let cost = p.costPrice;
  if (typeof cost !== 'number' || isNaN(cost) || cost <= 0) {
    // Derive costPrice so that price was cost + 40%
    cost = Math.max(500, Math.round(p.price / 1.40));
    p.costPrice = cost;
  }
  // User requested: "all products which are in my website add 40% of cost"
  const newPrice = Math.round(cost * 1.40);
  p.price = newPrice;
  p.profitMargin = newPrice - cost;

  // Recalculate discount if applicable
  if (p.discountPercent && p.discountPercent > 0) {
    p.discountPrice = Math.round(newPrice * (1 - p.discountPercent / 100));
  } else if (p.discountPrice && p.discountPrice > 0) {
    if (p.discountPrice >= newPrice) {
      p.discountPrice = Math.round(newPrice * 0.85); // 15% promo
    }
    p.discountPercent = Math.round(((newPrice - p.discountPrice) / newPrice) * 100);
  }
  updatedExisting++;
}
console.log(`Updated pricing with +40% markup on cost for ${updatedExisting} existing products.`);

// Now add all new CJ products if not already in db.products
let addedCj = 0;
for (const item of NEW_CJ_ITEMS) {
  const prodId = 'prod-cj-' + item.pid;
  const existing = db.products.find(p => p.id === prodId || p.cjProductId === item.pid);
  const cost = Math.round(item.sellPrice * usdRate);
  const price = Math.round(cost * 1.40); // 40% of cost added
  const profitMargin = price - cost;

  if (!existing) {
    db.products.unshift({
      id: prodId,
      name: item.productName,
      sku: item.productSku,
      description: item.description,
      source: 'cjdropshipping',
      cjProductId: item.pid,
      cjProductSku: item.productSku,
      cjOriginalCostUsd: item.sellPrice,
      costPrice: cost,
      costOverriddenByAdmin: false,
      price: price,
      profitMargin: profitMargin,
      category: item.category,
      stock: 45,
      imageUrl: item.productImage,
      images: item.productImageSet || [item.productImage],
      shopName: 'CJ Dropshipping Fulfillment',
      shopId: 'shop-cj-dropshipping-fulfillment-3288',
      receiverName: 'Ruth',
      paymentMethods: ['MTN Mobile Money', 'MTN Merchant Code', 'Airtel Money'],
      merchantCode: '078002',
      receiverPhone: '078002260',
      location: 'Kigali Express / Global Dispatch',
      deliveryInfo: 'Kigali delivery within 24-48 hrs',
      status: 'Available',
      reviewStatus: 'Approved',
      isFeatured: addedCj < 5,
      isNewArrival: true,
      isBestSeller: addedCj % 3 === 0,
      brand: item.brand,
      unit: item.unit || 'Piece',
      variations: item.variations,
      rating: 5,
      reviewsCount: Math.floor(8 + Math.random() * 20),
      cjLastSyncAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      history: [{
        timestamp: new Date().toISOString(),
        action: 'Imported permanently from CJ Dropshipping curated feed (+40% cost markup)',
        user: 'Ruth (System Owner)'
      }]
    });
    addedCj++;
  } else {
    existing.costPrice = cost;
    existing.price = price;
    existing.profitMargin = profitMargin;
    existing.status = 'Available';
    existing.reviewStatus = 'Approved';
  }
}

console.log(`Added ${addedCj} new permanent CJ dropshipping products. Total products now: ${db.products.length}`);

// Write back to data/market_db.json
fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
console.log('Successfully saved to data/market_db.json!');
