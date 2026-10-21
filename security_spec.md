# Security Specification & Test Matrix for ContactReach Market

## 1. Data Invariants

1. **Admin Master Gate**:
   Administrative operations (catalog edits, store approvals, order cancellations, refund approvals, coupon creation, supplier payouts, and settings adjustments) are strictly restricted to authenticated administrators who exist in `/databases/$(database)/documents/admins/$(request.auth.uid)` or match the root owner email (`contactreachmedialimited@gmail.com`) with `email_verified == true`.

2. **Product Catalog Public Read & Secure Write**:
   Anyone can read active products, categories, shops, reviews, and settings. Only authenticated admins can create, update, or delete products, categories, shops, and settings.

3. **Customer Orders**:
   - Creating an order is allowed if required fields are present (`id`, `orderNumber`, `customerName`, `customerPhone`, `items`, `totalAmount`, `status`).
   - Order status on creation MUST be `'New'`.
   - Payment status on creation MUST be `'Pending Payment'`.
   - Modifying order status, payment status, or courier info is restricted to admins.
   - Reading an order is allowed by document ID or if the user is an admin or the order owner.

4. **Payments & Payment Confirmations**:
   Customers can submit payment confirmations with `status: 'Pending Review'` and required fields (`id`, `orderNumber`, `amountPaid`, `transactionId`). Approval, modification, or rejection is restricted to admins.

5. **Supplier Applications**:
   Prospective suppliers can submit applications with `status: 'Pending'`. Reviewing, approving, and rejecting applications is restricted to admins.

6. **Refunds, Deliveries, and Supplier Payouts**:
   Strictly admin-managed collections to maintain financial consistency and prevent unauthorized balance manipulation.

7. **Contact Messages & Customer Problems**:
   Visitors can create messages (`status: 'unread'`) and problem reports (`status: 'New'`). Only admins can update status, assign cases, or reply.

8. **Reviews**:
   Customers can create reviews with rating between 1 and 5. Only admins can moderate or delete reviews.

9. **Catch-All Default Deny**:
   Every document path not explicitly authorized is denied (`match /{document=**} { allow read, write: if false; }`).

---

## 2. The "Dirty Dozen" Malicious Payloads

1. **Spoofed Admin Role Injection on User/Admin creation**: An attacker attempts to write an admin profile for themselves in `/admins/{attackerUid}`.
2. **Ghost Field Injection in Products**: An attacker attempts to create a product containing arbitrary fields like `{ backdoor: true, script: "<script>" }`.
3. **Status Shortcutting in Orders**: An attacker attempts to place an order with `status: "Delivered"` and `paymentStatus: "Paid"` directly.
4. **Direct Price Modification on Products**: A non-admin user attempts to alter the price of an item to 0 FRW.
5. **Unauthenticated Coupon Creation**: An unauthorized visitor attempts to create a 100% discount coupon in `/coupons`.
6. **Payment Confirmation Approval Spoofing**: A buyer attempts to update their own payment confirmation status directly to `"Approved"`.
7. **Negative Price/Stock Attack**: Attempting to create a product with negative stock or negative price.
8. **Oversized String / Denial-of-Wallet Attack**: Attempting to submit a contact message with a 5MB payload or document ID longer than 128 characters.
9. **Admin Impersonation via Unverified Email**: Attempting to sign in with an unverified email claiming to be `contactreachmedialimited@gmail.com`.
10. **Arbitrary Order Deletion**: A user attempts to delete an order record to erase evidence of transaction.
11. **Review Rating Out-of-Bounds**: Submitting a product review with `rating: 999`.
12. **Settings Hijacking**: An unauthorized user attempts to change the marketplace MTN MoMo receiver account number to their personal phone.

---

## 3. Test Runner Design

All 12 dirty payloads are designed to return `PERMISSION_DENIED` under the ABAC and Zero-Trust Firestore Security rules.
