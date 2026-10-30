import fs from 'fs';
import path from 'path';

interface RawItem {
  name: string;
  category: string;
  base_price_RWF: number;
  markup_percentage: number;
  final_price_RWF: number;
  image_url: string;
}

function normalizeCategoryId(rawCategory?: string, name?: string): string {
  const combined = (String(rawCategory || '') + ' ' + String(name || '')).toLowerCase();
  const c = String(rawCategory || '').toLowerCase().trim();

  if (['amasaha', 'watches & jewelry', 'watches', 'jewelry'].includes(c) || combined.includes('watch') || combined.includes('earring') || combined.includes('ring') || combined.includes('bracelet') || combined.includes('necklace')) return 'amasaha';
  if (['hair-beauty', 'beauty & cosmetics', 'beauty & personal care', 'salon', 'makeup', 'skincare'].includes(c) || combined.includes('beauty') || combined.includes('hair') || combined.includes('cosmetic') || combined.includes('serum') || combined.includes('lotion')) return 'hair-beauty';
  if (['amatara', 'lighting & gadgets', 'lighting', 'lights', 'lamps'].includes(c) || combined.includes('light') || combined.includes('lamp') || combined.includes('led') || combined.includes('bulb')) return 'amatara';
  if (['abana', 'kids & toys', 'kids', 'toys', 'baby'].includes(c) || combined.includes('toy') || combined.includes('baby') || combined.includes('kid')) return 'abana';
  if (['ibikapu', 'bags & luggage', 'bags and fashion accessories', 'bags', 'backpacks'].includes(c) || combined.includes('bag') || combined.includes('backpack') || combined.includes('luggage') || combined.includes('purse') || combined.includes('wallet')) return 'ibikapu';
  if (['sports', 'sports & fitness', 'fitness', 'gym'].includes(c) || combined.includes('sport') || combined.includes('fitness') || combined.includes('cycling') || combined.includes('yoga')) return 'sports';
  if (['books', 'books & office', 'school, office and business supplies', 'office', 'stationery'].includes(c) || combined.includes('book') || combined.includes('office') || combined.includes('stationery') || combined.includes('printer')) return 'books';
  if (['supermarket', 'supermarket & food', 'grocery', 'food'].includes(c) || combined.includes('food') || combined.includes('honey') || combined.includes('grocery')) return 'supermarket';
  if (['impano', 'gifts & home decor', 'home & kitchen'].includes(c) || combined.includes('gift') || combined.includes('decor') || combined.includes('kitchen') || combined.includes('stove') || combined.includes('cutting board') || combined.includes('art') || combined.includes('flask') || combined.includes('bottle') || combined.includes('coffee') || combined.includes('dispenser') || combined.includes('frying pan') || combined.includes('pan')) return 'impano';
  if (['fashion', 'fashion & apparel', 'fashion-shoes', 'shoes', 'footwear', 'clothing'].includes(c) || combined.includes('shoe') || combined.includes('cloth') || combined.includes('apparel') || combined.includes('sneaker') || combined.includes('dress') || combined.includes('shirt') || combined.includes('jacket') || combined.includes('hoodie') || combined.includes('sunglasses') || combined.includes('sandal')) return 'fashion';
  if (['electronics', 'electronics & tv', 'tech accessories & smart gadgets', 'electronic'].includes(c) || combined.includes('electr') || combined.includes('tech') || combined.includes('gadget') || combined.includes('cable') || combined.includes('earbud') || combined.includes('headphone') || combined.includes('charger') || combined.includes('mouse') || combined.includes('camera') || combined.includes('speaker') || combined.includes('stand') || combined.includes('hub')) return 'electronics';
  return 'electronics';
}

