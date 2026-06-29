import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTrip } from '../context/TripContext';
import type { Trip } from '../types';
import OnboardingWizard from '../components/onboarding/OnboardingWizard';
import { useDestinationWeather, getTimeGreeting } from '../hooks/useDestinationWeather';
import { useDestinationPhotos } from '../hooks/useDestinationPhotos';
import { tripDays, fmtDate, fmtShort, fmtCurrency } from '../utils';
import { supabase } from '../lib/supabase';
import {
  Calendar, Wallet, MapPin,
  Plus, ArrowRight, Trash2, Pencil, X, AlertTriangle,
  Star, Plane, WifiOff, Camera, ImageIcon, Upload, Eye, ZoomIn,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
interface TripDocument {
  id: string;
  trip_id: string;
  user_id: string;
  type: string;
  label: string;
  notes?: string;
  file_url?: string;
  created_at?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const QUICK = [
  { icon: Calendar, label: 'Itinerary', to: '/dashboard/itinerary', color: 'bg-indigo-50 text-indigo-600' },
  { icon: Wallet,   label: 'Expenses',  to: '/dashboard/expenses',  color: 'bg-emerald-50 text-emerald-600' },
  { icon: MapPin,   label: 'Places',    to: '/dashboard/places',    color: 'bg-rose-50 text-rose-500' },
];

const TRAVEL_TYPES = ['solo', 'couple', 'family', 'friends'] as const;
type TravelType = typeof TRAVEL_TYPES[number];

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'PHP', 'AUD', 'CAD', 'SGD'];

const DOC_TYPE_META: Record<string, { icon: string; color: string }> = {
  passport:      { icon: '🛂', color: 'bg-blue-50 text-blue-600' },
  visa:          { icon: '📋', color: 'bg-amber-50 text-amber-600' },
  flight_ticket: { icon: '✈️', color: 'bg-violet-50 text-violet-600' },
  hotel_booking: { icon: '🏨', color: 'bg-emerald-50 text-emerald-600' },
  boarding_pass: { icon: '🎫', color: 'bg-rose-50 text-rose-500' },
  other:         { icon: '📄', color: 'bg-slate-100 text-slate-500' },
};

const DOC_TYPE_OPTIONS = [
  { value: 'boarding_pass',  label: 'Boarding Pass' },
  { value: 'passport',       label: 'Passport' },
  { value: 'visa',           label: 'Visa' },
  { value: 'flight_ticket',  label: 'Flight Ticket' },
  { value: 'hotel_booking',  label: 'Hotel Booking' },
  { value: 'other',          label: 'Other' },
];

// ── Cache config ──────────────────────────────────────────────────────────────
const CACHE_VERSION   = 'v2';
const TRIP_CACHE_KEY  = `cached_trip_${CACHE_VERSION}`;
const WEATHER_KEY_PFX = `cached_weather_${CACHE_VERSION}_`;
const PHOTO_KEY_PFX   = `cached_photo_${CACHE_VERSION}_`;
const MAX_WEATHER_AGE = 1000 * 60 * 30;
const MAX_PHOTO_AGE   = 1000 * 60 * 60 * 24 * 7;

// ── Generic localStorage helpers ──────────────────────────────────────────────
function lsGet<T>(key: string, maxAge?: number): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { data, savedAt } = JSON.parse(raw) as { data: T; savedAt: number };
    if (maxAge && Date.now() - savedAt > maxAge) {
      localStorage.removeItem(key);
      return null;
    }
    return data;
  } catch { return null; }
}

function lsSet<T>(key: string, data: T) {
  try {
    localStorage.setItem(key, JSON.stringify({ data, savedAt: Date.now() }));
  } catch { /* quota exceeded */ }
}

// ── Trip cache ────────────────────────────────────────────────────────────────
function cacheTrip(trip: Trip | null) {
  try {
    if (trip) lsSet(TRIP_CACHE_KEY, trip);
    else localStorage.removeItem(TRIP_CACHE_KEY);
  } catch { /* ignore */ }
}
function readCachedTrip(): Trip | null {
  return lsGet<Trip>(TRIP_CACHE_KEY);
}

// ── Weather cache ─────────────────────────────────────────────────────────────
function cacheWeather(destination: string, data: unknown) {
  lsSet(WEATHER_KEY_PFX + destination, data);
}
function readCachedWeather(destination: string): unknown {
  return lsGet(WEATHER_KEY_PFX + destination, MAX_WEATHER_AGE);
}

// ── Photo cache ───────────────────────────────────────────────────────────────
function cachePhoto(destination: string, url: string) {
  lsSet(PHOTO_KEY_PFX + destination, url);
}
function readCachedPhoto(destination: string): string | null {
  return lsGet<string>(PHOTO_KEY_PFX + destination, MAX_PHOTO_AGE);
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-200/80 ${className}`} />;
}

// ── Circular progress ring ────────────────────────────────────────────────────
function StatRing({ pct, icon, id }: { pct: number; icon: string; id: string }) {
  const r = 18;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(100, Math.max(0, pct)) / 100) * circ;
  return (
    <div className="relative w-10 h-10 flex-shrink-0">
      <svg width="40" height="40" viewBox="0 0 44 44" style={{ transform: 'rotate(-90deg)' }} aria-hidden>
        <defs>
          <linearGradient id={`ring-grad-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#C7E9FF" />
            <stop offset="100%" stopColor="#7C5CFF" />
          </linearGradient>
        </defs>
        <circle cx="22" cy="22" r={r} fill="none" stroke="#e2e8f0" strokeWidth="3" />
        <circle cx="22" cy="22" r={r} fill="none"
          stroke={`url(#ring-grad-${id})`} strokeWidth="3" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-base leading-none">{icon}</div>
    </div>
  );
}

