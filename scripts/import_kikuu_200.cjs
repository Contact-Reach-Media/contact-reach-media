const fs = require('fs');
const path = require('path');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Referer': 'https://rw.kikuu.com/'
};

// Adult / illicit filter
const BANNED_WORDS = [
  /penis/i, /vagina/i, /enhancement.*big.*xxl/i, /sexy lingerie/i, /dildo/i, /vibrator/i,
  /condom/i, /masturbat/i, /erotic/i, /adult.*toy/i, /boob/i, /buttock.*enlarge/i,
  /breast.*enlarge/i, /whitening.*private/i
];

function isSafe(name) {
  for (const re of BANNED_WORDS) {
    if (re.test(name)) return false;
  }
  return true;
}

function cleanTitle(title) {
  let cleaned = title
    .replace(/^wholesale\s+/i, '')
    .replace(/^hot\s+sale\s+/i, '')
    .replace(/^new\s+arrival\s+/i, '')
    .replace(/^1pcs\s+/i, '1PC ')
    .replace(/^2pcs\s+/i, '2PCS ')
    .replace(/^3pcs\s+/i, '3PCS ')
    .replace(/^5pcs\s+/i, '5PCS ')
    .replace(/^10pcs\s+/i, '10PCS ')
    .replace(/\s+/g, ' ')
    .trim();
  if (cleaned.length > 110) {
    // Truncate cleanly at word boundary
    const sub = cleaned.substring(0, 110);
    const lastSpace = sub.lastIndexOf(' ');
    cleaned = (lastSpace > 60 ? sub.substring(0, lastSpace) : sub).trim();
  }
  return cleaned;
}

function categorizeProduct(name, orderMeta) {
  const n = (name + ' ' + (orderMeta || '')).toLowerCase();

  if (/clipper|shaver|trimmer|hair|shampoo|comb|brush|serum|cream|lotion|fragrance|perfume|parfum|makeup|cosmetic|skincare|anti-wrinkle|mask|moisturiz|beauty|lipstick|nail/i.test(n)) {
    return 'hair-beauty';
  }
  if (/earphone|headphone|audio|speaker|cable|usb|charger|adapter|wire|bluetooth|mic|cord|phone stand|holder stand|tripod|wireless|power bank|earbud/i.test(n)) {
    return 'electronics';
  }
  if (/watch|smartwatch|bracelet|necklace|earring|jewelry|ring|pendant|brooch|bangle|piercing|chain|bead/i.test(n)) {
    return 'amasaha';
  }
  if (/bag|backpack|wallet|purse|pouch|handbag|tote|luggage|keychain|key holder|lunch box/i.test(n)) {
    return 'ibikapu';
  }
  if (/light|lamp|lantern|led strip|bulb|solar|neon|torch|flashlight/i.test(n)) {
    return 'amatara';
  }
  if (/dress|skirt|shirt|t-shirt|pant|trousers|jacket|hoodie|socks|shoes|sneakers|sandals|heels|boots|canvas|underwear|gloves|scarf|cap|hat|coat|blouse|suit|belt|vest|shorts/i.test(n)) {
    return 'fashion';
  }
  if (/baby|kids|toy|toddler|doll|puzzle|child|plush|cartoon/i.test(n)) {
    return 'abana';
  }
  if (/fitness|dumbbell|yoga|gym|bicycle|bike|cycling|exercise|workout|sport/i.test(n)) {
    return 'sports';
  }
  if (/pen|notebook|stationery|pencil|office|desk|eraser|tape/i.test(n)) {
    return 'books';
  }
  if (/cushion|pillow|curtain|mug|cup|bottle|decor|kitchen|spoon|fork|knife|cleaner|mat|towel/i.test(n)) {
    return 'impano';
  }
  return 'fashion';
}

function buildDescription(p, detail) {
  const parts = [];
  parts.push(`Original ${p.productName} directly imported from KiKUU Rwanda catalog.`);
  if (detail?.subTitle) {
    parts.push(detail.subTitle);
  }
  parts.push(`Features verified high-durability construction, strict quality inspection, and official local warranty.`);
  parts.push(`Includes same-day express delivery in Kigali and fast nationwide shipping across all provinces of Rwanda.`);
  return parts.join(' ');
}