function getProductDescription(name: string, category: string): string {
  const n = name.toLowerCase();
  if (n.includes('earbud')) return 'High-fidelity wireless Bluetooth earbuds featuring immersive HD stereo sound, deep bass, responsive touch controls, and long-lasting battery life. Ergonomic comfort fit with rapid Type-C charging case. Fast same-day Kigali delivery.';
  if (n.includes('watch') && n.includes('fitness')) return 'Feature-packed waterproof fitness smartwatch with brilliant HD color touch display, real-time heart rate & sleep monitoring, comprehensive sports tracking modes, and seamless smartphone notifications. Compatible with Android and iOS.';
  if (n.includes('watch') && n.includes('quartz')) return 'Sophisticated stainless steel quartz analog watch with scratch-resistant mineral crystal glass, luminous hour hands, and water-resistant casing. Refined luxury design for everyday wear and formal occasions.';
  if (n.includes('mouse')) return 'Precision optical USB gaming mouse featuring ergonomic contoured grip, high-sensitivity DPI adjustment, responsive quiet switches, and durable braided cable. Ideal for gaming, graphic design, and daily productivity.';
  if (n.includes('speaker')) return 'Powerful 10W portable wireless Bluetooth speaker with 360-degree room-filling acoustic sound and punchy bass. Splash-resistant rugged build with extended rechargeable battery life for indoor and outdoor entertainment.';
  if (n.includes('cable')) return 'Heavy-duty 2-meter fast-charging USB-C cable engineered with multi-layer braided nylon reinforcement, high-speed data transmission, and reinforced connector strain relief. Built to withstand daily flex and use.';
  if (n.includes('laptop stand')) return 'Ergonomic multi-angle aluminum laptop stand elevating your laptop display to natural eye level for superior posture and spinal comfort. Hollow ventilated design ensures maximum airflow and cooling.';
  if (n.includes('headphone')) return 'Premium over-ear noise-cancelling headphones equipped with custom-tuned 40mm acoustic drivers, plush memory foam earcups, crystal-clear voice microphone, and long-range wireless connectivity.';
  if (n.includes('camera')) return 'Full HD 1080p webcam featuring built-in noise-cancelling microphone, automatic low-light correction, and 360-degree rotational mounting clamp for seamless video conferencing, streaming, and remote work.';
  if (n.includes('hub')) return 'High-speed multi-port USB-C hub adapter supporting multiple USB 3.0 ports, 4K HDMI video output, and rapid Power Delivery passthrough. Sleek aluminum enclosure with instant plug-and-play operation.';
  if (n.includes('charging pad')) return 'Ultra-slim Qi-certified wireless fast-charging pad with intelligent temperature management, non-slip rubberized surface, and LED power indicator. Safe, case-friendly charging for all Qi-enabled devices.';
  if (n.includes('sneaker')) return 'Lightweight athletic running sneakers constructed with breathable mesh fabric, impact-absorbing foam cushioning, and high-traction rubber outsole. Ultimate all-day foot support and modern sporty aesthetics.';
  if (n.includes('sports shoes')) return 'Breathable and flexible athletic sports shoes designed for training, running, and active lifestyles. Features reinforced lateral support, moisture-wicking lining, and durable non-slip grip.';
  if (n.includes('dress shoes')) return 'Classic polished leather dress shoes handcrafted with timeless oxford styling, cushioned orthotic insole, and durable non-skid sole. The quintessential formal footwear for business, events, and celebrations.';
  if (n.includes('sandal')) return 'Elegant women\'s high-heel sandals featuring delicate adjustable ankle strap, padded arch footbed, and stable balanced heel. Sophisticated silhouette designed for evening wear and special occasions.';
  if (n.includes('slip-on')) return 'Comfortable unisex canvas slip-on shoes with flexible vulcanized rubber soles, dual elastic side gores for easy on/off, and breathable cotton canvas. Effortless casual streetwear for Kigali.';
  if (n.includes('crossbody bag')) return 'Chic women\'s genuine-feel leather crossbody bag featuring multiple secure zippered pockets, adjustable strap, and polished metallic hardware. Compact yet spacious enough for daily essentials.';
  if (n.includes('wallet')) return 'Slim minimalist leather bi-fold wallet engineered with certified RFID-blocking security, dedicated card slots, cash divider, and compact pocket-friendly profile with reinforced stitching.';
  if (n.includes('sunglasses')) return 'Classic unisex polarized sunglasses providing 100% UV400 ultraviolet radiation protection, anti-glare optical clarity, and robust lightweight frame. Timeless fashion accessory for sunny days.';
  if (n.includes('backpack')) return 'Heavy-duty waterproof travel and laptop backpack with padded computer sleeve, anti-theft hidden pocket, external USB charging port, and breathable ergonomic shoulder straps.';
  if (n.includes('water bottle')) return 'Double-wall vacuum-insulated stainless steel thermal bottle keeping beverages ice-cold for 24 hours or steaming hot for 12 hours. 100% leakproof, condensation-free, and BPA-free.';
  if (n.includes('coffee grinder')) return 'Compact high-speed electric coffee grinder with dual stainless steel precision blades for quick, uniform grinding of coffee beans, spices, seeds, and nuts. One-touch pulse operation.';
  if (n.includes('soap dispenser')) return 'Touchless automatic infrared sensor soap dispenser for hygienic hands-free use in kitchen and bathroom. Fast drip-free dispensing with waterproof battery compartment.';
  if (n.includes('desk lamp')) return 'Modern touch-control LED desk lamp featuring customizable brightness levels, multi-color temperature modes, flexible gooseneck arm, and eye-caring anti-glare illumination.';
  if (n.includes('frying pan') || n.includes('pan')) return 'Premium non-stick ceramic frying pan ensuring optimal thermal conductivity, easy release, and minimal oil cooking. Heat-resistant ergonomic handle and effortless cleaning.';
  return `${name} - High-quality authentic product available on ContactReach Market with verified quality, prompt Kigali delivery, and reliable customer warranty.`;
}

