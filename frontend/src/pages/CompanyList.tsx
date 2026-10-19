import { useEffect, useState, type FC } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import type { Company } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Building2, ArrowRight, Layers } from 'lucide-react';

export const CompanyList: FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCompanies() {
      try {
        setLoading(true);
        const data = await api.fetchCompanies();
        setCompanies(data);
      } catch (err) {
        console.error('Failed to load companies:', err);
      } finally {
        setLoading(false);
      }
    }
    loadCompanies();
  }, []);

  if (loading) {
    return <LoadingSpinner message="Loading target company engineering tracks..." />;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-2">
          <Building2 className="w-3.5 h-3.5" /> Company Interview Prep
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Target Company Engineering Tracks
        </h1>
        <p className="text-slate-400 text-sm max-w-2xl mt-1">
          Low-level systems coding questions frequently asked at top semiconductor, hardware, and operating systems organizations.
        </p>
      </div>

      {/* Grid of Company Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {companies.map((c) => {
          const solvedPct = Math.round((c.solved_count / (c.problem_count || 1)) * 100);

          return (
            <Link
              key={c.slug}
              to={`/companies/${c.slug}`}
              className="bg-slate-900 border border-slate-800 hover:border-blue-500/50 rounded-xl p-6 flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/5 group"
            >
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-lg text-white group-hover:border-blue-500/50 group-hover:text-blue-400 transition-colors">
                    {c.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-semibold text-slate-300">
                      {c.solved_count} / {c.problem_count}
                    </span>
                    <span className="text-[10px] text-slate-500 block font-mono">Solved</span>
                  </div>
                </div>

                <div>
                  <h2 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">
                    {c.name}
                  </h2>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {c.description}
                  </p>
                </div>

                {/* Common Patterns */}
                <div className="space-y-2 pt-2 border-t border-slate-800/80">
                  <span className="text-[11px] font-semibold uppercase text-slate-500 tracking-wider flex items-center gap-1">
                    <Layers className="w-3 h-3" /> Core Patterns
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {c.common_patterns.map((pattern, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800"
                      >
                        {pattern}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Progress and Footer */}
              <div className="pt-6 mt-4 border-t border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Preparation Progress</span>
                  <span className="text-blue-400 font-bold">{solvedPct}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 rounded-full"
                    style={{ width: `${solvedPct}%` }}
                  />
                </div>

                <div className="flex items-center justify-end text-xs font-semibold text-blue-400 group-hover:text-blue-300 pt-1">
                  View Company Track <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
