import { motion, useAnimation } from "framer-motion";
import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { NotificationBadge } from "./NotificationBadge";

interface Props {
  unreadCount: number;
}

export function NotificationBell({ unreadCount }: Props) {
  const controls = useAnimation();
  const navigate = useNavigate();

  const handleClick = async () => {
    await controls.start({
      rotate: [0, -15, 15, -10, 10, -5, 5, 0],
      transition: { duration: 0.5, ease: "easeInOut" },
    });
    navigate("/dashboard/notifications"); // ← fixed path
  };

  return (
    <button
      onClick={handleClick}
      aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
      className="relative p-2 rounded-2xl hover:bg-violet-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
    >
      <motion.div animate={controls}>
        <Bell
          size={22}
          className={unreadCount > 0 ? "text-violet-600" : "text-slate-400"}
          strokeWidth={2}
        />
      </motion.div>
      <NotificationBadge count={unreadCount} />
    </button>
  );
}