import React from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
}

export function NotificationModal({ isOpen, onClose, type, title, message }: NotificationModalProps) {
  if (!isOpen) return null;

  const iconMap = {
    success: { Icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
    error: { Icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
    warning: { Icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
    info: { Icon: Info, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' }
  };

  const { Icon, color, bg, border } = iconMap[type];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all">
        <div className={`${bg} ${border} border-b px-6 py-8 relative`}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col items-center text-center">
            <div className={`${color} mb-4`}>
              <Icon className="w-16 h-16" strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">
              {title}
            </h3>
          </div>
        </div>

        {message && (
          <div className="px-6 py-4">
            <p className="text-gray-600 text-center text-sm leading-relaxed">
              {message}
            </p>
          </div>
        )}

        <div className="px-6 py-4 bg-gray-50 flex justify-center">
          <button
            onClick={onClose}
            className={`
              px-8 py-2.5 rounded-lg font-medium text-white
              transition-all duration-200 transform hover:scale-105
              ${type === 'success' ? 'bg-green-600 hover:bg-green-700' :
                type === 'error' ? 'bg-red-600 hover:bg-red-700' :
                type === 'warning' ? 'bg-amber-600 hover:bg-amber-700' :
                'bg-blue-600 hover:bg-blue-700'}
            `}
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
}
