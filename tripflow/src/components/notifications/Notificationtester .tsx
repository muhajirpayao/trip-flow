import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Plus, Trash2, CheckCheck, Wifi } from "lucide-react";
import { createNotification } from "../../lib/notificationService";
import { useNotifications } from "../../hooks/useNotifications";
import type { NotificationType } from "../../types/notifications";

const USER_ID = "87086a35-1056-4244-8eb8-6ee09cb37f28";

const TEST_NOTIFICATIONS: {
  label: string;
  type: NotificationType;
  title: string;
  message: string;
  color: string;
}[] = [
  {
    label: "Activity",
    type: "activity",
    title: "Upcoming Activity 📍",
    message: "Victoria Peak starts in 30 minutes.",
    color: "bg-violet-100 text-violet-700",
  },
  {
    label: "Trip",
    type: "trip",
    title: "Trip Countdown ✈️",
    message: "Your Hong Kong trip starts in 7 days!",
    color: "bg-sky-100 text-sky-700",
  },
  {
    label: "Budget",
    type: "budget",
    title: "Budget Alert ⚠️",
    message: "Heads up! You've used 80% of your budget.",
    color: "bg-orange-100 text-orange-700",
  },
  {
    label: "Document",
    type: "document",
    title: "Document Reminder 📄",
    message: "Upload your passport copy — 3 days left.",
    color: "bg-emerald-100 text-emerald-700",
  },
  {
    label: "Packing",
    type: "packing",
    title: "Packing Reminder 🧳",
    message: "Your trip starts tomorrow and you still have 5 items unpacked.",
    color: "bg-pink-100 text-pink-700",
  },
  {
    label: "System",
    type: "system",
    title: "Welcome to TripFlow 🌸",
    message: "Your travel companion is ready!",
    color: "bg-yellow-100 text-yellow-700",
  },
];

export function NotificationTester() {
  const [sending, setSending] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);

  const { notifications, unreadCount, markAllRead, clearAll } =
    useNotifications(USER_ID);

  const addLog = (msg: string) =>
    setLog((prev) => [`${new Date().toLocaleTimeString()} — ${msg}`, ...prev.slice(0, 9)]);

  const send = async (n: (typeof TEST_NOTIFICATIONS)[0]) => {
    setSending(n.type);
    try {
      await createNotification({
        user_id: USER_ID,
        trip_id: null,
        title: n.title,
        message: n.message,
        type: n.type,
        is_read: false,
        scheduled_at: null,
      });
      addLog(`✅ Sent "${n.label}" notification`);
    } catch (e) {
      addLog(`❌ Failed to send "${n.label}": ${e}`);
    } finally {
      setSending(null);
    }
  };

  return (
    <div className="fixed bottom-24 right-4 z-50 w-80">
      <div className="bg-white rounded-3xl shadow-2xl shadow-violet-200/60 border border-violet-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-500 to-purple-600 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell size={16} className="text-white" strokeWidth={2} />
            <span className="text-white text-sm font-bold">Notification Tester</span>
          </div>
          <div className="flex items-center gap-2">
            <Wifi size={13} className="text-white/70" />
            <span className="text-white/80 text-xs">Realtime</span>
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          </div>
        </div>

        {/* Live counter */}
        <div className="px-4 py-3 bg-violet-50 border-b border-violet-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-center">
              <p className="text-2xl font-bold text-violet-600 leading-none">
                {notifications.length}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">total</p>
            </div>
            <div className="w-px h-8 bg-violet-200" />
            <div className="text-center">
              <p className="text-2xl font-bold text-pink-500 leading-none">
                {unreadCount}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">unread</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={markAllRead}
              title="Mark all read"
              className="w-8 h-8 rounded-xl bg-white border border-violet-100 flex items-center justify-center text-violet-500 hover:bg-violet-50 transition-colors"
            >
              <CheckCheck size={14} strokeWidth={2.5} />
            </button>
            <button
              onClick={clearAll}
              title="Clear all"
              className="w-8 h-8 rounded-xl bg-white border border-rose-100 flex items-center justify-center text-rose-400 hover:bg-rose-50 transition-colors"
            >
              <Trash2 size={14} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Send buttons */}
        <div className="p-3 grid grid-cols-2 gap-2">
          {TEST_NOTIFICATIONS.map((n) => (
            <button
              key={n.type}
              onClick={() => send(n)}
              disabled={sending === n.type}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-2xl text-xs font-semibold
                transition-all active:scale-95
                ${sending === n.type ? "opacity-50 cursor-wait" : "hover:scale-105"}
                ${n.color}
              `}
            >
              <Plus size={12} strokeWidth={3} />
              {sending === n.type ? "Sending…" : n.label}
            </button>
          ))}
        </div>

        {/* Activity log */}
        <div className="px-3 pb-3">
          <p className="text-[10px] text-slate-400 font-medium mb-1.5 px-1">Activity log</p>
          <div className="bg-slate-50 rounded-2xl p-2 h-24 overflow-y-auto space-y-1">
            <AnimatePresence initial={false}>
              {log.length === 0 && (
                <p className="text-[10px] text-slate-300 text-center mt-6">
                  Press a button to test
                </p>
              )}
              {log.map((entry, i) => (
                <motion.p
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-[10px] text-slate-500 font-mono leading-relaxed"
                >
                  {entry}
                </motion.p>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}