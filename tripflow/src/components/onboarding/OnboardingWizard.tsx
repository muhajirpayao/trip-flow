// src/components/onboarding/OnboardingWizard.tsx
// v3: skeleton loading state while allTrips is fetched, pixel-matched to wizard layout.

import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, User, MapPin, Calendar, Wallet, Users, CheckCircle, Search, ChevronRight, AlertTriangle } from 'lucide-react';
import { useTrip } from '../../context/TripContext';
import type { OnboardingForm, Trip, TravelType, Currency } from '../../types';
import { tripDays, fmtDate } from '../../utils';

// ─── Types ───────────────────────────────────────────────────────────────────
interface CountryEntry { name: string; flag: string; code: string; }

// ─── Constants ───────────────────────────────────────────────────────────────
const STEPS = ['Your Name', 'Destination', 'Dates', 'Budget', 'Travel Type', 'Review'];
const CURRENCIES: Currency[] = ['PHP', 'USD', 'EUR', 'GBP', 'JPY', 'SGD', 'AUD', 'CAD', 'HKD'];
const TRAVEL_TYPES: { value: TravelType; icon: string; label: string }[] = [
  { value: 'solo',    icon: '🧳', label: 'Solo' },
  { value: 'couple',  icon: '💑', label: 'Couple' },
  { value: 'family',  icon: '👨‍👩‍👧', label: 'Family' },
  { value: 'friends', icon: '👯', label: 'Friends' },
];

