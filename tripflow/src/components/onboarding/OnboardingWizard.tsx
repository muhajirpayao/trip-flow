// src/components/onboarding/OnboardingWizard.tsx
// PHP added to currencies; date inputs block past dates; name step added.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, User, MapPin, Calendar, Wallet, Users, CheckCircle } from 'lucide-react';
import { useTrip } from '../../context/TripContext';
import type { OnboardingForm, Trip, TravelType, Currency } from '../../types';
import { tripDays, fmtDate } from '../../utils';

const STEPS = ['Your Name', 'Destination', 'Dates', 'Budget', 'Travel Type', 'Review'];

const DESTINATIONS = [
  { emoji: '🇯🇵', label: 'Japan' },
  { emoji: '🇸🇬', label: 'Singapore' },
  { emoji: '🇭🇰', label: 'Hong Kong' },
  { emoji: '🇮🇹', label: 'Italy' },
  { emoji: '🇹🇭', label: 'Thailand' },
  { emoji: '🇫🇷', label: 'France' },
  { emoji: '🇵🇭', label: 'Philippines' },
];
const CURRENCIES: Currency[] = ['PHP', 'USD', 'EUR', 'GBP', 'JPY', 'SGD', 'AUD', 'CAD', 'HKD'];
const TRAVEL_TYPES: { value: TravelType; icon: string; label: string }[] = [
  { value: 'solo',    icon: '🧳', label: 'Solo' },
  { value: 'couple',  icon: '💑', label: 'Couple' },
  { value: 'family',  icon: '👨‍👩‍👧', label: 'Family' },
  { value: 'friends', icon: '👯', label: 'Friends' },
];

const EMPTY_FORM: OnboardingForm = {
  name: '', dest: '', startDate: '', endDate: '', budget: '', currency: 'PHP', travelType: '',
};

// Today's date in YYYY-MM-DD format (used as min for date pickers)
const TODAY = new Date().toISOString().slice(0, 10);

interface Props { onClose: () => void; }

