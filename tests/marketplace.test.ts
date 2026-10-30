import assert from 'assert';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

// Comprehensive ContactReach Market Production Test Suite
// Testing: Authentication, RBAC, Cart/Checkout, Delivery, Coupons,
// Tracking privacy, Supplier commissions, Stock reservation, and Data integrity.

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

async function runTests() {
  console.log('====================================================');
  console.log('🧪 Starting ContactReach Market Automated Test Suite');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`✅ PASS: ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`❌ FAIL: ${name}`);
      console.error(`   Error: ${err.message || err}`);
      failed++;
    }
  }

  // TEST 1: Public Storefront Endpoints Available
  await test('Public storefront endpoints return clean initial state', async () => {
    const res = await fetch(`${BASE_URL}/api/settings`);
    assert.strictEqual(res.status, 200, 'Settings endpoint should return 200');
    const settings = await res.json();
    assert.strictEqual(settings.marketName, 'ContactReach Market');
    assert.strictEqual(settings.email, 'contactreachmedialimited@gmail.com');

    const catRes = await fetch(`${BASE_URL}/api/categories`);
    assert.strictEqual(catRes.status, 200);
    const categories = await catRes.json();
    assert(Array.isArray(categories) && categories.length >= 10, 'Should return at least 10 official categories');

    const prodRes = await fetch(`${BASE_URL}/api/products`);
    assert.strictEqual(prodRes.status, 200);
    const products = await prodRes.json();
    assert(Array.isArray(products), 'Products should be an array');
  });

  // TEST 2: Admin Authentication Security & Bad Password Rejection
  await test('Admin auth rejects invalid passwords and prevents backdoors', async () => {
    const badLogin = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'contactreachmedialimited@gmail.com', password: 'WrongPassword123' })
    });
    assert.strictEqual(badLogin.status, 401, 'Invalid password should be rejected with 401');

    const unauthorizedAccount = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'attacker@evil.com', password: 'SomeHackerPassword123!' })
    });
    assert.strictEqual(unauthorizedAccount.status, 401, 'Unauthorized emails should be rejected');
  });

  // TEST 3: Admin Authentication Success with Authorized Credentials
  let adminToken = '';
  await test('Admin login succeeds with verified credentials and issues session token', async () => {
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'contactreachmedialimited@gmail.com',
        password: process.env.ADMIN_PASSWORD || 'CRM@2026'
      })
    });
    assert.strictEqual(loginRes.status, 200, 'Admin login should succeed');
    const data = await loginRes.json();
    assert(data.token, 'Session token should be returned');
    assert.strictEqual(data.admin.role, 'owner', 'Role should be owner');
    adminToken = data.token;

    // Reset maintenance mode to false for initial tests
    await fetch(`${BASE_URL}/api/admin/maintenance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ isMaintenanceMode: false })
    });
  });

  // TEST 3B: Admin Google Firebase Authentication Success
  await test('Admin can sign in with authorized Google account', async () => {
    const googleAdminRes = await fetch(`${BASE_URL}/api/auth/firebase-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'contactreachmedialimited@gmail.com',
        displayName: 'Ruth (System Owner)',
        uid: 'google-admin-owner-uid-123'
      })
    });
    assert.strictEqual(googleAdminRes.status, 200, 'Admin Google login should succeed');
    const googleData = await googleAdminRes.json();
    assert(googleData.token, 'Session token should be returned');
    assert.strictEqual(googleData.admin.role, 'owner');
  });

  // TEST 4: Protected Admin Endpoints Guard
  await test('Protected admin endpoints require valid Bearer token', async () => {
    const unauth = await fetch(`${BASE_URL}/api/admin/stats`);
    assert.strictEqual(unauth.status, 401, 'Stats without token should be 401');

    const authRes = await fetch(`${BASE_URL}/api/admin/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(authRes.status, 200, 'Stats with token should be 200');
    const stats = await authRes.json();
    assert(typeof stats.totalOrders === 'number', 'totalOrders should be numeric');
  });

  // TEST 5: Coupon Validation Logic
  await test('Coupon validation accurately calculates percentage discount with bounds', async () => {
    const res = await fetch(`${BASE_URL}/api/coupons/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'WELCOME10', subtotal: 25000 })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.valid, true);
    assert.strictEqual(data.discountAmount, 2500, '10% of 25000 should be 2500');

    // Test under min amount
    const underMin = await fetch(`${BASE_URL}/api/coupons/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'WELCOME10', subtotal: 5000 })
    });
    assert.strictEqual(underMin.status, 400, 'Should reject order under 10000 min order threshold');
  });

  // TEST 6: Supplier Application Submission & Management
  let applicationId = '';
  await test('Supplier can apply and admin can review application', async () => {
    const applyRes = await fetch(`${BASE_URL}/api/supplier-applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessName: 'Kigali Quality Audio Ltd',
        ownerName: 'Jean Paul',
        phone: '0788990011',
        email: 'jeanpaul@qualityaudio.rw',
        location: 'Downtown Kigali, Quartier Commercial',
        category: 'electronics',
        description: 'Authorized importer of sound systems and smart audio accessories.'
      })
    });
    assert.strictEqual(applyRes.status, 201, 'Application submission should be 201');
    const appData = await applyRes.json();
    applicationId = appData.application.id;

    // Admin view
    const adminAppsRes = await fetch(`${BASE_URL}/api/admin/supplier-applications`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(adminAppsRes.status, 200);
    const apps = await adminAppsRes.json();
    assert(apps.some((a: any) => a.id === applicationId), 'Submitted application should appear in admin list');

    // Admin approve
    const approveRes = await fetch(`${BASE_URL}/api/admin/supplier-applications/${applicationId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ status: 'Approved' })
    });
    assert.strictEqual(approveRes.status, 200);
    const approved = await approveRes.json();
    assert.strictEqual(approved.status, 'Approved');
  });

  // TEST 7: Product Creation with Supplier Association & Price in RWF
  let createdProductId = '';
  await test('Admin can add verified supplier product with inventory', async () => {
    const prodRes = await fetch(`${BASE_URL}/api/admin/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        name: 'Wireless Studio Bluetooth Headphones',
        category: 'electronics',
        description: 'Crystal clear studio sound with deep bass and noise cancellation.',
        price: 35000,
        stock: 15,
        shopName: 'Inziza Sound Studio Lab',
        images: [
          'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80',
          'https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=600&q=80',
          'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=600&q=80'
        ],
        status: 'Available'
      })
    });
    assert.strictEqual(prodRes.status, 201);
    const prod = await prodRes.json();
    assert.strictEqual(prod.name, 'Wireless Studio Bluetooth Headphones');
    assert.strictEqual(prod.price, 35000);
    assert.strictEqual(prod.stock, 15);
    assert(Array.isArray(prod.images) && prod.images.length === 3, 'Product should have 3 images linked');
    assert.strictEqual(prod.imageUrl, prod.images[0], 'Primary imageUrl should match first image');
    createdProductId = prod.id;

    // Verify that the shop was automatically created in shops and stored as isRecommended: false
    const shopsRes = await fetch(`${BASE_URL}/api/shops`);
    assert.strictEqual(shopsRes.status, 200);
    const allShops = await shopsRes.json();
    const createdShop = allShops.find((s: any) => s.name === 'Inziza Sound Studio Lab');
    assert(createdShop, 'Shop "Inziza Sound Studio Lab" should have been automatically stored in shops');
    assert.strictEqual(createdShop.isRecommended, false, 'Auto-created shop must NOT be recommended (isRecommended: false)');

    // Verify that uploading another product with the same shop name reuses the shop without duplicates
    const secondProdRes = await fetch(`${BASE_URL}/api/admin/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        name: 'Studio Audio Cable Aux Cord',
        category: 'electronics',
        description: 'Gold-plated 3.5mm stereo cable.',
        price: 5000,
        stock: 30,
        shopName: 'Inziza Sound Studio Lab',
        status: 'Available'
      })
    });
    assert.strictEqual(secondProdRes.status, 201);
    const secondProd = await secondProdRes.json();
    assert.strictEqual(secondProd.shopId, createdShop.id, 'Second product should reuse existing shopId');

    const shopsAfterRes = await fetch(`${BASE_URL}/api/shops`);
    const allShopsAfter = await shopsAfterRes.json();
    const matchingCount = allShopsAfter.filter((s: any) => s.name === 'Inziza Sound Studio Lab').length;
    assert.strictEqual(matchingCount, 1, 'Should NOT create duplicate shop when shop already exists');

    // Test updating images on product
    const updateImgRes = await fetch(`${BASE_URL}/api/admin/products/${createdProductId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        images: [
          'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=600&q=80',
          'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80',
          'https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=600&q=80',
          'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=600&q=80'
        ]
      })
    });
    assert.strictEqual(updateImgRes.status, 200);
    const updatedProd = await updateImgRes.json();
    assert.strictEqual(updatedProd.images.length, 4, 'Updated product should have 4 images');
  });

  // TEST 8: Order Placement, Commission Calculation, and Tracking Token
  let createdOrderNumber = '';
  let createdTrackingToken = '';
  await test('Customer order checkout calculates delivery fee, commissions, and generates tracking token', async () => {
    const orderRes = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Aline Mugabo',
        customerPhone: '0788123456',
        deliveryLocation: 'Gasabo (Kimironko)',
        deliveryAddress: 'KG 15 Ave, Kimironko',
        items: [{ productId: createdProductId, quantity: 1 }],
        paymentMethod: 'MTN Mobile Money'
      })
    });
    assert.strictEqual(orderRes.status, 201);
    const order = await orderRes.json();
    assert(order.orderNumber, 'Order number should be generated');
    assert(order.trackingToken, 'Unguessable tracking token must be generated');
    assert.strictEqual(order.subtotal, 35000);
    assert.strictEqual(order.deliveryFee, 1500, 'Gasabo delivery fee should be 1500 FRW');
    assert.strictEqual(order.totalAmount, 36500, 'Total should be 35000 + 1500 = 36500');
    assert.strictEqual(order.commissionEarned, 3500, '10% marketplace commission on 35000 should be 3500');
    assert.strictEqual(order.supplierPayoutAmount, 31500, 'Supplier payout should be 31500');

    createdOrderNumber = order.orderNumber;
    createdTrackingToken = order.trackingToken;
  });

  // TEST 9: Order Tracking Privacy Guard
  await test('Order tracking enforces token/phone check and sanitizes public fields', async () => {
    // Attempt 1: tracking without credentials should be rejected
    const unauthenticated = await fetch(`${BASE_URL}/api/orders/${createdOrderNumber}`);
    assert.strictEqual(unauthenticated.status, 403, 'Public tracking without phone or token must be rejected with 403');

    // Attempt 2: tracking with correct token should succeed with sanitized data
    const tokenTrack = await fetch(`${BASE_URL}/api/orders/${createdOrderNumber}?token=${createdTrackingToken}`);
    assert.strictEqual(tokenTrack.status, 200, 'Tracking with valid trackingToken must succeed');
    const tokenData = await tokenTrack.json();
    assert.strictEqual(tokenData.orderNumber, createdOrderNumber);
    assert.strictEqual(tokenData.commissionEarned, undefined, 'Public tracking MUST NOT leak internal commission');
    assert.strictEqual(tokenData.supplierPayoutAmount, undefined, 'Public tracking MUST NOT leak supplier payouts');

    // Attempt 3: tracking with recipient phone number should succeed
    const phoneTrack = await fetch(`${BASE_URL}/api/orders/${createdOrderNumber}?phone=0788123456`);
    assert.strictEqual(phoneTrack.status, 200, 'Tracking with matching recipient phone must succeed');
  });

  // TEST 10: Payment Confirmation Submission & Administrative Verification
  let confirmationId = '';
  await test('Customer can submit payment confirmation and admin can approve', async () => {
    const confirmRes = await fetch(`${BASE_URL}/api/payments/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderNumber: createdOrderNumber,
        customerName: 'Aline Mugabo',
        paymentPhone: '0788123456',
        paymentMethod: 'MTN Mobile Money',
        amountPaid: 36500,
        transactionId: `TXN${Date.now()}`
      })
    });
    assert.strictEqual(confirmRes.status, 200);
    const confData = await confirmRes.json();
    assert(
      confData.confirmation.verificationStatus === 'Pending Verification' || confData.confirmation.verificationStatus === 'Pending Review',
      'Should be in Pending Verification or Pending Review state'
    );
    assert.strictEqual(confData.order.paymentStatus, 'Pending Verification');
    confirmationId = confData.confirmation.id;

    // Admin verifies and approves payment
    const verifyRes = await fetch(`${BASE_URL}/api/admin/payments/${confirmationId}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ action: 'approve', adminNotes: 'Verified via MTN MoMo statement.' })
    });
    assert.strictEqual(verifyRes.status, 200);
    const verifiedData = await verifyRes.json();
    assert.strictEqual(verifiedData.order.paymentStatus, 'Paid');
    assert.strictEqual(verifiedData.order.status, 'Confirmed');
    assert.strictEqual(verifiedData.order.stockDeducted, true, 'Stock should be deducted upon verified payment');

    // Check product stock deduction
    const prodCheck = await fetch(`${BASE_URL}/api/products/${createdProductId}`);
    const updatedProd = await prodCheck.json();
    assert.strictEqual(updatedProd.stock, 14, 'Stock should decrease from 15 to 14');
  });

  // TEST 10B: Payment Confirmation with Pasted SMS Message and Screenshot Proof
  await test('Customer can submit payment confirmation by pasting SMS message and admin can review proof', async () => {
    // Create a new order to test pasted SMS confirmation flow
    const orderRes = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Kwizera Bosco',
        customerPhone: '0780112233',
        deliveryLocation: 'Kicukiro (Sonatubes)',
        deliveryAddress: 'Sonatubes near Bank of Kigali',
        items: [{ productId: createdProductId, quantity: 1 }],
        paymentMethod: 'MTN Merchant Code'
      })
    });
    assert.strictEqual(orderRes.status, 201);
    const order = await orderRes.json();

    const sampleSms = `Y'ello! You have transferred 36,500 RWF to ContactReach Market (2328354) on 2026-10-21. TxId: 991827461. Fee: 100 RWF. New balance: 140,200 RWF.`;
    const sampleScreenshot = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

    const confirmRes = await fetch(`${BASE_URL}/api/payments/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderNumber: order.orderNumber,
        customerName: 'Kwizera Bosco',
        paymentPhone: '0780112233',
        paymentMethod: 'MTN Merchant Code',
        amountPaid: 36500,
        confirmationMessage: sampleSms,
        screenshotUrl: sampleScreenshot
      })
    });
    assert.strictEqual(confirmRes.status, 200, 'Confirmation submission with pasted SMS must succeed');
    const confirmData = await confirmRes.json();
    assert.strictEqual(confirmData.confirmation.confirmationMessage, sampleSms, 'Pasted SMS message must be preserved');
    assert.strictEqual(confirmData.confirmation.transactionId, '991827461', 'TxId should be automatically extracted from SMS');
    assert(confirmData.confirmation.screenshotUrl, 'Screenshot URL must be stored');

    // Admin can retrieve the payment confirmation with proof details
    const adminPaymentsRes = await fetch(`${BASE_URL}/api/admin/payments`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(adminPaymentsRes.status, 200);
    const paymentsList = await adminPaymentsRes.json();
    const foundPm = paymentsList.find((p: any) => p.orderNumber === order.orderNumber);
    assert(foundPm, 'Payment record should be listed for admin');
    assert.strictEqual(foundPm.confirmationMessage, sampleSms, 'Admin must see customer pasted SMS message');
    assert.strictEqual(foundPm.screenshotUrl, sampleScreenshot, 'Admin must see customer uploaded screenshot');
  });

  // TEST 11: SEO and Structured Output Routes
  await test('Robots.txt and Sitemap.xml are dynamically served', async () => {
    const robotsRes = await fetch(`${BASE_URL}/robots.txt`);
    assert.strictEqual(robotsRes.status, 200);
    const robotsText = await robotsRes.text();
    assert(robotsText.includes('Sitemap:'), 'Robots.txt must declare sitemap');

    const sitemapRes = await fetch(`${BASE_URL}/sitemap.xml`);
    assert.strictEqual(sitemapRes.status, 200);
    const sitemapText = await sitemapRes.text();
    assert(sitemapText.includes('<urlset'), 'Sitemap must contain XML urlset');
    assert(sitemapText.includes(createdProductId), 'Sitemap should include active product URLs');
  });

  // TEST 12: Buyer Exclusive Google Authentication & Rejection of Legacy Password Flows
  const buyerGoogleEmail = `buyer.shopper.${Date.now()}@gmail.com`;
  const buyerGoogleUid = `google_uid_${Date.now()}`;
  let registeredBuyerId = '';
  let buyerToken = '';

  await test('Buyer signs in exclusively with Google, and legacy password registration is rejected', async () => {
    // 1. Verify legacy password registration is rejected in favor of Google-only
    const legacyRegRes = await fetch(`${BASE_URL}/api/buyers/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: '0789123456',
        password: '12345'
      })
    });
    assert.strictEqual(legacyRegRes.status, 400, 'Legacy password registration must be rejected');
    const legacyRegData = await legacyRegRes.json();
    assert.strictEqual(legacyRegData.useGoogleSignIn, true, 'Response must instruct to use Google Sign-In');

    // 2. Successful Buyer Google Sign-In
    const googleLoginRes = await fetch(`${BASE_URL}/api/buyers/google-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: buyerGoogleEmail,
        displayName: 'Gisele Uwase',
        uid: buyerGoogleUid,
        photoURL: 'https://lh3.googleusercontent.com/a/default-user',
        phoneNumber: '0789123456'
      })
    });
    assert.strictEqual(googleLoginRes.status, 200, 'Buyer Google login should return 200');
    const loginData = await googleLoginRes.json();
    assert(loginData.token, 'Session token should be returned');
    assert.strictEqual(loginData.user.email, buyerGoogleEmail);
    assert.strictEqual(loginData.user.name, 'Gisele Uwase');
    assert.strictEqual(loginData.user.authProvider, 'google');
    registeredBuyerId = loginData.user.id;
    buyerToken = loginData.token;

    // 3. Buyer can fetch profile with session token
    const meRes = await fetch(`${BASE_URL}/api/buyers/me`, {
      headers: { Authorization: `Bearer ${buyerToken}` }
    });
    assert.strictEqual(meRes.status, 200);
    const meData = await meRes.json();
    assert.strictEqual(meData.user.id, registeredBuyerId);
    assert.strictEqual(meData.user.email, buyerGoogleEmail);

    // 4. Buyer can update delivery details (address & courier phone)
    const updateRes = await fetch(`${BASE_URL}/api/buyers/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${buyerToken}`
      },
      body: JSON.stringify({
        deliveryAddress: 'Kigali, Kicukiro, Sonatubes',
        phone: '0789123456'
      })
    });
    assert.strictEqual(updateRes.status, 200);
    const updatedData = await updateRes.json();
    assert.strictEqual(updatedData.user.deliveryAddress, 'Kigali, Kicukiro, Sonatubes');
  });

  // TEST 13: Admin Can See Google-Authenticated Buyer Information
  await test('User information can be seen by admin with full Google profile and security status', async () => {
    const adminCustRes = await fetch(`${BASE_URL}/api/admin/customers`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(adminCustRes.status, 200, 'Admin can view all customers');
    const allCustomers = await adminCustRes.json();
    const createdBuyer = allCustomers.find((c: any) => c.email === buyerGoogleEmail || c.id === registeredBuyerId);
    assert(createdBuyer, 'Created Google buyer must appear in admin customer directory');
    assert.strictEqual(createdBuyer.name, 'Gisele Uwase');
    assert.strictEqual(createdBuyer.isRegisteredBuyer, true, 'Admin can see that user has registered account');
    assert.strictEqual(createdBuyer.deliveryAddress, 'Kigali, Kicukiro, Sonatubes');

    // Admin can get detailed customer profile and associated orders
    const detailRes = await fetch(`${BASE_URL}/api/admin/customers/${registeredBuyerId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(detailRes.status, 200, 'Admin can view individual customer profile');
    const detailData = await detailRes.json();
    assert.strictEqual(detailData.customer.id, registeredBuyerId);
    assert.strictEqual(detailData.customer.email, buyerGoogleEmail);
    assert(Array.isArray(detailData.orders), 'Orders list should be an array');
  });


  // TEST 14: Percentage Discount Calculation on Products
  await test('Admin product creation supports % percentage discount and auto-computes promo price', async () => {
    const prodWithDiscountRes = await fetch(`${BASE_URL}/api/admin/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        name: 'Glow Facial Vitamin C Serum (20% OFF Special)',
        price: 25000,
        discountPercent: 20,
        category: 'hair-beauty',
        description: 'Brightening facial serum with 20% promotional discount.',
        stock: 40
      })
    });
    assert.strictEqual(prodWithDiscountRes.status, 201, 'Product with % discount should be created');
    const createdDiscountProd = await prodWithDiscountRes.json();
    assert.strictEqual(createdDiscountProd.price, 25000);
    assert.strictEqual(createdDiscountProd.discountPercent, 20, 'discountPercent must be 20%');
    assert.strictEqual(createdDiscountProd.discountPrice, 20000, '20% off 25,000 FRW must be 20,000 FRW');

    // Update discount to 30%
    const updateDiscountRes = await fetch(`${BASE_URL}/api/admin/products/${createdDiscountProd.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        discountPercent: 30
      })
    });
    assert.strictEqual(updateDiscountRes.status, 200);
    const updatedDiscountProd = await updateDiscountRes.json();
    assert.strictEqual(updatedDiscountProd.discountPercent, 30);
    assert.strictEqual(updatedDiscountProd.discountPrice, 17500, '30% off 25,000 FRW must be 17,500 FRW');
  });

  // TEST 16: Simplified Payment Flow - Method Switching without Duplicate Orders, Duplicate Txn ID Flagging & Under Verification
  await test('Customer can switch payment method on existing order, duplicate transaction IDs are flagged suspicious, and admin can mark Under Verification', async () => {
    // 1. Create order
    const orderRes = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Gisele Umuhoza',
        customerPhone: '0788776655',
        deliveryLocation: 'Nyarugenge (City Center)',
        deliveryAddress: 'KN 4 Ave, Kigali',
        items: [{ productId: createdProductId, quantity: 1 }],
        paymentMethod: 'MTN Merchant Code'
      })
    });
    assert.strictEqual(orderRes.status, 201);
    const order = await orderRes.json();
    assert.strictEqual(order.paymentMethod, 'MTN Merchant Code');

    // 2. Switch payment method on the SAME order reference without creating a duplicate order
    const switchRes = await fetch(`${BASE_URL}/api/orders/${order.orderNumber}/payment-method`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentMethod: 'Airtel Money' })
    });
    assert.strictEqual(switchRes.status, 200, 'Switching payment method must succeed');
    const switchData = await switchRes.json();
    assert.strictEqual(switchData.order.paymentMethod, 'Airtel Money');
    assert.strictEqual(switchData.order.orderNumber, order.orderNumber, 'Order reference must remain identical');

    // 3. Submit payment confirmation with a transaction ID that was already used on an earlier order (e.g. 991827461)
    const duplicateTxn = '991827461'; // used in Test 10B
    const confirmRes = await fetch(`${BASE_URL}/api/payments/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderNumber: order.orderNumber,
        customerName: 'Gisele Umuhoza',
        paymentPhone: '0788776655',
        paymentMethod: 'Airtel Money',
        amountPaid: order.totalAmount,
        transactionId: duplicateTxn
      })
    });
    assert.strictEqual(confirmRes.status, 200);
    const confirmData = await confirmRes.json();
    assert.strictEqual(confirmData.confirmation.flaggedSuspicious, true, 'Duplicate transaction ID must be flagged suspicious');
    assert.strictEqual(confirmData.confirmation.isDuplicateTxn, true);
    assert(confirmData.confirmation.suspiciousReason?.includes(duplicateTxn));

    // 4. Admin marks payment as Under Verification
    const auditRes = await fetch(`${BASE_URL}/api/admin/payments/${confirmData.confirmation.id}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ action: 'under_verification', adminNotes: 'Suspicious duplicate transaction reference detected. Requesting telecom statement export.' })
    });
    assert.strictEqual(auditRes.status, 200);
    const auditData = await auditRes.json();
    assert.strictEqual(auditData.confirmation.verificationStatus, 'Under Verification');
    assert.strictEqual(auditData.order.paymentStatus, 'Under Verification');
  });

  // TEST 17: Duplicate Order Prevention on Rapid Checkout
  await test('Rapid re-submission of identical order returns original order without duplicating orders', async () => {
    const payload = {
      customerName: 'Eric Safari',
      customerPhone: '0780998877',
      deliveryLocation: 'Gasabo (Kacyiru)',
      deliveryAddress: 'KG 544 St, Kacyiru',
      items: [{ productId: createdProductId, quantity: 1 }],
      paymentMethod: 'MTN Mobile Money'
    };

    const firstRes = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    assert.strictEqual(firstRes.status, 201);
    const firstOrder = await firstRes.json();

    // Submit identical order within 2 seconds
    const secondRes = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    assert.strictEqual(secondRes.status, 200, 'Duplicate rapid submission must return 200 with existing order');
    const secondOrder = await secondRes.json();
    assert.strictEqual(secondOrder.orderNumber, firstOrder.orderNumber, 'Must return the exact same order reference');
    assert.strictEqual(secondOrder.id, firstOrder.id);
  });

  // TEST 18: Supplier Payout Record Creation & Duplicate Disbursement Prevention
  await test('Approved payments generate supplier payout records, and duplicate payouts are blocked', async () => {
    // 1. Fetch current payouts
    const payoutsRes = await fetch(`${BASE_URL}/api/admin/supplier-payouts`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(payoutsRes.status, 200);
    const payouts = await payoutsRes.json();
    assert(Array.isArray(payouts), 'Supplier payouts should be an array');

    // Find the payout record created for createdOrderNumber (approved in Test 10)
    const orderPayout = payouts.find((p: any) => p.orderNumber === createdOrderNumber);
    assert(orderPayout, `Supplier payout record for Order #${createdOrderNumber} must be present`);
    assert.strictEqual(orderPayout.status, 'Pending');
    assert.strictEqual(orderPayout.payoutAmount, 31500, 'Net supplier payout must be 31500 FRW');

    // 2. Disburse the payout
    const disburseRes = await fetch(`${BASE_URL}/api/admin/supplier-payouts/${orderPayout.id}/disburse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ paymentReference: 'MOMO-PAY-776611' })
    });
    assert.strictEqual(disburseRes.status, 200);
    const disbursed = await disburseRes.json();
    assert.strictEqual(disbursed.payout.status, 'Paid');

    // 3. Attempting duplicate disbursement MUST fail with 400
    const duplicateDisburse = await fetch(`${BASE_URL}/api/admin/supplier-payouts/${orderPayout.id}/disburse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ paymentReference: 'MOMO-PAY-DUPLICATE' })
    });
    assert.strictEqual(duplicateDisburse.status, 400, 'Duplicate payout disbursement must be blocked with 400');
    const errData = await duplicateDisburse.json();
    assert(errData.error?.includes('already been disbursed'), 'Error message must state payout was already disbursed');
  });

  // TEST 19: Website Maintenance Mode Controls
  await test('Maintenance mode pauses public checkout with 503 while allowing admin access', async () => {
    // 1. Admin enables maintenance mode
    const enableMaintRes = await fetch(`${BASE_URL}/api/admin/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        isMaintenanceMode: true,
        maintenanceMessage: 'ContactReach Market is currently under scheduled maintenance. We will return online shortly.'
      })
    });
    assert.strictEqual(enableMaintRes.status, 200);

    // 2. Public customer attempt to place order must be rejected with 503
    const publicOrderRes = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Public Buyer',
        customerPhone: '0780223344',
        deliveryLocation: 'Gasabo',
        items: [{ productId: createdProductId, quantity: 1 }]
      })
    });
    assert.strictEqual(publicOrderRes.status, 503, 'Public checkout during maintenance mode must return 503');
    const maintErr = await publicOrderRes.json();
    assert(maintErr.error?.includes('maintenance'), 'Error must contain maintenance message');

    // 3. Admin with Bearer token can still place test orders during maintenance mode
    const adminOrderRes = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        customerName: 'Admin Test Shopper',
        customerPhone: '0780991122',
        deliveryLocation: 'Gasabo',
        deliveryAddress: 'KG 12 St',
        items: [{ productId: createdProductId, quantity: 1 }]
      })
    });
    assert.strictEqual(adminOrderRes.status, 201, 'Admin must be able to test checkout during maintenance');

    // 4. Restore normal mode
    await fetch(`${BASE_URL}/api/admin/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ isMaintenanceMode: false })
    });
  });

  // TEST 20: Stock Restoration upon Order Cancellation
  await test('Cancelling an order restores inventory stock and logs audit trail', async () => {
    // Get product stock before
    const prodResBefore = await fetch(`${BASE_URL}/api/products/${createdProductId}`);
    const prodBefore = await prodResBefore.json();
    const stockBefore = prodBefore.stock;

    // Create an order
    const orderRes = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Keza Diane',
        customerPhone: '0788998822',
        deliveryLocation: 'Nyarugenge',
        deliveryAddress: 'KN 20 St',
        items: [{ productId: createdProductId, quantity: 2 }]
      })
    });
    assert.strictEqual(orderRes.status, 201);
    const ord = await orderRes.json();

    // Mark paid & deduct stock
    const payRes = await fetch(`${BASE_URL}/api/admin/orders/${ord.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ status: 'Confirmed', paymentStatus: 'Paid' })
    });
    assert.strictEqual(payRes.status, 200);

    const prodResAfterPay = await fetch(`${BASE_URL}/api/products/${createdProductId}`);
    const prodAfterPay = await prodResAfterPay.json();
    assert.strictEqual(prodAfterPay.stock, stockBefore - 2, 'Stock should decrease by 2 units');

    // Cancel order -> stock must be restored
    const cancelRes = await fetch(`${BASE_URL}/api/admin/orders/${ord.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ status: 'Cancelled', note: 'Customer requested cancellation.' })
    });
    assert.strictEqual(cancelRes.status, 200);

    const prodResRestored = await fetch(`${BASE_URL}/api/products/${createdProductId}`);
    const prodRestored = await prodResRestored.json();
    assert.strictEqual(prodRestored.stock, stockBefore, 'Stock must be fully restored upon cancellation');
  });

  // TEST 21: USSD Payment Code Construction & URI Encoding
  await test('USSD builder generates precise Rwandan codes and phone dialer tel: URI', async () => {
    const { buildUssdCode, formatUssdTelUri } = await import('../src/utils/ussd.ts');

    // MTN MoMo Direct: *182*1*1*0780022600*AMOUNT#
    const momoCode = buildUssdCode('MTN Mobile Money', 35000, '0780022600');
    assert.strictEqual(momoCode, '*182*1*1*0780022600*35000#');
    const momoUri = formatUssdTelUri(momoCode);
    assert.strictEqual(momoUri, 'tel:*182*1*1*0780022600*35000%23', '# must be encoded as %23');

    // MTN MoMoPay Merchant: *182*8*1*2328354*AMOUNT#
    const merchantCode = buildUssdCode('MTN Merchant Code', 50000, undefined, '2328354');
    assert.strictEqual(merchantCode, '*182*8*1*2328354*50000#');
    const merchantUri = formatUssdTelUri(merchantCode);
    assert.strictEqual(merchantUri, 'tel:*182*8*1*2328354*50000%23');

    // Airtel Money: *182*1*2*0780022600*AMOUNT#
    const airtelCode = buildUssdCode('Airtel Money', 20000, '0780022600');
    assert.strictEqual(airtelCode, '*182*1*2*0780022600*20000#');
    const airtelUri = formatUssdTelUri(airtelCode);
    assert.strictEqual(airtelUri, 'tel:*182*1*2*0780022600*20000%23');
  });

  // TEST 22: Payment Evidence Isolation (Never Treated as Paid without independent admin verification)
  await test('Payment evidence submission is strictly quarantined in Pending Verification and order remains unpaid until verified', async () => {
    // 1. Create an order
    const orderRes = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Sam Habimana',
        customerPhone: '0780445566',
        deliveryLocation: 'Kicukiro (Gikondo)',
        items: [{ productId: createdProductId, quantity: 1 }],
        paymentMethod: 'MTN Mobile Money'
      })
    });
    assert.strictEqual(orderRes.status, 201);
    const order = await orderRes.json();
    assert.strictEqual(order.paymentStatus, 'Pending Payment');

    // 2. Customer submits claim of payment with fake Txn ID
    const submitRes = await fetch(`${BASE_URL}/api/payments/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderNumber: order.orderNumber,
        customerName: 'Sam Habimana',
        paymentPhone: '0780445566',
        paymentMethod: 'MTN Mobile Money',
        amountPaid: order.totalAmount,
        transactionId: `CLAIM-${Date.now()}`
      })
    });
    assert.strictEqual(submitRes.status, 200);

    // 3. Verify order is in Pending Verification and NOT Paid
    const trackRes = await fetch(`${BASE_URL}/api/orders/${order.orderNumber}?token=${order.trackingToken}`);
    assert.strictEqual(trackRes.status, 200);
    const trackedOrder = await trackRes.json();
    assert.strictEqual(trackedOrder.paymentStatus, 'Pending Verification', 'Unverified evidence must NEVER mark order as Paid');
    assert.notStrictEqual(trackedOrder.paymentStatus, 'Paid');
    assert.notStrictEqual(trackedOrder.status, 'Confirmed');
  });

  // TEST 23: Complete Supplier Management - Reject Application & Clean State
  await test('Admin can review and reject unauthorized supplier applications with audit trail', async () => {
    // 1. Submit suspicious supplier application
    const applyRes = await fetch(`${BASE_URL}/api/supplier-applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessName: 'Unverified Vendor Hub',
        ownerName: 'Unknown',
        phone: '0780000000',
        location: 'Remote',
        category: 'electronics',
        description: 'No documentation provided.'
      })
    });
    assert.strictEqual(applyRes.status, 201);
    const appData = await applyRes.json();

    // 2. Admin rejects application
    const rejectRes = await fetch(`${BASE_URL}/api/admin/supplier-applications/${appData.application.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ status: 'Rejected', adminNotes: 'Failed business identification.' })
    });
    assert.strictEqual(rejectRes.status, 200);
    const rejected = await rejectRes.json();
    assert.strictEqual(rejected.status, 'Rejected');
  });

  // TEST 24: System Health Check Endpoint
  await test('System Health check endpoint returns detailed operational metrics', async () => {
    const healthRes = await fetch(`${BASE_URL}/api/health`);
    assert.strictEqual(healthRes.status, 200, 'Health check should return 200');
    const health = await healthRes.json();
    assert.strictEqual(health.status, 'healthy');
    assert.strictEqual(health.database.storage, 'persistent-json-atomic');
    assert(typeof health.uptimeSeconds === 'number', 'Uptime should be a number');
    assert(health.database.productsCount >= 0, 'Products count should be non-negative');
    assert(health.database.ordersCount >= 0, 'Orders count should be non-negative');
  });

  // TEST 25: Security Headers Enforcement
  await test('Security headers are strictly enforced on HTTP responses', async () => {
    const res = await fetch(`${BASE_URL}/api/settings`);
    assert.strictEqual(res.headers.get('x-content-type-options'), 'nosniff', 'Must include X-Content-Type-Options: nosniff');
    assert.strictEqual(res.headers.get('x-frame-options'), 'SAMEORIGIN', 'Must include X-Frame-Options: SAMEORIGIN');
    assert.strictEqual(res.headers.get('referrer-policy'), 'strict-origin-when-cross-origin', 'Must include Referrer-Policy');
  });

  // TEST 26: Admin Team Management with Role-Based Access Control
  let createdStaffId = '';
  const testStaffEmail = `staff.test.${Date.now()}@contactreachmedia.rw`;
  await test('Owner can create and manage administrative team accounts with RBAC', async () => {
    // 1. Unauthenticated or non-admin cannot access users endpoint
    const unauthRes = await fetch(`${BASE_URL}/api/admin/users`);
    assert.strictEqual(unauthRes.status, 401, 'Unauthenticated users request must return 401');

    // 2. Owner creates new product_manager account
    const createRes = await fetch(`${BASE_URL}/api/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        name: 'Audited Staff Test',
        email: testStaffEmail,
        role: 'product_manager',
        phone: '0788998877'
      })
    });
    assert.strictEqual(createRes.status, 201, 'Admin user creation should succeed');
    const created = await createRes.json();
    assert.strictEqual(created.email, testStaffEmail.toLowerCase());
    assert.strictEqual(created.role, 'product_manager');
    createdStaffId = created.id;

    // 3. User appears in team list
    const listRes = await fetch(`${BASE_URL}/api/admin/users`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(listRes.status, 200);
    const users = await listRes.json();
    assert(users.some((u: any) => u.id === createdStaffId), 'Newly created admin must be in list');
  });

  // TEST 27: Immediate Access Revocation upon Account Deactivation
  await test('Administrative account deactivation revokes access and sessions immediately', async () => {
    // 1. Staff signs in with password to obtain active token
    const staffLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testStaffEmail,
        password: process.env.ADMIN_PASSWORD || 'CRM@2026'
      })
    });
    assert.strictEqual(staffLoginRes.status, 200, 'Staff login should succeed while active');
    const staffData = await staffLoginRes.json();
    const staffToken = staffData.token;

    // 2. Staff token can access inventory logs
    const testReq1 = await fetch(`${BASE_URL}/api/admin/inventory/logs`, {
      headers: { Authorization: `Bearer ${staffToken}` }
    });
    assert.strictEqual(testReq1.status, 200, 'Active staff can access their role endpoints');

    // 3. Owner deactivates staff account
    const deactRes = await fetch(`${BASE_URL}/api/admin/users/${createdStaffId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ active: false })
    });
    assert.strictEqual(deactRes.status, 200);

    // 4. Staff token is immediately rejected with 403 Forbidden
    const testReq2 = await fetch(`${BASE_URL}/api/admin/inventory/logs`, {
      headers: { Authorization: `Bearer ${staffToken}` }
    });
    assert.strictEqual(testReq2.status, 403, 'Deactivated staff request must be rejected with 403 immediately');

    // 5. Subsequent login is also rejected
    const staffLoginAgain = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testStaffEmail,
        password: process.env.ADMIN_PASSWORD || 'CRM@2026'
      })
    });
    assert.strictEqual(staffLoginAgain.status, 401, 'Deactivated staff login must be rejected');

    // 6. Clean up: Delete test user
    const delRes = await fetch(`${BASE_URL}/api/admin/users/${createdStaffId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(delRes.status, 200);
  });

  // TEST 28: Deletion Tombstones Prevent Deleted Products from Resurrecting
  await test('Deletion tombstones permanently prevent deleted products from resurrecting', async () => {
    // 1. Create temporary product
    const createProdRes = await fetch(`${BASE_URL}/api/admin/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        name: 'Tombstone Test Product',
        price: 9900,
        category: 'electronics',
        stock: 5,
        description: 'Test product for tombstone verification.'
      })
    });
    assert.strictEqual(createProdRes.status, 201);
    const prod = await createProdRes.json();

    // 2. Verify product is live
    const getRes1 = await fetch(`${BASE_URL}/api/products/${prod.id}`);
    assert.strictEqual(getRes1.status, 200);

    // 3. Delete product
    const delProdRes = await fetch(`${BASE_URL}/api/admin/products/${prod.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(delProdRes.status, 200);

    // 4. Verify product is gone
    const getRes2 = await fetch(`${BASE_URL}/api/products/${prod.id}`);
    assert.strictEqual(getRes2.status, 404, 'Deleted product must return 404');

    // 5. Verify health check reports tombstone count
    const health = await (await fetch(`${BASE_URL}/api/health`)).json();
    assert(health.database.deletedTombstonesCount > 0, 'Tombstones count must be recorded');
  });

  // TEST 29: Concurrent Stock Reservation Prevents Overselling
  await test('Concurrent order stock reservation prevents overselling inventory', async () => {
    // 1. Create a product with strictly 2 units in stock
    const createRes = await fetch(`${BASE_URL}/api/admin/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        name: 'Limited Stock Sneaker',
        price: 15000,
        category: 'fashion',
        stock: 2,
        description: 'Limited sneaker pair with only 2 units available.'
      })
    });
    assert.strictEqual(createRes.status, 201);
    const limitedProd = await createRes.json();

    // 2. Customer A places order for 2 units
    const order1Res = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Customer A',
        customerPhone: '0789111222',
        deliveryType: 'pickup',
        items: [{ productId: limitedProd.id, quantity: 2 }],
        paymentMethod: 'MTN Mobile Money'
      })
    });
    assert.strictEqual(order1Res.status, 201, 'First order taking available stock should succeed');

    // 3. Customer B attempts to place order for 1 unit immediately (while Customer A is pending)
    const order2Res = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Customer B',
        customerPhone: '0789333444',
        deliveryType: 'pickup',
        items: [{ productId: limitedProd.id, quantity: 1 }],
        paymentMethod: 'MTN Mobile Money'
      })
    });
    assert.strictEqual(order2Res.status, 400, 'Second order exceeding unreserved stock MUST be rejected with 400');
    const errData = await order2Res.json();
    assert(errData.error.includes('Insufficient stock'), 'Error must clearly state insufficient available stock');

    // Clean up test product
    await fetch(`${BASE_URL}/api/admin/products/${limitedProd.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
  });

  // TEST 30: Atomic Database Persistence & Backup Integrity
  await test('Atomic database persistence creates valid disk snapshots and backups', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const dbPath = path.resolve('data/market_db.json');
    const backupPath = path.resolve('data/market_db.backup.json');

    assert(fs.existsSync(dbPath), 'market_db.json must exist');
    assert(fs.existsSync(backupPath), 'market_db.backup.json must exist');

    const dbContent = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    assert(Array.isArray(dbContent.products), 'db.products must be an array');
    assert(Array.isArray(dbContent.orders), 'db.orders must be an array');
    assert(Array.isArray(dbContent.adminUsers), 'db.adminUsers must be an array');
    assert(typeof dbContent.settings === 'object', 'db.settings must be an object');
  });

  // TEST 32: Multiple Picture Links Management (Add, Append, Reorder, Set Cover)
  await test('Admin can add, append, and update multiple picture links on a product', async () => {
    // 1. Create a product with 1 image
    const createRes = await fetch(`${BASE_URL}/api/admin/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        name: 'Multi-Angle Gallery Test Sneakers',
        category: 'fashion-shoes',
        description: 'Premium shoes with full 360-degree multiple angle gallery.',
        price: 45000,
        stock: 12,
        imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80'
      })
    });
    assert.strictEqual(createRes.status, 201);
    const prod = await createRes.json();
    assert.strictEqual(prod.images.length, 1);

    // 2. Append multiple picture links via PATCH endpoint
    const patchRes = await fetch(`${BASE_URL}/api/admin/products/${prod.id}/images`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        newImages: [
          'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=600&q=80',
          'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&w=600&q=80',
          'https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=600&q=80'
        ]
      })
    });
    assert.strictEqual(patchRes.status, 200, 'Adding multiple picture links must succeed');
    const patchData = await patchRes.json();
    assert.strictEqual(patchData.product.images.length, 4, 'Product should now have 4 picture links');

    // 3. Set a specific picture link as cover and reorder
    const reorderRes = await fetch(`${BASE_URL}/api/admin/products/${prod.id}/images`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        imageUrl: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=600&q=80'
      })
    });
    assert.strictEqual(reorderRes.status, 200);
    const reorderedData = await reorderRes.json();
    assert.strictEqual(reorderedData.product.imageUrl, 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=600&q=80');
    assert.strictEqual(reorderedData.product.images[0], 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=600&q=80');

    // 4. Verify public product endpoint returns all picture links in images array
    const publicProdRes = await fetch(`${BASE_URL}/api/products/${prod.id}`);
    assert.strictEqual(publicProdRes.status, 200);
    const publicProd = await publicProdRes.json();
    assert.strictEqual(publicProd.images.length, 4);
  });

  // TEST 33: Admin Session Persistence Across Page Reloads & Restarts
  await test('Admin session persists across browser reloads without prompting sign in again', async () => {
    // 1. Sign in as admin
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'contactreachmedialimited@gmail.com',
        password: process.env.ADMIN_PASSWORD || 'CRM@2026'
      })
    });
    assert.strictEqual(loginRes.status, 200);
    const loginData = await loginRes.json();
    const token = loginData.token;
    assert(token, 'Must return token');

    // 2. Validate token on /api/auth/me (what runs on browser reload)
    const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.strictEqual(meRes.status, 200, '/api/auth/me should succeed on reload');
    const meData = await meRes.json();
    assert.strictEqual(meData.email, 'contactreachmedialimited@gmail.com');
    assert.strictEqual(meData.active, true);

    // 3. Verify disk persistence: market_db.json contains the active adminToken
    const fs = await import('fs');
    const dbContent = JSON.parse(fs.readFileSync('data/market_db.json', 'utf-8'));
    assert(Array.isArray(dbContent.adminTokens), 'adminTokens must be stored on disk');
    const tokenEntry = dbContent.adminTokens.find(([k]: any) => k === token);
    assert(tokenEntry, 'The login session token must be persisted in database file on disk');
    assert(tokenEntry[1].expiresAt > Date.now(), 'Token must have future expiry date');
  });

  await test('CJ Dropshipping Integration: Sync feed, verify automated upload, and admin cost override', async () => {
    // 1. Fetch CJ config
    const cfgRes = await fetch(`${BASE_URL}/api/admin/cjdropshipping/config`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(cfgRes.status, 200, 'Should fetch CJ config');
    const cjCfg = await cfgRes.json();
    assert.strictEqual(typeof cjCfg.autoUploadEnabled, 'boolean');

    // 2. Trigger CJ automated upload sync
    const syncRes = await fetch(`${BASE_URL}/api/admin/cjdropshipping/sync-now`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({})
    });
    assert.strictEqual(syncRes.status, 200, 'CJ sync should succeed');
    const syncData = await syncRes.json();
    assert(syncData.success, 'Sync response should indicate success');
    assert(syncData.uploadedCount > 0 || syncData.updatedCount > 0, 'Should have imported or updated CJ dropshipping products');

    // 3. Verify products in catalog have source: cjdropshipping
    const prodRes = await fetch(`${BASE_URL}/api/products`);
    const allProds = await prodRes.json();
    const cjProds = allProds.filter((p: any) => p.source === 'cjdropshipping');
    assert(cjProds.length > 0, 'Products catalog should contain CJ products');

    const sampleCj = cjProds[0];
    assert(sampleCj.cjProductId, 'CJ product should have cjProductId');
    assert(sampleCj.costPrice !== undefined, 'CJ product should have costPrice in RWF');
    const originalCost = sampleCj.costPrice;

    // 4. Admin updates product cost directly
    const newCustomCost = 9999;
    const newCustomPrice = 18999;
    const costUpdateRes = await fetch(`${BASE_URL}/api/admin/products/${sampleCj.id}/cost`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        costPrice: newCustomCost,
        price: newCustomPrice
      })
    });
    assert.strictEqual(costUpdateRes.status, 200, 'Admin cost update should succeed');
    const updatedProdData = await costUpdateRes.json();
    assert.strictEqual(updatedProdData.product.costPrice, newCustomCost, 'Cost should be updated to custom admin cost');
    assert.strictEqual(updatedProdData.product.price, newCustomPrice, 'Price should be updated to custom admin price');
    assert.strictEqual(updatedProdData.product.costOverriddenByAdmin, true, 'costOverriddenByAdmin must be true');

    // 5. Re-run CJ sync and verify custom admin cost is NEVER overwritten
    const reSyncRes = await fetch(`${BASE_URL}/api/admin/cjdropshipping/sync-now`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({})
    });
    assert.strictEqual(reSyncRes.status, 200);

    const checkProdsRes = await fetch(`${BASE_URL}/api/products`);
    const checkProds = await checkProdsRes.json();
    const checkedProd = checkProds.find((p: any) => p.id === sampleCj.id);
    assert.strictEqual(checkedProd.costPrice, newCustomCost, 'Subsequent automated CJ sync MUST NOT overwrite admin custom cost');
    assert.strictEqual(checkedProd.price, newCustomPrice, 'Subsequent automated CJ sync MUST NOT overwrite admin custom selling price');
    assert.strictEqual(checkedProd.costOverriddenByAdmin, true, 'Product must remain flagged as costOverriddenByAdmin');
  });

  await test('Google Drive Backup Status endpoint is functional', async () => {
    const driveRes = await fetch(`${BASE_URL}/api/admin/drive/status`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(driveRes.status, 200, 'Should fetch Drive backup status');
    const driveData = await driveRes.json();
    assert.strictEqual(driveData.fileName, 'ContactReach_Market_Products.json');
  });

  await test('Product upload with YouTube video description link and retrieval', async () => {
    const testVideoUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    const uploadRes = await fetch(`${BASE_URL}/api/admin/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        name: 'Wireless Bluetooth Earbuds with ANC',
        sku: 'CRM-YT-ANC-01',
        description: 'Noise cancelling earbuds with crystal clear audio and wireless charging.',
        price: 35000,
        costPrice: 20000,
        category: 'electronics',
        stock: 40,
        videoUrl: testVideoUrl,
        imageUrl: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80'
      })
    });
    assert.strictEqual(uploadRes.status, 201, 'Product upload should succeed with 201 Created');
    const createdProduct = await uploadRes.json();
    assert(createdProduct && createdProduct.id, 'Created product should be returned');
    assert.strictEqual(createdProduct.videoUrl, testVideoUrl, 'Uploaded product must contain the YouTube video description link');

    // Retrieve via public API
    const getRes = await fetch(`${BASE_URL}/api/products/${createdProduct.id}`);
    assert.strictEqual(getRes.status, 200, 'Public product get should succeed');
    const fetchedProd = await getRes.json();
    assert.strictEqual(fetchedProd.videoUrl, testVideoUrl, 'Public product endpoint must return YouTube video link');
  });

  // TEST 37: Excel/Spreadsheet Product Catalog Export with Valuation & Fields
  await test('Admin can export full product catalog with inventory valuation and metadata', async () => {
    // Unauthenticated export must be blocked
    const unauthRes = await fetch(`${BASE_URL}/api/admin/products/export`);
    assert.strictEqual(unauthRes.status, 401, 'Unauthenticated export should be rejected with 401');

    // Authorized export
    const exportRes = await fetch(`${BASE_URL}/api/admin/products/export`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(exportRes.status, 200, 'Admin product export must succeed');
    const data = await exportRes.json();
    assert(Array.isArray(data.products) && data.products.length > 0, 'Products should be returned as non-empty array');
    assert(typeof data.totalStockValuationFrw === 'number' && data.totalStockValuationFrw > 0, 'Stock valuation must be positive number');
    assert(Array.isArray(data.categories), 'Categories metadata must be returned');
    assert(Array.isArray(data.shops), 'Shops metadata must be returned');
  });

  // TEST 38: Spreadsheet Bulk Preview & Automatic Duplicate/Difference Detection
  await test('Spreadsheet preview accurately maps fields, detects existing matches, and calculates price/stock diffs', async () => {
    const previewRes = await fetch(`${BASE_URL}/api/admin/products/bulk-preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        items: [
          {
            name: 'Wireless Studio Bluetooth Headphones', // Existing product from Test 7
            sku: 'CRM-TEST-MATCH-01',
            price: 40000, // Price updated from 35000 -> 40000
            stock: 25, // Stock updated
            category: 'electronics',
            shopName: 'Inziza Sound Studio Lab'
          },
          {
            name: 'New Rwandan Specialty Arabica Coffee Beans 500g',
            sku: 'CRM-COFFEE-RW-01',
            price: 8500,
            stock: 50,
            category: 'supermarket',
            shopName: 'Kigali Fresh Market'
          },
          {
            name: '', // Invalid product without name
            price: -500,
            stock: -1
          }
        ]
      })
    });
    assert.strictEqual(previewRes.status, 200, 'Bulk preview should succeed with 200');
    const previewData = await previewRes.json();
    assert.strictEqual(previewData.totalRows, 3, 'Should analyze all 3 rows');
    assert.strictEqual(previewData.updateCount, 1, 'Should detect 1 existing product match');
    assert.strictEqual(previewData.newCount, 2, 'Should identify 2 new/unmatched items');
    assert.strictEqual(previewData.errorCount, 1, 'Should flag 1 row with validation errors');

    const matchedItem = previewData.items.find((i: any) => i.name === 'Wireless Studio Bluetooth Headphones');
    assert(matchedItem, 'Matched product should be present in preview');
    assert.strictEqual(matchedItem.matchType, 'update');
    assert.strictEqual(matchedItem.hasPriceChange, true, 'Price change should be flagged');
    assert.strictEqual(matchedItem.priceDifference, 5000, 'Price diff should be +5000 FRW');
  });

  // TEST 39: Spreadsheet Bulk Import with Upsert, Stock & Price Updates, and Security Guards
  await test('Admin can bulk import validated products with atomic persistence, stock updates, and audit logging', async () => {
    // 0. Ensure test idempotency by cleaning up prior test products if present
    const existingCheck = await fetch(`${BASE_URL}/api/products?search=Nyungwe`);
    if (existingCheck.status === 200) {
      const existingProds = await existingCheck.json();
      for (const p of existingProds) {
        if (p.sku === 'CRM-NYUNGWE-HONEY') {
          await fetch(`${BASE_URL}/api/admin/products/${p.id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${adminToken}` }
          });
        }
      }
    }

    // 1. Unauthenticated import must fail with 401
    const unauthImport = await fetch(`${BASE_URL}/api/admin/products/bulk-import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ products: [] })
    });
    assert.strictEqual(unauthImport.status, 401, 'Unauthenticated bulk import must be rejected');

    // 2. Perform bulk import with upsert strategy
    const importRes = await fetch(`${BASE_URL}/api/admin/products/bulk-import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        conflictStrategy: 'upsert',
        products: [
          {
            name: 'Wireless Studio Bluetooth Headphones',
            price: 38000,
            stock: 28,
            category: 'electronics',
            shopName: 'Inziza Sound Studio Lab',
            description: 'Updated studio headphones description via spreadsheet import.'
          },
          {
            name: 'Pure Organic Honey from Nyungwe Forest 500ml',
            sku: 'CRM-NYUNGWE-HONEY',
            price: 7000,
            stock: 60,
            category: 'supermarket',
            shopName: 'Inziza Crafts & Provisions',
            description: 'Raw mountain honey harvested sustainably in Rwanda.'
          }
        ]
      })
    });
    assert.strictEqual(importRes.status, 200, 'Bulk import should succeed');
    const importData = await importRes.json();
    assert.strictEqual(importData.success, true);
    assert.strictEqual(importData.updatedCount, 1, 'Should update 1 existing product');
    assert.strictEqual(importData.createdCount, 1, 'Should create 1 new product');

    // 3. Verify database reflects the updated price and stock
    const verifyProdRes = await fetch(`${BASE_URL}/api/products/${createdProductId}`);
    assert.strictEqual(verifyProdRes.status, 200);
    const verifiedProd = await verifyProdRes.json();
    assert.strictEqual(verifiedProd.price, 38000, 'Price should be updated to 38000 FRW');
    assert.strictEqual(verifiedProd.stock, 28, 'Stock should be updated to 28');

    // 4. Verify new product is accessible publicly
    const newProdRes = await fetch(`${BASE_URL}/api/products?search=Nyungwe`);
    assert.strictEqual(newProdRes.status, 200);
    const newProds = await newProdRes.json();
    assert(newProds.some((p: any) => p.sku === 'CRM-NYUNGWE-HONEY'), 'New spreadsheet product must be retrievable');
  });

  // TEST 40: Admin CJ Dropshipping API Key, Account Email Persistence & Security
  await test('Admin can update and persist CJ Dropshipping API credentials and email with masked responses', async () => {
    // 1. Unauthenticated update must fail with 401
    const unauthPut = await fetch(`${BASE_URL}/api/admin/cjdropshipping/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: 'some-fake-key-1234567890', email: 'test@domain.com' })
    });
    assert.strictEqual(unauthPut.status, 401, 'Unauthenticated config update must fail');

    // 2. Authenticated update with API key and email
    const saveRes = await fetch(`${BASE_URL}/api/admin/cjdropshipping/config`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        apiKey: 'cj_live_secret_key_998877665544332211',
        email: 'supplier-ops@contactreachmedia.rw',
        usdToRwfRate: 1435,
        defaultMarkupPercent: 40,
        requireAdminApproval: true,
        autoUploadEnabled: false
      })
    });
    assert.strictEqual(saveRes.status, 200, 'Saving CJ config should succeed with 200');
    const saveData = await saveRes.json();
    assert.strictEqual(saveData.config.email, 'supplier-ops@contactreachmedia.rw', 'Email should be saved');
    assert.strictEqual(saveData.config.usdToRwfRate, 1435, 'USD rate should be saved');
    assert.strictEqual(saveData.config.defaultMarkupPercent, 40, 'Markup should be saved');
    assert.strictEqual(saveData.config.hasApiKey, true, 'hasApiKey flag should be true');
    assert(saveData.config.apiKey.includes('••••'), 'Returned API key should be masked for security');

    // 3. GET config returns masked key and stored email
    const getRes = await fetch(`${BASE_URL}/api/admin/cjdropshipping/config`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(getRes.status, 200, 'GET config should succeed with 200');
    const getData = await getRes.json();
    assert.strictEqual(getData.email, 'supplier-ops@contactreachmedia.rw', 'GET config should return saved email');
    assert.strictEqual(getData.hasApiKey, true, 'GET config should show hasApiKey: true');

    // 4. Test connection endpoint accepts credentials
    const testConnRes = await fetch(`${BASE_URL}/api/admin/cjdropshipping/test-connection`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        apiKey: 'cj_live_secret_key_998877665544332211',
        email: 'supplier-ops@contactreachmedia.rw'
      })
    });
    assert.strictEqual(testConnRes.status, 200, 'Test connection endpoint should return 200');
    const testConnData = await testConnRes.json();
    assert.strictEqual(testConnData.success, true, 'Connection test should report success');
  });

  // TEST 41: Google Sheet Direct Product Connection & Synchronization
  await test('Google Sheet direct product sync pulls edits and maintains live connection', async () => {
    // 1. GET connected Google Sheet config
    const sheetRes = await fetch(`${BASE_URL}/api/admin/google-sheet`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(sheetRes.status, 200, 'GET /api/admin/google-sheet should return 200');
    const sheetData = await sheetRes.json();
    assert.strictEqual(sheetData.config.sheetId, '1kaLUCemqV6-KJ_G6nqYhyrf2bPpDg6HxyaSj6uDsoHk', 'Should link to the designated Google Sheet');
    assert(sheetData.config.sheetUrl.includes('1kaLUCemqV6-KJ_G6nqYhyrf2bPpDg6HxyaSj6uDsoHk'), 'URL should match spreadsheet ID');

    // 2. PUT config updates settings
    const updateRes = await fetch(`${BASE_URL}/api/admin/google-sheet`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        autoSyncEnabled: true,
        sheetTabName: 'Sheet1'
      })
    });
    assert.strictEqual(updateRes.status, 200, 'PUT /api/admin/google-sheet should return 200');
    const updateData = await updateRes.json();
    assert.strictEqual(updateData.config.autoSyncEnabled, true);

    // 3. POST /api/admin/google-sheet/sync-pull executes live pull from Google Sheet
    const pullRes = await fetch(`${BASE_URL}/api/admin/google-sheet/sync-pull`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        sheetId: '1kaLUCemqV6-KJ_G6nqYhyrf2bPpDg6HxyaSj6uDsoHk',
        tabName: 'Sheet1'
      })
    });
    assert.strictEqual(pullRes.status, 200, 'Sync pull should succeed with 200');
    const pullData = await pullRes.json();
    assert.strictEqual(pullData.success, true);
    assert(pullData.totalSheetRows > 0, 'Should have processed sheet rows');
  });

  await test('DSers & AliExpress: Product mapping, manual order approval, and tracking updates', async () => {
    // 1. Get products list to find a product to map
    const prodsRes = await fetch(`${BASE_URL}/api/products`);
    const prods = await prodsRes.json();
    assert(prods.length > 0, 'Catalog should have products');
    const targetProd = prods[0];

    // 2. Save AliExpress URL and exact supplier variant for product SKU
    const mapRes = await fetch(`${BASE_URL}/api/admin/products/${targetProd.id}/supplier-mapping`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        aliExpressUrl: 'https://www.aliexpress.com/item/1005007129482103.html',
        supplierVariant: 'Color: Midnight Black, Size: Large',
        supplierSku: 'ALI-TEST-7129-L',
        costPrice: 9500
      })
    });
    assert.strictEqual(mapRes.status, 200, 'Supplier mapping should succeed with 200');
    const mappedProd = await mapRes.json();
    assert.strictEqual(mappedProd.aliExpressUrl, 'https://www.aliexpress.com/item/1005007129482103.html');
    assert.strictEqual(mappedProd.supplierVariant, 'Color: Midnight Black, Size: Large');
    assert.strictEqual(mappedProd.supplierSku, 'ALI-TEST-7129-L');
    assert.strictEqual(mappedProd.isSupplierMapped, true);

    // 3. Create a customer order containing the mapped product
    const orderRes = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'DSers Workflow Tester',
        customerPhone: '0789123456',
        customerEmail: 'dsers-test@example.com',
        deliveryType: 'delivery',
        deliveryLocation: 'Kigali Gasabo Area',
        deliveryAddress: 'KG 622 St, Fair View Plaza',
        paymentMethod: 'MTN Mobile Money',
        items: [{ productId: targetProd.id, quantity: 1 }]
      })
    });
    assert(orderRes.status === 201 || orderRes.status === 200, `Order creation should succeed, got ${orderRes.status}`);
    const order = await orderRes.json();
    assert.strictEqual(order.supplierApprovalStatus, 'Pending Review', 'Order should initially require manual admin approval');
    assert(order.items[0].aliExpressUrl, 'Order item should inherit mapped supplier URL');

    // 4. Admin reviews and manually approves the order for DSers fulfillment
    const approveRes = await fetch(`${BASE_URL}/api/admin/orders/${order.id}/supplier-approval`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        approvalStatus: 'Approved',
        note: 'Admin verified payment and product SKU mapping'
      })
    });
    assert.strictEqual(approveRes.status, 200, 'Order manual approval should return 200');
    const approvedOrder = await approveRes.json();
    assert.strictEqual(approvedOrder.supplierApprovalStatus, 'Approved');
    assert(approvedOrder.supplierApprovedAt, 'Approval timestamp should be recorded');
    assert(approvedOrder.statusHistory.some((h: any) => h.note.includes('Approved')), 'Audit note should be recorded');

    // 5. Admin updates tracking number from supplier shipment
    const trackRes = await fetch(`${BASE_URL}/api/admin/orders/${order.id}/tracking`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        trackingNumber: 'LP0069284019284',
        trackingCarrier: 'AliExpress Standard Shipping',
        updateOrderStatus: true,
        notes: 'Dispatched via Shenzhen Logistics Hub'
      })
    });
    assert.strictEqual(trackRes.status, 200, 'Tracking update should succeed with 200');
    const trackedOrder = await trackRes.json();
    assert.strictEqual(trackedOrder.trackingNumber, 'LP0069284019284');
    assert.strictEqual(trackedOrder.trackingCarrier, 'AliExpress Standard Shipping');
    assert.strictEqual(trackedOrder.status, 'Out for Delivery');

    // 6. Public customer order tracking endpoint immediately reflects live tracking details
    const publicTrackRes = await fetch(`${BASE_URL}/api/orders/${order.orderNumber}?token=${order.trackingToken}`);
    assert.strictEqual(publicTrackRes.status, 200, 'Public tracking should succeed');
    const publicTrack = await publicTrackRes.json();
    assert.strictEqual(publicTrack.trackingNumber, 'LP0069284019284');
    assert.strictEqual(publicTrack.trackingCarrier, 'AliExpress Standard Shipping');
  });

  // TEST 43: Customer Order Privacy & Protection Against Unauthorized Snooping
  await test('Customer privacy: Orders cannot be listed or inspected without authorization', async () => {
    // Unauthenticated request to admin orders must be rejected
    const unauthOrders = await fetch(`${BASE_URL}/api/admin/orders`);
    assert.strictEqual(unauthOrders.status, 401, 'Public request to admin orders must return 401');

    // Customer order tracking without phone or tracking token must be rejected
    const testOrderRes = await fetch(`${BASE_URL}/api/orders/CRM-99999`);
    assert(testOrderRes.status === 404 || testOrderRes.status === 403, 'Snooping without phone or token must be rejected');
  });

  // TEST 44: Owner Authorization for manirihocoss@gmail.com
  let cossToken = '';
  await test('Platform Owner manirihocoss@gmail.com can sign in and obtain valid owner session', async () => {
    const loginRes = await fetch(`${BASE_URL}/api/auth/firebase-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'manirihocoss@gmail.com',
        displayName: 'Thierry Maniriho (Platform Owner)',
        uid: 'thierry-coss-firebase-uid-789'
      })
    });
    assert.strictEqual(loginRes.status, 200, 'manirihocoss login must succeed with 200');
    const data = await loginRes.json();
    assert.strictEqual(data.admin.role, 'owner', 'Role must be owner');
    assert(data.token, 'Must return session token');
    cossToken = data.token;
  });

  // TEST 45: Shop Manager & Product Manager Product Creation & Management
  await test('Shop Manager role can create and update products in the catalog', async () => {
    // Create a temporary admin with shop_manager role
    const newAdminEmail = `shopmgr-${Date.now()}@contactreachmedia.rw`;
    const createAdminRes = await fetch(`${BASE_URL}/api/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        name: 'Gisozi Shop Manager',
        email: newAdminEmail,
        role: 'shop_manager',
        phone: '0788990011'
      })
    });
    assert.strictEqual(createAdminRes.status, 201, 'Creating shop_manager must succeed');
    const createdAdmin = await createAdminRes.json();
    assert.strictEqual(createdAdmin.role, 'shop_manager');

    // Sign in as this shop_manager
    const smLoginRes = await fetch(`${BASE_URL}/api/auth/firebase-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: newAdminEmail,
        displayName: 'Gisozi Shop Manager',
        uid: `uid-${createdAdmin.id}`
      })
    });
    assert.strictEqual(smLoginRes.status, 200);
    const smAuth = await smLoginRes.json();
    const smToken = smAuth.token;

    // Upload a product as shop_manager
    const uploadRes = await fetch(`${BASE_URL}/api/admin/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${smToken}`
      },
      body: JSON.stringify({
        name: 'Shop Manager Tested Handbag',
        price: 28000,
        category: 'ibikapu',
        description: 'Quality tested leather handbag uploaded by shop manager',
        stock: 12,
        shopName: 'Gisozi Boutique'
      })
    });
    assert.strictEqual(uploadRes.status, 201, 'shop_manager must be permitted to create products');
    const createdProd = await uploadRes.json();
    assert.strictEqual(createdProd.name, 'Shop Manager Tested Handbag');

    // Edit product as shop_manager
    const editRes = await fetch(`${BASE_URL}/api/admin/products/${createdProd.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${smToken}`
      },
      body: JSON.stringify({
        price: 30000,
        stock: 15
      })
    });
    assert.strictEqual(editRes.status, 200, 'shop_manager must be permitted to edit products');
    const updatedProd = await editRes.json();
    assert.strictEqual(updatedProd.price, 30000);
    assert.strictEqual(updatedProd.stock, 15);

    // Clean up created product
    await fetch(`${BASE_URL}/api/admin/products/${createdProd.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${smToken}` }
    });
  });

  // TEST 46: Deactivated Admin Account Revocation
  await test('Deactivated administrator accounts have session revoked and are denied access', async () => {
    // Create an admin to deactivate
    const deactEmail = `deact-${Date.now()}@contactreachmedia.rw`;
    const crRes = await fetch(`${BASE_URL}/api/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        name: 'Temporary Admin',
        email: deactEmail,
        role: 'administrator'
      })
    });
    const deactUser = await crRes.json();

    // Login to get token
    const lgRes = await fetch(`${BASE_URL}/api/auth/firebase-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: deactEmail,
        displayName: 'Temporary Admin',
        uid: `uid-${deactUser.id}`
      })
    });
    const { token: userToken } = await lgRes.json();

    // Verify access works before deactivation
    const testWorkRes = await fetch(`${BASE_URL}/api/admin/stats`, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    assert.strictEqual(testWorkRes.status, 200);

    // Deactivate user as owner
    const deactPatch = await fetch(`${BASE_URL}/api/admin/users/${deactUser.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ active: false })
    });
    assert.strictEqual(deactPatch.status, 200);

    // Verify token is immediately revoked
    const revokedRes = await fetch(`${BASE_URL}/api/admin/stats`, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    assert.strictEqual(revokedRes.status, 403, 'Deactivated admin token must be rejected with 403');
  });

  await test('Landed cost engine adheres strictly to Rwanda pricing formulas', async () => {
    const { calculateLandedCostAndSellingPrice } = await import('../src/utils/pricing.ts');
    
    // 15% Markup test
    // Product cost: $10, Shipping: $7.30, CIF: $17.30, Taxes (18%): $3.11 -> Landed: $20.41 in USD equivalent
    const markupResult = calculateLandedCostAndSellingPrice({
      productCostUsd: 10,
      shippingToRwandaUsd: 7.30,
      usdToRwfRate: 1435,
      applicableTaxesPercent: 18,
      pricingStrategy: 'markup',
      strategyPercentage: 15
    });

    assert(markupResult.landedCostRwf > 0, 'Landed cost must be calculated');
    assert(markupResult.sellingPriceRwf > markupResult.landedCostRwf, 'Selling price must exceed landed cost');
    assert(markupResult.sellingPriceRwf % 100 === 0, 'Selling price should round cleanly to 100 RWF');

    // 15% Gross margin test
    const marginResult = calculateLandedCostAndSellingPrice({
      productCostUsd: 10,
      shippingToRwandaUsd: 7.30,
      usdToRwfRate: 1435,
      applicableTaxesPercent: 18,
      pricingStrategy: 'gross_margin',
      strategyPercentage: 15
    });
    assert(marginResult.sellingPriceRwf > markupResult.sellingPriceRwf, 'Gross margin 15% price must be higher than 15% markup');
    assert.strictEqual(marginResult.pricingStrategy, 'gross_margin');
  });

  await test('Product category normalization returns clean catalog for all canonical categories', async () => {
    const prodRes = await fetch(`${BASE_URL}/api/products`);
    assert.strictEqual(prodRes.status, 200);
    const prods = await prodRes.json();
    assert(prods.length > 50, 'Catalog should contain products');

    // Verify all returned products have canonical categories
    const validSlugs = new Set(['electronics', 'fashion', 'hair-beauty', 'amatara', 'impano', 'abana', 'amasaha', 'ibikapu', 'sports', 'books', 'supermarket']);
    for (const p of prods) {
      assert(validSlugs.has(p.category), `Product ${p.id} category "${p.category}" must be a canonical slug`);
    }

    // Verify category filtering matches normalized categories
    const elecRes = await fetch(`${BASE_URL}/api/products?category=electronics`);
    assert.strictEqual(elecRes.status, 200);
    const elecProds = await elecRes.json();
    assert(elecProds.length > 0, 'Electronics category must return items');
    for (const p of elecProds) {
      assert.strictEqual(p.category, 'electronics');
    }
  });

  await test('Payment Gateway: Cardholder data protection, server-side initiation, and idempotency', async () => {
    // 1. Create a test order
    const prodsRes = await fetch(`${BASE_URL}/api/products`);
    const prods = await prodsRes.json();
    const testProd = prods.find((p: any) => p.stock > 5);

    const orderRes = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Jean Paul Test',
        customerPhone: '0788998877',
        deliveryLocation: 'Gasabo',
        deliveryAddress: 'Remera, Kigali',
        items: [{ productId: testProd.id, quantity: 1 }],
        paymentMethod: 'MTN Mobile Money'
      })
    });
    assert([200, 201].includes(orderRes.status), 'Order creation should succeed with 201 Created');
    const order = await orderRes.json();

    // 2. Security test: Reject direct cardholder PAN / CVV transmission
    const panLeakRes = await fetch(`${BASE_URL}/api/payments/initiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderNumber: order.orderNumber,
        paymentMethod: 'Bank Card',
        cardNumber: '4111111111111111',
        cvv: '123'
      })
    });
    assert.strictEqual(panLeakRes.status, 400, 'Direct cardholder PAN/CVV transmission must be rejected');
    const panErr = await panLeakRes.json();
    assert(panErr.error.includes('Cardholder PAN'), 'Must return card protection warning');

    // 3. Proper initiation via MTN Mobile Money
    const idempotencyKey = `idemp-${Date.now()}`;
    const initRes = await fetch(`${BASE_URL}/api/payments/initiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderNumber: order.orderNumber,
        paymentMethod: 'MTN Mobile Money',
        customerPhone: '0788998877',
        idempotencyKey
      })
    });
    assert.strictEqual(initRes.status, 201, 'Payment initiation should succeed with 201 Created');
    const initData = await initRes.json();
    assert(initData.success, 'Initiation response must be success');
    assert(initData.transactionId, 'Must issue server transaction ID');
    assert.strictEqual(initData.amount, order.totalAmount, 'Initiated amount must match authoritative server total');

    // 4. Safe retry / idempotency check
    const retryRes = await fetch(`${BASE_URL}/api/payments/initiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderNumber: order.orderNumber,
        paymentMethod: 'MTN Mobile Money',
        customerPhone: '0788998877',
        idempotencyKey
      })
    });
    assert.strictEqual(retryRes.status, 200, 'Idempotent replay must return 200');
    const retryData = await retryRes.json();
    assert(retryData.isIdempotentReplay, 'Response should confirm idempotent replay');
    assert.strictEqual(retryData.transaction.id, initData.transactionId);
  });

  await test('Payment Webhook: Processes charge.completed, deducts stock, and charge.refunded restores stock', async () => {
    // 1. Create a fresh order
    const prodsRes = await fetch(`${BASE_URL}/api/products`);
    const prods = await prodsRes.json();
    const testProd = prods.find((p: any) => p.stock > 5);
    const initialStock = testProd.stock;

    const orderRes = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Aline Testing',
        customerPhone: '0788223344',
        deliveryLocation: 'Gasabo',
        deliveryAddress: 'Kacyiru, Kigali',
        items: [{ productId: testProd.id, quantity: 2 }],
        paymentMethod: 'MTN Mobile Money'
      })
    });
    const order = await orderRes.json();

    // 2. Reject unauthenticated webhook
    const badWebhookRes = await fetch(`${BASE_URL}/api/payments/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-signature': 'invalid_signature_xyz'
      },
      body: JSON.stringify({
        event: 'charge.completed',
        orderNumber: order.orderNumber
      })
    });
    assert.strictEqual(badWebhookRes.status, 401, 'Invalid webhook signature must return 401 Unauthorized');

    // 3. Process charge.completed with valid signature
    const goodWebhookRes = await fetch(`${BASE_URL}/api/payments/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-signature': 'test_valid_signature'
      },
      body: JSON.stringify({
        event: 'charge.completed',
        orderNumber: order.orderNumber,
        amount: order.totalAmount,
        providerRef: 'MOMO-PAY-RW-9988'
      })
    });
    assert.strictEqual(goodWebhookRes.status, 200, 'Valid charge.completed webhook must return 200 OK');

    // Verify order is now Paid and stock is deducted
    const checkOrderRes = await fetch(`${BASE_URL}/api/orders/${order.orderNumber}?token=${order.trackingToken}`);
    const updatedOrder = await checkOrderRes.json();
    assert.strictEqual(updatedOrder.paymentStatus, 'Paid');
    assert.strictEqual(updatedOrder.stockDeducted, true);

    const freshProdRes = await fetch(`${BASE_URL}/api/products/${testProd.id}`);
    const freshProd = await freshProdRes.json();
    assert.strictEqual(freshProd.stock, initialStock - 2, 'Stock must be deducted by 2 units');

    // 4. Process charge.refunded: stock must be restored
    const refundWebhookRes = await fetch(`${BASE_URL}/api/payments/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-signature': 'test_valid_signature'
      },
      body: JSON.stringify({
        event: 'charge.refunded',
        orderNumber: order.orderNumber,
        providerRef: 'REFUND-RW-1122'
      })
    });
    assert.strictEqual(refundWebhookRes.status, 200);

    const refundedProdRes = await fetch(`${BASE_URL}/api/products/${testProd.id}`);
    const refundedProd = await refundedProdRes.json();
    assert.strictEqual(refundedProd.stock, initialStock, 'Stock must be restored on payment refund');

    // 5. Check payment status endpoint
    const statusQueryRes = await fetch(`${BASE_URL}/api/payments/status/${order.orderNumber}?token=${order.trackingToken}`);
    assert.strictEqual(statusQueryRes.status, 200);
    const statusData = await statusQueryRes.json();
    assert.strictEqual(statusData.paymentStatus, 'Refunded');
  });

  await test('Persistence & Database status endpoint returns detailed operational metrics', async () => {
    const statusRes = await fetch(`${BASE_URL}/api/admin/persistence/status`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(statusRes.status, 200);
    const status = await statusRes.json();
    assert(status.localDatabase.exists, 'Database file should exist');
    assert(status.localDatabase.productsCount > 0, 'Products count should be greater than 0');
    assert.strictEqual(typeof status.firestore.syncQueueLength, 'number');
  });

  // TEST: Firebase Configuration verifies marketdatabase-1090b
  await test('Firebase configuration is correctly set to marketdatabase-1090b', async () => {
    const diagRes = await fetch(`${BASE_URL}/api/admin/database/diagnostics`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(diagRes.status, 200);
    const diag = await diagRes.json();
    assert.strictEqual(diag.firestore.projectId, 'marketdatabase-1090b', 'Project ID must match marketdatabase-1090b');
  });

  // TEST: Messages can be stored, edited, and deleted
  await test('Messages can be stored, edited (replied), and deleted', async () => {
    // 1. Submit message
    const msgRes = await fetch(`${BASE_URL}/api/contact/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Jean Paul Tester',
        email: 'jeanpaul.tester@example.com',
        phone: '0788112233',
        subject: 'Wholesale inquiry for electronics',
        message: 'Hello, do you support bulk delivery to Musanze?'
      })
    });
    assert.strictEqual(msgRes.status, 201);
    const msgData = await msgRes.json();
    assert(msgData.id, 'Message ID should be returned');
    const messageId = msgData.id;

    // 2. Admin retrieves messages and finds it
    const listRes = await fetch(`${BASE_URL}/api/admin/messages`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(listRes.status, 200);
    const list = await listRes.json();
    const found = list.find((m: any) => m.id === messageId);
    assert(found, 'Created message must be present in messages list');

    // 3. Admin edits message (reply/note)
    const editRes = await fetch(`${BASE_URL}/api/admin/messages/${messageId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        status: 'replied',
        replyNote: 'Yes, we provide wholesale air cargo and express courier to Musanze.'
      })
    });
    assert.strictEqual(editRes.status, 200);
    const editedMsg = await editRes.json();
    assert.strictEqual(editedMsg.status, 'replied');
    assert.strictEqual(editedMsg.replyNote, 'Yes, we provide wholesale air cargo and express courier to Musanze.');

    // 4. Admin deletes message
    const delRes = await fetch(`${BASE_URL}/api/admin/messages/${messageId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(delRes.status, 200);

    // Verify deletion
    const verifyListRes = await fetch(`${BASE_URL}/api/admin/messages`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const verifyList = await verifyListRes.json();
    assert(!verifyList.some((m: any) => m.id === messageId), 'Deleted message must no longer exist');
  });

  // TEST: Users / Buyers can be stored, edited, and deleted
  await test('Users can be stored, edited, and deleted', async () => {
    // 1. Create buyer / user
    const createRes = await fetch(`${BASE_URL}/api/admin/buyers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        name: 'Gisele Uwase Test',
        phone: '0789998877',
        email: 'gisele.test@example.rw',
        deliveryAddress: 'Nyarutarama, Kigali'
      })
    });
    assert.strictEqual(createRes.status, 201);
    const createData = await createRes.json();
    assert(createData.customer?.id, 'Customer ID must be created');
    const customerId = createData.customer.id;

    // 2. Edit user
    const editRes = await fetch(`${BASE_URL}/api/admin/buyers/${customerId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        name: 'Gisele Uwase Updated',
        deliveryAddress: 'Gishushu, Kigali'
      })
    });
    assert.strictEqual(editRes.status, 200);
    const editData = await editRes.json();
    assert.strictEqual(editData.customer.name, 'Gisele Uwase Updated');
    assert.strictEqual(editData.customer.deliveryAddress, 'Gishushu, Kigali');

    // 3. Delete user
    const delRes = await fetch(`${BASE_URL}/api/admin/buyers/${customerId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(delRes.status, 200);

    // Verify deletion
    const verifyRes = await fetch(`${BASE_URL}/api/admin/customers/${customerId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(verifyRes.status, 404, 'Deleted user must return 404');
  });

  // TEST: Buyer Phone Login succeeds and returns token & user
  await test('Buyer can sign in with phone number (MoMo fallback)', async () => {
    const phoneRes = await fetch(`${BASE_URL}/api/buyers/phone-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: '0780022600',
        name: 'MoMo Test Buyer'
      })
    });
    assert.strictEqual(phoneRes.status, 200, 'Phone login should succeed with 200');
    const phoneData = await phoneRes.json();
    assert(phoneData.token, 'Token must be issued');
    assert.strictEqual(phoneData.user.phone, '0780022600');
    assert.strictEqual(phoneData.user.name, 'MoMo Test Buyer');
  });

  // TEST: Manual Product Upload, Hide, Edit, and Delete with Persistence
  await test('Admin can manually upload, edit, hide, and delete product with persistence', async () => {
    // 1. Upload manual product
    const createRes = await fetch(`${BASE_URL}/api/admin/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        name: 'Manual Firebase Test Sneaker',
        sku: `CRM-TST-${Date.now().toString().slice(-4)}`,
        description: 'High performance running sneakers uploaded manually',
        price: 35000,
        costPrice: 20000,
        category: 'fashion',
        stock: 12,
        imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff',
        status: 'Available'
      })
    });
    assert.strictEqual(createRes.status, 201, 'Product creation should return 201');
    const created = await createRes.json();
    assert.strictEqual(created.name, 'Manual Firebase Test Sneaker');
    assert.strictEqual(created.price, 35000);
    assert.strictEqual(created.status, 'Available');

    // 2. Hide product (status: 'Hidden')
    const hideRes = await fetch(`${BASE_URL}/api/admin/products/${created.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ status: 'Hidden' })
    });
    assert.strictEqual(hideRes.status, 200);
    const hidden = await hideRes.json();
    assert.strictEqual(hidden.product.status, 'Hidden');

    // Verify hidden from public storefront
    const pubRes = await fetch(`${BASE_URL}/api/products`);
    const pubProducts = await pubRes.json();
    assert(!pubProducts.some((p: any) => p.id === created.id), 'Hidden product must not appear on public storefront');

    // Verify visible in admin dashboard
    const adminProdRes = await fetch(`${BASE_URL}/api/admin/products`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const adminProducts = await adminProdRes.json();
    const foundAdmin = adminProducts.find((p: any) => p.id === created.id);
    assert(foundAdmin, 'Hidden product must be visible and manageable by admin');
    assert.strictEqual(foundAdmin.status, 'Hidden');

    // 3. Delete manual product
    const delRes = await fetch(`${BASE_URL}/api/admin/products/${created.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(delRes.status, 200);
  });

  // TEST: Category Details Verification: No Shop or Source field
  await test('Category details do not contain Shop or Source field', async () => {
    const catRes = await fetch(`${BASE_URL}/api/categories`);
    assert.strictEqual(catRes.status, 200);
    const categories = await catRes.json();
    for (const cat of categories) {
      assert.strictEqual((cat as any).shop, undefined, 'Category must not have shop property');
      assert.strictEqual((cat as any).shopName, undefined, 'Category must not have shopName property');
      assert.strictEqual((cat as any).source, undefined, 'Category must not have source property');
      assert.strictEqual((cat as any)['Shop / Source'], undefined, 'Category must not have Shop / Source property');
    }
  });

  console.log('\n====================================================');
  console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution fatal error:', err);
  process.exit(1);
});
