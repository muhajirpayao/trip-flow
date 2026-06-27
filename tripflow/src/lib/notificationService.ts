import { supabase } from "../lib/supabase";
import type { Notification } from "../types/notifications";

// ─────────────────────────────────────────────
// FETCH
// ─────────────────────────────────────────────
export async function fetchNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

// ─────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────
export async function createNotification(
  payload: Omit<Notification, "id" | "created_at">
): Promise<Notification> {
  const { data, error } = await supabase
    .from("notifications")
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─────────────────────────────────────────────
// READ
// ─────────────────────────────────────────────
export async function markAsRead(id: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id);

  if (error) throw error;
}

export async function markAllAsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) throw error;
}

// ─────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────
export async function deleteNotification(id: string): Promise<void> {
  const { error } = await supabase.from("notifications").delete().eq("id", id);
  if (error) throw error;
}

export async function clearAllNotifications(userId: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("user_id", userId);

  if (error) throw error;
}

// ─────────────────────────────────────────────
// GENERATORS
// ─────────────────────────────────────────────
export function buildActivityReminder(params: {
  userId: string;
  tripId: string;
  activityName: string;
  minutesBefore: number;
  activityTime: Date;
}): Omit<Notification, "id" | "created_at"> {
  const { userId, tripId, activityName, minutesBefore, activityTime } = params;
  const scheduledAt = new Date(activityTime.getTime() - minutesBefore * 60_000);

  return {
    user_id: userId,
    trip_id: tripId,
    title: "Upcoming Activity",
    message: `${activityName} starts in ${minutesBefore} minutes.`,
    type: "activity",
    is_read: false,
    scheduled_at: scheduledAt.toISOString(),
  };
}

export function buildTripCountdown(params: {
  userId: string;
  tripId: string;
  tripName: string;
  daysUntilTrip: number;
}): Omit<Notification, "id" | "created_at"> {
  const { userId, tripId, tripName, daysUntilTrip } = params;
  const message =
    daysUntilTrip === 1
      ? `Your ${tripName} trip starts tomorrow! 🎉`
      : `Your ${tripName} trip starts in ${daysUntilTrip} days ✈️`;

  return {
    user_id: userId,
    trip_id: tripId,
    title: "Trip Countdown",
    message,
    type: "trip",
    is_read: false,
    scheduled_at: null,
  };
}

export function buildBudgetAlert(params: {
  userId: string;
  tripId: string;
  percentUsed: number;
  remaining?: number;
  currency?: string;
}): Omit<Notification, "id" | "created_at"> {
  const { userId, tripId, percentUsed, remaining, currency = "USD" } = params;

  let message: string;
  if (percentUsed >= 100) {
    message = "You've exceeded your travel budget. Time to review your spending.";
  } else if (percentUsed >= 80) {
    message = `Heads up! You've used ${percentUsed}% of your trip budget.${remaining ? ` Only ${currency} ${remaining.toLocaleString()} remains.` : ""}`;
  } else {
    message = `Great progress! You've used ${percentUsed}% of your travel budget.`;
  }

  return {
    user_id: userId,
    trip_id: tripId,
    title: "Budget Alert",
    message,
    type: "budget",
    is_read: false,
    scheduled_at: null,
  };
}

export function buildDocumentReminder(params: {
  userId: string;
  tripId: string;
  missingDoc: string;
  daysUntilTrip: number;
}): Omit<Notification, "id" | "created_at"> {
  const { userId, tripId, missingDoc, daysUntilTrip } = params;
  const message =
    daysUntilTrip <= 1
      ? `Your trip is tomorrow. Make sure your ${missingDoc} is ready! 📄`
      : `Upload your ${missingDoc} before your trip — only ${daysUntilTrip} days left.`;

  return {
    user_id: userId,
    trip_id: tripId,
    title: "Document Reminder",
    message,
    type: "document",
    is_read: false,
    scheduled_at: null,
  };
}

export function buildPackingReminder(params: {
  userId: string;
  tripId: string;
  unpackedCount: number;
}): Omit<Notification, "id" | "created_at"> {
  const { userId, tripId, unpackedCount } = params;
  return {
    user_id: userId,
    trip_id: tripId,
    title: "Packing Reminder",
    message: `Your trip starts tomorrow and you still have ${unpackedCount} item${unpackedCount !== 1 ? "s" : ""} unpacked. 🧳`,
    type: "packing",
    is_read: false,
    scheduled_at: null,
  };
}