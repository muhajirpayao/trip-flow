// src/lib/itineraryService.ts
// ------------------------------------------------------------------
// Syncs the itinerary (days + activities) to Supabase.
// Used by Itinerary.tsx in place of the raw localStorage calls.
// ------------------------------------------------------------------

import { supabase } from './supabase';

export interface ItineraryActivity {
  id: string;
  time: string;
  title: string;
  location?: string;
  type: string;
  notes?: string;
}

export interface ItineraryDay {
  date: string;
  activities: ItineraryActivity[];
}

// ── Load ─────────────────────────────────────────────────────────

export async function loadItinerary(tripId: string): Promise<ItineraryDay[] | null> {
  try {
    const { data: days, error: dErr } = await supabase
      .from('itinerary_days')
      .select('id, date')
      .eq('trip_id', tripId)
      .order('date');

    if (dErr || !days?.length) return null;

    const dayIds = days.map((d: any) => d.id);

    const { data: acts, error: aErr } = await supabase
      .from('itinerary_activities')
      .select('*')
      .in('day_id', dayIds)
      .order('time');

    if (aErr) return null;

    return days.map((day: any) => ({
      date: day.date,
      activities: (acts ?? [])
        .filter((a: any) => a.day_id === day.id)
        .map((a: any) => ({
          id:       a.id,
          time:     a.time,
          title:    a.title,
          location: a.location ?? undefined,
          type:     a.type,
          notes:    a.notes ?? undefined,
        })),
    }));
  } catch {
    return null;
  }
}

// ── Save (full upsert) ────────────────────────────────────────────

export async function saveItinerary(
  tripId: string,
  days: ItineraryDay[]
): Promise<void> {
  try {
    for (const day of days) {
      // Upsert the day row
      const { data: dayRow, error: dErr } = await supabase
        .from('itinerary_days')
        .upsert({ trip_id: tripId, date: day.date }, { onConflict: 'trip_id,date' })
        .select('id')
        .single();

      if (dErr || !dayRow) {
        console.error('[itineraryService] day upsert failed', dErr);
        continue;
      }

      const dayId = dayRow.id;

      // Delete existing activities for this day then re-insert
      await supabase
        .from('itinerary_activities')
        .delete()
        .eq('day_id', dayId);

      if (day.activities.length) {
        const rows = day.activities.map((a, i) => ({
          id:         a.id,
          day_id:     dayId,
          trip_id:    tripId,
          time:       a.time,
          title:      a.title,
          location:   a.location ?? null,
          type:       a.type,
          notes:      a.notes ?? null,
          sort_order: i,
        }));

        const { error: aErr } = await supabase
          .from('itinerary_activities')
          .upsert(rows, { onConflict: 'id' });

        if (aErr) console.error('[itineraryService] activity upsert failed', aErr);
      }
    }
  } catch (err) {
    console.error('[itineraryService] saveItinerary error', err);
  }
}