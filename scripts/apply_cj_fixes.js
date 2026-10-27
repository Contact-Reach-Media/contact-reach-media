import fs from 'fs';

console.log('--- Applying CJ Dropshipping Real Integration Fixes ---');

// 1. UPDATE src/components/AdminDashboard.tsx
let dashboard = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

// A. Add isCjConnected helper if not present
if (!dashboard.includes('const isCjConnected =')) {
  const targetState = `  const [cjSelectedCategories, setCjSelectedCategories] = useState<string[]>([
    'electronics', 'fashion', 'amatara', 'hair-beauty', 'amasaha', 'ibikapu', 'sports'
  ]);`;
  const replacementState = `  const [cjSelectedCategories, setCjSelectedCategories] = useState<string[]>([
    'electronics', 'fashion', 'amatara', 'hair-beauty', 'amasaha', 'ibikapu', 'sports'
  ]);
  const isCjConnected = Boolean(cjConfig?.isConnected && cjConfig?.connectionStatus === 'connected');`;

  if (dashboard.includes(targetState)) {
    dashboard = dashboard.replace(targetState, replacementState);
    console.log('Added isCjConnected helper to AdminDashboard.tsx');
  } else {
    console.warn('Could not find cjSelectedCategories target in AdminDashboard.tsx');
  }
}

// B. Add handleConnectCj, handleDisconnectCj, and update handleTestCjConnection
const oldTestConnection = `  const handleTestCjConnection = async () => {
    setCjTesting(true);
    try {
      const res = await api.adminTestCjConnection(cjApiKeyInput.trim(), cjEmailInput.trim());
      showToast(res.message, res.success ? 'success' : 'error');
    } catch (err: any) {
      showToast(err.message || 'Connection test failed', 'error');
    } finally {
      setCjTesting(false);
    }
  };`;

const newConnectionHandlers = `  const handleConnectCj = async () => {
    if (!cjApiKeyInput.trim()) {
      showToast('Please enter your CJ Dropshipping API Key', 'error');
      return;
    }
    setCjConnecting(true);
    setCjConnectionError(null);
    try {
      const res = await api.adminConnectCj(cjApiKeyInput.trim(), cjEmailInput.trim());
      if (res.success) {
        showToast(res.message, 'success');
        setCjConfig(res.config || null);
        setCjConnectionError(null);
        if (res.config?.apiKey) {
          setCjApiKeyInput(res.config.apiKey);
        }
      } else {
        const errMsg = res.message || 'Authentication with CJ API failed';
        setCjConnectionError(errMsg);
        showToast(errMsg, 'error');
        if (res.config) setCjConfig(res.config);
      }
    } catch (err: any) {
      const errMsg = err.message || 'Failed to connect to CJ Dropshipping API';
      setCjConnectionError(errMsg);
      showToast(errMsg, 'error');
    } finally {
      setCjConnecting(false);
    }
  };

  const handleDisconnectCj = async () => {
    if (!window.confirm('Are you sure you want to disconnect from CJ Dropshipping? Your credentials and access token will be cleared.')) {
      return;
    }
    setCjDisconnecting(true);
    try {
      const res = await api.adminDisconnectCj();
      showToast(res.message, 'success');
      if (res.config) {
        setCjConfig(res.config);
      } else {
        setCjConfig(prev => prev ? { ...prev, isConnected: false, connectionStatus: 'disconnected' } : null);
      }
      setCjApiKeyInput('');
      setCjConnectionError(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to disconnect CJ Dropshipping', 'error');
    } finally {
      setCjDisconnecting(false);
    }
  };

  const handleTestCjConnection = async () => {
    setCjTesting(true);
    setCjConnectionError(null);
    try {
      const res = await api.adminTestCjConnection(cjApiKeyInput.trim(), cjEmailInput.trim());
      if (res.success) {
        showToast(res.message, 'success');
        setCjConnectionError(null);
        if (res.config) setCjConfig(res.config);
      } else {
        const errMsg = res.message || 'Connection test failed';
        setCjConnectionError(errMsg);
        showToast(errMsg, 'error');
      }
    } catch (err: any) {
      const errMsg = err.message || 'Connection test failed';
      setCjConnectionError(errMsg);
      showToast(errMsg, 'error');
    } finally {
      setCjTesting(false);
    }
  };`;

