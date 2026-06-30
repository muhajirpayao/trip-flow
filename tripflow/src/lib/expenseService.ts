// src/lib/expenseService.ts
// All Supabase CRUD for the expenses table + photo storage.

import { supabase } from './supabase';
import type { Expense, ExpenseCategory, ExpenseFormData } from '../types/expenses';

// ── helpers ────────────────────────────────────────────────────────────────────

function rowToExpense(row: Record<string, unknown>): Expense {
  return {
    id:          String(row.id ?? ''),
    tripId:      String(row.trip_id ?? ''),
    amount:      Number(row.amount ?? 0),
    category:    String(row.category ?? 'misc') as ExpenseCategory,
    description: String(row.description ?? ''),
    notes:       row.notes ? String(row.notes) : undefined,
    expenseDate: String(row.expense_date ?? ''),
    createdAt:   String(row.created_at ?? new Date().toISOString()),
    photoUrl:    row.photo_url ? String(row.photo_url) : undefined,
  };
}

// ── photo storage ──────────────────────────────────────────────────────────────

const BUCKET = 'expense-photos';

/**
 * Upload a photo file to Supabase Storage under expenses/<tripId>/<uuid>.<ext>
 * Returns the public URL on success, or null on failure.
 *
 * Prerequisites: create a public bucket called "expense-photos" in your
 * Supabase project → Storage → New bucket → name: expense-photos, Public: on
 */
export async function uploadExpensePhoto(
  tripId: string,
  file: File,
): Promise<string | null> {
  const ext  = file.name.split('.').pop() ?? 'jpg';
  const path = `expenses/${tripId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type });

  if (error) {
    console.error('[expenseService] uploadExpensePhoto', error);
    return null;
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data?.publicUrl ?? null;
}

/**
 * Delete a photo from storage given its public URL.
 * Silently ignores errors (best-effort cleanup).
 */
async function deletePhotoByUrl(url: string): Promise<void> {
  try {
    // Extract the path after /object/public/<bucket>/
    const marker = `/object/public/${BUCKET}/`;
    const idx = url.indexOf(marker);
    if (idx === -1) return;
    const path = decodeURIComponent(url.slice(idx + marker.length));
    await supabase.storage.from(BUCKET).remove([path]);
  } catch {
    // best-effort
  }
}

/**
 * Trigger a browser download of the expense photo.
 * Uses a temporary <a> element with the public URL.
 */
export function downloadExpensePhoto(photoUrl: string, filename?: string): void {
  const a = document.createElement('a');
  a.href = photoUrl;
  a.download = filename ?? `receipt-${Date.now()}.jpg`;
  a.target = '_blank';          // fallback for browsers that block cross-origin downloads
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ── public CRUD ────────────────────────────────────────────────────────────────

export async function fetchExpenses(tripId: string): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('trip_id', tripId)
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[expenseService] fetchExpenses', error);
    return [];
  }
  return (data ?? []).map(rowToExpense);
}

export async function addExpense(
  tripId: string,
  form: ExpenseFormData,
): Promise<Expense | null> {
  // Upload photo first (if provided as a File object)
  let photoUrl = form.photoUrl ?? null;
  if (form.photoFile) {
    photoUrl = await uploadExpensePhoto(tripId, form.photoFile);
  }

  const { data, error } = await supabase
    .from('expenses')
    .insert({
      trip_id:      tripId,
      amount:       Number(form.amount),
      category:     form.category,
      description:  form.description,
      notes:        form.notes || null,
      expense_date: form.expenseDate,
      photo_url:    photoUrl,
    })
    .select()
    .single();

  if (error) {
    console.error('[expenseService] addExpense', error);
    return null;
  }
  return rowToExpense(data as Record<string, unknown>);
}

export async function updateExpense(
  id: string,
  form: ExpenseFormData,
  existingPhotoUrl?: string,
): Promise<Expense | null> {
  let photoUrl: string | null = form.photoUrl ?? existingPhotoUrl ?? null;

  // If a new file was chosen, upload it and optionally remove the old one
  if (form.photoFile) {
    const uploaded = await uploadExpensePhoto('unknown', form.photoFile);
    if (uploaded) {
      // Clean up old photo (best-effort)
      if (existingPhotoUrl) deletePhotoByUrl(existingPhotoUrl);
      photoUrl = uploaded;
    }
  }

  // If photoUrl was explicitly cleared (set to '')
  if (form.photoUrl === '') {
    if (existingPhotoUrl) deletePhotoByUrl(existingPhotoUrl);
    photoUrl = null;
  }

  const { data, error } = await supabase
    .from('expenses')
    .update({
      amount:       Number(form.amount),
      category:     form.category,
      description:  form.description,
      notes:        form.notes || null,
      expense_date: form.expenseDate,
      photo_url:    photoUrl,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[expenseService] updateExpense', error);
    return null;
  }
  return rowToExpense(data as Record<string, unknown>);
}

export async function deleteExpense(id: string, photoUrl?: string): Promise<boolean> {
  if (photoUrl) deletePhotoByUrl(photoUrl);

  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[expenseService] deleteExpense', error);
    return false;
  }
  return true;
}