const ALL_COUNTRIES: CountryEntry[] = [
  { name: 'Afghanistan',           flag: '🇦🇫', code: 'AF' },
  { name: 'Albania',               flag: '🇦🇱', code: 'AL' },
  { name: 'Algeria',               flag: '🇩🇿', code: 'DZ' },
  { name: 'Argentina',             flag: '🇦🇷', code: 'AR' },
  { name: 'Australia',             flag: '🇦🇺', code: 'AU' },
  { name: 'Austria',               flag: '🇦🇹', code: 'AT' },
  { name: 'Bangladesh',            flag: '🇧🇩', code: 'BD' },
  { name: 'Belgium',               flag: '🇧🇪', code: 'BE' },
  { name: 'Brazil',                flag: '🇧🇷', code: 'BR' },
  { name: 'Cambodia',              flag: '🇰🇭', code: 'KH' },
  { name: 'Canada',                flag: '🇨🇦', code: 'CA' },
  { name: 'Chile',                 flag: '🇨🇱', code: 'CL' },
  { name: 'China',                 flag: '🇨🇳', code: 'CN' },
  { name: 'Colombia',              flag: '🇨🇴', code: 'CO' },
  { name: 'Croatia',               flag: '🇭🇷', code: 'HR' },
  { name: 'Czech Republic',        flag: '🇨🇿', code: 'CZ' },
  { name: 'Denmark',               flag: '🇩🇰', code: 'DK' },
  { name: 'Egypt',                 flag: '🇪🇬', code: 'EG' },
  { name: 'Finland',               flag: '🇫🇮', code: 'FI' },
  { name: 'France',                flag: '🇫🇷', code: 'FR' },
  { name: 'Germany',               flag: '🇩🇪', code: 'DE' },
  { name: 'Greece',                flag: '🇬🇷', code: 'GR' },
  { name: 'Hong Kong',             flag: '🇭🇰', code: 'HK' },
  { name: 'Hungary',               flag: '🇭🇺', code: 'HU' },
  { name: 'India',                 flag: '🇮🇳', code: 'IN' },
  { name: 'Indonesia',             flag: '🇮🇩', code: 'ID' },
  { name: 'Ireland',               flag: '🇮🇪', code: 'IE' },
  { name: 'Israel',                flag: '🇮🇱', code: 'IL' },
  { name: 'Italy',                 flag: '🇮🇹', code: 'IT' },
  { name: 'Japan',                 flag: '🇯🇵', code: 'JP' },
  { name: 'Jordan',                flag: '🇯🇴', code: 'JO' },
  { name: 'Kenya',                 flag: '🇰🇪', code: 'KE' },
  { name: 'Laos',                  flag: '🇱🇦', code: 'LA' },
  { name: 'Malaysia',              flag: '🇲🇾', code: 'MY' },
  { name: 'Maldives',              flag: '🇲🇻', code: 'MV' },
  { name: 'Mexico',                flag: '🇲🇽', code: 'MX' },
  { name: 'Morocco',               flag: '🇲🇦', code: 'MA' },
  { name: 'Myanmar',               flag: '🇲🇲', code: 'MM' },
  { name: 'Nepal',                 flag: '🇳🇵', code: 'NP' },
  { name: 'Netherlands',           flag: '🇳🇱', code: 'NL' },
  { name: 'New Zealand',           flag: '🇳🇿', code: 'NZ' },
  { name: 'Norway',                flag: '🇳🇴', code: 'NO' },
  { name: 'Pakistan',              flag: '🇵🇰', code: 'PK' },
  { name: 'Peru',                  flag: '🇵🇪', code: 'PE' },
  { name: 'Philippines',           flag: '🇵🇭', code: 'PH' },
  { name: 'Poland',                flag: '🇵🇱', code: 'PL' },
  { name: 'Portugal',              flag: '🇵🇹', code: 'PT' },
  { name: 'Qatar',                 flag: '🇶🇦', code: 'QA' },
  { name: 'Romania',               flag: '🇷🇴', code: 'RO' },
  { name: 'Russia',                flag: '🇷🇺', code: 'RU' },
  { name: 'Saudi Arabia',          flag: '🇸🇦', code: 'SA' },
  { name: 'Singapore',             flag: '🇸🇬', code: 'SG' },
  { name: 'South Africa',          flag: '🇿🇦', code: 'ZA' },
  { name: 'South Korea',           flag: '🇰🇷', code: 'KR' },
  { name: 'Spain',                 flag: '🇪🇸', code: 'ES' },
  { name: 'Sri Lanka',             flag: '🇱🇰', code: 'LK' },
  { name: 'Sweden',                flag: '🇸🇪', code: 'SE' },
  { name: 'Switzerland',           flag: '🇨🇭', code: 'CH' },
  { name: 'Taiwan',                flag: '🇹🇼', code: 'TW' },
  { name: 'Thailand',              flag: '🇹🇭', code: 'TH' },
  { name: 'Turkey',                flag: '🇹🇷', code: 'TR' },
  { name: 'Ukraine',               flag: '🇺🇦', code: 'UA' },
  { name: 'United Arab Emirates',  flag: '🇦🇪', code: 'AE' },
  { name: 'United Kingdom',        flag: '🇬🇧', code: 'GB' },
  { name: 'United States',         flag: '🇺🇸', code: 'US' },
  { name: 'Vietnam',               flag: '🇻🇳', code: 'VN' },
];

