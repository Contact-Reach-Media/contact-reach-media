import { useEffect, useState, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStoragePersistent, setIsStoragePersistent] = useState(false);

  useEffect(() => {
    // 1. Detect if running in standalone mode (already added to home screen)
    if (typeof window !== 'undefined') {
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://');
      setIsInstalled(isStandalone);

      // 2. Detect iOS devices
      const ua = window.navigator.userAgent.toLowerCase();
      const isIOSDevice = /iphone|ipad|ipod/.test(ua) && !(window as any).MSStream;
      setIsIOS(isIOSDevice);

      // 3. Request persistent storage so data & home page never get evicted
      if (navigator.storage && navigator.storage.persist) {
        navigator.storage.persist().then((persistent) => {
          setIsStoragePersistent(persistent);
        }).catch(() => {});
      }

      // 4. Register service worker for offline & PWA installability
      if ('serviceWorker' in navigator && process.env.NODE_ENV !== 'test') {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => {
            reg.update().catch(() => {});
          })
          .catch((err) => {
            console.warn('[PWA] Service worker registration warning:', err);
          });
      }

      // 5. Listen for beforeinstallprompt event
      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e as BeforeInstallPromptEvent);
      };

      const handleAppInstalled = () => {
        setIsInstalled(true);
        setDeferredPrompt(null);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.addEventListener('appinstalled', handleAppInstalled);

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.removeEventListener('appinstalled', handleAppInstalled);
      };
    }
  }, []);

  const install = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) {
      return false;
    }
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
        return true;
      }
    } catch (err) {
      console.warn('[PWA] Install prompt error:', err);
    }
    return false;
  }, [deferredPrompt]);

  return {
    isInstallable: Boolean(deferredPrompt),
    isInstalled,
    isIOS,
    isStoragePersistent,
    install,
    hasPrompt: Boolean(deferredPrompt)
  };
}
