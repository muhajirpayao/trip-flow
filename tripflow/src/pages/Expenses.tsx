import { useState, useEffect, useCallback, useMemo } from 'react';
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

  // Build the full list of trip days from start → end date, same approach as
  // Itinerary.tsx's day selector. This way the tabs always reflect the trip's
  // designated date range, even for days with zero expenses yet.
  const tripDayList = useMemo(() => {
    if (!trip) return [];
    const list: string[] = [];
    const start = new Date(trip.startDate);
    const end   = new Date(trip.endDate);
    const cur   = new Date(start);
    while (cur <= end) {
      list.push(cur.toISOString().slice(0, 10));
      cur.setDate(cur.getDate() + 1);
    }
    return list;
  }, [trip]);

  const [activeDay, setActiveDay] = useState(0);

  // Keep activeDay pointing at today if it's within range, otherwise day 0.
  useEffect(() => {
    if (!tripDayList.length) return;
    const today = new Date().toISOString().slice(0, 10);
    const idx = tripDayList.indexOf(today);
    setActiveDay(idx >= 0 ? idx : 0);
  }, [tripDayList]);

  const activeDate = tripDayList[activeDay];

  // Each expense stays on the day it already has — we're only filtering
  // the already-loaded data down to the selected tab, not reassigning days.
  const dayExpenses = expenses.filter(e => e.expenseDate.slice(0, 10) === activeDate);

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

      {/* Day selector — mirrors Itinerary.tsx, built from the trip's date range */}
      <div className="px-4 mb-4">
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
          {tripDayList.map((d, i) => {
            const dateObj  = new Date(d);
            const isActive = i === activeDay;
            return (
              <motion.button
                key={d}
                onClick={() => setActiveDay(i)}
                whileTap={{ scale: 0.92 }}
                className={`flex-shrink-0 flex flex-col items-center justify-center w-[58px] py-2.5 rounded-2xl border transition-colors duration-200 ${
                  isActive
                    ? 'text-white border-transparent shadow-lg shadow-violet-300'
                    : 'bg-white text-slate-600 border-slate-100 shadow-sm'
                }`}
                style={isActive ? { background: 'linear-gradient(135deg, #8B5CF6, #a855f7)' } : {}}
              >
                <span className={`text-[9px] font-bold uppercase ${isActive ? 'text-violet-100' : 'text-slate-400'}`}>
                  {dateObj.toLocaleDateString(undefined, { weekday: 'short' })}
                </span>
                <span className="text-sm font-black mt-0.5">{dateObj.getDate()}</span>
                <span className={`text-[9px] font-medium ${isActive ? 'text-violet-100' : 'text-slate-400'}`}>
                  {dateObj.toLocaleDateString(undefined, { month: 'short' })}
                </span>
              </motion.button>
            );
          })}
        </div>
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
                <div className="flex flex-col gap-5">
                  {dayExpenses.length === 0 ? (
                    <p className="py-10 text-center text-sm text-slate-400">
                      No expenses for this day yet. Tap + to add one.
                    </p>
                  ) : (
                    <ExpenseList
                      expenses={dayExpenses} currency={trip.currency}
                      onAdd={openAdd} onEdit={openEdit} onDelete={handleDelete}
                    />
                  )}
                </div>
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