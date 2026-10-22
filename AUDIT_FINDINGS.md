# ContactReach Market — Initial Security & Reliability Audit

Date: 2026-10-22
Repository reviewed: `Contact-Reach-Media/contact-reach-media`
Branch reviewed for hardening: `security/audit-auth-hardening`

## Scope and limitation

This is an initial source/configuration review. It is not a completed production penetration test. No live database credentials, hosting control plane, runtime logs, or payment-provider test environment were available through this review. Do not interpret untested areas as passed.

## Critical findings

1. **Firebase administrator login trusted caller-supplied identity fields.** The prior endpoint could accept an email/UID supplied by the caller without requiring a Firebase ID token. The hardening branch changes this to require a token, verify it with Firebase Identity Toolkit, require a verified email, and fail closed when verification is unavailable.
2. **A default administrator password was committed in source/documentation.** The hardening branch removes the server-side default and documents that password login requires a server environment variable. Rotate any password that may have been used or shared.
3. **Runtime database JSON files are tracked in Git.** The repository contains customer/order/payment/contact/supplier/audit data and identifiers. Restrict repository access immediately, remove these records from version control only after a secure migration/backup plan is ready, and assess whether repository collaborators or historical clones have had access. Removing a file in a new commit does not erase it from Git history. Consider history rewrite and credential/session rotation as appropriate.
4. **Database writes are fire-and-forget.** API handlers may report success before Firestore writes finish. The server uses the Firebase client SDK and writes are subject to Firestore Security Rules; server-side writes may be rejected unless an appropriate authenticated server identity is used. Verify write acknowledgements and use a server-side trusted service identity with least privilege.
5. **Startup sync is not a full reconciliation strategy.** Several collections merge only records with unseen IDs, so updated documents and deletions can be missed or stale records can persist. Establish one source of truth and implement explicit conflict/deletion semantics.
6. **Runtime JSON persistence is unsafe for multi-instance production.** Synchronous file writes are not transactional across concurrent requests and ephemeral/serverless deployments do not guarantee persistent local disk. Move operational data to the primary database and retain verified backups.
7. **Deployment configuration needs runtime verification.** Vercel/Netlify config appears to build and serve the Vite SPA; it does not, by itself, prove that the Express API is deployed. Confirm the production host, API routing, environment variables, TLS, health checks, and logs.

## Additional checks required before launch

- Run the project test suite and TypeScript/build checks in CI with secrets provided only through environment variables.
- Test message creation, admin visibility, status changes, and persistence after restart.
- Test product create/update/hide/delete, inventory changes, and synchronization across storefront/admin/database.
- Test order creation, price validation, coupon bounds, stock reservation under concurrent checkouts, payment confirmation, cancellation/refund, delivery, and supplier payouts.
- Verify customer data isolation and order-tracking token privacy; avoid authorizing access by partial phone-number matching.
- Audit Firestore rules for least privilege, schema validation, admin role revocation, and unauthenticated write paths.
- Verify maintenance mode covers all relevant public write routes and that admin bypass requires a valid server-side session.
- Test backup restore, data retention, audit-log integrity, error handling, monitoring, and rollback.
- Review API body size limits, rate limiting on public endpoints, CORS, security headers, dependency vulnerabilities, and secrets/history scanning.

## Status

The authentication hardening in this branch is a proposed code change, not yet runtime-verified. The production database, hosting setup, deleted-record recovery, and end-to-end data flows remain unverified. Do not merge or declare production readiness until the checks above pass and sensitive Git-tracked data has been handled safely.
