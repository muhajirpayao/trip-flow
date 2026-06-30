// src/pages/Expenses.tsx
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
import PhotoViewer from '../components/expenses/PhotoViewer';
import {
  fetchExpenses,
  addExpense,
  updateExpense,
  deleteExpense,
  downloadExpensePhoto,
} from '../lib/expenseService';
import type { Expense, ExpenseFormData } from '../types/expenses';

type Tab = 'list' | 'analytics';

// ── Date helpers (UTC-safe) ───────────────────────────────────────────────────

/** Today's date as YYYY-MM-DD in LOCAL time (not UTC-shifted). */
function localToday(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Build YYYY-MM-DD strings for every day from startDate → endDate
 * using LOCAL date arithmetic, avoiding UTC-offset shifts.
 */
function buildDayList(startDate: string, endDate: string): string[] {
  const list: string[] = [];
  // Parse as local midnight to avoid off-by-one on timezone boundaries
  const [sy, sm, sd] = startDate.split('-').map(Number);
  const [ey, em, ed] = endDate.split('-').map(Number);
  const cur  = new Date(sy, sm - 1, sd);
  const end  = new Date(ey, em - 1, ed);

  while (cur <= end) {
    const y = cur.getFullYear();
    const mo = String(cur.getMonth() + 1).padStart(2, '0');
    const da = String(cur.getDate()).padStart(2, '0');
    list.push(`${y}-${mo}-${da}`);
    cur.setDate(cur.getDate() + 1);
  }
  return list;
}

// ─────────────────────────────────────────────────────────────────────────────

export default function Expenses() {
  const { trip } = useTrip();

  const [expenses, setExpenses]   = useState<Expense[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(false);      // FIX: track load failure
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]     = useState<Expense | null>(null);
  const [tab, setTab]             = useState<Tab>('list');

  // Photo viewer
  const [viewingPhoto, setViewingPhoto] = useState<Expense | null>(null);

  const load = useCallback(async () => {
    if (!trip) return;
    setLoading(true);
    setError(false);
    try {
      const data = await fetchExpenses(trip.id);
      setExpenses(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [trip]);

  useEffect(() => { load(); }, [load]);

  // ── CRUD handlers ──────────────────────────────────────────────────────────

  const handleSubmit = async (form: ExpenseFormData) => {
    if (!trip) return;

    if (editing) {
      // Optimistic update (revert on failure)
      const optimistic: Expense = {
        ...editing,
        ...form,
        amount: Number(form.amount),
        photoUrl: form.photoFile
          ? editing.photoUrl          // keep old URL until upload returns
          : (form.photoUrl ?? editing.photoUrl),
      };
      setExpenses(prev => prev.map(e => (e.id === editing.id ? optimistic : e)));

      const updated = await updateExpense(editing.id, form, editing.photoUrl);
      if (updated) {
        setExpenses(prev => prev.map(e => (e.id === updated.id ? updated : e)));
      } else {
        // FIX: rollback on failure
        setExpenses(prev => prev.map(e => (e.id === editing.id ? editing : e)));
      }
      setEditing(null);
    } else {
      const tempId = `temp-${Date.now()}`;
      const optimistic: Expense = {
        id: tempId, tripId: trip.id,
        amount: Number(form.amount), category: form.category,
        description: form.description, notes: form.notes,
        expenseDate: form.expenseDate, createdAt: new Date().toISOString(),
        // Show local preview immediately if a file was chosen
        photoUrl: form.photoFile
          ? URL.createObjectURL(form.photoFile)
          : form.photoUrl,
      };
      setExpenses(prev => [optimistic, ...prev]);

      const created = await addExpense(trip.id, form);
      if (created) {
        // Swap temp entry for the real one (with server URL)
        setExpenses(prev => prev.map(e => (e.id === tempId ? created : e)));
      } else {
        setExpenses(prev => prev.filter(e => e.id !== tempId));
      }
    }
  };

  const handleDelete = async (id: string, photoUrl?: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
    const ok = await deleteExpense(id, photoUrl);
    if (!ok) load(); // FIX: rollback by reloading
  };

  const handleDownload = (photoUrl: string, description: string) => {
    const safeName = description.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    downloadExpensePhoto(photoUrl, `receipt-${safeName}.jpg`);
  };

  const openAdd  = () => { setEditing(null);  setModalOpen(true); };
  const openEdit = (e: Expense) => { setEditing(e); setModalOpen(true); };

  // ── Day list + active day ──────────────────────────────────────────────────

  // FIX: built with local-time arithmetic to avoid UTC shift
  const tripDayList = useMemo(() => {
    if (!trip) return [];
    return buildDayList(trip.startDate, trip.endDate);
  }, [trip]);

  const [activeDay, setActiveDay] = useState(0);

  // FIX: use localToday() so we compare local dates, not UTC-shifted ones
  useEffect(() => {
    if (!tripDayList.length) return;
    const today = localToday();
    const idx = tripDayList.indexOf(today);
    // If today is within the trip, jump to it; otherwise stay on day 0
    setActiveDay(idx >= 0 ? idx : 0);
  }, [tripDayList]);

  const activeDate = tripDayList[activeDay] ?? localToday();
  const dayExpenses = expenses.filter(e => e.expenseDate.slice(0, 10) === activeDate);
  const spent = expenses.reduce((s, e) => s + e.amount, 0);

  // ── Render ─────────────────────────────────────────────────────────────────

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
          activeDate={activeDate}
        />
      </div>

      {/* Day selector */}
      <div className="px-4 mb-4">
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
          {tripDayList.map((d, i) => {
            // FIX: parse as local date so weekday/day-number is never off by 1
            const [dy, dm, dd] = d.split('-').map(Number);
            const dateObj  = new Date(dy, dm - 1, dd);
            const isActive = i === activeDay;
            const isToday  = d === localToday();

            return (
              <motion.button
                key={d}
                onClick={() => setActiveDay(i)}
                whileTap={{ scale: 0.92 }}
                className={`relative flex-shrink-0 flex flex-col items-center justify-center w-[58px] py-2.5 rounded-2xl border transition-colors duration-200 ${
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
                {/* Today indicator dot */}
                {isToday && !isActive && (
                  <span className="absolute bottom-1.5 h-1 w-1 rounded-full bg-violet-400" />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Main content */}
      <div className="px-4 pb-28">
        {/* FIX: show error state instead of hanging on loading */}
        {error ? (
          <div className="py-12 text-center">
            <p className="text-sm text-slate-400 mb-3">Failed to load expenses.</p>
            <button onClick={load}
              className="text-xs font-semibold text-violet-500 underline underline-offset-2">
              Try again
            </button>
          </div>
        ) : loading ? (
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
                      expenses={dayExpenses}
                      currency={trip.currency}
                      onAdd={openAdd}
                      onEdit={openEdit}
                      onDelete={handleDelete}
                      onDownload={handleDownload}
                      onView={e => setViewingPhoto(e)}
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

      {/* Modal */}
      <ExpenseModal
        open={modalOpen}
        editing={editing}
        tripCurrency={trip.currency}
        defaultDate={activeDate}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        onSubmit={handleSubmit}
      />

      {/* Photo viewer lightbox */}
      <PhotoViewer
        expense={viewingPhoto}
        onClose={() => setViewingPhoto(null)}
      />
    </div>
  );
}