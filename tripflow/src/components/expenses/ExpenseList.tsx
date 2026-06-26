// src/components/expenses/ExpenseList.tsx
import { useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import ExpenseCard from './ExpenseCard';
import CategoryChip from './CategoryChip';
import EmptyExpenses from './EmptyExpenses';
import {
  CATEGORY_META,
  type Expense,
  type ExpenseCategory,
} from '../../types/expenses';
import type { Currency } from '../../types';

const ALL_CATS = Object.keys(CATEGORY_META) as ExpenseCategory[];

interface Props {
  expenses: Expense[];
  currency: Currency;
  onAdd: () => void;
  onEdit: (e: Expense) => void;
  onDelete: (id: string) => void;
}

export default function ExpenseList({
  expenses, currency, onAdd, onEdit, onDelete,
}: Props) {
  const [search, setSearch]           = useState('');
  const [filterCat, setFilterCat]     = useState<ExpenseCategory | null>(null);
  const [showFilter, setShowFilter]   = useState(false);
  const [minAmt, setMinAmt]           = useState('');
  const [maxAmt, setMaxAmt]           = useState('');

  const filtered = useMemo(() => {
    return expenses.filter(e => {
      const q = search.toLowerCase();
      if (q && !e.description.toLowerCase().includes(q) && !e.notes?.toLowerCase().includes(q))
        return false;
      if (filterCat && e.category !== filterCat) return false;
      if (minAmt && e.amount < Number(minAmt)) return false;
      if (maxAmt && e.amount > Number(maxAmt)) return false;
      return true;
    });
  }, [expenses, search, filterCat, minAmt, maxAmt]);

  const hasFilter = !!search || !!filterCat || !!minAmt || !!maxAmt;

  const clearAll = () => {
    setSearch('');
    setFilterCat(null);
    setMinAmt('');
    setMaxAmt('');
  };

  return (
    <div>
      {/* search bar */}
      <div className="mb-3 flex gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search expenses…"
            className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-700 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 placeholder:text-slate-300"
          />
        </div>
        <button
          onClick={() => setShowFilter(v => !v)}
          className={`flex h-10 w-10 items-center justify-center rounded-2xl border transition-colors ${
            showFilter || hasFilter
              ? 'border-violet-300 bg-violet-50 text-violet-600'
              : 'border-slate-200 bg-white text-slate-500'
          }`}
        >
          <SlidersHorizontal size={16} />
        </button>
        {hasFilter && (
          <button
            onClick={clearAll}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-400 transition-colors hover:bg-rose-100"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* filter panel */}
      <AnimatePresence>
        {showFilter && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="mb-3 rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Category
              </p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {ALL_CATS.map(cat => (
                  <CategoryChip
                    key={cat}
                    category={cat}
                    size="sm"
                    selected={filterCat === cat}
                    onClick={() => setFilterCat(prev => prev === cat ? null : cat)}
                  />
                ))}
              </div>

              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Amount Range
              </p>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={minAmt}
                  onChange={e => setMinAmt(e.target.value)}
                  placeholder="Min"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-100"
                />
                <input
                  type="number"
                  value={maxAmt}
                  onChange={e => setMaxAmt(e.target.value)}
                  placeholder="Max"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-100"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* results count */}
      {expenses.length > 0 && (
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-500">
            {filtered.length} expense{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}

      {/* list */}
      {expenses.length === 0 ? (
        <EmptyExpenses onAdd={onAdd} />
      ) : filtered.length === 0 ? (
        <div className="py-10 text-center text-sm text-slate-400">
          No expenses match your filters.
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          <AnimatePresence initial={false}>
            {filtered.map(e => (
              <ExpenseCard
                key={e.id}
                expense={e}
                currency={currency}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}