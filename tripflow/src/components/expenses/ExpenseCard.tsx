// src/components/expenses/ExpenseCard.tsx
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MoreVertical, Eye, Pencil, Download, Trash2, ImageIcon } from 'lucide-react';
import { CATEGORY_META, type Expense } from '../../types/expenses';
import type { Currency } from '../../types';
import { fmtCurrency } from '../../lib/exchangeRates';

interface Props {
  expense: Expense;
  currency: Currency;
  onEdit: (e: Expense) => void;
  onDelete: (id: string, photoUrl?: string) => void;
  onDownload: (photoUrl: string, description: string) => void;
  onView: (e: Expense) => void;
}

function fmtDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
  });
}

export default function ExpenseCard({
  expense, currency, onEdit, onDelete, onDownload, onView,
}: Props) {
  const meta = CATEGORY_META[expense.category];
  const [menuOpen, setMenuOpen]       = useState(false);
  const [confirming, setConfirming]   = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const handleDelete = () => {
    setConfirming(false);
    setMenuOpen(false);
    onDelete(expense.id, expense.photoUrl);
  };

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 10, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, x: -20, scale: 0.95 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
        className="glass flex items-center gap-3 rounded-2xl border border-white/60 p-3.5 shadow-sm"
      >
        {/* ── Left: thumbnail or category emoji ── */}
        <button
          onClick={() => expense.photoUrl && onView(expense)}
          className={`relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl ${meta.bg} ${expense.photoUrl ? 'cursor-pointer' : 'cursor-default'}`}
        >
          {expense.photoUrl ? (
            <img
              src={expense.photoUrl}
              alt="receipt"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-lg">{meta.emoji}</span>
          )}
        </button>

        {/* ── Middle: description + meta ── */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-800">{expense.description}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`text-[10px] font-medium ${meta.color} ${meta.bg} rounded-full px-2 py-0.5`}>
              {meta.label}
            </span>
            <span className="text-[10px] text-slate-400">·</span>
            <span className="text-[10px] text-slate-400">{fmtDate(expense.expenseDate)}</span>
            {expense.photoUrl && (
              <>
                <span className="text-[10px] text-slate-400">·</span>
                <ImageIcon size={9} className="text-violet-400" />
              </>
            )}
          </div>
          {expense.notes && (
            <p className="mt-0.5 truncate text-[10px] text-slate-400 italic">{expense.notes}</p>
          )}
        </div>

        {/* ── Right: amount + 3-dot menu ── */}
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span className="text-sm font-bold text-slate-900">{fmtCurrency(expense.amount, currency)}</span>

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => { setMenuOpen(v => !v); setConfirming(false); }}
              className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
            >
              <MoreVertical size={13} />
            </button>

            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.92, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-8 z-50 min-w-[148px] overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl shadow-slate-200/60"
                >
                  {!confirming ? (
                    <div className="py-1.5">
                      {/* View — only shown if photo exists */}
                      {expense.photoUrl && (
                        <MenuButton
                          icon={<Eye size={13} />}
                          label="View photo"
                          onClick={() => { setMenuOpen(false); onView(expense); }}
                          color="text-slate-700"
                        />
                      )}

                      {/* Edit */}
                      <MenuButton
                        icon={<Pencil size={13} />}
                        label="Edit"
                        onClick={() => { setMenuOpen(false); onEdit(expense); }}
                        color="text-slate-700"
                      />

                      {/* Download — only shown if photo exists */}
                      {expense.photoUrl && (
                        <MenuButton
                          icon={<Download size={13} />}
                          label="Download photo"
                          onClick={() => {
                            setMenuOpen(false);
                            onDownload(expense.photoUrl!, expense.description);
                          }}
                          color="text-violet-600"
                        />
                      )}

                      {/* Divider */}
                      <div className="my-1 h-px bg-slate-100 mx-3" />

                      {/* Remove */}
                      <MenuButton
                        icon={<Trash2 size={13} />}
                        label="Remove"
                        onClick={() => setConfirming(true)}
                        color="text-rose-500"
                      />
                    </div>
                  ) : (
                    /* Confirmation state */
                    <div className="p-3.5">
                      <p className="text-[11px] font-semibold text-slate-700 mb-0.5">Remove expense?</p>
                      <p className="text-[10px] text-slate-400 mb-3 leading-relaxed">
                        This can't be undone.
                        {expense.photoUrl ? ' The photo will also be deleted.' : ''}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setConfirming(false)}
                          className="flex-1 rounded-xl border border-slate-200 py-1.5 text-[11px] font-semibold text-slate-500 hover:bg-slate-50 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleDelete}
                          className="flex-1 rounded-xl bg-rose-500 py-1.5 text-[11px] font-bold text-white hover:bg-rose-600 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* ── Full-screen photo viewer ── */}
      <AnimatePresence>
        {/* Rendered via PhotoViewer — triggered by onView in parent */}
      </AnimatePresence>
    </>
  );
}

// ── Small helper ──────────────────────────────────────────────────────────────
function MenuButton({
  icon, label, onClick, color,
}: { icon: React.ReactNode; label: string; onClick: () => void; color: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 px-3.5 py-2 text-[12px] font-medium ${color} hover:bg-slate-50 transition-colors`}
    >
      {icon}
      {label}
    </button>
  );
}