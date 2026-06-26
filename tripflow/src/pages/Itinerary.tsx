
import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTrip } from '../context/TripContext';
import { tripDays, fmtDate } from '../utils';
import { loadItinerary, saveItinerary } from '../lib/itineraryService';
import type { ItineraryActivity, ItineraryDay } from '../lib/itineraryService';
import { Plus, Clock, MapPin, Trash2, X, Calendar as CalendarIcon, Pencil, AlertTriangle } from 'lucide-react';

type ActivityType = 'sightseeing' | 'food' | 'transport' | 'lodging' | 'activity' | 'other';

const TYPE_STYLES: Record<ActivityType, { color: string; emoji: string }> = {
  sightseeing: { color: 'bg-indigo-50 text-indigo-600',  emoji: '🗺️' },
  food:        { color: 'bg-amber-50 text-amber-600',    emoji: '🍽️' },
  transport:   { color: 'bg-sky-50 text-sky-600',        emoji: '🚗' },
  lodging:     { color: 'bg-violet-50 text-violet-600',  emoji: '🏨' },
  activity:    { color: 'bg-emerald-50 text-emerald-600',emoji: '🎟️' },
  other:       { color: 'bg-rose-50 text-rose-600',      emoji: '📌' },
};

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAY_LONG  = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ─── Time helpers ─────────────────────────────────────────────────────────────

