import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTrip } from '../context/TripContext';
import type { Trip } from '../types';
import OnboardingWizard from '../components/onboarding/OnboardingWizard';
import { daysUntil, tripDays, fmtDate, fmtShort, fmtCurrency } from '../utils';
import {
  Calendar, Wallet, MapPin, User,
  Plus, ArrowRight, Trash2, Pencil, X, AlertTriangle,
} from 'lucide-react';

const QUICK = [
  { icon: Calendar, label: 'Itinerary', to: '/dashboard/itinerary', color: 'bg-indigo-50 text-indigo-600' },
  { icon: Wallet,   label: 'Expenses',  to: '/dashboard/expenses',  color: 'bg-emerald-50 text-emerald-600' },
  { icon: MapPin,   label: 'Places',    to: '/dashboard/places',    color: 'bg-rose-50 text-rose-500' },
  { icon: User,     label: 'Profile',   to: '/dashboard/profile',   color: 'bg-violet-50 text-violet-500' },
];

const TRAVEL_TYPES = ['solo', 'couple', 'family', 'friends'] as const;
type TravelType = typeof TRAVEL_TYPES[number];

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'PHP', 'AUD', 'CAD', 'SGD'];

export default function Dashboard() {
  const { trip, clearTrip, deleteTrip, updateTrip } = useTrip();
  const [showOnboarding, setShowOnboarding] = useState(!trip);
  const [confirmRemove, setConfirmRemove]   = useState(false);
  const [removing, setRemoving]             = useState(false);
  const [showEditModal, setShowEditModal]   = useState(false);
  const [saving, setSaving]                 = useState(false);
  const navigate = useNavigate();

  const [editForm, setEditForm] = useState({
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
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center">
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

  const days     = daysUntil(trip.startDate);
  const total    = tripDays(trip.startDate, trip.endDate);
  const typeIcon = { solo: '🧳', couple: '💑', family: '👨‍👩‍👧', friends: '👯' }[trip.travelType];

  // ── Remove trip ──
  const handleRemoveTrip = async () => {
    setRemoving(true);
    const ok = await deleteTrip();
    setRemoving(false);
    setConfirmRemove(false);
    if (ok) { clearTrip(); navigate('/dashboard'); }
  };

  // ── Open edit modal ──
  const openEditModal = () => {
    setEditForm({
      destination: trip.destination,
      startDate:   trip.startDate,
      endDate:     trip.endDate,
      budget:      String(trip.budget),
      currency:    trip.currency,
      travelType:  trip.travelType as TravelType,
    });
    setShowEditModal(true);
  };

  // ── Save edit ──
  const handleSaveEdit = async () => {
    if (!editForm.destination.trim() || !editForm.startDate || !editForm.endDate) return;
    setSaving(true);
    await updateTrip?.({
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
    editForm.destination.trim() &&
    editForm.startDate &&
    editForm.endDate &&
    editForm.endDate >= editForm.startDate;

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      {/* Decorative background blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-16 -right-16 w-52 h-52 rounded-full opacity-[0.11]"
          style={{ background: '#7C5CFF' }} />
        <div className="absolute bottom-40 -left-10 w-36 h-36 rounded-full opacity-[0.08]"
          style={{ background: '#FFB7E1' }} />
        <div className="absolute top-1/2 -right-8 w-28 h-28 rounded-full opacity-[0.07]"
          style={{ background: '#C7E9FF' }} />
      </div>

      {/* ── Header ── */}
      <div
        className="pt-12 pb-20 px-4 sm:px-5 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #7C5CFF 0%, #8B5CF6 100%)' }}
      >
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/10" />
        <div className="absolute -bottom-8 left-8 w-32 h-32 rounded-full bg-white/[0.07]" />
        <div className="relative z-10 flex justify-between items-start gap-3">
          <div className="min-w-0">
            <p className="text-violet-200 text-sm mb-1">Welcome back, Traveler 👋</p>
            <h1 className="text-white text-xl sm:text-2xl font-black leading-tight mb-1 truncate">
              {trip.destination}
            </h1>
            <p className="text-violet-200 text-sm">
              {days === 0
                ? 'Your adventure starts today! 🎉'
                : `${days} day${days === 1 ? '' : 's'} to departure`}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={openEditModal}
              className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-3 py-2 rounded-full transition-colors"
            >
              <Pencil size={12} />
              <span className="hidden sm:inline">Edit trip</span>
            </button>
            <button
              onClick={() => setConfirmRemove(true)}
              className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-3 py-2 rounded-full transition-colors"
            >
              <Trash2 size={12} />
              <span className="hidden sm:inline">Remove trip</span>
            </button>
          </div>
        </div>
      </div>

      <div className="px-3 sm:px-4 -mt-10 pb-6 relative z-10 space-y-4">

        {/* ── Countdown card ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white rounded-3xl p-4 sm:p-5 shadow-[0_4px_24px_rgba(124,92,255,0.10)] flex items-center gap-3 sm:gap-4"
        >
          <div
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex flex-col items-center justify-center text-white flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #C7E9FF, #7C5CFF)' }}
          >
            <span className="text-xl sm:text-2xl font-black leading-none">{days}</span>
            <span className="text-[10px] font-semibold opacity-80">days</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
              Departure countdown
            </p>
            <p className="text-sm font-bold text-slate-900 truncate">
              {fmtShort(trip.startDate)} → {fmtDate(trip.endDate)}
            </p>
            <p className="text-xs text-slate-500 truncate">
              {total} days · {trip.travelType.charAt(0).toUpperCase() + trip.travelType.slice(1)} trip {typeIcon}
            </p>
          </div>
          <div className="text-2xl sm:text-3xl flex-shrink-0">✈️</div>
        </motion.div>

        {/* ── Stats grid ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.10 }}
          className="grid grid-cols-2 gap-2.5 sm:gap-3"
        >
          {[
            { icon: '📅', label: 'Total Days', value: total.toString(),                        sub: 'days of travel',  small: false },
            { icon: '💰', label: 'Budget',     value: fmtCurrency(trip.budget, trip.currency), sub: 'total budget',    small: true  },
            { icon: '📍', label: 'Places',     value: '0',                                     sub: 'saved spots',     small: false },
            { icon: '✅', label: 'Activities', value: '0',                                     sub: 'planned so far',  small: false },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl p-3 sm:p-4 shadow-[0_2px_12px_rgba(0,0,0,0.05)] min-w-0">
              <div className="text-xl mb-2">{s.icon}</div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5 truncate">
                {s.label}
              </p>
              <p className={`font-black text-slate-900 leading-tight truncate ${s.small ? 'text-sm sm:text-base' : 'text-xl sm:text-2xl'}`}>
                {s.value}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5 truncate">{s.sub}</p>
            </div>
          ))}
        </motion.div>

        {/* ── Quick access ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <h2 className="text-base font-black text-slate-900 mb-3">Quick access</h2>
          <div className="grid grid-cols-4 gap-2">
            {QUICK.map(({ icon: Icon, label, to, color }) => (
              <motion.button
                key={label}
                onClick={() => navigate(to)}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.93 }}
                className="bg-white rounded-2xl py-3 px-2 flex flex-col items-center gap-1.5 shadow-[0_2px_12px_rgba(0,0,0,0.05)]"
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
                  <Icon size={16} />
                </div>
                <span className="text-[10px] font-semibold text-slate-600 text-center leading-tight">
                  {label}
                </span>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* ── Trip details ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.20 }}
          className="bg-white rounded-3xl p-4 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.05)]"
        >
          <div className="flex justify-between items-center mb-4 gap-2">
            <h2 className="text-base font-black text-slate-900">Trip details</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={openEditModal}
                className="text-violet-500 hover:text-violet-700 transition-colors p-1 rounded-lg hover:bg-violet-50"
              >
                <Pencil size={14} />
              </button>
              <span className="text-xs font-semibold text-violet-600 bg-violet-50 px-3 py-1 rounded-full flex-shrink-0">
                {trip.travelType}
              </span>
            </div>
          </div>
          {[
            { label: 'Destination', value: trip.destination },
            { label: 'Departure',   value: fmtDate(trip.startDate) },
            { label: 'Return',      value: fmtDate(trip.endDate) },
            { label: 'Duration',    value: `${total} days` },
            { label: 'Budget',      value: fmtCurrency(trip.budget, trip.currency) },
          ].map(({ label, value }, i, arr) => (
            <div
              key={label}
              className={`flex justify-between items-center gap-3 py-3 ${i < arr.length - 1 ? 'border-b border-slate-50' : ''}`}
            >
              <span className="text-sm text-slate-400 flex-shrink-0">{label}</span>
              <span className="text-sm font-semibold text-slate-900 truncate text-right">{value}</span>
            </div>
          ))}
        </motion.div>

        {/* ── Recent activity ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-base font-black text-slate-900">Recent activity</h2>
            <button
              onClick={() => navigate('/dashboard/itinerary')}
              className="flex items-center gap-1 text-xs font-semibold text-violet-500"
            >
              View all <ArrowRight size={12} />
            </button>
          </div>
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-[0_2px_12px_rgba(0,0,0,0.05)] text-center">
            <motion.div
              className="text-5xl mb-3"
              animate={{ y: [0, -8, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
            >
              🌅
            </motion.div>
            <h3 className="text-base font-black text-slate-900 mb-2">Your adventure begins here</h3>
            <p className="text-sm text-slate-400 leading-relaxed mb-5">
              Add itinerary items, log expenses, and save places to see your activity here.
            </p>
            <motion.button
              onClick={() => navigate('/dashboard/itinerary')}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-white text-sm font-bold shadow-[0_6px_18px_rgba(124,92,255,0.35)]"
              style={{ background: 'linear-gradient(135deg, #7C5CFF 0%, #8B5CF6 100%)' }}
            >
              <Plus size={14} /> Start planning
            </motion.button>
          </div>
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
                <button
                  onClick={() => setShowEditModal(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-400"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-4">
                {/* Destination */}
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block">Destination</label>
                  <input
                    value={editForm.destination}
                    onChange={e => setEditForm({ ...editForm, destination: e.target.value })}
                    placeholder="e.g. Paris, France"
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-violet-400 bg-slate-50/50"
                  />
                </div>

                {/* Dates */}
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs font-bold text-slate-500 mb-1.5 block">Departure</label>
                    <input
                      type="date"
                      value={editForm.startDate}
                      onChange={e => setEditForm({ ...editForm, startDate: e.target.value })}
                      className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-violet-400 bg-slate-50/50"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-bold text-slate-500 mb-1.5 block">Return</label>
                    <input
                      type="date"
                      value={editForm.endDate}
                      min={editForm.startDate}
                      onChange={e => setEditForm({ ...editForm, endDate: e.target.value })}
                      className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-violet-400 bg-slate-50/50"
                    />
                  </div>
                </div>

                {/* Budget & currency */}
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs font-bold text-slate-500 mb-1.5 block">Budget</label>
                    <input
                      type="number"
                      min="0"
                      value={editForm.budget}
                      onChange={e => setEditForm({ ...editForm, budget: e.target.value })}
                      placeholder="0"
                      className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-violet-400 bg-slate-50/50"
                    />
                  </div>
                  <div className="w-28">
                    <label className="text-xs font-bold text-slate-500 mb-1.5 block">Currency</label>
                    <select
                      value={editForm.currency}
                      onChange={e => setEditForm({ ...editForm, currency: e.target.value })}
                      className="w-full px-3 py-3 rounded-2xl border border-slate-200 text-sm font-medium focus:outline-none focus:border-violet-400 bg-white"
                    >
                      {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                {/* Travel type */}
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-2 block">Travel type</label>
                  <div className="grid grid-cols-4 gap-2">
                    {TRAVEL_TYPES.map(t => {
                      const icons = { solo: '🧳', couple: '💑', family: '👨‍👩‍👧', friends: '👯' };
                      const isActive = editForm.travelType === t;
                      return (
                        <button
                          key={t}
                          onClick={() => setEditForm({ ...editForm, travelType: t })}
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
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
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
                <button
                  onClick={() => setConfirmRemove(false)}
                  disabled={removing}
                  className="flex-1 py-3 rounded-full bg-slate-100 text-slate-600 font-bold text-sm disabled:opacity-50 active:scale-95 transition-transform"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRemoveTrip}
                  disabled={removing}
                  className="flex-1 py-3 rounded-full bg-rose-500 text-white font-bold text-sm disabled:opacity-50 active:scale-95 transition-transform"
                >
                  {removing ? 'Removing…' : 'Delete Trip'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}