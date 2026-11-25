'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { CheckCircle2, X, XCircle } from 'lucide-react';
import { cn } from '@/lib/cn';

type ToastTone = 'success' | 'error';
interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
}

const ToastContext = createContext<(tone: ToastTone, message: string) => void>(() => undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const dismiss = useCallback(
    (id: number) => setItems((all) => all.filter((t) => t.id !== id)),
    [],
  );
  const push = useCallback(
    (tone: ToastTone, message: string) => {
      const id = Date.now() + Math.random();
      setItems((all) => [...all.slice(-2), { id, tone, message }]);
      setTimeout(() => dismiss(id), 5000);
    },
    [dismiss],
  );
  const value = useMemo(() => push, [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        role="status"
        className="fixed bottom-4 right-4 z-50 flex w-[calc(100%-32px)] max-w-form flex-col gap-2"
      >
        {items.map((t) => {
          const Icon = t.tone === 'success' ? CheckCircle2 : XCircle;
          return (
            <div
              key={t.id}
              className={cn(
                'flex items-start gap-3 rounded-md border bg-bg p-4 shadow-md',
                t.tone === 'success' ? 'border-success' : 'border-danger',
              )}
            >
              <Icon
                aria-hidden
                size={20}
                className={t.tone === 'success' ? 'text-success' : 'text-danger'}
              />
              <p className="flex-1 text-sm text-text">{t.message}</p>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
                className="rounded-sm text-muted hover:text-text"
              >
                <X aria-hidden size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
