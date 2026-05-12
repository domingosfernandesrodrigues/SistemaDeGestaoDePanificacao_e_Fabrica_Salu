import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-bg-card rounded-2xl shadow-2xl w-full max-w-2xl my-auto animate-in fade-in zoom-in duration-200 border border-border-subtle">
        <div className="sticky top-0 z-10 px-6 py-4 border-b border-border-subtle flex items-center justify-between bg-bg-card">
          <h3 className="font-bold text-text-main text-lg">{title}</h3>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-text-dim"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
