// src/components/expenses/PhotoViewer.tsx
// Full-screen lightbox for viewing an expense receipt photo.

import { motion, AnimatePresence } from 'framer-motion';
import { X, Download } from 'lucide-react';
import type { Expense } from '../../types/expenses';
import { downloadExpensePhoto } from '../../lib/expenseService';

interface Props {
  expense: Expense | null;
  onClose: () => void;
}

export default function PhotoViewer({ expense, onClose }: Props) {
  const open = !!expense?.photoUrl;

  return (
    <AnimatePresence>
      {open && expense && (
        <>
          {/* Backdrop */}
          <motion.div
            key="pv-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-md"
          />

          {/* Content */}
          <motion.div
            key="pv-content"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="fixed inset-0 z-[61] flex flex-col items-center justify-center p-4 pointer-events-none"
          >
            {/* Header bar */}
            <div className="pointer-events-auto mb-3 flex w-full max-w-lg items-center justify-between">
              <div>
                <p className="text-sm font-bold text-white">{expense.description}</p>
                <p className="text-[11px] text-white/50">Receipt photo</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadExpensePhoto(expense.photoUrl!, expense.description)}
                  className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/15 text-white hover:bg-white/25 transition-colors"
                >
                  <Download size={15} />
                </button>
                <button
                  onClick={onClose}
                  className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/15 text-white hover:bg-white/25 transition-colors"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Image */}
            <motion.img
              key="pv-img"
              src={expense.photoUrl!}
              alt={`Receipt for ${expense.description}`}
              className="pointer-events-auto max-h-[75vh] w-full max-w-lg rounded-2xl object-contain shadow-2xl"
              onClick={e => e.stopPropagation()}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}