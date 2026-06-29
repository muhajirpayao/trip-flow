// lib/adminService.ts
import { supabase } from './supabase';
import type {
  AdminUser,
  ActivityLog,
  AdminNotification,
  Announcement,
  AppSetting,
  DashboardStats,
} from '../types/admin';

// ── Key Validation ─────────────────────────────────────────────────────────────
// IMPORTANT: This validation queries admin_keys directly.
// In production, use a Supabase Edge Function with the service role key
// so the admin_keys table is never exposed via RLS.
export async function validateAdminKey(key: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('admin_keys')
    .select('id, is_active')
    .eq('access_key', key)
    .eq('is_active', true)
    .single();

  if (error || !data) return false;
  return true;
}

// ── Dashboard Stats ────────────────────────────────────────────────────────────
export async function fetchDashboardStats(): Promise<DashboardStats> {
  const [
    { count: totalUsers },
    { count: totalTrips },
    { count: totalDocuments },
    { count: totalNotifications },
    { count: savedPlaces },
    { count: totalExpenses },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('trips').select('*', { count: 'exact', head: true }),
    supabase.from('documents').select('*', { count: 'exact', head: true }),
    supabase.from('notifications').select('*', { count: 'exact', head: true }),
    supabase.from('places').select('*', { count: 'exact', head: true }),
    supabase.from('expenses').select('*', { count: 'exact', head: true }),
  ]);

  return {
    totalUsers: totalUsers ?? 0,
    totalTrips: totalTrips ?? 0,
    totalDocuments: totalDocuments ?? 0,
    totalNotifications: totalNotifications ?? 0,
    savedPlaces: savedPlaces ?? 0,
    totalExpenses: totalExpenses ?? 0,
  };
}

// ── User Growth Chart Data ─────────────────────────────────────────────────────
export async function fetchUserGrowth(): Promise<{ label: string; value: number }[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('created_at')
    .order('created_at', { ascending: true });

  if (error || !data) return [];

  const months: Record<string, number> = {};
  data.forEach((row) => {
    const month = new Date(row.created_at).toLocaleDateString('en-US', {
      month: 'short',
      year: '2-digit',
    });
    months[month] = (months[month] ?? 0) + 1;
  });

  return Object.entries(months)
    .slice(-8)
    .map(([label, value]) => ({ label, value }));
}

// ── Users ──────────────────────────────────────────────────────────────────────
export async function fetchAllUsers(
  page = 0,
  pageSize = 20,
  search = ''
): Promise<{ users: AdminUser[]; total: number }> {
  let query = supabase
    .from('profiles')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1);

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  const { data, count, error } = await query;
  if (error) throw error;

  return { users: (data as AdminUser[]) ?? [], total: count ?? 0 };
}

export async function updateUserStatus(
  userId: string,
  status: 'active' | 'suspended'
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ status })
    .eq('id', userId);
  if (error) throw error;
}

export async function deleteUser(userId: string): Promise<void> {
  // Deletes from profiles; auth.users is handled by cascade or admin API
  const { error } = await supabase.from('profiles').delete().eq('id', userId);
  if (error) throw error;
}

// ── Activity Logs ──────────────────────────────────────────────────────────────
export async function fetchActivityLogs(
  page = 0,
  pageSize = 30
): Promise<{ logs: ActivityLog[]; total: number }> {
  const { data, count, error } = await supabase
    .from('activity_logs')
    .select('*, profile:profiles(full_name, avatar_url, email)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1);

  if (error) throw error;
  return { logs: (data as ActivityLog[]) ?? [], total: count ?? 0 };
}

export async function logActivity(
  userId: string,
  action: string,
  entityType?: string,
  entityId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await supabase.from('activity_logs').insert({
    user_id: userId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    metadata: metadata ?? {},
  });
}

// ── Notifications ──────────────────────────────────────────────────────────────
export async function fetchAdminNotifications(): Promise<AdminNotification[]> {
  const { data, error } = await supabase
    .from('admin_notifications')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as AdminNotification[]) ?? [];
}

export async function createAdminNotification(
  payload: Omit<AdminNotification, 'id' | 'created_at' | 'sent_at' | 'is_sent'>
): Promise<void> {
  const { error } = await supabase.from('admin_notifications').insert(payload);
  if (error) throw error;
}

export async function deleteAdminNotification(id: string): Promise<void> {
  const { error } = await supabase.from('admin_notifications').delete().eq('id', id);
  if (error) throw error;
}

// ── Announcements ──────────────────────────────────────────────────────────────
export async function fetchAnnouncements(): Promise<Announcement[]> {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as Announcement[]) ?? [];
}

export async function upsertAnnouncement(
  payload: Partial<Announcement> & { title: string; message: string }
): Promise<void> {
  const { error } = await supabase.from('announcements').upsert({
    ...payload,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const { error } = await supabase.from('announcements').delete().eq('id', id);
  if (error) throw error;
}

// ── App Settings ───────────────────────────────────────────────────────────────
export async function fetchAppSettings(): Promise<Record<string, string>> {
  const { data, error } = await supabase.from('app_settings').select('*');
  if (error) throw error;
  const settings: Record<string, string> = {};
  (data as AppSetting[])?.forEach((s) => {
    settings[s.key] = s.value ?? '';
  });
  return settings;
}

export async function updateAppSetting(key: string, value: string): Promise<void> {
  const { error } = await supabase
    .from('app_settings')
    .update({ value, updated_at: new Date().toISOString() })
    .eq('key', key);
  if (error) throw error;
}

export async function updateAdminKey(newKey: string): Promise<void> {
  // Deactivate all existing keys, insert new one
  await supabase.from('admin_keys').update({ is_active: false }).eq('is_active', true);
  const { error } = await supabase
    .from('admin_keys')
    .insert({ access_key: newKey, is_active: true });
  if (error) throw error;
}