// src/context/TripContext.tsx
// Loads the current user's trip from Supabase on mount.
// Saves new trips to the `trips` table with the user's id.

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import type { Trip } from '../types';

interface TripContextType {
  trip: Trip | null;
  loading: boolean;
  saveTrip: (trip: Trip) => Promise<void>;
  clearTrip: () => Promise<void>;
}

const TripContext = createContext<TripContextType | null>(null);

export function TripProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [trip, setTrip]     = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);

  // Load the user's most recent trip whenever the user changes
  useEffect(() => {
    if (!user) {
      setTrip(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    supabase
      .from('trips')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) {
          // Map snake_case DB columns → camelCase Trip type
          setTrip({
            id:          data.id,
            destination: data.destination,
            startDate:   data.start_date,
            endDate:     data.end_date,
            budget:      data.budget,
            currency:    data.currency,
            travelType:  data.travel_type,
            createdAt:   data.created_at,
          });
        } else {
          setTrip(null);
        }
        setLoading(false);
      });
  }, [user]);

  const saveTrip = async (newTrip: Trip) => {
    if (!user) return;

    const row = {
      id:           newTrip.id,
      user_id:      user.id,
      destination:  newTrip.destination,
      start_date:   newTrip.startDate,
      end_date:     newTrip.endDate,
      budget:       newTrip.budget,
      currency:     newTrip.currency,
      travel_type:  newTrip.travelType,
      created_at:   newTrip.createdAt,
    };

    const { error } = await supabase.from('trips').upsert(row);
    if (!error) setTrip(newTrip);
  };

  const clearTrip = async () => {
    if (!user || !trip) return;
    await supabase.from('trips').delete().eq('id', trip.id).eq('user_id', user.id);
    setTrip(null);
  };

  return (
    <TripContext.Provider value={{ trip, loading, saveTrip, clearTrip }}>
      {children}
    </TripContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTrip() {
  const ctx = useContext(TripContext);
  if (!ctx) throw new Error('useTrip must be used within TripProvider');
  return ctx;
}