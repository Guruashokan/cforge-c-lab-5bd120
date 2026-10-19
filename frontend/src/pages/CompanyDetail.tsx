import { useEffect, useState, type FC } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import type { Company, ProblemListItem, Assessment } from '../types';
import { DifficultyBadge } from '../components/DifficultyBadge';
import { LoadingSpinner } from '../components/LoadingSpinner';
import {
  ArrowLeft,
  Layers,
  Award,
  CheckCircle2,
  Circle,
  Timer,
  Play,
  ArrowRight,
} from 'lucide-react';

export const CompanyDetail: FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [company, setCompany] = useState<Company | null>(null);
  const [problems, setProblems] = useState<ProblemListItem[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCompanyData() {
      if (!slug) return;
      try {
        setLoading(true);
        const data = await api.fetchCompany(slug);
        setCompany(data.company);
        setProblems(data.problems);
        setAssessments(data.assessments);
      } catch (err) {
        console.error('Failed to load company detail:', err);
      } finally {
        setLoading(false);
      }
    }
    loadCompanyData();
  }, [slug]);

  if (loading || !company) {
    return <LoadingSpinner message="Loading company curriculum and mock assessments..." />;
  }

  const solvedPct = Math.round((company.solved_count / (company.problem_count || 1)) * 100);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* Header with Back button */}
      <div className="space-y-4">
        <Link
          to="/companies"
          className="inline-flex items-center text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to All Companies
        </Link>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start space-x-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-extrabold text-2xl flex items-center justify-center shadow-lg shadow-blue-500/10 shrink-0">
              {company.name.substring(0, 2).toUpperCase()}
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{company.name}</h1>
              <p className="text-sm text-slate-300 max-w-xl leading-relaxed">
                {company.description}
              </p>
              <div className="flex items-center gap-4 text-xs font-mono text-slate-400 pt-1">
                <span>Total Questions: <strong className="text-white">{company.problem_count}</strong></span>
                <span>Solved: <strong className="text-emerald-400">{company.solved_count}</strong></span>
                <span>Mastery: <strong className="text-blue-400">{solvedPct}%</strong></span>
              </div>
            </div>
          </div>

          <div className="w-full md:w-64 space-y-2 bg-slate-950 p-4 rounded-xl border border-slate-800 shrink-0">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-400">Readiness</span>
              <span className="text-blue-400 font-bold">{solvedPct}%</span>
            </div>
            <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 rounded-full"
                style={{ width: `${solvedPct}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500 text-center font-mono">
              Recommended: 70%+ before technical phone screen
            </p>
          </div>
        </div>
      </div>

      {/* Common Technical Patterns */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-400" />
          High-Frequency System Patterns
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {company.common_patterns.map((p, idx) => (
            <div
              key={idx}
              className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 flex items-center space-x-2"
            >
              <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
              <span>{p}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Available Company Mocks */}
      {assessments.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            Official {company.name} Mock Interviews
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assessments.map((a) => (
              <div
                key={a.id}
                className="p-5 bg-gradient-to-r from-slate-900 to-slate-900/80 border border-amber-500/20 rounded-xl flex items-center justify-between"
              >
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">
                    TIMED ASSESSMENT
                  </span>
                  <h3 className="text-base font-bold text-white">{a.title}</h3>
                  <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                    <span className="flex items-center gap-1">
                      <Timer className="w-3.5 h-3.5" /> {a.duration_minutes} Minutes
                    </span>
                    <span>• {a.question_count} Questions</span>
                  </div>
                </div>

                <Link
                  to={`/assessments/${a.id}/take`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-colors shrink-0"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Start Mock
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Questions list for company */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Interview Questions</h2>
          <span className="text-xs font-mono text-slate-400">{problems.length} Problems</span>
        </div>

        <div className="divide-y divide-slate-800/80">
          {problems.map((p) => (
            <div
              key={p.id}
              className="py-4 flex items-center justify-between hover:bg-slate-800/30 px-3 rounded-lg transition-colors"
            >
              <div className="flex items-center space-x-3">
                {p.is_solved ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-slate-600 shrink-0" />
                )}
                <div>
                  <Link
                    to={`/problems/${p.slug}`}
                    className="font-medium text-slate-200 hover:text-blue-400 text-sm transition-colors"
                  >
                    {p.title}
                  </Link>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">{p.topic_name}</p>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <span className="text-xs font-mono text-slate-400 hidden sm:inline">
                  Acceptance: {p.acceptance_rate}%
                </span>
                <DifficultyBadge difficulty={p.difficulty} size="sm" />
                <Link
                  to={`/problems/${p.slug}`}
                  className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center"
                >
                  Solve <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
