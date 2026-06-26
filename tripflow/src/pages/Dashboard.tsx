import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTrip } from '../context/TripContext';
import OnboardingWizard from '../components/onboarding/OnboardingWizard';
import { daysUntil, tripDays, fmtDate, fmtShort, fmtCurrency } from '../utils';
import { Calendar, Wallet, MapPin, CheckSquare, Plus, ArrowRight, Trash2 } from 'lucide-react';

const QUICK = [
  { icon: Calendar, label: 'Add Day', to: '/dashboard/itinerary', color: 'bg-indigo-50 text-indigo-600' },
  { icon: Wallet, label: 'Add Cost', to: '/dashboard/expenses', color: 'bg-emerald-50 text-emerald-600' },
  { icon: MapPin, label: 'Save Place', to: '/dashboard/places', color: 'bg-rose-50 text-rose-500' },
  { icon: CheckSquare, label: 'Packing', to: '/dashboard/packing', color: 'bg-amber-50 text-amber-600' },
];

export default function Dashboard() {
  const { trip, clearTrip, deleteTrip } = useTrip();
  const [showOnboarding, setShowOnboarding] = useState(!trip);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removing, setRemoving] = useState(false);
  const navigate = useNavigate();

  if (!trip && !showOnboarding) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center">
        <div className="text-6xl mb-4">🗺️</div>
        <h2 className="text-2xl font-black mb-2">No trip yet</h2>
        <p className="text-slate-500 mb-6">Create your first trip to get started.</p>
        <button onClick={() => setShowOnboarding(true)} className="px-6 py-3 rounded-full gradient-primary text-white font-bold shadow-hero">
          Plan a trip
        </button>
        {showOnboarding && <OnboardingWizard onClose={() => setShowOnboarding(false)} />}
      </div>
    );
  }

  if (!trip) return showOnboarding ? <OnboardingWizard onClose={() => navigate('/')} /> : null;

  const days = daysUntil(trip.startDate);
  const total = tripDays(trip.startDate, trip.endDate);
  const typeIcon = { solo: '🧳', couple: '💑', family: '👨‍👩‍👧', friends: '👯' }[trip.travelType];

  const handleRemoveTrip = async () => {
    setRemoving(true);
    const ok = await deleteTrip();
    setRemoving(false);
    setConfirmRemove(false);
    if (ok) {
      clearTrip();
      navigate('/dashboard');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      {/* Header */}
      <div className="gradient-primary pt-12 pb-16 px-4 sm:px-5 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/10" />
        <div className="absolute -bottom-8 left-8 w-32 h-32 rounded-full bg-white/8" />
        <div className="relative z-10 flex justify-between items-start gap-3">
          <div className="min-w-0">
            <p className="text-indigo-200 text-sm mb-1">Welcome back, Traveler 👋</p>
            <h1 className="text-white text-xl sm:text-2xl font-black leading-tight mb-1 truncate">{trip.destination}</h1>
            <p className="text-indigo-200 text-sm">
              {days === 0 ? 'Your adventure starts today! 🎉' : `${days} day${days === 1 ? '' : 's'} to departure`}
            </p>
          </div>
          <button onClick={() => setConfirmRemove(true)}
            className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-3 py-2 rounded-full transition-colors flex-shrink-0">
            <Trash2 size={12} />
            <span className="hidden sm:inline">Remove trip</span>
          </button>
        </div>
      </div>

      <div className="px-3 sm:px-4 -mt-10 pb-6 relative z-10 space-y-4">
        {/* Countdown card */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-card flex items-center gap-3 sm:gap-4">
          <div className="gradient-sky w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex flex-col items-center justify-center text-white flex-shrink-0">
            <span className="text-xl sm:text-2xl font-black leading-none">{days}</span>
            <span className="text-[10px] font-semibold opacity-80">days</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Departure countdown</p>
            <p className="text-sm font-bold text-slate-900 truncate">{fmtShort(trip.startDate)} → {fmtDate(trip.endDate)}</p>
            <p className="text-xs text-slate-500 truncate">{total} days · {trip.travelType.charAt(0).toUpperCase() + trip.travelType.slice(1)} trip {typeIcon}</p>
          </div>
          <div className="text-2xl sm:text-3xl flex-shrink-0">✈️</div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
          {[
            { icon: '📅', label: 'Total Days', value: total.toString(), sub: 'days of travel' },
            { icon: '💰', label: 'Budget', value: fmtCurrency(trip.budget, trip.currency), sub: 'total budget', small: true },
            { icon: '📍', label: 'Places', value: '0', sub: 'saved spots' },
            { icon: '✅', label: 'Packing', value: '0%', sub: 'items packed' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl p-3 sm:p-4 shadow-card min-w-0">
              <div className="text-xl mb-2">{s.icon}</div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 truncate">{s.label}</p>
              <p className={`font-black text-slate-900 leading-tight truncate ${s.small ? 'text-sm sm:text-base' : 'text-xl sm:text-2xl'}`}>{s.value}</p>
              <p className="text-[11px] text-slate-400 mt-0.5 truncate">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div>
          <h2 className="text-base font-black text-slate-900 mb-3">Quick access</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {QUICK.map(({ icon: Icon, label, to, color }) => (
              <button key={label} onClick={() => navigate(to)}
                className="bg-white rounded-2xl py-3 px-2 flex flex-col items-center gap-1.5 shadow-card active:scale-95 transition-transform">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
                  <Icon size={16} />
                </div>
                <span className="text-[10px] font-semibold text-slate-600 text-center leading-tight">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Trip details */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-card">
          <div className="flex justify-between items-center mb-4 gap-2">
            <h2 className="text-base font-black text-slate-900">Trip details</h2>
            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full flex-shrink-0">
              {trip.travelType}
            </span>
          </div>
          {[
            { label: 'Destination', value: trip.destination },
            { label: 'Departure', value: fmtDate(trip.startDate) },
            { label: 'Return', value: fmtDate(trip.endDate) },
            { label: 'Duration', value: `${total} days` },
            { label: 'Budget', value: fmtCurrency(trip.budget, trip.currency) },
          ].map(({ label, value }, i, arr) => (
            <div key={label} className={`flex justify-between items-center gap-3 py-3 ${i < arr.length - 1 ? 'border-b border-slate-50' : ''}`}>
              <span className="text-sm text-slate-500 flex-shrink-0">{label}</span>
              <span className="text-sm font-semibold text-slate-900 truncate text-right">{value}</span>
            </div>
          ))}
        </div>

        {/* Recent activity (empty state) */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-base font-black text-slate-900">Recent activity</h2>
            <button className="flex items-center gap-1 text-xs font-semibold text-indigo-600">
              View all <ArrowRight size={12} />
            </button>
          </div>
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-card text-center">
            <div className="text-5xl mb-3">🌅</div>
            <h3 className="text-base font-black text-slate-900 mb-2">Your adventure begins here</h3>
            <p className="text-sm text-slate-500 leading-relaxed mb-5">
              Add itinerary items, log expenses, and save places to see your activity here.
            </p>
            <button onClick={() => navigate('/dashboard/itinerary')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full gradient-primary text-white text-sm font-bold shadow-hero hover:opacity-90">
              <Plus size={14} />
              Start planning
            </button>
          </div>
        </div>
      </div>

      {showOnboarding && <OnboardingWizard onClose={() => setShowOnboarding(false)} />}

      {/* Remove trip confirmation */}
      <AnimatePresence>
        {confirmRemove && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-5"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => !removing && setConfirmRemove(false)}
          >
            <motion.div
              className="w-full max-w-sm bg-white rounded-3xl p-6 text-center"
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 22, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-4">
                <Trash2 size={22} />
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-2">Remove this trip?</h3>
              <p className="text-sm text-slate-500 mb-6">
                "{trip.destination}" will be permanently deleted. This can't be undone.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmRemove(false)} disabled={removing}
                  className="flex-1 py-3 rounded-full bg-slate-100 text-slate-600 font-bold text-sm disabled:opacity-50">
                  Cancel
                </button>
                <button onClick={handleRemoveTrip} disabled={removing}
                  className="flex-1 py-3 rounded-full bg-rose-500 text-white font-bold text-sm disabled:opacity-50">
                  {removing ? 'Removing…' : 'Remove'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}