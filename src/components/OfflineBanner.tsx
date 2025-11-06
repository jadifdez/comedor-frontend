import { WifiOff } from 'lucide-react';

interface OfflineBannerProps {
  isVisible: boolean;
}

export function OfflineBanner({ isVisible }: OfflineBannerProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white px-4 py-3 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-3">
        <WifiOff className="w-5 h-5 flex-shrink-0" />
        <p className="text-sm font-medium">
          Sin conexión a internet. Esta aplicación requiere conexión para funcionar.
        </p>
      </div>
    </div>
  );
}
