import { useEffect, useState, type FC } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import type { ProblemListItem, Difficulty } from '../types';
import { DifficultyBadge } from '../components/DifficultyBadge';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Bookmark, CheckCircle2, Circle, Trash2, ArrowRight } from 'lucide-react';

export const Bookmarks: FC = () => {
  const [bookmarks, setBookmarks] = useState<ProblemListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBookmarks() {
      try {
        setLoading(true);
        const data = await api.fetchBookmarks();
        setBookmarks(data);
      } catch (err) {
        console.error('Failed to load bookmarks:', err);
      } finally {
        setLoading(false);
      }
    }
    loadBookmarks();
  }, []);

  const handleRemove = async (problemId: number) => {
    try {
      await api.toggleBookmark('user_default', problemId);
      setBookmarks((prev) => prev.filter((p) => p.id !== problemId));
    } catch (err) {
      console.error('Failed to remove bookmark:', err);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Retrieving your bookmarked problems..." />;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold mb-2">
            <Bookmark className="w-3.5 h-3.5 fill-current" /> Saved for Review
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Bookmarked Problems</h1>
          <p className="text-sm text-slate-400">
            Problems saved for focused practice, revision, or mock rehearsal.
          </p>
        </div>
        <div className="text-xs font-mono text-slate-400">
          <span className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
            Saved: <strong className="text-white">{bookmarks.length}</strong>
          </span>
        </div>
      </div>

      {/* Bookmarks Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {bookmarks.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Bookmark className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-base font-semibold text-slate-300">No bookmarked problems</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Save challenging problems from the practice arena to review them here later.
            </p>
            <Link
              to="/problems"
              className="inline-flex items-center gap-2 mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-lg font-medium transition-colors"
            >
              Browse Problems <ArrowRight className="w-3.5 h-3.5" />
            </Link>
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
                  <th className="py-3.5 px-4 font-semibold">Target Companies</th>
                  <th className="py-3.5 pr-4 pl-2 w-12 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {bookmarks.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                  >
                    <td className="py-3.5 pl-4 pr-2 text-center">
                      {p.is_solved ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-600 mx-auto" />
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <Link
                        to={`/problems/${p.slug}`}
                        className="font-medium text-slate-200 group-hover:text-blue-400 transition-colors"
                      >
                        {p.title}
                      </Link>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="text-xs text-slate-400 font-mono">{p.topic_name}</span>
                    </td>

                    <td className="py-3.5 px-4">
                      <DifficultyBadge difficulty={p.difficulty as Difficulty} />
                    </td>

                    <td className="py-3.5 px-4 text-xs font-mono text-slate-400">
                      {p.acceptance_rate}%
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1.5">
                        {p.company_slugs.map((slug) => (
                          <span
                            key={slug}
                            className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700"
                          >
                            {slug}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="py-3.5 pr-4 pl-2 text-center">
                      <button
                        onClick={() => handleRemove(p.id)}
                        className="p-1.5 rounded-md text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                        title="Remove from bookmarks"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
