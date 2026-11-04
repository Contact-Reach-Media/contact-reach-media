import { Category } from '../types.ts';

export interface CategoryNode {
  id: string; // e.g. "clothing", "clothing-womens"
  name: string; // English
  nameRw: string; // Kinyarwanda translation
  slug: string;
  parentId: string | null;
  level: 1 | 2 | 3;
  icon: string;
  image?: string;
  description?: string;
  sortOrder: number;
  active: boolean;
  subcategories?: CategorySubNode[];
  keywords?: string[];
}

export interface CategorySubNode {
  id: string;
  name: string;
  slug: string;
  parentId: string;
  level: 2;
  items: string[]; // Level 3 items/tags (e.g. Dresses, Blouses & Shirts)
  keywords?: string[];
}

export interface MainCategoryDefinition {
  id: string;
  name: string;
  nameRw: string;
  icon: string;
  image: string;
  description: string;
  sortOrder: number;
  subcategories: {
    name: string;
    items: string[];
    keywords?: string[];
  }[];
}

// 13 EXACT MAIN CATEGORIES AS SPECIFIED BY USER
export const MAIN_CATEGORY_DEFINITIONS: MainCategoryDefinition[] = [
  {
    id: 'clothing',
    name: 'Clothing',
    nameRw: 'Imyenda',
    icon: 'Shirt',
    image: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=500&q=80',
    description: "Women's & men's apparel, world fashion, sportswear, and clothing accessories.",
    sortOrder: 1,
    subcategories: [
      {
        name: "Women's Clothing",
        items: [
          'Dresses',
          'Blouses & Shirts',
          'Tops & Tees',
          'Jumpsuits & Rompers',
          'Intimates',
          "Women's Sets",
          'Pants & Capris',
          'Skirts',
          'Swimwear',
          'Coats & Jackets',
          'Shorts',
          'Socks & Hosiery',
          "Women's Sleep & Lounge",
          'Jeans',
          'Hoodies & Sweatshirts',
          'Active Tracksuits',
          'Blazers & Suits',
          'Leggings',
          'Sweaters',
          'Shapers & Bustiers'
        ],
        keywords: ['dress', 'blouse', 'skirt', 'jumpsuit', 'bra', 'legging', 'bustier', 'intimate', 'gown', 'female']
      },
      {
        name: "Men's Clothing",
        items: [
          'Tops & Tees',
          'Shirts',
          'Suits & Blazers',
          'Pants',
          'Jeans',
          'Underwear',
          'Shorts',
          'Hoodies & Sweatshirts',
          'Coats & Jackets',
          'Socks',
          "Men's Sets",
          'Active Tracksuits',
          'Sweaters',
          'Swimwear'
        ],
        keywords: ['men', 'polo', 'shirt', 'suit', 'boxer', 'hoodie', 'jacket', 't-shirt', 'trouser']
      },
      {
        name: 'World Apparel',
        items: ['African Clothing', 'Muslim Fashion'],
        keywords: ['african', 'kitenge', 'dashiki', 'hijab', 'abaya', 'muslim']
      },
      {
        name: 'Accessories',
        items: [
          'Sunglasses',
          'Hats & Caps',
          'Belts',
          'Scarves & Wraps',
          'Headwear',
          'Gloves & Mittens',
          'Ties',
          'Other Accessories'
        ],
        keywords: ['sunglass', 'glasses', 'hat', 'cap', 'belt', 'scarf', 'glove', 'tie']
      },
      {
        name: 'Sportswear',
        items: ['Jerseys', 'Clothing Sets', 'Sports Pants', 'Other Sportswear'],
        keywords: ['jersey', 'football', 'soccer', 'sports', 'gym', 'activewear']
      },
      {
        name: 'Novelty & Special Use',
        items: ['Exotic Apparel'],
        keywords: ['costume', 'exotic', 'party wear', 'cosplay']
      }
    ]
  },
  {
    id: 'shoes',
    name: 'Shoes',
    nameRw: 'Inkweto',
    icon: 'Footprints',
    image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=500&q=80',
    description: "Women's, men's and kids' footwear, sneakers, formal shoes, and shoe accessories.",
    sortOrder: 2,
    subcategories: [
      {
        name: "Women's Shoes",
        items: [
          'Sandals & Flip Flops',
          'Nude Shoes',
          'Sneakers',
          'Dress Shoes',
          'Loafers',
          'Canvas Shoes',
          'Boots',
          'Slippers',
          "Other Women's Shoes"
        ],
        keywords: ['heels', 'pumps', 'sandals', 'womens sneakers', 'wedges', 'slippers']
      },
      {
        name: "Men's Shoes",
        items: [
          'Sneakers',
          'Business Shoes',
          'Dress Shoes',
          'Loafers',
          'Canvas Shoes',
          'Boots',
          'Sandals & Flip Flops',
          'Slippers',
          "Other Men's Shoes"
        ],
        keywords: ['oxford', 'derby', 'loafers', 'mens sneakers', 'leather shoe', 'casual shoe']
      },
      {
        name: "Kids' Shoes",
        items: [
          'Sneakers',
          'Leather Shoes',
          'Sandals',
          'Loafers',
          'Boots',
          "Other Kids' Shoes"
        ],
        keywords: ['kids shoe', 'toddler shoe', 'baby shoe', 'school shoe']
      },
      {
        name: 'Shoe Accessories',
        items: ['Insoles', 'Other Shoe Accessories'],
        keywords: ['insole', 'shoelace', 'shoe care', 'shoe horn']
      }
    ]
  },
  {
    id: 'luggage-bags',
    name: 'Luggage & Bags',
    nameRw: 'Ibikapu n\'Ingendo',
    icon: 'Briefcase',
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=500&q=80',
    description: 'Shoulder bags, backpacks, travel suitcases, wallets, clutches, and briefcases.',
    sortOrder: 3,
    subcategories: [
      {
        name: "Women's Bags",
        items: [
          'Shoulder Bags',
          'Bag Sets',
          'Handle Bags',
          'Crossbody Bags',
          'Wallets',
          'Backpacks',
          'Clutches',
          "Other Women's Bags"
        ],
        keywords: ['handbag', 'crossbody', 'tote', 'clutch', 'purse', 'wallet', 'shoulder bag']
      },
      {
        name: "Men's Bags",
        items: [
          'Backpacks',
          'Briefcases',
          'Shoulder Bags',
          'Waist Packs',
          'Wallets & Clutches'
        ],
        keywords: ['briefcase', 'mens wallet', 'messenger bag', 'waist pack', 'chest bag']
      },
      {
        name: 'Travel Bags',
        items: [
          'Suitcases',
          'Travel Backpacks',
          'Travel Bags',
          'Luggage Accessories'
        ],
        keywords: ['suitcase', 'luggage', 'travel bag', 'trolley', 'duffel']
      },
      {
        name: "Kids' Bags",
        items: ['School Bags', "Kids' Backpacks", "Other Kids' Bags"],
        keywords: ['school bag', 'cartoon backpack', 'pencil case']
      },
      {
        name: 'Other Bags & Accessories',
        items: ['Card Holders', 'Luggage Tags', 'Bag Straps'],
        keywords: ['card holder', 'key pouch', 'organizer']
      }
    ]
  },
  {
    id: 'watch-jewelry',
    name: 'Watch & Jewelry',
    nameRw: 'Amasaha n\'Imikufi',
    icon: 'Watch',
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=500&q=80',
    description: 'Quartz, mechanical, digital watches, necklaces, rings, bracelets, and fine jewelry.',
    sortOrder: 4,
    subcategories: [
      {
        name: "Women's Watches",
        items: [
          'Quartz Watches',
          'Digital Watches',
          'Mechanical Watches',
          'Dual Display Watches'
        ],
        keywords: ['ladies watch', 'female watch', 'ceramic watch', 'diamond watch']
      },
      {
        name: "Women's Jewelry",
        items: [
          'Earrings',
          'Necklaces',
          'Rings',
          'Jewelry Sets',
          'Bracelets',
          'Anklets',
          'Body Jewelry'
        ],
        keywords: ['earring', 'necklace', 'ring', 'jewelry set', 'bracelet', 'anklet', 'gold', 'silver', 'pearl']
      },
      {
        name: "Men's Watches",
        items: [
          'Quartz Watches',
          'Digital Watches',
          'Mechanical Watches',
          'Dual Display Watches'
        ],
        keywords: ['mens watch', 'luxury watch', 'chronograph', 'leather strap watch', 'sports watch']
      },
      {
        name: "Men's Jewelry",
        items: ['Rings', 'Necklaces', 'Bracelets', 'Earrings'],
        keywords: ['mens ring', 'cuban chain', 'mens bracelet', 'stainless steel']
      },
      {
        name: 'Other Watches',
        items: [
          "Children's Watches",
          'Pocket & Fob Watches',
          'Watch Accessories'
        ],
        keywords: ['watch band', 'watch strap', 'pocket watch', 'kids watch']
      },
      {
        name: 'Other Jewelry',
        items: ['Hair Jewelry', 'Brooches', 'Tie Clips & Cufflinks', 'Key Chains'],
        keywords: ['brooch', 'cufflink', 'keychain', 'hair pin']
      }
    ]
  },
  {
    id: 'kids-toys',
    name: 'Kids & Toys',
    nameRw: 'Abana n\'Ibikinisho',
    icon: 'Baby',
    image: 'https://images.unsplash.com/photo-1558877385-81a1c7e67d72?auto=format&fit=crop&w=500&q=80',
    description: "Kids' wear, shoes, baby fashion, educational toys, and maternal essentials.",
    sortOrder: 5,
    subcategories: [
      {
        name: "Kids' Wear",
        items: [
          'Dresses',
          'Sets',
          'Tops',
          'Bottoms',
          'Socks & Leggings',
          "Other Kids' Wear"
        ],
        keywords: ['kids clothes', 'children wear', 'girls dress', 'boys set']
      },
      {
        name: "Kids' Shoes",
        items: [
          'Sneakers',
          'Leather Shoes',
          'Sandals',
          'Loafers',
          'Boots',
          "Other Kids' Shoes"
        ],
        keywords: ['kids shoes', 'children shoes', 'light up shoes']
      },
      {
        name: 'Baby Fashion',
        items: [
          'Baby Sets',
          'Bodysuits & One-Pieces',
          'Baby Dresses',
          'Baby Accessories',
          'Baby Shoes',
          'Other Baby Clothing'
        ],
        keywords: ['baby romper', 'onesie', 'infant clothing', 'baby bib']
      },
      {
        name: 'Baby & Moms',
        items: [
          "Kids' Bags",
          'Baby Care',
          'Activity & Gear',
          'Feeding',
          'Safety',
          'Bedding',
          'Maternity'
        ],
        keywords: ['stroller', 'baby carrier', 'diaper', 'bottle', 'breast pump', 'maternity']
      },
      {
        name: 'Toys',
        items: [
          'Learning Toys',
          'Classic Toys',
          'Models & Building Toys',
          'Dolls',
          'Puzzles & Magic Cubes',
          'Outdoor Play',
          'Remote Control Toys',
          'Baby Toys',
          'Other Toys'
        ],
        keywords: ['toy', 'lego', 'puzzle', 'plush', 'doll', 'rc car', 'drone', 'stem toy']
      }
    ]
  },
  {
    id: 'home-appliances',
    name: 'Home & Appliances',
    nameRw: 'Urugo n\'Ibikoresho',
    icon: 'Home',
    image: 'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?auto=format&fit=crop&w=500&q=80',
    description: 'Kitchenware, home decor, bedding, lighting, and home & personal appliances.',
    sortOrder: 6,
    subcategories: [
      {
        name: 'Kitchen',
        items: ['Bakeware', 'Cooking Tools', 'Drinkware', 'Kitchen Accessories'],
        keywords: ['kitchen', 'pan', 'pot', 'knife', 'bottle', 'flask', 'cookware', 'mug', 'cup']
      },
      {
        name: 'Textile & Decor',
        items: [
          'Bedding Sets',
          'Curtains',
          'Carpets',
          'Pillow Cases',
          'Towels',
          'Wall Stickers',
          'Paintings & Calligraphy',
          'Clocks',
          'Event & Party Decorations'
        ],
        keywords: ['bedsheet', 'blanket', 'duvet', 'curtain', 'carpet', 'rug', 'pillow', 'clock', 'wall art']
      },
      {
        name: 'Lighting',
        items: ['Decorative Lighting', 'Lamps', 'Portable Lighting'],
        keywords: ['lamp', 'led strip', 'bulb', 'desk lamp', 'night light', 'torch']
      },
      {
        name: 'Sewing',
        items: ['Sewing & Fabric', 'Needle Arts & Crafts'],
        keywords: ['sewing machine', 'thread', 'fabric', 'embroidery']
      },
      {
        name: 'Storage',
        items: ['Storage Bags', 'Holders & Racks', 'Boxes & Bins'],
        keywords: ['storage box', 'shoe rack', 'organizer', 'closet rack', 'hanger']
      },
      {
        name: 'Cleaning & Bathroom',
        items: ['Cleaning Tools', 'Bathroom Accessories'],
        keywords: ['mop', 'broom', 'shower head', 'towel rack', 'soap dispenser', 'cleaning brush']
      },
      {
        name: 'Appliances',
        items: [
          'Kitchen Appliances',
          'Air Conditioning',
          'Personal Care Appliances',
          'Coffee Makers',
          'Laundry Appliances'
        ],
        keywords: ['blender', 'air fryer', 'microwave', 'electric kettle', 'iron', 'hair dryer', 'fan', 'heater', 'vacuum']
      }
    ]
  },
  {
    id: 'beauty',
    name: 'Beauty',
    nameRw: 'Ubwiza',
    icon: 'Sparkles',
    image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=500&q=80',
    description: 'Makeup, skin care serums, wellness, styling tools, and personal hygiene.',
    sortOrder: 7,
    subcategories: [
      {
        name: 'Makeup',
        items: [
          'Eye Shadow',
          'Powder',
          'Eye Makeup',
          'Face Makeup',
          'Lip Makeup',
          'Makeup Sets'
        ],
        keywords: ['lipstick', 'eyeliner', 'mascara', 'foundation', 'concealer', 'palette', 'powder']
      },
      {
        name: 'Skin Care',
        items: [
          'Masks',
          'Serums',
          'Cleansers',
          'Face Creams',
          'Body Creams',
          'Sun Care'
        ],
        keywords: ['serum', 'face cream', 'lotion', 'sunscreen', 'cleanser', 'mask', 'moisturizer', 'vitamin c']
      },
      {
        name: 'Health & Personal Care',
        items: [
          'Massage & Relaxation',
          'Health Monitors',
          'Oral Hygiene',
          'Other Personal Care'
        ],
        keywords: ['massage', 'electric toothbrush', 'oral hygiene', 'blood pressure', 'thermometer']
      },
      {
        name: 'Beauty Tools',
        items: ['Makeup Tools', 'Skin Care Tools', 'Styling Tools'],
        keywords: ['brush set', 'sponge', 'roller', 'curler', 'tweezers']
      },
      {
        name: 'More Beauty Products',
        items: [
          'Hair Care',
          'Shaving & Hair Removal',
          'Nail Art',
          'Bath & Shower',
          'Beauty Accessories'
        ],
        keywords: ['nail polish', 'nail lamp', 'shaver', 'epilator', 'bath bomb', 'body wash', 'shampoo']
      }
    ]
  },
  {
    id: 'weddings',
    name: 'Weddings',
    nameRw: 'Ubukwe',
    icon: 'HeartHandshake',
    image: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=500&q=80',
    description: 'Wedding dresses, bridal gowns, grooms suits, and celebration accessories.',
    sortOrder: 8,
    subcategories: [
      {
        name: 'Wedding Dresses',
        items: [
          'Mermaid Wedding Dresses',
          'Tail Wedding Dresses',
          'Bubble Hem Wedding Dresses',
          'Other Wedding Dresses'
        ],
        keywords: ['wedding dress', 'bridal gown', 'mermaid dress', 'white gown', 'bride']
      },
      {
        name: 'Suits & Gowns',
        items: ['Suits & Blazers', "Women's Gowns", 'Flower Girl Dresses'],
        keywords: ['tuxedo', 'groom suit', 'evening gown', 'bridesmaid dress', 'flower girl']
      },
      {
        name: 'Wedding Accessories',
        items: [
          'Wedding Bouquets',
          'Petticoats',
          'Bridal Veils',
          'Bridal Hairpins',
          'Ties',
          'Bridal Gloves',
          'Bridal Hats',
          'Other Wedding Accessories'
        ],
        keywords: ['bridal veil', 'bouquet', 'tiara', 'wedding decor', 'corsage', 'ring pillow']
      }
    ]
  },
  {
    id: 'hair',
    name: 'Hair',
    nameRw: 'Imisatsi',
    icon: 'Crown',
    image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=500&q=80',
    description: 'Human hair wigs, synthetic extensions, lace frontals, and hair care tools.',
    sortOrder: 9,
    subcategories: [
      {
        name: 'Human Hair',
        items: [
          'Wigs',
          'Hair Extensions',
          'Lace Closures',
          'Lace Frontals',
          'Hair Wefts & Closures'
        ],
        keywords: ['human hair', 'lace frontal', 'closure', 'virgin hair', 'brazilian hair', 'peruvian hair', 'human wig']
      },
      {
        name: 'Synthetic Hair',
        items: ['Wigs', 'Hair Extensions'],
        keywords: ['synthetic wig', 'braiding hair', 'kanekalon', 'synthetic extension']
      },
      {
        name: 'Blended Hair',
        items: ['Blended Wigs', 'Blended Hair Extensions'],
        keywords: ['blended hair', 'heat resistant hair']
      },
      {
        name: 'Hair Accessories & Tools',
        items: [
          'Wigs Accessories',
          'Hair Combs',
          'Hair Brushes',
          'Hair Clips',
          'Hair Styling Tools',
          'Hair Care Products'
        ],
        keywords: ['wig cap', 'hair straightener', 'curling iron', 'comb', 'hair oil', 'hair mousse', 'edge control']
      }
    ]
  },
  {
    id: 'phones-tel',
    name: 'Phones & Tel',
    nameRw: 'Telefoni n\'Ibyazo',
    icon: 'Smartphone',
    image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=500&q=80',
    description: 'Smartphones, feature phones, cases, earphones, chargers, and mobile mounts.',
    sortOrder: 10,
    subcategories: [
      {
        name: 'Phones',
        items: ['Smartphones', 'Feature Phones', 'Other Phones'],
        keywords: ['smartphone', 'iphone', 'samsung', 'android', 'phone', 'feature phone', 'tecno', 'infinix']
      },
      {
        name: 'Phone Accessories',
        items: [
          'Headphones & Earphones',
          'Bluetooth Headsets',
          'Phone Bags & Cases',
          'Holders & Stands',
          'Memory Cards',
          'Screen Protectors',
          'Cables & Chargers',
          'Mobile Phone Adapters',
          'Other Phone Products'
        ],
        keywords: ['phone case', 'charger', 'type-c', 'lightning', 'screen protector', 'earbud', 'power bank', 'phone stand']
      }
    ]
  },
  {
    id: 'electronics',
    name: 'Electronics',
    nameRw: 'Ibyuma by\'Ikoranabuhanga',
    icon: 'Tv',
    image: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&w=500&q=80',
    description: 'Smart home, audio & video, cameras, smart wearables, and power accessories.',
    sortOrder: 11,
    subcategories: [
      {
        name: 'Smart Electronics',
        items: ['Smart Home', 'Wearable Devices'],
        keywords: ['smart watch', 'fitness tracker', 'smart plug', 'smart home', 'smart speaker', 'alexa']
      },
      {
        name: 'Accessories & Parts',
        items: [
          'Selfie Sticks',
          'Digital Cables',
          'Camera & Photo Accessories',
          'Other Accessories & Parts'
        ],
        keywords: ['selfie stick', 'tripod', 'hdmi cable', 'aux cable', 'gimbal']
      },
      {
        name: 'Audio & Video',
        items: ['Home Audio & Video', 'Portable Audio & Video'],
        keywords: ['bluetooth speaker', 'soundbar', 'home theater', 'projector', 'amplifier', 'radio', 'karaoke']
      },
      {
        name: 'Cameras',
        items: ['Digital Cameras', 'Security Cameras', 'Camera Accessories'],
        keywords: ['cctv', 'security camera', 'ip camera', 'dslr', 'action camera', 'dashcam', 'lens']
      },
      {
        name: 'Electronic Accessories',
        items: ['Batteries', 'Power Adapters', 'Electronic Components'],
        keywords: ['battery', 'rechargeable', 'inverter', 'adapter', 'power supply', 'converter']
      }
    ]
  },
  {
    id: 'computer-office',
    name: 'Computer & Office',
    nameRw: 'Mudasobwa n\'Ibiro',
    icon: 'Laptop',
    image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=500&q=80',
    description: 'Keyboards, mice, tablets, office electronics, printers, and workstation supplies.',
    sortOrder: 12,
    subcategories: [
      {
        name: 'Computer',
        items: [
          'Keyboard & Mouse Combos',
          'Mouse',
          'Keyboards',
          'External Storage',
          'Networking',
          'Tablets',
          'Other Computer Products'
        ],
        keywords: ['keyboard', 'mouse', 'usb drive', 'hard drive', 'ssd', 'router', 'wifi', 'tablet', 'ipad', 'laptop stand']
      },
      {
        name: 'Office',
        items: [
          'Office Electronics',
          'Office Supplies',
          'Printers & Scanners',
          'Paper Products',
          'Office Furniture',
          'Other Office Products'
        ],
        keywords: ['printer', 'scanner', 'pos', 'barcode scanner', 'paper', 'notebook', 'office chair', 'desk', 'laminator', 'calculator']
      }
    ]
  },
  {
    id: 'automobile-accessory-tools',
    name: 'Automobile Accessory & Tools',
    nameRw: 'Ibinyabiziga n\'Ibikoresho',
    icon: 'Wrench',
    image: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=500&q=80',
    description: 'Car electronics, interior/exterior accessories, motorcycle gear, and mechanic tools.',
    sortOrder: 13,
    subcategories: [
      {
        name: 'Car Electronics',
        items: [
          'Car Electrical Accessories',
          'Car Players',
          'Rear View Cameras',
          'GPS Receivers & Antennas',
          'Car Electrical Appliances'
        ],
        keywords: ['car radio', 'car player', 'car audio', 'reverse camera', 'gps tracker', 'car charger', 'car vacuum']
      },
      {
        name: 'Car Accessories',
        items: ['Interior Accessories', 'Exterior Accessories'],
        keywords: ['seat cover', 'steering wheel cover', 'car floor mat', 'car cover', 'sun shade', 'car phone holder']
      },
      {
        name: 'Motorcycle Accessories & Parts',
        items: [
          'Lighting',
          'Protective Gear',
          'Frames & Fittings',
          'Motorcycle Accessories'
        ],
        keywords: ['helmet', 'motorcycle gloves', 'bike light', 'riding jacket']
      },
      {
        name: 'Tools, Maintenance & Care',
        items: [
          'Tire Repair Tools',
          'Code Readers & Scan Tools',
          'Diagnostic Tools',
          'Car Washers',
          'Sponges, Cloths & Brushes'
        ],
        keywords: ['obd2', 'diagnostic tool', 'pressure washer', 'car wax', 'tire inflator', 'car polish']
      },
      {
        name: 'Road Safety',
        items: ['Roadway Safety Products', 'Safety Accessories'],
        keywords: ['safety triangle', 'first aid', 'reflective vest', 'fire extinguisher']
      },
      {
        name: 'Automotive Tools',
        items: [
          'Hand Tools',
          'Measurement & Analysis Instruments',
          'Other Tools'
        ],
        keywords: ['wrench', 'screwdriver', 'drill', 'multimeter', 'jack', 'toolbox']
      },
      {
        name: 'Safety Protection',
        items: ['Video Surveillance', 'Other Safety Protection'],
        keywords: ['surveillance', 'smoke detector', 'safe box', 'lock']
      }
    ]
  }
];