if (dashboard.includes(oldTestConnection)) {
  dashboard = dashboard.replace(oldTestConnection, newConnectionHandlers);
  console.log('Replaced handleTestCjConnection and added handleConnectCj/handleDisconnectCj');
}

// C. Fix the bug where {cjConfig?.email && <span>Connected</span>} was incorrectly displayed
const oldEmailBadge = `{cjConfig?.email && (
                          <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                            Connected
                          </span>
                        )}`;

const newEmailBadge = `{isCjConnected ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Connected
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                            Disconnected
                          </span>
                        )}`;

if (dashboard.includes(oldEmailBadge)) {
  dashboard = dashboard.replace(oldEmailBadge, newEmailBadge);
  console.log('Fixed incorrect email "Connected" badge with real isCjConnected validation');
}

// D. Update Subtab 5 (Settings) header buttons and add prominent Real Connection Status Banner
const oldSettingsHeader = `<div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                        <Sliders className="w-4 h-4 text-purple-600" />
                        <span>CJ Dropshipping Account & API Configuration</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        API credentials are secure on the backend. Credentials are never exposed in public client bundles.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleTestCjConnection}
                        disabled={cjTesting}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-200 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
                      >
                        <ShieldCheck className={\`w-4 h-4 \${cjTesting ? 'animate-spin text-purple-600' : 'text-slate-600'}\`} />
                        <span>{cjTesting ? 'Testing...' : 'Test Connection'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSaveCjConfig}
                        disabled={savingCjConfig}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{savingCjConfig ? 'Saving...' : 'Save Settings'}</span>
                      </button>
                    </div>
                  </div>`;

