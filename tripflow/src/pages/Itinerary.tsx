import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useAnimation } from 'framer-motion';
import { useTrip } from '../context/TripContext';
import { tripDays, fmtDate } from '../utils';
import { loadItinerary, saveItinerary } from '../lib/itineraryServiceCached';
import type { ItineraryActivity, ItineraryDay } from '../lib/itineraryService';
import {
  Plus, Clock, MapPin, Trash2, X, Calendar as CalendarIcon,
  Pencil, AlertTriangle, StickyNote, Sparkles, CheckCircle2,
} from 'lucide-react';

// ─── Weather hook ─────────────────────────────────────────────────────────────

type WeatherData = { temp: number; desc: string; icon: string; feels: number; isForecast: boolean } | null;

const WMO_ICONS: Record<number, string> = {
  0:'☀️',1:'🌤️',2:'⛅',3:'☁️',45:'🌫️',48:'🌫️',
  51:'🌦️',53:'🌦️',55:'🌧️',61:'🌧️',63:'🌧️',65:'🌧️',
  71:'🌨️',73:'🌨️',75:'❄️',80:'🌦️',81:'🌧️',82:'⛈️',
  95:'⛈️',96:'⛈️',99:'⛈️',
};

const WMO_DESC: Record<number, string> = {
  0:'Clear sky',1:'Mainly clear',2:'Partly cloudy',3:'Overcast',
  45:'Foggy',48:'Icy fog',51:'Light drizzle',53:'Drizzle',55:'Heavy drizzle',
  61:'Light rain',63:'Rain',65:'Heavy rain',71:'Light snow',73:'Snow',
  75:'Heavy snow',80:'Showers',81:'Heavy showers',82:'Violent showers',
  95:'Thunderstorm',96:'Thunderstorm',99:'Thunderstorm',
};

// Open-Meteo forecast covers ~16 days ahead. Past dates need the archive API.
const FORECAST_HORIZON_DAYS = 16;
const weatherCache = new Map<string, WeatherData>();
function useWeather(destination: string, targetDate: string): WeatherData {
  const cacheKey = `${destination}|${targetDate}`;
  const [weather, setWeather] = useState<WeatherData>(() => weatherCache.get(cacheKey) ?? null);

  useEffect(() => {
    if (!destination || !targetDate) return;
    // Serve from cache immediately — past weather never changes
    const cached = weatherCache.get(cacheKey);
    if (cached !== undefined) {
      setWeather(cached);
      return;
    }

    let cancelled = false;
    // Don't clear existing weather while fetching — avoids flicker on tab revisit
    const city = destination.split(',')[0].trim();
    const today = todayDate();
    const daysFromToday = Math.round(
      (new Date(targetDate).getTime() - new Date(today).getTime()) / 86400000
    );
    const isPast = daysFromToday < 0;
    const beyondForecast = daysFromToday > FORECAST_HORIZON_DAYS;

    fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`)
      .then(r => r.json())
      .then(geo => {
        if (cancelled || !geo.results?.length) return null;
        const { latitude, longitude } = geo.results[0];
        if (beyondForecast) return null;
        if (isPast) {
          return fetch(
            `https://archive-api.open-meteo.com/v1/archive?latitude=${latitude}&longitude=${longitude}` +
            `&start_date=${targetDate}&end_date=${targetDate}` +
            `&daily=temperature_2m_max,temperature_2m_min,apparent_temperature_max,weathercode` +
            `&timezone=auto`
          );
        }
        return fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
          `&start_date=${targetDate}&end_date=${targetDate}` +
          `&daily=temperature_2m_max,temperature_2m_min,apparent_temperature_max,weathercode` +
          `&timezone=auto`
        );
      })
      .then(r => r ? r.json() : null)
      .then(data => {
        if (cancelled || !data?.daily) return;
        const d = data.daily;
        if (!d.time?.length) return;
        const code: number = d.weathercode[0];
        const max: number = d.temperature_2m_max[0];
        const min: number = d.temperature_2m_min[0];
        const feels: number = d.apparent_temperature_max?.[0] ?? max;
        const result: WeatherData = {
          temp:  Math.round((max + min) / 2),
          feels: Math.round(feels),
          icon:  WMO_ICONS[code] ?? '🌡️',
          desc:  WMO_DESC[code]  ?? 'Unknown',
          isForecast: !isPast,
        };
        weatherCache.set(cacheKey, result); // cache it permanently for this session
        setWeather(result);
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [cacheKey, destination, targetDate]);

  return weather;
}

