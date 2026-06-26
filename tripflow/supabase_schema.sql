-- supabase_schema.sql
-- TripFlow database schema with RLS policies

-- ─────────────────────────────────────────────────────────────────
-- Trips table
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.trips (
  id          TEXT PRIMARY KEY,
  destination TEXT NOT NULL,
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  budget      NUMERIC(12, 2),
  currency    TEXT DEFAULT 'USD',
  travel_type TEXT,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────
-- Itinerary: Days table
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.itinerary_days (
  id        BIGSERIAL PRIMARY KEY,
  trip_id   TEXT NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  date      DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(trip_id, date)
);

CREATE INDEX IF NOT EXISTS idx_itinerary_days_trip_id ON public.itinerary_days(trip_id);

-- ─────────────────────────────────────────────────────────────────
-- Itinerary: Activities table
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.itinerary_activities (
  id        TEXT PRIMARY KEY,
  day_id    BIGINT NOT NULL REFERENCES public.itinerary_days(id) ON DELETE CASCADE,
  trip_id   TEXT NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  time      TEXT NOT NULL,
  title     TEXT NOT NULL,
  location  TEXT,
  type      TEXT DEFAULT 'other',
  notes     TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_itinerary_activities_day_id ON public.itinerary_activities(day_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_activities_trip_id ON public.itinerary_activities(trip_id);

-- ─────────────────────────────────────────────────────────────────
-- Expenses table
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.expenses (
  id        TEXT PRIMARY KEY,
  trip_id   TEXT NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  date      DATE NOT NULL,
  category  TEXT,
  amount    NUMERIC(12, 2) NOT NULL,
  currency  TEXT DEFAULT 'USD',
  note      TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_trip_id ON public.expenses(trip_id);

-- ─────────────────────────────────────────────────────────────────
-- Places table
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.places (
  id        TEXT PRIMARY KEY,
  trip_id   TEXT NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  name      TEXT NOT NULL,
  category  TEXT,
  rating    NUMERIC(3, 2),
  notes     TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_places_trip_id ON public.places(trip_id);

-- ─────────────────────────────────────────────────────────────────
-- Packing items table
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.packing_items (
  id        TEXT PRIMARY KEY,
  trip_id   TEXT NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  name      TEXT NOT NULL,
  category  TEXT,
  packed    BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_packing_items_trip_id ON public.packing_items(trip_id);

-- ─────────────────────────────────────────────────────────────────
-- RLS (Row Level Security) Policies — Everyone has access (no auth)
-- ─────────────────────────────────────────────────────────────────

ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerary_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerary_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packing_items ENABLE ROW LEVEL SECURITY;

-- Trips: Allow all operations for everyone (no user context)
CREATE POLICY "trips_select" ON public.trips FOR SELECT USING (true);
CREATE POLICY "trips_insert" ON public.trips FOR INSERT WITH CHECK (true);
CREATE POLICY "trips_update" ON public.trips FOR UPDATE USING (true);
CREATE POLICY "trips_delete" ON public.trips FOR DELETE USING (true);

-- Itinerary Days: Allow all operations for everyone
CREATE POLICY "itinerary_days_select" ON public.itinerary_days FOR SELECT USING (true);
CREATE POLICY "itinerary_days_insert" ON public.itinerary_days FOR INSERT WITH CHECK (true);
CREATE POLICY "itinerary_days_update" ON public.itinerary_days FOR UPDATE USING (true);
CREATE POLICY "itinerary_days_delete" ON public.itinerary_days FOR DELETE USING (true);

-- Itinerary Activities: Allow all operations for everyone
CREATE POLICY "itinerary_activities_select" ON public.itinerary_activities FOR SELECT USING (true);
CREATE POLICY "itinerary_activities_insert" ON public.itinerary_activities FOR INSERT WITH CHECK (true);
CREATE POLICY "itinerary_activities_update" ON public.itinerary_activities FOR UPDATE USING (true);
CREATE POLICY "itinerary_activities_delete" ON public.itinerary_activities FOR DELETE USING (true);

-- Expenses: Allow all operations for everyone
CREATE POLICY "expenses_select" ON public.expenses FOR SELECT USING (true);
CREATE POLICY "expenses_insert" ON public.expenses FOR INSERT WITH CHECK (true);
CREATE POLICY "expenses_update" ON public.expenses FOR UPDATE USING (true);
CREATE POLICY "expenses_delete" ON public.expenses FOR DELETE USING (true);

-- Places: Allow all operations for everyone
CREATE POLICY "places_select" ON public.places FOR SELECT USING (true);
CREATE POLICY "places_insert" ON public.places FOR INSERT WITH CHECK (true);
CREATE POLICY "places_update" ON public.places FOR UPDATE USING (true);
CREATE POLICY "places_delete" ON public.places FOR DELETE USING (true);

-- Packing Items: Allow all operations for everyone
CREATE POLICY "packing_items_select" ON public.packing_items FOR SELECT USING (true);
CREATE POLICY "packing_items_insert" ON public.packing_items FOR INSERT WITH CHECK (true);
CREATE POLICY "packing_items_update" ON public.packing_items FOR UPDATE USING (true);
CREATE POLICY "packing_items_delete" ON public.packing_items FOR DELETE USING (true);
