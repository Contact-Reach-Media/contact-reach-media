import React, { useState, useEffect } from 'react';
import {
  X, Database, RefreshCw, Download, Upload, ExternalLink,
  CheckCircle2, AlertTriangle, ShieldCheck, Activity,
  Layers, Check, BarChart3, Globe, Sparkles
} from 'lucide-react';
import { api } from '../services/api.ts';

interface FirebaseSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  productsCount: number;
  onProductsUpdated: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export const FirebaseSyncModal: React.FC<FirebaseSyncModalProps> = ({
  isOpen,
  onClose,
  productsCount,
  onProductsUpdated,
  showToast
}) => {
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [pushingAll, setPushingAll] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<'both' | 'db1' | 'db2'>('both');
  const [status, setStatus] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastActionResult, setLastActionResult] = useState<any>(null);

  const fetchStatus = async () => {
    setLoadingStatus(true);
    setErrorMsg(null);
    try {
      const res = await api.getFirebaseStatus();
      setStatus(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to check Firebase status');
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
      setLastActionResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePushAll = async () => {
    setPushingAll(true);
    setErrorMsg(null);
    setLastActionResult(null);
    try {
      const res = await api.adminPushAllDataToFirebase();
      setLastActionResult(res);
      showToast(res.message);
      onProductsUpdated();
      fetchStatus();
    } catch (err: any) {
      const msg = err.message || 'Failed to push all data to Firebase';
      setErrorMsg(msg);
      showToast(msg, 'error');
    } finally {
      setPushingAll(false);
    }
  };

  const handlePull = async () => {
    setPulling(true);
    setErrorMsg(null);
    setLastActionResult(null);
    try {
      const res = await api.pullProductsFromFirebase(selectedTarget);
      setLastActionResult(res);
      if (!res.success && res.code === 'DATABASE_NOT_CREATED') {
        showToast(res.message, 'error');
        setErrorMsg(`${res.message} ${res.instruction || ''}`);
      } else {
        showToast(res.message);
        onProductsUpdated();
        fetchStatus();
      }
    } catch (err: any) {
      const msg = err.message || 'Failed to pull products from Firebase';
      setErrorMsg(msg);
      showToast(msg, 'error');
    } finally {
      setPulling(false);
    }
  };

  const handlePush = async () => {
    setPushing(true);
    setErrorMsg(null);
    setLastActionResult(null);
    try {
      const res = await api.pushProductsToFirebase(selectedTarget);
      setLastActionResult(res);
      if (!res.success && res.code === 'DATABASE_NOT_CREATED') {
        showToast(res.message, 'error');
        setErrorMsg(`${res.message} ${res.instruction || ''}`);
      } else {
        showToast(res.message);
        fetchStatus();
      }
    } catch (err: any) {
      const msg = err.message || 'Failed to push products to Firebase';
      setErrorMsg(msg);
      showToast(msg, 'error');
    } finally {
      setPushing(false);
    }
  };

  const db1 = status?.databases?.[0] || {
    id: 'db1',
    name: 'Database 1 (ceremonial-arbor-62w8r)',
    projectId: 'ceremonial-arbor-62w8r',
    authDomain: 'ceremonial-arbor-62w8r.firebaseapp.com',
    consoleUrl: 'https://console.firebase.google.com/project/ceremonial-arbor-62w8r/firestore',
    databaseExists: false,
    productsCountInFirestore: 0
  };

  const db2 = status?.databases?.[1] || {
    id: 'db2',
    name: 'Database 2 (contactreachmarket)',
    projectId: 'contactreachmarket',
    authDomain: 'contactreachmarket.firebaseapp.com',
    measurementId: 'G-B4XV4ZWX1D',
    consoleUrl: 'https://console.firebase.google.com/project/contactreachmarket/firestore',
    databaseExists: false,
    productsCountInFirestore: 0
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-amber-500 via-[#FF6000] to-orange-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white border border-white/20 shadow-inner">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight">
                  Dual Firebase Cloud Sync
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white border border-white/30 uppercase tracking-wider">
                  Simultaneous
                </span>
              </div>
              <p className="text-xs text-orange-100 mt-0.5">
                Connected to <span className="font-mono font-bold text-white">ceremonial-arbor-62w8r</span> and <span className="font-mono font-bold text-white">contactreachmarket</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Dual Database Status Grid */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[#FF6000]" />
                Connected Cloud Databases
              </span>
              <button
                onClick={fetchStatus}
                disabled={loadingStatus}
                className="px-3 py-1 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
                title="Re-check database connection"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingStatus ? 'animate-spin text-[#FF6000]' : ''}`} />
                <span>{loadingStatus ? 'Checking...' : 'Check Status'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* DB 1 Card */}
              <div className="p-4 rounded-2xl border-2 border-slate-200 bg-slate-50/70 hover:border-amber-300 transition-all space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-bold text-[10px] uppercase">
                        Database 1
                      </span>
                      {db1.databaseExists ? (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Active
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                          Setup Ready
                        </span>
                      )}
                    </div>
                    <h3 className="font-mono font-bold text-slate-900 text-sm">
                      {db1.projectId}
                    </h3>
                  </div>
                  <a
                    href={db1.consoleUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                    title="Open in Firebase Console"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>

                <div className="text-[11px] text-slate-500 space-y-1">
                  <div>Auth: <span className="font-mono text-slate-700">{db1.authDomain}</span></div>
                  <div>Status: <span className="text-slate-700">{db1.message || 'Configured & connected'}</span></div>
                </div>

                <a
                  href={db1.consoleUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-1.5 px-3 rounded-lg bg-white border border-slate-300 hover:border-slate-400 text-slate-700 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>Firebase Console (DB 1)</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              </div>

              {/* DB 2 Card */}
              <div className="p-4 rounded-2xl border-2 border-slate-200 bg-slate-50/70 hover:border-blue-300 transition-all space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-900 font-bold text-[10px] uppercase">
                        Database 2
                      </span>
                      {db2.databaseExists ? (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Active
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-md">
                          Setup Ready
                        </span>
                      )}
                    </div>
                    <h3 className="font-mono font-bold text-slate-900 text-sm">
                      {db2.projectId}
                    </h3>
                  </div>
                  <a
                    href={db2.consoleUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                    title="Open in Firebase Console"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>

                <div className="text-[11px] text-slate-500 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <BarChart3 className="w-3 h-3 text-blue-600" />
                    <span>Analytics: <strong className="font-mono text-blue-700">G-B4XV4ZWX1D</strong></span>
                  </div>
                  <div>Status: <span className="text-slate-700">{db2.message || 'Configured & connected'}</span></div>
                </div>

                <a
                  href={db2.consoleUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-1.5 px-3 rounded-lg bg-white border border-slate-300 hover:border-slate-400 text-slate-700 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>Firebase Console (DB 2)</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              </div>
            </div>
          </div>

          {/* Sync Target Selector */}
          <div className="p-3.5 rounded-2xl bg-slate-100 border border-slate-200 space-y-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Synchronization Target:
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSelectedTarget('both')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  selectedTarget === 'both'
                    ? 'bg-[#FF6000] text-white shadow-xs'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Both Databases</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedTarget('db1')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer truncate ${
                  selectedTarget === 'db1'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
                }`}
              >
                <span>ceremonial-arbor</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedTarget('db2')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer truncate ${
                  selectedTarget === 'db2'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
                }`}
              >
                <span>contactreachmarket</span>
              </button>
            </div>
          </div>

          {/* Operation Status / Notices */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">Notice</p>
                <p className="leading-relaxed text-amber-800">{errorMsg}</p>
              </div>
            </div>
          )}

          {lastActionResult && lastActionResult.resultsByDb && (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <p className="font-bold text-slate-800 flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-600" />
                Latest Operation Results:
              </p>
              <div className="space-y-1 pl-1">
                {lastActionResult.resultsByDb.map((res: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between text-[11px] text-slate-600 border-b border-slate-200 pb-1 last:border-0 last:pb-0">
                    <span className="font-mono font-semibold text-slate-800">{res.projectId}:</span>
                    <span>{res.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Featured: Push ALL Marketplace Data to Firebase Firestore */}
          <div className="p-5 rounded-2xl border-2 border-orange-500 bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100 shadow-sm space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-600 text-white flex items-center justify-center font-black shadow-sm">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                    Import & Sync ALL Data to Firebase Firestore
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-orange-600 text-white uppercase">
                      11 Collections
                    </span>
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Syncs <strong>all 1,363 Products</strong>, <strong>all 616 Orders</strong>, <strong>11 Categories</strong>, <strong>8 Shops</strong>, <strong>Customers</strong>, <strong>Messages</strong>, and <strong>Settings</strong> to Firebase Firestore. Fully editable and deleteable with real-time rules!
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handlePushAll}
              disabled={pushingAll || pulling || pushing}
              className="w-full py-3 px-4 bg-gradient-to-r from-orange-600 via-amber-600 to-[#FF6000] hover:from-orange-700 hover:to-amber-700 text-white text-xs font-black rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
            >
              {pushingAll ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Importing ALL Data to Firebase Firestore...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>🔥 Import & Sync ALL 11 Collections to Firebase Now</span>
                </>
              )}
            </button>
          </div>

          {/* Action cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Pull Action Card */}
            <div className="p-5 rounded-2xl border-2 border-slate-200 hover:border-[#FF6000]/60 bg-white transition-all space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="w-9 h-9 rounded-xl bg-orange-100 text-[#FF6000] flex items-center justify-center font-bold">
                  <Download className="w-5 h-5" />
                </div>
                <h3 className="font-black text-slate-900 text-sm">Pull Products from Firebase</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Fetches product records stored in collection <code className="font-mono text-slate-700 bg-slate-100 px-1 rounded">products</code> from {selectedTarget === 'both' ? 'both cloud databases simultaneously' : selectedTarget === 'db1' ? 'ceremonial-arbor-62w8r' : 'contactreachmarket'} and merges them without duplicate IDs.
                </p>
              </div>
              <button
                onClick={handlePull}
                disabled={pulling || pushing}
                className="w-full py-2.5 px-4 bg-[#FF6000] hover:bg-[#e05500] text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
              >
                {pulling ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Pulling Products...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Pull from {selectedTarget === 'both' ? 'Both Databases' : selectedTarget}</span>
                  </>
                )}
              </button>
            </div>

            {/* Push Action Card */}
            <div className="p-5 rounded-2xl border-2 border-slate-200 hover:border-blue-500/60 bg-white transition-all space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                  <Upload className="w-5 h-5" />
                </div>
                <h3 className="font-black text-slate-900 text-sm">Push Products to Firebase</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Pushes all <strong>{productsCount} products</strong> with RWF prices and images to {selectedTarget === 'both' ? 'both cloud databases simultaneously' : selectedTarget === 'db1' ? 'ceremonial-arbor-62w8r' : 'contactreachmarket'}.
                </p>
              </div>
              <button
                onClick={handlePush}
                disabled={pulling || pushing}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
              >
                {pushing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Pushing to Firestore...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Push ({productsCount}) Products</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a
              href={db1.consoleUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-slate-500 hover:text-slate-800 inline-flex items-center gap-1 font-medium"
            >
              <span>Console 1</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <span className="text-slate-300">|</span>
            <a
              href={db2.consoleUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-slate-500 hover:text-slate-800 inline-flex items-center gap-1 font-medium"
            >
              <span>Console 2</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
