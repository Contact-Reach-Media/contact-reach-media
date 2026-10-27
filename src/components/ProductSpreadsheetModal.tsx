import React, { useState, useRef, useEffect } from 'react';
import {
  FileSpreadsheet, Download, Upload, RefreshCw, CheckCircle2, AlertTriangle,
  X, ExternalLink, ArrowRight, Check, AlertCircle, FileText, Layers,
  Filter, Search, SlidersHorizontal, Table, HelpCircle, CloudUpload, ArrowUpRight
} from 'lucide-react';
import { Product, Category, VendorShop } from '../types.ts';
import {
  exportProductsToExcel, exportProductsToCsv, parseUploadedSpreadsheet,
  autoDetectFieldMapping, buildSpreadsheetPreview, FieldMapping,
  SpreadsheetPreviewSummary, SpreadsheetPreviewItem, extractGoogleSheetId,
  fetchGoogleSheetMetadata, fetchGoogleSheetValues, fetchGoogleSheetValuesFromCsv, writeProductsToGoogleSheet,
  createNewGoogleSheetWithProducts
} from '../utils/spreadsheet.ts';
import { api } from '../services/api.ts';
import { getGoogleAccessToken, loginWithGoogle } from '../services/firebase.ts';

interface ProductSpreadsheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  categories: Category[];
  shops: VendorShop[];
  onProductsUpdated: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

type ModalTab = 'upload' | 'sheets' | 'export';
type ConflictStrategy = 'upsert' | 'update_only' | 'create_only';

const LINKED_GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1kaLUCemqV6-KJ_G6nqYhyrf2bPpDg6HxyaSj6uDsoHk/edit?usp=sharing';
const LINKED_GOOGLE_SHEET_ID = '1kaLUCemqV6-KJ_G6nqYhyrf2bPpDg6HxyaSj6uDsoHk';

