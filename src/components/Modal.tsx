import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** Width class, defaults to max-w-md */
  width?: string;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  width = 'max-w-md',
}: ModalProps) {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key="panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'modal-title' : undefined}
            className={`fixed inset-0 z-50 flex items-center justify-center p-4`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
          >
            <div
              className={`relative w-full ${width} rounded-2xl bg-gray-900 p-6 shadow-2xl ring-1 ring-white/10`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              {title && (
                <div className="mb-4 flex items-center justify-between">
                  <h2
                    id="modal-title"
                    className="text-lg font-semibold text-gray-100"
                  >
                    {title}
                  </h2>
                  <button
                    onClick={onClose}
                    className="rounded-lg p-1 text-gray-400 hover:bg-gray-800 hover:text-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    aria-label="Close modal"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              )}

              {/* Close button (no title case) */}
              {!title && (
                <button
                  onClick={onClose}
                  className="absolute right-4 top-4 rounded-lg p-1 text-gray-400 hover:bg-gray-800 hover:text-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  aria-label="Close modal"
                >
                  <X className="h-5 w-5" />
                </button>
              )}

              {/* Body */}
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
