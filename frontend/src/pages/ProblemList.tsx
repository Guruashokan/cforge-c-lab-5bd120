import { useEffect, useState, useMemo, type FC, type MouseEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import type { ProblemListItem, Topic, Company, Difficulty } from '../types';
import { DifficultyBadge } from '../components/DifficultyBadge';
import { SearchBar } from '../components/SearchBar';
import { LoadingSpinner } from '../components/LoadingSpinner';
import {
  CheckCircle2,
  Circle,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Filter,
  RotateCcw,
} from 'lucide-react';

export const ProblemList: FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [problems, setProblems] = useState<ProblemListItem[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states from URL or defaults
  const search = searchParams.get('search') || '';
  const selectedTopic = searchParams.get('topic') || 'all';
  const selectedDifficulty = searchParams.get('difficulty') || 'all';
  const selectedCompany = searchParams.get('company') || 'all';
  const selectedStatus = searchParams.get('status') || 'all';

  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    async function loadMeta() {
      try {
        const [tList, cList] = await Promise.all([
          api.fetchTopics(),
          api.fetchCompanies(),
        ]);
        setTopics(tList);
        setCompanies(cList);
      } catch (err) {
        console.error('Failed to load filters meta:', err);
      }
    }
    loadMeta();
  }, []);

  useEffect(() => {
    async function fetchList() {
      try {
        setLoading(true);
        const res = await api.fetchProblems({
          topic: selectedTopic !== 'all' ? selectedTopic : undefined,
          difficulty: selectedDifficulty !== 'all' ? selectedDifficulty : undefined,
          company: selectedCompany !== 'all' ? selectedCompany : undefined,
          status: (selectedStatus !== 'all' ? selectedStatus : undefined) as any,
          search: search || undefined,
        });
        setProblems(res.problems);
        setPage(1);
      } catch (err) {
        console.error('Failed to load problems:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchList();
  }, [search, selectedTopic, selectedDifficulty, selectedCompany, selectedStatus]);

  const updateParam = (key: string, value: string) => {
    const nextParams = new URLSearchParams(searchParams);
    if (!value || value === 'all') {
      nextParams.delete(key);
    } else {
      nextParams.set(key, value);
    }
    setSearchParams(nextParams);
  };

  const handleToggleBookmark = async (e: MouseEvent, problemId: number) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await api.toggleBookmark('user_default', problemId);
      setProblems((prev) =>
        prev.map((p) => (p.id === problemId ? { ...p, is_bookmarked: res.is_bookmarked } : p))
      );
    } catch (err) {
      console.error('Failed to toggle bookmark:', err);
    }
  };

  const resetFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  const paginatedProblems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return problems.slice(start, start + pageSize);
  }, [problems, page]);

  const totalPages = Math.ceil(problems.length / pageSize) || 1;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Practice Problems</h1>
          <p className="text-sm text-slate-400">
            Comprehensive C systems programming challenges curated for top hardware & OS teams.
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs font-mono text-slate-400">
          <span className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
            Total Problems: <strong className="text-white">{problems.length}</strong>
          </span>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <SearchBar
            value={search}
            onChange={(val) => updateParam('search', val)}
            placeholder="Search problems by title, keywords..."
            className="flex-1"
          />

          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => updateParam('status', e.target.value)}
              aria-label="Filter by Status"
              className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="solved">Solved</option>
              <option value="unsolved">Unsolved</option>
            </select>

            {/* Difficulty Filter */}
            <select
              value={selectedDifficulty}
              onChange={(e) => updateParam('difficulty', e.target.value)}
              aria-label="Filter by Difficulty"
              className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Difficulties</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
              <option value="very_hard">Very Hard</option>
            </select>

            {/* Topic Filter */}
            <select
              value={selectedTopic}
              onChange={(e) => updateParam('topic', e.target.value)}
              aria-label="Filter by Topic"
              className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Topics</option>
              {topics.map((t) => (
                <option key={t.slug} value={t.slug}>
                  {t.name}
                </option>
              ))}
            </select>

            {/* Company Filter */}
            <select
              value={selectedCompany}
              onChange={(e) => updateParam('company', e.target.value)}
              aria-label="Filter by Company"
              className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Companies</option>
              {companies.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Reset Filters */}
            {(search || selectedTopic !== 'all' || selectedDifficulty !== 'all' || selectedCompany !== 'all' || selectedStatus !== 'all') && (
              <button
                onClick={resetFilters}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
                title="Reset all filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Problems Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-16">
            <LoadingSpinner message="Fetching problem repository..." />
          </div>
        ) : problems.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Filter className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-base font-semibold text-slate-300">No problems found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Try adjusting your search criteria, topic filters, or difficulty selection.
            </p>
            <button
              onClick={resetFilters}
              className="mt-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-blue-400 text-xs rounded-lg font-medium transition-colors"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="py-3.5 pl-4 pr-2 w-12 text-center">Status</th>
                  <th className="py-3.5 px-4 font-semibold">Title</th>
                  <th className="py-3.5 px-4 font-semibold">Topic</th>
                  <th className="py-3.5 px-4 font-semibold">Difficulty</th>
                  <th className="py-3.5 px-4 font-semibold">Acceptance</th>
                  <th className="py-3.5 px-4 font-semibold">Companies</th>
                  <th className="py-3.5 pr-4 pl-2 w-12 text-center">Save</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {paginatedProblems.map((problem) => (
                  <tr
                    key={problem.id}
                    className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                  >
                    {/* Status */}
                    <td className="py-3.5 pl-4 pr-2 text-center">
                      {problem.is_solved ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-600 mx-auto" />
                      )}
                    </td>

                    {/* Title */}
                    <td className="py-3.5 px-4">
                      <Link
                        to={`/problems/${problem.slug}`}
                        className="font-medium text-slate-200 group-hover:text-blue-400 transition-colors"
                      >
                        {problem.title}
                      </Link>
                    </td>

                    {/* Topic */}
                    <td className="py-3.5 px-4">
                      <span className="text-xs text-slate-400 font-mono">
                        {problem.topic_name}
                      </span>
                    </td>

                    {/* Difficulty */}
                    <td className="py-3.5 px-4">
                      <DifficultyBadge difficulty={problem.difficulty as Difficulty} />
                    </td>

                    {/* Acceptance */}
                    <td className="py-3.5 px-4 text-xs font-mono text-slate-400">
                      {problem.acceptance_rate}%
                    </td>

                    {/* Companies */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1.5">
                        {problem.company_slugs.slice(0, 3).map((slug) => (
                          <span
                            key={slug}
                            className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700"
                          >
                            {slug}
                          </span>
                        ))}
                        {problem.company_slugs.length > 3 && (
                          <span className="text-[10px] text-slate-500 font-mono">
                            +{problem.company_slugs.length - 3}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Bookmark */}
                    <td className="py-3.5 pr-4 pl-2 text-center">
                      <button
                        onClick={(e) => handleToggleBookmark(e, problem.id)}
                        className={`p-1.5 rounded-md hover:bg-slate-800 transition-colors ${
                          problem.is_bookmarked
                            ? 'text-amber-400 hover:text-amber-300'
                            : 'text-slate-600 hover:text-slate-400'
                        }`}
                        title={problem.is_bookmarked ? 'Remove bookmark' : 'Bookmark problem'}
                      >
                        <Bookmark
                          className="w-4 h-4"
                          fill={problem.is_bookmarked ? 'currentColor' : 'none'}
                        />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination controls */}
        {!loading && totalPages > 1 && (
          <div className="px-4 py-3 bg-slate-950/40 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
            <div>
              Showing {(page - 1) * pageSize + 1} to{' '}
              {Math.min(page * pageSize, problems.length)} of {problems.length} problems
            </div>
            <div className="flex items-center space-x-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2">
                Page {page} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
