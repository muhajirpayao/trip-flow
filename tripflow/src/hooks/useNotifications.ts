import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import * as notificationService from "../lib/notificationService";
import type { Notification } from "../types/notifications";

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  latestNew: Notification | null;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  remove: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  dismissToast: () => void;
}

export function useNotifications(userId: string | undefined): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [latestNew, setLatestNew] = useState<Notification | null>(null);
  const isMounted = useRef(true);

  // ── initial load ──────────────────────────────────────────────
  useEffect(() => {
    isMounted.current = true;
    if (!userId) { setLoading(false); return; }

    notificationService.fetchNotifications(userId)
      .then((data: Notification[]) => {
        if (isMounted.current) setNotifications(data);
      })
      .catch(console.error)
      .finally(() => {
        if (isMounted.current) setLoading(false);
      });

    return () => { isMounted.current = false; };
  }, [userId]);

  // ── realtime subscription (safe — won't crash if not enabled) ─
  useEffect(() => {
    if (!userId) return;

    let channel: ReturnType<typeof supabase.channel> | null = null;

    try {
      channel = supabase.channel(`notifications:${userId}`);

      channel
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const newNotif = payload.new as Notification;
            setNotifications((prev) => [newNotif, ...prev]);
            setLatestNew(newNotif);
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const updated = payload.new as Notification;
            setNotifications((prev) =>
              prev.map((n) => (n.id === updated.id ? updated : n))
            );
          }
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const deleted = payload.old as Notification;
            setNotifications((prev) => prev.filter((n) => n.id !== deleted.id));
          }
        )
        .subscribe((_status, err) => {
          if (err) {
            // Realtime not enabled on this table — polling fallback kicks in below
            console.warn("Realtime unavailable for notifications:", err.message);
          }
        });
    } catch (err) {
      console.warn("Realtime subscription failed, falling back to polling:", err);
    }

    // ── polling fallback (every 30s) if realtime isn't enabled ──
    const poll = setInterval(() => {
      if (!userId) return;
      notificationService.fetchNotifications(userId)
        .then((data) => { if (isMounted.current) setNotifications(data); })
        .catch(console.error);
    }, 30_000);

    return () => {
      clearInterval(poll);
      if (channel) supabase.removeChannel(channel);
    };
  }, [userId]);

  // ── actions (optimistic) ──────────────────────────────────────
  const markRead = useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    await notificationService.markAsRead(id).catch(() => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: false } : n))
      );
    });
  }, []);

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await notificationService.markAllAsRead(userId).catch(console.error);
  }, [userId]);

  const remove = useCallback(async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    await notificationService.deleteNotification(id).catch(console.error);
  }, []);

  const clearAll = useCallback(async () => {
    if (!userId) return;
    setNotifications([]);
    await notificationService.clearAllNotifications(userId).catch(console.error);
  }, [userId]);

  const dismissToast = useCallback(() => setLatestNew(null), []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return {
    notifications,
    unreadCount,
    loading,
    latestNew,
    markRead,
    markAllRead,
    remove,
    clearAll,
    dismissToast,
  };
}