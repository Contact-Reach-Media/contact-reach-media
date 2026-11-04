import React, { useState, useEffect } from 'react';
import {
  Smartphone, Download, ShieldCheck, CheckCircle2, ArrowLeft,
  Zap, Bell, ShoppingBag, Globe, Share2
} from 'lucide-react';
import { Language, translations } from '../translations.ts';

interface AppDownloadPageProps {
  onNavigate: (view: string) => void;
  currentLang: Language;
}

export const AppDownloadPage: React.FC<AppDownloadPageProps> = ({
  onNavigate,
  currentLang
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
        setInstallSuccess(true);
      }
      setDeferredPrompt(null);
    } else {
      alert('To install ContactReach Market on your phone: Tap your browser menu (3 dots or share icon) and select "Add to Home screen".');
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen py-8 sm:py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

        {/* Back Button */}
        <div>
          <button
            onClick={() => onNavigate('home')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:text-orange-600 transition-colors cursor-pointer shadow-2xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Storefront</span>
          </button>
        </div>

        {/* Hero Card */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-10 shadow-xs flex flex-col md:flex-row items-center gap-8">
          <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-3xl bg-gradient-to-br from-orange-500 to-amber-500 p-3 shadow-lg flex items-center justify-center shrink-0">
            <img
              src="/logo.png"
              alt="ContactReach Market App"
              className="w-full h-full object-contain filter drop-shadow-md"
            />
          </div>

          <div className="flex-1 space-y-3 text-center md:text-left">
            <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-orange-100 text-orange-800">
              Official Progressive Web App
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              ContactReach Market App
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-xl">
              Install ContactReach Market directly onto your home screen for lightning-fast shopping, instant order delivery tracking notifications, and low data usage.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={handleInstallClick}
                className="w-full sm:w-auto px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-black text-xs sm:text-sm rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>{isInstalled ? 'App Already Installed' : 'Install App to Home Screen'}</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('shop')}
                className="w-full sm:w-auto px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs sm:text-sm rounded-2xl transition-colors cursor-pointer"
              >
                Open in Web Browser
              </button>
            </div>
          </div>
        </div>

        {/* App Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-sm text-slate-900">Instant Loading</h3>
            <p className="text-xs text-slate-500">
              Loads in under 1 second and saves cached catalog items so you can browse smoothly even with weak connectivity.
            </p>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-sm text-slate-900">Delivery Tracking</h3>
            <p className="text-xs text-slate-500">
              Get real-time updates as your shipment moves from warehouse dispatch to courier delivery at your doorstep.
            </p>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-sm text-slate-900">100% Secure & Small</h3>
            <p className="text-xs text-slate-500">
              Takes less than 3 MB of phone storage. No heavy app store downloads or APK files required.
            </p>
          </div>
        </div>

        {/* Step-by-Step Instructions */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-4">
          <h2 className="text-base font-black text-slate-900 border-b border-slate-100 pb-3">
            Installation Steps by Device
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-600">
            <div className="space-y-2">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-orange-600" />
                <span>Android (Chrome / Samsung Internet)</span>
              </h3>
              <ol className="list-decimal list-inside space-y-1 pl-1">
                <li>Tap the button above or tap the 3 dots (⋮) in the top right corner.</li>
                <li>Select <strong>Add to Home screen</strong> or <strong>Install app</strong>.</li>
                <li>Tap <strong>Install</strong> to confirm. The ContactReach Market icon will appear on your phone.</li>
              </ol>
            </div>

            <div className="space-y-2">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-blue-600" />
                <span>iPhone / iPad (Safari)</span>
              </h3>
              <ol className="list-decimal list-inside space-y-1 pl-1">
                <li>Open this website in Safari.</li>
                <li>Tap the <strong>Share</strong> button (square with arrow pointing up) at the bottom.</li>
                <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
                <li>Tap <strong>Add</strong> in the top right corner.</li>
              </ol>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
