// src/types/photos.ts

// Confirmed against Supabase's "View columns" for `trip_photos`.
export interface TripPhotoRow {
  id: string;
  trip_id: string;
  user_id: string;
  file_url: string;
  caption: string | null;
  created_at: string;
}

export interface TripPhoto {
  id: string;
  tripId: string;
  url: string;
  caption: string | null;
  createdAt: string; // ISO string
}