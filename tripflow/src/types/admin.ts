// types/admin.ts

export interface AdminUser {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  status: 'active' | 'suspended';
  created_at: string;
  last_login_at: string | null;
  trips_count?: number;
}

export interface ActivityLog {
  id: string;
  user_id: string | null;
  action: ActivityAction;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
    email: string | null;
  };
}

export type ActivityAction =
  | 'login'
  | 'logout'
  | 'trip_created'
  | 'trip_deleted'
  | 'document_uploaded'
  | 'expense_added'
  | 'place_saved'
  | 'notification_read'
  | 'profile_updated'
  | 'itinerary_updated';

export interface AdminNotification {
  id: string;
  title: string;
  message: string;
  type: 'system' | 'announcement' | 'update' | 'maintenance';
  target: 'all' | 'specific';
  target_user_id: string | null;
  scheduled_at: string | null;
  sent_at: string | null;
  is_sent: boolean;
  created_at: string;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'update' | 'maintenance';
  is_active: boolean;
  emoji: string;
  created_at: string;
  updated_at: string;
}

export interface AppSetting {
  id: string;
  key: string;
  value: string | null;
  updated_at: string;
}

export interface DashboardStats {
  totalUsers: number;
  totalTrips: number;
  totalDocuments: number;
  totalNotifications: number;
  savedPlaces: number;
  totalExpenses: number;
}

export interface ChartDataPoint {
  label: string;
  value: number;
}