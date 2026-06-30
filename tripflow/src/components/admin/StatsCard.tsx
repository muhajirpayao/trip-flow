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
  violet: { bg: 'bg-violet-50', border: 'border-violet-100', icon: 'text-violet-600', iconBg: 'bg-violet-100', value: 'text-violet-700' },
  pink:   { bg: 'bg-pink-50',   border: 'border-pink-100',   icon: 'text-pink-600',   iconBg: 'bg-pink-100',   value: 'text-pink-700'   },
  sky:    { bg: 'bg-sky-50',    border: 'border-sky-100',    icon: 'text-sky-600',    iconBg: 'bg-sky-100',    value: 'text-sky-700'    },
  mint:   { bg: 'bg-emerald-50',border: 'border-emerald-100',icon: 'text-emerald-600',iconBg: 'bg-emerald-100',value: 'text-emerald-700'},
  amber:  { bg: 'bg-amber-50',  border: 'border-amber-100',  icon: 'text-amber-600',  iconBg: 'bg-amber-100',  value: 'text-amber-700'  },
  rose:   { bg: 'bg-rose-50',   border: 'border-rose-100',   icon: 'text-rose-600',   iconBg: 'bg-rose-100',   value: 'text-rose-700'   },
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
        const eased = 1 - Math.pow(1 - progress, 3);
        setCount(Math.floor(eased * target));
        if (progress < 1) rafRef.current = requestAnimationFrame(animate);
        else setCount(target);
      };
      rafRef.current = requestAnimationFrame(animate);
    }, delay);
    return () => { clearTimeout(timeout); if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration, delay]);
  return count;
}

export default function StatsCard({ icon: Icon, label, value, color, prefix = '', delay = 0 }: StatsCardProps) {
  const displayValue = useCountUp(value, 1200, delay);
  const c = COLOR_MAP[color];
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: delay / 1000, ease: 'easeOut' }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className={`relative overflow-hidden rounded-2xl border ${c.border} ${c.bg} p-5 shadow-sm cursor-default group`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 mb-3">{label}</p>
          <p className={`text-3xl font-bold tabular-nums tracking-tight ${c.value}`}>
            {prefix}{displayValue.toLocaleString()}
          </p>
        </div>
        <div className={`w-10 h-10 rounded-xl ${c.iconBg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${c.icon}`} />
        </div>
      </div>
    </motion.div>
  );
}