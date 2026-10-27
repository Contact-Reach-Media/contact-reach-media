import React, { useState, useEffect } from 'react';
import {
  X, Database, RefreshCw, Download, Upload, ExternalLink,
  CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck,
  Package, Info, Sparkles, Layers, Check
} from 'lucide-react';
import { api } from '../services/api.ts';
import { Product } from '../types.ts';

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
  const [status, setStatus] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePull = async () => {
    setPulling(true);
    setErrorMsg(null);
    try {
      const res = await api.pullProductsFromFirebase();
      if (!res.success || res.code === 'DATABASE_NOT_CREATED') {
        showToast(res.message, 'error');
        setErrorMsg(`${res.message} ${res.instruction || ''}`);
        if (res.code === 'DATABASE_NOT_CREATED') {
          setStatus((prev: any) => ({ ...prev, databaseExists: false }));
        }
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
    try {
      const res = await api.pushProductsToFirebase();
      if (!res.success || res.code === 'DATABASE_NOT_CREATED') {
        showToast(res.message, 'error');
        setErrorMsg(`${res.message} ${res.instruction || ''}`);
        if (res.code === 'DATABASE_NOT_CREATED') {
          setStatus((prev: any) => ({ ...prev, databaseExists: false }));
        }
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

  const projectId = status?.projectId || 'ceremonial-arbor-62w8r';
  const consoleUrl = `https://console.firebase.google.com/project/${projectId}/firestore`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-amber-500 via-[#FF6000] to-orange-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white border border-white/20">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
                Firebase Firestore Product Sync
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white border border-white/30 uppercase tracking-wider">
                  Live
                </span>
              </h2>
              <p className="text-xs text-orange-100">
                Project: <span className="font-mono font-bold text-white">{projectId}</span>
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
          {/* Status banner */}
          <div className="p-4 rounded-2xl border bg-slate-50 border-slate-200 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Target Firebase Project:</span>
                  <span className="px-2.5 py-0.5 rounded-lg bg-slate-200 text-slate-900 font-mono font-bold text-xs">
                    {projectId}
                  </span>
                </div>
                <div className="text-xs text-slate-600 flex flex-wrap items-center gap-3">
                  <span>Auth Domain: <strong className="font-mono">{status?.authDomain || `${projectId}.firebaseapp.com`}</strong></span>
                  <span>Website Catalog: <strong>{productsCount} products</strong></span>
                </div>
              </div>
              <button
                onClick={fetchStatus}
                disabled={loadingStatus}
                className="px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Re-check database connection"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingStatus ? 'animate-spin text-[#FF6000]' : ''}`} />
                <span>{loadingStatus ? 'Checking...' : 'Check Status'}</span>
              </button>
            </div>

            {/* Connection result notice */}
            {status?.databaseExists ? (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-0.5">
                  <p className="font-bold">Cloud Firestore Database is Active & Ready!</p>
                  <p className="text-emerald-700">
                    Found <strong>{status.productsCountInFirestore} products</strong> in collection <code className="font-mono bg-emerald-100 px-1 rounded">products</code>.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <p className="font-bold">Firestore Database Pending in Firebase Console</p>
                    <p className="text-amber-800 leading-relaxed">
                      Your Firebase project <code className="font-mono bg-amber-100 px-1 py-0.5 rounded font-semibold">{projectId}</code> is verified and connected. If you have not created the Firestore database yet, click the link below to initialize it in 1 click in the Firebase Console:
                    </p>
                  </div>
                </div>
                <div className="pl-6 pt-1 flex items-center gap-2">
                  <a
                    href={consoleUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-2xs transition-colors"
                  >
                    <span>Open Firebase Firestore Console</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <span className="text-[11px] text-amber-700">
                    (Click "Create database" in Native mode)
                  </span>
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="leading-relaxed">{errorMsg}</p>
              </div>
            )}
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
                  Fetches all product records stored in your Firebase collection <code className="font-mono text-slate-700 bg-slate-100 px-1 rounded">products</code>, extracts prices, stock, images, and imports them directly into your website.
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
                    <span>Pull Products from Firebase</span>
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
                  Uploads all <strong>{productsCount} products</strong> from this website into your Firebase database so your Firestore catalog is completely seeded with prices in RWF.
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
                    <span>Push ({productsCount}) Products to Firebase</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick instructions guide */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-2">
            <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-slate-500" />
              How Firebase Synchronization Works
            </h4>
            <ol className="list-decimal list-inside space-y-1.5 pl-1 leading-relaxed text-slate-600">
              <li>
                Your app is configured with your project <strong className="font-mono text-slate-900">{projectId}</strong> in <code className="font-mono bg-slate-200 px-1 rounded">firebase-applet-config.json</code>.
              </li>
              <li>
                Click <strong>"Pull Products from Firebase"</strong> to import any documents added to your Firestore database.
              </li>
              <li>
                Click <strong>"Push Products to Firebase"</strong> anytime you want your online store's catalog synced to Firestore.
              </li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <a
            href={consoleUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-slate-500 hover:text-slate-800 inline-flex items-center gap-1 font-medium"
          >
            <span>Firebase Console</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
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
