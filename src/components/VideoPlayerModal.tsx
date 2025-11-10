import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface VideoPlayerModalProps {
  videoUrl: string;
  titulo: string;
  onClose: () => void;
}

export function VideoPlayerModal({ videoUrl, titulo, onClose }: VideoPlayerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 p-4 animate-fadeIn"
      onClick={handleBackdropClick}
    >
      <div className="relative w-full max-w-md bg-gray-900 rounded-lg shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
          <h3 className="text-base font-semibold text-white truncate pr-4">{titulo}</h3>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            aria-label="Cerrar"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="relative bg-black" style={{ aspectRatio: '9/16' }}>
          <video
            ref={videoRef}
            className="w-full h-full object-contain"
            controls
            autoPlay
            preload="metadata"
          >
            <source src={videoUrl} type="video/mp4" />
            Tu navegador no soporta la reproducción de videos.
          </video>
        </div>

        <div className="px-4 py-3 bg-gray-800 text-xs text-gray-400">
          <p>Presiona ESC o haz clic fuera del video para cerrar</p>
        </div>
      </div>
    </div>
  );
}
