import { useEffect, useState, type FC } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import type { Assessment } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';
import {
  Award,
  Timer,
  Play,
  HelpCircle,
  Building2,
} from 'lucide-react';

export const Assessments: FC = () => {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'timed' | 'practice' | 'company_mock'>('all');

  useEffect(() => {
    async function loadAssessments() {
      try {
        setLoading(true);
        const data = await api.fetchAssessments();
        setAssessments(data);
      } catch (err) {
        console.error('Failed to load assessments:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAssessments();
  }, []);

  if (loading) {
    return <LoadingSpinner message="Loading timed assessments and diagnostic challenges..." />;
  }

  const filtered = filterType === 'all'
    ? assessments
    : assessments.filter((a) => a.type === filterType);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-2">
          <Award className="w-3.5 h-3.5" /> High-Stakes Assessments
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Timed Systems Programming Assessments
        </h1>
        <p className="text-slate-400 text-sm max-w-2xl mt-1">
          Test your skills under realistic time limits without hints or external aids. Simulates official technical screen environments.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
        {(['all', 'company_mock', 'timed', 'practice'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize transition-colors ${
              filterType === type
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            {type === 'company_mock' ? 'Company Mocks' : type === 'timed' ? 'Timed Sprints' : type === 'practice' ? 'Practice' : 'All Assessments'}
          </button>
        ))}
      </div>

      {/* Assessments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filtered.map((assessment) => (
          <div
            key={assessment.id}
            className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-6 flex flex-col justify-between space-y-5 transition-all shadow-sm"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                    assessment.type === 'company_mock'
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      : assessment.type === 'timed'
                      ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                  }`}
                >
                  {assessment.type.replace('_', ' ')}
                </span>
                {assessment.company_name && (
                  <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-slate-500" />
                    {assessment.company_name}
                  </span>
                )}
              </div>

              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">
                  {assessment.title}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Covers critical concepts under strict memory and time boundaries.
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono text-slate-400 pt-2 border-t border-slate-800/80">
                <div className="flex items-center gap-1.5">
                  <Timer className="w-4 h-4 text-blue-400" />
                  <span>{assessment.duration_minutes} Minutes</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-emerald-400" />
                  <span>{assessment.question_count} Questions</span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Link
                to={`/assessments/${assessment.id}/take`}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs transition-colors shadow-md shadow-blue-600/20"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Start Assessment
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
