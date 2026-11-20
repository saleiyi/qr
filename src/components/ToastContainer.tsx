import React from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { useAppState } from '../context/AppStateContext';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useAppState();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="no-print pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0"
    >
      {toasts.map((toast) => {
        const isError = toast.type === 'error';
        const isSuccess = toast.type === 'success';
        return (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto flex items-start gap-3 rounded-lg border bg-white p-3.5 shadow-lg transition-all duration-150 ${
              isError
                ? 'border-[#F4C7C3]'
                : isSuccess
                  ? 'border-[#CBE4D3]'
                  : 'border-[#DCE4EC]'
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {isError ? (
                <AlertCircle className="h-4 w-4 text-[#B42318]" aria-hidden="true" />
              ) : isSuccess ? (
                <CheckCircle2 className="h-4 w-4 text-[#137333]" aria-hidden="true" />
              ) : (
                <Info className="h-4 w-4 text-[#176B5B]" aria-hidden="true" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[#17324D]">{toast.title}</p>
              {toast.description && (
                <p className="mt-0.5 text-xs text-[#476078]">{toast.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label={`Fechar notificação: ${toast.title}`}
              className="rounded p-1 text-[#526980] hover:bg-[#F4F7FA] hover:text-[#17324D]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
