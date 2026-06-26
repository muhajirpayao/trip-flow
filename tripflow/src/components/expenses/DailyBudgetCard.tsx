// src/components/expenses/DailyBudgetCard.tsx
import { motion } from 'framer-motion';
import { CalendarDays } from 'lucide-react';
import type { Currency } from '../../types';
import type { Expense } from '../../types/expenses';

interface Props {
  budget: number;
  currency: Currency;
  startDate: string;
  endDate: string;
  expenses: Expense[];
}

function fmt(n: number, currency: Currency) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

function tripDays(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  const diff = Math.ceil((e.getTime() - s.getTime()) / 86_400_000);
  return Math.max(diff, 1);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function DailyBudgetCard({
  budget, currency, startDate, endDate, expenses,
}: Props) {
  const days = tripDays(startDate, endDate);
  const dailyBudget = budget / days;

  const today = todayStr();
  const todaySpent = expenses
    .filter(e => e.expenseDate === today)
    .reduce((s, e) => s + e.amount, 0);

  const pct = dailyBudget > 0
    ? Math.min((todaySpent / dailyBudget) * 100, 100)
    : 0;

  const under = todaySpent <= dailyBudget;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.1 }}
      className="glass rounded-2xl border border-violet-100 p-4 shadow-sm"
    >
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-100">
          <CalendarDays size={16} className="text-violet-600" />
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-700">Daily Budget</p>
          <p className="text-[10px] text-slate-400">{days} day trip</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-sm font-bold text-violet-700">{fmt(dailyBudget, currency)}/day</p>
        </div>
      </div>

      {/* today's progress */}
      <div className="mb-1.5 flex items-center justify-between text-xs text-slate-500">
        <span>Today</span>
        <span>
          {fmt(todaySpent, currency)} / {fmt(dailyBudget, currency)}
        </span>
      </div>
      <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <motion.div
          className={`h-full rounded-full ${
            under
              ? 'bg-gradient-to-r from-violet-400 to-purple-400'
              : 'bg-gradient-to-r from-rose-400 to-pink-400'
          }`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: 'easeOut', delay: 0.3 }}
        />
      </div>
      <p className={`text-xs font-medium ${under ? 'text-violet-600' : 'text-rose-500'}`}>
        {under ? "You're under budget today 🎉" : "Over today's budget ⚠️"}
      </p>
    </motion.div>
  );
}