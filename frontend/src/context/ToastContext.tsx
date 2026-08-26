import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import {
  IconAlertTriangle,
  IconCheck,
  IconClose,
  IconInfo,
} from '../components/Icons';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// Toast Container Component
function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  if (toasts.length === 0) return null;

  const STYLES: Record<ToastType, { accent: string; chip: string; ring: string }> = {
    success: {
      accent: 'bg-emerald-500',
      chip: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
      ring: 'ring-emerald-100',
    },
    error: {
      accent: 'bg-rose-500',
      chip: 'bg-rose-50 text-rose-600 ring-rose-100',
      ring: 'ring-rose-100',
    },
    warning: {
      accent: 'bg-amber-500',
      chip: 'bg-amber-50 text-amber-600 ring-amber-100',
      ring: 'ring-amber-100',
    },
    info: {
      accent: 'bg-brand-500',
      chip: 'bg-brand-50 text-brand-600 ring-brand-100',
      ring: 'ring-brand-100',
    },
  };

  const getIcon = (type: ToastType) => {
    const common = { className: 'h-[18px] w-[18px]' };
    switch (type) {
      case 'success':
        return <IconCheck {...common} />;
      case 'error':
        return <IconClose {...common} />;
      case 'warning':
        return <IconAlertTriangle {...common} />;
      case 'info':
      default:
        return <IconInfo {...common} />;
    }
  };

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2.5">
      {toasts.map((toast) => {
        const s = STYLES[toast.type];
        return (
          <div
            key={toast.id}
            role="status"
            className={`animate-slide-in pointer-events-auto relative overflow-hidden rounded-2xl border border-white/60 bg-white/90 shadow-lifted ring-1 backdrop-blur-xl ${s.ring}`}
          >
            <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1 ${s.accent}`} />
            <div className="flex items-start gap-3 py-3.5 pl-5 pr-3">
              <span
                className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1 ${s.chip}`}
              >
                {getIcon(toast.type)}
              </span>
              <span className="flex-1 pt-0.5 text-sm font-medium leading-snug text-ink-800">
                {toast.message}
              </span>
              <button
                onClick={() => onRemove(toast.id)}
                className="btn-icon h-7 w-7 shrink-0"
                aria-label="Bildirimi kapat"
              >
                <IconClose className="h-4 w-4" />
              </button>
            </div>
            {/* Otomatik kapanma göstergesi (4sn) */}
            <span
              aria-hidden="true"
              className={`absolute bottom-0 left-0 h-0.5 w-full origin-left animate-progress-bar ${s.accent} opacity-40`}
            />
          </div>
        );
      })}
    </div>
  );
}
