// src/components/expenses/ExpenseAnalytics.tsx
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { CATEGORY_META, type Expense } from '../../types/expenses';
import type { Currency } from '../../types';

interface Props {
  expenses: Expense[];
  currency: Currency;
}

function fmtShort(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(Math.round(n));
}

export default function ExpenseAnalytics({ expenses, currency }: Props) {
  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach(e => {
      map[e.category] = (map[e.category] ?? 0) + e.amount;
    });
    return Object.entries(map)
      .map(([cat, value]) => ({
        name: CATEGORY_META[cat as keyof typeof CATEGORY_META]?.label ?? cat,
        value,
        color: CATEGORY_META[cat as keyof typeof CATEGORY_META]?.chart ?? '#a78bfa',
      }))
      .sort((a, b) => b.value - a.value);
  }, [expenses]);

  const byDay = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach(e => {
      map[e.expenseDate] = (map[e.expenseDate] ?? 0) + e.amount;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14) // last 14 days
      .map(([date, total]) => ({
        day: new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
          month: 'short', day: 'numeric',
        }),
        total,
      }));
  }, [expenses]);

  if (expenses.length === 0) return null;

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      className="space-y-4"
    >
      {/* Pie Chart */}
      <div className="glass rounded-2xl border border-slate-100 p-4 shadow-sm">
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
          Spending by Category
        </p>
        <div className="flex items-center gap-4">
          <div className="h-36 w-36 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={byCategory}
                  cx="50%"
                  cy="50%"
                  innerRadius={36}
                  outerRadius={60}
                  dataKey="value"
                  strokeWidth={2}
                  stroke="#fff"
                >
                  {byCategory.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => {
                    const amount =
                      typeof value === 'number'
                        ? value
                        : typeof value === 'string'
                        ? Number(value)
                        : 0;

                    return new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency,
                      maximumFractionDigits: 0,
                    }).format(Number.isFinite(amount) ? amount : 0);
                  }}
                  contentStyle={{
                    borderRadius: 12,
                    border: 'none',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                    fontSize: 11,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* legend */}
          <div className="min-w-0 flex-1 space-y-1.5">
            {byCategory.slice(0, 6).map(item => {
              const pct = total > 0 ? ((item.value / total) * 100).toFixed(0) : '0';
              return (
                <div key={item.name} className="flex items-center gap-2">
                  <div
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="min-w-0 flex-1 truncate text-[11px] text-slate-600">
                    {item.name}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-700">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bar Chart */}
      {byDay.length > 1 && (
        <div className="glass rounded-2xl border border-slate-100 p-4 shadow-sm">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
            Daily Spending
          </p>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={byDay}
                margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f1f5f9"
                  vertical={false}
                />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={fmtShort}
                />
                <Tooltip
                  formatter={(value: any) => {
                    const amount =
                      typeof value === 'number'
                        ? value
                        : typeof value === 'string'
                        ? Number(value)
                        : 0;

                    return new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency,
                      maximumFractionDigits: 0,
                    }).format(Number.isFinite(amount) ? amount : 0);
                  }}
                  contentStyle={{
                    borderRadius: 12,
                    border: 'none',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                    fontSize: 11,
                  }}
                />
                <Bar
                  dataKey="total"
                  radius={[6, 6, 0, 0]}
                  fill="url(#barGrad)"
                  maxBarSize={32}
                />
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#a855f7" stopOpacity={0.6} />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </motion.div>
  );
}