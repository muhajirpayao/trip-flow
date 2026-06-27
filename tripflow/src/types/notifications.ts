export type NotificationType =
  | "activity"
  | "trip"
  | "budget"
  | "document"
  | "packing"
  | "system";

export interface Notification {
  id: string;
  user_id: string;
  trip_id?: string | null;
  title: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  scheduled_at?: string | null;
  created_at: string;
}

export interface NotificationPreferences {
  activity_reminder_minutes: number; // default 30
  trip_countdown_days: number[]; // default [30, 7, 1]
  budget_alerts: boolean;
  document_reminders: boolean;
  packing_reminders: boolean;
}