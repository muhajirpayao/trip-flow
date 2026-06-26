// src/pages/Itinerary.tsx  (Supabase version)
// ------------------------------------------------------------------
// Drops localStorage calls and uses itineraryService for persistence.
// ------------------------------------------------------------------

import { useState, useMemo, useEffect } from 'react';
import { useTrip } from '../context/TripContext';
import { tripDays, fmtDate } from '../utils';
import { loadItinerary, saveItinerary } from '../lib/itineraryService';
import type { ItineraryActivity, ItineraryDay } from '../lib/itineraryService';
import { Plus, Clock, MapPin, Trash2, X, Calendar as CalendarIcon } from 'lucide-react';

type ActivityType = 'sightseeing' | 'food' | 'transport' | 'lodging' | 'activity' | 'other';
 
const TYPE_STYLES: Record<ActivityType, { color: string; emoji: string }> = {
  sightseeing: { color: 'bg-indigo-50 text-indigo-600',  emoji: '🗺️' },
  food:        { color: 'bg-amber-50 text-amber-600',    emoji: '🍽️' },
  transport:   { color: 'bg-sky-50 text-sky-600',        emoji: '🚗' },
  lodging:     { color: 'bg-violet-50 text-violet-600',  emoji: '🏨' },
  activity:    { color: 'bg-emerald-50 text-emerald-600',emoji: '🎟️' },
  other:       { color: 'bg-rose-50 text-rose-600',      emoji: '📌' },
};

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

export default function Itinerary() {
  const { trip } = useTrip();

  const [days, setDays]           = useState<ItineraryDay[]>([]);
  const [dbLoading, setDbLoading] = useState(true);
  const [activeDay, setActiveDay] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    time: '09:00', title: '', location: '', type: 'sightseeing' as ActivityType, notes: '',
  });

  // Load from Supabase on mount, fall back to empty days
  useEffect(() => {
    if (!trip) { setDbLoading(false); return; }
    loadItinerary(trip.id).then((remote: ItineraryDay[] | null) => {
      if (remote && remote.length) {
        setDays(remote);
      } else {
        setDays(buildEmptyDays(trip.startDate, trip.endDate));
      }
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
    saveItinerary(trip.id, next); // fire-and-forget; localStorage also removed
  };

  const openAddModal = () => {
    setForm({ time: '09:00', title: '', location: '', type: 'sightseeing', notes: '' });
    setShowModal(true);
  };

  const handleAddActivity = () => {
    if (!form.title.trim()) return;
    const newActivity: ItineraryActivity = {
      id:       crypto.randomUUID(),
      time:     form.time,
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
    setShowModal(false);
  };

  const handleDeleteActivity = (dayIdx: number, activityId: string) => {
    const next = days.map((d, i) =>
      i === dayIdx ? { ...d, activities: d.activities.filter((a: ItineraryActivity) => a.id !== activityId) } : d
    );
    persist(next);
  };

  const day = days[activeDay];

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <h1 className="text-2xl font-black text-slate-900 mb-1">Itinerary</h1>
        <p className="text-sm text-slate-500">
          {trip.destination} · {totalActivities} {totalActivities === 1 ? 'activity' : 'activities'} planned
        </p>
      </div>

      {/* Day selector */}
      <div className="px-6 mb-5">
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
          {days.map((d, i) => {
            const dateObj = new Date(d.date);
            const isActive = i === activeDay;
            return (
              <button key={d.date} onClick={() => setActiveDay(i)}
                className={`flex-shrink-0 flex flex-col items-center justify-center w-16 py-2.5 rounded-2xl border transition-all ${
                  isActive ? 'gradient-primary text-white border-transparent shadow-hero'
                           : 'bg-white text-slate-600 border-slate-100 shadow-card'}`}>
                <span className={`text-[10px] font-semibold uppercase ${isActive ? 'text-indigo-100' : 'text-slate-400'}`}>Day {i+1}</span>
                <span className="text-sm font-black mt-0.5">{dateObj.getDate()}</span>
                <span className={`text-[10px] font-medium ${isActive ? 'text-indigo-100' : 'text-slate-400'}`}>
                  {dateObj.toLocaleDateString(undefined, { month: 'short' })}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Day timeline */}
      <div className="px-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-slate-700">
            <CalendarIcon size={15} className="text-indigo-500" />
            <span className="text-sm font-bold">{day ? fmtDate(day.date) : ''}</span>
          </div>
          <button onClick={openAddModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full gradient-primary text-white text-xs font-bold shadow-hero active:scale-95 transition-transform">
            <Plus size={14} /> Add
          </button>
        </div>

        {day && day.activities.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-card py-12 px-6 text-center">
            <div className="text-3xl mb-3">📭</div>
            <p className="text-sm font-semibold text-slate-700 mb-1">Nothing planned yet</p>
            <p className="text-xs text-slate-400">Tap "Add" to schedule your first activity</p>
          </div>
        ) : (
          <div className="relative pl-5">
            <div className="absolute left-[7px] top-2 bottom-2 w-px bg-slate-200" />
            <div className="space-y-3">
              {day?.activities.map((activity: ItineraryActivity) => {
                const style = TYPE_STYLES[activity.type as ActivityType];
                return (
                  <div key={activity.id} className="relative">
                    <div className="absolute -left-5 top-4 w-3.5 h-3.5 rounded-full bg-white border-2 border-indigo-400" />
                    <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-card">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0 ${style.color}`}>
                            {style.emoji}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 mb-0.5">
                              <Clock size={11} /> {activity.time}
                            </div>
                            <h3 className="text-sm font-bold text-slate-900 truncate">{activity.title}</h3>
                            {activity.location && (
                              <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                                <MapPin size={11} /><span className="truncate">{activity.location}</span>
                              </div>
                            )}
                            {activity.notes && <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{activity.notes}</p>}
                          </div>
                        </div>
                        <button onClick={() => handleDeleteActivity(activeDay, activity.id)}
                          className="text-slate-300 hover:text-rose-500 transition-colors flex-shrink-0">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Add Activity Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-[430px] bg-white rounded-t-3xl p-6 pb-8 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black text-slate-900">Add Activity</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1.5 block">Title</label>
                <input autoFocus value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Visit the Louvre"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-indigo-400" />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block">Time</label>
                  <input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-indigo-400" />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block">Type</label>
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as ActivityType })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-indigo-400 bg-white">
                    {Object.keys(TYPE_STYLES).map(t => (
                      <option key={t} value={t}>{TYPE_STYLES[t as ActivityType].emoji} {t.charAt(0).toUpperCase() + t.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1.5 block">Location (optional)</label>
                <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })}
                  placeholder="e.g. Rue de Rivoli, Paris"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-indigo-400" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1.5 block">Notes (optional)</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  placeholder="Booking ref, tips, etc." rows={2}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-indigo-400 resize-none" />
              </div>
              <button onClick={handleAddActivity} disabled={!form.title.trim()}
                className="w-full py-3.5 rounded-full gradient-primary text-white font-bold text-sm shadow-hero disabled:opacity-40 transition-opacity mt-2">
                Add to Day {activeDay + 1}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}