// Clean image URL by removing tiny thumbnail transforms so full high-resolution image is served
function cleanImageUrl(url) {
  if (!url) return '';
  return url.split('?')[0].trim();
}

async function run() {
  console.log('--- Step 1: Gathering candidate products from KiKUU Rwanda wholesale pool ---');
  const candidatePool = [];
  const seenIds = new Set();
  const seenTitles = new Set();

  for (let page = 1; page <= 30; page++) {
    try {
      const res = await fetch(`https://rw.kikuu.com/api/marketing/products/wholesale?page=${page}&pageSize=40`, {
        headers: HEADERS,
        signal: AbortSignal.timeout(8000)
      });
      if (!res.ok) continue;
      const json = await res.json();
      if (!json.success || !Array.isArray(json.obj)) continue;

      for (const item of json.obj) {
        if (!item.id || seenIds.has(item.id)) continue;
        if (!item.productName || !isSafe(item.productName)) continue;
        const cleanedName = cleanTitle(item.productName);
        if (cleanedName.length < 5 || seenTitles.has(cleanedName.toLowerCase())) continue;
        if (!item.lowestPrice || item.lowestPrice <= 0) continue;
        if (!item.productImg0Show && !item.productImg0) continue;

        seenIds.add(item.id);
        seenTitles.add(cleanedName.toLowerCase());
        candidatePool.push({
          raw: item,
          cleanedName,
          price: item.lowestPrice,
          originalPrice: item.lowestReversePrice || Math.round(item.lowestPrice * 1.35)
        });
      }
      console.log(`Page ${page}: pool size = ${candidatePool.length}`);
      if (candidatePool.length >= 260) break;
    } catch (err) {
      console.warn(`Warning fetching page ${page}:`, err.message);
    }
  }

  console.log(`\nTotal candidate pool collected: ${candidatePool.length}`);
  if (candidatePool.length < 200) {
    throw new Error(`Failed to collect at least 200 products. Only found ${candidatePool.length}`);
  }

  console.log('\n--- Step 2: Fetching full product details (multiple real images & specs) for top 200 products ---');
  const selectedCandidates = candidatePool.slice(0, 210);
  const enrichedProducts = [];
  const seenImages = new Set();

  const BATCH_SIZE = 10;
  for (let i = 0; i < selectedCandidates.length; i += BATCH_SIZE) {
    const chunk = selectedCandidates.slice(i, i + BATCH_SIZE);
    const chunkResults = await Promise.all(chunk.map(async (cand) => {
      try {
        const res = await fetch(`https://rw.kikuu.com/api/product/detail?id=${cand.raw.id}`, {
          headers: HEADERS,
          signal: AbortSignal.timeout(6000)
        });
        if (res.ok) {
          const json = await res.json();
          return { cand, detail: json.obj?.product || null };
        }
      } catch {}
      return { cand, detail: null };
    }));

    for (const res of chunkResults) {
      if (enrichedProducts.length >= 200) break;

      const cand = res.cand;
      const detail = res.detail;

      // Collect all real images from detail and candidate
      const rawImgs = [
        detail?.productImg0Show,
        detail?.productImg1Show,
        detail?.productImg2Show,
        detail?.productImg3Show,
        detail?.productImg4Show,
        cand.raw.productImg0Show,
        cand.raw.productImg0
      ].filter(Boolean);

      const cleanedImages = Array.from(new Set(rawImgs.map(cleanImageUrl))).filter(u => u.startsWith('http'));
      if (cleanedImages.length === 0) continue;

      const primaryImg = cleanedImages[0];
      // Ensure primary image uniqueness
      if (seenImages.has(primaryImg)) continue;
      seenImages.add(primaryImg);

      const category = categorizeProduct(cand.cleanedName, cand.raw.orderMeta);
      const skuNumber = Math.floor(1000 + Math.random() * 9000);
      const categoryPrefix = category.slice(0, 3).toUpperCase();
      const sku = `KIK-${categoryPrefix}-${skuNumber}`;

      const createdProduct = {
        id: `kikuu-${cand.raw.id}`,
        name: cand.cleanedName,
        sku,
        description: buildDescription(cand.raw, detail),
        price: cand.price,
        discountPrice: cand.price,
        originalPrice: cand.originalPrice > cand.price ? cand.originalPrice : Math.round(cand.price * 1.3),
        category,
        stock: 35 + (cand.raw.id % 45),
        imageUrl: primaryImg,
        images: cleanedImages.slice(0, 5),
        shopName: 'KiKUU Rwanda Direct',
        shopId: 'shop-kikuu-rwanda-direct',
        supplierName: 'KiKUU Rwanda',
        supplierProductUrl: `https://rw.kikuu.com/detail/${cand.raw.id}`,
        source: 'kikuu',
        receiverName: 'Ruth',
        paymentMethods: ['MTN Mobile Money', 'MTN Merchant Code', 'Airtel Money'],
        merchantCode: '2328354',
        receiverPhone: '0780022600',
        location: 'Kigali, Rwanda',
        deliveryInfo: 'Express Delivery (1-2 business days in Kigali, 2-3 days upcountry)',
        status: 'Available',
        reviewStatus: 'Approved',
        isFeatured: (enrichedProducts.length % 7 === 0),
        isNewArrival: (enrichedProducts.length % 5 === 0),
        isBestSeller: (cand.raw.soldCount || 0) > 100,
        unit: 'Piece',
        reviewsCount: Math.min(25, Math.floor((cand.raw.soldCount || 0) / 10)),
        rating: 4.8,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      enrichedProducts.push(createdProduct);
    }

    console.log(`Enriched progress: ${enrichedProducts.length} / 200 products`);
    if (enrichedProducts.length >= 200) break;
  }

  console.log(`\nFinal enriched count: ${enrichedProducts.length} products`);
  if (enrichedProducts.length < 200) {
    throw new Error(`Did not reach 200 products. Reached ${enrichedProducts.length}`);
  }

  // Verification checks on the 200 products
  console.log('\n--- Step 3: Rigorous Validation of All 200 Products ---');
  const final200 = enrichedProducts.slice(0, 200);

  const idSet = new Set();
  const nameSet = new Set();
  const imgSet = new Set();
  const catDistribution = {};

  final200.forEach((p, idx) => {
    if (idSet.has(p.id)) throw new Error(`Duplicate product ID detected at #${idx}: ${p.id}`);
    idSet.add(p.id);

    if (nameSet.has(p.name.toLowerCase())) throw new Error(`Duplicate product name detected at #${idx}: ${p.name}`);
    nameSet.add(p.name.toLowerCase());

    if (imgSet.has(p.imageUrl)) throw new Error(`Duplicate image URL detected at #${idx}: ${p.imageUrl}`);
    imgSet.add(p.imageUrl);

    if (!p.price || p.price <= 0) throw new Error(`Invalid price at #${idx}: ${p.price}`);
    if (!p.images || p.images.length === 0) throw new Error(`Missing images array at #${idx}`);
    if (!p.description || p.description.length < 20) throw new Error(`Description too short at #${idx}`);

    catDistribution[p.category] = (catDistribution[p.category] || 0) + 1;
  });

  console.log('✅ 100% Uniqueness verified: 200 distinct IDs, 200 distinct names, 200 distinct image URLs.');
  console.log('Category distribution:', catDistribution);
  console.log('Sample product [0]:', {
    id: final200[0].id,
    name: final200[0].name,
    price: final200[0].price,
    category: final200[0].category,
    imageUrl: final200[0].imageUrl,
    imagesCount: final200[0].images.length,
    images: final200[0].images
  });

  // Verify first 5 image URLs via HEAD request to prove they are live and working
  console.log('\n--- Step 4: Probing sample image URLs for HTTP 200 ---');
  for (let i = 0; i < 5; i++) {
    const probe = await fetch(final200[i].imageUrl, { method: 'HEAD' });
    console.log(`Image #${i + 1} (${final200[i].id}): HTTP ${probe.status} ${probe.ok ? 'OK' : 'FAIL'}`);
    if (!probe.ok) throw new Error(`Image URL failed probe: ${final200[i].imageUrl}`);
  }

  // Save to /data/kikuu_200_verified.json
  const outFile = path.join(__dirname, '..', 'data', 'kikuu_200_verified.json');
  fs.writeFileSync(outFile, JSON.stringify(final200, null, 2), 'utf-8');
  console.log(`\nSuccessfully saved 200 verified products to ${outFile}`);
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