// Flat export of all 13 Categories for database & UI
export function generateFlatCategoryRecords(): Category[] {
  const records: Category[] = [];

  for (const main of MAIN_CATEGORY_DEFINITIONS) {
    const mainRecord: Category = {
      id: main.id,
      nameEn: main.name,
      nameRw: main.nameRw,
      icon: main.icon,
      description: main.description,
      imageUrl: main.image,
      subcategories: main.subcategories.map(s => s.name),
      isActive: true,
      order: main.sortOrder,
      level: 1,
      parentId: null,
      slug: main.id,
      subcategoriesList: main.subcategories.map(sub => ({
        id: `${main.id}-${sub.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`,
        name: sub.name,
        slug: sub.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        items: sub.items
      }))
    };
    records.push(mainRecord);

    // Also generate Level 2 child categories if needed
    for (const sub of main.subcategories) {
      const subId = `${main.id}-${sub.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`;
      const subRecord: Category = {
        id: subId,
        nameEn: sub.name,
        nameRw: sub.name,
        icon: main.icon,
        description: `${sub.name} in ${main.name}`,
        imageUrl: main.image,
        subcategories: sub.items,
        isActive: true,
        order: main.sortOrder * 10,
        level: 2,
        parentId: main.id,
        slug: sub.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      };
      records.push(subRecord);
    }
  }

  return records;
}

