// pages/admin/AdminDashboard.tsx
import { useEffect, useState } from 'react';
import {
  Users,
  Plane,
  FileText,
  Bell,
  MapPin,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { motion } from 'framer-motion';
import StatsCard from '../../components/admin/StatsCard';
import { fetchDashboardStats, fetchUserGrowth } from '../../lib/adminServices';
import type { DashboardStats } from '../../types/admin';

const FEATURE_USAGE = [
  { name: 'Itinerary', value: 45, color: '#8b5cf6' },
  { name: 'Documents', value: 20, color: '#ec4899' },
  { name: 'Expenses', value: 15, color: '#38bdf8' },
  { name: 'Places', value: 10, color: '#34d399' },
  { name: 'Notifications', value: 10, color: '#f59e0b' },
];

const DAILY_ACTIVE = [
  { day: 'Mon', users: 42 },
  { day: 'Tue', users: 58 },
  { day: 'Wed', users: 51 },
  { day: 'Thu', users: 73 },
  { day: 'Fri', users: 89 },
  { day: 'Sat', users: 67 },
  { day: 'Sun', users: 44 },
];

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5"
    >
      <h3 className="text-sm font-semibold text-white/70 mb-4">{title}</h3>
      {children}
    </motion.div>
  );
}

const tooltipStyle = {
  backgroundColor: '#13131f',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '12px',
  color: '#fff',
  fontSize: '12px',
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [growth, setGrowth] = useState<{ label: string; value: number }[]>([]);
  const [, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchDashboardStats(), fetchUserGrowth()])
      .then(([s, g]) => {
        setStats(s);
        setGrowth(g.length > 0 ? g : [
          { label: 'Jan', value: 5 },
          { label: 'Feb', value: 12 },
          { label: 'Mar', value: 19 },
          { label: 'Apr', value: 31 },
          { label: 'May', value: 48 },
          { label: 'Jun', value: 62 },
        ]);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const s = stats ?? {
    totalUsers: 0,
    totalTrips: 0,
    totalDocuments: 0,
    totalNotifications: 0,
    savedPlaces: 0,
    totalExpenses: 0,
  };

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatsCard icon={Users}      label="Total Users"        value={s.totalUsers}        color="violet" delay={0}   />
        <StatsCard icon={Plane}      label="Total Trips"        value={s.totalTrips}        color="sky"    delay={60}  />
        <StatsCard icon={FileText}   label="Documents"          value={s.totalDocuments}    color="pink"   delay={120} />
        <StatsCard icon={Bell}       label="Notifications"      value={s.totalNotifications} color="amber" delay={180} />
        <StatsCard icon={MapPin}     label="Saved Places"       value={s.savedPlaces}       color="mint"   delay={240} />
        <StatsCard icon={DollarSign} label="Expenses Logged"    value={s.totalExpenses}     color="rose"   delay={300} />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="User Growth">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={growth}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={{ fill: '#8b5cf6', r: 4, strokeWidth: 0 }}
                activeDot={{ r: 5, fill: '#a78bfa' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Daily Active Users (This Week)">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={DAILY_ACTIVE} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="users" fill="#6d28d9" radius={[6, 6, 0, 0]}>
                {DAILY_ACTIVE.map((_, i) => (
                  <Cell key={i} fill={i === 4 ? '#8b5cf6' : '#4c1d95'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Feature usage pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard title="Feature Usage">
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={FEATURE_USAGE}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {FEATURE_USAGE.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => `${v}%`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-1 mt-2">
            {FEATURE_USAGE.map((f) => (
              <div key={f.name} className="flex items-center gap-1.5 text-xs text-white/50">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: f.color }} />
                {f.name} {f.value}%
              </div>
            ))}
          </div>
        </ChartCard>

        {/* Quick stats */}
        <div className="lg:col-span-2 bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white/70 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-violet-400" />
            Platform Health
          </h3>
          <div className="space-y-3">
            {[
              { label: 'User Activation Rate', value: 78, color: '#8b5cf6' },
              { label: 'Trip Completion Rate', value: 62, color: '#ec4899' },
              { label: 'Document Upload Rate', value: 45, color: '#38bdf8' },
              { label: 'Expense Tracking Rate', value: 33, color: '#34d399' },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-xs text-white/50 mb-1.5">
                  <span>{item.label}</span>
                  <span className="text-white/70 font-medium">{item.value}%</span>
                </div>
                <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${item.value}%` }}
                    transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}