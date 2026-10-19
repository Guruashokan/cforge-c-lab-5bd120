import { useEffect, useState, useCallback, type FC } from 'react';
import { useParams, Link } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { api } from '../services/api';
import type { AssessmentAttempt, Problem, TestResult } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { DifficultyBadge } from '../components/DifficultyBadge';
import {
  Timer,
  Play,
  Send,
  CheckCircle2,
  AlertOctagon,
  Award,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export const AssessmentTake: FC = () => {
  const { id } = useParams<{ id: string }>();

  const [attempt, setAttempt] = useState<AssessmentAttempt | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentProblemIdx, setCurrentProblemIdx] = useState(0);
  const [codes, setCodes] = useState<Record<number, string>>({});

  // Countdown timer
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(45 * 60);
  const [isFinished, setIsFinished] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [evaluationResults, setEvaluationResults] = useState<any>(null);

  // Per-problem run results
  const [problemOutputs, setProblemOutputs] = useState<Record<number, TestResult[]>>({});
  const [isRunningCase, setIsRunningCase] = useState(false);

  // Initialize assessment
  useEffect(() => {
    async function init() {
      if (!id) return;
      try {
        setLoading(true);
        const data = await api.startAssessment(Number(id));
        setAttempt(data);

        // Preload starter code
        const initialCodes: Record<number, string> = {};
        data.problems.forEach((p, idx) => {
          initialCodes[idx] = p.starter_code;
        });
        setCodes(initialCodes);
        setTimeLeftSeconds(45 * 60);
      } catch (err) {
        console.error('Failed to start assessment:', err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [id]);

  // Handle final submission
  const handleFinalSubmit = useCallback(async () => {
    if (!attempt || isFinished) return;
    try {
      setIsSubmitting(true);
      const res = await api.submitAssessment(attempt.id, codes);
      setAttempt(res);
      setEvaluationResults(res.results);
      setIsFinished(true);
    } catch (err) {
      console.error('Failed to submit assessment:', err);
    } finally {
      setIsSubmitting(false);
    }
  }, [attempt, codes, isFinished]);

  // Timer interval
  useEffect(() => {
    if (isFinished) return;
    const interval = setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleFinalSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isFinished, handleFinalSubmit]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleTestRunProblem = async () => {
    if (!currentProblem) return;
    try {
      setIsRunningCase(true);
      const res = await api.runCode(currentProblem.slug, codes[currentProblemIdx] || '');
      setProblemOutputs((prev) => ({
        ...prev,
        [currentProblemIdx]: res.test_results,
      }));
    } catch (err) {
      console.error(err);
    } finally {
      setIsRunningCase(false);
    }
  };

  if (loading || !attempt) {
    return <LoadingSpinner message="Locking exam environment and building sandbox container..." />;
  }

  // If assessment has been completed, show Results view
  if (isFinished) {
    return (
      <div className="max-w-4xl mx-auto p-6 sm:p-12 space-y-8 my-auto w-full">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
            <Award className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold text-white">Assessment Completed</h1>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              Your code has been benchmarked against official compiler constraints, memory limits, and hidden test suites.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg mx-auto">
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-[10px] uppercase font-mono text-slate-400 block">Score</span>
              <span className="text-2xl font-bold font-mono text-emerald-400">
                {attempt.score} / {attempt.max_score}
              </span>
            </div>
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-[10px] uppercase font-mono text-slate-400 block">Status</span>
              <span className="text-2xl font-bold font-mono text-blue-400 uppercase">Passed</span>
            </div>
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-[10px] uppercase font-mono text-slate-400 block">Questions</span>
              <span className="text-2xl font-bold font-mono text-white">
                {attempt.problems.length} / {attempt.problems.length}
              </span>
            </div>
          </div>

          {evaluationResults?.feedback && (
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-left max-w-xl mx-auto text-xs text-slate-300 font-mono">
              <span className="text-slate-400 block uppercase text-[10px] mb-1 font-bold">
                Automated Grader Feedback:
              </span>
              <p>{evaluationResults.feedback}</p>
            </div>
          )}

          <div className="pt-4 flex justify-center gap-4">
            <Link
              to="/assessments"
              className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors"
            >
              Back to Assessments
            </Link>
            <Link
              to="/analytics"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              View Analytics
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const currentProblem: Problem = attempt.problems[currentProblemIdx];
  const isTimeCritical = timeLeftSeconds < 300;

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      {/* Top Test Banner */}
      <div className="h-14 bg-slate-900 border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 font-mono text-xs">
            <span className="text-slate-400">Questions:</span>
            {attempt.problems.map((p, idx) => (
              <button
                key={p.id}
                onClick={() => setCurrentProblemIdx(idx)}
                className={`w-7 h-7 rounded text-xs font-bold transition-colors ${
                  currentProblemIdx === idx
                    ? 'bg-blue-600 text-white'
                    : codes[idx] !== p.starter_code
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {idx + 1}
              </button>
            ))}
          </div>
        </div>

        {/* Center Countdown Timer */}
        <div
          className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border font-mono font-bold text-sm ${
            isTimeCritical
              ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse'
              : 'bg-slate-800/80 text-white border-slate-700'
          }`}
        >
          <Timer className="w-4 h-4 text-blue-400" />
          <span>{formatTimer(timeLeftSeconds)}</span>
        </div>

        {/* Finish & Submit Button */}
        <div>
          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to finalize and submit all problems for scoring?')) {
                handleFinalSubmit();
              }
            }}
            disabled={isSubmitting}
            className="flex items-center space-x-1.5 px-4 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-md transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Finish & Submit Exam</span>
          </button>
        </div>
      </div>

      {/* Split-pane Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Pane: Question Description */}
        <div className="w-full lg:w-1/2 h-1/2 lg:h-full border-b lg:border-b-0 lg:border-r border-slate-800 overflow-y-auto bg-slate-950 p-6 space-y-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-blue-400 font-semibold">
              Problem {currentProblemIdx + 1} of {attempt.problems.length}
            </span>
            <DifficultyBadge difficulty={currentProblem.difficulty} />
          </div>

          <h2 className="text-xl font-bold text-white">{currentProblem.title}</h2>

          <div className="text-slate-300 text-xs sm:text-sm leading-relaxed whitespace-pre-line font-sans">
            {currentProblem.description}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 space-y-2 text-xs font-mono">
            <div>
              <span className="text-blue-400 font-bold block mb-0.5">Input Format:</span>
              <p className="text-slate-300 font-sans">{currentProblem.input_format}</p>
            </div>
            <div className="pt-2 border-t border-slate-800">
              <span className="text-emerald-400 font-bold block mb-0.5">Output Format:</span>
              <p className="text-slate-300 font-sans">{currentProblem.output_format}</p>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3 text-xs font-mono">
            <span className="text-slate-400 block mb-1">Constraints:</span>
            <p className="text-slate-300">{currentProblem.constraints}</p>
          </div>

          {currentProblem.examples && currentProblem.examples.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Example:</h4>
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs font-mono space-y-2">
                <div>
                  <span className="text-slate-400 block text-[10px]">Input:</span>
                  <pre className="text-slate-200">{currentProblem.examples[0].input}</pre>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Output:</span>
                  <pre className="text-emerald-400">{currentProblem.examples[0].output}</pre>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Pane: Monaco Editor & Quick Run */}
        <div className="w-full lg:w-1/2 h-1/2 lg:h-full flex flex-col bg-slate-900 overflow-hidden">
          <div className="h-10 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between text-xs font-mono text-slate-400 shrink-0">
            <span>solution_{currentProblemIdx + 1}.c</span>
            <span>C17 GCC</span>
          </div>

          <div className="flex-1 min-h-0 relative">
            <Editor
              height="100%"
              defaultLanguage="c"
              language="c"
              theme="vs-dark"
              value={codes[currentProblemIdx] || ''}
              onChange={(val) =>
                setCodes((prev) => ({
                  ...prev,
                  [currentProblemIdx]: val || '',
                }))
              }
              options={{
                fontSize: 14,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true,
              }}
            />
          </div>

          {/* Quick Test Results Drawer */}
          {problemOutputs[currentProblemIdx] && (
            <div className="h-36 bg-slate-950 border-t border-slate-800 p-3 overflow-y-auto text-xs font-mono space-y-2">
              <span className="text-slate-400 block font-bold text-[10px] uppercase">
                Sample Test Results:
              </span>
              {problemOutputs[currentProblemIdx].map((t) => (
                <div
                  key={t.test_case_index}
                  className="flex items-center justify-between p-2 bg-slate-900 rounded border border-slate-800"
                >
                  <div className="flex items-center space-x-2">
                    {t.status === 'passed' ? (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Passed
                      </span>
                    ) : (
                      <span className="text-rose-400 flex items-center gap-1">
                        <AlertOctagon className="w-3.5 h-3.5" /> Failed
                      </span>
                    )}
                    <span className="text-slate-400">{t.description || `Case ${t.test_case_index}`}</span>
                  </div>
                  <span className="text-slate-500">{t.time_ms}ms</span>
                </div>
              ))}
            </div>
          )}

          {/* Bottom Bar: Quick Run & Navigation */}
          <div className="h-14 bg-slate-900 border-t border-slate-800 px-4 flex items-center justify-between shrink-0">
            <button
              onClick={() => setCurrentProblemIdx((i) => Math.max(0, i - 1))}
              disabled={currentProblemIdx === 0}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>

            <button
              onClick={handleTestRunProblem}
              disabled={isRunningCase}
              className="flex items-center space-x-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg border border-slate-700 transition-colors"
            >
              <Play className="w-3.5 h-3.5 text-blue-400" />
              <span>{isRunningCase ? 'Evaluating...' : 'Test Sample Cases'}</span>
            </button>

            <button
              onClick={() => setCurrentProblemIdx((i) => Math.min(attempt.problems.length - 1, i + 1))}
              disabled={currentProblemIdx === attempt.problems.length - 1}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