function to12h(time24: string): string {
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10);
  const meridiem = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${mStr} ${meridiem}`;
}

function fmtTimeRange(start: string, end?: string): string {
  if (!end) return to12h(start);
  return `${to12h(start)} – ${to12h(end)}`;
}

function buildTimeOptions(minTime?: string): { value: string; label: string; disabled: boolean }[] {
  const options = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      const disabled = minTime ? value < minTime : false;
      options.push({ value, label: to12h(value), disabled });
    }
  }
  return options;
}

function nowTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function isDayPast(date: string): boolean {
  return date < todayDate();
}

function isActivityPast(activity: ItineraryActivity & { timeEnd?: string }, dayDate: string): boolean {
  const today = todayDate();
  if (dayDate < today) return true;
  if (dayDate > today) return false;
  const compareTime = activity.timeEnd ?? activity.time;
  return compareTime < nowTime();
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

// ─── Form state type ───────────────────────────────────────────────────────────

type FormState = {
  timeStart: string;
  timeEnd:   string;
  title:     string;
  location:  string;
  type:      ActivityType;
  notes:     string;
};

const BLANK_FORM: FormState = {
  timeStart: '09:00', timeEnd: '10:00', title: '', location: '', type: 'sightseeing', notes: '',
};

// ─── Delete confirmation sheet ─────────────────────────────────────────────────

function DeleteConfirmSheet({
  title,
  onConfirm,
  onCancel,
}: {
  title: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
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
        <div className="flex flex-col items-center text-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center">
            <AlertTriangle size={20} className="text-rose-500" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 mb-1">Delete activity?</h3>
            <p className="text-sm text-slate-500">
              "<span className="font-semibold text-slate-700">{title}</span>" will be permanently removed.
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-full bg-slate-100 text-slate-600 font-bold text-sm active:scale-95 transition-transform"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 rounded-full bg-rose-500 text-white font-bold text-sm active:scale-95 transition-transform"
          >
            Delete
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function Itinerary() {
  const { trip } = useTrip();

  const [days, setDays]           = useState<ItineraryDay[]>([]);
  const [dbLoading, setDbLoading] = useState(true);
  const [activeDay, setActiveDay] = useState(0);

  // Modal state: null = closed, 'add' = adding, activity id = editing
  const [modalMode, setModalMode]     = useState<null | 'add' | string>(null);
  const [form, setForm]               = useState<FormState>(BLANK_FORM);

  // Delete confirmation: null = none, activity id = pending confirm
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Live tick every minute for past-status
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

  const totalActivities = useMemo(() => days.reduce((s, d) => s + d.activities.length, 0), [days]);

  if (!trip) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-8 text-center py-20">
        <div className="text-5xl mb-4">🗺️</div>
        <h2 className="text-lg font-bold text-slate-900 mb-1">No trip yet</h2>
        <p className="text-sm text-slate-500">Create a trip first to start building your itinerary.</p>
      </div>
    );
  }

  if (dbLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
      </div>
    );
  }

  const persist = (next: ItineraryDay[]) => {
    setDays(next);
    saveItinerary(trip.id, next);
  };

  // ── Open add modal ──
  const openAddModal = () => {
    const day = days[activeDay];
    const isToday = day?.date === todayDate();
    const minStart = isToday ? nowTime() : undefined;
    const allSlots = buildTimeOptions(minStart);
    const defaultStart = allSlots.find(s => !s.disabled)?.value ?? '09:00';
    const [sh, sm] = defaultStart.split(':').map(Number);
    const endH = (sh + 1) % 24;
    const defaultEnd = `${String(endH).padStart(2, '0')}:${String(sm).padStart(2, '0')}`;
    setForm({ ...BLANK_FORM, timeStart: defaultStart, timeEnd: defaultEnd });
    setModalMode('add');
  };

  // ── Open edit modal ──
  const openEditModal = (activity: ItineraryActivity & { timeEnd?: string }) => {
    setForm({
      timeStart: activity.time,
      timeEnd:   activity.timeEnd ?? activity.time,
      title:     activity.title,
      location:  activity.location ?? '',
      type:      activity.type as ActivityType,
      notes:     activity.notes ?? '',
    });
    setModalMode(activity.id);
  };

  // ── Save (add or edit) ──
  const handleSave = () => {
    if (!form.title.trim()) return;

    if (modalMode === 'add') {
      const newActivity = {
        id:       crypto.randomUUID(),
        time:     form.timeStart,
        timeEnd:  form.timeEnd,
        title:    form.title.trim(),
        location: form.location.trim() || undefined,
        type:     form.type,
        notes:    form.notes.trim() || undefined,
      };
      const next = days.map((d, i) =>
        i === activeDay
          ? { ...d, activities: [...d.activities, newActivity].sort((a, b) => a.time.localeCompare(b.time)) }
          : d
      );
      persist(next);
    } else {
      // editing existing activity
      const next = days.map((d, i) =>
        i === activeDay
          ? {
              ...d,
              activities: d.activities
                .map((a: ItineraryActivity) =>
                  a.id === modalMode
                    ? {
                        ...a,
                        time:     form.timeStart,
                        timeEnd:  form.timeEnd,
                        title:    form.title.trim(),
                        location: form.location.trim() || undefined,
                        type:     form.type,
                        notes:    form.notes.trim() || undefined,
                      }
                    : a
                )
                .sort((a, b) => a.time.localeCompare(b.time)),
            }
          : d
      );
      persist(next);
    }
    setModalMode(null);
  };

  // ── Delete (after confirmation) ──
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

  const handleStartChange = (val: string) => {
    const [sh, sm] = val.split(':').map(Number);
    const endH = (sh + 1) % 24;
    const autoEnd = `${String(endH).padStart(2, '0')}:${String(sm).padStart(2, '0')}`;
    setForm(f => ({ ...f, timeStart: val, timeEnd: f.timeEnd <= val ? autoEnd : f.timeEnd }));
  };

  const day           = days[activeDay];
  const dayWeekday    = day ? WEEKDAY_LONG[new Date(day.date).getDay()] : '';
  const isDayInPast   = day ? isDayPast(day.date) : false;
  const activeDayDate = day?.date ?? todayDate();
  const isActiveToday = activeDayDate === todayDate();
  const minStartTime  = isActiveToday ? nowTime() : undefined;
  const startOptions  = buildTimeOptions(minStartTime);
  const endOptions    = buildTimeOptions(form.timeStart);
  const showModal     = modalMode !== null;
  const isEditing     = modalMode !== null && modalMode !== 'add';

  // Find activity being deleted for confirmation label
  const deletingActivity = confirmDelete
    ? day?.activities.find((a: ItineraryActivity) => a.id === confirmDelete)
    : null;

  return (
    <div className="min-h-screen pb-24 w-full overflow-x-hidden">
      {/* Header */}
      <div className="px-4 sm:px-6 pt-6 pb-4">
        <h1 className="text-2xl font-black text-slate-900 mb-1">Itinerary</h1>
        <p className="text-sm text-slate-500 truncate">
          {trip.destination} · {totalActivities} {totalActivities === 1 ? 'activity' : 'activities'} planned
        </p>
      </div>

      {/* Day selector */}
      <div className="px-4 sm:px-6 mb-5">
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
          {days.map((d, i) => {
            const dateObj = new Date(d.date);
            const isActive = i === activeDay;
            const isPast   = isDayPast(d.date);
            return (
              <button key={d.date} onClick={() => setActiveDay(i)}
                className={`flex-shrink-0 flex flex-col items-center justify-center w-[60px] sm:w-16 py-2.5 rounded-2xl border transition-all duration-200 ${
                  isActive
                    ? 'gradient-primary text-white border-transparent shadow-hero scale-[1.03]'
                    : isPast
                    ? 'bg-slate-50 text-slate-400 border-slate-100 opacity-60'
                    : 'bg-white text-slate-600 border-slate-100 shadow-card'
                }`}>
                <span className={`text-[9px] font-bold uppercase ${isActive ? 'text-indigo-100' : 'text-slate-400'}`}>
                  {WEEKDAY_SHORT[dateObj.getDay()]}
                </span>
                <span className="text-sm font-black mt-0.5">{dateObj.getDate()}</span>
                <span className={`text-[9px] font-medium ${isActive ? 'text-indigo-100' : 'text-slate-400'}`}>
                  {dateObj.toLocaleDateString(undefined, { month: 'short' })}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Day timeline */}
      <div className="px-4 sm:px-6">
        <div className="flex items-center justify-between mb-4 gap-2">
          <div className="flex items-center gap-2 text-slate-700 min-w-0">
            <CalendarIcon size={15} className="text-indigo-500 flex-shrink-0" />
            <span className="text-sm font-bold truncate">
              Day {activeDay + 1} · {dayWeekday}{day ? `, ${fmtDate(day.date)}` : ''}
            </span>
            {isDayInPast && (
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 rounded-full px-2 py-0.5 flex-shrink-0">
                Past
              </span>
            )}
          </div>
          {!isDayInPast && (
            <button onClick={openAddModal}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full gradient-primary text-white text-xs font-bold shadow-hero active:scale-95 transition-transform flex-shrink-0">
              <Plus size={14} /> Add
            </button>
          )}
        </div>

        {day && day.activities.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-card py-12 px-6 text-center">
            <div className="text-3xl mb-3">{isDayInPast ? '📅' : '📭'}</div>
            <p className="text-sm font-semibold text-slate-700 mb-1">
              {isDayInPast ? 'Nothing was planned' : 'Nothing planned yet'}
            </p>
            <p className="text-xs text-slate-400">
              {isDayInPast ? 'This day has already passed.' : 'Tap "Add" to schedule your first activity'}
            </p>
          </div>
        ) : (
          <div className="relative pl-5">
            <div className="absolute left-[7px] top-2 bottom-2 w-px bg-slate-200" />
            <div className="space-y-3">
              <AnimatePresence initial={false}>
                {day?.activities.map((activity: ItineraryActivity & { timeEnd?: string }) => {
                  const style  = TYPE_STYLES[activity.type as ActivityType];
                  const isPast = isActivityPast(activity, day.date);
                  return (
                    <motion.div key={activity.id} className="relative"
                      initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, height: 0, marginBottom: 0 }} transition={{ duration: 0.2 }}>
                      <div className={`absolute -left-5 top-4 w-3.5 h-3.5 rounded-full bg-white border-2 transition-colors ${isPast ? 'border-slate-300' : 'border-indigo-400'}`} />
                      <div className={`bg-white rounded-2xl p-3.5 sm:p-4 border shadow-card transition-all duration-300 ${isPast ? 'border-slate-100 opacity-45 grayscale-[60%]' : 'border-slate-100'}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0 ${style.color}`}>
                              {style.emoji}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 mb-0.5">
                                <Clock size={11} />
                                {fmtTimeRange(activity.time, activity.timeEnd)}
                                {isPast && (
                                  <span className="text-[9px] font-bold text-slate-300 bg-slate-50 rounded-full px-1.5 py-0.5 ml-1">Done</span>
                                )}
                              </div>
                              <h3 className="text-sm font-bold text-slate-900 truncate">{activity.title}</h3>
                              {activity.location && (
                                <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                                  <MapPin size={11} className="flex-shrink-0" />
                                  <span className="truncate">{activity.location}</span>
                                </div>
                              )}
                              {activity.notes && (
                                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed break-words">{activity.notes}</p>
                              )}
                            </div>
                          </div>
                          {/* Action buttons — hidden for past days */}
                          {!isDayInPast && (
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button onClick={() => openEditModal(activity)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 transition-colors">
                                <Pencil size={13} />
                              </button>
                              <button onClick={() => setConfirmDelete(activity.id)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors">
                                <Trash2 size={13} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Activity Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setModalMode(null)}
          >
            <motion.div
              className="w-full max-w-screen-md bg-white rounded-t-3xl p-5 sm:p-6 pb-8 max-h-[88vh] overflow-y-auto"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-black text-slate-900">
                    {isEditing ? 'Edit Activity' : 'Add Activity'}
                  </h2>
                  {isEditing && (
                    <p className="text-xs text-slate-400 mt-0.5">Day {activeDay + 1} · {dayWeekday}</p>
                  )}
                </div>
                <button onClick={() => setModalMode(null)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block">Title</label>
                  <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. Visit the Louvre"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-indigo-400" />
                </div>

                {/* Time range */}
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block">Time</label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <label className="text-[10px] font-semibold text-slate-400 mb-1 block">From</label>
                      <select value={form.timeStart} onChange={e => handleStartChange(e.target.value)}
                        className="w-full px-3 py-3 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-indigo-400 bg-white">
                        {startOptions.map(opt => (
                          <option key={opt.value} value={opt.value} disabled={opt.disabled}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                    <span className="text-slate-400 font-bold text-sm mt-5">→</span>
                    <div className="flex-1">
                      <label className="text-[10px] font-semibold text-slate-400 mb-1 block">To</label>
                      <select value={form.timeEnd} onChange={e => setForm({ ...form, timeEnd: e.target.value })}
                        className="w-full px-3 py-3 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-indigo-400 bg-white">
                        {endOptions.map(opt => (
                          <option key={opt.value} value={opt.value} disabled={opt.disabled}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <p className="text-[11px] text-indigo-500 font-semibold mt-1.5 text-right">
                    {fmtTimeRange(form.timeStart, form.timeEnd)}
                  </p>
                </div>

                {/* Type */}
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block">Type</label>
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as ActivityType })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-indigo-400 bg-white">
                    {Object.keys(TYPE_STYLES).map(t => (
                      <option key={t} value={t}>
                        {TYPE_STYLES[t as ActivityType].emoji} {t.charAt(0).toUpperCase() + t.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Location */}
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block">Location (optional)</label>
                  <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })}
                    placeholder="e.g. Rue de Rivoli, Paris"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-indigo-400" />
                </div>

                {/* Notes */}
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block">Notes (optional)</label>
                  <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                    placeholder="Booking ref, tips, etc." rows={2}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-indigo-400 resize-none" />
                </div>

                <button onClick={handleSave} disabled={!form.title.trim()}
                  className="w-full py-3.5 rounded-full gradient-primary text-white font-bold text-sm shadow-hero disabled:opacity-40 transition-opacity mt-2 active:scale-95">
                  {isEditing ? 'Save Changes' : `Add to Day ${activeDay + 1}`}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete confirmation sheet */}
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