import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { generate200Products } from './generate_200_products.ts';

const DB_FILE = path.resolve('data/market_db.json');

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

function runImport() {
  console.log('Loading database from:', DB_FILE);
  const dbRaw = fs.readFileSync(DB_FILE, 'utf-8');
  const db = JSON.parse(dbRaw);

  const newProducts = generate200Products();
  console.log(`Generated ${newProducts.length} new products to import.`);

  const existingIds = new Set(db.products.map((p: any) => p.id));
  const productsToAdd = newProducts.filter(p => !existingIds.has(p.id));

  console.log(`Unique products to add: ${productsToAdd.length}`);
  if (productsToAdd.length === 0) {
    console.log('All products already exist in database.');
    return;
  }

  // Prepend to products so they appear as fresh new arrivals on the storefront
  db.products = [...productsToAdd, ...db.products];

  // Add inventory logs
  if (!db.inventoryLogs) db.inventoryLogs = [];
  productsToAdd.forEach(p => {
    db.inventoryLogs.unshift({
      id: `inv-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      productId: p.id,
      productName: p.name,
      previousStock: 0,
      newStock: p.stock,
      changeAmount: p.stock,
      reason: 'Bulk 200 Catalog Import - ContactReach Market Stock Intake',
      adminName: 'Ruth (System Owner)',
      timestamp: new Date().toISOString()
    });
  });

  // Limit inventory logs to last 2000
  if (db.inventoryLogs.length > 2000) {
    db.inventoryLogs = db.inventoryLogs.slice(0, 2000);
  }

  // Recalculate category counts
  const categoryCounts: Record<string, number> = {};
  db.products.forEach((p: any) => {
    if (p.status !== 'Hidden') {
      const cat = normalizeCategoryId(p.category, p.name);
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    }
  });

  if (db.categories && Array.isArray(db.categories)) {
    db.categories.forEach((c: any) => {
      c.itemCount = categoryCounts[c.id] || 0;
    });
  }

  // Add audit log
  if (!db.auditLogs) db.auditLogs = [];
  db.auditLogs.unshift({
    id: `aud-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
    timestamp: new Date().toISOString(),
    adminName: 'Ruth (System Owner)',
    adminRole: 'owner',
    action: 'BULK_PRODUCT_IMPORT',
    details: `Imported ${productsToAdd.length} products with Rwandan prices, Unsplash visuals, and verified MTN/Airtel payment details (0780022600 / 2328354).`
  });

  // Atomic write to disk
  const tempFile = path.resolve('data/market_db.tmp.json');
  fs.writeFileSync(tempFile, JSON.stringify(db, null, 2), 'utf-8');
  fs.renameSync(tempFile, DB_FILE);

  console.log(`Successfully saved ${db.products.length} total products to database.`);
}

runImport();
