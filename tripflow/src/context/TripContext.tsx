import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import type { Trip } from '../types';

interface TripContextValue {
  trip: Trip | null;
  allTrips: Trip[];
  saveTrip: (t: Trip) => Promise<boolean>;
  updateTrip: (fields: Partial<Omit<Trip, 'id' | 'createdAt'>>) => Promise<boolean>;
  clearTrip: () => void;
  deleteTrip: (tripId?: string) => Promise<boolean>;
  loadingTrips: boolean;
}

const TripContext = createContext<TripContextValue | null>(null);

export function TripProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [allTrips, setAllTrips] = useState<Trip[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(true);

  useEffect(() => {
    if (!user) {
      setTrip(null);
      setAllTrips([]);
      setLoadingTrips(false);
      return;
    }
    setLoadingTrips(true);

    supabase
      .from('trips')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) setTrip(rowToTrip(data[0]));
      });

    supabase
      .from('trips')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setAllTrips((data ?? []).map(rowToTrip));
        setLoadingTrips(false);
      });
  }, [user]);

  const saveTrip = async (t: Trip) => {
    if (!user) return false;

    const sanitize = (s: string) =>
      s.replace(/[\uD800-\uDFFF]/g, (c) => {
        const code = c.charCodeAt(0);
        return (code >= 0xD800 && code <= 0xDBFF) ? '' : c;
      });

    const row = {
      id: t.id,
      user_id: user.id,
      display_name: sanitize(t.displayName ?? ''),
      destination: sanitize(t.destination),
      start_date: t.startDate,
      end_date: t.endDate,
      budget: t.budget ?? null,
      currency: t.currency ?? 'USD',
      travel_type: t.travelType ?? null,
      created_at: t.createdAt,
    };

    const res = await supabase
      .from('trips')
      .upsert(row, { onConflict: 'id', ignoreDuplicates: false });

    if (res.error) {
      console.error('saveTrip error', res.error);
      return false;
    }

    const cleaned: Trip = {
      ...t,
      displayName: sanitize(t.displayName ?? ''),
      destination: sanitize(t.destination),
    };

    setTrip(cleaned);
    setAllTrips(prev => [cleaned, ...prev.filter(p => p.id !== t.id)]);
    return true;
  };

  // Updates fields on the currently active trip and persists to Supabase.
  const updateTrip = async (fields: Partial<Omit<Trip, 'id' | 'createdAt'>>) => {
    if (!trip) return false;
    return saveTrip({ ...trip, ...fields });
  };

  const clearTrip = () => setTrip(null);

  const deleteTrip = async (tripId?: string) => {
    const targetId = tripId ?? trip?.id;
    if (!targetId || !user) return false;

    const { error } = await supabase
      .from('trips')
      .delete()
      .eq('id', targetId)
      .eq('user_id', user.id);

    if (error) {
      console.error('deleteTrip error', error);
      return false;
    }

    setAllTrips(prev => prev.filter(t => t.id !== targetId));
    if (trip?.id === targetId) setTrip(null);
    return true;
  };

  return (
    <TripContext.Provider value={{ trip, allTrips, saveTrip, updateTrip, clearTrip, deleteTrip, loadingTrips }}>
      {children}
    </TripContext.Provider>
  );
}

function rowToTrip(row: Record<string, unknown>): Trip {
  const budget = typeof row.budget === 'string'
    ? Number(row.budget)
    : Number(row.budget ?? 0);
  const createdAt = row.created_at instanceof Date
    ? row.created_at.toISOString()
    : String(row.created_at ?? new Date().toISOString());

  return {
    id: String(row.id ?? ''),
    displayName: String(row.display_name ?? ''),
    destination: String(row.destination ?? ''),
    startDate: String(row.start_date ?? ''),
    endDate: String(row.end_date ?? ''),
    budget,
    currency: String(row.currency ?? 'USD') as Trip['currency'],
    travelType: String(row.travel_type ?? 'solo') as Trip['travelType'],
    createdAt,
  } as Trip;
}

export function useTrip() {
  const ctx = useContext(TripContext);
  if (!ctx) throw new Error('useTrip must be used inside TripProvider');
  return ctx;
}