export default function OnboardingWizard({ onClose }: Props) {
  const [step, setStep]     = useState(0);
  const [form, setForm]     = useState<OnboardingForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const { saveTrip }        = useTrip();
  const navigate            = useNavigate();

  const set = (key: keyof OnboardingForm, val: string) => {
    setForm(f => ({ ...f, [key]: val }));
    setErrors(e => ({ ...e, [key]: '' }));
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (step === 0 && !form.name.trim()) e.name = 'Tell us what to call you';
    if (step === 1 && !form.dest.trim()) e.dest = 'Enter a destination';
    if (step === 2) {
      if (!form.startDate) e.startDate = 'Pick a start date';
      if (!form.endDate)   e.endDate   = 'Pick an end date';
      if (form.startDate && form.startDate < TODAY) e.startDate = 'Start date cannot be in the past';
      if (form.startDate && form.endDate && form.endDate <= form.startDate)
        e.endDate = 'End must be after start';
    }
    if (step === 3 && (!form.budget || Number(form.budget) <= 0)) e.budget = 'Enter a valid budget';
    if (step === 4 && !form.travelType) e.travelType = 'Choose a travel type';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validate()) setStep(s => s + 1); };
  const back = () => setStep(s => s - 1);

  const create = async () => {
    setSaving(true);
    const trip: Trip = {
      id:          Date.now().toString(),
      displayName: form.name.trim(),
      destination: form.dest.trim(),
      startDate:   form.startDate,
      endDate:     form.endDate,
      budget:      Number(form.budget),
      currency:    form.currency,
      travelType:  form.travelType as TravelType,
      createdAt:   new Date().toISOString(),
    };
    const saved = await saveTrip(trip);
    setSaving(false);
    if (saved) {
      navigate('/dashboard/trip');
    } else {
      console.error('Unable to save trip.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 backdrop-blur-sm px-0">
      <div className="w-full max-w-screen-md bg-white rounded-t-[28px] pb-10 max-h-[92vh] overflow-y-auto no-scrollbar">

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Step {step + 1} of {STEPS.length}</p>
            <p className="text-base font-bold text-slate-900">{STEPS[step]}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 transition-colors">
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="flex gap-2 px-6 py-4">
          {STEPS.map((_, i) => (
            <div key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${i <= step ? 'bg-gradient-to-r from-indigo-500 to-violet-600' : 'bg-slate-100'} ${i === step ? 'flex-[2]' : 'flex-1'}`}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="px-6 pb-4">

          {/* Step 0: Name */}
          {step === 0 && (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <User size={20} className="text-indigo-500" />
                <h2 className="text-xl font-bold">What should we call you?</h2>
              </div>
              <p className="text-sm text-slate-500 mb-5">We'll use this to greet you on your dashboard.</p>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Preferred name</label>
              <input
                type="text"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="e.g. Marco"
                autoFocus
                className={`w-full px-4 py-3.5 rounded-xl border text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all ${errors.name ? 'border-red-400' : 'border-slate-200'}`}
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>
          )}

          {/* Step 1: Destination */}
          {step === 1 && (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <MapPin size={20} className="text-indigo-500" />
                <h2 className="text-xl font-bold">Where are you headed?</h2>
              </div>
              <p className="text-sm text-slate-500 mb-5">Pick your dream destination.</p>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Destination</label>
              <input
                type="text"
                value={form.dest}
                onChange={e => set('dest', e.target.value)}
                placeholder="e.g. Tokyo, Japan"
                className={`w-full px-4 py-3.5 rounded-xl border text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all ${errors.dest ? 'border-red-400' : 'border-slate-200'}`}
              />
              {errors.dest && <p className="text-xs text-red-500 mt-1">{errors.dest}</p>}
              <div className="flex flex-wrap gap-2 mt-4">
                {DESTINATIONS.map(d => (
                  <button key={d.label} onClick={() => set('dest', d.label)}
                    className="px-3 py-1.5 rounded-full bg-slate-100 text-xs font-medium text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
                    {d.emoji} {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Dates */}
          {step === 2 && (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Calendar size={20} className="text-indigo-500" />
                <h2 className="text-xl font-bold">When are you going?</h2>
              </div>
              <p className="text-sm text-slate-500 mb-5">Set your departure and return dates.</p>

              {/* Start date */}
              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={form.startDate}
                  min={TODAY}
                  onChange={e => {
                    set('startDate', e.target.value);
                    // Reset end date if it's now before start
                    if (form.endDate && e.target.value >= form.endDate) {
                      set('endDate', '');
                    }
                  }}
                  className={`w-full px-4 py-3.5 rounded-xl border text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all ${errors.startDate ? 'border-red-400' : 'border-slate-200'}`}
                />
                {errors.startDate && <p className="text-xs text-red-500 mt-1">{errors.startDate}</p>}
              </div>

              {/* End date */}
              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={form.endDate}
                  min={form.startDate || TODAY}
                  onChange={e => set('endDate', e.target.value)}
                  className={`w-full px-4 py-3.5 rounded-xl border text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all ${errors.endDate ? 'border-red-400' : 'border-slate-200'}`}
                />
                {errors.endDate && <p className="text-xs text-red-500 mt-1">{errors.endDate}</p>}
              </div>

              {form.startDate && form.endDate && form.endDate > form.startDate && (
                <div className="mt-3 px-4 py-3 bg-indigo-50 rounded-xl flex items-center gap-2">
                  <span className="text-xl">🗓️</span>
                  <span className="text-sm font-semibold text-indigo-700">{tripDays(form.startDate, form.endDate)} days of adventure</span>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Budget */}
          {step === 3 && (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Wallet size={20} className="text-indigo-500" />
                <h2 className="text-xl font-bold">What's your budget?</h2>
              </div>
              <p className="text-sm text-slate-500 mb-5">We'll help you track spending.</p>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Currency</label>
              <div className="flex flex-wrap gap-2 mb-4">
                {CURRENCIES.map(c => (
                  <button key={c} onClick={() => set('currency', c)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${form.currency === c ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white border-transparent' : 'border-slate-200 text-slate-600 bg-white'}`}>
                    {c}
                  </button>
                ))}
              </div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Amount</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">{form.currency}</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={form.budget ? Number(form.budget).toLocaleString() : ''}
                  onChange={e => set('budget', e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="0"
                  className={`w-full pl-14 pr-4 py-3.5 rounded-xl border text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all ${errors.budget ? 'border-red-400' : 'border-slate-200'}`}
                />
              </div>
              {errors.budget && <p className="text-xs text-red-500 mt-1">{errors.budget}</p>}
            </div>
          )}

          {/* Step 4: Travel type */}
          {step === 4 && (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Users size={20} className="text-indigo-500" />
                <h2 className="text-xl font-bold">Who's travelling?</h2>
              </div>
              <p className="text-sm text-slate-500 mb-5">Help us personalise your experience.</p>
              {errors.travelType && <p className="text-xs text-red-500 mb-3">{errors.travelType}</p>}
              <div className="grid grid-cols-2 gap-3">
                {TRAVEL_TYPES.map(t => (
                  <button key={t.value} onClick={() => set('travelType', t.value)}
                    className={`flex flex-col items-center gap-2 p-5 rounded-2xl border-2 transition-all ${form.travelType === t.value ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-white hover:border-indigo-200'}`}>
                    <span className="text-3xl">{t.icon}</span>
                    <span className={`text-sm font-semibold ${form.travelType === t.value ? 'text-indigo-700' : 'text-slate-600'}`}>{t.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 5: Review */}
          {step === 5 && (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle size={20} className="text-emerald-500" />
                <h2 className="text-xl font-bold">Ready to go! 🎉</h2>
              </div>
              <p className="text-sm text-slate-500 mb-5">Your trip summary looks great.</p>
              <div className="bg-slate-50 rounded-2xl overflow-hidden border border-slate-100">
                {[
                  { label: 'Name',          value: form.name },
                  { label: 'Destination',   value: form.dest },
                  { label: 'Start',         value: fmtDate(form.startDate) },
                  { label: 'End',           value: fmtDate(form.endDate) },
                  { label: 'Duration',      value: `${tripDays(form.startDate, form.endDate)} days` },
                  { label: 'Budget',        value: `${form.currency} ${Number(form.budget).toLocaleString()}` },
                  { label: 'Travelling as', value: form.travelType.charAt(0).toUpperCase() + form.travelType.slice(1) },
                ].map(({ label, value }, i, arr) => (
                  <div key={label}
                    className={`flex justify-between items-center px-4 py-3.5 ${i < arr.length - 1 ? 'border-b border-slate-200' : ''}`}>
                    <span className="text-sm text-slate-500">{label}</span>
                    <span className="text-sm font-semibold text-slate-900">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer nav */}
        <div className="px-6 flex gap-3 pt-2">
          {step > 0 && (
            <button onClick={back}
              className="flex-1 py-4 rounded-full bg-slate-100 text-slate-700 font-semibold text-sm hover:bg-slate-200 transition-colors">
              Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button onClick={next}
              className="flex-[2] py-4 rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-bold text-sm shadow-lg shadow-indigo-200 hover:opacity-90 transition-opacity">
              Continue →
            </button>
          ) : (
            <button onClick={create} disabled={saving}
              className="flex-[2] py-4 rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-bold text-sm shadow-lg shadow-indigo-200 hover:opacity-90 transition-opacity disabled:opacity-50">
              {saving ? 'Saving…' : 'Create My Trip 🚀'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}