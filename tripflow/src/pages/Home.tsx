// src/pages/Home.tsx
// Authenticated home — shows past trips + create new

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTrip } from '../context/TripContext';
import OnboardingWizard from '../components/onboarding/OnboardingWizard';
import { fmtDate, tripDays, daysUntil } from '../utils';
import { Plus, MapPin, Calendar, Clock, ChevronRight, Compass, } from 'lucide-react';
import type { Trip } from '../types';

const DESTINATION_COVERS: Record<string, string> = {
  japan: '🗾', singapore: '🌃', 'hong kong': '🌉', italy: '🏛️',
  thailand: '🏖️', france: '🗼', philippines: '🏝️', bali: '🌴',
  default: '✈️',
};

function getCover(destination: string) {
  const key = destination.toLowerCase();
  for (const [k, v] of Object.entries(DESTINATION_COVERS)) {
    if (key.includes(k)) return v;
  }
  return DESTINATION_COVERS.default;
}

const PALETTE = [
  'from-indigo-500 to-violet-600',
  'from-rose-400 to-pink-600',
  'from-amber-400 to-orange-500',
  'from-teal-400 to-emerald-600',
  'from-sky-400 to-blue-600',
  'from-fuchsia-500 to-purple-600',
];

function TripCard({ trip, index, onClick }: { trip: Trip; index: number; onClick: () => void }) {
  const gradient = PALETTE[index % PALETTE.length];
  const cover = getCover(trip.destination);
  const days = tripDays(trip.startDate, trip.endDate);
  const countdown = daysUntil(trip.startDate);
  const isPast = new Date(trip.endDate) < new Date();
  const isActive = !isPast && countdown <= 0;

  return (
    <button
      onClick={onClick}
      className="w-full text-left group relative rounded-3xl overflow-hidden shadow-lg active:scale-[0.98] transition-transform duration-150"
    >
      {/* Gradient background */}
      <div className={`bg-gradient-to-br ${gradient} p-5 pb-8 relative overflow-hidden`}>
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/10 -translate-y-8 translate-x-8" />
        <div className="absolute bottom-0 left-4 w-20 h-20 rounded-full bg-black/10 translate-y-6" />

        {/* Status badge */}
        <div className="flex items-start justify-between mb-6 relative z-10">
          <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
            isPast ? 'bg-black/20 text-white/70' :
            isActive ? 'bg-white text-emerald-600' :
            'bg-white/20 text-white'
          }`}>
            {isPast ? 'Completed' : isActive ? '🟢 Ongoing' : `${countdown}d away`}
          </span>
          <span className="text-4xl relative z-10">{cover}</span>
        </div>

        <div className="relative z-10">
          <h3 className="text-xl font-black text-white leading-tight mb-1">{trip.destination}</h3>
          <div className="flex items-center gap-1.5 text-white/70 text-xs font-medium">
            <Calendar size={11} />
            <span>{fmtDate(trip.startDate)} → {fmtDate(trip.endDate)}</span>
          </div>
        </div>
      </div>

      {/* Bottom strip */}
      <div className="bg-white px-5 py-3.5 flex items-center justify-between border-t border-slate-100">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Duration</p>
            <p className="text-sm font-black text-slate-900">{days} days</p>
          </div>
          <div className="w-px h-8 bg-slate-100" />
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Budget</p>
            <p className="text-sm font-black text-slate-900">{trip.currency} {Number(trip.budget).toLocaleString()}</p>
          </div>
          <div className="w-px h-8 bg-slate-100" />
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Type</p>
            <p className="text-sm font-black text-slate-900 capitalize">{trip.travelType}</p>
          </div>
        </div>
        <ChevronRight size={18} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
      </div>
    </button>
  );
}

function EmptyState({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-col items-center text-center px-6 py-12">
      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center mb-6 text-5xl">
        🌍
      </div>
      <h2 className="text-xl font-black text-slate-900 mb-2">No trips yet</h2>
      <p className="text-sm text-slate-500 leading-relaxed mb-8 max-w-[260px]">
        Your travel history will appear here. Plan your first adventure to get started.
      </p>
      <button
        onClick={onStart}
        className="flex items-center gap-2 px-7 py-3.5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-bold text-sm shadow-lg shadow-indigo-200 active:scale-95 transition-transform"
      >
        <Plus size={16} />
        Plan my first trip
      </button>
    </div>
  );
}

export default function Home() {
  const { user,} = useAuth();
  const { allTrips, loadingTrips, saveTrip } = useTrip();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const navigate = useNavigate();

  const firstName = user?.email?.split('@')[0] ?? 'Traveler';
  const upcoming = allTrips.filter(t => new Date(t.endDate) >= new Date());
  const past = allTrips.filter(t => new Date(t.endDate) < new Date());

  const handleTripClick = async (trip: Trip) => {
    // Set as active trip then navigate to trip detail
    const saved = await saveTrip(trip);
    if (saved) {
      navigate('/dashboard/trip');
    }
  };

  if (loadingTrips) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 rounded-full border-4 border-indigo-200 border-t-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">

      {/* Hero header */}
      <div className="bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 px-6 pt-14 pb-20 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/5 -translate-y-20 translate-x-20" />
        <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-black/10 translate-y-16 -translate-x-12" />
        <div className="absolute top-12 left-1/2 w-32 h-32 rounded-full bg-white/5" />

        {/* Top bar */}
        <div className="flex items-center justify-between mb-8 relative z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <Compass size={16} className="text-white" />
            </div>
            <span className="text-white font-black text-lg tracking-tight">TripFlow</span>
          </div>
        </div>

        {/* Greeting */}
        <div className="relative z-10">
          <p className="text-indigo-200 text-sm font-medium mb-1">Good to see you back ✈️</p>
          <h1 className="text-3xl font-black text-white leading-tight mb-1 capitalize">
            {firstName}
          </h1>
          <p className="text-indigo-200 text-sm">
            {allTrips.length === 0
              ? 'Ready to plan your first adventure?'
              : `${allTrips.length} trip${allTrips.length > 1 ? 's' : ''} · ${upcoming.length} upcoming`}
          </p>
        </div>

        {/* Stats row */}
        {allTrips.length > 0 && (
          <div className="flex gap-3 mt-6 relative z-10">
            {[
              { val: allTrips.length, label: 'Trips' },
              { val: upcoming.length, label: 'Upcoming' },
              { val: past.length, label: 'Completed' },
            ].map(({ val, label }) => (
              <div key={label} className="flex-1 bg-white/15 backdrop-blur-sm rounded-2xl py-3 px-3 text-center">
                <p className="text-xl font-black text-white">{val}</p>
                <p className="text-[10px] font-semibold text-indigo-200 uppercase tracking-wider">{label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Content — pulled up over hero */}
      <div className="px-4 -mt-10 relative z-10 space-y-6">

        {/* Plan new trip CTA */}
        <button
          onClick={() => setShowOnboarding(true)}
          className="w-full flex items-center justify-between bg-white rounded-3xl p-5 shadow-xl shadow-slate-200/60 active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-200">
              <Plus size={22} className="text-white" />
            </div>
            <div className="text-left">
              <p className="text-sm font-black text-slate-900">Plan a new trip</p>
              <p className="text-xs text-slate-500">Destination, dates, budget</p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center">
            <ChevronRight size={16} className="text-indigo-500" />
          </div>
        </button>

        {/* Upcoming trips */}
        {upcoming.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3 px-1">
              <Clock size={15} className="text-indigo-500" />
              <h2 className="text-sm font-black text-slate-700 uppercase tracking-wider">Upcoming</h2>
            </div>
            <div className="space-y-3">
              {upcoming.map((trip, i) => (
                <TripCard key={trip.id} trip={trip} index={i} onClick={() => handleTripClick(trip)} />
              ))}
            </div>
          </div>
        )}

        {/* Past trips */}
        {past.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3 px-1">
              <MapPin size={15} className="text-slate-400" />
              <h2 className="text-sm font-black text-slate-500 uppercase tracking-wider">Travel history</h2>
            </div>
            <div className="space-y-3">
              {past.map((trip, i) => (
                <TripCard key={trip.id} trip={trip} index={upcoming.length + i} onClick={() => handleTripClick(trip)} />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {allTrips.length === 0 && (
          <div className="bg-white rounded-3xl shadow-card">
            <EmptyState onStart={() => setShowOnboarding(true)} />
          </div>
        )}
      </div>

      {showOnboarding && <OnboardingWizard onClose={() => setShowOnboarding(false)} />}
    </div>
  );
}