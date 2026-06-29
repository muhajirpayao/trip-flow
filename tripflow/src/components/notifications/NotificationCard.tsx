import { useRef } from "react";
import { motion, useAnimation, useMotionValue, useTransform } from "framer-motion";
import { Check, Trash2 } from "lucide-react";
import type { Notification } from "../../types/notifications";
import { NOTIFICATION_CONFIG } from "./notificationConfig";

function formatDistanceToNow(date: Date) {
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days >= 1) return `${days} day${days === 1 ? "" : "s"} ago`;
  if (hours >= 1) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  if (minutes >= 1) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  return "just now";
}

interface Props {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}

const SWIPE_THRESHOLD = 72;

export function NotificationCard({ notification, onMarkRead, onDelete }: Props) {
  const config = NOTIFICATION_CONFIG[notification.type];
  const Icon = config.icon;
  const timeAgo = formatDistanceToNow(new Date(notification.created_at));

  const x = useMotionValue(0);
  const controls = useAnimation();
  const dragStartX = useRef(0);

  const bgColor = useTransform(x, [-SWIPE_THRESHOLD, 0, SWIPE_THRESHOLD], [
    "rgba(244,63,94,0.12)",
    "rgba(255,255,255,0)",
    "rgba(139,92,246,0.12)",
  ]);

  const checkOpacity = useTransform(x, [0, SWIPE_THRESHOLD * 0.5, SWIPE_THRESHOLD], [0, 0.6, 1]);
  const trashOpacity = useTransform(x, [-SWIPE_THRESHOLD, -SWIPE_THRESHOLD * 0.5, 0], [1, 0.6, 0]);

  const handleDragEnd = async (_: unknown, info: { offset: { x: number } }) => {
    const offset = info.offset.x;

    if (offset > SWIPE_THRESHOLD && !notification.is_read) {
      await controls.start({ x: 80, opacity: 0, transition: { duration: 0.2 } });
      onMarkRead(notification.id);
    } else if (offset < -SWIPE_THRESHOLD) {
      await controls.start({ x: -80, opacity: 0, transition: { duration: 0.2 } });
      onDelete(notification.id);
    } else {
      controls.start({ x: 0, transition: { type: "spring", stiffness: 400, damping: 30 } });
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: -40, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 380, damping: 30 }}
      className="relative rounded-3xl overflow-hidden"
    >
      {/* ── Swipe hint icons behind the card ── */}
      <motion.div
        className="absolute inset-0 rounded-3xl flex items-center justify-between px-5 pointer-events-none"
        style={{ backgroundColor: bgColor }}
      >
        <motion.div style={{ opacity: checkOpacity }} className="flex items-center gap-1.5">
          <div className="w-8 h-8 rounded-xl bg-violet-500 flex items-center justify-center shadow">
            <Check size={15} strokeWidth={2.5} className="text-white" />
          </div>
          <span className="text-[11px] font-semibold text-violet-600">Mark read</span>
        </motion.div>
        <motion.div style={{ opacity: trashOpacity }} className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold text-rose-500">Delete</span>
          <div className="w-8 h-8 rounded-xl bg-rose-500 flex items-center justify-center shadow">
            <Trash2 size={15} strokeWidth={2} className="text-white" />
          </div>
        </motion.div>
      </motion.div>

      {/* ── Draggable card ── */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -120, right: notification.is_read ? 0 : 120 }}
        dragElastic={0.15}
        onDragStart={(_, info) => { dragStartX.current = info.point.x; }}
        onDragEnd={handleDragEnd}
        animate={controls}
        style={{ x }}
        className={`
          relative group flex items-start gap-4 p-4
          rounded-3xl border cursor-grab active:cursor-grabbing
          touch-pan-y transition-all duration-300
          ${
            notification.is_read
              ? "bg-white/40 border-slate-100/70 backdrop-blur-md shadow-none"
              : "bg-white/90 border-violet-100 shadow-md shadow-violet-100/40 backdrop-blur-sm"
          }
        `}
      >
        {/* Unread accent dot / read checkmark */}
        {!notification.is_read ? (
          <span className="absolute top-4 right-4 w-2 h-2 rounded-full bg-gradient-to-br from-pink-400 to-violet-500 shadow-sm" />
        ) : (
          <Check size={11} strokeWidth={3} className="absolute top-4 right-4 text-slate-300" />
        )}

        {/* Icon */}
        <div className={`flex-shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-300 ${config.bg} ${notification.is_read ? "opacity-50 grayscale" : ""}`}>
          <Icon size={20} className={config.iconColor} strokeWidth={2} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pr-6">
          <p className={`text-sm font-semibold leading-snug mb-0.5 ${notification.is_read ? "text-slate-500" : "text-slate-800"}`}>
            {notification.title}
          </p>
          <p className={`text-sm leading-relaxed ${notification.is_read ? "text-slate-400" : "text-slate-600"}`}>
            {notification.message}
          </p>
          <p className="mt-1.5 text-[11px] text-slate-400 font-medium">{timeAgo}</p>
        </div>

        {/* Tap action buttons (visible on hover / for desktop) */}
        <div className="absolute right-3 bottom-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          {!notification.is_read && (
            <button
              onClick={() => onMarkRead(notification.id)}
              aria-label="Mark as read"
              className="w-7 h-7 rounded-xl flex items-center justify-center bg-violet-50 hover:bg-violet-100 text-violet-500 transition-colors"
            >
              <Check size={13} strokeWidth={2.5} />
            </button>
          )}
          <button
            onClick={() => onDelete(notification.id)}
            aria-label="Delete notification"
            className="w-7 h-7 rounded-xl flex items-center justify-center bg-rose-50 hover:bg-rose-100 text-rose-400 transition-colors"
          >
            <Trash2 size={13} strokeWidth={2} />
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}