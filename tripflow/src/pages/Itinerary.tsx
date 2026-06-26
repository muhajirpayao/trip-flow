import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTrip } from '../context/TripContext';
import { tripDays, fmtDate } from '../utils';
import { loadItinerary, saveItinerary } from '../lib/itineraryService';
import type { ItineraryActivity, ItineraryDay } from '../lib/itineraryService';
import {
  Plus, Clock, MapPin, Trash2, X, Calendar as CalendarIcon,
  Pencil, AlertTriangle, StickyNote, Sparkles, CheckCircle2, Circle,
} from 'lucide-react';

// ─── Category system ───────────────────────────────────────────────────────────

type CategoryKey =
  | 'sightseeing' | 'food' | 'cafe' | 'shopping'
  | 'flight' | 'transport' | 'hotel' | 'entertainment'
  | 'photo' | 'custom';

const CATEGORIES: Record<CategoryKey, { emoji: string; label: string; bg: string; text: string; badge: string }> = {
  sightseeing:   { emoji: '🗺️',  label: 'Sightseeing',   bg: 'bg-sky-50',      text: 'text-sky-600',      badge: 'bg-sky-100 text-sky-700' },
  food:          { emoji: '🍽️',  label: 'Food',          bg: 'bg-orange-50',   text: 'text-orange-500',   badge: 'bg-orange-100 text-orange-700' },
  cafe:          { emoji: '☕',   label: 'Cafe',          bg: 'bg-purple-50',   text: 'text-purple-500',   badge: 'bg-purple-100 text-purple-700' },
  shopping:      { emoji: '🛍️',  label: 'Shopping',      bg: 'bg-pink-50',     text: 'text-pink-500',     badge: 'bg-pink-100 text-pink-700' },
  flight:        { emoji: '✈️',  label: 'Flight',        bg: 'bg-blue-50',     text: 'text-blue-500',     badge: 'bg-blue-100 text-blue-700' },
  transport:     { emoji: '🚆',  label: 'Transport',     bg: 'bg-teal-50',     text: 'text-teal-500',     badge: 'bg-teal-100 text-teal-700' },
  hotel:         { emoji: '🏨',  label: 'Hotel',         bg: 'bg-violet-50',   text: 'text-violet-500',   badge: 'bg-violet-100 text-violet-700' },
  entertainment: { emoji: '🎡',  label: 'Entertainment', bg: 'bg-rose-50',     text: 'text-rose-500',     badge: 'bg-rose-100 text-rose-700' },
  photo:         { emoji: '📸',  label: 'Photo Spot',    bg: 'bg-fuchsia-50',  text: 'text-fuchsia-500',  badge: 'bg-fuchsia-100 text-fuchsia-700' },
  custom:        { emoji: '🌸',  label: 'Custom',        bg: 'bg-lime-50',     text: 'text-lime-600',     badge: 'bg-lime-100 text-lime-700' },
};

type ActivityStatus = 'upcoming' | 'inprogress' | 'completed';

const STATUS_STYLES: Record<ActivityStatus, { label: string; pill: string; dot: string }> = {
  upcoming:   { label: '✨ Upcoming',    pill: 'bg-violet-100 text-violet-600',  dot: 'bg-violet-400' },
  inprogress: { label: '🟣 In Progress', pill: 'bg-pink-100 text-pink-600',      dot: 'bg-pink-400 animate-pulse' },
  completed:  { label: '✓ Completed',    pill: 'bg-emerald-100 text-emerald-600', dot: 'bg-emerald-400' },
};

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAY_LONG  = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ─── Extended activity type ────────────────────────────────────────────────────

type RichActivity = ItineraryActivity & {
  timeEnd?:  string;
  category?: CategoryKey;
  status?:   ActivityStatus;
  notes?:    string;
  location?: string;
};

// ─── Time helpers ──────────────────────────────────────────────────────────────