const newSettingsHeader = `<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                        <Sliders className="w-4 h-4 text-purple-600" />
                        <span>CJ Dropshipping Account & API Configuration</span>
                        {isCjConnected ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            API CONNECTED
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-300">
                            DISCONNECTED
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        API credentials are secure on the backend. Only validated against official CJ API v2.0 developers endpoint.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {isCjConnected ? (
                        <button
                          type="button"
                          onClick={handleDisconnectCj}
                          disabled={cjDisconnecting}
                          className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-xl border border-red-200 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          <span>{cjDisconnecting ? 'Disconnecting...' : 'Disconnect'}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleConnectCj}
                          disabled={cjConnecting || !cjApiKeyInput.trim()}
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
                        >
                          <Zap className={\`w-3.5 h-3.5 \${cjConnecting ? 'animate-spin' : ''}\`} />
                          <span>{cjConnecting ? 'Connecting...' : 'Connect to CJ API'}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={handleTestCjConnection}
                        disabled={cjTesting}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-200 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
                      >
                        <ShieldCheck className={\`w-4 h-4 \${cjTesting ? 'animate-spin text-purple-600' : 'text-slate-600'}\`} />
                        <span>{cjTesting ? 'Testing...' : 'Test Connection'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSaveCjConfig}
                        disabled={savingCjConfig}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{savingCjConfig ? 'Saving...' : 'Save Settings'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Real Live Connection Status Banner */}
                  {isCjConnected ? (
                    <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0 text-emerald-700 font-black">
                          ✓
                        </div>
                        <div>
                          <div className="font-bold text-sm text-emerald-900 flex items-center gap-2">
                            <span>CJdropshipping API v2.0 Authenticated</span>
                            <span className="text-[10px] font-mono bg-emerald-200/80 text-emerald-900 font-bold px-2 py-0.5 rounded-full">REAL API ACTIVE</span>
                          </div>
                          <p className="text-xs text-emerald-800 mt-0.5">
                            Real API access token acquired directly from developers.cjdropshipping.com{cjConfig?.connectedAt ? \` on \${new Date(cjConfig.connectedAt).toLocaleString()}\` : ''}. Auto-import and live stock synchronization are enabled.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleDisconnectCj}
                        disabled={cjDisconnecting}
                        className="px-3.5 py-1.5 bg-white hover:bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-200 shadow-2xs cursor-pointer shrink-0 disabled:opacity-50"
                      >
                        Disconnect API
                      </button>
                    </div>
                  ) : (
                    <div className={\`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs \${
                      cjConnectionError || cjConfig?.connectionStatus === 'error'
                        ? 'bg-red-50 border-red-200 text-red-950'
                        : 'bg-slate-50 border-slate-200 text-slate-800'
                    }\`}>
                      <div className="flex items-start gap-3">
                        <div className={\`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-black \${
                          cjConnectionError || cjConfig?.connectionStatus === 'error'
                            ? 'bg-red-100 text-red-600'
                            : 'bg-slate-200 text-slate-600'
                        }\`}>
                          !
                        </div>
                        <div>
                          <div className="font-bold text-sm flex items-center gap-2">
                            <span>{cjConnectionError || cjConfig?.connectionStatus === 'error' ? 'Authentication Failed' : 'CJdropshipping API Disconnected'}</span>
                            <span className={\`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold \${
                              cjConnectionError || cjConfig?.connectionStatus === 'error'
                                ? 'bg-red-200 text-red-900'
                                : 'bg-slate-200 text-slate-700'
                            }\`}>
                              {cjConnectionError || cjConfig?.connectionStatus === 'error' ? 'INVALID CREDENTIALS' : 'NOT CONNECTED'}
                            </span>
                          </div>
                          <p className="text-xs mt-0.5 opacity-90">
                            {cjConnectionError || cjConfig?.lastError || 'Provide your official CJ Dropshipping API Key below and click "Connect to CJ API" to authenticate directly with CJ API 2.0.'}
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleConnectCj}
                          disabled={cjConnecting || !cjApiKeyInput.trim()}
                          className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-2xs cursor-pointer disabled:opacity-50"
                        >
                          {cjConnecting ? 'Connecting...' : 'Connect to CJ API'}
                        </button>
                      </div>
                    </div>
                  )}`;

if (dashboard.includes(oldSettingsHeader)) {
  dashboard = dashboard.replace(oldSettingsHeader, newSettingsHeader);
  console.log('Added Real Connection Status Banner and Connect/Disconnect buttons to Subtab 5');
}

// E. Add connection badge and Connect/Disconnect buttons to the top header of CJ Dropshipping tab
const oldCjHeader = `<h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    <RefreshCw className="w-5 h-5 text-purple-600" />
                    <span>CJ Dropshipping Integration & Auto-Upload</span>
                  </h1>`;

const newCjHeader = `<div className="flex items-center gap-2.5 flex-wrap">
                    <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
                      <RefreshCw className="w-5 h-5 text-purple-600" />
                      <span>CJ Dropshipping Integration & Auto-Upload</span>
                    </h1>
                    {isCjConnected ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        Connected
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                        Disconnected
                      </span>
                    )}
                  </div>`;

if (dashboard.includes(oldCjHeader)) {
  dashboard = dashboard.replace(oldCjHeader, newCjHeader);
  console.log('Added live connection badge to CJ tab title header');
}

fs.writeFileSync('src/components/AdminDashboard.tsx', dashboard, 'utf8');
console.log('Successfully updated AdminDashboard.tsx');

// 2. UPDATE server.ts for Pending Queue and Staging Approval
let server = fs.readFileSync('server.ts', 'utf8');

