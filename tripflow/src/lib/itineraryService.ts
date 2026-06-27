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

// ── Helpers: convert between "HH:MM" and full ISO timestamp ───────
// Supabase treats time/time_end as timestamptz, so we store a full
// timestamp and extract the time part when loading.

const DUMMY_DATE = '2000-01-01'; // fixed date, only the time part matters

function timeToISO(time: string): string {
  // "21:15" → "2000-01-01T21:15:00+00:00"
  return `${DUMMY_DATE}T${time}:00+00:00`;
}

function isoToTime(iso: string | null | undefined): string | undefined {
  if (!iso) return undefined;
  // "2000-01-01T21:15:00+00:00" → "21:15"
  // Also handles plain "HH:MM" if already converted
  if (/^\d{2}:\d{2}$/.test(iso)) return iso;
  try {
    const d = new Date(iso);
    const h = String(d.getUTCHours()).padStart(2, '0');
    const m = String(d.getUTCMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  } catch {
    return iso.slice(0, 5); // fallback: take first 5 chars
  }
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
          // Convert stored ISO timestamp back to "HH:MM"
          time:     isoToTime(a.time) ?? a.time,
          timeEnd:  isoToTime(a.time_end),
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
// Converts HH:MM times to full ISO timestamps so Postgres accepts
// them in the timestamptz columns without schema changes.

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
      const keepIds = day.activities.map(a => a.id);

      // 2. Delete activities no longer in the list
      if (keepIds.length > 0) {
        await supabase
          .from('itinerary_activities')
          .delete()
          .eq('day_id', dayId)
          .not('id', 'in', `(${keepIds.join(',')})`);
      } else {
        await supabase
          .from('itinerary_activities')
          .delete()
          .eq('day_id', dayId);
        continue;
      }

      // 3. Build rows — store time as full ISO timestamp
      const rows = day.activities.map((a, i) => ({
        id:         a.id,
        day_id:     dayId,
        trip_id:    tripId,
        time:       timeToISO(a.time),
        time_end:   a.timeEnd ? timeToISO(a.timeEnd) : null,
        title:      a.title,
        location:   a.location ?? null,
        category:   a.category ?? a.type ?? null,
        type:       a.type     ?? a.category ?? null,
        status:     a.status   ?? null,
        notes:      a.notes    ?? null,
        date_end:   a.dateEnd  ?? null,
        sort_order: i,
      }));

      // 4. Upsert rows
      const { error: upsertErr } = await supabase
        .from('itinerary_activities')
        .upsert(rows, { onConflict: 'id' });

      if (upsertErr) {
        console.error('[itineraryService] activity upsert failed', upsertErr);
        return { success: false, error: `Activity upsert failed: ${upsertErr?.message}` };
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error('[itineraryService] saveItinerary unexpected error', err);
    return { success: false, error: err?.message ?? 'Unknown error' };
  }
}