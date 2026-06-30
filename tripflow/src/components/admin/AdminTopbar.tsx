import { Menu } from 'lucide-react';

interface AdminTopbarProps {
  title: string;
  subtitle?: string;
  onMenuClick: () => void;
}

export default function AdminTopbar({ title, subtitle, onMenuClick }: AdminTopbarProps) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <header className="h-14 border-b border-violet-100 flex items-center justify-between px-4 lg:px-6 shrink-0 bg-white/90 backdrop-blur-sm sticky top-0 z-20 shadow-sm">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-lg hover:bg-gray-100"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-sm font-semibold text-gray-800 leading-tight">{title}</h1>
          {subtitle && <p className="text-xs text-gray-400 leading-tight">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-300 hidden sm:block">{dateStr}</span>
        <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-medium text-emerald-600">Admin</span>
        </div>
      </div>
    </header>
  );
}