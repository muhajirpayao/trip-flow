import { AnimatePresence, motion } from "framer-motion";
import { CheckCheck, Trash2 } from "lucide-react";
import type { Notification } from "../../types/notifications";
import { NotificationCard } from "./NotificationCard";
import { EmptyNotifications } from "./EmptyNotifications";

interface Props {
  notifications: Notification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
  loading: boolean;
}

export function NotificationCenter({
  notifications,
  onMarkRead,
  onMarkAllRead,
  onDelete,
  onClearAll,
  loading,
}: Props) {
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="w-full">
      {/* Header actions */}
      {notifications.length > 0 && (
        <div className="flex items-center justify-between mb-4 px-1">
          <p className="text-xs text-slate-400 font-medium">
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up ✓"}
          </p>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllRead}
                className="flex items-center gap-1.5 text-xs font-medium text-violet-600 hover:text-violet-700 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-xl transition-colors"
              >
                <CheckCheck size={13} strokeWidth={2.5} />
                Mark all read
              </button>
            )}
            <button
              onClick={onClearAll}
              className="flex items-center gap-1.5 text-xs font-medium text-rose-400 hover:text-rose-500 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-xl transition-colors"
            >
              <Trash2 size={13} strokeWidth={2} />
              Clear all
            </button>
          </div>
        </div>
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