// Intelligent Product Category Auto-Mapper
// Given any product title, description, or legacy category, determines the exact 13 Main Category and Subcategory
export function mapProductToCategoryHierarchy(product: {
  name?: string;
  description?: string;
  category?: string;
  subcategory?: string;
}): {
  mainCategoryId: string;
  subCategoryId: string;
  categoryName: string;
  subCategoryName: string;
  confidence: 'high' | 'medium' | 'low';
} {
  const text = `${product.name || ''} ${product.description || ''} ${product.subcategory || ''}`.toLowerCase();
  const legacyCat = String(product.category || '').toLowerCase().trim();

  // 1. Direct legacy mapping table
  const legacyMap: Record<string, { mainId: string; subName: string }> = {
    'hair-beauty': { mainId: 'beauty', subName: 'Skin Care' },
    'electronics': { mainId: 'electronics', subName: 'Smart Electronics' },
    'fashion': { mainId: 'clothing', subName: "Women's Clothing" },
    'amatara': { mainId: 'home-appliances', subName: 'Lighting' },
    'impano': { mainId: 'home-appliances', subName: 'Kitchen' },
    'abana': { mainId: 'kids-toys', subName: 'Toys' },
    'amasaha': { mainId: 'watch-jewelry', subName: "Men's Watches" },
    'ibikapu': { mainId: 'luggage-bags', subName: "Women's Bags" },
    'sports': { mainId: 'clothing', subName: 'Sportswear' },
    'books': { mainId: 'computer-office', subName: 'Office' },
    'supermarket': { mainId: 'home-appliances', subName: 'Kitchen' }
  };

  // 2. High-precision keyword scanners across each category
  // Shoes
  if (text.match(/shoe|sneaker|loafer|heel|sandal|boot|slipper|canvas shoe|oxford|flip flop|footwear|inkweto/i)) {
    const isWomens = text.match(/women|lady|ladies|female|heels|pumps/i);
    const isKids = text.match(/kid|child|baby|boy|girl|toddler/i);
    const subName = isKids ? "Kids' Shoes" : isWomens ? "Women's Shoes" : "Men's Shoes";
    const main = MAIN_CATEGORY_DEFINITIONS.find(m => m.id === 'shoes')!;
    return {
      mainCategoryId: 'shoes',
      subCategoryId: `shoes-${subName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      categoryName: main.name,
      subCategoryName: subName,
      confidence: 'high'
    };
  }

  // Hair
  if (text.match(/wig|human hair|hair extension|lace frontal|lace closure|braid|kanekalon|hair curl|hair comb|hair brush|imisatsi/i)) {
    const isHuman = text.match(/human hair|virgin|remy|bundle|frontal|closure/i);
    const isTool = text.match(/brush|comb|straightener|clipper|curler|dryer|oil|cream/i);
    const subName = isHuman ? 'Human Hair' : isTool ? 'Hair Accessories & Tools' : 'Synthetic Hair';
    const main = MAIN_CATEGORY_DEFINITIONS.find(m => m.id === 'hair')!;
    return {
      mainCategoryId: 'hair',
      subCategoryId: `hair-${subName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      categoryName: main.name,
      subCategoryName: subName,
      confidence: 'high'
    };
  }

  // Watch & Jewelry
  if (text.match(/watch|amasaha|earring|necklace|bracelet|ring|jewelry|bangle|cufflink|imikufi/i)) {
    const isWatch = text.match(/watch|quartz|chronograph|digital watch|amasaha/i);
    const isMen = text.match(/men|mens|male|gentleman/i);
    let subName = "Women's Jewelry";
    if (isWatch) {
      subName = isMen ? "Men's Watches" : "Women's Watches";
    } else {
      subName = isMen ? "Men's Jewelry" : "Women's Jewelry";
    }
    const main = MAIN_CATEGORY_DEFINITIONS.find(m => m.id === 'watch-jewelry')!;
    return {
      mainCategoryId: 'watch-jewelry',
      subCategoryId: `watch-jewelry-${subName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      categoryName: main.name,
      subCategoryName: subName,
      confidence: 'high'
    };
  }

  // Luggage & Bags
  if (text.match(/bag|backpack|luggage|suitcase|handbag|crossbody|wallet|purse|tote|clutch|briefcase|ibikapu/i)) {
    const isTravel = text.match(/suitcase|luggage|trolley|duffel|travel/i);
    const isMen = text.match(/men|mens|briefcase|male/i);
    const isKids = text.match(/school|kid|student/i);
    const subName = isTravel ? 'Travel Bags' : isKids ? "Kids' Bags" : isMen ? "Men's Bags" : "Women's Bags";
    const main = MAIN_CATEGORY_DEFINITIONS.find(m => m.id === 'luggage-bags')!;
    return {
      mainCategoryId: 'luggage-bags',
      subCategoryId: `luggage-bags-${subName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      categoryName: main.name,
      subCategoryName: subName,
      confidence: 'high'
    };
  }

  // Phones & Tel
  if (text.match(/phone|smartphone|iphone|samsung|charger|usb cable|screen protector|power bank|airpod|earphone|headphone|holder stand|telefoni/i)) {
    const isActualPhone = text.match(/smartphone|iphone 1|iphone 2|iphone 3|iphone 4|galaxy s|redmi|feature phone/i);
    const subName = isActualPhone ? 'Phones' : 'Phone Accessories';
    const main = MAIN_CATEGORY_DEFINITIONS.find(m => m.id === 'phones-tel')!;
    return {
      mainCategoryId: 'phones-tel',
      subCategoryId: `phones-tel-${subName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      categoryName: main.name,
      subCategoryName: subName,
      confidence: 'high'
    };
  }

  // Computer & Office
  if (text.match(/laptop|keyboard|mouse|printer|scanner|pos|barcode|thermal|monitor|tablet|ipad|office chair|stationery|mudasobwa/i)) {
    const isOffice = text.match(/printer|scanner|pos|receipt|paper|desk|office/i);
    const subName = isOffice ? 'Office' : 'Computer';
    const main = MAIN_CATEGORY_DEFINITIONS.find(m => m.id === 'computer-office')!;
    return {
      mainCategoryId: 'computer-office',
      subCategoryId: `computer-office-${subName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      categoryName: main.name,
      subCategoryName: subName,
      confidence: 'high'
    };
  }

  // Automobile Accessory & Tools
  if (text.match(/car|auto|vehicle|motorcycle|helmet|tire|obd|diagnostic|dashcam|rear view|dash cam|wrench|screwdriver|toolkit|ibinyabiziga/i)) {
    const isCarElec = text.match(/car player|radio|reverse camera|gps|car electrical/i);
    const isMoto = text.match(/motorcycle|helmet|bike/i);
    const subName = isCarElec ? 'Car Electronics' : isMoto ? 'Motorcycle Accessories & Parts' : 'Car Accessories';
    const main = MAIN_CATEGORY_DEFINITIONS.find(m => m.id === 'automobile-accessory-tools')!;
    return {
      mainCategoryId: 'automobile-accessory-tools',
      subCategoryId: `automobile-accessory-tools-${subName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      categoryName: main.name,
      subCategoryName: subName,
      confidence: 'high'
    };
  }

  // Beauty
  if (text.match(/serum|cream|cosmetic|makeup|lipstick|mascara|eyeliner|facial|skincare|cleanser|sunscreen|lotion|shampoo|ubwiza/i)) {
    const isMakeup = text.match(/lipstick|mascara|eyeliner|palette|powder|foundation|lip/i);
    const subName = isMakeup ? 'Makeup' : 'Skin Care';
    const main = MAIN_CATEGORY_DEFINITIONS.find(m => m.id === 'beauty')!;
    return {
      mainCategoryId: 'beauty',
      subCategoryId: `beauty-${subName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      categoryName: main.name,
      subCategoryName: subName,
      confidence: 'high'
    };
  }

  // Kids & Toys
  if (text.match(/toy|lego|puzzle|baby|doll|stroller|onesie|toddler|rc car|robot toy|abana/i)) {
    const isBaby = text.match(/baby|infant|onesie|romper|diaper|stroller/i);
    const isToy = text.match(/toy|puzzle|lego|doll|game|rc/i);
    const subName = isBaby ? 'Baby & Moms' : isToy ? 'Toys' : "Kids' Wear";
    const main = MAIN_CATEGORY_DEFINITIONS.find(m => m.id === 'kids-toys')!;
    return {
      mainCategoryId: 'kids-toys',
      subCategoryId: `kids-toys-${subName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      categoryName: main.name,
      subCategoryName: subName,
      confidence: 'high'
    };
  }

  // Weddings
  if (text.match(/wedding|bridal|bride|groom|tuxedo|gown|veil|bouquet|ubukwe/i)) {
    const subName = text.match(/suit|tuxedo/i) ? 'Suits & Gowns' : 'Wedding Dresses';
    const main = MAIN_CATEGORY_DEFINITIONS.find(m => m.id === 'weddings')!;
    return {
      mainCategoryId: 'weddings',
      subCategoryId: `weddings-${subName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      categoryName: main.name,
      subCategoryName: subName,
      confidence: 'high'
    };
  }

  // Home & Appliances
  if (text.match(/lamp|light|led|bulb|kitchen|blender|pot|pan|cookware|knife|bedding|curtain|carpet|towel|appliance|vacuum|air fryer|urugo|amatara/i)) {
    const isLight = text.match(/lamp|light|led|bulb|chandelier|amatara/i);
    const isAppliance = text.match(/blender|air fryer|juicer|kettle|vacuum|iron/i);
    const isTextile = text.match(/bedding|curtain|carpet|rug|pillow|towel/i);
    const subName = isLight ? 'Lighting' : isAppliance ? 'Appliances' : isTextile ? 'Textile & Decor' : 'Kitchen';
    const main = MAIN_CATEGORY_DEFINITIONS.find(m => m.id === 'home-appliances')!;
    return {
      mainCategoryId: 'home-appliances',
      subCategoryId: `home-appliances-${subName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      categoryName: main.name,
      subCategoryName: subName,
      confidence: 'high'
    };
  }

  // Clothing (Apparel)
  if (text.match(/shirt|dress|t-shirt|pant|trouser|jacket|hoodie|jean|skirt|blazer|suit|sportswear|jersey|imyenda/i)) {
    const isMen = text.match(/men|mens|male|boy/i);
    const isSport = text.match(/sport|jersey|gym/i);
    const subName = isSport ? 'Sportswear' : isMen ? "Men's Clothing" : "Women's Clothing";
    const main = MAIN_CATEGORY_DEFINITIONS.find(m => m.id === 'clothing')!;
    return {
      mainCategoryId: 'clothing',
      subCategoryId: `clothing-${subName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      categoryName: main.name,
      subCategoryName: subName,
      confidence: 'high'
    };
  }

  // Electronics (catch-all for gadgets, smart tech, speakers, audio, camera)
  if (text.match(/speaker|audio|bluetooth|soundbar|camera|security|smart|gadget|amplifier|radio/i)) {
    const isAudio = text.match(/speaker|soundbar|audio|radio|amplifier/i);
    const subName = isAudio ? 'Audio & Video' : 'Smart Electronics';
    const main = MAIN_CATEGORY_DEFINITIONS.find(m => m.id === 'electronics')!;
    return {
      mainCategoryId: 'electronics',
      subCategoryId: `electronics-${subName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      categoryName: main.name,
      subCategoryName: subName,
      confidence: 'high'
    };
  }

  // 3. Fallback based on legacy category ID
  if (legacyMap[legacyCat]) {
    const mapped = legacyMap[legacyCat];
    const main = MAIN_CATEGORY_DEFINITIONS.find(m => m.id === mapped.mainId)!;
    return {
      mainCategoryId: mapped.mainId,
      subCategoryId: `${mapped.mainId}-${mapped.subName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      categoryName: main.name,
      subCategoryName: mapped.subName,
      confidence: 'medium'
    };
  }

  // 4. Default fallback: Home & Appliances or Clothing
  const defaultMain = MAIN_CATEGORY_DEFINITIONS[0]; // Clothing
  return {
    mainCategoryId: defaultMain.id,
    subCategoryId: `${defaultMain.id}-women-s-clothing`,
    categoryName: defaultMain.name,
    subCategoryName: "Women's Clothing",
    confidence: 'low'
  };
}
