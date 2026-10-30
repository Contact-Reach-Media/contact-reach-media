import React from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall.ts';
import { Language } from '../translations.ts';

interface PWAInstallBannerProps {
  onOpenModal: () => void;
  currentLang?: Language;
}

export const PWAInstallBanner: React.FC<PWAInstallBannerProps> = ({
  onOpenModal,
  currentLang = 'en'
}) => {
  const { isInstalled, isInstallable, install } = usePWAInstall();
  const [dismissed, setDismissed] = React.useState(false);

  // If already running standalone or user dismissed in this session, don't show banner
  if (isInstalled || dismissed) return null;

  const isKinyarwanda = currentLang === 'rw';

  return (
    <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-orange-950 text-white px-3 sm:px-4 py-2 text-xs flex items-center justify-between gap-2 shadow-md border-b border-orange-500/30">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-7 h-7 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-xs">
          <Smartphone className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-[11px] sm:text-xs text-white truncate flex items-center gap-1.5">
            <span>{isKinyarwanda ? 'Shyira ContactReach kuri Home Screen yawe' : 'Install ContactReach Market App'}</span>
            <span className="hidden sm:inline-flex bg-[#FF6000] text-white text-[9px] px-1.5 py-0.2 rounded-full font-black uppercase">
              1-Tap
            </span>
          </p>
          <p className="text-[10px] text-slate-300 truncate hidden xs:block">
            {isKinyarwanda
              ? 'Yibike burundu kuri telefoni cyangwa mudasobwa kugira ngo ijye yihuta'
              : 'Save permanently to your home page for faster access & offline browsing'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={async () => {
            if (isInstallable) {
              const accepted = await install();
              if (accepted) return;
            }
            onOpenModal();
          }}
          className="px-3 py-1 bg-gradient-to-r from-[#FF6000] to-orange-500 hover:from-orange-600 hover:to-[#FF6000] text-white font-bold text-[11px] rounded-lg shadow-sm flex items-center gap-1.5 transition-all transform active:scale-95 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>{isKinyarwanda ? 'Yibike (Save App)' : 'Add to Home'}</span>
        </button>

        <button
          onClick={() => setDismissed(true)}
          className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          title="Dismiss"
          aria-label="Dismiss banner"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
