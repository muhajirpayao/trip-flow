import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import type { Notification } from "../../types/notifications";
import { NOTIFICATION_CONFIG } from "./notificationConfig";

interface Props {
  notification: Notification | null;
  onDismiss: () => void;
  autoHideMs?: number;
}

export function NotificationToast({
  notification,
  onDismiss,
  autoHideMs = 4000,
}: Props) {
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(onDismiss, autoHideMs);
    return () => clearTimeout(timer);
  }, [notification, onDismiss, autoHideMs]);

  const config = notification ? NOTIFICATION_CONFIG[notification.type] : null;
  const Icon = config?.icon;

  return (
    <AnimatePresence>
      {notification && config && Icon && (
        <motion.div
          key={notification.id}
          initial={{ y: -80, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -80, opacity: 0, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 420, damping: 32 }}
          className="
            fixed top-4 left-1/2 -translate-x-1/2 z-50
            flex items-center gap-3
            px-4 py-3
            rounded-3xl
            bg-white/80 backdrop-blur-xl
            border border-violet-100
            shadow-xl shadow-violet-200/50
            min-w-[280px] max-w-[360px]
          "
          role="alert"
          aria-live="assertive"
        >
          {/* Gradient pill accent */}
          <div
            className={`
              w-9 h-9 rounded-xl flex-shrink-0
              flex items-center justify-center
              bg-gradient-to-br ${config.gradient}
              shadow-sm
            `}
          >
            <Icon size={17} className="text-white" strokeWidth={2} />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-800 leading-snug">
              {notification.title}
            </p>
            <p className="text-xs text-slate-500 truncate mt-0.5">
              {notification.message}
            </p>
          </div>

          <button
            onClick={onDismiss}
            aria-label="Dismiss"
            className="
              flex-shrink-0 w-6 h-6 rounded-full
              flex items-center justify-center
              bg-slate-100 hover:bg-slate-200
              text-slate-400
              transition-colors
            "
          >
            <X size={11} strokeWidth={2.5} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}