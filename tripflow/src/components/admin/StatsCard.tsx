// components/admin/StatsCard.tsx
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  icon: LucideIcon;
  label: string;
  value: number;
  color: 'violet' | 'pink' | 'sky' | 'mint' | 'amber' | 'rose';
  prefix?: string;
  delay?: number;
}

const COLOR_MAP = {
  violet: {
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
    icon: 'text-violet-400',
    iconBg: 'bg-violet-500/15',
    glow: 'shadow-violet-500/10',
  },
  pink: {
    bg: 'bg-pink-500/10',
    border: 'border-pink-500/20',
    icon: 'text-pink-400',
    iconBg: 'bg-pink-500/15',
    glow: 'shadow-pink-500/10',
  },
  sky: {
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/20',
    icon: 'text-sky-400',
    iconBg: 'bg-sky-500/15',
    glow: 'shadow-sky-500/10',
  },
  mint: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    icon: 'text-emerald-400',
    iconBg: 'bg-emerald-500/15',
    glow: 'shadow-emerald-500/10',
  },
  amber: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    icon: 'text-amber-400',
    iconBg: 'bg-amber-500/15',
    glow: 'shadow-amber-500/10',
  },
  rose: {
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
    icon: 'text-rose-400',
    iconBg: 'bg-rose-500/15',
    glow: 'shadow-rose-500/10',
  },
};

function useCountUp(target: number, duration = 1200, delay = 0) {
  const [count, setCount] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const start = performance.now();
      const animate = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        // ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        setCount(Math.floor(eased * target));
        if (progress < 1) {
          rafRef.current = requestAnimationFrame(animate);
        } else {
          setCount(target);
        }
      };
      rafRef.current = requestAnimationFrame(animate);
    }, delay);

    return () => {
      clearTimeout(timeout);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration, delay]);

  return count;
}

export default function StatsCard({
  icon: Icon,
  label,
  value,
  color,
  prefix = '',
  delay = 0,
}: StatsCardProps) {
  const displayValue = useCountUp(value, 1200, delay);
  const colors = COLOR_MAP[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: delay / 1000, ease: 'easeOut' }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className={`
        relative overflow-hidden rounded-2xl border ${colors.border} ${colors.bg}
        p-5 backdrop-blur-sm shadow-lg ${colors.glow}
        cursor-default group
      `}
    >
      {/* Subtle glow */}
      <div className={`absolute -top-6 -right-6 w-20 h-20 ${colors.iconBg} rounded-full blur-2xl opacity-60 group-hover:opacity-100 transition-opacity`} />

      <div className="flex items-start justify-between relative z-10">
        <div>
          <p className="text-xs font-medium text-white/40 mb-3">{label}</p>
          <p className="text-3xl font-bold text-white tabular-nums tracking-tight">
            {prefix}{displayValue.toLocaleString()}
          </p>
        </div>
        <div className={`w-10 h-10 rounded-xl ${colors.iconBg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${colors.icon}`} />
        </div>
      </div>
    </motion.div>
  );
}