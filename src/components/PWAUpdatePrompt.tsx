import { useState, useEffect } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export function PWAUpdatePrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ' + r);
      if (r) {
        setInterval(() => {
          r.update();
        }, 60000); // Check for updates every minute
      }
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);

  useEffect(() => {
    if (needRefresh) {
      setShowUpdatePrompt(true);
    }
  }, [needRefresh]);

  const handleUpdate = () => {
    updateServiceWorker(true);
  };

  const handleDismiss = () => {
    setShowUpdatePrompt(false);
    setNeedRefresh(false);
  };

  if (!showUpdatePrompt) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-50 max-w-md mx-auto animate-slide-down">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-2xl border border-blue-500 overflow-hidden">
        <div className="p-4">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-white mb-1">
                Nueva versión disponible
              </h3>
              <p className="text-sm text-blue-100 mb-4">
                Hay una actualización disponible. Recarga para obtener la última versión.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleUpdate}
                  className="flex-1 bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Actualizar ahora
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-4 py-2 text-white hover:bg-white/10 transition-colors font-medium rounded-lg"
                >
                  Después
                </button>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 p-1 text-white/80 hover:text-white transition-colors"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
