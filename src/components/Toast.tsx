import React, { useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
  onClose: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ id, type, message, duration = 5000, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle size={24} className="text-green-600" />;
      case 'error':
        return <XCircle size={24} className="text-red-600" />;
      case 'warning':
        return <AlertCircle size={24} className="text-yellow-600" />;
      case 'info':
        return <Info size={24} className="text-blue-600" />;
    }
  };

  const getStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-500';
      case 'error':
        return 'bg-red-50 border-red-500';
      case 'warning':
        return 'bg-yellow-50 border-yellow-500';
      case 'info':
        return 'bg-blue-50 border-blue-500';
    }
  };

  return (
    <div
      className={`${getStyles()} border-l-4 rounded-lg shadow-xl p-4 flex items-start space-x-3 min-w-[300px] max-w-md animate-slide-in`}
      role="alert"
    >
      <div className="flex-shrink-0">{getIcon()}</div>
      <p className="text-gray-900 flex-1 font-medium">{message}</p>
      <button
        onClick={() => onClose(id)}
        className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="Close notification"
      >
        <X size={20} />
      </button>
    </div>
  );
};

export default Toast;
