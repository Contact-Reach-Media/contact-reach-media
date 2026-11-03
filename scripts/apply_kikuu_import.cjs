const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '..', 'data', 'market_db.json');
const KIKUU_FILE = path.join(__dirname, '..', 'data', 'kikuu_200_verified.json');

function run() {
  console.log('Loading market_db.json and kikuu_200_verified.json...');
  const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  const kikuuProducts = JSON.parse(fs.readFileSync(KIKUU_FILE, 'utf-8'));

  console.log(`Current products in DB: ${db.products.length}`);
  console.log(`KiKUU verified products to import: ${kikuuProducts.length}`);

  if (kikuuProducts.length !== 200) {
    throw new Error(`Expected exactly 200 KiKUU products, got ${kikuuProducts.length}`);
  }

  // Backup current db before modification
  const backupFile = path.join(__dirname, '..', 'data', `market_db.pre-kikuu-backup.json`);
  fs.writeFileSync(backupFile, JSON.stringify(db, null, 2), 'utf-8');
  console.log(`Created backup at ${backupFile}`);

  // Ensure KiKUU shop exists in db.shops
  db.shops = db.shops || [];
  let kikuuShop = db.shops.find(s => s.id === 'shop-kikuu-rwanda-direct' || s.name === 'KiKUU Rwanda Direct');
  if (!kikuuShop) {
    kikuuShop = {
      id: 'shop-kikuu-rwanda-direct',
      name: 'KiKUU Rwanda Direct',
      ownerName: 'KiKUU Rwanda Official',
      category: 'Cross-Border & Wholesale',
      phone: '+250780022600',
      location: 'Kigali & Direct Express',
      verified: true,
      active: true,
      rating: 4.9,
      reviewCount: 142,
      commissionRate: 10,
      status: 'Active',
      createdAt: new Date().toISOString()
    };
    db.shops.push(kikuuShop);
    console.log('Added KiKUU Rwanda Direct vendor shop to db.shops');
  }

  // Merge products: Remove any existing kikuu- IDs to avoid duplicates if re-run, then append the 200 verified products
  const nonKikuuProducts = db.products.filter(p => !p.id.startsWith('kikuu-'));
  console.log(`Retaining ${nonKikuuProducts.length} non-KiKUU products`);

  db.products = [...nonKikuuProducts, ...kikuuProducts];
  console.log(`New total products in database: ${db.products.length} (including 200 KiKUU products)`);

  // Update category item counts
  const categoryCounts = {};
  db.products.forEach(p => {
    if (p.category) {
      categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1;
    }
  });

  if (Array.isArray(db.categories)) {
    db.categories.forEach(c => {
      c.itemCount = categoryCounts[c.id] || 0;
    });
  }

  // Atomic write to disk
  const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
  fs.writeFileSync(tempFile, JSON.stringify(db, null, 2), 'utf-8');
  fs.renameSync(tempFile, DB_FILE);

  console.log('✅ Successfully persisted updated database to disk atomically!');
}

run();