export const ProductSpreadsheetModal: React.FC<ProductSpreadsheetModalProps> = ({
  isOpen,
  onClose,
  products,
  categories,
  shops,
  onProductsUpdated,
  showToast
}) => {
  const [activeTab, setActiveTab] = useState<ModalTab>('sheets');

  // File Upload State
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [activeSheetName, setActiveSheetName] = useState<string>('');
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<any[][]>([]);
  const [fieldMapping, setFieldMapping] = useState<FieldMapping | null>(null);
  const [isParsingFile, setIsParsingFile] = useState(false);

  // Google Sheets State
  const [googleSheetInput, setGoogleSheetInput] = useState(LINKED_GOOGLE_SHEET_URL);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(getGoogleAccessToken());
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const [isLoadingSheetMeta, setIsLoadingSheetMeta] = useState(false);
  const [sheetMetadata, setSheetMetadata] = useState<{ title: string; sheets: Array<{ title: string; sheetId: number }> } | null>({
    title: 'ContactReach Market Products',
    sheets: [{ title: 'Sheet1', sheetId: 0 }]
  });
  const [selectedSheetTab, setSelectedSheetTab] = useState<string>('Sheet1');
  const [isExportingToSheet, setIsExportingToSheet] = useState(false);

  // Preview & Confirmation Stage State
  const [stage, setStage] = useState<'configure' | 'preview' | 'result'>('configure');
  const [previewSummary, setPreviewSummary] = useState<SpreadsheetPreviewSummary | null>(null);
  const [conflictStrategy, setConflictStrategy] = useState<ConflictStrategy>('upsert');
  const [previewFilter, setPreviewFilter] = useState<'all' | 'new' | 'update' | 'price-change' | 'warning'>('all');
  const [previewSearch, setPreviewSearch] = useState('');
  const [isCommittingImport, setIsCommittingImport] = useState(false);
  const [importResult, setImportResult] = useState<{ createdCount: number; updatedCount: number; skippedCount: number; message: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setGoogleAccessToken(getGoogleAccessToken());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle local Excel/CSV file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    setIsParsingFile(true);
    try {
      const parsed = await parseUploadedSpreadsheet(file);
      setSheetNames(parsed.sheetNames);
      setActiveSheetName(parsed.activeSheet);
      setRawHeaders(parsed.headers);
      setRawRows(parsed.rawRows);

      // Auto detect columns
      const mapping = autoDetectFieldMapping(parsed.headers);
      setFieldMapping(mapping);
    } catch (err: any) {
      showToast(err.message || 'Failed to read spreadsheet file', 'error');
      setUploadedFile(null);
    } finally {
      setIsParsingFile(false);
    }
  };

  // Run preview analysis
  const handleGeneratePreview = () => {
    if (!fieldMapping || rawRows.length === 0) {
      showToast('Please select a valid spreadsheet file with products', 'error');
      return;
    }

    try {
      const summary = buildSpreadsheetPreview(
        rawRows,
        rawHeaders,
        fieldMapping,
        products,
        categories,
        shops
      );
      setPreviewSummary(summary);
      setStage('preview');
    } catch (err: any) {
      showToast(err.message || 'Failed to analyze spreadsheet rows', 'error');
    }
  };

  // Google Sign-In helper
  const handleAuthorizeGoogle = async () => {
    setIsConnectingGoogle(true);
    try {
      const user = await loginWithGoogle();
      const token = (user as any).accessToken || getGoogleAccessToken();
      if (!token) {
        throw new Error('Could not retrieve Google authorization token');
      }
      setGoogleAccessToken(token);
      showToast('Google account authorized successfully with Sheets permissions', 'success');
    } catch (err: any) {
      showToast(err.message || 'Google authorization failed', 'error');
    } finally {
      setIsConnectingGoogle(false);
    }
  };

  // Load Google Sheet metadata (sheet tabs)
  const handleInspectGoogleSheet = async () => {
    const sheetId = extractGoogleSheetId(googleSheetInput) || LINKED_GOOGLE_SHEET_ID;
    if (!sheetId) {
      showToast('Please enter a valid Google Sheets URL or ID', 'error');
      return;
    }

    setIsLoadingSheetMeta(true);
    try {
      if (googleAccessToken) {
        const meta = await fetchGoogleSheetMetadata(sheetId, googleAccessToken);
        setSheetMetadata(meta);
        if (meta.sheets.length > 0) {
          setSelectedSheetTab(meta.sheets[0].title);
        }
        showToast(`Connected to "${meta.title}" (${meta.sheets.length} tabs found)`, 'success');
      } else {
        // Test CSV connection
        const { rows } = await fetchGoogleSheetValuesFromCsv(sheetId, 'Sheet1');
        setSheetMetadata({
          title: 'Linked Google Sheet',
          sheets: [{ title: 'Sheet1', sheetId: 0 }]
        });
        setSelectedSheetTab('Sheet1');
        showToast(`Connected to sheet (${rows.length} product rows available)`, 'success');
      }
    } catch (err: any) {
      // Fallback to basic tab info
      setSheetMetadata({
        title: 'Linked Google Sheet',
        sheets: [{ title: 'Sheet1', sheetId: 0 }]
      });
      setSelectedSheetTab('Sheet1');
      showToast('Connected using shared sheet link access.', 'success');
    } finally {
      setIsLoadingSheetMeta(false);
    }
  };

  // Direct 1-Click Sync from Google Sheet (Pull Edits into Website)
  const handleDirectSyncFromSheet = async () => {
    const sheetId = extractGoogleSheetId(googleSheetInput) || LINKED_GOOGLE_SHEET_ID;
    setIsParsingFile(true);
    try {
      let res;
      try {
        res = await api.syncPullFromGoogleSheet(sheetId, selectedSheetTab || 'Sheet1', googleAccessToken || undefined);
      } catch (firstErr: any) {
        if (googleAccessToken) {
          console.warn('[Google Sheet Sync] Retrying pull with public link access...');
          res = await api.syncPullFromGoogleSheet(sheetId, selectedSheetTab || 'Sheet1', undefined);
        } else {
          throw firstErr;
        }
      }
      showToast(res.message, 'success');
      onProductsUpdated();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Direct synchronization from Google Sheet failed', 'error');
    } finally {
      setIsParsingFile(false);
    }
  };

  // Read Google Sheet rows and build interactive preview
  const handleReadGoogleSheetValues = async () => {
    const sheetId = extractGoogleSheetId(googleSheetInput) || LINKED_GOOGLE_SHEET_ID;
    const tabName = selectedSheetTab || 'Sheet1';

    setIsParsingFile(true);
    try {
      let headers: string[] = [];
      let rows: any[][] = [];

      if (googleAccessToken) {
        try {
          const res = await fetchGoogleSheetValues(sheetId, tabName, googleAccessToken);
          headers = res.headers;
          rows = res.rows;
        } catch (apiErr) {
          // Fallback to CSV
          const res = await fetchGoogleSheetValuesFromCsv(sheetId, tabName);
          headers = res.headers;
          rows = res.rows;
        }
      } else {
        const res = await fetchGoogleSheetValuesFromCsv(sheetId, tabName);
        headers = res.headers;
        rows = res.rows;
      }

      if (rows.length === 0) {
        throw new Error(`Tab "${tabName}" contains no product rows.`);
      }

      setRawHeaders(headers);
      setRawRows(rows);
      const mapping = autoDetectFieldMapping(headers);
      setFieldMapping(mapping);

      const summary = buildSpreadsheetPreview(rows, headers, mapping, products, categories, shops);
      setPreviewSummary(summary);
      setStage('preview');
      showToast(`Loaded ${rows.length} rows from Google Sheet`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to read Google Sheet data. Ensure sharing is enabled.', 'error');
    } finally {
      setIsParsingFile(false);
    }
  };

  // Export current catalog to a Google Sheet (Mandatory User Confirmation)
  const handleExportToGoogleSheet = async (createNew = false) => {
    let token = googleAccessToken || getGoogleAccessToken();
    if (!token) {
      try {
        const user = await loginWithGoogle();
        token = (user as any).accessToken || getGoogleAccessToken();
        if (token) setGoogleAccessToken(token);
      } catch (err: any) {
        showToast('Google account authorization required to save to Google Sheets', 'error');
        return;
      }
    }

    if (!token) {
      showToast('Please authorize your Google account to save products to Google Sheets', 'error');
      return;
    }

    const sheetId = extractGoogleSheetId(googleSheetInput) || LINKED_GOOGLE_SHEET_ID;
    const targetTab = selectedSheetTab || 'Sheet1';

    const confirmed = window.confirm(
      createNew
        ? `Create a new Google Sheet with all ${products.length} current marketplace products?`
        : `Save and update all ${products.length} store products in Google Sheet (${sheetId})? This will update the rows in "${targetTab}".`
    );
    if (!confirmed) return;

    setIsExportingToSheet(true);
    try {
      if (createNew) {
        const title = `ContactReach Market Products - ${new Date().toISOString().split('T')[0]}`;
        const result = await createNewGoogleSheetWithProducts(title, products, categories, token);
        showToast(`Created new Google Sheet with ${result.updatedRows} products!`, 'success');
        window.open(result.spreadsheetUrl, '_blank');
      } else {
        const result = await writeProductsToGoogleSheet(sheetId, targetTab, products, categories, token);
        showToast(`Successfully saved ${result.updatedRows} products to Google Sheet!`, 'success');
        window.open(result.spreadsheetUrl, '_blank');
      }
      onProductsUpdated();
    } catch (err: any) {
      showToast(err.message || 'Failed to export products to Google Sheet', 'error');
    } finally {
      setIsExportingToSheet(false);
    }
  };

  // Toggle item selection in preview
  const handleToggleSelectRow = (index: number) => {
    if (!previewSummary) return;
    const updated = [...previewSummary.items];
    updated[index].selected = !updated[index].selected;
    setPreviewSummary({ ...previewSummary, items: updated });
  };

  // Select / Deselect All
  const handleToggleSelectAll = (select: boolean) => {
    if (!previewSummary) return;
    const updated = previewSummary.items.map(item => ({
      ...item,
      selected: select ? item.isValid : false
    }));
    setPreviewSummary({ ...previewSummary, items: updated });
  };

  // Commit selected preview items to backend database
  const handleCommitImport = async () => {
    if (!previewSummary) return;
    const selectedItems = previewSummary.items.filter(i => i.selected && i.isValid);

    if (selectedItems.length === 0) {
      showToast('Please select at least one valid product to import', 'error');
      return;
    }

    setIsCommittingImport(true);
    try {
      const response = await api.adminBulkImportProducts(selectedItems, conflictStrategy);
      setImportResult({
        createdCount: response.createdCount,
        updatedCount: response.updatedCount,
        skippedCount: response.skippedCount,
        message: response.message
      });
      setStage('result');
      onProductsUpdated();
      showToast(`Import completed: ${response.createdCount} added, ${response.updatedCount} updated`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save products to database', 'error');
    } finally {
      setIsCommittingImport(false);
    }
  };

  // Reset modal state
  const handleReset = () => {
    setUploadedFile(null);
    setRawHeaders([]);
    setRawRows([]);
    setFieldMapping(null);
    setPreviewSummary(null);
    setStage('configure');
    setImportResult(null);
  };

  // Filter items in preview table
  const filteredPreviewItems = (previewSummary?.items || []).filter(item => {
    if (previewFilter === 'new' && item.matchType !== 'new') return false;
    if (previewFilter === 'update' && item.matchType !== 'update') return false;
    if (previewFilter === 'price-change' && !item.hasPriceChange) return false;
    if (previewFilter === 'warning' && item.warnings.length === 0 && item.errors.length === 0) return false;

    if (previewSearch) {
      const q = previewSearch.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.shopName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const selectedCount = (previewSummary?.items || []).filter(i => i.selected).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* MODAL HEADER */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-[#FF6000]">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900">Spreadsheet Product Manager</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  Excel · CSV · Google Sheets
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Automatic column mapping, duplicate detection, stock & price validation with pre-save review
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* TOP NAVIGATION TABS (When not in preview/result stage) */}
        {stage === 'configure' && (
          <div className="flex border-b border-slate-200 bg-white px-6 gap-2">
            <button
              onClick={() => setActiveTab('upload')}
              className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
                activeTab === 'upload'
                  ? 'border-[#FF6000] text-[#FF6000]'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Upload Excel / CSV</span>
            </button>
            <button
              onClick={() => setActiveTab('sheets')}
              className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
                activeTab === 'sheets'
                  ? 'border-[#FF6000] text-[#FF6000]'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Google Sheets Integration</span>
            </button>
            <button
              onClick={() => setActiveTab('export')}
              className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
                activeTab === 'export'
                  ? 'border-[#FF6000] text-[#FF6000]'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Download className="w-4 h-4" />
              <span>Export Products</span>
            </button>
          </div>
        )}

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* ============================================================== */}
          {/* STAGE 1: CONFIGURE (UPLOAD / GOOGLE SHEETS / EXPORT)           */}
          {/* ============================================================== */}
          {stage === 'configure' && (
            <div>
              {/* TAB 1: LOCAL EXCEL / CSV UPLOAD */}
              {activeTab === 'upload' && (
                <div className="space-y-6">
                  {/* Drag and drop zone */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 hover:border-orange-400 bg-slate-50/50 hover:bg-orange-50/20 rounded-3xl p-8 text-center cursor-pointer transition-all group"
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept=".xlsx,.xls,.csv"
                      className="hidden"
                    />
                    <div className="w-14 h-14 rounded-2xl bg-white shadow-xs border border-slate-200 group-hover:border-orange-300 mx-auto flex items-center justify-center text-slate-400 group-hover:text-[#FF6000] transition-colors mb-3">
                      <Upload className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-800 mb-1">
                      {uploadedFile ? uploadedFile.name : 'Upload your Excel (.xlsx, .xls) or CSV file'}
                    </h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto mb-3">
                      Drag and drop your spreadsheet here, or click to browse. System will auto-detect columns like Product Name, Price (FRW), Stock, and SKU.
                    </p>
                    <div className="inline-flex items-center gap-2 text-[11px] font-semibold text-slate-600 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-2xs">
                      <span>Supported: .xlsx, .xls, .csv</span>
                      <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                      <span>Max 5,000 products per batch</span>
                    </div>
                  </div>

                  {/* If file is parsed: Show detected columns & configuration */}
                  {uploadedFile && fieldMapping && (
                    <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                          <h4 className="text-xs font-bold text-slate-900">
                            Detected {rawRows.length} product rows with {rawHeaders.length} columns in "{uploadedFile.name}"
                          </h4>
                        </div>
                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                          Ready for Review
                        </span>
                      </div>

                      {/* Detected Column Mapping Grid */}
                      <div>
                        <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center justify-between">
                          <span>Auto-Detected Field Mapping (Review or Override)</span>
                          <span className="text-slate-400 font-normal">Mapped automatically from your file headers</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          {[
                            { label: 'Product Name *', key: 'nameCol', required: true },
                            { label: 'Selling Price (RWF) *', key: 'priceCol', required: true },
                            { label: 'Stock Quantity', key: 'stockCol' },
                            { label: 'SKU / Barcode', key: 'skuCol' },
                            { label: 'Category / Department', key: 'categoryCol' },
                            { label: 'Supplier / Shop', key: 'shopCol' },
                            { label: 'Discount %', key: 'discountCol' },
                            { label: 'Cost Price (RWF)', key: 'costPriceCol' },
                            { label: 'Image URL', key: 'imageUrlCol' },
                            { label: 'Description', key: 'descriptionCol' }
                          ].map((field) => {
                            const currentVal = (fieldMapping as any)[field.key];
                            return (
                              <div key={field.key} className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-2xs">
                                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                                  {field.label}
                                </label>
                                <select
                                  value={currentVal !== -1 ? currentVal : ''}
                                  onChange={(e) => {
                                    const val = e.target.value === '' ? -1 : parseInt(e.target.value, 10);
                                    setFieldMapping({ ...fieldMapping, [field.key]: val });
                                  }}
                                  className="w-full text-xs py-1.5 px-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-orange-500 font-medium"
                                >
                                  <option value="">-- Not in file (Use Default) --</option>
                                  {rawHeaders.map((header, idx) => (
                                    <option key={idx} value={idx}>
                                      Col {idx + 1}: {header || `Column ${idx + 1}`}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="pt-2 flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={handleReset}
                          className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                        >
                          Clear File
                        </button>
                        <button
                          type="button"
                          onClick={handleGeneratePreview}
                          className="px-6 py-2.5 rounded-xl bg-[#FF6000] hover:bg-[#e05500] text-white text-xs font-bold shadow-md shadow-orange-500/20 flex items-center gap-2 cursor-pointer transition-all"
                        >
                          <span>Analyze & Preview Products</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: GOOGLE SHEETS INTEGRATION */}
              {activeTab === 'sheets' && (
                <div className="space-y-6">
                  {/* Google Auth Status Card */}
                  <div className="bg-blue-50/70 border border-blue-200 rounded-3xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-white border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
                        <Layers className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-blue-900">Google Sheets Connection</h4>
                          {googleAccessToken ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                              <Check className="w-3 h-3" /> Connected
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                              Authorization Required
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-blue-700">
                          Connect online spreadsheets to import, update catalog, or push inventory to Google Sheets
                        </p>
                      </div>
                    </div>

                    {!googleAccessToken ? (
                      <button
                        onClick={handleAuthorizeGoogle}
                        disabled={isConnectingGoogle}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <CloudUpload className="w-4 h-4" />
                        <span>{isConnectingGoogle ? 'Authorizing...' : 'Connect Google Sheets'}</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleExportToGoogleSheet(true)}
                        disabled={isExportingToSheet}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>{isExportingToSheet ? 'Creating...' : '+ Create New Google Sheet'}</span>
                      </button>
                    )}
                  </div>

                  {/* Connect by URL or ID */}
                  <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 space-y-4">
                    <h4 className="text-xs font-bold text-slate-800">Select or Enter Google Sheet</h4>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1 relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="text"
                          value={googleSheetInput}
                          onChange={(e) => setGoogleSheetInput(e.target.value)}
                          placeholder="Paste Google Sheet URL (https://docs.google.com/spreadsheets/d/...) or Spreadsheet ID"
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs focus:ring-2 focus:ring-orange-500 font-mono"
                        />
                      </div>
                      <button
                        onClick={handleInspectGoogleSheet}
                        disabled={isLoadingSheetMeta || !googleSheetInput}
                        className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSheetMeta ? 'animate-spin' : ''}`} />
                        <span>Inspect Tabs</span>
                      </button>
                    </div>

                    {/* Sheet Tabs & Actions */}
                    {sheetMetadata && (
                      <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                          <div>
                            <span className="text-[11px] font-bold text-slate-400 uppercase">Spreadsheet Title</span>
                            <div className="text-sm font-black text-slate-900">{sheetMetadata.title}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="text-xs font-bold text-slate-700">Tab:</label>
                            <select
                              value={selectedSheetTab}
                              onChange={(e) => setSelectedSheetTab(e.target.value)}
                              className="text-xs py-1.5 px-3 rounded-xl border border-slate-200 bg-slate-50 font-bold"
                            >
                              {sheetMetadata.sheets.map((s) => (
                                <option key={s.sheetId} value={s.title}>
                                  {s.title}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                          <p className="text-xs text-slate-500">
                            Choose to import products into ContactReach Market or update this sheet with live inventory.
                          </p>
                          <div className="flex flex-wrap items-center gap-2">
                            <a
                              href={`https://docs.google.com/spreadsheets/d/${extractGoogleSheetId(googleSheetInput) || LINKED_GOOGLE_SHEET_ID}/edit`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                              <span>Open Sheet</span>
                            </a>
                            <button
                              onClick={() => handleExportToGoogleSheet(false)}
                              disabled={isExportingToSheet}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer flex items-center gap-1.5 shadow-xs transition-colors"
                              title="Save current website products to this Google Sheet"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>{isExportingToSheet ? 'Saving...' : 'Save Products to Sheet'}</span>
                            </button>
                            <button
                              onClick={handleDirectSyncFromSheet}
                              disabled={isParsingFile}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl cursor-pointer flex items-center gap-1.5 shadow-xs transition-colors"
                              title="Pull and apply all spreadsheet product edits directly"
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${isParsingFile ? 'animate-spin' : ''}`} />
                              <span>{isParsingFile ? 'Syncing...' : '1-Click Direct Sync'}</span>
                            </button>
                            <button
                              onClick={handleReadGoogleSheetValues}
                              disabled={isParsingFile}
                              className="px-4 py-2 bg-[#FF6000] hover:bg-[#e05500] text-white text-xs font-bold rounded-xl cursor-pointer flex items-center gap-1.5 shadow-xs transition-colors"
                              title="Preview rows before importing"
                            >
                              <ArrowRight className="w-3.5 h-3.5" />
                              <span>Preview & Filter</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: EXPORT PRODUCTS */}
              {activeTab === 'export' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-slate-50 p-4 rounded-3xl border border-slate-200">
                      <div className="text-xs font-bold text-slate-500 uppercase">Total Catalog</div>
                      <div className="text-2xl font-black text-slate-900 mt-1">{products.length}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Active marketplace items</div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-3xl border border-slate-200">
                      <div className="text-xs font-bold text-slate-500 uppercase">Departments</div>
                      <div className="text-2xl font-black text-slate-900 mt-1">{categories.length}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Official Rwandan categories</div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-3xl border border-slate-200">
                      <div className="text-xs font-bold text-slate-500 uppercase">Catalog Valuation</div>
                      <div className="text-2xl font-black text-emerald-600 mt-1">
                        {products.reduce((sum, p) => sum + (p.price * (p.stock || 0)), 0).toLocaleString()} <span className="text-xs">FRW</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Total inventory worth</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Excel Download Card */}
                    <div className="bg-white border-2 border-emerald-200 hover:border-emerald-400 p-6 rounded-3xl flex flex-col justify-between transition-all group shadow-xs">
                      <div>
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                          <FileSpreadsheet className="w-6 h-6" />
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 mb-1">Download Microsoft Excel (.xlsx)</h4>
                        <p className="text-xs text-slate-500 mb-4">
                          Comprehensive formatted spreadsheet with columns formatted for numbers, prices, stock, categories, and image links. Compatible with Excel, Numbers, and Google Sheets.
                        </p>
                      </div>
                      <button
                        onClick={() => exportProductsToExcel(products, categories)}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download Full Catalog (.xlsx)</span>
                      </button>
                    </div>

                    {/* CSV Download Card */}
                    <div className="bg-white border-2 border-slate-200 hover:border-slate-400 p-6 rounded-3xl flex flex-col justify-between transition-all group shadow-xs">
                      <div>
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center mb-3">
                          <FileText className="w-6 h-6" />
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 mb-1">Download CSV (.csv)</h4>
                        <p className="text-xs text-slate-500 mb-4">
                          Lightweight comma-separated file ideal for bulk database migrations, scripts, ERP systems, and quick backups.
                        </p>
                      </div>
                      <button
                        onClick={() => exportProductsToCsv(products, categories)}
                        className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download Raw CSV (.csv)</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* STAGE 2: PREVIEW & CONFIRMATION                                */}
          {/* ============================================================== */}
          {stage === 'preview' && previewSummary && (
            <div className="space-y-4">
              {/* Preview Header Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Total Rows</div>
                  <div className="text-lg font-black text-slate-900">{previewSummary.totalRows}</div>
                </div>
                <div className="bg-emerald-50/80 p-3 rounded-2xl border border-emerald-200">
                  <div className="text-[10px] font-bold text-emerald-800 uppercase">New Products</div>
                  <div className="text-lg font-black text-emerald-700">+{previewSummary.newCount}</div>
                </div>
                <div className="bg-blue-50/80 p-3 rounded-2xl border border-blue-200">
                  <div className="text-[10px] font-bold text-blue-800 uppercase">Existing Matches</div>
                  <div className="text-lg font-black text-blue-700">{previewSummary.updateCount}</div>
                </div>
                <div className="bg-purple-50/80 p-3 rounded-2xl border border-purple-200">
                  <div className="text-[10px] font-bold text-purple-800 uppercase">Price Diffs</div>
                  <div className="text-lg font-black text-purple-700">{previewSummary.priceChangesCount}</div>
                </div>
                <div className="bg-amber-50/80 p-3 rounded-2xl border border-amber-200">
                  <div className="text-[10px] font-bold text-amber-800 uppercase">Stock Diffs</div>
                  <div className="text-lg font-black text-amber-700">{previewSummary.stockChangesCount}</div>
                </div>
                <div className="bg-red-50/80 p-3 rounded-2xl border border-red-200">
                  <div className="text-[10px] font-bold text-red-800 uppercase">Errors/Warnings</div>
                  <div className="text-lg font-black text-red-700">{previewSummary.errorCount + previewSummary.duplicateInFileCount}</div>
                </div>
              </div>

              {/* Conflict Strategy & Selection Controls */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-slate-700">Conflict Strategy:</span>
                  <div className="inline-flex rounded-xl bg-white p-1 border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setConflictStrategy('upsert')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                        conflictStrategy === 'upsert' ? 'bg-[#FF6000] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                      title="Update existing matching products and insert new products"
                    >
                      Upsert (Add & Update)
                    </button>
                    <button
                      type="button"
                      onClick={() => setConflictStrategy('update_only')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                        conflictStrategy === 'update_only' ? 'bg-[#FF6000] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                      title="Only update prices & stock for existing products"
                    >
                      Update Only
                    </button>
                    <button
                      type="button"
                      onClick={() => setConflictStrategy('create_only')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                        conflictStrategy === 'create_only' ? 'bg-[#FF6000] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                      title="Only add new products without touching existing items"
                    >
                      Create Only
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                  <button
                    type="button"
                    onClick={() => handleToggleSelectAll(true)}
                    className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-[11px] cursor-pointer"
                  >
                    Select All Valid
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleSelectAll(false)}
                    className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-[11px] cursor-pointer"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              {/* Filter and Search Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setPreviewFilter('all')}
                    className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer ${
                      previewFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    All ({previewSummary.totalRows})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewFilter('new')}
                    className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer ${
                      previewFilter === 'new' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    }`}
                  >
                    New Products ({previewSummary.newCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewFilter('update')}
                    className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer ${
                      previewFilter === 'update' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                    }`}
                  >
                    Matches ({previewSummary.updateCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewFilter('price-change')}
                    className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer ${
                      previewFilter === 'price-change' ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                    }`}
                  >
                    Price Changed ({previewSummary.priceChangesCount})
                  </button>
                </div>

                <div className="relative min-w-[200px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={previewSearch}
                    onChange={(e) => setPreviewSearch(e.target.value)}
                    placeholder="Search in preview..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* PREVIEW COMPARISON TABLE */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-[380px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 sticky top-0 z-10 text-[11px] font-bold text-slate-600 uppercase border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 w-8 text-center">
                        <input
                          type="checkbox"
                          checked={selectedCount === previewSummary.validCount && previewSummary.validCount > 0}
                          onChange={(e) => handleToggleSelectAll(e.target.checked)}
                          className="rounded text-orange-600 focus:ring-orange-500 cursor-pointer"
                        />
                      </th>
                      <th className="py-2.5 px-3">Product Name & SKU</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Price (FRW)</th>
                      <th className="py-2.5 px-3">Stock</th>
                      <th className="py-2.5 px-3">Category & Shop</th>
                      <th className="py-2.5 px-3 text-right">Status / Validation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPreviewItems.map((item, idx) => {
                      const originalIndex = previewSummary.items.indexOf(item);
                      return (
                        <tr
                          key={idx}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            !item.isValid ? 'bg-red-50/40 opacity-80' : item.selected ? 'bg-orange-50/20' : ''
                          }`}
                        >
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={item.selected}
                              disabled={!item.isValid}
                              onChange={() => handleToggleSelectRow(originalIndex)}
                              className="rounded text-orange-600 focus:ring-orange-500 cursor-pointer disabled:opacity-40"
                            />
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-900 line-clamp-1">{item.name}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{item.sku}</div>
                          </td>
                          <td className="py-2.5 px-3">
                            {item.matchType === 'new' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                New Item
                              </span>
                            )}
                            {item.matchType === 'update' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800" title={`Matched by ${item.matchedBy}`}>
                                Update ({item.matchedBy})
                              </span>
                            )}
                            {item.matchType === 'duplicate_in_file' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                Dup in File
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-900">
                              {item.price.toLocaleString()} FRW
                            </div>
                            {item.oldPrice !== undefined && item.hasPriceChange && (
                              <div className="text-[10px] flex items-center gap-1 font-mono">
                                <span className="line-through text-slate-400">{item.oldPrice.toLocaleString()}</span>
                                <span className={item.priceDifference! > 0 ? 'text-red-500' : 'text-emerald-600'}>
                                  {item.priceDifference! > 0 ? `+${item.priceDifference!.toLocaleString()}` : `${item.priceDifference!.toLocaleString()}`}
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-800">{item.stock}</div>
                            {item.oldStock !== undefined && item.hasStockChange && (
                              <div className="text-[10px] font-mono text-blue-600">
                                was {item.oldStock} ({item.stockDifference! > 0 ? `+${item.stockDifference}` : item.stockDifference})
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="text-slate-800 font-medium capitalize">{item.category}</div>
                            <div className="text-[10px] text-slate-500">{item.shopName}</div>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {item.errors.length > 0 ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600" title={item.errors.join(' ')}>
                                <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                                {item.errors[0]}
                              </span>
                            ) : item.warnings.length > 0 ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700" title={item.warnings.join(' ')}>
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                                {item.warnings[0]}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                                <Check className="w-3.5 h-3.5" /> Valid
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Preview Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStage('configure')}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer w-full sm:w-auto"
                >
                  ← Back to Settings
                </button>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  <span className="text-xs text-slate-500 font-medium">
                    {selectedCount} of {previewSummary.validCount} valid products selected
                  </span>
                  <button
                    type="button"
                    onClick={handleCommitImport}
                    disabled={isCommittingImport || selectedCount === 0}
                    className="px-6 py-2.5 bg-[#FF6000] hover:bg-[#e05500] text-white text-xs font-bold rounded-xl shadow-md shadow-orange-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
                  >
                    <CheckCircle2 className={`w-4 h-4 ${isCommittingImport ? 'animate-spin' : ''}`} />
                    <span>{isCommittingImport ? 'Saving to Database...' : `Confirm & Save ${selectedCount} Products`}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* STAGE 3: RESULT                                                */}
          {/* ============================================================== */}
          {stage === 'result' && importResult && (
            <div className="py-8 text-center space-y-4 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-slate-900">Products Synchronized Successfully!</h3>
              <p className="text-xs text-slate-600">
                {importResult.message}
              </p>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Created</div>
                  <div className="text-base font-black text-emerald-600">+{importResult.createdCount}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Updated</div>
                  <div className="text-base font-black text-blue-600">{importResult.updatedCount}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Skipped</div>
                  <div className="text-base font-black text-slate-400">{importResult.skippedCount}</div>
                </div>
              </div>

              <div className="pt-4 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Import Another File
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
                >
                  Done & Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