// ─── Category icons ───────────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  flight: (
    <svg viewBox="0 0 24 24" fill="white" width="16" height="16">
      <path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2 1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z"/>
    </svg>
  ),
  transport: (
    <svg viewBox="0 0 24 24" fill="white" width="16" height="16">
      <path d="M12 2c-4 0-8 .5-8 4v9.5A2.5 2.5 0 0 0 6.5 18l-1.5 1.5v.5h2l2-2h6l2 2h2v-.5L17.5 18a2.5 2.5 0 0 0 2.5-2.5V6c0-3.5-4-4-8-4zm-3.5 13a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm7 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zM4 10V6h16v4H4z"/>
    </svg>
  ),
  hotel: (
    <svg viewBox="0 0 24 24" fill="white" width="16" height="16">
      <path d="M7 13c1.66 0 3-1.34 3-3S8.66 7 7 7s-3 1.34-3 3 1.34 3 3 3zm12-6h-8v7H3V5H1v15h2v-3h18v3h2v-9a4 4 0 0 0-4-4z"/>
    </svg>
  ),
  sightseeing: (
    <svg viewBox="0 0 24 24" fill="white" width="16" height="16">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 0 1 9.5 9 2.5 2.5 0 0 1 12 6.5 2.5 2.5 0 0 1 14.5 9a2.5 2.5 0 0 1-2.5 2.5z"/>
    </svg>
  ),
  food: (
    <svg viewBox="0 0 24 24" fill="white" width="16" height="16">
      <path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z"/>
    </svg>
  ),
  cafe: (
    <svg viewBox="0 0 24 24" fill="white" width="16" height="16">
      <path d="M20 3H4v10c0 2.21 1.79 4 4 4h6c2.21 0 4-1.79 4-4v-3h2c1.11 0 2-.89 2-2V5a2 2 0 0 0-2-2zm0 5h-2V5h2v3zM4 19h16v2H4z"/>
    </svg>
  ),
  shopping: (
    <svg viewBox="0 0 24 24" fill="white" width="16" height="16">
      <path d="M19 6h-2a5 5 0 0 0-10 0H5a2 2 0 0 0-2 2l-1 13h20L21 8a2 2 0 0 0-2-2zm-7-3a3 3 0 0 1 3 3H9a3 3 0 0 1 3-3zm0 10a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"/>
    </svg>
  ),
  entertainment: (
    <svg viewBox="0 0 24 24" fill="white" width="16" height="16">
      <path d="M18 3v2h-2V3H8v2H6V3H4v18h2v-2h2v2h8v-2h2v2h2V3h-2zM8 17H6v-2h2v2zm0-4H6v-2h2v2zm0-4H6V7h2v2zm10 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2z"/>
    </svg>
  ),
  photo: (
    <svg viewBox="0 0 24 24" fill="white" width="16" height="16">
      <path d="M12 15.2A3.2 3.2 0 0 1 8.8 12 3.2 3.2 0 0 1 12 8.8 3.2 3.2 0 0 1 15.2 12 3.2 3.2 0 0 1 12 15.2zM9 2L7.17 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3.17L15 2H9z"/>
    </svg>
  ),
  custom: (
    <svg viewBox="0 0 24 24" fill="white" width="16" height="16">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
  ),
};

// ─── Category system ──────────────────────────────────────────────────────────

type CategoryKey =
  | 'sightseeing' | 'food' | 'cafe' | 'shopping'
  | 'flight' | 'transport' | 'hotel' | 'entertainment'
  | 'photo' | 'custom';

const CATEGORIES: Record<CategoryKey, { emoji: string; label: string; bg: string; text: string; badge: string; nodeGradient: string }> = {
  sightseeing:   { emoji: '🗺️', label: 'Sightseeing',   bg: 'bg-sky-50',     text: 'text-sky-600',     badge: 'bg-sky-100 text-sky-700',        nodeGradient: 'linear-gradient(135deg,#38bdf8,#0284c7)' },
  food:          { emoji: '🍽️', label: 'Food',          bg: 'bg-orange-50',  text: 'text-orange-500',  badge: 'bg-orange-100 text-orange-700',   nodeGradient: 'linear-gradient(135deg,#fb923c,#ea580c)' },
  cafe:          { emoji: '☕',  label: 'Cafe',          bg: 'bg-purple-50',  text: 'text-purple-500',  badge: 'bg-purple-100 text-purple-700',   nodeGradient: 'linear-gradient(135deg,#c084fc,#9333ea)' },
  shopping:      { emoji: '🛍️', label: 'Shopping',      bg: 'bg-pink-50',    text: 'text-pink-500',    badge: 'bg-pink-100 text-pink-700',       nodeGradient: 'linear-gradient(135deg,#f472b6,#db2777)' },
  flight:        { emoji: '✈️', label: 'Flight',        bg: 'bg-blue-50',    text: 'text-blue-500',    badge: 'bg-blue-100 text-blue-700',       nodeGradient: 'linear-gradient(135deg,#7C5CFF,#8B5CF6)' },
  transport:     { emoji: '🚆', label: 'Transport',     bg: 'bg-teal-50',    text: 'text-teal-500',    badge: 'bg-teal-100 text-teal-700',       nodeGradient: 'linear-gradient(135deg,#2dd4bf,#0d9488)' },
  hotel:         { emoji: '🏨', label: 'Hotel',         bg: 'bg-violet-50',  text: 'text-violet-500',  badge: 'bg-violet-100 text-violet-700',   nodeGradient: 'linear-gradient(135deg,#a78bfa,#7c3aed)' },
  entertainment: { emoji: '🎡', label: 'Entertainment', bg: 'bg-rose-50',    text: 'text-rose-500',    badge: 'bg-rose-100 text-rose-700',       nodeGradient: 'linear-gradient(135deg,#fb7185,#e11d48)' },
  photo:         { emoji: '📸', label: 'Photo Spot',    bg: 'bg-fuchsia-50', text: 'text-fuchsia-500', badge: 'bg-fuchsia-100 text-fuchsia-700', nodeGradient: 'linear-gradient(135deg,#e879f9,#c026d3)' },
  custom:        { emoji: '🌸', label: 'Custom',        bg: 'bg-lime-50',    text: 'text-lime-600',    badge: 'bg-lime-100 text-lime-700',       nodeGradient: 'linear-gradient(135deg,#a3e635,#65a30d)' },
};

type ActivityStatus = 'upcoming' | 'inprogress' | 'completed';