// A. Update POST /api/admin/cjdropshipping/import
// Ensure duplicate checking across both db.products and db.cjPendingProducts, and store in cjPendingProducts when review is required
const oldImportRoute = `app.post('/api/admin/cjdropshipping/import', requireAdminAuth, requireRole(['owner', 'administrator', 'product_manager']), (req: Request, res: Response) => {
  const admin = (req as any).adminUser;
  const { products: rawProducts, requireApproval, targetCategory, customMarkup } = req.body;

  if (!Array.isArray(rawProducts) || rawProducts.length === 0) {
    return res.status(400).json({ error: 'Please select at least one product to import.' });
  }

  const config = db.settings.cjConfig || initialSettings.cjConfig!;
  const usdRate = config.usdToRwfRate || 1420;
  const markupPercent = Number(customMarkup) || config.defaultMarkupPercent || 35;
  const shouldRequireApproval = requireApproval !== undefined
    ? Boolean(requireApproval)
    : (config.requireAdminApproval !== undefined ? config.requireAdminApproval : true);

  const { shopId, shopName } = resolveOrCreateShop(
    'CJ Dropshipping Fulfillment',
    undefined,
    {
      location: 'Kigali Express / Global Air Dispatch',
      phone: '+250780022600',
      category: 'Dropshipping Supplier',
      description: 'Automated global dropshipping fulfillment integrated directly with ContactReach Market.'
    },
    admin.name
  );

  let importedCount = 0;
  let updatedCount = 0;
  const importedList: Product[] = [];`;

const newImportRoute = `app.post('/api/admin/cjdropshipping/import', requireAdminAuth, requireRole(['owner', 'administrator', 'product_manager']), (req: Request, res: Response) => {
  const admin = (req as any).adminUser;
  const { products: rawProducts, requireApproval, targetCategory, customMarkup } = req.body;

  if (!Array.isArray(rawProducts) || rawProducts.length === 0) {
    return res.status(400).json({ error: 'Please select at least one product to import.' });
  }

  const config = db.settings.cjConfig || initialSettings.cjConfig!;
  const usdRate = config.usdToRwfRate || 1420;
  const markupPercent = Number(customMarkup) || config.defaultMarkupPercent || 35;
  const shouldRequireApproval = requireApproval !== undefined
    ? Boolean(requireApproval)
    : (config.requireAdminApproval !== undefined ? config.requireAdminApproval : true);

  const { shopId, shopName } = resolveOrCreateShop(
    'CJ Dropshipping Fulfillment',
    undefined,
    {
      location: 'Kigali Express / Global Air Dispatch',
      phone: '+250780022600',
      category: 'Dropshipping Supplier',
      description: 'Automated global dropshipping fulfillment integrated directly with ContactReach Market.'
    },
    admin.name
  );

  db.cjPendingProducts = db.cjPendingProducts || [];
  let importedCount = 0;
  let updatedCount = 0;
  const importedList: Product[] = [];`;

if (server.includes(oldImportRoute)) {
  server = server.replace(oldImportRoute, newImportRoute);
}

// B. In the loop of import:
// Replace product creation to push to cjPendingProducts when shouldRequireApproval is true, preventing duplicates
const oldProductInsert = `      db.products.unshift(newProduct);
      saveToFirestoreAsync('products', newProduct.id, newProduct);`;

const newProductInsert = `      if (shouldRequireApproval) {
        // Prevent duplicate in pending queue
        const existingPendingIdx = (db.cjPendingProducts || []).findIndex(p => p.cjProductId === pid || (p.sku && p.sku === sku));
        if (existingPendingIdx !== -1) {
          db.cjPendingProducts![existingPendingIdx] = newProduct;
          updatedCount++;
        } else {
          db.cjPendingProducts!.unshift(newProduct);
          importedCount++;
        }
        saveToFirestoreAsync('cjPendingProducts', newProduct.id, newProduct);
      } else {
        db.products.unshift(newProduct);
        saveToFirestoreAsync('products', newProduct.id, newProduct);
        importedCount++;
      }`;

if (server.includes(oldProductInsert)) {
  server = server.replace(oldProductInsert, newProductInsert);
  console.log('Updated import loop to route unapproved products to cjPendingProducts collection');
}

