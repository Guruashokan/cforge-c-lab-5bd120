import { useEffect, useState, useCallback, type FC } from 'react';
import { useParams, Link } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { api } from '../services/api';
import type { Problem, RunResponse, SubmissionResponse, TestResult } from '../types';
import { DifficultyBadge } from '../components/DifficultyBadge';
import { VerdictBadge } from '../components/VerdictBadge';
import { LoadingSpinner } from '../components/LoadingSpinner';
import {
  Play,
  Send,
  RotateCcw,
  Lightbulb,
  BookOpen,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Bookmark,
  CheckCircle2,
  XCircle,
  Clock,
  Terminal,
  Settings2,
  FileCode,
  AlertTriangle,
} from 'lucide-react';

export const ProblemSolve: FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [problem, setProblem] = useState<Problem | null>(null);
  const [code, setCode] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Editor states
  const [fontSize, setFontSize] = useState<number>(14);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Hints and solutions
  const [hintModalOpen, setHintModalOpen] = useState(false);
  const [currentHintIndex, setCurrentHintIndex] = useState(0);
  const [currentHint, setCurrentHint] = useState<string>('');
  const [solutionModalOpen, setSolutionModalOpen] = useState(false);
  const [solutionData, setSolutionData] = useState<{
    explanation: string;
    solution_code: string;
    time_complexity: string;
    space_complexity: string;
  } | null>(null);

  // Execution states
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeBottomTab, setActiveBottomTab] = useState<'tests' | 'compiler' | 'history'>('tests');
  const [isBottomPanelCollapsed, setIsBottomPanelCollapsed] = useState(false);

  // Results
  const [runResult, setRunResult] = useState<RunResponse | null>(null);
  const [submissionResult, setSubmissionResult] = useState<SubmissionResponse | null>(null);
  const [history, setHistory] = useState<Array<{ type: 'run' | 'submit'; result: any; time: string }>>([]);

  useEffect(() => {
    async function loadProblem() {
      if (!slug) return;
      try {
        setLoading(true);
        const data = await api.fetchProblem(slug);
        setProblem(data);
        // Load saved code from localStorage or default starter code
        const savedCode = localStorage.getItem(`cforge_code_${slug}`);
        setCode(savedCode || data.starter_code);
      } catch (err) {
        console.error('Failed to load problem:', err);
      } finally {
        setLoading(false);
      }
    }
    loadProblem();
  }, [slug]);

  // Save code to localStorage on edit
  const handleCodeChange = (newCode: string | undefined) => {
    const val = newCode || '';
    setCode(val);
    if (slug) {
      localStorage.setItem(`cforge_code_${slug}`, val);
    }
  };

  const handleReset = () => {
    if (problem && window.confirm('Reset code to initial template? Any unsaved edits will be discarded.')) {
      setCode(problem.starter_code);
      if (slug) {
        localStorage.removeItem(`cforge_code_${slug}`);
      }
    }
  };

  const handleCopyExample = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleToggleBookmark = async () => {
    if (!problem) return;
    try {
      const res = await api.toggleBookmark('user_default', problem.id);
      setProblem((prev) => (prev ? { ...prev, is_bookmarked: res.is_bookmarked } : null));
    } catch (err) {
      console.error('Failed to toggle bookmark:', err);
    }
  };

  // Run Code
  const handleRun = useCallback(async () => {
    if (!slug || isRunning || isSubmitting) return;
    try {
      setIsRunning(true);
      setIsBottomPanelCollapsed(false);
      setActiveBottomTab('tests');
      const res = await api.runCode(slug, code);
      setRunResult(res);
      setSubmissionResult(null);
      setHistory((prev) => [
        { type: 'run', result: res, time: new Date().toLocaleTimeString() },
        ...prev,
      ]);
    } catch (err: any) {
      setRunResult({
        compiler_output: err.message || 'Run execution failed.',
        stderr_output: 'Execution error occurred.',
        test_results: [],
      });
      setActiveBottomTab('compiler');
    } finally {
      setIsRunning(false);
    }
  }, [slug, code, isRunning, isSubmitting]);

  // Submit Code
  const handleSubmit = useCallback(async () => {
    if (!slug || isRunning || isSubmitting) return;
    try {
      setIsSubmitting(true);
      setIsBottomPanelCollapsed(false);
      setActiveBottomTab('tests');
      const res = await api.submitCode(slug, code);
      setSubmissionResult(res);
      setRunResult(null);
      if (res.verdict === 'accepted' && problem) {
        setProblem((prev) => (prev ? { ...prev, is_solved: true } : null));
      }
      setHistory((prev) => [
        { type: 'submit', result: res, time: new Date().toLocaleTimeString() },
        ...prev,
      ]);
    } catch {
      setActiveBottomTab('compiler');
    } finally {
      setIsSubmitting(false);
    }
  }, [slug, code, isRunning, isSubmitting, problem]);

  // Keyboard shortcuts (Ctrl+Enter for Run, Ctrl+Shift+Enter for Submit)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (e.shiftKey) {
          handleSubmit();
        } else {
          handleRun();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRun, handleSubmit]);

  const handleOpenHint = async () => {
    if (!slug) return;
    try {
      const res = await api.fetchHint(slug, currentHintIndex + 1);
      setCurrentHint(res.hint);
      setHintModalOpen(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleNextHint = async () => {
    if (!slug || !problem) return;
    const nextIdx = (currentHintIndex + 1) % problem.hints.length;
    setCurrentHintIndex(nextIdx);
    const res = await api.fetchHint(slug, nextIdx + 1);
    setCurrentHint(res.hint);
  };

  const handleOpenSolution = async () => {
    if (!slug) return;
    try {
      const res = await api.fetchSolution(slug);
      setSolutionData(res);
      setSolutionModalOpen(true);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading || !problem) {
    return <LoadingSpinner message="Mounting GCC C17 workspace and loading problem..." />;
  }

  const activeTestResults: TestResult[] = submissionResult
    ? submissionResult.test_results
    : runResult
    ? runResult.test_results
    : [];

  const activeCompilerOutput = submissionResult
    ? submissionResult.compiler_output
    : runResult
    ? runResult.compiler_output
    : '';

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      {/* Top Header Bar */}
      <div className="h-12 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <Link
            to="/problems"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Back to Problem List"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-semibold text-white truncate max-w-xs md:max-w-md">
              {problem.id}. {problem.title}
            </span>
            <DifficultyBadge difficulty={problem.difficulty} size="sm" />
            {problem.is_solved && (
              <span className="flex items-center text-xs text-emerald-400 font-mono gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Solved
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Hint button */}
          <button
            onClick={handleOpenHint}
            className="flex items-center space-x-1.5 px-2.5 py-1 text-xs font-medium text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-md transition-colors"
          >
            <Lightbulb className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Hint</span>
          </button>

          {/* Solution button */}
          <button
            onClick={handleOpenSolution}
            className="flex items-center space-x-1.5 px-2.5 py-1 text-xs font-medium text-indigo-300 hover:text-white bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-md transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Editorial</span>
          </button>

          {/* Bookmark */}
          <button
            onClick={handleToggleBookmark}
            className={`p-1.5 rounded-md hover:bg-slate-800 transition-colors ${
              problem.is_bookmarked ? 'text-amber-400' : 'text-slate-400 hover:text-white'
            }`}
            title={problem.is_bookmarked ? 'Remove bookmark' : 'Bookmark problem'}
          >
            <Bookmark className="w-4 h-4" fill={problem.is_bookmarked ? 'currentColor' : 'none'} />
          </button>
        </div>
      </div>

      {/* Main Split-Pane Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Pane: Problem Description (Scrollable) */}
        <div className="w-full lg:w-1/2 h-1/2 lg:h-full border-b lg:border-b-0 lg:border-r border-slate-800 overflow-y-auto bg-slate-950 p-6 space-y-6">
          {/* Title & Metadata */}
          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {problem.title}
            </h1>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <DifficultyBadge difficulty={problem.difficulty} />
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                {problem.topic.name}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                Mode: {problem.execution_mode}
              </span>
            </div>
          </div>

          {/* Problem Description */}
          <div className="prose prose-invert max-w-none text-slate-300 text-sm leading-relaxed whitespace-pre-line font-sans">
            {problem.description}
          </div>

          {/* Input & Output Format */}
          <div className="space-y-3 bg-slate-900/60 border border-slate-800 rounded-lg p-4 text-xs font-mono">
            <div>
              <span className="text-blue-400 font-bold uppercase tracking-wider block mb-1">
                Input Format
              </span>
              <p className="text-slate-300 font-sans">{problem.input_format}</p>
            </div>
            <div className="pt-2 border-t border-slate-800">
              <span className="text-emerald-400 font-bold uppercase tracking-wider block mb-1">
                Output Format
              </span>
              <p className="text-slate-300 font-sans">{problem.output_format}</p>
            </div>
          </div>

          {/* Constraints */}
          <div className="space-y-2 bg-slate-900/40 border border-slate-800/80 rounded-lg p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Constraints & Requirements
            </h3>
            <p className="text-xs font-mono text-slate-300 bg-slate-950 p-2.5 rounded border border-slate-850">
              {problem.constraints}
            </p>
          </div>

          {/* Examples */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Examples</h3>
            {problem.examples.map((ex, idx) => (
              <div
                key={idx}
                className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3"
              >
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold text-slate-300">Example {idx + 1}</span>
                  <button
                    onClick={() => handleCopyExample(ex.input, idx)}
                    className="flex items-center gap-1 text-[11px] hover:text-slate-200 transition-colors"
                  >
                    {copiedIndex === idx ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Input</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="space-y-2 font-mono text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px] mb-1">Input:</span>
                    <pre className="bg-slate-950 p-2.5 rounded text-slate-200 overflow-x-auto border border-slate-800">
                      {ex.input}
                    </pre>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px] mb-1">Output:</span>
                    <pre className="bg-slate-950 p-2.5 rounded text-emerald-300 overflow-x-auto border border-slate-800">
                      {ex.output}
                    </pre>
                  </div>
                  {ex.explanation && (
                    <p className="font-sans text-xs text-slate-400 pt-1 border-t border-slate-800/80">
                      <strong className="text-slate-300">Explanation:</strong> {ex.explanation}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Company Tags */}
          {problem.companies && problem.companies.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <span className="text-xs uppercase text-slate-400 font-semibold tracking-wider">
                Target Companies
              </span>
              <div className="flex flex-wrap gap-2">
                {problem.companies.map((c) => (
                  <span
                    key={c.company_slug}
                    className="text-xs px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-slate-300"
                  >
                    {c.company_name} ({c.source_type})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Pane: Code Editor + Bottom Results Panel */}
        <div className="w-full lg:w-1/2 h-1/2 lg:h-full flex flex-col bg-slate-900 overflow-hidden">
          {/* Editor Header / Controls */}
          <div className="h-10 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-2 text-xs font-mono text-slate-300">
              <FileCode className="w-4 h-4 text-blue-400" />
              <span>solution.c</span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-400">C17 (GCC)</span>
            </div>

            <div className="flex items-center space-x-3">
              {/* Font Size Selector */}
              <div className="flex items-center space-x-1 text-xs text-slate-400">
                <Settings2 className="w-3.5 h-3.5" />
                <select
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  aria-label="Editor Font Size"
                  className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded px-1.5 py-0.5 focus:outline-none"
                >
                  <option value={12}>12px</option>
                  <option value={14}>14px</option>
                  <option value={16}>16px</option>
                  <option value={18}>18px</option>
                </select>
              </div>

              {/* Reset starter code */}
              <button
                onClick={handleReset}
                className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
                title="Reset to starter code"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Monaco Editor Container */}
          <div className="flex-1 min-h-0 relative">
            <Editor
              height="100%"
              defaultLanguage="c"
              language="c"
              theme="vs-dark"
              value={code}
              onChange={handleCodeChange}
              options={{
                fontSize: fontSize,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 4,
                lineNumbers: 'on',
                formatOnPaste: true,
                suggestOnTriggerCharacters: true,
                renderLineHighlight: 'all',
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Courier New', monospace",
              }}
            />
          </div>

          {/* Bottom Results Panel */}
          <div
            className={`border-t border-slate-800 bg-slate-950 flex flex-col transition-all duration-200 ${
              isBottomPanelCollapsed ? 'h-10' : 'h-64 sm:h-72'
            }`}
          >
            {/* Panel Header Tabs */}
            <div className="h-10 bg-slate-900 border-b border-slate-800 px-3 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => {
                    setActiveBottomTab('tests');
                    setIsBottomPanelCollapsed(false);
                  }}
                  className={`px-3 py-1 text-xs font-medium rounded-t-md transition-colors ${
                    activeBottomTab === 'tests'
                      ? 'bg-slate-950 text-blue-400 border-t-2 border-blue-500'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Test Cases {activeTestResults.length > 0 && `(${activeTestResults.length})`}
                </button>
                <button
                  onClick={() => {
                    setActiveBottomTab('compiler');
                    setIsBottomPanelCollapsed(false);
                  }}
                  className={`px-3 py-1 text-xs font-medium rounded-t-md transition-colors ${
                    activeBottomTab === 'compiler'
                      ? 'bg-slate-950 text-blue-400 border-t-2 border-blue-500'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Compiler Output
                </button>
                <button
                  onClick={() => {
                    setActiveBottomTab('history');
                    setIsBottomPanelCollapsed(false);
                  }}
                  className={`px-3 py-1 text-xs font-medium rounded-t-md transition-colors ${
                    activeBottomTab === 'history'
                      ? 'bg-slate-950 text-blue-400 border-t-2 border-blue-500'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  History ({history.length})
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsBottomPanelCollapsed(!isBottomPanelCollapsed)}
                  className="p-1 text-slate-400 hover:text-white rounded"
                  title={isBottomPanelCollapsed ? 'Expand panel' : 'Collapse panel'}
                >
                  {isBottomPanelCollapsed ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Panel Tab Content */}
            {!isBottomPanelCollapsed && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Submission Verdict Banner */}
                {submissionResult && (
                  <div
                    className={`p-3 rounded-lg border flex items-center justify-between ${
                      submissionResult.verdict === 'accepted'
                        ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                        : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <VerdictBadge verdict={submissionResult.verdict} size="md" />
                      <div className="text-xs font-mono">
                        Passed {submissionResult.passed_tests} / {submissionResult.total_tests} test cases
                      </div>
                    </div>
                    <div className="text-xs font-mono text-slate-400 flex items-center gap-3">
                      <span>Time: {submissionResult.execution_time_ms}ms</span>
                      <span>Memory: {submissionResult.memory_kb}KB</span>
                    </div>
                  </div>
                )}

                {/* TAB 1: Tests */}
                {activeBottomTab === 'tests' && (
                  <div>
                    {isRunning || isSubmitting ? (
                      <LoadingSpinner
                        message={
                          isRunning
                            ? 'Compiling and running sample test cases...'
                            : 'Running full automated evaluation test suite...'
                        }
                      />
                    ) : activeTestResults.length === 0 ? (
                      <div className="text-center py-8 text-xs text-slate-500">
                        Hit <strong className="text-slate-300">Run Code</strong> to test sample cases, or{' '}
                        <strong className="text-slate-300">Submit</strong> to run against all hidden test suites.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {activeTestResults.map((t) => (
                          <div
                            key={t.test_case_index}
                            className="bg-slate-900 border border-slate-800 rounded-lg p-3 space-y-2 text-xs font-mono"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                {t.status === 'passed' ? (
                                  <span className="flex items-center text-emerald-400 font-semibold gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Case {t.test_case_index}: Passed
                                  </span>
                                ) : (
                                  <span className="flex items-center text-rose-400 font-semibold gap-1">
                                    <XCircle className="w-3.5 h-3.5" /> Case {t.test_case_index}: Failed
                                  </span>
                                )}
                                {t.description && (
                                  <span className="text-slate-400 font-sans text-[11px]">
                                    — {t.description}
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {t.time_ms} ms
                              </span>
                            </div>

                            {!t.is_hidden && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                <div className="bg-slate-950 p-2 rounded border border-slate-800">
                                  <span className="text-[10px] text-slate-400 block uppercase">
                                    Expected Output
                                  </span>
                                  <pre className="text-emerald-400 overflow-x-auto text-[11px] mt-1">
                                    {t.expected_output}
                                  </pre>
                                </div>
                                <div className="bg-slate-950 p-2 rounded border border-slate-800">
                                  <span className="text-[10px] text-slate-400 block uppercase">
                                    Your Output
                                  </span>
                                  <pre
                                    className={`overflow-x-auto text-[11px] mt-1 ${
                                      t.status === 'passed' ? 'text-emerald-300' : 'text-rose-400'
                                    }`}
                                  >
                                    {t.actual_output || '<no output>'}
                                  </pre>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: Compiler Output */}
                {activeBottomTab === 'compiler' && (
                  <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs">
                    <div className="flex items-center space-x-2 text-slate-400 mb-2 pb-2 border-b border-slate-800">
                      <Terminal className="w-3.5 h-3.5 text-blue-400" />
                      <span>GCC Compilation Logs</span>
                    </div>
                    {activeCompilerOutput ? (
                      <pre className="text-slate-300 whitespace-pre-wrap leading-relaxed">
                        {activeCompilerOutput}
                      </pre>
                    ) : (
                      <p className="text-slate-500">No compiler diagnostics reported. Run code to build.</p>
                    )}
                  </div>
                )}

                {/* TAB 3: History */}
                {activeBottomTab === 'history' && (
                  <div className="space-y-2">
                    {history.length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-4">No submissions in this session yet.</p>
                    ) : (
                      history.map((h, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-2.5 bg-slate-900 border border-slate-800 rounded text-xs font-mono"
                        >
                          <div className="flex items-center space-x-2">
                            <span className="uppercase text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                              {h.type}
                            </span>
                            {h.result.verdict ? (
                              <VerdictBadge verdict={h.result.verdict} size="sm" />
                            ) : (
                              <span className="text-blue-400">Sample Execution</span>
                            )}
                          </div>
                          <span className="text-slate-500">{h.time}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom Action Buttons */}
          <div className="h-14 bg-slate-900 border-t border-slate-800 px-4 flex items-center justify-between shrink-0">
            <div className="text-[11px] text-slate-400 font-mono hidden sm:block">
              Shortcuts: <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">Ctrl+Enter</kbd> Run,{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">Ctrl+Shift+Enter</kbd> Submit
            </div>

            <div className="flex items-center space-x-3 ml-auto">
              <button
                onClick={handleRun}
                disabled={isRunning || isSubmitting}
                className="flex items-center space-x-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-colors"
              >
                <Play className="w-3.5 h-3.5 text-blue-400" />
                <span>{isRunning ? 'Running...' : 'Run Code'}</span>
              </button>

              <button
                onClick={handleSubmit}
                disabled={isRunning || isSubmitting}
                className="flex items-center space-x-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-md shadow-emerald-600/20 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Evaluating...' : 'Submit'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Hint Modal */}
      {hintModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm">
                <Lightbulb className="w-4 h-4" />
                <span>
                  Hint {currentHintIndex + 1} of {problem.hints.length}
                </span>
              </div>
              <button
                onClick={() => setHintModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Close
              </button>
            </div>
            <p className="text-sm text-slate-200 bg-slate-950 p-4 rounded-lg border border-slate-800 leading-relaxed font-sans">
              {currentHint}
            </p>
            <div className="flex justify-between items-center pt-2">
              <button
                onClick={handleNextHint}
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold"
              >
                Next Hint →
              </button>
              <button
                onClick={() => setHintModalOpen(false)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-medium rounded-lg text-slate-200"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Solution / Editorial Modal */}
      {solutionModalOpen && solutionData && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2 text-indigo-400 font-bold text-sm">
                <BookOpen className="w-4 h-4" />
                <span>Reference Implementation & Complexity Analysis</span>
              </div>
              <button
                onClick={() => setSolutionModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Close
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-950 p-3 rounded border border-slate-800">
                  <span className="text-slate-400 uppercase text-[10px] block font-bold">
                    Time Complexity
                  </span>
                  <span className="text-blue-400 font-mono text-sm">
                    {solutionData.time_complexity}
                  </span>
                </div>
                <div className="bg-slate-950 p-3 rounded border border-slate-800">
                  <span className="text-slate-400 uppercase text-[10px] block font-bold">
                    Space Complexity
                  </span>
                  <span className="text-purple-400 font-mono text-sm">
                    {solutionData.space_complexity}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-200 uppercase text-[11px] mb-1">
                  Architecture & Design
                </h4>
                <div className="text-slate-300 font-sans leading-relaxed whitespace-pre-line bg-slate-950 p-3 rounded border border-slate-800">
                  {solutionData.explanation}
                </div>
              </div>

              {problem.common_mistakes && problem.common_mistakes.length > 0 && (
                <div>
                  <h4 className="font-bold text-amber-400 uppercase text-[11px] mb-1 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Common Pitfalls
                  </h4>
                  <ul className="list-disc pl-5 space-y-1 text-slate-300 font-sans">
                    {problem.common_mistakes.map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSolutionModalOpen(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-xs font-semibold rounded-lg text-white"
              >
                Close Editorial
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