const STATUS_STYLES: Record<ActivityStatus, { label: string; pill: string }> = {
  upcoming:   { label: '✨ Upcoming',    pill: 'bg-violet-100 text-violet-600'   },
  inprogress: { label: '🟣 In Progress', pill: 'bg-pink-100 text-pink-600'       },
  completed:  { label: '✓ Completed',    pill: 'bg-emerald-100 text-emerald-600' },
};

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAY_LONG  = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ─── Extended activity type ───────────────────────────────────────────────────

type RichActivity = ItineraryActivity & {
  timeEnd?:  string;
  category?: CategoryKey;
  status?:   ActivityStatus;
  notes?:    string;
  location?: string;
  dateEnd?:  string;
  isPinned?: boolean;
};

// ─── Time / date helpers ──────────────────────────────────────────────────────

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

function addDays(dateStr: string, n: number) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function detectStatus(activity: RichActivity, dayDate: string): ActivityStatus {
  const today = todayDate();
  // Past days always auto-complete — ignore manual overrides
  if (dayDate < today) return 'completed';
  // For today/future, respect manual overrides only
  if (activity.status === 'completed' || activity.status === 'upcoming') return activity.status;
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

function getConflictingActivity(
  activity: RichActivity,
  allActivities: RichActivity[]
): RichActivity | null {
  const aEnd = activity.timeEnd ?? activity.time;
  for (const other of allActivities) {
    if (other.id === activity.id) continue;
    const otherEnd = other.timeEnd ?? other.time;
    if (activity.time < otherEnd && aEnd > other.time) return other;
  }
  return null;
}

// ─── Pinned activity builders ─────────────────────────────────────────────────

function buildDepartureActivity(destination: string): RichActivity {
  return {
    id: '__departure__', time: '08:00', timeEnd: '10:00',
    title: `Departure to ${destination}`, category: 'flight',
    type: 'flight' as unknown as ItineraryActivity['type'],
    isPinned: true,
    notes: 'Edit to add flight details, departure time, and airport info.',
  };
}

function buildReturnActivity(destination: string): RichActivity {
  return {
    id: '__return__', time: '10:00', timeEnd: '12:00',
    title: `Return from ${destination}`, category: 'flight',
    type: 'flight' as unknown as ItineraryActivity['type'],
    isPinned: true,
    notes: 'Edit to add your return flight details and airport info.',
  };
}

function injectPinnedActivities(days: ItineraryDay[], destination: string): ItineraryDay[] {
  if (!days.length) return days;
  return days.map((d, i) => {
    let acts = [...d.activities] as RichActivity[];
    if (i === 0 && !acts.find(a => a.id === '__departure__')) {
      acts = [buildDepartureActivity(destination), ...acts];
    }
    if (i === days.length - 1 && !acts.find(a => a.id === '__return__')) {
      acts = [...acts, buildReturnActivity(destination)];
    }
    return { ...d, activities: acts };
  });
}

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

// ─── Form state ───────────────────────────────────────────────────────────────

type FormState = {
  timeStart: string; timeEnd: string; title: string;
  location: string; category: CategoryKey; notes: string;
  multiDay: boolean; dateEnd: string;
};

const BLANK_FORM: FormState = {
  timeStart: '09:00', timeEnd: '10:00', title: '',
  location: '', category: 'sightseeing', notes: '',
  multiDay: false, dateEnd: '',
};

// ─── Day Progress + Weather ───────────────────────────────────────────────────

function DayProgress({ total, completed, destination, date }: { total: number; completed: number; destination: string; date: string }) {
  const pct     = total === 0 ? 0 : Math.round((completed / total) * 100);
  const weather = useWeather(destination, date);

  const today = todayDate();
  const daysOut = Math.round((new Date(date).getTime() - new Date(today).getTime()) / 86400000);
  const tooFarOut = daysOut > 16;

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 sm:mx-6 mb-4 rounded-3xl overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #ec4899 100%)' }}
    >
      <div className="relative p-4 sm:p-5 overflow-hidden">
        <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute -bottom-8 left-6 w-20 h-20 rounded-full bg-white/[0.06] pointer-events-none" />
        <div className="relative flex items-start justify-between mb-3">
          <div>
            <p className="text-white/70 text-[11px] font-semibold mb-0.5 uppercase tracking-wide">Daily Progress</p>
            <p className="text-white text-xl font-black">{completed} / {total}</p>
            <p className="text-white/60 text-[11px]">
              {pct === 100 ? "You've completed today's plan! 🎉" : 'activities completed'}
            </p>
          </div>
          <div className="flex flex-col items-end gap-0.5">
            {tooFarOut ? (
              <p className="text-white/50 text-[10px] text-right max-w-[110px] leading-tight">
                Forecast not yet available
              </p>
            ) : weather ? (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="text-2xl leading-none">{weather.icon}</span>
                  <span className="text-white text-2xl font-black leading-none">{weather.temp}°</span>
                </div>
                <p className="text-white/70 text-[10px] font-semibold text-right leading-tight">{weather.desc}</p>
                <p className="text-white/50 text-[9px] text-right">
                  {weather.isForecast ? 'Feels' : 'Felt'} {weather.feels}°C
                </p>
              </>
            ) : (
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white/80 animate-spin" />
                <span className="text-white/50 text-[10px]">Weather…</span>
              </div>
            )}
          </div>
        </div>
        <div className="h-2.5 rounded-full bg-white/20 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg,#ffd6c2,#ffb7e1)' }}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.9, ease: [0.22, 0.68, 0, 1.2] }}
          />
        </div>
        <p className="relative text-white/40 text-[10px] font-semibold mt-2 uppercase tracking-wider">
          📍 {destination}
        </p>
      </div>
    </motion.div>
  );
}

