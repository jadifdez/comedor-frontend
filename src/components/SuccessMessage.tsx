import React, { useEffect } from 'react';
import { CheckCircle, X, AlertCircle } from 'lucide-react';

interface SuccessMessageProps {
  show: boolean;
  onClose: () => void;
  message: string;
  type?: 'success' | 'error';
  displayTitle?: string;
}

export function SuccessMessage({ show, onClose, message, type = 'success', displayTitle }: SuccessMessageProps) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!show) return null;

  const isError = type === 'error';
  const bgColor = isError ? 'bg-red-50' : 'bg-green-50';
  const borderColor = isError ? 'border-red-200' : 'border-green-200';
  const iconColor = isError ? 'text-red-600' : 'text-green-600';
  const titleColor = isError ? 'text-red-800' : 'text-green-800';
  const messageColor = isError ? 'text-red-700' : 'text-green-700';
  const buttonColor = isError ? 'text-red-400 hover:text-red-600' : 'text-green-400 hover:text-green-600';
  const title = displayTitle || (isError ? '¡Error!' : '¡Baja comunicada!');
  const Icon = isError ? AlertCircle : CheckCircle;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <div className={`${bgColor} border ${borderColor} rounded-lg shadow-lg p-4 animate-in slide-in-from-right-full duration-300`}>
        <div className="flex items-start space-x-3">
          <Icon className={`h-5 w-5 ${iconColor} flex-shrink-0 mt-0.5`} />
          <div className="flex-1">
            <p className={`text-sm font-medium ${titleColor}`}>{title}</p>
            <p className={`text-sm ${messageColor} mt-1`}>{message}</p>
          </div>
          <button
            onClick={onClose}
            className={`${buttonColor} transition-colors`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}