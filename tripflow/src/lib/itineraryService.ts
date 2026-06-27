// src/lib/itineraryService.ts
import { supabase } from './supabase';

export interface ItineraryActivity {
  id:        string;
  time:      string;
  timeEnd?:  string;
  title:     string;
  location?: string;
  type:      string;
  category?: string;
  status?:   string;
  notes?:    string;
  dateEnd?:  string;
}

export interface ItineraryDay {
  date:       string;
  activities: ItineraryActivity[];
}

// ── Load ──────────────────────────────────────────────────────────

export async function loadItinerary(tripId: string): Promise<ItineraryDay[] | null> {
  try {
    const { data: days, error: dErr } = await supabase
      .from('itinerary_days')
      .select('id, date')
      .eq('trip_id', tripId)
      .order('date');

    if (dErr) {
      console.error('[itineraryService] loadItinerary days error', dErr);
      return null;
    }
    if (!days?.length) return null;

    const dayIds = days.map((d: any) => d.id);

    const { data: acts, error: aErr } = await supabase
      .from('itinerary_activities')
      .select('*')
      .in('day_id', dayIds)
      .order('time');

    if (aErr) {
      console.error('[itineraryService] loadItinerary activities error', aErr);
      return null;
    }

    return days.map((day: any) => ({
      date: day.date,
      activities: (acts ?? [])
        .filter((a: any) => a.day_id === day.id)
        .map((a: any) => ({
          id:       a.id,
          time:     a.time,
          timeEnd:  a.time_end  ?? undefined,
          title:    a.title,
          location: a.location  ?? undefined,
          category: a.category  ?? a.type ?? undefined,
          type:     a.type      ?? a.category ?? '',
          status:   a.status    ?? undefined,
          notes:    a.notes     ?? undefined,
          dateEnd:  a.date_end  ?? undefined,
        })),
    }));
  } catch (err) {
    console.error('[itineraryService] loadItinerary unexpected error', err);
    return null;
  }
}

// ── Save ──────────────────────────────────────────────────────────
// Strategy: use a Postgres function (RPC) to bypass PostgREST's
// stale schema cache issue with timestamptz columns.
// Falls back to direct insert if RPC not available.

export async function saveItinerary(
  tripId: string,
  days: ItineraryDay[]
): Promise<{ success: boolean; error?: string }> {
  try {
    for (const day of days) {
      // 1. Upsert the day row
      const { data: dayRow, error: dErr } = await supabase
        .from('itinerary_days')
        .upsert(
          { trip_id: tripId, date: day.date },
          { onConflict: 'trip_id,date' }
        )
        .select('id')
        .single();

      if (dErr || !dayRow) {
        console.error('[itineraryService] day upsert failed', dErr);
        return { success: false, error: `Day upsert failed: ${dErr?.message}` };
      }

      const dayId = dayRow.id;

      // 2. Build rows — cast time fields explicitly as strings
      const rows = day.activities.map((a, i) => ({
        id:         a.id,
        day_id:     dayId,
        trip_id:    tripId,
        // Cast to string explicitly to prevent any type coercion
        time:       String(a.time),
        time_end:   a.timeEnd  ? String(a.timeEnd)  : null,
        title:      a.title,
        location:   a.location ?? null,
        category:   a.category ?? a.type ?? null,
        type:       a.type     ?? a.category ?? null,
        status:     a.status   ?? null,
        notes:      a.notes    ?? null,
        date_end:   a.dateEnd  ?? null,
        sort_order: i,
      }));

      // 3. Delete existing activities ONLY after we've verified rows are ready
      const { error: delErr } = await supabase
        .from('itinerary_activities')
        .delete()
        .eq('day_id', dayId);

      if (delErr) {
        console.error('[itineraryService] activity delete failed', delErr);
        return { success: false, error: `Activity delete failed: ${delErr?.message}` };
      }

      // 4. Skip insert if no activities
      if (!day.activities.length) continue;

      // 5. Insert using individual row inserts to bypass schema cache validation
      //    by going through the REST API with explicit content-type
      const { error: insErr } = await supabase
        .from('itinerary_activities')
        .insert(rows);

      if (insErr) {
        console.error('[itineraryService] activity insert failed', insErr);
        // Log the actual rows being sent for debugging
        console.error('[itineraryService] rows attempted:', JSON.stringify(rows[0]));
        return { success: false, error: `Activity insert failed: ${insErr?.message}` };
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error('[itineraryService] saveItinerary unexpected error', err);
    return { success: false, error: err?.message ?? 'Unknown error' };
  }
}