function to12h(t: string): string {
  const [hStr, mStr] = t.split(':');
  let h = parseInt(hStr, 10);
  const m = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${mStr} ${m}`;
}

function fmtTimeRange(start: string, end?: string) {
  return end ? `${to12h(start)} – ${to12h(end)}` : to12h(start);
}

function buildTimeOptions(minTime?: string) {
  const opts = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const val = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      opts.push({ value: val, label: to12h(val), disabled: minTime ? val < minTime : false });
    }
  }
  return opts;
}

function nowTime() {
  const n = new Date();
  return `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`;
}

function todayDate() { return new Date().toISOString().slice(0, 10); }
function isDayPast(d: string) { return d < todayDate(); }

function detectStatus(activity: RichActivity, dayDate: string): ActivityStatus {
  if (activity.status === 'completed') return 'completed';
  const today = todayDate();
  if (dayDate < today) return 'completed';
  if (dayDate > today) return 'upcoming';
  const now = nowTime();
  if (activity.time <= now && (!activity.timeEnd || activity.timeEnd >= now)) return 'inprogress';
  if ((activity.timeEnd ?? activity.time) < now) return 'completed';
  return 'upcoming';
}

function hasConflict(
  start: string, end: string,
  activities: RichActivity[], excludeId?: string
): RichActivity | null {
  for (const a of activities) {
    if (a.id === excludeId) continue;
    const aEnd = a.timeEnd ?? a.time;
    if (start < aEnd && end > a.time) return a;
  }
  return null;
}

// ─── Empty day builder ─────────────────────────────────────────────────────────

function buildEmptyDays(startDate: string, endDate: string): ItineraryDay[] {
  const days: ItineraryDay[] = [];
  const start = new Date(startDate);
  const end   = new Date(endDate);
  const count = Math.max(1, tripDays(startDate, endDate));
  for (let i = 0; i < count; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    if (d > end && i > 0) break;
    days.push({ date: d.toISOString().slice(0, 10), activities: [] });
  }
  return days;
}

// ─── Form state ────────────────────────────────────────────────────────────────

type FormState = {
  timeStart: string;
  timeEnd:   string;
  title:     string;
  location:  string;
  category:  CategoryKey;
  notes:     string;
};

const BLANK_FORM: FormState = {
  timeStart: '09:00', timeEnd: '10:00', title: '',
  location: '', category: 'sightseeing', notes: '',
};

// ─── Day Progress bar ──────────────────────────────────────────────────────────

function DayProgress({ total, completed }: { total: number; completed: number }) {
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 sm:mx-6 mb-4 rounded-3xl overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #7C5CFF 0%, #8B5CF6 100%)' }}
    >
      {/* Decorative blobs */}
      <div className="relative p-4 sm:p-5 overflow-hidden">
        <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-white/10" />
        <div className="absolute -bottom-6 left-8 w-16 h-16 rounded-full bg-white/[0.07]" />

        <div className="relative flex items-start justify-between mb-3">
          <div>
            <p className="text-white/70 text-[11px] font-semibold mb-0.5">Day progress</p>
            <p className="text-white text-xl font-black">{completed} / {total}</p>
            <p className="text-white/60 text-[11px]">activities completed</p>
          </div>
          <div className="text-right">
            <span className="text-white text-3xl font-black">{pct}%</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2 rounded-full bg-white/25 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #FFD6C2, #FFB7E1)' }}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: [0.22, 0.68, 0, 1.2] }}
          />
        </div>
      </div>
    </motion.div>
  );
}

// ─── Category badge ────────────────────────────────────────────────────────────

function CategoryBadge({ cat }: { cat: CategoryKey }) {
  const c = CATEGORIES[cat];
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${c.badge}`}>
      {c.emoji} {c.label}
    </span>
  );
}

// ─── Activity card ─────────────────────────────────────────────────────────────

