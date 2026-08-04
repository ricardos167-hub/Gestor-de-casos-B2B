import React, { useEffect } from 'react';
import { CheckCircle2, X } from 'lucide-react';

interface ToastProps {
  message: string;
  onDismiss: () => void;
  durationMs?: number;
}

// Passive, non-blocking success notification. Auto-dismisses; never intercepts
// clicks outside itself, so it never gets in the way of navigation.
export const Toast: React.FC<ToastProps> = ({ message, onDismiss, durationMs = 3000 }) => {
  useEffect(() => {
    const timer = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(timer);
  }, [message, durationMs, onDismiss]);

  return (
    <div className="fixed bottom-5 right-5 z-[100] animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="flex items-center gap-2.5 bg-slate-900 text-white pl-3.5 pr-2.5 py-2.5 rounded-xl shadow-2xl border border-slate-800">
        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
        <span className="text-xs font-medium">{message}</span>
        <button
          onClick={onDismiss}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