// ── useCachedWeather ──────────────────────────────────────────────────────────
function useCachedWeather(destination: string, liveWeather: unknown) {
  const [weather, setWeather] = useState<unknown>(() => readCachedWeather(destination));
  useEffect(() => {
    if (!liveWeather) return;
    cacheWeather(destination, liveWeather);
    setWeather(liveWeather);
  }, [liveWeather, destination]);
  useEffect(() => {
    const cached = readCachedWeather(destination);
    if (cached) setWeather(cached);
  }, [destination]);
  return weather as typeof liveWeather;
}

// ── useCachedPhoto ────────────────────────────────────────────────────────────
function useCachedPhoto(destination: string, liveHero: string | null | undefined) {
  const [photo, setPhoto] = useState<string | null>(() => readCachedPhoto(destination));
  useEffect(() => {
    if (!liveHero) return;
    cachePhoto(destination, liveHero);
    setPhoto(liveHero);
  }, [liveHero, destination]);
  useEffect(() => {
    const cached = readCachedPhoto(destination);
    if (cached) setPhoto(cached);
  }, [destination]);
  return photo;
}

// ── useDocuments ──────────────────────────────────────────────────────────────
function useDocuments(tripId: string | undefined) {
  const [docs, setDocs] = useState<TripDocument[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!tripId) return;
    setLoading(true);
    supabase
      .from('trip_documents')
      .select('*')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setDocs(data ?? []);
        setLoading(false);
      });
  }, [tripId]);

  const uploadPhoto = async (file: File, userId: string): Promise<string | null> => {
    const ext  = file.name.split('.').pop() ?? 'jpg';
    const path = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from('documents').upload(path, file, { upsert: false });
    if (error) { console.error('Upload error:', error); return null; }
    const { data } = supabase.storage.from('documents').getPublicUrl(path);
    return data.publicUrl;
  };

  const addDoc = async (
    doc: Omit<TripDocument, 'id' | 'created_at'>,
    photoFile?: File | null,
  ) => {
    let file_url = doc.file_url;
    if (photoFile) {
      file_url = (await uploadPhoto(photoFile, doc.user_id)) ?? undefined;
    }
    const { data } = await supabase
      .from('trip_documents')
      .insert({ ...doc, file_url })
      .select()
      .single();
    if (data) setDocs(prev => [...prev, data]);
  };

  const removeDoc = async (id: string, fileUrl?: string) => {
    // Delete from storage if there's a file
    if (fileUrl) {
      try {
        const url   = new URL(fileUrl);
        const parts = url.pathname.split('/documents/');
        if (parts[1]) {
          await supabase.storage.from('documents').remove([decodeURIComponent(parts[1])]);
        }
      } catch { /* ignore storage delete errors */ }
    }
    await supabase.from('trip_documents').delete().eq('id', id);
    setDocs(prev => prev.filter(d => d.id !== id));
  };

  return { docs, loading, addDoc, removeDoc };
}

