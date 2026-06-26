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
          timeEnd:  a.time_end  ?? undefined,
          title:    a.title,
          location: a.location  ?? undefined,
          // BUG FIX: prefer `category`, fall back to `type` so old rows still work
          category: a.category  ?? a.type ?? undefined,
          type:     a.type      ?? a.category ?? '',
          status:   a.status    ?? undefined,
          notes:    a.notes     ?? undefined,
        })),
    }));
  } catch (err) {
    console.error('[itineraryService] loadItinerary error', err);
    return null;
  }
}

// ── Save ──────────────────────────────────────────────────────────

export async function saveItinerary(
  tripId: string,
  days: ItineraryDay[]
): Promise<void> {
  try {
    for (const day of days) {
      // Upsert the day row and get its id back
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
        continue;
      }

      const dayId = dayRow.id;

      // BUG FIX: only delete activities that belong to THIS day,
      // then re-insert — avoids wiping rows before the upsert lands.
      const { error: delErr } = await supabase
        .from('itinerary_activities')
        .delete()
        .eq('day_id', dayId);

      if (delErr) {
        console.error('[itineraryService] activity delete failed', delErr);
        continue;
      }

      if (!day.activities.length) continue;

      const rows = day.activities.map((a, i) => ({
        // BUG FIX: don't include `id` in the insert so Supabase generates a
        // stable uuid. If you want client-side ids, keep the line below —
        // but make sure your table's `id` column has no default (gen_random_uuid)
        // that conflicts with the client value.
        id:         a.id,
        day_id:     dayId,
        trip_id:    tripId,
        time:       a.time,
        time_end:   a.timeEnd  ?? null,
        title:      a.title,
        location:   a.location ?? null,
        // BUG FIX: always write both columns so neither is null after save
        category:   a.category ?? a.type ?? null,
        type:       a.type     ?? a.category ?? null,
        status:     a.status   ?? null,
        notes:      a.notes    ?? null,
        sort_order: i,
      }));

      // BUG FIX: use insert (not upsert) after a clean delete —
      // avoids the duplicate-key conflicts that silently swallow rows.
      const { error: aErr } = await supabase
        .from('itinerary_activities')
        .insert(rows);

      if (aErr) {
        console.error('[itineraryService] activity insert failed', aErr);
      }
    }
  } catch (err) {
    console.error('[itineraryService] saveItinerary error', err);
  }
}