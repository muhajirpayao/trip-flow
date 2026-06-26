// src/components/expenses/EmptyExpenses.tsx
import { motion } from 'framer-motion';
import { PlusCircle } from 'lucide-react';

interface Props { onAdd: () => void }

export default function EmptyExpenses({ onAdd }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center gap-4 py-16 text-center"
    >
      {/* illustration */}
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
        className="relative"
      >
        <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-100 to-pink-100 text-5xl shadow-md">
          💸
        </div>
        <div className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-pink-400 to-violet-500 text-sm shadow-md">
          ✨
        </div>
      </motion.div>

      <div>
        <p className="text-base font-bold text-slate-800">No expenses yet ✨</p>
        <p className="mt-1 text-sm text-slate-400">Start tracking your travel spending.</p>
      </div>

      <motion.button
        whileTap={{ scale: 0.96 }}
        onClick={onAdd}
        className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-200 transition-opacity hover:opacity-90"
      >
        <PlusCircle size={16} />
        Add First Expense
      </motion.button>
    </motion.div>
  );
}