import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Bell, CheckCheck, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../hooks/useNotifications";
import { NotificationCenter } from "../components/notifications/NotificationCenter";
import { NotificationToast } from "../components/notifications/NotificationToast";

export default function NotificationsPage() {
  const { user } = useAuth();
  const userId = user?.id;

  const {
    notifications,
    unreadCount,
    loading,
    latestNew,
    markRead,
    markAllRead,
    remove,
    clearAll,
    dismissToast,
  } = useNotifications(userId);

  const navigate = useNavigate();
  const [confirmClear, setConfirmClear] = useState(false);

  const handleClearAll = () => {
    if (confirmClear) {
      clearAll();
      setConfirmClear(false);
    } else {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 2500);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.32, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="min-h-screen bg-gradient-to-b from-violet-50/60 via-white to-pink-50/30"
    >
      <NotificationToast notification={latestNew} onDismiss={dismissToast} />

      {/* ── Sticky Header ── */}
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.3, ease: "easeOut" }}
        className="sticky top-0 z-30 bg-white/70 backdrop-blur-xl border-b border-violet-100/60 px-4"
      >
        <div className="relative max-w-lg mx-auto flex items-center gap-3 py-4">
          <button
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="w-9 h-9 rounded-2xl flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors"
          >
            <ArrowLeft size={17} strokeWidth={2.2} />
          </button>

          <div className="flex items-center gap-2 flex-1">
            {/* Colored glowing bell */}
            <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 shadow-lg shadow-violet-300/50">
              <Bell size={15} className="text-white" strokeWidth={2.2} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-pink-500 border-2 border-white text-white text-[9px] font-bold flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>

            <h1 className="text-base font-bold text-slate-800 tracking-tight">
              Notifications
            </h1>

            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="ml-0.5 px-2 py-0.5 rounded-full bg-gradient-to-r from-pink-400 to-violet-500 text-white text-[10px] font-bold"
              >
                {unreadCount}
              </motion.span>
            )}
          </div>

          {/* ── Top-level actions ── */}
          <div className="flex items-center gap-1.5">
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                aria-label="Mark all as read"
                className="w-9 h-9 rounded-2xl flex items-center justify-center bg-violet-50 hover:bg-violet-100 text-violet-500 transition-colors"
              >
                <CheckCheck size={16} strokeWidth={2.2} />
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={handleClearAll}
                aria-label="Clear all notifications"
                className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-colors ${
                  confirmClear
                    ? "bg-rose-500 text-white"
                    : "bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-400"
                }`}
              >
                <Trash2 size={16} strokeWidth={2.2} />
              </button>
            )}
          </div>

          {confirmClear && (
            <motion.span
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-14 right-4 text-[10px] font-semibold text-rose-500 bg-white shadow-md border border-rose-100 px-2 py-1 rounded-lg"
            >
              Tap again to confirm
            </motion.span>
          )}
        </div>
      </motion.header>

      {/* ── Content ── */}
      <motion.main
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.3, ease: "easeOut" }}
        className="max-w-lg mx-auto px-4 py-6"
      >
<NotificationCenter
  notifications={notifications}
  onMarkRead={markRead}
  onDelete={remove}
  loading={loading}
/>

      </motion.main>

      <div className="h-24" />
    </motion.div>
  );
}