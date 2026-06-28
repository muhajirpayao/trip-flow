import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTrip } from '../context/TripContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import {
  User, Bell, Palette, DollarSign, ChevronRight,
  LogOut, Trash2, Download, CheckCircle2, X,
  AlertTriangle, Sparkles, RefreshCw, Clock,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type Theme    = 'system' | 'light' | 'dark';
type Currency = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'PHP' | 'AUD' | 'CAD' | 'SGD';

interface AppSettings {
  theme:              Theme;
  currency:           Currency;
  notifications:      boolean;
  weeklyRecap:        boolean;
  reminderDaysBefore: number;
}

interface AppVersion {
  current:   string;
  latest:    string;
  changelog: { version: string; date: string; notes: string[] }[];
}

// ─── Mock data — only used for sections not wired up yet ──────────────────────
// (App version / changelog / theme / currency / notifications are still
// placeholders. Name, email, trip overview, and logout below are real.)

const MOCK_VERSION: AppVersion = {
  current: '1.3.0',
  latest:  '1.4.2',
  changelog: [
    {
      version: '1.4.2',
      date:    'Jun 2025',
      notes: [
        'Added drag-and-drop reordering for itinerary activities',
        'Fixed category saving bug on refresh',
        'Improved conflict detection warnings',
      ],
    },
    {
      version: '1.4.0',
      date:    'May 2025',
      notes: [
        'Redesigned itinerary with soft luxury aesthetic',
        'New category system with 10 activity types',
        'Day progress tracker added',
      ],
    },
    {
      version: '1.3.0',
      date:    'Apr 2025',
      notes: [
        'Profile page with settings',
        'Edit trip details from dashboard',
        'Budget tracker improvements',
      ],
    },
  ],
};

const CURRENCIES: Currency[] = ['USD', 'EUR', 'GBP', 'JPY', 'PHP', 'AUD', 'CAD', 'SGD'];
const THEMES: { value: Theme; label: string; emoji: string }[] = [
  { value: 'system', label: 'System', emoji: '💻' },
  { value: 'light',  label: 'Light',  emoji: '☀️' },
  { value: 'dark',   label: 'Dark',   emoji: '🌙' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="px-4 sm:px-6 mb-2 mt-6">
      <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">{title}</h2>
      {sub && <p className="text-[11px] text-slate-300 mt-0.5">{sub}</p>}
    </div>
  );
}