// ─────────────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { trip: liveTrip, clearTrip, deleteTrip, updateTrip } = useTrip();
  const [showOnboarding, setShowOnboarding]   = useState(!liveTrip);
  const [confirmRemove, setConfirmRemove]     = useState(false);
  const [removing, setRemoving]               = useState(false);
  const [showEditModal, setShowEditModal]     = useState(false);
  const [saving, setSaving]                   = useState(false);
  const [showAvatarMenu, setShowAvatarMenu]   = useState(false);
  const [photoError, setPhotoError]           = useState(false);
  const [photoLoaded, setPhotoLoaded]         = useState(false);
  const [isOffline, setIsOffline]             = useState(!navigator.onLine);
  const [usingCache, setUsingCache]           = useState(false);

  // Documents state
  const [showAddDocModal, setShowAddDocModal] = useState(false);
  const [addDocForm, setAddDocForm]           = useState({ type: 'boarding_pass', label: '', notes: '' });
  const [savingDoc, setSavingDoc]             = useState(false);
  const [docPhotoFile, setDocPhotoFile]       = useState<File | null>(null);
  const [docPhotoPreview, setDocPhotoPreview] = useState<string | null>(null);
  const [viewingDoc, setViewingDoc]           = useState<TripDocument | null>(null);
  const fileInputRef                          = useRef<HTMLInputElement>(null);
  const cameraInputRef                        = useRef<HTMLInputElement>(null);

  const navigate = useNavigate();

  // ── Write-through: cache trip whenever liveTrip updates ──
  useEffect(() => {
    if (liveTrip) {
      cacheTrip(liveTrip);
      setUsingCache(false);
    }
  }, [liveTrip]);

  // ── Online / offline detection ──
  useEffect(() => {
    const goOnline  = () => setIsOffline(false);
    const goOffline = () => setIsOffline(true);
    window.addEventListener('online',  goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online',  goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // ── Stale-while-revalidate for trip ──
  const cachedTrip = !liveTrip ? readCachedTrip() : null;
  const trip = liveTrip ?? cachedTrip;

  useEffect(() => {
    if (!liveTrip && cachedTrip) setUsingCache(true);
  }, [liveTrip, cachedTrip]);

  // ── Weather & photo ──
  const { weather: liveWeather } = useDestinationWeather(trip?.destination ?? '');
  const { label: timeGreeting }  = getTimeGreeting();
  const { hero: liveHero }       = useDestinationPhotos(trip?.destination ?? '');

  const weather = useCachedWeather(trip?.destination ?? '', liveWeather);
  const hero    = useCachedPhoto(trip?.destination ?? '', liveHero);

  // ── Documents ──
  const { docs, loading: docsLoading, addDoc, removeDoc } = useDocuments(trip?.id);

  // Reset photo state on source change
  const prevHero = useRef<string | null>(null);
  useEffect(() => {
    if (hero && hero !== prevHero.current) {
      prevHero.current = hero;
      setPhotoError(false);
      setPhotoLoaded(false);
    }
  }, [hero]);

  const [editForm, setEditForm] = useState({
    displayName: '',
    destination: '',
    startDate:   '',
    endDate:     '',
    budget:      '',
    currency:    'USD',
    travelType:  'solo' as TravelType,
  });

  // ── No trip state ──
  if (!trip && !showOnboarding) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center bg-gradient-to-br from-slate-50 via-violet-50/30 to-pink-50/20">
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
          className="text-6xl mb-4"
        >
          🗺️
        </motion.div>
        <h2 className="text-2xl font-black mb-2 text-slate-900">No trip yet</h2>
        <p className="text-slate-400 mb-6 text-sm">Create your first trip to get started.</p>
        <button
          onClick={() => setShowOnboarding(true)}
          className="px-6 py-3 rounded-full gradient-primary text-white font-bold shadow-hero"
        >
          Plan a trip
        </button>
        {showOnboarding && <OnboardingWizard onClose={() => setShowOnboarding(false)} />}
      </div>
    );
  }

  if (!trip) return showOnboarding ? <OnboardingWizard onClose={() => navigate('/')} /> : null;

  // ── Derived values ──
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startTarget = new Date(`${trip.startDate}T00:00:00`);
  startTarget.setHours(0, 0, 0, 0);
  const endTarget = new Date(`${trip.endDate}T00:00:00`);
  endTarget.setHours(0, 0, 0, 0);

  const days  = Math.max(0, Math.round((startTarget.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
  const total = tripDays(trip.startDate, trip.endDate);

  // Is the user currently on the trip (started but not ended)?
  const isTravelling = today >= startTarget && today <= endTarget;
  // Has the trip fully ended?
  const tripEnded = today > endTarget;

  const typeIcon = { solo: '🧳', couple: '💑', family: '👨‍👩‍👧', friends: '👯' }[trip.travelType];

  const firstName = (trip.displayName || 'Traveler').split(' ')[0];
  const cityShort = trip.destination.split(',')[0];
  const temp      = (weather as any)?.temp ?? (weather as any)?.temperature;

  const startObj = new Date(`${trip.startDate}T00:00:00`);
  const nextObj  = new Date(startObj);
  nextObj.setDate(startObj.getDate() + 1);
  const monthDay = (d: Date) => ({
    month: d.toLocaleDateString('en-US', { month: 'short' }),
    day: d.getDate(),
  });
  const departureBadge = monthDay(startObj);
  const nextDayBadge   = monthDay(nextObj);

  const STATS = [
    { id: 'days',       icon: '📅', label: 'Total Days',  value: total.toString(),                        sub: 'days of travel',  small: false, pct: Math.min(100, (total / 30) * 100) },
    { id: 'budget',     icon: '💰', label: 'Budget',      value: fmtCurrency(trip.budget, trip.currency), sub: 'total budget',    small: true,  pct: trip.budget > 0 ? 60 : 0 },
    { id: 'places',     icon: '📍', label: 'Places',      value: '0',                                     sub: 'saved spots',     small: false, pct: 0 },
    { id: 'activities', icon: '✅', label: 'Activities',  value: '0',                                     sub: 'planned so far',  small: false, pct: 0 },
  ];

  // ── Remove trip ──
  const handleRemoveTrip = async () => {
    setRemoving(true);
    const ok = await deleteTrip();
    setRemoving(false);
    setConfirmRemove(false);
    if (ok) {
      cacheTrip(null);
      localStorage.removeItem(TRIP_CACHE_KEY);
      clearTrip();
      navigate('/dashboard');
    }
  };

  // ── Edit modal ──
  const openEditModal = () => {
    setEditForm({
      displayName: trip.displayName,
      destination: trip.destination,
      startDate:   trip.startDate,
      endDate:     trip.endDate,
      budget:      String(trip.budget),
      currency:    trip.currency,
      travelType:  trip.travelType as TravelType,
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editForm.displayName.trim() || !editForm.destination.trim() || !editForm.startDate || !editForm.endDate) return;
    setSaving(true);
    await updateTrip?.({
      displayName: editForm.displayName.trim(),
      destination: editForm.destination.trim(),
      startDate:   editForm.startDate,
      endDate:     editForm.endDate,
      budget:      parseFloat(editForm.budget) || 0,
      currency:    editForm.currency as Trip['currency'],
      travelType:  editForm.travelType as Trip['travelType'],
    });
    setSaving(false);
    setShowEditModal(false);
  };

  const editValid =
    editForm.displayName.trim() &&
    editForm.destination.trim() &&
    editForm.startDate &&
    editForm.endDate &&
    editForm.endDate >= editForm.startDate;

  // ── Add document ──
  const handleAddDoc = async () => {
    if (!addDocForm.label.trim() || !trip?.id) return;
    setSavingDoc(true);
    const { data: { user } } = await supabase.auth.getUser();
    await addDoc(
      {
        trip_id: trip.id,
        user_id: user?.id ?? '',
        type:    addDocForm.type,
        label:   addDocForm.label.trim(),
        notes:   addDocForm.notes.trim() || undefined,
      },
      docPhotoFile,
    );
    setSavingDoc(false);
    setAddDocForm({ type: 'boarding_pass', label: '', notes: '' });
    setDocPhotoFile(null);
    setDocPhotoPreview(null);
    setShowAddDocModal(false);
  };

  const handlePhotoChange = (file: File | null) => {
    setDocPhotoFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = e => setDocPhotoPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setDocPhotoPreview(null);
    }
  };

  const handleCloseAddDoc = () => {
    if (savingDoc) return;
    setShowAddDocModal(false);
    setDocPhotoFile(null);
    setDocPhotoPreview(null);
    setAddDocForm({ type: 'boarding_pass', label: '', notes: '' });
  };

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/30 to-pink-50/20">
      {/* Decorative background blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-16 -right-16 w-52 h-52 rounded-full opacity-[0.11]" style={{ background: '#7C5CFF' }} />
        <div className="absolute bottom-40 -left-10 w-36 h-36 rounded-full opacity-[0.08]" style={{ background: '#FFB7E1' }} />
        <div className="absolute top-1/2 -right-8 w-28 h-28 rounded-full opacity-[0.07]" style={{ background: '#C7E9FF' }} />
      </div>

      {/* Offline / cached-data banner */}
      <AnimatePresence>
        {(isOffline || usingCache) && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="relative z-20 flex items-center justify-center gap-2 bg-amber-50 text-amber-700 text-xs font-semibold py-2"
          >
            <WifiOff size={13} />
            {isOffline ? "You're offline — showing your last saved trip" : 'Showing cached trip data'}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Header ── */}
      <div
        className="pt-12 pb-20 px-4 sm:px-5 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #7C5CFF 0%, #8B5CF6 100%)' }}
      >
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/10" />
        <div className="absolute -bottom-8 left-8 w-32 h-32 rounded-full bg-white/[0.07]" />
        <div className="relative z-10 flex justify-between items-start gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1 text-violet-200/70 text-xs font-semibold mb-2">
              <MapPin size={12} />
              <span className="truncate">{cityShort}</span>
            </div>
            <h1 className="text-white text-xl sm:text-2xl font-black leading-tight mb-1 truncate">
              {timeGreeting}, {firstName} 👋
            </h1>
            <p className="text-violet-200 text-sm mb-1 truncate">
              {weather
                ? `It's ${(weather as any).description} in ${cityShort} ${(weather as any).emoji} — check your itinerary for today.`
                : `Planning your trip to ${trip.destination}.`}
            </p>
            <p className="text-violet-200 text-xs">
              {isTravelling  ? `You're currently in ${cityShort}! 🌍`
               : tripEnded  ? `Your trip to ${cityShort} has ended 🏁`
               : days === 0 ? 'Your adventure starts today! 🎉'
               : days === 1 ? 'Tomorrow is departure day! ✈️'
               : `${days} days to departure`}
            </p>
          </div>

          <div className="relative flex-shrink-0">
            <AnimatePresence>
              {showAvatarMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowAvatarMenu(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-13 mt-2 w-40 bg-white rounded-2xl shadow-xl shadow-black/10 overflow-hidden z-50"
                  >
                    <button
                      onClick={() => { setShowAvatarMenu(false); openEditModal(); }}
                      className="w-full flex items-center gap-2 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <Pencil size={14} className="text-violet-500" /> Edit trip
                    </button>
                    <div className="h-px bg-slate-100" />
                    <button
                      onClick={() => { setShowAvatarMenu(false); setConfirmRemove(true); }}
                      className="w-full flex items-center gap-2 px-4 py-3 text-sm font-semibold text-rose-500 hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 size={14} /> Remove trip
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="px-3 sm:px-4 -mt-10 pb-6 relative z-10 space-y-4">

        {/* ── 1. Countdown card ── */}
        <motion.div
          initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-3xl p-4 sm:p-5 shadow-[0_4px_24px_rgba(124,92,255,0.10)] flex items-center gap-3 sm:gap-4"
        >
          <div
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex flex-col items-center justify-center text-white flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #C7E9FF, #7C5CFF)' }}
          >
            {isTravelling ? (
              <>
                <span className="text-xl sm:text-2xl font-black leading-none">✈</span>
                <span className="text-[10px] font-semibold opacity-80">live</span>
              </>
            ) : tripEnded ? (
              <>
                <span className="text-xl sm:text-2xl font-black leading-none">🏁</span>
                <span className="text-[10px] font-semibold opacity-80">done</span>
              </>
            ) : (
              <>
                <span className="text-xl sm:text-2xl font-black leading-none">{days}</span>
                <span className="text-[10px] font-semibold opacity-80">days</span>
              </>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
              {isTravelling ? 'Currently travelling' : tripEnded ? 'Trip completed' : 'Departure countdown'}
            </p>
            <p className="text-sm font-bold text-slate-900 truncate">{fmtShort(trip.startDate)} → {fmtDate(trip.endDate)}</p>
            <p className="text-xs text-slate-500 truncate">
              {total} days · {trip.travelType.charAt(0).toUpperCase() + trip.travelType.slice(1)} trip {typeIcon}
            </p>
          </div>
          <div className="text-2xl sm:text-3xl flex-shrink-0">
            {isTravelling ? '🌍' : tripEnded ? '🎉' : '✈️'}
          </div>
        </motion.div>

        {/* ── 2. Stats grid ── */}
        <motion.div
          initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2, delay: 0.03 }}
          className="grid grid-cols-2 gap-2.5 sm:gap-3"
        >
          {STATS.map(s => (
            <div key={s.id} className="bg-white rounded-2xl p-3 sm:p-4 shadow-[0_2px_12px_rgba(0,0,0,0.05)] min-w-0">
              <div className="flex items-center justify-between mb-2 gap-1">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider truncate">{s.label}</p>
                <StatRing pct={s.pct} icon={s.icon} id={s.id} />
              </div>
              <p className={`font-black text-slate-900 leading-tight truncate ${s.small ? 'text-sm sm:text-base' : 'text-xl sm:text-2xl'}`}>
                {s.value}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5 truncate">{s.sub}</p>
            </div>
          ))}
        </motion.div>

        {/* ── 3. Trip details ── */}
        <motion.div
          initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2, delay: 0.06 }}
        >
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-base font-black text-slate-900">Trip details</h2>
          </div>

          <div className="bg-white rounded-3xl overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.05)] flex flex-col sm:flex-row sm:h-60">
            {/* Photo */}
            <div className="relative w-full sm:w-2/5 h-40 sm:h-full flex-shrink-0 overflow-hidden bg-slate-100">
              {hero && !photoError ? (
                <>
                  {!photoLoaded && <Skeleton className="absolute inset-0 w-full h-full" />}
                  <img
                    src={hero} alt={trip.destination}
                    onLoad={() => setPhotoLoaded(true)}
                    onError={() => setPhotoError(true)}
                    className={`w-full h-full object-cover transition-opacity duration-300 ${photoLoaded ? 'opacity-100' : 'opacity-0'}`}
                  />
                </>
              ) : !hero && !photoError ? (
                <Skeleton className="w-full h-full" />
              ) : (
                <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #C7E9FF, #7C5CFF)' }}>
                  <MapPin className="text-white/70" size={28} />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 p-4 sm:p-5 flex flex-col justify-center gap-3 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-50 text-violet-600 w-fit">
                  <Star size={12} />
                  <span className="text-[10px] font-bold uppercase tracking-wide">Primary trip</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={openEditModal}
                    className="text-violet-500 hover:text-violet-700 transition-colors p-1.5 rounded-lg hover:bg-violet-50" title="Edit trip">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => setConfirmRemove(true)}
                    className="text-rose-400 hover:text-rose-600 transition-colors p-1.5 rounded-lg hover:bg-rose-50" title="Delete trip">
                    <Trash2 size={14} />
                  </button>
                  <span className="text-xs font-semibold text-violet-600 bg-violet-50 px-3 py-1 rounded-full">
                    {trip.travelType}
                  </span>
                </div>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 truncate">{trip.destination}</h3>
              <div className="flex flex-col gap-2 text-sm text-slate-500">
                <div className="flex items-center gap-2 min-w-0">
                  <Calendar size={14} className="text-violet-500 flex-shrink-0" />
                  <span className="truncate">{fmtDate(trip.startDate)} → {fmtDate(trip.endDate)}</span>
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <MapPin size={14} className="text-violet-500 flex-shrink-0" />
                  <span className="truncate">{trip.destination}</span>
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <Wallet size={14} className="text-violet-500 flex-shrink-0" />
                  <span className="truncate">{fmtCurrency(trip.budget, trip.currency)} · {total} days</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── 4. Quick access ── */}
        <motion.div
          initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2, delay: 0.09 }}
        >
          <h2 className="text-base font-black text-slate-900 mb-3">Quick access</h2>
          <div className="grid grid-cols-4 gap-2">
            {QUICK.map(({ icon: Icon, label, to, color }) => (
              <button key={label} onClick={() => navigate(to)}
                className="bg-white rounded-2xl py-3 px-2 flex flex-col items-center gap-1.5 shadow-[0_2px_12px_rgba(0,0,0,0.05)] active:scale-95 transition-transform"
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
                  <Icon size={16} />
                </div>
                <span className="text-[10px] font-semibold text-slate-600 text-center leading-tight">{label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* ── 5. Current Weather ── */}
        <motion.div
          initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2, delay: 0.12 }}
          className="bg-white rounded-3xl p-4 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.05)] flex items-center gap-4"
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 text-2xl sm:text-3xl"
            style={{ background: 'linear-gradient(135deg, #C7E9FF, #7C5CFF)' }}
          >
            {weather ? (weather as any).emoji : (
              <div className="w-8 h-8 rounded-full animate-pulse bg-white/30" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
              Current weather · {cityShort}
            </p>
            {weather ? (
              <p className="text-base sm:text-lg font-black text-slate-900 truncate">
                {temp !== undefined ? `${temp}°, ` : ''}{(weather as any).description}
              </p>
            ) : (
              <div className="h-5 rounded-lg bg-slate-100 animate-pulse w-40" />
            )}
          </div>
        </motion.div>

        {/* ── 6. Upcoming events ── */}
        <motion.div
          initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2, delay: 0.15 }}
        >
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-base font-black text-slate-900">Upcoming events</h2>
            <button onClick={() => navigate('/dashboard/itinerary')}
              className="flex items-center gap-1 text-xs font-semibold text-violet-500">
              View all <ArrowRight size={12} />
            </button>
          </div>

          <div className="space-y-2.5">
            {/* Flight card — only show if trip hasn't started */}
            {!isTravelling && !tripEnded && (
              <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-[0_2px_12px_rgba(0,0,0,0.05)] flex items-center gap-3 sm:gap-4 border-l-4 border-violet-400">
                <div className="text-center min-w-[40px] flex-shrink-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">{departureBadge.month}</p>
                  <p className="text-lg font-black text-slate-900 leading-none">{departureBadge.day}</p>
                </div>
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #C7E9FF, #7C5CFF)' }}
                >
                  <Plane size={16} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">Flight to {cityShort}</p>
                  <p className="text-xs text-slate-400 truncate">
                    {days === 0 ? 'Departing today!' : days === 1 ? 'Departing tomorrow!' : `Departing in ${days} days`}
                  </p>
                </div>
                <ArrowRight size={14} className="text-slate-300 flex-shrink-0" />
              </div>
            )}

            {/* Currently travelling card */}
            {isTravelling && (
              <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-[0_2px_12px_rgba(0,0,0,0.05)] flex items-center gap-3 sm:gap-4 border-l-4 border-emerald-400">
                <div className="text-center min-w-[40px] flex-shrink-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">{departureBadge.month}</p>
                  <p className="text-lg font-black text-slate-900 leading-none">{departureBadge.day}</p>
                </div>
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #86efac, #22c55e)' }}
                >
                  <MapPin size={16} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">You're in {cityShort}! 🎉</p>
                  <p className="text-xs text-slate-400 truncate">Enjoy your adventure</p>
                </div>
              </div>
            )}

            {/* Trip ended card */}
            {tripEnded && (
              <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-[0_2px_12px_rgba(0,0,0,0.05)] flex items-center gap-3 sm:gap-4 border-l-4 border-slate-300">
                <div className="text-center min-w-[40px] flex-shrink-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">{departureBadge.month}</p>
                  <p className="text-lg font-black text-slate-900 leading-none">{departureBadge.day}</p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-base">🏁</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">Trip completed</p>
                  <p className="text-xs text-slate-400 truncate">Hope you had an amazing time in {cityShort}!</p>
                </div>
              </div>
            )}

            {/* Next day / activities placeholder */}
            <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-[0_2px_12px_rgba(0,0,0,0.05)] flex items-center gap-3 sm:gap-4 opacity-70">
              <div className="text-center min-w-[40px] flex-shrink-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase">{nextDayBadge.month}</p>
                <p className="text-lg font-black text-slate-900 leading-none">{nextDayBadge.day}</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                <span className="text-base">🗓️</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">No activities planned yet</p>
                <p className="text-xs text-slate-400 truncate">Add stops to your itinerary</p>
              </div>
              <button
                onClick={() => navigate('/dashboard/itinerary')}
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-white"
                style={{ background: 'linear-gradient(135deg, #7C5CFF, #8B5CF6)' }}
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
        </motion.div>

        {/* ── 7. Documents ── */}
        <motion.div
          initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2, delay: 0.18 }}
          className="bg-white rounded-3xl p-4 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.05)]"
        >
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-base font-black text-slate-900">Your Documents</h2>
            <button
              onClick={() => setShowAddDocModal(true)}
              className="flex items-center gap-1.5 text-xs font-bold text-white px-3 py-1.5 rounded-full"
              style={{ background: 'linear-gradient(135deg, #7C5CFF, #8B5CF6)' }}
            >
              <Plus size={12} /> Add
            </button>
          </div>

          {docsLoading ? (
            <div className="space-y-2">
              {[1, 2].map(i => (
                <div key={i} className="h-14 rounded-2xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : docs.length === 0 ? (
            <div className="text-center py-6 text-slate-400">
              <div className="text-3xl mb-2">📂</div>
              <p className="text-sm font-semibold">No documents yet</p>
              <p className="text-xs mt-0.5">Add your passport, tickets, or bookings</p>
            </div>
          ) : (
            <div className="space-y-2">
              {docs.map(doc => {
                const meta = DOC_TYPE_META[doc.type] ?? DOC_TYPE_META.other;
                return (
                  <div key={doc.id} className="flex items-center gap-3 bg-slate-50/60 rounded-2xl px-3.5 py-3 group">
                    {/* Thumbnail or emoji icon */}
                    {doc.file_url ? (
                      <button
                        onClick={() => setViewingDoc(doc)}
                        className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 border border-slate-200 hover:border-violet-400 transition-colors relative"
                      >
                        <img src={doc.file_url} alt={doc.label} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center">
                          <ZoomIn size={12} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </button>
                    ) : (
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0 ${meta.color}`}>
                        {meta.icon}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{doc.label}</p>
                      {doc.notes && <p className="text-xs text-slate-400 truncate">{doc.notes}</p>}
                    </div>
                    {doc.file_url && (
                      <button
                        onClick={() => setViewingDoc(doc)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-violet-50 text-violet-400 flex-shrink-0"
                      >
                        <Eye size={13} />
                      </button>
                    )}
                    <button
                      onClick={() => removeDoc(doc.id, doc.file_url)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-rose-50 text-rose-400 flex-shrink-0"
                    >
                      <Trash2 size={13} />
                    </button>
                    <ArrowRight size={14} className="text-slate-300 flex-shrink-0" />
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

      </div>

      {showOnboarding && <OnboardingWizard onClose={() => setShowOnboarding(false)} />}

      {/* ── Edit Trip Modal ── */}
      <AnimatePresence>
        {showEditModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => !saving && setShowEditModal(false)}
          >
            <motion.div
              className="w-full max-w-screen-md bg-white rounded-t-3xl p-5 sm:p-6 pb-10 max-h-[90vh] overflow-y-auto"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5" />
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-black text-slate-900">✏️ Edit Trip</h2>
                <button onClick={() => setShowEditModal(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block">Your name</label>
                  <input value={editForm.displayName}
                    onChange={e => setEditForm({ ...editForm, displayName: e.target.value })}
                    placeholder="e.g. Marco"
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-violet-400 bg-slate-50/50"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block">Destination</label>
                  <input value={editForm.destination}
                    onChange={e => setEditForm({ ...editForm, destination: e.target.value })}
                    placeholder="e.g. Paris, France"
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-violet-400 bg-slate-50/50"
                  />
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs font-bold text-slate-500 mb-1.5 block">Departure</label>
                    <input type="date" value={editForm.startDate}
                      onChange={e => setEditForm({ ...editForm, startDate: e.target.value })}
                      className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-violet-400 bg-slate-50/50"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-bold text-slate-500 mb-1.5 block">Return</label>
                    <input type="date" value={editForm.endDate} min={editForm.startDate}
                      onChange={e => setEditForm({ ...editForm, endDate: e.target.value })}
                      className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-violet-400 bg-slate-50/50"
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs font-bold text-slate-500 mb-1.5 block">Budget</label>
                    <input type="number" min="0" value={editForm.budget}
                      onChange={e => setEditForm({ ...editForm, budget: e.target.value })}
                      placeholder="0"
                      className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-violet-400 bg-slate-50/50"
                    />
                  </div>
                  <div className="w-28">
                    <label className="text-xs font-bold text-slate-500 mb-1.5 block">Currency</label>
                    <select value={editForm.currency}
                      onChange={e => setEditForm({ ...editForm, currency: e.target.value })}
                      className="w-full px-3 py-3 rounded-2xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-violet-400 bg-white"
                    >
                      {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-2 block">Travel type</label>
                  <div className="grid grid-cols-4 gap-2">
                    {TRAVEL_TYPES.map(t => {
                      const icons = { solo: '🧳', couple: '💑', family: '👨‍👩‍👧', friends: '👯' };
                      const isActive = editForm.travelType === t;
                      return (
                        <button key={t} onClick={() => setEditForm({ ...editForm, travelType: t })}
                          className={`flex flex-col items-center gap-1 py-3 rounded-2xl border text-xs font-semibold transition-all ${
                            isActive
                              ? 'text-white border-transparent shadow-[0_4px_14px_rgba(124,92,255,0.3)] scale-[1.03]'
                              : 'bg-white text-slate-600 border-slate-100 shadow-sm'
                          }`}
                          style={isActive ? { background: 'linear-gradient(135deg, #7C5CFF, #8B5CF6)' } : {}}
                        >
                          <span className="text-lg">{icons[t]}</span>
                          <span className={isActive ? 'text-white' : 'text-slate-500'}>
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <motion.button
                  onClick={handleSaveEdit}
                  disabled={!editValid || saving}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}
                  className="w-full py-3.5 rounded-full text-white font-black text-sm shadow-[0_8px_22px_rgba(124,92,255,0.38)] disabled:opacity-40 disabled:cursor-not-allowed transition-opacity mt-2"
                  style={{ background: 'linear-gradient(135deg, #7C5CFF 0%, #8B5CF6 100%)' }}
                >
                  {saving ? 'Saving…' : 'Save Changes ✨'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Add Document Modal ── */}
      <AnimatePresence>
        {showAddDocModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={handleCloseAddDoc}
          >
            <motion.div
              className="w-full max-w-screen-md bg-white rounded-t-3xl p-5 sm:p-6 pb-10 max-h-[92vh] overflow-y-auto"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5" />
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-black text-slate-900">📎 Add Document</h2>
                <button onClick={handleCloseAddDoc}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-4">
                {/* ── Photo upload area ── */}
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block">Photo (optional)</label>

                  {/* Hidden file inputs */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => handlePhotoChange(e.target.files?.[0] ?? null)}
                  />
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={e => handlePhotoChange(e.target.files?.[0] ?? null)}
                  />

                  {docPhotoPreview ? (
                    /* Preview with remove button */
                    <div className="relative rounded-2xl overflow-hidden border border-slate-200">
                      <img src={docPhotoPreview} alt="Preview" className="w-full h-48 object-cover" />
                      <button
                        onClick={() => handlePhotoChange(null)}
                        className="absolute top-2 right-2 w-7 h-7 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white"
                      >
                        <X size={14} />
                      </button>
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/50 to-transparent px-3 py-2">
                        <p className="text-white text-xs font-semibold truncate">{docPhotoFile?.name}</p>
                      </div>
                    </div>
                  ) : (
                    /* Upload buttons */
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => cameraInputRef.current?.click()}
                        className="flex flex-col items-center gap-2 py-4 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 hover:border-violet-300 hover:bg-violet-50/30 transition-colors"
                      >
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{ background: 'linear-gradient(135deg, #C7E9FF, #7C5CFF)' }}
                        >
                          <Camera size={18} className="text-white" />
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-bold text-slate-700">Take Photo</p>
                          <p className="text-[10px] text-slate-400">Use camera</p>
                        </div>
                      </button>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex flex-col items-center gap-2 py-4 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 hover:border-violet-300 hover:bg-violet-50/30 transition-colors"
                      >
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{ background: 'linear-gradient(135deg, #C7E9FF, #7C5CFF)' }}
                        >
                          <ImageIcon size={18} className="text-white" />
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-bold text-slate-700">Choose Photo</p>
                          <p className="text-[10px] text-slate-400">From gallery</p>
                        </div>
                      </button>
                    </div>
                  )}
                </div>

                {/* ── Doc type pills ── */}
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-2 block">Document type</label>
                  <div className="flex flex-wrap gap-2">
                    {DOC_TYPE_OPTIONS.map(o => {
                      const meta = DOC_TYPE_META[o.value];
                      const isActive = addDocForm.type === o.value;
                      return (
                        <button
                          key={o.value}
                          onClick={() => setAddDocForm({ ...addDocForm, type: o.value })}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                            isActive ? 'text-white shadow-md' : 'bg-slate-100 text-slate-500'
                          }`}
                          style={isActive ? { background: 'linear-gradient(135deg, #7C5CFF, #8B5CF6)' } : {}}
                        >
                          <span>{meta.icon}</span> {o.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ── Label ── */}
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block">Label</label>
                  <input
                    value={addDocForm.label}
                    onChange={e => setAddDocForm({ ...addDocForm, label: e.target.value })}
                    placeholder="e.g. Philippine Passport, Emirates E-Ticket"
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-violet-400 bg-slate-50/50"
                  />
                </div>

                {/* ── Notes ── */}
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block">Notes (optional)</label>
                  <input
                    value={addDocForm.notes}
                    onChange={e => setAddDocForm({ ...addDocForm, notes: e.target.value })}
                    placeholder="e.g. Expires Jan 2028, Gate B12"
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-violet-400 bg-slate-50/50"
                  />
                </div>

                <motion.button
                  onClick={handleAddDoc}
                  disabled={!addDocForm.label.trim() || savingDoc}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.96 }}
                  className="w-full py-3.5 rounded-full text-white font-black text-sm shadow-[0_8px_22px_rgba(124,92,255,0.38)] disabled:opacity-40 disabled:cursor-not-allowed mt-2"
                  style={{ background: 'linear-gradient(135deg, #7C5CFF 0%, #8B5CF6 100%)' }}
                >
                  {savingDoc ? (
                    <span className="flex items-center justify-center gap-2">
                      <Upload size={14} className="animate-bounce" /> Uploading…
                    </span>
                  ) : 'Save Document ✨'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Document photo viewer ── */}
      <AnimatePresence>
        {viewingDoc && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setViewingDoc(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 24, stiffness: 300 }}
              className="relative w-full max-w-sm"
              onClick={e => e.stopPropagation()}
            >
              <img
                src={viewingDoc.file_url}
                alt={viewingDoc.label}
                className="w-full rounded-3xl object-contain max-h-[70vh]"
              />
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent rounded-b-3xl p-4">
                <p className="text-white font-black text-sm">{viewingDoc.label}</p>
                {viewingDoc.notes && <p className="text-white/70 text-xs mt-0.5">{viewingDoc.notes}</p>}
              </div>
              <button
                onClick={() => setViewingDoc(null)}
                className="absolute top-3 right-3 w-8 h-8 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white"
              >
                <X size={16} />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Remove trip confirmation ── */}
      <AnimatePresence>
        {confirmRemove && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm px-5"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => !removing && setConfirmRemove(false)}
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
                  <h3 className="text-base font-black text-slate-900 mb-1">Remove this trip?</h3>
                  <p className="text-sm text-slate-400">
                    "<span className="font-semibold text-slate-700">{trip.destination}</span>" and all its data will be permanently deleted.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setConfirmRemove(false)} disabled={removing}
                  className="flex-1 py-3 rounded-full bg-slate-100 text-slate-600 font-bold text-sm disabled:opacity-50 active:scale-95 transition-transform">
                  Cancel
                </button>
                <button onClick={handleRemoveTrip} disabled={removing}
                  className="flex-1 py-3 rounded-full bg-rose-500 text-white font-bold text-sm disabled:opacity-50 active:scale-95 transition-transform">
                  {removing ? 'Removing…' : 'Delete Trip'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}