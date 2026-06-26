// src/components/expenses/ExpenseCard.tsx
import { motion } from 'framer-motion';
import { Pencil, Trash2 } from 'lucide-react';
import { CATEGORY_META, type Expense } from '../../types/expenses';
import type { Currency } from '../../types';

interface Props {
  expense: Expense;
  currency: Currency;
  onEdit: (e: Expense) => void;
  onDelete: (id: string) => void;
}

function fmt(n: number, currency: Currency) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
  });
}

export default function ExpenseCard({ expense, currency, onEdit, onDelete }: Props) {
  const meta = CATEGORY_META[expense.category];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: -20, scale: 0.95 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      className="glass flex items-center gap-3 rounded-2xl border border-white/60 p-3.5 shadow-sm"
    >
      {/* category icon */}
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ${meta.bg}`}>
        {meta.emoji}
      </div>

      {/* info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-800">
          {expense.description}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className={`text-[10px] font-medium ${meta.color} ${meta.bg} rounded-full px-2 py-0.5`}>
            {meta.label}
          </span>
          <span className="text-[10px] text-slate-400">·</span>
          <span className="text-[10px] text-slate-400">{fmtDate(expense.expenseDate)}</span>
        </div>
        {expense.notes && (
          <p className="mt-0.5 truncate text-[10px] text-slate-400 italic">{expense.notes}</p>
        )}
      </div>

      {/* amount + actions */}
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <span className="text-sm font-bold text-slate-900">{fmt(expense.amount, currency)}</span>
        <div className="flex gap-1">
          <button
            onClick={() => onEdit(expense)}
            className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-50 text-violet-500 transition-colors hover:bg-violet-100"
          >
            <Pencil size={11} />
          </button>
          <button
            onClick={() => onDelete(expense.id)}
            className="flex h-6 w-6 items-center justify-center rounded-lg bg-rose-50 text-rose-400 transition-colors hover:bg-rose-100"
          >
            <Trash2 size={11} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}