const PLACES_BY_COUNTRY: Record<string, string[]> = {
  PH: ['Manila', 'Cebu City', 'Davao City', 'Boracay', 'Palawan', 'Siargao', 'Baguio', 'Iloilo City', 'Batangas', 'Vigan', 'Dumaguete', 'Coron', 'El Nido', 'Bohol', 'Tagaytay'],
  JP: ['Tokyo', 'Osaka', 'Kyoto', 'Hiroshima', 'Sapporo', 'Nara', 'Fukuoka', 'Yokohama', 'Hakone', 'Okinawa', 'Nikko', 'Nagoya', 'Kobe'],
  SG: ['Marina Bay', 'Sentosa', 'Orchard Road', 'Chinatown', 'Little India', 'Clarke Quay', 'Gardens by the Bay'],
  HK: ['Kowloon', 'Central', 'Mong Kok', 'Lantau Island', 'Victoria Peak', 'Tsim Sha Tsui', 'Wan Chai'],
  TH: ['Bangkok', 'Chiang Mai', 'Phuket', 'Koh Samui', 'Pattaya', 'Krabi', 'Ayutthaya', 'Koh Phi Phi', 'Pai', 'Chiang Rai'],
  FR: ['Paris', 'Nice', 'Lyon', 'Marseille', 'Bordeaux', 'Strasbourg', 'Mont Saint-Michel', 'Versailles', 'Cannes', 'Avignon'],
  IT: ['Rome', 'Venice', 'Florence', 'Milan', 'Naples', 'Amalfi Coast', 'Tuscany', 'Sicily', 'Cinque Terre', 'Bologna'],
  AU: ['Sydney', 'Melbourne', 'Brisbane', 'Cairns', 'Gold Coast', 'Perth', 'Adelaide', 'Uluru', 'Great Barrier Reef', 'Byron Bay'],
  US: ['New York City', 'Los Angeles', 'Chicago', 'Miami', 'Las Vegas', 'San Francisco', 'Honolulu', 'New Orleans', 'Seattle', 'Washington DC'],
  GB: ['London', 'Edinburgh', 'Manchester', 'Liverpool', 'Oxford', 'Cambridge', 'Bath', 'York', 'Cardiff', 'Glasgow'],
  ID: ['Bali', 'Jakarta', 'Lombok', 'Yogyakarta', 'Komodo Island', 'Raja Ampat', 'Gili Islands', 'Bandung', 'Ubud', 'Flores'],
  MY: ['Kuala Lumpur', 'Penang', 'Langkawi', 'Kota Kinabalu', 'Malacca', 'Cameron Highlands', 'Johor Bahru', 'Kuching'],
  KR: ['Seoul', 'Busan', 'Jeju Island', 'Gyeongju', 'Incheon', 'Suwon', 'Jeonju', 'Sokcho'],
  VN: ['Hanoi', 'Ho Chi Minh City', 'Da Nang', 'Hoi An', 'Ha Long Bay', 'Hue', 'Nha Trang', 'Phu Quoc', 'Sapa'],
  IN: ['Mumbai', 'Delhi', 'Goa', 'Jaipur', 'Agra', 'Varanasi', 'Kerala', 'Bangalore', 'Udaipur', 'Leh-Ladakh'],
  CN: ['Beijing', 'Shanghai', "Xi'an", 'Chengdu', 'Guilin', 'Zhangjiajie', 'Hangzhou', 'Shenzhen', 'Hong Kong', 'Lhasa'],
  DE: ['Berlin', 'Munich', 'Hamburg', 'Frankfurt', 'Cologne', 'Dresden', 'Heidelberg', 'Rothenburg', 'Neuschwanstein', 'Stuttgart'],
  ES: ['Barcelona', 'Madrid', 'Seville', 'Granada', 'Valencia', 'Bilbao', 'Toledo', 'San Sebastián', 'Ibiza', 'Mallorca'],
  GR: ['Athens', 'Santorini', 'Mykonos', 'Crete', 'Rhodes', 'Corfu', 'Meteora', 'Thessaloniki', 'Zakynthos'],
  TR: ['Istanbul', 'Cappadocia', 'Antalya', 'Ephesus', 'Bodrum', 'Pamukkale', 'Trabzon', 'Izmir'],
  AE: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah', 'Fujairah'],
  MX: ['Mexico City', 'Cancún', 'Tulum', 'Oaxaca', 'Guadalajara', 'Playa del Carmen', 'Chichen Itza', 'Puerto Vallarta'],
  NZ: ['Auckland', 'Queenstown', 'Christchurch', 'Wellington', 'Rotorua', 'Milford Sound', 'Bay of Islands'],
  MA: ['Marrakech', 'Casablanca', 'Fes', 'Chefchaouen', 'Essaouira', 'Rabat', 'Agadir', 'Merzouga'],
  PT: ['Lisbon', 'Porto', 'Algarve', 'Sintra', 'Madeira', 'Azores', 'Évora', 'Braga'],
  MV: ['Malé', 'Maafushi', 'Baa Atoll', 'Hulhumale', 'Addu Atoll'],
  LK: ['Colombo', 'Kandy', 'Galle', 'Sigiriya', 'Ella', 'Negombo', 'Trincomalee'],
  NP: ['Kathmandu', 'Pokhara', 'Chitwan', 'Lumbini', 'Everest Base Camp', 'Annapurna'],
  KH: ['Siem Reap', 'Phnom Penh', 'Sihanoukville', 'Battambang', 'Koh Rong'],
  TW: ['Taipei', 'Tainan', 'Kaohsiung', 'Hualien', 'Sun Moon Lake', 'Taroko Gorge', 'Jiufen'],
};

