import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message?: string;
}

interface ToastContextType {
  showToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((type: 'success' | 'error' | 'info', title: string, message?: string) => {
    const id = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newToast: ToastMessage = { id, type, title, message };
    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-lg border shadow-lg bg-white ${
              toast.type === 'success'
                ? 'border-emerald-200 text-emerald-900'
                : toast.type === 'error'
                ? 'border-rose-200 text-rose-900'
                : 'border-orange-200 text-neutral-900'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {toast.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : toast.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-rose-600" />
              ) : (
                <Info className="w-4 h-4 text-orange-600" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold">{toast.title}</p>
              {toast.message && <p className="text-xs text-neutral-600 mt-0.5">{toast.message}</p>}
            </div>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="text-neutral-400 hover:text-neutral-600 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}