function ActivityCard({
  activity,
  dayDate,
  isDayInPast,
  onEdit,
  onDelete,
  onToggle,
}: {
  activity:     RichActivity;
  dayDate:      string;
  isDayInPast:  boolean;
  onEdit:       () => void;
  onDelete:     () => void;
  onToggle:     () => void;
}) {
  const cat    = CATEGORIES[activity.category ?? 'custom'];
  const status = detectStatus(activity, dayDate);
  const st     = STATUS_STYLES[status];
  const isDone = status === 'completed';

  // Timeline node color
  const nodeStyle =
    status === 'completed'  ? 'bg-gradient-to-br from-emerald-300 to-emerald-500 shadow-emerald-200' :
    status === 'inprogress' ? 'bg-gradient-to-br from-pink-300 to-pink-500 shadow-pink-200 animate-pulse' :
                              'bg-gradient-to-br from-violet-400 to-violet-600 shadow-violet-200';

  return (
    <motion.div
      className="relative flex gap-3 items-start"
      initial={{ opacity: 0, x: -16, scale: 0.97 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ type: 'spring', stiffness: 340, damping: 28 }}
      layout
    >
      {/* Timeline node */}
      <div className="flex flex-col items-center pt-1 flex-shrink-0" style={{ width: 22 }}>
        <motion.div
          className={`w-[22px] h-[22px] rounded-full flex items-center justify-center text-white text-[10px] font-black shadow-md ${nodeStyle}`}
          whileTap={{ scale: 0.85 }}
        >
          {isDone ? '✓' : status === 'inprogress' ? '▶' : ''}
        </motion.div>
      </div>

      {/* Card */}
      <motion.div
        className={`flex-1 rounded-3xl border p-3.5 sm:p-4 transition-all duration-300 ${
          isDone
            ? 'bg-white/60 border-slate-100 opacity-60'
            : 'bg-white border-slate-100 shadow-[0_4px_20px_rgba(124,92,255,0.07)]'
        }`}
        whileHover={{ y: -2, boxShadow: '0 8px 28px rgba(124,92,255,0.13)' }}
        whileTap={{ scale: 0.985 }}
      >
        <div className="flex items-start gap-3">
          {/* Category icon */}
          <div className={`w-9 h-9 rounded-2xl flex items-center justify-center text-base flex-shrink-0 ${cat.bg}`}>
            {cat.emoji}
          </div>

          <div className="min-w-0 flex-1">
            {/* Time */}
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 mb-0.5">
              <Clock size={11} />
              {fmtTimeRange(activity.time, activity.timeEnd)}
            </div>
            {/* Title */}
            <h3 className={`text-sm font-black text-slate-900 truncate ${isDone ? 'line-through text-slate-400' : ''}`}>
              {activity.title}
            </h3>
            {/* Location */}
            {activity.location && (
              <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                <MapPin size={11} className="flex-shrink-0" />
                <span className="truncate">{activity.location}</span>
              </div>
            )}
            {/* Notes */}
            {activity.notes && (
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{activity.notes}</p>
            )}
            {/* Status + badge row */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${st.pill}`}>
                {st.label}
              </span>
              <CategoryBadge cat={activity.category ?? 'custom'} />
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            {/* Check toggle */}
            <motion.button
              onClick={onToggle}
              whileTap={{ scale: 0.8 }}
              className="focus:outline-none"
              aria-label={isDone ? 'Mark incomplete' : 'Mark complete'}
            >
              {isDone
                ? <CheckCircle2 size={20} className="text-emerald-400" />
                : <Circle size={20} className="text-slate-200 hover:text-violet-300 transition-colors" />
              }
            </motion.button>
            {!isDayInPast && (
              <div className="flex gap-1">
                <button
                  onClick={onEdit}
                  aria-label="Edit activity"
                  className="w-7 h-7 flex items-center justify-center rounded-xl text-slate-300 hover:text-violet-500 hover:bg-violet-50 transition-colors"
                >
                  <Pencil size={12} />
                </button>
                <button
                  onClick={onDelete}
                  aria-label="Delete activity"
                  className="w-7 h-7 flex items-center justify-center rounded-xl text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Day notes ─────────────────────────────────────────────────────────────────

function DayNotes({ notes, onChange }: { notes: string; onChange: (v: string) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 sm:mx-6 mt-5 rounded-3xl p-4 border border-pink-100"
      style={{ background: 'linear-gradient(135deg, rgba(255,214,194,0.28) 0%, rgba(255,183,225,0.18) 100%)' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <StickyNote size={14} className="text-pink-400" />
        <span className="text-sm font-black text-slate-700">Day notes</span>
      </div>
      <textarea
        value={notes}
        onChange={e => onChange(e.target.value)}
        placeholder="Jot down reminders… Buy Suica card, bring umbrella 🌂"
        rows={3}
        className="w-full bg-transparent text-xs text-slate-600 placeholder-slate-300 resize-none focus:outline-none leading-relaxed"
      />
    </motion.div>
  );
}

// ─── Daily summary ─────────────────────────────────────────────────────────────

function DailySummary({ total, completed }: { total: number; completed: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 sm:mx-6 mt-4 rounded-3xl p-4 border border-sky-100"
      style={{ background: 'linear-gradient(135deg, rgba(199,233,255,0.35) 0%, rgba(217,248,229,0.35) 100%)' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={14} className="text-violet-400" />
        <span className="text-sm font-black text-slate-700">Daily summary</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Activities',  value: String(total),      sub: `${completed} done` },
          { label: 'Remaining',   value: String(total - completed), sub: 'to go' },
        ].map(s => (
          <div key={s.label} className="bg-white/70 rounded-2xl p-3">
            <p className="text-[10px] text-slate-400 font-semibold">{s.label}</p>
            <p className="text-xl font-black text-slate-800 mt-0.5">{s.value}</p>
            <p className="text-[10px] text-slate-400">{s.sub}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Empty state ───────────────────────────────────────────────────────────────

function EmptyItinerary({ isPast, onAdd }: { isPast: boolean; onAdd: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mx-4 sm:mx-6 bg-white rounded-3xl border border-slate-100 shadow-[0_4px_20px_rgba(124,92,255,0.06)] py-12 px-6 text-center"
    >
      <motion.div
        className="text-5xl mb-4 inline-block"
        animate={{ y: [0, -10, 0] }}
        transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
      >
        {isPast ? '📅' : '🧳'}
      </motion.div>
      <h3 className="text-sm font-black text-slate-800 mb-1">
        {isPast ? 'Nothing was planned' : 'No adventures yet ✨'}
      </h3>
      <p className="text-xs text-slate-400 mb-5">
        {isPast ? 'This day has already passed.' : 'This day is a blank canvas — fill it with something magical!'}
      </p>
      {!isPast && (
        <motion.button
          onClick={onAdd}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.95 }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-white text-xs font-bold shadow-[0_6px_18px_rgba(124,92,255,0.38)]"
          style={{ background: 'linear-gradient(135deg, #7C5CFF 0%, #8B5CF6 100%)' }}
        >
          <Plus size={13} /> Add your first adventure
        </motion.button>
      )}
    </motion.div>
  );
}

// ─── Delete confirm sheet ──────────────────────────────────────────────────────

function DeleteConfirmSheet({
  title, onConfirm, onCancel,
}: { title: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 backdrop-blur-sm"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onCancel}
    >
      <motion.div
        className="w-full max-w-screen-md bg-white rounded-t-3xl p-5 pb-10"
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5" />
        <div className="flex flex-col items-center text-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center">
            <AlertTriangle size={20} className="text-rose-400" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 mb-1">Delete activity?</h3>
            <p className="text-sm text-slate-400">
              "<span className="font-bold text-slate-700">{title}</span>" will be removed permanently.
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-3 rounded-full bg-slate-100 text-slate-600 font-bold text-sm active:scale-95 transition-transform">
            Cancel
          </button>
          <button onClick={onConfirm}
            className="flex-1 py-3 rounded-full bg-rose-500 text-white font-bold text-sm active:scale-95 transition-transform">
            Delete
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Activity modal ────────────────────────────────────────────────────────────

function ActivityModal({
  isEditing,
  activeDay,
  dayWeekday,
  form,
  setForm,
  onSave,
  onClose,
  conflict,
  startOptions,
  endOptions,
}: {
  isEditing:    boolean;
  activeDay:    number;
  dayWeekday:   string;
  form:         FormState;
  setForm:      React.Dispatch<React.SetStateAction<FormState>>;
  onSave:       () => void;
  onClose:      () => void;
  conflict:     RichActivity | null;
  startOptions: { value: string; label: string; disabled: boolean }[];
  endOptions:   { value: string; label: string; disabled: boolean }[];
}) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={isEditing ? 'Edit activity' : 'Add activity'}
        className="w-full max-w-screen-md bg-white rounded-t-3xl p-5 sm:p-6 pb-8 max-h-[92vh] overflow-y-auto"
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4" />

        <div className="flex items-start justify-between mb-1">
          <div>
            <h2 className="text-lg font-black text-slate-900">
              {isEditing ? '✏️ Edit Activity' : '✨ Add Activity'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Day {activeDay + 1} · {dayWeekday}</p>
          </div>
          <button onClick={onClose} aria-label="Close modal"
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Conflict warning */}
        <AnimatePresence>
          {conflict && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="flex items-start gap-3 mt-3 mb-1 p-3 rounded-2xl border border-pink-200"
              style={{ background: 'rgba(255,183,225,0.22)' }}
            >
              <span className="text-base flex-shrink-0">🌸</span>
              <p className="text-xs font-semibold text-rose-600">
                Oops! This overlaps with <span className="font-black">"{conflict.title}"</span> ({fmtTimeRange(conflict.time, conflict.timeEnd)})
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-4 mt-4">
          {/* Title */}
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1.5 block" htmlFor="act-title">Title</label>
            <input
              id="act-title"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Visit Senso-ji Temple"
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-violet-400 bg-slate-50/50 transition-colors"
            />
          </div>

          {/* Category grid */}
          <div>
            <label className="text-xs font-bold text-slate-500 mb-2 block">Category</label>
            <div className="grid grid-cols-5 gap-2">
              {(Object.entries(CATEGORIES) as [CategoryKey, typeof CATEGORIES[CategoryKey]][]).map(([key, cat]) => (
                <button
                  key={key}
                  onClick={() => setForm(f => ({ ...f, category: key }))}
                  className={`flex flex-col items-center gap-1 p-2 rounded-2xl border text-center transition-all ${
                    form.category === key
                      ? 'border-violet-400 bg-violet-50 scale-[1.06]'
                      : 'border-slate-100 bg-slate-50 hover:border-violet-200'
                  }`}
                  aria-pressed={form.category === key}
                  aria-label={cat.label}
                >
                  <span className="text-lg leading-none">{cat.emoji}</span>
                  <span className="text-[9px] font-bold text-slate-500 leading-tight">{cat.label.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Time range */}
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1.5 block">Time</label>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="text-[10px] font-semibold text-slate-400 mb-1 block" htmlFor="time-start">From</label>
                <select
                  id="time-start"
                  value={form.timeStart}
                  onChange={e => {
                    const val = e.target.value;
                    const [sh, sm] = val.split(':').map(Number);
                    const endH = (sh + 1) % 24;
                    const autoEnd = `${String(endH).padStart(2, '0')}:${String(sm).padStart(2, '0')}`;
                    setForm(f => ({ ...f, timeStart: val, timeEnd: f.timeEnd <= val ? autoEnd : f.timeEnd }));
                  }}
                  className="w-full px-3 py-3 rounded-2xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-violet-400 bg-white"
                >
                  {startOptions.map(o => <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>)}
                </select>
              </div>
              <span className="text-slate-300 font-bold mt-5">→</span>
              <div className="flex-1">
                <label className="text-[10px] font-semibold text-slate-400 mb-1 block" htmlFor="time-end">To</label>
                <select
                  id="time-end"
                  value={form.timeEnd}
                  onChange={e => setForm(f => ({ ...f, timeEnd: e.target.value }))}
                  className="w-full px-3 py-3 rounded-2xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-violet-400 bg-white"
                >
                  {endOptions.map(o => <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>)}
                </select>
              </div>
            </div>
            <p className="text-[11px] text-violet-500 font-bold mt-1.5 text-right">
              {fmtTimeRange(form.timeStart, form.timeEnd)}
            </p>
          </div>

          {/* Location */}
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1.5 block" htmlFor="act-loc">Location (optional)</label>
            <input
              id="act-loc"
              value={form.location}
              onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
              placeholder="e.g. Asakusa, Tokyo"
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-violet-400 bg-slate-50/50 transition-colors"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1.5 block" htmlFor="act-notes">Notes (optional)</label>
            <textarea
              id="act-notes"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Booking ref, tips, dress code…"
              rows={2}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-violet-400 bg-slate-50/50 resize-none transition-colors"
            />
          </div>

          <motion.button
            onClick={onSave}
            disabled={!form.title.trim()}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            className="w-full py-3.5 rounded-full text-white font-black text-sm shadow-[0_8px_22px_rgba(124,92,255,0.38)] disabled:opacity-40 disabled:cursor-not-allowed transition-opacity mt-1"
            style={{ background: 'linear-gradient(135deg, #7C5CFF 0%, #8B5CF6 100%)' }}
          >
            {isEditing ? 'Save Changes ✨' : `Add to Day ${activeDay + 1} 🌸`}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Kitten avatar ────────────────────────────────────────────────────────────

function KittenAvatar() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Cute peeping kitten">
      {/* Left ear */}
      <polygon points="8,20 5,4 18,14" fill="#f9d4ec" />
      <polygon points="9.5,18 7,7 16,13" fill="#f0a0cc" />

      {/* Right ear */}
      <polygon points="40,20 43,4 30,14" fill="#f9d4ec" />
      <polygon points="38.5,18 41,7 32,13" fill="#f0a0cc" />

      {/* Head — big and centered */}
      <ellipse cx="24" cy="30" rx="18" ry="16" fill="#f9d4ec" />

      {/* Blush cheeks */}
      <ellipse cx="12" cy="34" rx="4.5" ry="3" fill="#ffb7d5" opacity="0.6" />
      <ellipse cx="36" cy="34" rx="4.5" ry="3" fill="#ffb7d5" opacity="0.6" />

      {/* Eyes — big sparkly round eyes */}
      <circle cx="18" cy="27" r="4" fill="white" />
      <circle cx="30" cy="27" r="4" fill="white" />
      <circle cx="18" cy="27" r="2.5" fill="#7C5CFF" />
      <circle cx="30" cy="27" r="2.5" fill="#7C5CFF" />
      {/* Eye shine */}
      <circle cx="19.2" cy="25.8" r="1" fill="white" />
      <circle cx="31.2" cy="25.8" r="1" fill="white" />

      {/* Nose */}
      <ellipse cx="24" cy="32" rx="1.8" ry="1.3" fill="#e87ab0" />

      {/* Mouth */}
      <path d="M21.5 33.5 Q24 36.5 26.5 33.5" stroke="#e87ab0" strokeWidth="1.2" strokeLinecap="round" fill="none" />

      {/* Whiskers left */}
      <line x1="5"  y1="31" x2="19" y2="32.5" stroke="#d4a0c4" strokeWidth="0.9" strokeLinecap="round" />
      <line x1="5"  y1="34" x2="19" y2="33.5" stroke="#d4a0c4" strokeWidth="0.9" strokeLinecap="round" />

      {/* Whiskers right */}
      <line x1="43" y1="31" x2="29" y2="32.5" stroke="#d4a0c4" strokeWidth="0.9" strokeLinecap="round" />
      <line x1="43" y1="34" x2="29" y2="33.5" stroke="#d4a0c4" strokeWidth="0.9" strokeLinecap="round" />

      {/* Little waving paw peeking from bottom */}
      <g style={{ transformOrigin: '10px 44px', animation: 'kittenWave 1.8s ease-in-out infinite' }}>
        <ellipse cx="10" cy="45" rx="6" ry="4" fill="#f9d4ec" />
        <ellipse cx="7"  cy="42" rx="1.8" ry="1.4" fill="#f0a0cc" />
        <ellipse cx="10" cy="41" rx="1.8" ry="1.4" fill="#f0a0cc" />
        <ellipse cx="13" cy="42" rx="1.8" ry="1.4" fill="#f0a0cc" />
      </g>

      <style>{`
        @keyframes kittenWave {
          0%,100% { transform: rotate(0deg) translateY(0px); }
          30%      { transform: rotate(-28deg) translateY(-4px); }
          70%      { transform: rotate(12deg) translateY(-2px); }
        }
      `}</style>
    </svg>
  );
}

// ─── Main Itinerary component ──────────────────────────────────────────────────

export default function Itinerary() {
  const { trip } = useTrip();

  const [days,      setDays]      = useState<ItineraryDay[]>([]);
  const [dbLoading, setDbLoading] = useState(true);
  const [activeDay, setActiveDay] = useState(0);
  const [dayNotes,  setDayNotes]  = useState<Record<number, string>>({});

  const [modalMode,    setModalMode]    = useState<null | 'add' | string>(null);
  const [form,         setForm]         = useState<FormState>(BLANK_FORM);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!trip) { setDbLoading(false); return; }
    loadItinerary(trip.id).then((remote: ItineraryDay[] | null) => {
      setDays(remote?.length ? remote : buildEmptyDays(trip.startDate, trip.endDate));
      setDbLoading(false);
    });
  }, [trip]);

  const totalActivities = useMemo(
    () => days.reduce((s, d) => s + d.activities.length, 0), [days]
  );

  const day         = days[activeDay] as (ItineraryDay & { activities: RichActivity[] }) | undefined;
  const dayWeekday  = day ? WEEKDAY_LONG[new Date(day.date).getDay()] : '';
  const isDayInPast = day ? isDayPast(day.date) : false;
  const isToday     = day?.date === todayDate();
  const minStart    = isToday ? nowTime() : undefined;
  const startOpts   = buildTimeOptions(minStart);
  const endOpts     = buildTimeOptions(form.timeStart);
  const isEditing   = modalMode !== null && modalMode !== 'add';

  const completedCount = useMemo(() => {
    if (!day) return 0;
    return (day.activities as RichActivity[]).filter(
      a => (a.status === 'completed') || isDayPast(day.date) ||
        (day.date === todayDate() && (a.timeEnd ?? a.time) < nowTime())
    ).length;
  }, [day]);

  // Conflict detection (warn only, don't block)
  const conflict = useMemo((): RichActivity | null => {
    if (modalMode === null || !day) return null;
    const excludeId = isEditing ? modalMode : undefined;
    return hasConflict(form.timeStart, form.timeEnd, day.activities as RichActivity[], excludeId);
  }, [form.timeStart, form.timeEnd, day, modalMode, isEditing]);

  const persist = useCallback((next: ItineraryDay[]) => {
    setDays(next);
    if (trip) saveItinerary(trip.id, next);
  }, [trip]);

  const openAddModal = () => {
    const slot = startOpts.find(s => !s.disabled)?.value ?? '09:00';
    const [sh, sm] = slot.split(':').map(Number);
    const endH = (sh + 1) % 24;
    setForm({
      ...BLANK_FORM,
      timeStart: slot,
      timeEnd: `${String(endH).padStart(2, '0')}:${String(sm).padStart(2, '0')}`,
    });
    setModalMode('add');
  };

  const openEditModal = (activity: RichActivity) => {
    // category is the new field; type is the legacy field from old saves.
    // Prefer category, then try to cast type if it's a valid CategoryKey, then default.
    const validCategories = Object.keys(CATEGORIES) as CategoryKey[];
    const resolvedCategory: CategoryKey =
      activity.category && validCategories.includes(activity.category)
        ? activity.category
        : validCategories.includes(activity.type as unknown as CategoryKey)
        ? (activity.type as unknown as CategoryKey)
        : 'sightseeing';

    setForm({
      timeStart: activity.time,
      timeEnd:   activity.timeEnd ?? activity.time,
      title:     activity.title,
      location:  activity.location ?? '',
      category:  resolvedCategory,
      notes:     activity.notes ?? '',
    });
    setModalMode(activity.id);
  };

  const handleSave = () => {
    if (!form.title.trim()) return;
    const base = {
      time:     form.timeStart,
      timeEnd:  form.timeEnd,
      title:    form.title.trim(),
      location: form.location.trim() || undefined,
      category: form.category,                              // new field — always written
      type:     form.category as unknown as ItineraryActivity['type'], // legacy compat
      notes:    form.notes.trim() || undefined,
    };

    const next = days.map((d, i) => {
      if (i !== activeDay) return d;
      let acts: RichActivity[];
      if (modalMode === 'add') {
        acts = [...(d.activities as RichActivity[]), { id: crypto.randomUUID(), ...base }];
      } else {
        acts = (d.activities as RichActivity[]).map(a => a.id === modalMode ? { ...a, ...base } : a);
      }
      return { ...d, activities: acts.sort((a, b) => a.time.localeCompare(b.time)) };
    });
    persist(next);
    setModalMode(null);
  };

  const handleToggle = (activityId: string) => {
    const next = days.map((d, i) => {
      if (i !== activeDay) return d;
      return {
        ...d,
        activities: (d.activities as RichActivity[]).map(a =>
          a.id === activityId
            ? { ...a, status: (a.status === 'completed' ? 'upcoming' : 'completed') as ActivityStatus }
            : a
        ),
      };
    });
    persist(next);
  };

  const handleConfirmDelete = () => {
    if (!confirmDelete) return;
    const next = days.map((d, i) =>
      i === activeDay
        ? { ...d, activities: d.activities.filter((a: ItineraryActivity) => a.id !== confirmDelete) }
        : d
    );
    persist(next);
    setConfirmDelete(null);
  };

  const deletingActivity = confirmDelete
    ? (day?.activities as RichActivity[])?.find(a => a.id === confirmDelete)
    : null;

  // ── No trip ──
  if (!trip) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-8 text-center py-20">
        <motion.div
          className="text-5xl mb-4"
          animate={{ y: [0, -10, 0] }}
          transition={{ repeat: Infinity, duration: 3 }}
        >🗺️</motion.div>
        <h2 className="text-lg font-black text-slate-900 mb-1">No trip yet</h2>
        <p className="text-sm text-slate-400">Create a trip first to start building your itinerary.</p>
      </div>
    );
  }

  // ── Loading ──
  if (dbLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 rounded-full border-4 border-violet-200 border-t-violet-500 animate-spin" />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen pb-28 w-full overflow-x-hidden" style={{ background: '#F8FAFC' }}>

      {/* Decorative background blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full opacity-[0.13]"
          style={{ background: '#7C5CFF' }} />
        <div className="absolute top-80 -left-12 w-40 h-40 rounded-full opacity-[0.10]"
          style={{ background: '#FFB7E1' }} />
        <div className="absolute bottom-40 -right-10 w-32 h-32 rounded-full opacity-[0.08]"
          style={{ background: '#C7E9FF' }} />
      </div>

      {/* ── Header ── */}
      <div className="px-4 sm:px-6 pt-6 pb-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full mb-2"
              style={{ background: 'rgba(124,92,255,0.1)', color: '#7C5CFF' }}>
              🌸 {trip.destination}
            </div>
            <h1 className="text-2xl font-black text-slate-900 mb-0.5 tracking-tight">Itinerary</h1>
            <p className="text-xs text-slate-400">
              {totalActivities} {totalActivities === 1 ? 'activity' : 'activities'} planned
            </p>
          </div>
          {/* Peeping kitten avatar */}
          <motion.div
            className="w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #ede8ff, #ffd6f0)' }}
            whileHover={{ scale: 1.08 }}
          >
            <KittenAvatar />
          </motion.div>
        </div>
      </div>

      {/* ── Day selector ── */}
      <div className="px-4 sm:px-6 mb-4">
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
          {days.map((d, i) => {
            const dateObj  = new Date(d.date);
            const isActive = i === activeDay;
            const isPast   = isDayPast(d.date);
            return (
              <motion.button
                key={d.date}
                onClick={() => setActiveDay(i)}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.92 }}
                className={`flex-shrink-0 flex flex-col items-center justify-center w-[58px] sm:w-16 py-2.5 rounded-2xl border transition-colors duration-200 ${
                  isActive
                    ? 'text-white border-transparent shadow-[0_8px_20px_rgba(124,92,255,0.35)]'
                    : isPast
                    ? 'bg-slate-50 text-slate-400 border-slate-100 opacity-55'
                    : 'bg-white text-slate-600 border-slate-100 shadow-sm'
                }`}
                style={isActive ? { background: 'linear-gradient(135deg, #7C5CFF, #8B5CF6)' } : {}}
              >
                <span className={`text-[9px] font-bold uppercase ${isActive ? 'text-violet-100' : 'text-slate-400'}`}>
                  {WEEKDAY_SHORT[dateObj.getDay()]}
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

      {/* ── Day progress (only if there are activities) ── */}
      {day && day.activities.length > 0 && (
        <DayProgress total={day.activities.length} completed={completedCount} />
      )}

      {/* ── Day header ── */}
      <div className="px-4 sm:px-6 flex items-center justify-between mb-4 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <CalendarIcon size={14} className="text-violet-400 flex-shrink-0" />
          <span className="text-sm font-black text-slate-700 truncate">
            Day {activeDay + 1} · {dayWeekday}{day ? `, ${fmtDate(day.date)}` : ''}
          </span>
          {isDayInPast && (
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 rounded-full px-2 py-0.5 flex-shrink-0">
              Past
            </span>
          )}
        </div>
        {!isDayInPast && (
          <motion.button
            onClick={openAddModal}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.93 }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-white text-xs font-black flex-shrink-0 shadow-[0_6px_16px_rgba(124,92,255,0.38)]"
            style={{ background: 'linear-gradient(135deg, #7C5CFF, #8B5CF6)' }}
          >
            <Plus size={13} /> Add
          </motion.button>
        )}
      </div>

      {/* ── Timeline or empty ── */}
      {!day || day.activities.length === 0 ? (
        <EmptyItinerary isPast={isDayInPast} onAdd={openAddModal} />
      ) : (
        <div className="px-4 sm:px-6">
          {/* Vertical connecting line */}
          <div className="relative">
            <div
              className="absolute left-[10px] top-3 bottom-3 w-0.5 rounded-full"
              style={{ background: 'linear-gradient(180deg, #7C5CFF 0%, rgba(139,92,246,0.1) 100%)' }}
            />
            <div className="space-y-3 pl-8">
              <AnimatePresence initial={false}>
                {(day.activities as RichActivity[]).map(activity => (
                  <ActivityCard
                    key={activity.id}
                    activity={activity}
                    dayDate={day.date}
                    isDayInPast={isDayInPast}
                    onEdit={() => openEditModal(activity)}
                    onDelete={() => setConfirmDelete(activity.id)}
                    onToggle={() => handleToggle(activity.id)}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
      )}

      {/* ── Day notes ── */}
      <DayNotes
        notes={dayNotes[activeDay] ?? ''}
        onChange={v => setDayNotes(prev => ({ ...prev, [activeDay]: v }))}
      />

      {/* ── Daily summary ── */}
      {day && day.activities.length > 0 && (
        <DailySummary total={day.activities.length} completed={completedCount} />
      )}

      {/* ── Add / Edit modal ── */}
      <AnimatePresence>
        {modalMode !== null && (
          <ActivityModal
            isEditing={isEditing}
            activeDay={activeDay}
            dayWeekday={dayWeekday}
            form={form}
            setForm={setForm}
            onSave={handleSave}
            onClose={() => setModalMode(null)}
            conflict={conflict}
            startOptions={startOpts}
            endOptions={endOpts}
          />
        )}
      </AnimatePresence>

      {/* ── Delete confirm ── */}
      <AnimatePresence>
        {confirmDelete && deletingActivity && (
          <DeleteConfirmSheet
            title={deletingActivity.title}
            onConfirm={handleConfirmDelete}
            onCancel={() => setConfirmDelete(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}