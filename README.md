# ContactReach Market — Production Marketplace Platform

**Company:** ContactReach Media Ltd  
**Headquarters:** KG 622 St, Fair View Plaza, Kigali, Rwanda  
**Contact:** contactreachmedialimited@gmail.com | +250 780 022 600  
**Target Market:** Rwanda (Kigali & Provinces)  
**Primary Currency:** Rwandan Franc (RWF / FRW)  
**Business Model:** Multi-supplier drop-shipping & verified distributor marketplace connecting customers directly with vetted retail suppliers and wholesalers without holding physical inventory.

---

## 1. System Overview

ContactReach Market is a specialized e-commerce web platform engineered for Rwanda's digital retail landscape.

### Core Capabilities:
- **Zero Mock / Zero Fake Policy**: 100% production-ready catalog without fake products, invented sales counts, or dummy reviews.
- **Rwandan Mobile Money & Banking**:
  - MTN MoMo direct transfer (*182*1*1*078002260*AMOUNT#)
  - MTN MoMoPay merchant code (*182*8*1*078002*AMOUNT#)
  - Airtel Money (*182*1*2*078002260*AMOUNT#)
  - I&M Bank Rwanda wire transfer
  - Cash on pickup at Fair View Plaza, Kigali
- **Order Lifecycle & Real-Time Tracking**:
  - Secure unguessable 16-byte tracking tokens (`/orders?token=...`)
  - Sanitized public tracking view (prevents telephone or private invoice data harvesting)
  - Step-by-step courier statuses: *New &rarr; Payment Verified &rarr; Sourced &rarr; Dispatched &rarr; Delivered &rarr; Completed*
- **Drop-Shipping & Supplier Settlement Tracking**:
  - Automated marketplace commission calculations (e.g., 10%)
  - Supplier payout logs (`subtotal - commission`)
  - Supplier onboarding application portal with TIN registration validation
- **Dual-Layer High Reliability Persistence**:
  - Primary cloud storage: **Google Cloud Firestore** (`ai-studio-contactreachmark-e7c8fa82-d820-4699-9810-672e9d5a0b74`, region: `europe-west1`)
  - Redundant file-system backup: `data/market_db.json` with pre-migration snapshot in `data/market_db.backup.json`
- **Security & RBAC**:
  - Role-based staff access: `owner`, `administrator`, `product_manager`, `customer_support`
  - Strict server-side verification with rate limiting (5 attempts &rarr; 15 min lock)
  - Google Firebase Auth login integration for authorized company emails

---

## 2. Administrator Access Credentials

To access the Staff Control Panel:
1. Navigate to the website and open the **Staff / Admin Login** modal (or visit `https://your-domain/admin`).
2. Enter your authorized administrator credentials:
   - **Email:** `contactreachmedialimited@gmail.com`
   - **Password:** configured only through the server's `ADMIN_PASSWORD` environment variable (no default password is provided).
   *(Or click "Sign in with Google" using the authorized company Google account).*

### Security Invariants:
- Insecure fallback backdoor passwords have been eliminated.
- Admin sessions expire after 24 hours.
- All administrative actions (catalog changes, order approvals, payout updates, settings modifications) are immutably logged to the **Audit Log** collection.

---

## 3. Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide Icons, Motion.
- **Backend**: Node.js, Express, tsx.
- **Database & Auth**: Firebase / Cloud Firestore & Firebase Authentication (`firebase-blueprint.json` & `firestore.rules`).
- **SEO & Search Engines**: Canonical URLs, OpenGraph cards, Twitter cards, Schema.org JSON-LD store metadata, `robots.txt`, `sitemap.xml`, and Google Search Console verification (`googlea687c6ecf7209a4b.html`).

---

## 4. Local Development & Deployment

### Running the Dev Server:
```bash
npm install
npm run dev
```
The server will start on `http://localhost:3000`.

### Building for Production:
```bash
npm run build
npm run start
```

### Type Checking & Linting:
```bash
npm run lint
```

---

## 5. Delivery Configuration (Rwanda)

| Zone | Covered Areas | Delivery Fee | Est. Timeline |
|---|---|---|---|
| Gasabo | Kimironko, Remera, Kacyiru, Gisozi, Kibagabaga | 1,500 RWF | 2 - 4 hours |
| Nyarugenge | Downtown, Kiyovu, Nyamirambo, Muhima | 1,500 RWF | 2 - 4 hours |
| Kicukiro | Sonatubes, Gikondo, Kanombe, Niboye, Kagarama | 1,500 RWF | 2 - 4 hours |
| Kigali Express | Direct express courier anywhere in urban Kigali | 3,000 RWF | 60 - 90 mins |
| Upcountry / Intara | Musanze, Rubavu, Huye, Rwamagana, Rusizi, etc. | 3,500 RWF | 24 - 48 hours |
| Pickup Station | Fair View Plaza, KG 622 St, Kigali | 0 RWF | Free |

Free delivery applies automatically to Kigali orders exceeding **50,000 RWF**.

---

&copy; 2026 ContactReach Media Ltd. All rights reserved.
