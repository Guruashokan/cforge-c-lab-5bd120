import { useEffect, useState, type FC } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';
import { api } from '../services/api';
import type { UserStats, Company } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';
import {
  BarChart3,
  TrendingUp,
  Flame,
  CheckCircle2,
  AlertTriangle,
  Building2,
} from 'lucide-react';

export const Analytics: FC = () => {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [statsData, companiesData] = await Promise.all([
          api.fetchUserStats(),
          api.fetchCompanies(),
        ]);
        setStats(statsData);
        setCompanies(companiesData);
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading || !stats) {
    return <LoadingSpinner message="Aggregating performance metrics and telemetry..." />;
  }

  // Difficulty colors
  const DIFFICULTY_COLORS: Record<string, string> = {
    Medium: '#f59e0b',
    Hard: '#ef4444',
    'Very Hard': '#a855f7',
  };

  // Mock submission timeline over past 7 days
  const timelineData = [
    { day: 'Mon', submissions: 6, accepted: 4 },
    { day: 'Tue', submissions: 9, accepted: 7 },
    { day: 'Wed', submissions: 5, accepted: 4 },
    { day: 'Thu', submissions: 12, accepted: 9 },
    { day: 'Fri', submissions: 8, accepted: 6 },
    { day: 'Sat', submissions: 14, accepted: 11 },
    { day: 'Sun', submissions: 10, accepted: 8 },
  ];

  // Weakest topics based on mastery percentage
  const weakTopics = [...stats.topic_progress]
    .sort((a, b) => a.mastery_pct - b.mastery_pct)
    .slice(0, 2);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-2">
          <BarChart3 className="w-3.5 h-3.5" /> Performance Analytics
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Systems Proficiency & Grader Telemetry
        </h1>
        <p className="text-slate-400 text-sm max-w-2xl mt-1">
          Detailed breakdown of your execution runtimes, problem difficulty distribution, and memory allocation mastery.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center space-x-4">
          <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Total Solved</p>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-2xl font-bold font-mono text-white">{stats.total_solved}</span>
              <span className="text-xs text-slate-500 font-mono">/ {stats.total_attempted}</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center space-x-4">
          <div className="p-3 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Current Streak</p>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-2xl font-bold font-mono text-white">{stats.current_streak}</span>
              <span className="text-xs text-amber-400 font-medium">Days (Peak: {stats.max_streak})</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center space-x-4">
          <div className="p-3 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">First-pass Acceptance</p>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-2xl font-bold font-mono text-white">{stats.acceptance_rate}%</span>
              <span className="text-xs text-emerald-400 font-medium">High</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center space-x-4">
          <div className="p-3 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Focus Area</p>
            <p className="text-sm font-bold text-white truncate max-w-[140px]">
              {weakTopics[0]?.topic_name || 'Concurrency'}
            </p>
            <span className="text-[10px] text-rose-400 font-mono">
              {weakTopics[0]?.mastery_pct || 25}% mastery
            </span>
          </div>
        </div>
      </div>

      {/* Main Charts Row 1: Difficulty Distribution + Submissions over Time */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Difficulty Pie Chart (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-white">Difficulty Distribution</h2>
            <p className="text-xs text-slate-400">Solved problems classified by complexity</p>
          </div>

          <div className="h-64 my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.difficulty_distribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="solved"
                  nameKey="difficulty"
                >
                  {stats.difficulty_distribution.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={DIFFICULTY_COLORS[entry.difficulty] || '#3b82f6'}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#f8fafc',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-center text-xs">
            {stats.difficulty_distribution.map((d) => (
              <div key={d.difficulty} className="p-2 rounded bg-slate-950 border border-slate-850">
                <span
                  className="inline-block w-2 h-2 rounded-full mr-1.5"
                  style={{ backgroundColor: DIFFICULTY_COLORS[d.difficulty] || '#3b82f6' }}
                />
                <span className="text-slate-400 font-medium">{d.difficulty}</span>
                <p className="font-bold text-white font-mono mt-0.5">
                  {d.solved} / {d.total}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Submissions Over Time Line Chart (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-white">Submissions Over Time</h2>
            <p className="text-xs text-slate-400">Activity volume and accepted solutions this week</p>
          </div>

          <div className="h-64 my-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#f8fafc',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line
                  type="monotone"
                  dataKey="submissions"
                  name="Total Runs"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="accepted"
                  name="Accepted"
                  stroke="#10b981"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between text-xs font-mono text-slate-400 pt-2 border-t border-slate-800">
            <span>Weekly Velocity: <strong>64 Submissions</strong></span>
            <span className="text-emerald-400 font-semibold">+18% vs last week</span>
          </div>
        </div>
      </div>

      {/* Topic Progress Bar Chart */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <div>
          <h2 className="text-base font-bold text-white">Topic Competency & Mastery</h2>
          <p className="text-xs text-slate-400">Comparison of solved vs total problems across topics</p>
        </div>

        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.topic_progress} layout="vertical" margin={{ left: 40, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis type="number" stroke="#64748b" fontSize={12} />
              <YAxis
                type="category"
                dataKey="topic_name"
                stroke="#94a3b8"
                fontSize={12}
                width={140}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: '#f8fafc',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="solved" name="Solved" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              <Bar dataKey="total" name="Total Available" fill="#1e293b" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Target Company Preparation Progress */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-400" />
            Company Track Readiness
          </h2>
          <p className="text-xs text-slate-400">Coverage across target semiconductor & OS tracks</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {companies.map((c) => {
            const pct = Math.round((c.solved_count / (c.problem_count || 1)) * 100);
            return (
              <div
                key={c.slug}
                className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-white">{c.name}</span>
                  <span className="text-xs font-mono text-blue-400">{pct}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 rounded-full"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] font-mono text-slate-400">
                  <span>Solved:</span>
                  <span className="text-slate-300">
                    {c.solved_count} / {c.problem_count}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