const FEATURED_COUNTRIES = ['PH', 'JP', 'SG', 'TH'];

const EMPTY_FORM: OnboardingForm & { countryCode: string; city: string } = {
  name: '', dest: '', startDate: '', endDate: '', budget: '', currency: 'PHP', travelType: '',
  countryCode: '', city: '',
};

const TODAY = new Date().toISOString().slice(0, 10);

// ─── Overlap helper ───────────────────────────────────────────────────────────
function findOverlappingTrip(start: string, end: string, existingTrips: Trip[]): Trip | null {
  return existingTrips.find(t => start <= t.endDate && t.startDate <= end) ?? null;
}

// ─── Skeleton primitives ──────────────────────────────────────────────────────

// Injects the shimmer keyframe once into <head> — safe to call multiple times.
function useShimmerStyle() {
  useEffect(() => {
    const id = '__wizard_shimmer__';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      @keyframes wizardShimmer {
        0%   { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }
      .sk-bone {
        position: relative;
        overflow: hidden;
        background: #E5E7EB;
      }
      .sk-bone::after {
        content: '';
        position: absolute;
        inset: 0;
        transform: translateX(-100%);
        background: linear-gradient(
          90deg,
          transparent 0%,
          rgba(255,255,255,0.65) 50%,
          transparent 100%
        );
        animation: wizardShimmer 1.5s ease-in-out infinite;
        will-change: transform;
      }
    `;
    document.head.appendChild(style);
  }, []);
}

// A single shimmer bone. className drives size/shape; Tailwind classes are fine here.
function Bone({ className }: { className: string }) {
  return <div className={`sk-bone ${className}`} aria-hidden="true" />;
}

// ─── Wizard Skeleton ──────────────────────────────────────────────────────────
// Mirrors the wizard's exact chrome: handle → header → progress → step-1 content → footer.
function WizardSkeleton() {
  useShimmerStyle();

  return (
    <div className="w-full max-w-screen-md bg-white rounded-t-[28px] pb-10" aria-label="Loading…" role="status">

      {/* Handle */}
      <div className="flex justify-center pt-3 pb-1">
        <Bone className="w-10 h-1 rounded-full" />
      </div>

      {/* Header — matches real header height exactly */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div className="flex flex-col gap-2">
          {/* "Step X of Y" label */}
          <Bone className="w-20 h-2.5 rounded-full" />
          {/* Step title */}
          <Bone className="w-28 h-4 rounded-lg" />
        </div>
        {/* Close button */}
        <Bone className="w-8 h-8 rounded-full" />
      </div>

      {/* Progress bar — 6 segments */}
      <div className="flex gap-2 px-6 py-4">
        {/* Active segment slightly wider, same as real wizard */}
        <Bone className="flex-[2] h-1.5 rounded-full" />
        {[...Array(5)].map((_, i) => (
          <Bone key={i} className="flex-1 h-1.5 rounded-full" />
        ))}
      </div>

      {/* Step content — mirrors Step 0 (Name) proportions */}
      <div className="px-6 pb-4 space-y-5">

        {/* Icon + title row */}
        <div className="flex items-center gap-2">
          <Bone className="w-5 h-5 rounded-full" />
          <Bone className="w-52 h-6 rounded-xl" />
        </div>

        {/* Subtitle */}
        <Bone className="w-72 h-3.5 rounded-full" />

        {/* Field label */}
        <Bone className="w-24 h-2.5 rounded-full" />

        {/* Input field */}
        <Bone className="w-full h-12 rounded-xl" />

        {/* Spacer — the "popular countries" chip area on step 1 */}
        <div className="pt-2 space-y-3">
          <Bone className="w-16 h-2.5 rounded-full" />
          <div className="flex gap-2">
            <Bone className="w-24 h-7 rounded-full" />
            <Bone className="w-20 h-7 rounded-full" />
            <Bone className="w-24 h-7 rounded-full" />
            <Bone className="w-20 h-7 rounded-full" />
          </div>
        </div>
      </div>

      {/* Footer — one wide Continue button (no Back on step 0) */}
      <div className="px-6 flex gap-3 pt-2">
        <Bone className="flex-[2] h-14 rounded-full" />
      </div>

    </div>
  );
}

// ─── Searchable Country Picker ────────────────────────────────────────────────
interface CountryPickerProps {
  value: string;
  countryCode: string;
  onChange: (name: string, code: string) => void;
  error?: string;
}

function CountryPicker({ value, countryCode, onChange, error }: CountryPickerProps) {
  const [query, setQuery]     = useState(value);
  const [open, setOpen]       = useState(false);
  const [focused, setFocused] = useState(false);
  const containerRef          = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setFocused(false);
        if (value && query !== value) setQuery(value);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [value, query]);

  const filtered = useMemo(() => {
    if (!query.trim()) return [];
    return ALL_COUNTRIES
      .filter(c => c.name.toLowerCase().startsWith(query.toLowerCase().trim()))
      .slice(0, 8);
  }, [query]);

  const featuredList = useMemo(
    () => FEATURED_COUNTRIES.map(code => ALL_COUNTRIES.find(c => c.code === code)!).filter(Boolean),
    []
  );

  const handleSelect = (country: CountryEntry) => {
    setQuery(country.name);
    setOpen(false);
    onChange(country.name, country.code);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setOpen(true);
    if (value && val !== value) onChange('', '');
  };

  return (
    <div ref={containerRef} className="relative">
      <div className={`relative flex items-center w-full rounded-xl border text-sm bg-slate-50 transition-all
        ${error ? 'border-red-400' : focused ? 'border-indigo-400 ring-2 ring-indigo-500/20 bg-white' : 'border-slate-200'}
        ${countryCode ? 'bg-white' : ''}`}>
        <Search size={16} className="absolute left-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          placeholder="Search country… e.g. Phil"
          autoComplete="off"
          onFocus={() => { setFocused(true); setOpen(true); }}
          onChange={handleInputChange}
          className="w-full pl-10 pr-4 py-3.5 rounded-xl bg-transparent focus:outline-none text-sm"
        />
        {countryCode && (
          <span className="absolute right-4 text-lg">
            {ALL_COUNTRIES.find(c => c.code === countryCode)?.flag}
          </span>
        )}
      </div>

      {open && (
        <div className="absolute z-50 top-full mt-1 w-full bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
          {filtered.length > 0 ? (
            <>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-4 pt-3 pb-1">Countries</p>
              {filtered.map(c => (
                <button key={c.code} onMouseDown={() => handleSelect(c)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-indigo-50 transition-colors text-left">
                  <span className="text-xl">{c.flag}</span>
                  <span className="text-sm font-medium text-slate-800">{c.name}</span>
                </button>
              ))}
            </>
          ) : query.length > 0 ? (
            <div className="px-4 py-4 text-center">
              <p className="text-sm font-semibold text-slate-700">"{query}" is not a valid country</p>
              <p className="text-xs text-slate-400 mt-1">Try searching: Philippines, Japan, France…</p>
            </div>
          ) : null}
        </div>
      )}

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}

      {!countryCode && (
        <div className="mt-3">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Popular</p>
          <div className="flex flex-wrap gap-2">
            {featuredList.map(c => (
              <button key={c.code} onMouseDown={() => handleSelect(c)}
                className="px-3 py-1.5 rounded-full bg-slate-100 text-xs font-medium text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
                {c.flag} {c.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Local Place Picker ───────────────────────────────────────────────────────
interface PlacePickerProps {
  countryCode: string;
  value: string;
  onChange: (city: string) => void;
  error?: string;
}

function PlacePicker({ countryCode, value, onChange, error }: PlacePickerProps) {
  const [query, setQuery]     = useState(value);
  const [open, setOpen]       = useState(false);
  const [focused, setFocused] = useState(false);
  const containerRef          = useRef<HTMLDivElement>(null);

  const places = PLACES_BY_COUNTRY[countryCode] ?? [];

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setFocused(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return places;
    return places.filter(p => p.toLowerCase().includes(query.toLowerCase().trim()));
  }, [query, places]);

  const handleSelect = (city: string) => {
    setQuery(city);
    setOpen(false);
    onChange(city);
  };

  if (!countryCode) return null;

  return (
    <div ref={containerRef} className="relative mt-4">
      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
        Local Destination
      </label>

      {places.length === 0 ? (
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); onChange(e.target.value); }}
          placeholder="Enter city or place…"
          className={`w-full px-4 py-3.5 rounded-xl border text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all ${error ? 'border-red-400' : 'border-slate-200'}`}
        />
      ) : (
        <div className={`relative flex items-center w-full rounded-xl border text-sm bg-slate-50 transition-all
          ${error ? 'border-red-400' : focused ? 'border-indigo-400 ring-2 ring-indigo-500/20 bg-white' : 'border-slate-200'}
          ${value ? 'bg-white' : ''}`}>
          <Search size={16} className="absolute left-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            placeholder={`Search places in ${ALL_COUNTRIES.find(c => c.code === countryCode)?.name}…`}
            autoComplete="off"
            onFocus={() => { setFocused(true); setOpen(true); }}
            onChange={e => { setQuery(e.target.value); setOpen(true); if (value) onChange(''); }}
            className="w-full pl-10 pr-4 py-3.5 rounded-xl bg-transparent focus:outline-none text-sm"
          />
        </div>
      )}

      {open && places.length > 0 && (
        <div className="absolute z-50 top-full mt-1 w-full bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden max-h-52 overflow-y-auto">
          {filtered.length > 0 ? (
            <>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-4 pt-3 pb-1">Places</p>
              {filtered.map(p => (
                <button key={p} onMouseDown={() => handleSelect(p)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-indigo-50 transition-colors text-left
                    ${p === value ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-800'}`}>
                  <MapPin size={14} className="text-slate-400 shrink-0" />
                  <span className="text-sm">{p}</span>
                </button>
              ))}
            </>
          ) : (
            <div className="px-4 py-4 text-center">
              <p className="text-sm text-slate-500">No places match "{query}"</p>
            </div>
          )}
        </div>
      )}

      {!value && places.length > 0 && !open && (
        <div className="flex flex-wrap gap-2 mt-3">
          {places.slice(0, 8).map(p => (
            <button key={p} onClick={() => handleSelect(p)}
              className="px-3 py-1.5 rounded-full bg-slate-100 text-xs font-medium text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
              📍 {p}
            </button>
          ))}
        </div>
      )}

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

