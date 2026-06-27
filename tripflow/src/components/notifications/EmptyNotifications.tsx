import { motion } from "framer-motion";

export function EmptyNotifications() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="flex flex-col items-center justify-center py-20 px-6 text-center"
    >
      {/* Illustration */}
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="relative mb-6"
      >
        {/* Glowing ring */}
        <div className="absolute inset-0 rounded-full bg-violet-200/40 blur-2xl scale-125" />

        {/* Circle background */}
        <div
          className="
            relative w-28 h-28 rounded-full
            bg-gradient-to-br from-violet-100 to-pink-100
            flex items-center justify-center
            shadow-lg shadow-violet-100
          "
        >
          {/* Bell SVG illustration */}
          <svg
            width="56"
            height="56"
            viewBox="0 0 56 56"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            {/* Bell body */}
            <path
              d="M28 8C28 8 16 14 16 28V38H40V28C40 14 28 8 28 8Z"
              fill="url(#bellGrad)"
              opacity="0.9"
            />
            {/* Bell top */}
            <circle cx="28" cy="8" r="3" fill="#c084fc" />
            {/* Bell base */}
            <rect x="20" y="38" width="16" height="4" rx="2" fill="#d8b4fe" />
            {/* Clapper */}
            <circle cx="28" cy="46" r="3" fill="#a78bfa" />
            {/* Stars */}
            <circle cx="44" cy="14" r="2" fill="#f9a8d4" opacity="0.7" />
            <circle cx="12" cy="20" r="1.5" fill="#86efac" opacity="0.7" />
            <circle cx="46" cy="30" r="1.5" fill="#7dd3fc" opacity="0.7" />

            <defs>
              <linearGradient
                id="bellGrad"
                x1="16"
                y1="8"
                x2="40"
                y2="38"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#c084fc" />
                <stop offset="1" stopColor="#818cf8" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Floating sparkle dots */}
        {[
          { x: "-translate-x-8 -translate-y-4", delay: 0, color: "bg-pink-300" },
          { x: "translate-x-8 -translate-y-2", delay: 0.4, color: "bg-violet-400" },
          { x: "translate-x-10 translate-y-6", delay: 0.8, color: "bg-sky-300" },
        ].map((dot, i) => (
          <motion.span
            key={i}
            className={`absolute w-2 h-2 rounded-full ${dot.color} ${dot.x}`}
            animate={{ opacity: [0.4, 1, 0.4], scale: [0.8, 1.2, 0.8] }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: dot.delay,
              ease: "easeInOut",
            }}
          />
        ))}
      </motion.div>

      {/* Text */}
      <h3 className="text-lg font-bold text-slate-700 mb-2">
        You're all caught up ✨
      </h3>
      <p className="text-sm text-slate-400 max-w-[220px] leading-relaxed">
        We'll notify you when something important happens on your trip.
      </p>
    </motion.div>
  );
}