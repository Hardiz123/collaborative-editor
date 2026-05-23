import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prevToasts) => prevToasts.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType = 'info', duration: number = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prevToasts) => [...prevToasts, { id, message, type, duration }]);

    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, [removeToast]);

  const success = useCallback((message: string, duration?: number) => addToast(message, 'success', duration), [addToast]);
  const error = useCallback((message: string, duration?: number) => addToast(message, 'error', duration), [addToast]);
  const info = useCallback((message: string, duration?: number) => addToast(message, 'info', duration), [addToast]);
  const warning = useCallback((message: string, duration?: number) => addToast(message, 'warning', duration), [addToast]);

  return (
    <ToastContext.Provider value={{ toast: addToast, success, error, info, warning }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-md w-full pointer-events-none p-4">
        <AnimatePresence>
          {toasts.map((t) => {
            let Icon = Info;
            let themeClass = "";

            switch (t.type) {
              case 'success':
                Icon = CheckCircle2;
                themeClass = "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
                break;
              case 'error':
                Icon = AlertCircle;
                themeClass = "border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400";
                break;
              case 'warning':
                Icon = AlertTriangle;
                themeClass = "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400";
                break;
              case 'info':
              default:
                Icon = Info;
                themeClass = "border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400";
                break;
            }

            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.2 } }}
                className={cn(
                  "pointer-events-auto flex items-start gap-3 w-full p-4 rounded-xl border backdrop-blur-md shadow-lg transition-all",
                  themeClass
                )}
              >
                <div className="mt-0.5 shrink-0">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 text-sm font-medium pr-2 break-words">
                  {t.message}
                </div>
                <button
                  onClick={() => removeToast(t.id)}
                  className="shrink-0 rounded-lg p-0.5 opacity-60 hover:opacity-100 transition-opacity hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
