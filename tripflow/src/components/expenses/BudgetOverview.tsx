// src/components/expenses/BudgetOverview.tsx
import { motion } from 'framer-motion';
import type { Currency } from '../../types';

interface Props {
  budget: number;
  spent: number;
  currency: Currency;
}

function fmt(n: number, currency: Currency) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

export default function BudgetOverview({ budget, spent, currency }: Props) {
  const remaining = budget - spent;
  const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const safe = pct < 50;
  const warn = pct >= 50 && pct < 80;

  const barColor = safe
    ? 'from-violet-400 to-purple-500'
    : warn
    ? 'from-amber-400 to-orange-400'
    : 'from-rose-400 to-pink-500';

  const message = safe
    ? "You're doing great! 🌸"
    : warn
    ? 'Budget check — keep an eye on spending ✨'
    : "Careful! You're nearing your limit 🚨";

  return (
    <motion.div
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="relative overflow-hidden rounded-3xl p-5 shadow-lg"
      style={{
        background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #ec4899 100%)',
      }}
    >
      {/* decorative blobs */}
      <div className="pointer-events-none absolute -top-8 -right-8 h-36 w-36 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-6 -left-6 h-28 w-28 rounded-full bg-white/10 blur-2xl" />

      <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/70">
        Trip Budget
      </p>

      {/* three stats */}
      <div className="mb-5 grid grid-cols-3 gap-2">
        {[
          { label: 'Total',     value: fmt(budget,    currency), dim: false },
          { label: 'Spent',     value: fmt(spent,     currency), dim: false },
          { label: 'Remaining', value: fmt(remaining, currency), dim: remaining < 0 },
        ].map(({ label, value, dim }) => (
          <div key={label} className="flex flex-col gap-0.5">
            <span className="text-[10px] font-medium text-white/60">{label}</span>
            <span
              className={`text-base font-bold leading-tight text-white ${
                dim ? 'text-rose-200' : ''
              }`}
            >
              {value}
            </span>
          </div>
        ))}
      </div>

      {/* progress bar */}
      <div className="mb-2 h-2.5 w-full overflow-hidden rounded-full bg-white/20">
        <motion.div
          className={`h-full rounded-full bg-gradient-to-r ${barColor}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: 'easeOut', delay: 0.2 }}
        />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-white/80">{message}</p>
        <span className="text-xs font-bold text-white">{pct.toFixed(0)}%</span>
      </div>
    </motion.div>
  );
}