// ─── Category badge ───────────────────────────────────────────────────────────

function CategoryBadge({ cat }: { cat: CategoryKey }) {
  const c = CATEGORIES[cat];
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${c.badge}`}>
      {c.emoji} {c.label}
    </span>
  );
}

// ─── Timeline Node ────────────────────────────────────────────────────────────

function TimelineNode({ activity, status }: { activity: RichActivity; status: ActivityStatus }) {
  const catKey = activity.category ?? 'custom';
  const icon   = CATEGORY_ICONS[catKey] ?? CATEGORY_ICONS['custom'];

  return (
    <motion.div
      className="flex-shrink-0 flex items-center justify-center rounded-full"
      style={{
        width: 36,
        height: 36,
        background: '#7C5CFF',
        border: '3px solid #f3f0ff',
        boxShadow:
          status === 'inprogress'
            ? '0 0 0 3px rgba(124,92,255,0.28), 0 4px 14px rgba(124,92,255,0.32)'
            : status === 'completed'
            ? '0 0 0 3px rgba(52,211,153,0.30), 0 3px 10px rgba(0,0,0,0.10)'
            : '0 0 0 3px rgba(124,92,255,0.14), 0 3px 10px rgba(124,92,255,0.18)',
        zIndex: 2,
      }}
      animate={status === 'inprogress' ? { scale: [1, 1.1, 1] } : { scale: 1 }}
      transition={status === 'inprogress' ? { repeat: Infinity, duration: 1.8, ease: 'easeInOut' } : {}}
    >
      {status === 'completed'
        ? <svg viewBox="0 0 24 24" fill="white" width="15" height="15"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
        : icon
      }
    </motion.div>
  );
}

// ─── Long-press context menu ──────────────────────────────────────────────────

function ContextMenu({
  x, y, isDone, isPinned, onMarkDone, onEdit, onDelete, onClose,
}: {
  x: number; y: number; isDone: boolean; isPinned: boolean;
  onMarkDone: () => void; onEdit: () => void; onDelete: () => void; onClose: () => void;
}) {
  const menuW = 200;
  const menuH = isPinned ? 100 : 145;
  const clampedX = Math.min(x, window.innerWidth - menuW - 12);
  const clampedY = Math.min(y, window.innerHeight - menuH - 12);

  return (
    <>
      <motion.div
        className="fixed inset-0 z-[70]"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="fixed z-[80] bg-white rounded-2xl shadow-2xl shadow-black/20 overflow-hidden"
        style={{ left: clampedX, top: clampedY, width: menuW, border: '0.5px solid rgba(124,92,255,0.15)' }}
        initial={{ opacity: 0, scale: 0.85, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.85, y: -8 }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      >
        <button
          onClick={() => { onMarkDone(); onClose(); }}
          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-violet-50 transition-colors"
        >
          <CheckCircle2 size={16} className={isDone ? 'text-slate-300' : 'text-emerald-500'} />
          {isDone ? 'Mark as undone' : 'Mark as done'}
        </button>
        <div className="h-px bg-slate-100 mx-3" />
        <button
          onClick={() => { onEdit(); onClose(); }}
          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-violet-50 transition-colors"
        >
          <Pencil size={16} className="text-violet-500" />
          Edit activity
        </button>
        {!isPinned && (
          <>
            <div className="h-px bg-slate-100 mx-3" />
            <button
              onClick={() => { onDelete(); onClose(); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-rose-500 hover:bg-rose-50 transition-colors"
            >
              <Trash2 size={16} />
              Delete activity
            </button>
          </>
        )}
      </motion.div>
    </>
  );
}

// ─── Swipeable Activity Card ──────────────────────────────────────────────────

const SWIPE_THRESHOLD = 80;

function ActivityCard({
  activity, dayDate, isDayInPast, onEdit, onDelete, onToggle, allActivities,
}: {
  activity:      RichActivity;
  dayDate:       string;
  isDayInPast:   boolean;
  onEdit:        () => void;
  onDelete:      () => void;
  onToggle:      () => void;
  allActivities: RichActivity[];
}) {
  const cat        = CATEGORIES[activity.category ?? 'custom'];
  const status     = detectStatus(activity, dayDate);
  const st         = STATUS_STYLES[status];
  const isDone     = status === 'completed';
  const isMultiDay = !!activity.dateEnd && activity.dateEnd !== dayDate;
  const isPinned   = !!activity.isPinned;

  const conflictWith = getConflictingActivity(activity, allActivities);
  const hasOverlap   = conflictWith !== null;

  const x            = useMotionValue(0);
  const controls     = useAnimation();
  const swipeBg      = useTransform(x, [0, SWIPE_THRESHOLD], ['rgba(124,92,255,0)', 'rgba(52,211,153,0.18)']);
  const checkOpacity = useTransform(x, [0, SWIPE_THRESHOLD * 0.5, SWIPE_THRESHOLD], [0, 0.4, 1]);
  const swipeLocked  = useRef(false);

  const shakeControls = useAnimation();
  const hasShaken     = useRef(false);

  useEffect(() => {
    if (hasOverlap && !hasShaken.current) {
      hasShaken.current = true;
      const timer = setTimeout(() => {
        shakeControls.start({
          x: [0, -8, 8, -6, 6, -3, 3, 0],
          transition: { duration: 0.55, ease: 'easeInOut' },
        });
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [hasOverlap, shakeControls]);

  useEffect(() => {
    if (!hasOverlap) hasShaken.current = false;
  }, [hasOverlap]);

  const longPressTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const isDragging = useRef(false);

  const startLongPress = (e: React.TouchEvent | React.MouseEvent) => {
    isDragging.current = false;
    longPressTimer.current = setTimeout(() => {
      if (isDragging.current) return;
      if ('vibrate' in navigator) navigator.vibrate(30);
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
      setMenuPos({ x: clientX, y: clientY });
    }, 500);
  };

  const cancelLongPress = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const onDragStart = () => {
    isDragging.current = true;
    cancelLongPress();
  };

  const onDragEnd = async (_: unknown, info: { offset: { x: number } }) => {
    if (info.offset.x >= SWIPE_THRESHOLD && !swipeLocked.current) {
      swipeLocked.current = true;
      await controls.start({ x: 120, transition: { duration: 0.15 } });
      onToggle();
      await controls.start({ x: 0, transition: { type: 'spring', stiffness: 500, damping: 30 } });
      swipeLocked.current = false;
    } else {
      controls.start({ x: 0, transition: { type: 'spring', stiffness: 500, damping: 30 } });
    }
  };

  return (
    <motion.div
      className="relative"
      animate={shakeControls}
      layout
    >
      {/* Timeline node */}
      <div
        className="absolute flex items-center justify-center"
        style={{ left: 0, top: 12, width: 36, zIndex: 2 }}
      >
        <TimelineNode activity={activity} status={status} />
      </div>

      {/* Swipe-to-done background */}
      <motion.div
        className="absolute inset-y-0 rounded-3xl overflow-hidden pointer-events-none"
        style={{ left: 48, right: 0, background: swipeBg }}
      >
        <motion.div
          className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2"
          style={{ opacity: checkOpacity }}
        >
          <CheckCircle2 size={20} className="text-emerald-500" />
          <span className="text-xs font-black text-emerald-600">{isDone ? 'Undo' : 'Done!'}</span>
        </motion.div>
      </motion.div>

      {/* Draggable card */}
      <motion.div
        drag={isDayInPast ? false : 'x'}
        dragConstraints={{ left: 0, right: 140 }}
        dragElastic={{ left: 0, right: 0.3 }}
        style={{ x }}
        animate={controls}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onTouchStart={startLongPress}
        onTouchEnd={cancelLongPress}
        onTouchMove={cancelLongPress}
        onMouseDown={startLongPress}
        onMouseUp={cancelLongPress}
        onMouseLeave={cancelLongPress}
        className={`ml-[48px] min-w-0 rounded-3xl border p-3.5 sm:p-4 transition-all duration-300 overflow-hidden cursor-grab active:cursor-grabbing select-none ${
          hasOverlap
            ? 'bg-white border-rose-200 shadow-[0_4px_20px_rgba(239,68,68,0.15)]'
            : isDone
            ? 'bg-white/60 border-slate-100 opacity-60'
            : isPinned
            ? 'bg-white border-violet-100 shadow-[0_4px_20px_rgba(124,92,255,0.10)]'
            : 'bg-white border-slate-100 shadow-[0_4px_20px_rgba(124,92,255,0.07)]'
        }`}
        whileHover={{ y: isDayInPast ? 0 : -2, boxShadow: hasOverlap ? '0 8px 28px rgba(239,68,68,0.20)' : '0 8px 28px rgba(124,92,255,0.13)' }}
      >
        {hasOverlap && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="flex items-center gap-2 mb-2.5 px-2.5 py-1.5 rounded-xl"
            style={{ background: 'rgba(254,226,226,0.80)' }}
          >
            <AlertTriangle size={12} className="text-rose-500 flex-shrink-0" />
            <p className="text-[10px] font-bold text-rose-600 leading-tight">
              Time clash with <span className="font-black">"{conflictWith?.title}"</span>
            </p>
          </motion.div>
        )}

        {isPinned && (
          <div className="flex items-center gap-1 mb-2">
            <span className="text-[10px] font-black text-violet-500 bg-violet-50 px-2 py-0.5 rounded-full border border-violet-100">
              📌 Auto-scheduled · long-press to edit
            </span>
          </div>
        )}

        <div className="flex items-start gap-3">
          <div className={`w-8 h-8 rounded-2xl flex items-center justify-center text-sm flex-shrink-0 ${cat.bg}`}>
            {cat.emoji}
          </div>
          <div className="min-w-0 flex-1">
            {isMultiDay && (
              <div className="flex items-center gap-1.5 text-[10px] font-black text-violet-500 mb-1 min-w-0">
                <CalendarIcon size={10} className="flex-shrink-0" />
                <span className="truncate">{fmtDate(dayDate)} – {fmtDate(activity.dateEnd as string)}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 mb-0.5">
              <Clock size={10} className="flex-shrink-0" />
              {fmtTimeRange(activity.time, activity.timeEnd)}
            </div>
            <h3
              className={`text-sm font-black text-slate-900 break-words leading-snug ${isDone ? 'line-through text-slate-400' : ''}`}
              style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
            >
              {activity.title}
            </h3>
            {activity.location && (
              <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5 min-w-0">
                <MapPin size={10} className="flex-shrink-0" />
                <span className="truncate min-w-0">{activity.location}</span>
              </div>
            )}
            {activity.notes && (
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed break-words">{activity.notes}</p>
            )}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${st.pill}`}>
                {st.label}
              </span>
              <CategoryBadge cat={activity.category ?? 'custom'} />
            </div>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {menuPos && (
          <ContextMenu
            x={menuPos.x}
            y={menuPos.y}
            isDone={isDone}
            isPinned={isPinned}
            onMarkDone={onToggle}
            onEdit={onEdit}
            onDelete={onDelete}
            onClose={() => setMenuPos(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Day notes ────────────────────────────────────────────────────────────────

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

// ─── Daily summary ────────────────────────────────────────────────────────────

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
          { label: 'Activities', value: String(total),             sub: `${completed} done` },
          { label: 'Remaining',  value: String(total - completed), sub: 'to go' },
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

// ─── Empty state ──────────────────────────────────────────────────────────────

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

// ─── Delete confirm sheet ─────────────────────────────────────────────────────

function DeleteConfirmSheet({ title, onConfirm, onCancel }: { title: string; onConfirm: () => void; onCancel: () => void }) {
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

// ─── Activity modal ───────────────────────────────────────────────────────────

function ActivityModal({
  isEditing, activeDay, dayWeekday, dayDateStr,
  form, setForm, onSave, onClose, conflict, startOptions, endOptions,
}: {
  isEditing: boolean; activeDay: number; dayWeekday: string; dayDateStr: string;
  form: FormState; setForm: React.Dispatch<React.SetStateAction<FormState>>;
  onSave: () => void; onClose: () => void; conflict: RichActivity | null;
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
        role="dialog" aria-modal="true"
        aria-label={isEditing ? 'Edit activity' : 'Add activity'}
        className="w-full max-w-screen-md bg-white rounded-t-3xl p-5 sm:p-6 pb-8 max-h-[92vh] overflow-y-auto"
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        onClick={e => e.stopPropagation()}
      >
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

          <div>
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/70 border border-slate-200">
              <div className="pr-3">
                <p className="text-xs font-bold text-slate-600">Spans multiple days</p>
                <p className="text-[10px] text-slate-400 mt-0.5">e.g. a hotel stay or a flight that lands the next day</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={form.multiDay}
                onClick={() => setForm(f => {
                  const turningOn = !f.multiDay;
                  return { ...f, multiDay: turningOn, dateEnd: turningOn ? addDays(dayDateStr, 1) : dayDateStr };
                })}
                className={`w-11 h-6 rounded-full relative flex-shrink-0 transition-colors ${form.multiDay ? 'bg-violet-500' : 'bg-slate-200'}`}
              >
                <motion.span
                  className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow"
                  animate={{ x: form.multiDay ? 20 : 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </button>
            </div>
            <AnimatePresence initial={false}>
              {form.multiDay && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-3">
                    <label className="text-xs font-bold text-slate-500 mb-1.5 block" htmlFor="act-date-end">Ends on</label>
                    <input
                      id="act-date-end"
                      type="date"
                      min={dayDateStr}
                      value={form.dateEnd || dayDateStr}
                      onChange={e => setForm(f => ({ ...f, dateEnd: e.target.value }))}
                      className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-violet-400 bg-slate-50/50 transition-colors"
                    />
                    <p className="text-[11px] text-violet-500 font-bold mt-1.5 text-right">
                      {fmtDate(dayDateStr)} – {fmtDate(form.dateEnd || dayDateStr)}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

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
      <polygon points="8,20 5,4 18,14" fill="#f9d4ec" />
      <polygon points="9.5,18 7,7 16,13" fill="#f0a0cc" />
      <polygon points="40,20 43,4 30,14" fill="#f9d4ec" />
      <polygon points="38.5,18 41,7 32,13" fill="#f0a0cc" />
      <ellipse cx="24" cy="30" rx="18" ry="16" fill="#f9d4ec" />
      <ellipse cx="12" cy="34" rx="4.5" ry="3" fill="#ffb7d5" opacity="0.6" />
      <ellipse cx="36" cy="34" rx="4.5" ry="3" fill="#ffb7d5" opacity="0.6" />
      <circle cx="18" cy="27" r="4" fill="white" />
      <circle cx="30" cy="27" r="4" fill="white" />
      <circle cx="18" cy="27" r="2.5" fill="#7C5CFF" />
      <circle cx="30" cy="27" r="2.5" fill="#7C5CFF" />
      <circle cx="19.2" cy="25.8" r="1" fill="white" />
      <circle cx="31.2" cy="25.8" r="1" fill="white" />
      <ellipse cx="24" cy="32" rx="1.8" ry="1.3" fill="#e87ab0" />
      <path d="M21.5 33.5 Q24 36.5 26.5 33.5" stroke="#e87ab0" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      <line x1="5"  y1="31" x2="19" y2="32.5" stroke="#d4a0c4" strokeWidth="0.9" strokeLinecap="round" />
      <line x1="5"  y1="34" x2="19" y2="33.5" stroke="#d4a0c4" strokeWidth="0.9" strokeLinecap="round" />
      <line x1="43" y1="31" x2="29" y2="32.5" stroke="#d4a0c4" strokeWidth="0.9" strokeLinecap="round" />
      <line x1="43" y1="34" x2="29" y2="33.5" stroke="#d4a0c4" strokeWidth="0.9" strokeLinecap="round" />
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

// ─── Main Itinerary component ─────────────────────────────────────────────────

export default function Itinerary() {
  const { trip } = useTrip();

  const [days,          setDays]          = useState<ItineraryDay[]>([]);
  const [dbLoading,     setDbLoading]     = useState(true);
  const [activeDay,     setActiveDay]     = useState(0);
  const [dayNotes,      setDayNotes]      = useState<Record<number, string>>({});
  const [saving,        setSaving]        = useState(false);
  const [saveError,     setSaveError]     = useState<string | null>(null);
  const [modalMode,     setModalMode]     = useState<null | 'add' | string>(null);
  const [form,          setForm]          = useState<FormState>(BLANK_FORM);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // ── FIX: track a render key per day so we can force-remount the
  //    AnimatePresence children when switching tabs, bypassing any
  //    stale internal Framer Motion exit/enter state. ────────────────────────
  const [dayRenderKey, setDayRenderKey] = useState(0);

  const isSavingRef = useRef(false);

  const hasAutoSelected = useRef(false);

  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!trip) { setDbLoading(false); return; }
    hasAutoSelected.current = false;

    const cancel = loadItinerary(trip.id, {
      onCached: (cached) => {
        if (cached?.length) {
          setDays(injectPinnedActivities(cached, trip.destination));
          setDbLoading(false);
        }
      },
      onFresh: (fresh) => {
        // ── FIX: don't overwrite local state while a save is in flight ──
        if (isSavingRef.current) return;
        const base = fresh.length ? fresh : buildEmptyDays(trip.startDate, trip.endDate);
        setDays(injectPinnedActivities(base, trip.destination));
        setDbLoading(false);
      },
      onError: () => {
        setDbLoading(prev => {
          if (prev) {
            setDays(injectPinnedActivities(
              buildEmptyDays(trip.startDate, trip.endDate),
              trip.destination
            ));
          }
          return false;
        });
      },
    });

    return cancel;
  }, [trip]);

useEffect(() => {
  if (!days.length) return;
  const today = todayDate();
  const idx = days.findIndex(d => d.date === today);
  setActiveDay(idx >= 0 ? idx : 0);
}, [trip?.id]);

  // ── FIX: bump the render key whenever activeDay changes so the
  //    card list fully remounts, clearing any stale AnimatePresence state ──
  const prevActiveDayRef = useRef(activeDay);
  useEffect(() => {
    if (prevActiveDayRef.current !== activeDay) {
      prevActiveDayRef.current = activeDay;
      setDayRenderKey(k => k + 1);
    }
  }, [activeDay]);

  const totalActivities = useMemo(
    () => days.reduce((s, d) => s + d.activities.length, 0), [days]
  );

  const day        = days[activeDay] as (ItineraryDay & { activities: RichActivity[] }) | undefined;
  const dayWeekday = day ? WEEKDAY_LONG[new Date(day.date).getDay()] : '';
  const isDayInPast = day ? isDayPast(day.date) : false;
  const isToday    = day?.date === todayDate();
  const minStart   = isToday ? nowTime() : undefined;
  const startOpts  = buildTimeOptions(minStart);
  const endOpts    = buildTimeOptions(form.timeStart);
  const isEditing  = modalMode !== null && modalMode !== 'add';

  const completedCount = useMemo(() => {
    if (!day) return 0;
    return (day.activities as RichActivity[]).filter(
      a => detectStatus(a, day.date) === 'completed'
    ).length;
  }, [day]);

  const conflict = useMemo((): RichActivity | null => {
    if (modalMode === null || !day) return null;
    const excludeId = isEditing ? modalMode : undefined;
    return hasConflict(form.timeStart, form.timeEnd, day.activities as RichActivity[], excludeId);
  }, [form.timeStart, form.timeEnd, day, modalMode, isEditing]);

  const stripPinned = (ds: ItineraryDay[]): ItineraryDay[] =>
    ds.map(d => ({
      ...d,
      activities: d.activities.filter(
        (a: ItineraryActivity) => a.id !== '__departure__' && a.id !== '__return__'
      ),
    }));

  const persist = useCallback(async (next: ItineraryDay[]) => {
    const withPinned = trip ? injectPinnedActivities(next, trip.destination) : next;
    setDays(withPinned);
    if (!trip) return;
    isSavingRef.current = true;
    setSaving(true);
    setSaveError(null);
    const result = await saveItinerary(trip.id, stripPinned(next));
    isSavingRef.current = false;
    setSaving(false);
    if (!result.success) {
      setSaveError(result.error ?? 'Failed to save. Please try again.');
    }
  }, [trip]);

  const openAddModal = () => {
    const slot = startOpts.find(s => !s.disabled)?.value ?? '09:00';
    const [sh, sm] = slot.split(':').map(Number);
    const endH = (sh + 1) % 24;
    setForm({
      ...BLANK_FORM,
      timeStart: slot,
      timeEnd: `${String(endH).padStart(2, '0')}:${String(sm).padStart(2, '0')}`,
      multiDay: false,
      dateEnd: day?.date ?? '',
    });
    setModalMode('add');
  };

  const openEditModal = (activity: RichActivity) => {
    const validCategories = Object.keys(CATEGORIES) as CategoryKey[];
    const resolvedCategory: CategoryKey =
      activity.category && validCategories.includes(activity.category)
        ? activity.category
        : validCategories.includes(activity.type as unknown as CategoryKey)
        ? (activity.type as unknown as CategoryKey)
        : 'sightseeing';

    const hasDateRange = !!activity.dateEnd && activity.dateEnd !== day?.date;
    setForm({
      timeStart: activity.time,
      timeEnd:   activity.timeEnd ?? activity.time,
      title:     activity.title,
      location:  activity.location ?? '',
      category:  resolvedCategory,
      notes:     activity.notes ?? '',
      multiDay:  hasDateRange,
      dateEnd:   hasDateRange ? (activity.dateEnd as string) : (day?.date ?? ''),
    });
    setModalMode(activity.id);
  };

  const handleSave = () => {
    if (!form.title.trim()) return;
    const dayDateStr = day?.date ?? '';
    const base = {
      time:     form.timeStart,
      timeEnd:  form.timeEnd,
      title:    form.title.trim(),
      location: form.location.trim() || undefined,
      category: form.category,
      type:     form.category as unknown as ItineraryActivity['type'],
      notes:    form.notes.trim() || undefined,
      dateEnd:  form.multiDay && form.dateEnd && form.dateEnd !== dayDateStr
        ? form.dateEnd
        : undefined,
    };

    const next = days.map((d, i) => {
      if (i !== activeDay) return d;
      let acts: RichActivity[];
      if (modalMode === 'add') {
        acts = [...(d.activities as RichActivity[]), { id: crypto.randomUUID(), ...base }];
      } else {
        acts = (d.activities as RichActivity[]).map(a =>
          a.id === modalMode ? { ...a, ...base } : a
        );
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
        activities: (d.activities as RichActivity[]).map(a => {
          if (a.id !== activityId) return a;
          const effective = detectStatus(a, d.date);
          return { ...a, status: (effective === 'completed' ? 'upcoming' : 'completed') as ActivityStatus };
        }),
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
        <motion.div className="text-5xl mb-4" animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 3 }}>
          🗺️
        </motion.div>
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

  // ── Render ──
  return (
    <div
      className="min-h-screen pb-28 w-full overflow-x-hidden"
      style={{ background: 'linear-gradient(160deg, #f8fafc 0%, rgba(237,233,254,0.35) 50%, rgba(253,242,248,0.25) 100%)' }}
    >
      <AnimatePresence>
        {saving && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="fixed top-4 right-16 z-50 bg-violet-50 border border-violet-200 rounded-2xl px-3 py-2 text-xs text-violet-600 font-semibold flex items-center gap-1.5 shadow-sm"
          >
            <div className="w-3 h-3 rounded-full border-2 border-violet-300 border-t-violet-600 animate-spin" />
            Saving…
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {saveError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="fixed top-4 left-4 right-4 z-50 bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3 text-xs text-rose-600 font-semibold flex items-center gap-2 shadow-sm"
          >
            <AlertTriangle size={14} className="flex-shrink-0" />
            Save failed — check your connection and try again.
            <button onClick={() => setSaveError(null)} className="ml-auto text-rose-400 hover:text-rose-600">
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full opacity-[0.13]" style={{ background: '#7C5CFF' }} />
        <div className="absolute top-80 -left-12 w-40 h-40 rounded-full opacity-[0.10]" style={{ background: '#FFB7E1' }} />
        <div className="absolute bottom-40 -right-10 w-32 h-32 rounded-full opacity-[0.08]" style={{ background: '#C7E9FF' }} />
      </div>

      <div className="px-4 sm:px-5 pt-12 pb-4 relative">
        <div className="relative flex items-start justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full mb-2 bg-violet-100 text-violet-600">
              <MapPin size={10} />
              {trip.destination}
            </div>
            <h1 className="text-2xl font-black text-slate-900 mb-0.5 tracking-tight">Itinerary</h1>
            <p className="text-slate-400 text-xs">
              {totalActivities} {totalActivities === 1 ? 'activity' : 'activities'} planned
            </p>
          </div>
          <motion.div
            className="w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden flex-shrink-0 bg-violet-50 border border-violet-100"
            whileHover={{ scale: 1.08 }}
          >
            <KittenAvatar />
          </motion.div>
        </div>
      </div>

      {/* ── Day selector ── */}
      <div className="px-4 sm:px-6 mt-2 mb-4">
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

      {/* ── Day progress ── */}
      {day && day.activities.length > 0 && (
        <DayProgress
          total={day.activities.length}
          completed={completedCount}
          destination={trip.destination}
          date={day.date}
        />
      )}

      {/* ── Day header row ── */}
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

      {/* ── Timeline ── */}
      {/* FIX: key={dayRenderKey} forces a full remount of this section on tab switch,
           clearing stale AnimatePresence enter/exit state that caused cards to be invisible */}
      <div key={dayRenderKey}>
        {!day || day.activities.length === 0 ? (
          <EmptyItinerary isPast={isDayInPast} onAdd={openAddModal} />
        ) : (
          <div className="px-4 sm:px-6">
            <div className="relative">
              <div
                className="absolute inset-y-0 pointer-events-none"
                style={{
                  left: 17,
                  width: 2,
                  borderRadius: 9999,
                  background: 'linear-gradient(180deg, rgba(124,92,255,0.30) 0%, rgba(139,92,246,0.06) 100%)',
                }}
              />
              <div className="space-y-3">
                {(day.activities as RichActivity[]).map(activity => (
                  <ActivityCard
                    key={`${day.date}-${activity.id}`}
                    activity={activity}
                    dayDate={day.date}
                    isDayInPast={isDayInPast}
                    onEdit={() => openEditModal(activity)}
                    onDelete={() => setConfirmDelete(activity.id)}
                    onToggle={() => handleToggle(activity.id)}
                    allActivities={day.activities as RichActivity[]}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

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
            dayDateStr={day?.date ?? ''}
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