const fs = require('fs');
const path = require('path');

const serverFile = path.resolve('server.ts');
let code = fs.readFileSync(serverFile, 'utf8');

// Load NEW_CJ_ITEMS from update_market_data.cjs
const migrationScript = fs.readFileSync('scripts/update_market_data.cjs', 'utf8');
const match = migrationScript.match(/const NEW_CJ_ITEMS = (\[[\s\S]*?\]);\n\n\/\/ 1\. Load/);
if (!match) {
  console.error('Could not extract NEW_CJ_ITEMS from migration script');
  process.exit(1);
}

const itemsArray = eval(match[1]);
console.log(`Extracted ${itemsArray.length} items`);

// Format into TypeScript code
const tsItems = itemsArray.map(item => {
  return `  {
    pid: ${JSON.stringify(item.pid)},
    productName: ${JSON.stringify(item.productName)},
    productSku: ${JSON.stringify(item.productSku)},
    productImage: ${JSON.stringify(item.productImage)},
    productImageSet: ${JSON.stringify(item.productImageSet)},
    sellPrice: ${item.sellPrice},
    description: ${JSON.stringify(item.description)},
    category: ${JSON.stringify(item.category)},
    brand: ${JSON.stringify(item.brand)},
    unit: ${JSON.stringify(item.unit)}${item.variations ? `,
    variations: ${JSON.stringify(item.variations)}` : ''}
  }`;
}).join(',\n');

// Find insertion point at end of CJ_CURATED_FEED
const target = `    productSku: 'CJ-WCH-LUX-17',
    productImage: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=800&q=80',
    productImageSet: [
      'https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=800&q=80'
    ],
    sellPrice: 17.80, // USD
    description: 'Sleek 7mm case profile with scratch-resistant sapphire crystal glass, calendar sub-dials, stainless steel Milanese magnetic strap, and 3ATM splash resistance.',
    category: 'amasaha',
    brand: 'Chronos',
    unit: 'Piece',
    variations: [
      { name: 'Color', options: ['Black & Gold', 'All Black', 'Silver & White', 'Rose Gold & Blue'] }
    ]
  }
];`;

if (!code.includes(target)) {
  console.error('Target chunk not found in server.ts');
  process.exit(1);
}

const replacement = `    productSku: 'CJ-WCH-LUX-17',
    productImage: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=800&q=80',
    productImageSet: [
      'https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=800&q=80'
    ],
    sellPrice: 17.80, // USD
    description: 'Sleek 7mm case profile with scratch-resistant sapphire crystal glass, calendar sub-dials, stainless steel Milanese magnetic strap, and 3ATM splash resistance.',
    category: 'amasaha',
    brand: 'Chronos',
    unit: 'Piece',
    variations: [
      { name: 'Color', options: ['Black & Gold', 'All Black', 'Silver & White', 'Rose Gold & Blue'] }
    ]
  },
${tsItems}
];`;

code = code.replace(target, replacement);
fs.writeFileSync(serverFile, code, 'utf8');
console.log('Successfully appended 27 CJ products to CJ_CURATED_FEED in server.ts!');
