// src/pages/Expenses.tsx
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, BarChart2, List } from 'lucide-react';
import { useTrip } from '../context/TripContext';
import {
  BudgetOverview,
  DailyBudgetCard,
  ExpenseList,
  ExpenseModal,
  ExpenseAnalytics,
} from '../components/expenses';
import {
  fetchExpenses,
  addExpense,
  updateExpense,
  deleteExpense,
} from '../lib/expenseService';
import type { Expense, ExpenseFormData } from '../types/expenses';

type Tab = 'list' | 'analytics';

export default function Expenses() {
  const { trip } = useTrip();

  const [expenses, setExpenses]   = useState<Expense[]>([]);
  const [loading, setLoading]     = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]     = useState<Expense | null>(null);
  const [tab, setTab]             = useState<Tab>('list');

  const load = useCallback(async () => {
    if (!trip) return;
    setLoading(true);
    const data = await fetchExpenses(trip.id);
    setExpenses(data);
    setLoading(false);
  }, [trip]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (form: ExpenseFormData) => {
    if (!trip) return;
    if (editing) {
      const optimistic = { ...editing, ...form, amount: Number(form.amount) };
      setExpenses(prev => prev.map(e => (e.id === editing.id ? optimistic : e)));
      const updated = await updateExpense(editing.id, form);
      if (updated) setExpenses(prev => prev.map(e => (e.id === updated.id ? updated : e)));
      setEditing(null);
    } else {
      const tempId = `temp-${Date.now()}`;
      const optimistic: Expense = {
        id: tempId, tripId: trip.id,
        amount: Number(form.amount), category: form.category,
        description: form.description, notes: form.notes,
        expenseDate: form.expenseDate, createdAt: new Date().toISOString(),
      };
      setExpenses(prev => [optimistic, ...prev]);
      const created = await addExpense(trip.id, form);
      if (created) {
        setExpenses(prev => prev.map(e => (e.id === tempId ? created : e)));
      } else {
        setExpenses(prev => prev.filter(e => e.id !== tempId));
      }
    }
  };

  const handleDelete = async (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
    const ok = await deleteExpense(id);
    if (!ok) load();
  };

  const openAdd  = () => { setEditing(null);  setModalOpen(true); };
  const openEdit = (e: Expense) => { setEditing(e); setModalOpen(true); };

  const spent = expenses.reduce((s, e) => s + e.amount, 0);

  if (!trip) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="text-5xl">🗺️</div>
        <p className="text-base font-semibold text-slate-700">No active trip</p>
        <p className="text-sm text-slate-400">Create a trip first to start tracking expenses.</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/30 to-pink-50/20">

      {/* Header */}
      <div className="px-4 pb-3 pt-12">
        <div className="mb-1 flex items-baseline justify-between">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">Expenses</h1>
            <p className="text-xs text-slate-400">{trip.destination}</p>
          </div>
          <div className="flex items-center gap-1 rounded-2xl bg-white p-1 shadow-sm border border-slate-100">
            {([
              { key: 'list',      icon: List },
              { key: 'analytics', icon: BarChart2 },
            ] as const).map(({ key, icon: Icon }) => (
              <button key={key} onClick={() => setTab(key)}
                className={`flex h-7 w-7 items-center justify-center rounded-xl transition-colors ${
                  tab === key ? 'bg-violet-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'
                }`}>
                <Icon size={15} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Budget Overview */}
      <div className="px-4 mb-3">
        <BudgetOverview budget={trip.budget} spent={spent} currency={trip.currency} />
      </div>

      {/* Daily Budget */}
      <div className="px-4 mb-4">
        <DailyBudgetCard
          budget={trip.budget} currency={trip.currency}
          startDate={trip.startDate} endDate={trip.endDate}
          expenses={expenses}
        />
      </div>

      {/* Main content */}
      <div className="px-4 pb-28">
        {loading ? (
          <div className="flex flex-col gap-2.5">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-2xl bg-white/70"
                style={{ opacity: 1 - i * 0.2 }} />
            ))}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {tab === 'list' ? (
              <motion.div key="list"
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.2 }}>
                <ExpenseList
                  expenses={expenses} currency={trip.currency}
                  onAdd={openAdd} onEdit={openEdit} onDelete={handleDelete}
                />
              </motion.div>
            ) : (
              <motion.div key="analytics"
                initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.2 }}>
                <ExpenseAnalytics expenses={expenses} currency={trip.currency} />
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* FAB */}
      <motion.button
        whileTap={{ scale: 0.93 }}
        onClick={openAdd}
        className="fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-xl shadow-violet-300"
      >
        <Plus size={24} strokeWidth={2.5} className="text-white" />
      </motion.button>

      {/* Modal — passes tripCurrency so it knows the home currency */}
      <ExpenseModal
        open={modalOpen}
        editing={editing}
        tripCurrency={trip.currency}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        onSubmit={handleSubmit}
      />
    </div>
  );
}