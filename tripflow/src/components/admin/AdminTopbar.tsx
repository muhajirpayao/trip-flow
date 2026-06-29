// components/admin/AdminTopbar.tsx
import { Menu } from 'lucide-react';

interface AdminTopbarProps {
  title: string;
  subtitle?: string;
  onMenuClick: () => void;
}

export default function AdminTopbar({ title, subtitle, onMenuClick }: AdminTopbarProps) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <header className="h-14 border-b border-white/[0.06] flex items-center justify-between px-4 lg:px-6 shrink-0 bg-[#0a0a0f]/80 backdrop-blur-sm sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden text-white/40 hover:text-white/70 transition-colors p-1.5 rounded-lg hover:bg-white/5"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-sm font-semibold text-white leading-tight">{title}</h1>
          {subtitle && <p className="text-xs text-white/35 leading-tight">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs text-white/25 hidden sm:block">{dateStr}</span>
        <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-1">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-medium text-emerald-400/80">Admin</span>
        </div>
      </div>
    </header>
  );
}