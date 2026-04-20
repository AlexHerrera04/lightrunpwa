import React, { useEffect, useRef, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'mobileInstallDismissed';

const InstallMobileApp: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const mobileUrl =
    (import.meta as any).env?.VITE_MOBILE_APP_URL ?? 'https://localhost:5173';

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isDismissed = sessionStorage.getItem(DISMISSED_KEY) === 'true';
    if (!isStandalone && !isDismissed) setVisible(true);

    const handler = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e as BeforeInstallPromptEvent;
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY, 'true');
    setVisible(false);
  };

  const handleInstall = () => {
    console.log('Installing mobile app...');
    console.log('Mobile URL:', mobileUrl);
    console.log('Deferred Prompt Available:', deferredPromptRef.current);
    if (deferredPromptRef.current) {
      deferredPromptRef.current.prompt();
    } else {
      window.open(mobileUrl, '_blank', 'noopener,noreferrer');
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-xl border border-gray-700 bg-surface shadow-lg">
      <span className="text-sm text-gray-300 font-medium whitespace-nowrap">
        Install OpenKX Mobile
      </span>
      <button
        onClick={handleInstall}
        className="px-4 py-1.5 rounded-lg bg-primary-600 text-gray-25 text-sm font-semibold hover:bg-primary-700 transition-colors"
      >
        Install
      </button>
      <button
        onClick={handleDismiss}
        aria-label="Dismiss"
        className="text-gray-400 hover:text-gray-300 transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
};

export default InstallMobileApp;
