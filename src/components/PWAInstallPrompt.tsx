import { useState, useEffect } from 'react';
import { Download, X, Share } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches ||
                               (window.navigator as any).standalone === true;

    setIsIOS(isIOSDevice);
    setIsStandalone(isInStandaloneMode);

    const hasSeenPrompt = localStorage.getItem('pwa-install-prompt-dismissed');
    if (hasSeenPrompt || isInStandaloneMode) {
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    if (isIOSDevice && !isInStandaloneMode && !hasSeenPrompt) {
      setTimeout(() => setShowPrompt(true), 3000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
    setShowPrompt(false);
    localStorage.setItem('pwa-install-prompt-dismissed', 'true');
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-prompt-dismissed', 'true');
  };

  if (!showPrompt || isStandalone) return null;

  if (isIOS) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-2xl">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <img
                  src="/apple-touch-icon.png"
                  alt="Los Pinos"
                  className="w-12 h-12 rounded-lg shadow-sm"
                />
                <div>
                  <h3 className="font-semibold text-gray-900">Instalar Los Pinos</h3>
                  <p className="text-sm text-gray-600">Acceso rápido desde tu pantalla de inicio</p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
                <p className="text-sm text-gray-700 font-medium">Cómo instalar en iOS:</p>
                <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                  <li className="flex items-center gap-2">
                    Toca el botón de compartir
                    <Share className="w-4 h-4 text-blue-600" />
                  </li>
                  <li>Selecciona "Añadir a pantalla de inicio"</li>
                  <li>Toca "Añadir" en la esquina superior derecha</li>
                </ol>
              </div>
            </div>

            <button
              onClick={handleDismiss}
              className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto">
      <div className="bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden">
        <div className="p-4">
          <div className="flex items-start gap-4">
            <img
              src="/pwa-192x192.png"
              alt="Los Pinos"
              className="w-12 h-12 rounded-lg shadow-sm flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 mb-1">
                Instalar Los Pinos
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Instala la app para acceso rápido y una mejor experiencia
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleInstallClick}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Instalar
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors font-medium"
                >
                  Ahora no
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