// C. Update GET /api/admin/cjdropshipping/products/staging
const oldStagingRoute = `app.get('/api/admin/cjdropshipping/products/staging', requireAdminAuth, (req: Request, res: Response) => {
  const { status } = req.query;
  let items = db.products.filter(p => p.source === 'cjdropshipping');
  if (status && status !== 'all') {
    items = items.filter(p => p.reviewStatus === status);
  } else {
    // Default: return all dropshipping products with reviewStatus
    items = items.filter(p => p.reviewStatus !== undefined);
  }
  res.json(items);
});`;

const newStagingRoute = `app.get('/api/admin/cjdropshipping/products/staging', requireAdminAuth, (req: Request, res: Response) => {
  const { status } = req.query;
  db.cjPendingProducts = db.cjPendingProducts || [];
  
  // Combine pending queue and products with reviewStatus
  const combined = [...db.cjPendingProducts, ...db.products.filter(p => p.source === 'cjdropshipping' && p.reviewStatus !== undefined)];
  const seenIds = new Set<string>();
  const uniqueItems: Product[] = [];
  for (const item of combined) {
    if (!seenIds.has(item.id)) {
      seenIds.add(item.id);
      uniqueItems.push(item);
    }
  }

  let items = uniqueItems;
  if (status && status !== 'all') {
    items = items.filter(p => p.reviewStatus === status);
  }
  res.json(items);
});`;

if (server.includes(oldStagingRoute)) {
  server = server.replace(oldStagingRoute, newStagingRoute);
  console.log('Updated /staging to retrieve from cjPendingProducts');
}

// D. Update POST /api/admin/cjdropshipping/products/:id/approve to transfer from cjPendingProducts to db.products
const oldApproveRoute = `app.post('/api/admin/cjdropshipping/products/:id/approve', requireAdminAuth, requireRole(['owner', 'administrator', 'product_manager']), (req: Request, res: Response) => {
  const admin = (req as any).adminUser;
  const prod = db.products.find(p => p.id === req.params.id);
  if (!prod) {
    return res.status(404).json({ error: 'Product not found' });
  }

  prod.reviewStatus = 'Approved';
  prod.status = 'Available';
  prod.updatedAt = new Date().toISOString();
  prod.history = prod.history || [];
  prod.history.unshift({
    timestamp: new Date().toISOString(),
    action: 'Approved & Published by Admin',
    user: admin.name
  });

  saveDbToDisk();
  saveToFirestoreAsync('products', prod.id, prod);
  logAudit(admin, 'CJ_PRODUCT_APPROVED', \`Approved dropshipping product "\${prod.name}" (\${prod.id}) for public store listing.\`, 'product', prod.id);

  res.json({ success: true, message: \`Product "\${prod.name}" approved and published to the live store.\`, product: prod });
});`;

const newApproveRoute = `app.post('/api/admin/cjdropshipping/products/:id/approve', requireAdminAuth, requireRole(['owner', 'administrator', 'product_manager']), (req: Request, res: Response) => {
  const admin = (req as any).adminUser;
  db.cjPendingProducts = db.cjPendingProducts || [];

  // Check if item is in cjPendingProducts queue
  const pendingIdx = db.cjPendingProducts.findIndex(p => p.id === req.params.id);
  let prod: Product | undefined;

  if (pendingIdx !== -1) {
    const [pendingItem] = db.cjPendingProducts.splice(pendingIdx, 1);
    prod = pendingItem;
    prod.reviewStatus = 'Approved';
    prod.status = 'Available';
    prod.updatedAt = new Date().toISOString();
    prod.history = prod.history || [];
    prod.history.unshift({
      timestamp: new Date().toISOString(),
      action: 'Approved & Published by Admin',
      user: admin.name
    });

    // Remove any duplicate already in db.products
    db.products = db.products.filter(p => p.id !== prod!.id && p.cjProductId !== prod!.cjProductId);
    db.products.unshift(prod);
    saveDbToDisk();
    saveToFirestoreAsync('products', prod.id, prod);

    // Remove from Firestore pending collection
    try {
      if (firestoreDb) {
        firestoreDb.collection('cjPendingProducts').doc(prod.id).delete().catch(() => {});
      }
    } catch {}

    logAudit(admin, 'CJ_PRODUCT_APPROVED', \`Approved pending dropshipping product "\${prod.name}" (\${prod.id}) for public store listing.\`, 'product', prod.id);
    return res.json({ success: true, message: \`Product "\${prod.name}" approved and published to the live store.\`, product: prod });
  }

  // Fallback: check db.products
  prod = db.products.find(p => p.id === req.params.id);
  if (!prod) {
    return res.status(404).json({ error: 'Product not found in live or pending queues' });
  }

  prod.reviewStatus = 'Approved';
  prod.status = 'Available';
  prod.updatedAt = new Date().toISOString();
  prod.history = prod.history || [];
  prod.history.unshift({
    timestamp: new Date().toISOString(),
    action: 'Approved & Published by Admin',
    user: admin.name
  });

  saveDbToDisk();
  saveToFirestoreAsync('products', prod.id, prod);
  logAudit(admin, 'CJ_PRODUCT_APPROVED', \`Approved dropshipping product "\${prod.name}" (\${prod.id}) for public store listing.\`, 'product', prod.id);

  res.json({ success: true, message: \`Product "\${prod.name}" approved and published to the live store.\`, product: prod });
});`;

