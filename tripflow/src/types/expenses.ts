// ─── Expense Types ────────────────────────────────────────────────────────────

export type ExpenseCategory =
  | 'food'
  | 'transport'
  | 'hotel'
  | 'activities'
  | 'shopping'
  | 'cafe'
  | 'flight'
  | 'souvenirs'
  | 'misc';

export interface Expense {
  id: string;
  tripId: string;
  amount: number;
  category: ExpenseCategory;
  description: string;
  notes?: string;
  expenseDate: string; // ISO date string YYYY-MM-DD
  createdAt: string;
  photoUrl?: string;   // optional receipt / photo
}

export interface ExpenseFormData {
  amount: string;
  category: ExpenseCategory;
  description: string;
  notes?: string;
  expenseDate: string;
  photoUrl?: string;   // persisted URL after upload
  photoFile?: File;    // transient — used in modal only, not sent to service raw
}

export const CATEGORY_META: Record<
  ExpenseCategory,
  { label: string; emoji: string; color: string; bg: string; chart: string }
> = {
  food:       { label: 'Food',       emoji: '🍽️', color: 'text-orange-500', bg: 'bg-orange-50',   chart: '#fb923c' },
  transport:  { label: 'Transport',  emoji: '🚆', color: 'text-sky-500',    bg: 'bg-sky-50',      chart: '#38bdf8' },
  hotel:      { label: 'Hotel',      emoji: '🏨', color: 'text-violet-500', bg: 'bg-violet-50',   chart: '#a78bfa' },
  activities: { label: 'Activities', emoji: '🎟️', color: 'text-pink-500',   bg: 'bg-pink-50',     chart: '#f472b6' },
  shopping:   { label: 'Shopping',   emoji: '🛍️', color: 'text-rose-500',   bg: 'bg-rose-50',     chart: '#fb7185' },
  cafe:       { label: 'Café',       emoji: '☕', color: 'text-amber-500',  bg: 'bg-amber-50',    chart: '#fbbf24' },
  flight:     { label: 'Flight',     emoji: '✈️', color: 'text-indigo-500', bg: 'bg-indigo-50',   chart: '#818cf8' },
  souvenirs:  { label: 'Souvenirs',  emoji: '🎁', color: 'text-teal-500',   bg: 'bg-teal-50',     chart: '#2dd4bf' },
  misc:       { label: 'Other',      emoji: '📦', color: 'text-slate-500',  bg: 'bg-slate-100',   chart: '#94a3b8' },
};