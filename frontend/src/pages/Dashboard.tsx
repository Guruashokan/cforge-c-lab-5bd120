import { useEffect, useState, type FC } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import type { UserStats, ProblemListItem } from '../types';
import { DifficultyBadge } from '../components/DifficultyBadge';
import { VerdictBadge } from '../components/VerdictBadge';
import { LoadingSpinner } from '../components/LoadingSpinner';
import {
  Flame,
  CheckCircle2,
  TrendingUp,
  Award,
  Zap,
  ArrowRight,
  Code2,
  Cpu,
  Clock,
  Sparkles,
} from 'lucide-react';

export const Dashboard: FC = () => {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [dailyChallenge, setDailyChallenge] = useState<{
    date: string;
    problem: ProblemListItem;
    bonus_xp: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [statsData, dailyData] = await Promise.all([
          api.fetchUserStats(),
          api.fetchDailyChallenge(),
        ]);
        setStats(statsData);
        setDailyChallenge(dailyData);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading || !stats) {
    return <LoadingSpinner message="Loading your systems workbench..." fullScreen={false} />;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-slate-900 border border-blue-500/20 p-6 sm:p-8">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" /> High-Performance C Practice
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome back, Engineer
            </h1>
            <p className="text-slate-300 text-sm sm:text-base max-w-xl">
              Sharpen your pointer arithmetic, concurrency primitives, and low-level C mastery.
              Ready for your next systems technical interview?
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/problems"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm rounded-lg shadow-lg shadow-blue-600/30 transition-all hover:translate-y-[-1px]"
            >
              <Code2 className="w-4 h-4" />
              Practice Arena
            </Link>
            <Link
              to="/assessments"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium text-sm rounded-lg transition-all"
            >
              <Award className="w-4 h-4" />
              Timed Mock
            </Link>
          </div>
        </div>
      </div>

      {/* Primary KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 flex items-center space-x-4">
          <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Problems Solved</p>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold text-white font-mono">{stats.total_solved}</span>
              <span className="text-xs text-slate-500 font-mono">/ {stats.total_attempted} attempted</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 flex items-center space-x-4">
          <div className="p-3 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Daily Streak</p>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold text-white font-mono">{stats.current_streak}</span>
              <span className="text-xs text-amber-400 font-medium">Days (Max: {stats.max_streak})</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 flex items-center space-x-4">
          <div className="p-3 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Acceptance Rate</p>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold text-white font-mono">{stats.acceptance_rate}%</span>
              <span className="text-xs text-emerald-400 font-medium">Top 15%</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 flex items-center space-x-4">
          <div className="p-3 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Hard & Very Hard</p>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold text-white font-mono">
                {stats.hard_solved + stats.very_hard_solved}
              </span>
              <span className="text-xs text-purple-400 font-medium">Advanced</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Daily Challenge + Topic Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Challenge Card */}
        {dailyChallenge && (
          <div className="lg:col-span-1 bg-gradient-to-b from-slate-900 to-slate-900/60 border border-amber-500/30 rounded-xl p-6 relative overflow-hidden flex flex-col justify-between shadow-lg shadow-amber-500/5">
            <div className="absolute top-0 right-0 p-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
                <Zap className="w-3.5 h-3.5" /> {dailyChallenge.bonus_xp} XP
              </span>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-xs text-amber-400 font-semibold tracking-wider uppercase">
                <Clock className="w-4 h-4" /> Today's Challenge
              </div>

              <div>
                <h3 className="text-xl font-bold text-white hover:text-blue-400 transition-colors">
                  <Link to={`/problems/${dailyChallenge.problem.slug}`}>
                    {dailyChallenge.problem.title}
                  </Link>
                </h3>
                <p className="text-sm text-slate-400 mt-1">
                  Topic: <span className="text-slate-300 font-medium">{dailyChallenge.problem.topic_name}</span>
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <DifficultyBadge difficulty={dailyChallenge.problem.difficulty} />
                <span className="text-xs text-slate-400 font-mono">
                  Acceptance: {dailyChallenge.problem.acceptance_rate}%
                </span>
              </div>
            </div>

            <div className="pt-6">
              <Link
                to={`/problems/${dailyChallenge.problem.slug}`}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-sm transition-colors"
              >
                Solve Today's Problem
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        {/* Topic Mastery Overview */}
        <div className={`bg-slate-900 border border-slate-800 rounded-xl p-6 ${dailyChallenge ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-bold text-white">Topic Mastery</h2>
              <p className="text-xs text-slate-400">Core C and low-level systems competencies</p>
            </div>
            <Link
              to="/roadmap"
              className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
            >
              Full Roadmap <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-4">
            {stats.topic_progress.map((t) => (
              <div key={t.topic_slug} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-200">{t.topic_name}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-slate-400 font-mono">
                      {t.solved} / {t.total}
                    </span>
                    <span className="font-semibold text-blue-400 font-mono w-10 text-right">
                      {t.mastery_pct}%
                    </span>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 rounded-full transition-all duration-500"
                    style={{ width: `${t.mastery_pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Submissions */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">Recent Submissions</h2>
          <Link
            to="/problems?status=solved"
            className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
          >
            View All <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs uppercase text-slate-400 border-b border-slate-800 pb-3">
                <th className="pb-3 font-semibold">Problem</th>
                <th className="pb-3 font-semibold">Verdict</th>
                <th className="pb-3 font-semibold">Time</th>
                <th className="pb-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              {stats.recent_submissions.map((sub) => (
                <tr key={sub.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 pr-4">
                    <Link
                      to={`/problems/${sub.problem_slug}`}
                      className="font-sans font-medium text-slate-200 hover:text-blue-400 text-sm"
                    >
                      {sub.problem_title}
                    </Link>
                  </td>
                  <td className="py-3.5 pr-4">
                    <VerdictBadge verdict={sub.verdict} />
                  </td>
                  <td className="py-3.5 pr-4 text-slate-400">{sub.submitted_at}</td>
                  <td className="py-3.5 text-right">
                    <Link
                      to={`/problems/${sub.problem_slug}`}
                      className="inline-flex items-center text-xs font-sans text-blue-400 hover:text-blue-300 font-medium"
                    >
                      Review <ArrowRight className="w-3 h-3 ml-1" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
