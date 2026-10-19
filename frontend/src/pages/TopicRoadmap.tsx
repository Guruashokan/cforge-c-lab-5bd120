import { useEffect, useState, type FC } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import type { RoadmapItem } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { DifficultyBadge } from '../components/DifficultyBadge';
import {
  CheckCircle2,
  Lock,
  Unlock,
  ArrowDown,
  ChevronRight,
  BookOpen,
  Code2,
  Compass,
} from 'lucide-react';

export const TopicRoadmap: FC = () => {
  const [roadmap, setRoadmap] = useState<RoadmapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTopicSlug, setSelectedTopicSlug] = useState<string | null>(null);

  useEffect(() => {
    async function loadRoadmap() {
      try {
        setLoading(true);
        const data = await api.fetchRoadmap();
        setRoadmap(data);
        if (data.length > 0) {
          setSelectedTopicSlug(data[0].topic.slug);
        }
      } catch (err) {
        console.error('Failed to load roadmap:', err);
      } finally {
        setLoading(false);
      }
    }
    loadRoadmap();
  }, []);

  if (loading) {
    return <LoadingSpinner message="Constructing C systems mastery roadmap..." />;
  }

  const selectedItem = roadmap.find((r) => r.topic.slug === selectedTopicSlug) || roadmap[0];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-2">
          <Compass className="w-3.5 h-3.5" /> Structured Learning Pathway
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          C Systems Engineering Roadmap
        </h1>
        <p className="text-slate-400 text-sm max-w-2xl mt-1">
          A sequential curriculum designed to build deep intuition for memory, pointer semantics,
          cache lines, and concurrency in modern C.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Visual Pathway (7 cols) */}
        <div className="lg:col-span-7 space-y-4 relative">
          {roadmap.map((item, index) => {
            const isCompleted = item.topic.solved_count >= item.topic.problem_count && item.topic.problem_count > 0;
            const isInProgress = item.topic.solved_count > 0 && !isCompleted;
            const isSelected = selectedTopicSlug === item.topic.slug;
            const pct = Math.round((item.topic.solved_count / (item.topic.problem_count || 1)) * 100);

            return (
              <div key={item.topic.slug}>
                {/* Node Card */}
                <div
                  onClick={() => setSelectedTopicSlug(item.topic.slug)}
                  className={`relative p-5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 border-blue-500 shadow-lg shadow-blue-500/10 ring-1 ring-blue-500'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start space-x-4">
                      {/* Status Icon */}
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                          isCompleted
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : isInProgress
                            ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                            : 'bg-slate-800 border-slate-700 text-slate-400'
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : item.is_unlocked ? (
                          <Unlock className="w-5 h-5" />
                        ) : (
                          <Lock className="w-5 h-5" />
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-mono text-slate-400">
                            Module {index + 1}
                          </span>
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                              isCompleted
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : isInProgress
                                ? 'bg-blue-500/20 text-blue-300'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {isCompleted ? 'COMPLETED' : isInProgress ? 'IN PROGRESS' : 'READY'}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-white tracking-tight">
                          {item.topic.name}
                        </h3>
                        <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                          {item.topic.description}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-mono font-bold text-slate-300">
                        {item.topic.solved_count}/{item.topic.problem_count}
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">Solved</span>
                    </div>
                  </div>

                  {/* Prerequisites */}
                  {item.prerequisites && item.prerequisites.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
                      <span className="text-[11px] font-mono text-slate-500">Prereq:</span>
                      {item.prerequisites.map((p) => (
                        <span
                          key={p}
                          className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] text-slate-300 font-mono"
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Mini Progress Bar */}
                  <div className="mt-3 h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isCompleted ? 'bg-emerald-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Connecting arrow if not last */}
                {index < roadmap.length - 1 && (
                  <div className="flex justify-center my-1 text-slate-600">
                    <ArrowDown className="w-5 h-5 animate-bounce" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right Column: Selected Topic Detail & Problems (5 cols) */}
        <div className="lg:col-span-5 sticky top-24 space-y-6">
          {selectedItem && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-blue-400 font-semibold block mb-1">
                  Topic Spotlight
                </span>
                <h2 className="text-xl font-bold text-white">{selectedItem.topic.name}</h2>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  {selectedItem.topic.description}
                </p>
              </div>

              {/* Progress summary card */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Mastery</span>
                  <span className="text-base font-bold text-blue-400 font-mono">
                    {Math.round(
                      (selectedItem.topic.solved_count / (selectedItem.topic.problem_count || 1)) *
                        100
                    )}
                    %
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Completed</span>
                  <span className="text-base font-bold text-emerald-400 font-mono">
                    {selectedItem.topic.solved_count} / {selectedItem.topic.problem_count}
                  </span>
                </div>
              </div>

              {/* Problem List for Topic */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300 uppercase tracking-wider">
                    Curated Exercises ({selectedItem.problems.length})
                  </span>
                  <Link
                    to={`/problems?topic=${selectedItem.topic.slug}`}
                    className="text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
                  >
                    View All in Table <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {selectedItem.problems.map((p) => (
                    <Link
                      key={p.id}
                      to={`/problems/${p.slug}`}
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-950/70 hover:bg-slate-800/80 border border-slate-800/80 transition-colors group"
                    >
                      <div className="space-y-1 min-w-0 pr-3">
                        <div className="flex items-center space-x-2">
                          {p.is_solved ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          ) : (
                            <Code2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          )}
                          <span className="text-xs font-medium text-slate-200 group-hover:text-blue-400 truncate">
                            {p.title}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center space-x-2">
                        <DifficultyBadge difficulty={p.difficulty} size="sm" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <Link
                  to={`/problems?topic=${selectedItem.topic.slug}`}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg text-xs transition-colors"
                >
                  <BookOpen className="w-4 h-4" />
                  Practice All {selectedItem.topic.name} Problems
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