function SettingRow({
  icon: Icon,
  label,
  sub,
  action,
  iconColor = 'bg-violet-50 text-violet-500',
}: {
  icon:       React.ElementType;
  label:      string;
  sub?:       string;
  action:     React.ReactNode;
  iconColor?: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${iconColor}`}>
        <Icon size={15} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        {sub && <p className="text-xs text-slate-400 truncate">{sub}</p>}
      </div>
      <div className="flex-shrink-0">{action}</div>
    </div>
  );
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      aria-checked={on}
      role="switch"
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${on ? 'bg-violet-500' : 'bg-slate-200'}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${on ? 'translate-x-5' : 'translate-x-0'}`}
      />
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Profile() {
  const { trip, clearTrip, deleteTrip } = useTrip();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  // ── Real user info ──────────────────────────────────────────────────────────
  // Email comes straight from Supabase auth — never editable.
  const email = user?.email ?? '';

  // Display name lives on the `trips` row (trips.display_name) per your schema.
  // Falls back to the email's local part if no trip/name exists yet.
  const [displayName, setDisplayName] = useState(
    trip?.displayName || email.split('@')[0] || 'Traveler'
  );
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput]     = useState(displayName);
  const [savingName, setSavingName]   = useState(false);
  const [nameError, setNameError]     = useState<string | null>(null);

  // Keep local state in sync if the trip loads/changes after mount
  useEffect(() => {
    if (trip?.displayName) setDisplayName(trip.displayName);
  }, [trip?.displayName]);

  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  const handleSaveName = async () => {
    const next = nameInput.trim();
    if (!next || next === displayName) {
      setEditingName(false);
      return;
    }
    if (!trip?.id) {
      // No trip yet to attach the name to — just reflect it locally.
      setDisplayName(next);
      setEditingName(false);
      return;
    }

    setSavingName(true);
    setNameError(null);
    const { error } = await supabase
      .from('trips')
      .update({ display_name: next })
      .eq('id', trip.id);
    setSavingName(false);

    if (error) {
      setNameError('Could not save name. Try again.');
      return;
    }

    setDisplayName(next);
    setEditingName(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  // ── Settings (placeholders — not wired up yet) ─────────────────────────────
  const [settings, setSettings] = useState<AppSettings>({
    theme:              'system',
    currency:           'USD',
    notifications:      true,
    weeklyRecap:        true,
    reminderDaysBefore: 3,
  });

  // ── UI state ────────────────────────────────────────────────────────────────
  const [showChangelog, setShowChangelog]   = useState(false);
  const [updating, setUpdating]             = useState(false);
  const [updated, setUpdated]               = useState(false);
  const [confirmLogout, setConfirmLogout]   = useState(false);
  const [confirmDelete, setConfirmDelete]   = useState(false);
  const [deleting, setDeleting]             = useState(false);
  const [loggingOut, setLoggingOut]         = useState(false);
  const [saved, setSaved]                   = useState(false);

  const hasUpdate = MOCK_VERSION.current !== MOCK_VERSION.latest;

  const set = <K extends keyof AppSettings>(k: K, v: AppSettings[K]) => {
    setSettings(s => ({ ...s, [k]: v }));
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  const handleUpdate = async () => {
    setUpdating(true);
    await new Promise(r => setTimeout(r, 2200)); // placeholder — not real yet
    setUpdating(false);
    setUpdated(true);
    setTimeout(() => setUpdated(false), 3000);
  };

  // ── Real logout ─────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    setLoggingOut(true);
    await signOut();
    clearTrip?.();
    navigate('/');
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    await deleteTrip?.();
    clearTrip?.();
    setDeleting(false);
    navigate('/');
  };

  // ── Trip overview (real, from TripContext) ─────────────────────────────────
  const tripChanges = trip
    ? [
        `Destination: ${trip.destination}`,
        `Dates: ${trip.startDate} → ${trip.endDate}`,
        `Budget: ${trip.budget} ${trip.currency}`,
        `Travel type: ${trip.travelType}`,
      ]
    : [];

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen pb-28 overflow-x-hidden"
      style={{ background: '#F8FAFC' }}
    >
      {/* Decorative blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-16 -right-16 w-52 h-52 rounded-full opacity-[0.11]" style={{ background: '#7C5CFF' }} />
        <div className="absolute bottom-40 -left-10 w-36 h-36 rounded-full opacity-[0.08]" style={{ background: '#FFB7E1' }} />
      </div>

      {/* ── Header ── */}
      <div
        className="pt-12 pb-20 px-4 sm:px-6 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #7C5CFF 0%, #8B5CF6 100%)' }}
      >
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/10" />
        <div className="absolute -bottom-8 left-8 w-28 h-28 rounded-full bg-white/[0.07]" />
        <div className="relative z-10">
          <p className="text-violet-200 text-sm mb-4">Your account</p>
          <h1 className="text-white text-2xl font-black tracking-tight">Profile</h1>
        </div>
      </div>

      {/* ── Avatar card ── */}
      <div className="px-4 sm:px-6 -mt-12 relative z-10 mb-2">
        <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-[0_4px_24px_rgba(124,92,255,0.10)]">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-black text-white flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #7C5CFF, #FFB7E1)' }}
            >
              {initials}
            </div>

            {/* Name / email */}
            <div className="flex-1 min-w-0">
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={nameInput}
                    onChange={e => setNameInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                    disabled={savingName}
                    className="flex-1 text-sm font-bold border-b-2 border-violet-400 bg-transparent focus:outline-none text-slate-900 py-0.5 disabled:opacity-60"
                  />
                  <button
                    onClick={handleSaveName}
                    disabled={savingName}
                    className="text-[11px] font-bold text-violet-600 bg-violet-50 px-2.5 py-1 rounded-full disabled:opacity-60"
                  >
                    {savingName ? 'Saving…' : 'Save'}
                  </button>
                  <button onClick={() => { setEditingName(false); setNameError(null); }} disabled={savingName}>
                    <X size={14} className="text-slate-400" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setNameInput(displayName); setEditingName(true); }}
                  className="text-left group w-full"
                >
                  <p className="text-base font-black text-slate-900 group-hover:text-violet-600 transition-colors">
                    {displayName}
                  </p>
                  <p className="text-[11px] text-violet-400 font-semibold mt-0.5">Tap to edit name</p>
                </button>
              )}
              {nameError && <p className="text-[11px] text-rose-500 mt-1">{nameError}</p>}
              <p className="text-xs text-slate-400 mt-1 truncate">{email}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Update banner (placeholder, not real yet) ── */}
      {hasUpdate && !updated && (
        <div className="px-4 sm:px-6 mb-1">
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl p-3.5 flex items-center gap-3"
            style={{ background: 'linear-gradient(135deg, rgba(124,92,255,0.12), rgba(255,183,225,0.14))', border: '1.5px solid rgba(124,92,255,0.18)' }}
          >
            <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
              <Download size={16} className="text-violet-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-slate-800">Update available</p>
              <p className="text-[11px] text-slate-400">v{MOCK_VERSION.current} → v{MOCK_VERSION.latest}</p>
            </div>
            <button
              onClick={handleUpdate}
              disabled={updating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-xs font-bold shadow-sm disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #7C5CFF, #8B5CF6)' }}
            >
              {updating
                ? <><RefreshCw size={11} className="animate-spin" /> Updating…</>
                : <><Download size={11} /> Update</>}
            </button>
          </motion.div>
        </div>
      )}

      {updated && (
        <div className="px-4 sm:px-6 mb-1">
          <motion.div
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-3.5 flex items-center gap-3 bg-emerald-50 border border-emerald-100"
          >
            <CheckCircle2 size={18} className="text-emerald-500" />
            <p className="text-sm font-bold text-emerald-700">App updated to v{MOCK_VERSION.latest} ✨</p>
          </motion.div>
        </div>
      )}

      {/* ── App version & changelog (placeholder) ── */}
      <SectionHeader title="App version" />
      <div className="mx-4 sm:mx-6 bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.05)] overflow-hidden divide-y divide-slate-50">
        <SettingRow
          icon={Sparkles}
          label="Current version"
          sub={`v${MOCK_VERSION.current} · ${hasUpdate ? 'Update available' : 'Up to date'}`}
          iconColor="bg-violet-50 text-violet-500"
          action={
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${hasUpdate ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
              {hasUpdate ? `v${MOCK_VERSION.latest} ready` : 'Latest'}
            </span>
          }
        />
        <button
          onClick={() => setShowChangelog(true)}
          className="flex items-center gap-3 px-4 py-3 w-full hover:bg-slate-50 transition-colors"
        >
          <div className="w-8 h-8 rounded-xl bg-pink-50 flex items-center justify-center flex-shrink-0">
            <Clock size={15} className="text-pink-400" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold text-slate-800">What's new</p>
            <p className="text-xs text-slate-400">View recent changes</p>
          </div>
          <ChevronRight size={15} className="text-slate-300" />
        </button>
      </div>

      {/* ── Trip overview (real, from TripContext) ── */}
      {trip && (
        <>
          <SectionHeader title="Trip overview" sub="Current trip settings at a glance" />
          <div className="mx-4 sm:mx-6 bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base">🌸</span>
              <p className="text-sm font-black text-slate-800">{trip.destination}</p>
            </div>
            <div className="space-y-2">
              {tripChanges.map((line, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-300 flex-shrink-0" />
                  <p className="text-xs text-slate-500">{line}</p>
                </div>
              ))}
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="mt-3 text-xs font-bold text-violet-500 flex items-center gap-1 hover:text-violet-700"
            >
              Edit trip details <ChevronRight size={12} />
            </button>
          </div>
        </>
      )}

      {/* ── Appearance (placeholder) ── */}
      <SectionHeader title="Appearance" />
      <div className="mx-4 sm:mx-6 bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-4">
        <p className="text-xs font-bold text-slate-400 mb-2 flex items-center gap-1.5">
          <Palette size={12} /> Theme
        </p>
        <div className="grid grid-cols-3 gap-2">
          {THEMES.map(t => (
            <button
              key={t.value}
              onClick={() => set('theme', t.value)}
              className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                settings.theme === t.value
                  ? 'border-violet-400 bg-violet-50 text-violet-700 scale-[1.03]'
                  : 'border-slate-100 bg-slate-50 text-slate-500'
              }`}
            >
              <span className="text-lg">{t.emoji}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Preferences (placeholder) ── */}
      <SectionHeader title="Preferences" />
      <div className="mx-4 sm:mx-6 bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.05)] overflow-hidden divide-y divide-slate-50">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <DollarSign size={15} className="text-emerald-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-800">Default currency</p>
          </div>
          <select
            value={settings.currency}
            onChange={e => set('currency', e.target.value as Currency)}
            className="text-xs font-bold text-violet-600 bg-violet-50 border-none rounded-xl px-2 py-1.5 focus:outline-none cursor-pointer"
          >
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-8 h-8 rounded-xl bg-sky-50 flex items-center justify-center flex-shrink-0">
            <Clock size={15} className="text-sky-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-800">Trip reminder</p>
            <p className="text-xs text-slate-400">Days before departure</p>
          </div>
          <select
            value={settings.reminderDaysBefore}
            onChange={e => set('reminderDaysBefore', Number(e.target.value))}
            className="text-xs font-bold text-violet-600 bg-violet-50 border-none rounded-xl px-2 py-1.5 focus:outline-none cursor-pointer"
          >
            {[1, 2, 3, 5, 7, 14].map(n => <option key={n} value={n}>{n} days</option>)}
          </select>
        </div>
      </div>

      {/* ── Notifications (placeholder) ── */}
      <SectionHeader title="Notifications" />
      <div className="mx-4 sm:mx-6 bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.05)] overflow-hidden divide-y divide-slate-50">
        <SettingRow
          icon={Bell}
          label="Push notifications"
          sub="Activity reminders & updates"
          iconColor="bg-pink-50 text-pink-400"
          action={<Toggle on={settings.notifications} onToggle={() => set('notifications', !settings.notifications)} />}
        />
        <SettingRow
          icon={Sparkles}
          label="Weekly recap"
          sub="Summary of your trip progress"
          iconColor="bg-amber-50 text-amber-500"
          action={<Toggle on={settings.weeklyRecap} onToggle={() => set('weeklyRecap', !settings.weeklyRecap)} />}
        />
      </div>

      {/* ── Account actions (logout real, delete still placeholder-ish) ── */}
      <SectionHeader title="Account" />
      <div className="mx-4 sm:mx-6 bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.05)] overflow-hidden divide-y divide-slate-50">
        <SettingRow
          icon={User}
          label="Account info"
          sub={email}
          iconColor="bg-violet-50 text-violet-500"
          action={<ChevronRight size={15} className="text-slate-300" />}
        />
        <button
          onClick={() => setConfirmLogout(true)}
          className="flex items-center gap-3 px-4 py-3 w-full hover:bg-slate-50 transition-colors"
        >
          <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center">
            <LogOut size={15} className="text-slate-500" />
          </div>
          <p className="text-sm font-semibold text-slate-700">Log out</p>
          <ChevronRight size={15} className="text-slate-300 ml-auto" />
        </button>
        <button
          onClick={() => setConfirmDelete(true)}
          className="flex items-center gap-3 px-4 py-3 w-full hover:bg-rose-50 transition-colors"
        >
          <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center">
            <Trash2 size={15} className="text-rose-400" />
          </div>
          <p className="text-sm font-semibold text-rose-500">Delete account</p>
          <ChevronRight size={15} className="text-rose-200 ml-auto" />
        </button>
      </div>

      <div className="text-center mt-8 mb-4">
        <p className="text-[11px] text-slate-300 font-medium">TripFlow · v{MOCK_VERSION.current} · Made with 🌸</p>
      </div>

      {/* ── Saved toast ── */}
      <AnimatePresence>
        {saved && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-lg whitespace-nowrap"
          >
            <CheckCircle2 size={13} className="text-emerald-400" /> Settings saved
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Changelog sheet (placeholder) ── */}
      <AnimatePresence>
        {showChangelog && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowChangelog(false)}
          >
            <motion.div
              className="w-full max-w-screen-md bg-white rounded-t-3xl p-5 pb-10 max-h-[80vh] overflow-y-auto"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4" />
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-black text-slate-900">What's new ✨</h2>
                <button onClick={() => setShowChangelog(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <X size={15} />
                </button>
              </div>
              <div className="space-y-5">
                {MOCK_VERSION.changelog.map((entry, i) => (
                  <div key={entry.version}>
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`text-xs font-black px-2.5 py-1 rounded-full ${i === 0 ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-500'}`}
                      >
                        v{entry.version}
                      </span>
                      <span className="text-xs text-slate-400">{entry.date}</span>
                      {i === 0 && (
                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Latest</span>
                      )}
                    </div>
                    <ul className="space-y-1.5 pl-1">
                      {entry.notes.map((note, j) => (
                        <li key={j} className="flex items-start gap-2 text-sm text-slate-600">
                          <span className="text-violet-300 mt-0.5 flex-shrink-0">•</span>
                          {note}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              {hasUpdate && (
                <button
                  onClick={() => { setShowChangelog(false); handleUpdate(); }}
                  className="w-full mt-6 py-3.5 rounded-full text-white font-black text-sm shadow-[0_6px_18px_rgba(124,92,255,0.35)]"
                  style={{ background: 'linear-gradient(135deg, #7C5CFF, #8B5CF6)' }}
                >
                  Update to v{MOCK_VERSION.latest} 🌸
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Logout confirm (real) ── */}
      <AnimatePresence>
        {confirmLogout && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => !loggingOut && setConfirmLogout(false)}
          >
            <motion.div
              className="w-full max-w-screen-md bg-white rounded-t-3xl p-5 pb-10"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5" />
              <div className="flex flex-col items-center text-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                  <LogOut size={20} className="text-slate-500" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 mb-1">Log out?</h3>
                  <p className="text-sm text-slate-400">You can log back in any time.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setConfirmLogout(false)} disabled={loggingOut}
                  className="flex-1 py-3 rounded-full bg-slate-100 text-slate-600 font-bold text-sm disabled:opacity-50">
                  Cancel
                </button>
                <button onClick={handleLogout} disabled={loggingOut}
                  className="flex-1 py-3 rounded-full bg-slate-800 text-white font-bold text-sm disabled:opacity-50">
                  {loggingOut ? 'Logging out…' : 'Log out'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Delete account confirm ── */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => !deleting && setConfirmDelete(false)}
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
                  <AlertTriangle size={20} className="text-rose-500" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 mb-1">Delete account?</h3>
                  <p className="text-sm text-slate-400">This will permanently erase your account, all trips, and data. This cannot be undone.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setConfirmDelete(false)} disabled={deleting}
                  className="flex-1 py-3 rounded-full bg-slate-100 text-slate-600 font-bold text-sm disabled:opacity-50">
                  Cancel
                </button>
                <button onClick={handleDeleteAccount} disabled={deleting}
                  className="flex-1 py-3 rounded-full bg-rose-500 text-white font-bold text-sm disabled:opacity-50">
                  {deleting ? 'Deleting…' : 'Delete forever'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}