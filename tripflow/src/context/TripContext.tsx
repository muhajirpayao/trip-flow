import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { Trip } from '../types';

const STORAGE_KEY = 'tripflow_trip';

interface TripCtx {
  trip: Trip | null;
  saveTrip: (t: Trip) => void;
  clearTrip: () => void;
}

const TripContext = createContext<TripCtx | null>(null);

const loadFromStorage = (): Trip | null => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null'); }
  catch { return null; }
};

export const TripProvider = ({ children }: { children: ReactNode }) => {
  const [trip, setTrip] = useState<Trip | null>(loadFromStorage);

  const saveTrip = useCallback((t: Trip) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(t));
    setTrip(t);
  }, []);

  const clearTrip = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setTrip(null);
  }, []);

  return <TripContext.Provider value={{ trip, saveTrip, clearTrip }}>{children}</TripContext.Provider>;
};

export const useTrip = (): TripCtx => {
  const ctx = useContext(TripContext);
  if (!ctx) throw new Error('useTrip must be used inside TripProvider');
  return ctx;
};