// ─── Overlap Banner ───────────────────────────────────────────────────────────
function OverlapBanner({ conflicting }: { conflicting: Trip }) {
  return (
    <div className="mt-4 flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3.5">
      <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-semibold text-red-700">Schedule conflict</p>
        <p className="text-xs text-red-500 mt-0.5 leading-relaxed">
          You already have a trip to <span className="font-semibold">{conflicting.destination}</span> from{' '}
          <span className="font-semibold">{fmtDate(conflicting.startDate)}</span> to{' '}
          <span className="font-semibold">{fmtDate(conflicting.endDate)}</span>.
          You can't be in two places at once! Pick non-overlapping dates.
        </p>
      </div>
    </div>
  );
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────
interface Props { onClose: () => void; }

export default function OnboardingWizard({ onClose }: Props) {
  const [step, setStep]         = useState(0);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [errors, setErrors]     = useState<Record<string, string>>({});
  const [saving, setSaving]     = useState(false);
  const [overlappingTrip, setOverlappingTrip] = useState<Trip | null>(null);

  // Track whether the fade-in of real content has fired (one-shot)
  const [revealed, setRevealed] = useState(false);

  const { saveTrip, allTrips, loadingTrips } = useTrip();
  const navigate = useNavigate();

  // Once loadingTrips flips to false, wait one frame then trigger the fade-in
  useEffect(() => {
    if (!loadingTrips && !revealed) {
      // rAF ensures the browser has painted the skeleton at least once
      const id = requestAnimationFrame(() => setRevealed(true));
      return () => cancelAnimationFrame(id);
    }
  }, [loadingTrips, revealed]);

  const set = (key: keyof typeof EMPTY_FORM, val: string) => {
    setForm(f => ({ ...f, [key]: val }));
    setErrors(e => ({ ...e, [key]: '' }));
    if (key === 'startDate' || key === 'endDate') setOverlappingTrip(null);
  };

  const setCountry = (name: string, code: string) => {
    setForm(f => ({ ...f, dest: name || '', countryCode: code, city: '' }));
    setErrors(e => ({ ...e, dest: '', city: '' }));
  };

  const setCity = (city: string) => {
    setForm(f => ({
      ...f, city,
      dest: f.countryCode
        ? `${city ? city + ', ' : ''}${f.dest.split(',').pop()?.trim() || f.dest}`
        : f.dest,
    }));
    setErrors(e => ({ ...e, city: '' }));
  };

  const finalDestination = form.city
    ? `${form.city}, ${ALL_COUNTRIES.find(c => c.code === form.countryCode)?.name ?? form.dest}`
    : form.dest;

  const validate = (): boolean => {
    const e: Record<string, string> = {};

    if (step === 0 && !form.name.trim())
      e.name = 'Tell us what to call you';

    if (step === 1) {
      if (!form.countryCode) e.dest = 'Select a valid country from the list';
      if (!form.city.trim()) e.city = 'Pick a local destination';
    }

    if (step === 2) {
      if (!form.startDate) e.startDate = 'Pick a start date';
      if (!form.endDate)   e.endDate   = 'Pick an end date';
      if (form.startDate && form.startDate < TODAY)
        e.startDate = 'Start date cannot be in the past';
      if (form.startDate && form.endDate && form.endDate <= form.startDate)
        e.endDate = 'End must be after start';

      if (!e.startDate && !e.endDate && form.startDate && form.endDate) {
        const conflict = findOverlappingTrip(form.startDate, form.endDate, allTrips);
        if (conflict) {
          setOverlappingTrip(conflict);
          e.startDate = 'These dates overlap with an existing trip';
        } else {
          setOverlappingTrip(null);
        }
      }
    }

    if (step === 3 && (!form.budget || Number(form.budget) <= 0))
      e.budget = 'Enter a valid budget';

    if (step === 4 && !form.travelType)
      e.travelType = 'Choose a travel type';

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validate()) setStep(s => s + 1); };
  const back = () => { setStep(s => s - 1); setOverlappingTrip(null); };

  const create = async () => {
    const conflict = findOverlappingTrip(form.startDate, form.endDate, allTrips);
    if (conflict) { setOverlappingTrip(conflict); setStep(2); return; }

    setSaving(true);
    const trip: Trip = {
      id: crypto.randomUUID(),
      displayName: form.name.trim(),
      destination: finalDestination,
      startDate:   form.startDate,
      endDate:     form.endDate,
      budget:      Number(form.budget),
      currency:    form.currency,
      travelType:  form.travelType as TravelType,
      createdAt:   new Date().toISOString(),
    };
    const saved = await saveTrip(trip);
    setSaving(false);
    if (saved) navigate('/dashboard/trip');
    else console.error('Unable to save trip.');
  };

  const countryObj = ALL_COUNTRIES.find(c => c.code === form.countryCode);

  // ── Shared backdrop (always rendered so the overlay stays during the transition) ──
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 backdrop-blur-sm px-0">

      {/* ── Skeleton layer — fades OUT once revealed ── */}
      <div
        className="absolute inset-x-0 bottom-0 flex justify-center pointer-events-none"
        style={{
          transition: 'opacity 250ms ease',
          opacity: revealed ? 0 : 1,
          // Keep it in the DOM a tick longer so the fade is visible,
          // then make it non-interactive and invisible
          visibility: revealed ? 'hidden' : 'visible',
        }}
        aria-hidden="true"
      >
        <WizardSkeleton />
      </div>

      {/* ── Real wizard — fades IN once revealed ── */}
      <div
        className="w-full max-w-screen-md bg-white rounded-t-[28px] pb-10 max-h-[92vh] overflow-y-auto no-scrollbar"
        style={{
          transition: 'opacity 250ms ease',
          opacity: revealed ? 1 : 0,
          // Prevent interaction while the skeleton is still showing
          pointerEvents: revealed ? 'auto' : 'none',
        }}
      >
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
              className={`h-1.5 rounded-full transition-all duration-300
                ${i <= step ? 'bg-gradient-to-r from-indigo-500 to-violet-600' : 'bg-slate-100'}
                ${i === step ? 'flex-[2]' : 'flex-1'}`}
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
              <p className="text-sm text-slate-500 mb-5">First choose a country, then pick a local spot.</p>

              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Country</label>
              <CountryPicker
                value={countryObj?.name ?? ''}
                countryCode={form.countryCode}
                onChange={setCountry}
                error={errors.dest}
              />

              {form.countryCode && (
                <>
                  <div className="flex items-center gap-1.5 mt-5 mb-1 text-xs text-slate-500">
                    <span className="font-semibold text-indigo-600">{countryObj?.flag} {countryObj?.name}</span>
                    <ChevronRight size={12} className="text-slate-400" />
                    <span>{form.city || 'Choose a place'}</span>
                  </div>
                  <PlacePicker
                    countryCode={form.countryCode}
                    value={form.city}
                    onChange={setCity}
                    error={errors.city}
                  />
                </>
              )}

              {form.countryCode && form.city && (
                <div className="mt-4 px-4 py-3 bg-indigo-50 rounded-xl flex items-center gap-2">
                  <span className="text-xl">{countryObj?.flag}</span>
                  <span className="text-sm font-semibold text-indigo-700">{form.city}, {countryObj?.name}</span>
                </div>
              )}
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

              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Start Date</label>
                <input
                  type="date"
                  value={form.startDate}
                  min={TODAY}
                  onChange={e => {
                    const val = e.target.value;
                    setOverlappingTrip(null);
                    setForm(f => ({
                      ...f, startDate: val,
                      endDate: f.endDate && val >= f.endDate ? '' : f.endDate,
                    }));
                    setErrors(e => ({ ...e, startDate: '', endDate: '' }));
                  }}
                  className={`w-full px-4 py-3.5 rounded-xl border text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all ${errors.startDate ? 'border-red-400' : 'border-slate-200'}`}
                />
                {errors.startDate && !overlappingTrip && (
                  <p className="text-xs text-red-500 mt-1">{errors.startDate}</p>
                )}
              </div>

              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">End Date</label>
                <input
                  type="date"
                  value={form.endDate}
                  min={form.startDate || TODAY}
                  onChange={e => { setOverlappingTrip(null); set('endDate', e.target.value); }}
                  className={`w-full px-4 py-3.5 rounded-xl border text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all ${errors.endDate ? 'border-red-400' : 'border-slate-200'}`}
                />
                {errors.endDate && <p className="text-xs text-red-500 mt-1">{errors.endDate}</p>}
              </div>

              {overlappingTrip && <OverlapBanner conflicting={overlappingTrip} />}

              {!overlappingTrip && form.startDate && form.endDate && form.endDate > form.startDate && (
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
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all
                      ${form.currency === c ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white border-transparent' : 'border-slate-200 text-slate-600 bg-white'}`}>
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
                    className={`flex flex-col items-center gap-2 p-5 rounded-2xl border-2 transition-all
                      ${form.travelType === t.value ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-white hover:border-indigo-200'}`}>
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
                  { label: 'Country',       value: `${countryObj?.flag ?? ''} ${countryObj?.name ?? form.dest}`.trim() },
                  { label: 'Destination',   value: form.city || '—' },
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