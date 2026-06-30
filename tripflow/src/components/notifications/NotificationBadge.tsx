import { motion, AnimatePresence } from "framer-motion";

interface Props {
  count: number;
}

export function NotificationBadge({ count }: Props) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.span
          key={count}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 20 }}
          className="
            absolute -top-1.5 -right-1.5
            min-w-[18px] h-[18px] px-1
            flex items-center justify-center
            rounded-full
            bg-gradient-to-br from-pink-400 to-violet-500
            text-white text-[10px] font-bold leading-none
            shadow-lg shadow-violet-300/60
            pointer-events-none
            select-none
          "
        >
          {count > 99 ? "99+" : count}
        </motion.span>
      )}
    </AnimatePresence>
  );
}