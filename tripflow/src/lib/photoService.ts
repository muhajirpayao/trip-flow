// src/lib/photoService.ts
import { supabase } from './supabase';
import type { TripPhoto, TripPhotoRow } from '../types/photos';

const BUCKET = 'trip-photos';

function rowToPhoto(row: TripPhotoRow): TripPhoto {
  return {
    id: row.id,
    tripId: row.trip_id,
    url: row.file_url,
    caption: row.caption,
    createdAt: row.created_at,
  };
}

function publicUrlFor(path: string): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

// Derives the bucket-relative storage path from a public URL, e.g.
// ".../storage/v1/object/public/trip-photos/abc/123.jpg" -> "abc/123.jpg".
// Only needed for deletion, since the table stores the full URL, not the path.
function storagePathFromUrl(url: string): string | null {
  const marker = `/${BUCKET}/`;
  const idx = url.indexOf(marker);
  return idx === -1 ? null : url.slice(idx + marker.length);
}

/** Fetch all photos for a trip, newest first. */
export async function getTripPhotos(tripId: string): Promise<TripPhoto[]> {
  const { data, error } = await supabase
    .from('trip_photos')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('getTripPhotos error', error);
    return [];
  }
  if (!data) return [];

  return (data as TripPhotoRow[]).map(rowToPhoto);
}

/** Upload a single photo file to Storage and insert its row. */
export async function uploadTripPhoto(
  tripId: string,
  userId: string,
  file: File,
  caption?: string
): Promise<TripPhoto | null> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `${tripId}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false });

  if (uploadError) {
    console.error('uploadTripPhoto storage error', uploadError);
    return null;
  }

  const fileUrl = publicUrlFor(path);

  const { data, error } = await supabase
    .from('trip_photos')
    .insert({
      trip_id: tripId,
      user_id: userId,
      file_url: fileUrl,
      caption: caption ?? null,
    })
    .select()
    .single();

  if (error || !data) {
    console.error('uploadTripPhoto insert error', error);
    // Best-effort cleanup so we don't leave orphaned files in Storage.
    await supabase.storage.from(BUCKET).remove([path]);
    return null;
  }

  return rowToPhoto(data as TripPhotoRow);
}

/** Upload multiple files sequentially, returning only the ones that succeeded. */
export async function uploadTripPhotos(
  tripId: string,
  userId: string,
  files: File[]
): Promise<TripPhoto[]> {
  const results: TripPhoto[] = [];
  for (const file of files) {
    const photo = await uploadTripPhoto(tripId, userId, file);
    if (photo) results.push(photo);
  }
  return results;
}

/** Delete a photo's row and its underlying file. */
export async function deleteTripPhoto(photo: TripPhoto): Promise<boolean> {
  const { error: dbError } = await supabase
    .from('trip_photos')
    .delete()
    .eq('id', photo.id);

  if (dbError) {
    console.error('deleteTripPhoto db error', dbError);
    return false;
  }

  const path = storagePathFromUrl(photo.url);
  if (path) {
    const { error: storageError } = await supabase.storage
      .from(BUCKET)
      .remove([path]);
    if (storageError) {
      console.error('deleteTripPhoto storage error', storageError);
    }
  }

  return true;
}