function getCategorySkuPrefix(catId: string): string {
  switch (catId) {
    case 'electronics': return 'ELEC';
    case 'fashion': return 'FASH';
    case 'amasaha': return 'AMA';
    case 'amatara': return 'TARA';
    case 'ibikapu': return 'KAPU';
    case 'impano': return 'PANO';
    case 'sports': return 'SPORT';
    case 'abana': return 'BANA';
    case 'hair-beauty': return 'BEAUTY';
    case 'supermarket': return 'MARKET';
    default: return 'GEN';
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

export function generate200Products(): any[] {
  const filePath = path.resolve('public/assets/aistudio/products_200_633a0812.json');
  const rawList: RawItem[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  const now = new Date().toISOString();

  return rawList.map((item, index) => {
    const catId = normalizeCategoryId(item.category, item.name);
    const skuPrefix = getCategorySkuPrefix(catId);
    const numStr = String(index + 1).padStart(3, '0');
    const slug = slugify(item.name);
    const id = `prod-200-${numStr}-${slug.slice(0, 30)}`;
    const sku = `CRM-${skuPrefix}-200-${numStr}`;
    const desc = getProductDescription(item.name, item.category);

    // Stagger stock between 25 and 85
    const stock = 25 + ((index * 7) % 61);
    // Rating between 4.7 and 5.0
    const rating = Number((4.7 + ((index % 4) * 0.1)).toFixed(1));
    const reviewsCount = 10 + ((index * 3) % 45);

    // Feature some top products
    const isFeatured = index % 10 === 0;
    const isBestSeller = index % 7 === 0;

    return {
      id,
      name: item.name,
      sku,
      description: desc,
      price: Math.round(item.final_price_RWF),
      costPrice: Math.round(item.base_price_RWF),
      category: catId,
      stock,
      imageUrl: item.image_url,
      images: [item.image_url],
      shopName: 'ContactReach Market',
      shopId: 'shop-contactreach-market-5831',
      receiverName: 'Ruth',
      paymentMethods: ['MTN Mobile Money', 'MTN Merchant Code', 'Airtel Money'],
      merchantCode: '2328354',
      receiverPhone: '0780022600',
      location: 'Kigali, Rwanda',
      deliveryInfo: 'Same-day Kigali express (2-4 hrs)',
      status: 'Available',
      reviewStatus: 'Approved',
      isFeatured,
      isNewArrival: true,
      isBestSeller,
      unit: 'Piece',
      rating,
      reviewsCount,
      createdAt: now,
      history: [
        {
          timestamp: now,
          action: 'Imported from 200 Catalog Dataset',
          user: 'Ruth (System Owner)'
        }
      ]
    };
  });
}