if (server.includes(oldApproveRoute)) {
  server = server.replace(oldApproveRoute, newApproveRoute);
  console.log('Updated /approve endpoint to move items from cjPendingProducts to db.products');
}

// E. Update POST /api/admin/cjdropshipping/products/bulk-approve
const oldBulkApprove = `    const prod = db.products.find(p => p.id === id);
    if (prod && prod.source === 'cjdropshipping') {
      prod.reviewStatus = 'Approved';
      prod.status = 'Available';
      prod.updatedAt = new Date().toISOString();
      prod.history = prod.history || [];
      prod.history.unshift({
        timestamp: new Date().toISOString(),
        action: 'Bulk Approved & Published by Admin',
        user: admin.name
      });
      saveToFirestoreAsync('products', prod.id, prod);
      approvedProducts.push(prod);
      approvedCount++;
    }`;

const newBulkApprove = `    db.cjPendingProducts = db.cjPendingProducts || [];
    const pendingIdx = db.cjPendingProducts.findIndex(p => p.id === id);
    if (pendingIdx !== -1) {
      const [pendingProd] = db.cjPendingProducts.splice(pendingIdx, 1);
      pendingProd.reviewStatus = 'Approved';
      pendingProd.status = 'Available';
      pendingProd.updatedAt = new Date().toISOString();
      pendingProd.history = pendingProd.history || [];
      pendingProd.history.unshift({
        timestamp: new Date().toISOString(),
        action: 'Bulk Approved & Published by Admin',
        user: admin.name
      });
      db.products = db.products.filter(p => p.id !== pendingProd.id && p.cjProductId !== pendingProd.cjProductId);
      db.products.unshift(pendingProd);
      saveToFirestoreAsync('products', pendingProd.id, pendingProd);
      try {
        if (firestoreDb) {
          firestoreDb.collection('cjPendingProducts').doc(pendingProd.id).delete().catch(() => {});
        }
      } catch {}
      approvedProducts.push(pendingProd);
      approvedCount++;
    } else {
      const prod = db.products.find(p => p.id === id);
      if (prod && prod.source === 'cjdropshipping') {
        prod.reviewStatus = 'Approved';
        prod.status = 'Available';
        prod.updatedAt = new Date().toISOString();
        prod.history = prod.history || [];
        prod.history.unshift({
          timestamp: new Date().toISOString(),
          action: 'Bulk Approved & Published by Admin',
          user: admin.name
        });
        saveToFirestoreAsync('products', prod.id, prod);
        approvedProducts.push(prod);
        approvedCount++;
      }
    }`;

if (server.includes(oldBulkApprove)) {
  server = server.replace(oldBulkApprove, newBulkApprove);
  console.log('Updated /bulk-approve to transfer from cjPendingProducts');
}

fs.writeFileSync('server.ts', server, 'utf8');
console.log('Successfully updated server.ts');
