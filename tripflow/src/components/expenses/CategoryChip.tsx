// src/components/expenses/CategoryChip.tsx
import { CATEGORY_META, type ExpenseCategory } from '../../types/expenses';

interface Props {
  category: ExpenseCategory;
  selected?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md';
}

export default function CategoryChip({
  category, selected = false, onClick, size = 'md',
}: Props) {
  const meta = CATEGORY_META[category];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        inline-flex items-center gap-1.5 rounded-2xl font-medium transition-all
        ${size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'}
        ${selected
          ? `${meta.bg} ${meta.color} ring-2 ring-offset-1 ring-current shadow-sm scale-105`
          : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
        }
      `}
    >
      <span>{meta.emoji}</span>
      <span>{meta.label}</span>
    </button>
  );
}