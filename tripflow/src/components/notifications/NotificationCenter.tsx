import { AnimatePresence, motion } from "framer-motion";
import type { Notification } from "../../types/notifications";
import { NotificationCard } from "./NotificationCard";
import { EmptyNotifications } from "./EmptyNotifications";

interface Props {
  notifications: Notification[];
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
  loading: boolean;
}

export function NotificationCenter({
  notifications,
  onMarkRead,
  onDelete,
  loading,
}: Props) {
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="w-full">
      {/* Unread status line */}
      {notifications.length > 0 && (
        <p className="text-xs text-slate-400 font-medium mb-4 px-1">
          {unreadCount > 0 ? `${unreadCount} unread` : "All caught up ✓"}
        </p>
      )}

      {/* Swipe hint (shown only when there are unread cards) */}
      {!loading && unreadCount > 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-[11px] text-slate-300 font-medium mb-3 select-none"
        >
          ← swipe to delete · swipe to mark read →
        </motion.p>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-[84px] rounded-3xl bg-slate-100/80 animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && notifications.length === 0 && <EmptyNotifications />}

      {/* Cards */}
      {!loading && notifications.length > 0 && (
        <motion.div layout className="space-y-3">
          <AnimatePresence initial={false} mode="popLayout">
            {notifications.map((n) => (
              <NotificationCard
                key={n.id}
                notification={n}
                onMarkRead={onMarkRead}
                onDelete={onDelete}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}