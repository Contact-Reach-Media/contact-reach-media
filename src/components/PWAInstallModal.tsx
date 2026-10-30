import React from 'react';
import { Smartphone, Download, Share2, PlusSquare, Check, X, ShieldCheck, Zap } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall.ts';
import { Language } from '../translations.ts';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLang?: Language;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({
  isOpen,
  onClose,
  currentLang = 'en'
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [installing, setInstalling] = React.useState(false);
  const [success, setSuccess] = React.useState(false);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    setInstalling(true);
    try {
      const result = await install();
      if (result) {
        setSuccess(true);
        setTimeout(() => {
          onClose();
        }, 2000);
      }
    } finally {
      setInstalling(false);
    }
  };

  const isKinyarwanda = currentLang === 'rw';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 relative shadow-2xl border border-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand App Icon Header */}
        <div className="flex flex-col items-center text-center space-y-3 pt-1">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-white border-2 border-orange-100 shadow-lg p-1.5 flex items-center justify-center">
              <img
                src="/logo.png"
                alt="ContactReach Market Logo"
                className="w-full h-full object-contain rounded-xl"
              />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1 rounded-full border-2 border-white shadow-xs">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </div>
          </div>

          <div>
            <h3 className="font-black text-xl text-slate-900 tracking-tight">
              {isKinyarwanda
                ? 'Bika ContactReach kuri Home Screen'
                : 'Save ContactReach to Home Screen'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              {isKinyarwanda
                ? 'Yibike kuri telefoni cyangwa mudasobwa yawe kugira ngo ujye uyifungura mu buryo bwihuse budasaba kongera kwandika URL.'
                : 'Install ContactReach Market directly on your device home screen for instant 1-tap access, fast loading, and offline browsing.'}
            </p>
          </div>
        </div>

        {/* Feature Badges */}
        <div className="grid grid-cols-3 gap-2 py-1 text-center">
          <div className="bg-orange-50 border border-orange-100 rounded-2xl p-2.5">
            <Zap className="w-4 h-4 text-[#FF6000] mx-auto mb-1" />
            <div className="text-[11px] font-bold text-slate-800">
              {isKinyarwanda ? 'Yihuta cyane' : 'Instant Open'}
            </div>
            <div className="text-[9px] text-slate-500">
              {isKinyarwanda ? 'Fungura ako kanya' : 'No browser lag'}
            </div>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
            <div className="text-[11px] font-bold text-slate-800">
              {isKinyarwanda ? 'Bika Burundu' : 'Permanent'}
            </div>
            <div className="text-[9px] text-slate-500">
              {isKinyarwanda ? 'Ntizazima' : 'Always stored'}
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-2.5">
            <Smartphone className="w-4 h-4 text-blue-600 mx-auto mb-1" />
            <div className="text-[11px] font-bold text-slate-800">
              {isKinyarwanda ? 'Nka App' : 'App Mode'}
            </div>
            <div className="text-[9px] text-slate-500">
              {isKinyarwanda ? 'Muri Fullscreen' : 'Standalone'}
            </div>
          </div>
        </div>

        {/* Installation Actions */}
        {isInstalled ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center space-y-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto">
              <Check className="w-5 h-5 stroke-[3]" />
            </div>
            <p className="text-xs font-bold text-emerald-900">
              {isKinyarwanda ? 'App yamaze kubikwa kuri Home Screen!' : 'App is already installed on your device!'}
            </p>
            <p className="text-[11px] text-emerald-700">
              {isKinyarwanda
                ? 'Ubu ushobora kuyifungura mu bwisanzure uturutse ku kirahure cya telefoni yawe.'
                : 'You can launch ContactReach Market directly from your device home screen.'}
            </p>
          </div>
        ) : isInstallable ? (
          <div className="space-y-3">
            <button
              onClick={handleInstallClick}
              disabled={installing}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#FF6000] to-orange-500 hover:from-orange-600 hover:to-[#FF6000] text-white font-black text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-orange-500/25 transition-all transform active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-5 h-5 stroke-[2.5]" />
              <span>
                {installing
                  ? (isKinyarwanda ? 'Birimo kubikwa...' : 'Saving to device...')
                  : (isKinyarwanda ? 'KANDA HANO UBIKE KURI HOME SCREEN' : 'ADD TO HOME SCREEN NOW')}
              </span>
            </button>
            <p className="text-[11px] text-center text-slate-400">
              {isKinyarwanda
                ? 'Ntacyo bigusaba kwishyura, nta mbogamizi z\'umwanya igutwara.'
                : '100% Free • Requires less than 2MB of local storage'}
            </p>
          </div>
        ) : isIOS ? (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 text-left">
            <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
              <span>{isKinyarwanda ? 'Amabwiriza ku bakoresha iPhone / iPad:' : 'How to install on iPhone & iPad:'}</span>
            </div>
            <ol className="text-xs text-slate-600 space-y-2 list-decimal list-inside">
              <li className="leading-snug">
                {isKinyarwanda ? (
                  <span>Kanda kuri buto ya <strong className="text-slate-900 font-bold inline-flex items-center gap-1"><Share2 className="w-3.5 h-3.5 text-blue-600 inline" /> Share</strong> hasi muri Safari.</span>
                ) : (
                  <span>Tap the <strong className="text-slate-900 font-bold inline-flex items-center gap-1"><Share2 className="w-3.5 h-3.5 text-blue-600 inline" /> Share</strong> button at the bottom of Safari toolbar.</span>
                )}
              </li>
              <li className="leading-snug">
                {isKinyarwanda ? (
                  <span>Manuka hasi uhitemo <strong className="text-slate-900 font-bold inline-flex items-center gap-1"><PlusSquare className="w-3.5 h-3.5 text-slate-800 inline" /> Add to Home Screen</strong>.</span>
                ) : (
                  <span>Scroll down and select <strong className="text-slate-900 font-bold inline-flex items-center gap-1"><PlusSquare className="w-3.5 h-3.5 text-slate-800 inline" /> Add to Home Screen</strong>.</span>
                )}
              </li>
              <li className="leading-snug">
                {isKinyarwanda ? (
                  <span>Kanda <strong className="text-slate-900 font-bold">Add</strong> hejuru iburyo kugira ngo ihore ibitswe burundu!</span>
                ) : (
                  <span>Tap <strong className="text-slate-900 font-bold">Add</strong> in the top-right corner to permanently save it!</span>
                )}
              </li>
            </ol>
            <div className="pt-2">
              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs transition-colors cursor-pointer"
              >
                {isKinyarwanda ? 'Nabyumvise, Murakoze' : 'Got it, thanks!'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-600 space-y-2">
              <p className="font-bold text-slate-800">
                {isKinyarwanda ? 'Uburyo bwo kuyibika ku buryo bworoshye:' : 'How to save to your home screen:'}
              </p>
              <p>
                {isKinyarwanda
                  ? 'Kanda ku kadomo gatatu (...) hejuru muri browser yawe, uhitemo "Add to Home screen" cyangwa "Install app".'
                  : 'Open your browser menu (⋮ in Chrome/Edge), then select "Install ContactReach Market" or "Add to Home screen".'}
              </p>
            </div>
            <button
              onClick={handleInstallClick}
              className="w-full py-3 px-4 rounded-xl bg-[#FF6000] hover:bg-orange-600 text-white font-bold text-xs transition-colors cursor-pointer"
            >
              {isKinyarwanda ? 'Gerageza Kongera Kubika' : 'Try Direct Install'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
