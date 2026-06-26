import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrip } from '../context/TripContext';
import OnboardingWizard from '../components/onboarding/OnboardingWizard';
import { Calendar, Wallet, CheckSquare, MapPin, Users, Zap } from 'lucide-react';

const FEATURES = [
  { icon: Calendar, color: 'bg-indigo-50 text-indigo-500', label: 'Smart Itinerary', desc: 'Timeline-based day-by-day scheduling' },
  { icon: Wallet, color: 'bg-emerald-50 text-emerald-500', label: 'Expense Tracker', desc: 'Stay on budget with smart tracking' },
  { icon: CheckSquare, color: 'bg-amber-50 text-amber-500', label: 'Packing List', desc: 'Never forget travel essentials' },
  { icon: MapPin, color: 'bg-rose-50 text-rose-500', label: 'Saved Places', desc: 'All your destinations in one place' },
  { icon: Users, color: 'bg-sky-50 text-sky-500', label: 'Collaboration', desc: 'Plan trips with friends & family' },
  { icon: Zap, color: 'bg-violet-50 text-violet-500', label: 'AI Suggestions', desc: 'Smart recommendations for your trip' },
];

export default function LandingPage() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { trip } = useTrip();
  const navigate = useNavigate();

  const handleCTA = () => {
    if (trip) navigate('/dashboard');
    else setShowOnboarding(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col max-w-[430px] mx-auto">
      {/* Navbar */}
      <nav className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <span className="text-xl font-black text-gradient">TripFlow</span>
        <div className="flex items-center gap-2">
          <button className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors">Features</button>
          <button onClick={handleCTA}
            className="px-4 py-2 rounded-full gradient-primary text-white text-sm font-bold shadow-hero hover:opacity-90 transition-opacity">
            {trip ? 'Dashboard' : 'Get Started'}
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div className="px-6 pt-10 pb-6 text-center">
        <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-600 text-xs font-bold px-4 py-2 rounded-full mb-5">
          ✈️ Your premium travel companion
        </div>
        <h1 className="text-4xl font-black leading-tight tracking-tight mb-4">
          Plan Your <span className="text-gradient">Perfect</span> Journey
        </h1>
        <p className="text-slate-500 text-base leading-relaxed mb-7">
          Organize itineraries, track expenses, save memories, and travel stress-free.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <button onClick={handleCTA}
            className="px-7 py-3.5 rounded-full gradient-primary text-white font-bold text-base shadow-hero hover:opacity-90 transition-all active:scale-95">
            {trip ? 'Open Dashboard' : 'Get Started'}
          </button>
          <button onClick={() => { navigate('/dashboard'); }}
            className="px-7 py-3.5 rounded-full bg-white text-indigo-600 font-semibold text-base border-2 border-indigo-100 hover:border-indigo-300 transition-colors">
            Explore Demo
          </button>
        </div>

        {/* Hero illustration */}
        <div className="mt-8 rounded-3xl overflow-hidden bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 h-48 flex items-center justify-center relative">
          <div className="absolute top-4 right-6 w-14 h-14 rounded-2xl bg-white shadow-card flex items-center justify-center text-2xl">✈️</div>
          <div className="absolute bottom-4 left-6 w-12 h-12 rounded-2xl bg-white shadow-card flex items-center justify-center text-xl">📍</div>
          <div className="absolute top-8 left-12 w-10 h-10 rounded-2xl bg-white shadow-card flex items-center justify-center text-lg">🗓️</div>
          <div className="flex flex-col items-center gap-2">
            <div className="text-5xl">🌍</div>
            <div className="bg-white/80 backdrop-blur-sm px-5 py-2 rounded-full shadow-sm">
              <span className="text-sm font-bold text-indigo-700">10,000+ trips planned</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div className="mx-6 mb-6 grid grid-cols-3 gap-3">
        {[['10k+', 'Trips'], ['50+', 'Countries'], ['4.9★', 'Rating']].map(([val, lbl]) => (
          <div key={lbl} className="bg-white rounded-2xl py-3 px-2 text-center shadow-card">
            <div className="text-lg font-black text-indigo-600">{val}</div>
            <div className="text-xs text-slate-500 font-medium">{lbl}</div>
          </div>
        ))}
      </div>

      {/* Features */}
      <div className="px-6 pb-12">
        <h2 className="text-xl font-black text-slate-900 text-center mb-5">Everything you need</h2>
        <div className="grid grid-cols-2 gap-3">
          {FEATURES.map(({ icon: Icon, color, label, desc }) => (
            <div key={label}
              className="bg-white rounded-2xl p-4 border border-slate-100 shadow-card hover:shadow-md transition-shadow active:scale-95">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
                <Icon size={18} />
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">{label}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Banner */}
      <div className="mx-6 mb-10 rounded-3xl gradient-primary p-6 text-white text-center">
        <div className="text-2xl mb-2">🚀</div>
        <h3 className="text-lg font-black mb-2">Start planning today</h3>
        <p className="text-sm text-indigo-200 mb-4">Free forever. No credit card needed.</p>
        <button onClick={handleCTA}
          className="bg-white text-indigo-600 font-bold px-6 py-3 rounded-full text-sm hover:bg-indigo-50 transition-colors">
          Create your first trip
        </button>
      </div>

      {showOnboarding && <OnboardingWizard onClose={() => setShowOnboarding(false)} />}
    </div>
  );
}
