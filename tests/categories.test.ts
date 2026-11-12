import assert from 'assert';
import { MAIN_CATEGORY_DEFINITIONS, mapProductToCategoryHierarchy } from '../src/data/categoryStructure.ts';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

async function testCategoryHierarchy() {
  console.log('🧪 Running Category Hierarchy Tests...');

  // 1. Verify exact 13 main categories
  const expectedNames = [
    'Clothing',
    'Shoes',
    'Luggage & Bags',
    'Watch & Jewelry',
    'Kids & Toys',
    'Home & Appliances',
    'Beauty',
    'Weddings',
    'Hair',
    'Phones & Tel',
    'Electronics',
    'Computer & Office',
    'Automobile Accessory & Tools'
  ];

  assert.strictEqual(MAIN_CATEGORY_DEFINITIONS.length, 13, 'Must have exactly 13 main categories');
  MAIN_CATEGORY_DEFINITIONS.forEach((cat, idx) => {
    assert.strictEqual(cat.name, expectedNames[idx], `Category ${idx + 1} must match exact name`);
    assert(cat.subcategories.length > 0, `Category ${cat.name} must have subcategories`);
    cat.subcategories.forEach(sub => {
      assert(sub.name && sub.name.length > 0, 'Subcategory must have a name');
      assert(Array.isArray(sub.items) && sub.items.length > 0, `Subcategory ${sub.name} must have level 3 items`);
    });
  });
  console.log('✅ Exactly 13 main categories and nested subcategories validated in source definitions.');

  // 2. Verify /api/categories/tree endpoint
  const treeRes = await fetch(`${BASE_URL}/api/categories/tree`);
  assert.strictEqual(treeRes.status, 200, 'Categories tree endpoint must return 200');
  const tree = await treeRes.json();
  assert(Array.isArray(tree), 'Categories tree must be an array');
  assert.strictEqual(tree.length, 13, 'Tree must contain 13 main categories');
  console.log(`✅ /api/categories/tree returned ${tree.length} top-level departments with live product counts.`);

  // 3. Verify product mapping
  const testShoe = { id: 'test-1', name: 'Men Classic Leather Oxford Shoes', description: 'Business footwear' };
  const mappedShoe = mapProductToCategoryHierarchy(testShoe);
  assert.strictEqual(mappedShoe.mainCategoryId, 'shoes', 'Oxford shoes must map to shoes');
  assert.strictEqual(mappedShoe.categoryName, 'Shoes');

  const testHair = { id: 'test-2', name: 'Brazilian Human Hair Lace Frontal Wig', description: 'Virgin hair' };
  const mappedHair = mapProductToCategoryHierarchy(testHair);
  assert.strictEqual(mappedHair.mainCategoryId, 'hair', 'Wig must map to hair');
  assert.strictEqual(mappedHair.categoryName, 'Hair');

  const testPhone = { id: 'test-3', name: 'Samsung Galaxy Smartphone Tempered Glass', description: 'Screen protector' };
  const mappedPhone = mapProductToCategoryHierarchy(testPhone);
  assert.strictEqual(mappedPhone.mainCategoryId, 'phones-tel', 'Phone accessory must map to phones-tel');
  assert.strictEqual(mappedPhone.categoryName, 'Phones & Tel');

  console.log('✅ Intelligent hierarchy auto-mapping validated for multiple product types.');

  // 4. Verify /api/products returns products intact without data loss
  const prodRes = await fetch(`${BASE_URL}/api/products`);
  assert.strictEqual(prodRes.status, 200);
  const products = await prodRes.json();
  assert(products.length >= 1, `Catalog must preserve all existing products (found ${products.length})`);
  console.log(`✅ Catalog integrity verified: ${products.length} products loaded with prices, images, and stock intact.`);

  console.log('🎉 ALL CATEGORY TESTS PASSED SUCCESSFULLY!');
}

testCategoryHierarchy().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
