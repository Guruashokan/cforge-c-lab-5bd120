import { useEffect, useState, useCallback, useRef, type FC } from 'react';
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
  ArrowLeft,
  Bookmark,
  CheckCircle2,
  XCircle,
  Terminal,
  Settings2,
  FileCode,
  AlertTriangle,
  Maximize2,
  Minimize2,
  Code2,
  FileText,
  Activity,
  Cpu,
  Building2,
  Loader2,
  Code,
} from 'lucide-react';

export const ProblemSolve: FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [problem, setProblem] = useState<Problem | null>(null);
  const [code, setCode] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Editor states
  const [fontSize, setFontSize] = useState<number>(14);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [editorMode, setEditorMode] = useState<'monaco' | 'direct'>('monaco');
  const editorRef = useRef<any>(null);

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

  // Execution & Layout states
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeBottomTab, setActiveBottomTab] = useState<'tests' | 'compiler' | 'history'>('tests');
  const [isBottomPanelOpen, setIsBottomPanelOpen] = useState(false);
  const [isBottomPanelExpanded, setIsBottomPanelExpanded] = useState(false);
  const [isEditorMaximized, setIsEditorMaximized] = useState(false);

  // Responsive Mobile/Tablet Tabs: 'problem' | 'code' | 'results'
  const [mobileTab, setMobileTab] = useState<'problem' | 'code' | 'results'>('code');

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
        const savedCode = localStorage.getItem(`cforge_code_${slug}`);
        if (savedCode && savedCode.trim().length > 0) {
          setCode(savedCode);
        } else {
          setCode(data.starter_code);
        }
      } catch (err) {
        console.error('Failed to load problem:', err);
      } finally {
        setLoading(false);
      }
    }
    loadProblem();
  }, [slug]);

  // Re-layout editor when tab or maximization changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.layout();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [mobileTab, isEditorMaximized, isBottomPanelOpen, isBottomPanelExpanded]);

  const handleCodeChange = (newCode: string | undefined) => {
    const val = newCode !== undefined ? newCode : '';
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
      if (editorRef.current) {
        editorRef.current.setValue(problem.starter_code);
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
      setIsBottomPanelOpen(true);
      setActiveBottomTab('tests');
      if (window.innerWidth < 1024) {
        setMobileTab('results');
      }
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
      setIsBottomPanelOpen(true);
      setActiveBottomTab('tests');
      if (window.innerWidth < 1024) {
        setMobileTab('results');
      }
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
    try {
      const res = await api.fetchHint(slug, nextIdx + 1);
      setCurrentHint(res.hint);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenSolution = async () => {
    if (!slug) return;
    try {
      const data = await api.fetchSolution(slug);
      setSolutionData(data);
      setSolutionModalOpen(true);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-950">
        <LoadingSpinner message="Initializing GCC C17 execution environment & sandbox..." />
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-950 text-center">
        <h2 className="text-xl font-bold text-white mb-2">Problem Not Found</h2>
        <p className="text-slate-400 mb-4 text-sm">
          The requested C programming lab challenge does not exist or has been relocated.
        </p>
        <Link
          to="/problems"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Return to Problem Catalog
        </Link>
      </div>
    );
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
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-slate-950">
      {/* Top Header Bar */}
      <div className="h-12 bg-slate-900 border-b border-slate-800 px-3 sm:px-4 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
          <Link
            to="/problems"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
            title="Back to Problem List"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center space-x-2 min-w-0">
            <span className="text-xs sm:text-sm font-semibold text-white truncate max-w-[140px] sm:max-w-xs md:max-w-md">
              {problem.id}. {problem.title}
            </span>
            <DifficultyBadge difficulty={problem.difficulty} size="sm" />
            {problem.is_solved && (
              <span className="hidden sm:flex items-center text-xs text-emerald-400 font-mono gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Solved
              </span>
            )}
          </div>
        </div>

        {/* Mobile Segmented Tab Navigation for screen < lg */}
        <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800 lg:hidden">
          <button
            onClick={() => setMobileTab('problem')}
            className={`flex items-center space-x-1 px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
              mobileTab === 'problem'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3 h-3" />
            <span>Problem</span>
          </button>
          <button
            onClick={() => setMobileTab('code')}
            className={`flex items-center space-x-1 px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
              mobileTab === 'code'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code2 className="w-3 h-3" />
            <span>Code</span>
          </button>
          <button
            onClick={() => setMobileTab('results')}
            className={`flex items-center space-x-1 px-2.5 py-1 text-xs rounded-lg font-medium transition-all relative ${
              mobileTab === 'results'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3 h-3" />
            <span>Results</span>
            {activeTestResults.length > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            )}
          </button>
        </div>

        {/* Top Right Action Tools */}
        <div className="flex items-center space-x-1.5 sm:space-x-2">
          {/* Hint button */}
          <button
            onClick={handleOpenHint}
            className="flex items-center space-x-1 px-2 sm:px-2.5 py-1 text-xs font-medium text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg transition-colors"
          >
            <Lightbulb className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Hint</span>
          </button>

          {/* Solution / Editorial button */}
          <button
            onClick={handleOpenSolution}
            className="flex items-center space-x-1 px-2 sm:px-2.5 py-1 text-xs font-medium text-indigo-300 hover:text-white bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-lg transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Editorial</span>
          </button>

          {/* Bookmark */}
          <button
            onClick={handleToggleBookmark}
            className={`p-1.5 rounded-lg hover:bg-slate-800 transition-colors ${
              problem.is_bookmarked ? 'text-amber-400' : 'text-slate-400 hover:text-white'
            }`}
            title={problem.is_bookmarked ? 'Remove bookmark' : 'Bookmark problem'}
          >
            <Bookmark className="w-4 h-4" fill={problem.is_bookmarked ? 'currentColor' : 'none'} />
          </button>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Left Pane: Problem Description */}
        <div
          className={`border-b lg:border-b-0 lg:border-r border-slate-800 overflow-y-auto bg-slate-950 p-4 sm:p-6 space-y-6 ${
            isEditorMaximized
              ? 'hidden'
              : 'lg:flex lg:flex-col lg:w-1/2 lg:h-full ' + (mobileTab === 'problem' ? 'flex flex-col w-full h-full' : 'hidden')
          }`}
        >
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
              {problem.companies && problem.companies.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
                  <Building2 className="w-3 h-3" />
                  <span>
                    Asked in: {problem.companies.slice(0, 3).map((c) => c.company_name).join(', ')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Problem Description */}
          <div className="prose prose-invert max-w-none text-slate-300 text-sm leading-relaxed whitespace-pre-line font-sans">
            {problem.description}
          </div>

          {/* Input & Output Format */}
          <div className="space-y-3 bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-xs font-mono">
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
          <div className="space-y-2 bg-slate-900/40 border border-slate-800/80 rounded-xl p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5 text-blue-400" />
              Constraints & Memory Limits
            </h3>
            <p className="text-xs font-mono text-slate-300 bg-slate-950 p-2.5 rounded-lg border border-slate-850">
              {problem.constraints}
            </p>
          </div>

          {/* Examples */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Examples</h3>
            {problem.examples.map((ex, idx) => (
              <div
                key={idx}
                className="bg-slate-900/70 border border-slate-800 rounded-xl overflow-hidden text-xs font-mono"
              >
                <div className="bg-slate-800/50 px-3.5 py-1.5 flex items-center justify-between text-slate-400 border-b border-slate-800">
                  <span className="font-semibold text-slate-300">Example {idx + 1}</span>
                  <button
                    onClick={() => handleCopyExample(ex.input, idx)}
                    className="flex items-center space-x-1 text-[11px] text-slate-400 hover:text-white"
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
                <div className="p-3.5 space-y-2.5">
                  <div>
                    <span className="text-slate-500 uppercase text-[10px] block font-bold mb-0.5">
                      Input
                    </span>
                    <pre className="bg-slate-950 p-2 rounded border border-slate-850 text-slate-200 overflow-x-auto whitespace-pre-wrap">
                      {ex.input}
                    </pre>
                  </div>
                  <div>
                    <span className="text-slate-500 uppercase text-[10px] block font-bold mb-0.5">
                      Expected Output
                    </span>
                    <pre className="bg-slate-950 p-2 rounded border border-slate-850 text-emerald-300 overflow-x-auto whitespace-pre-wrap">
                      {ex.output}
                    </pre>
                  </div>
                  {ex.explanation && (
                    <div className="pt-1">
                      <span className="text-slate-500 uppercase text-[10px] block font-bold mb-0.5">
                        Explanation
                      </span>
                      <p className="text-slate-400 font-sans text-xs">{ex.explanation}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Quick switch to code on mobile */}
          <div className="pt-2 pb-6 lg:hidden">
            <button
              onClick={() => setMobileTab('code')}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
            >
              <Code2 className="w-4 h-4" />
              <span>Open C Code Editor</span>
            </button>
          </div>
        </div>

        {/* Right Pane: Code Editor + Bottom Results Panel */}
        <div
          className={`flex flex-col bg-slate-900 overflow-hidden ${
            isEditorMaximized
              ? 'w-full h-full'
              : 'lg:flex lg:flex-col lg:w-1/2 lg:h-full ' + (mobileTab === 'code' ? 'flex flex-col w-full h-full' : 'hidden')
          }`}
        >
          {/* Editor Header / Controls */}
          <div className="h-10 bg-slate-900 border-b border-slate-800 px-3 sm:px-4 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-2 text-xs font-mono text-slate-300">
              <FileCode className="w-4 h-4 text-blue-400" />
              <span>solution.c</span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400 hidden sm:inline">C17 (GCC 13.2)</span>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-3">
              {/* Editor Engine Toggle: Monaco vs Direct */}
              <button
                onClick={() => setEditorMode(editorMode === 'monaco' ? 'direct' : 'monaco')}
                className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-800 hover:bg-slate-700 text-blue-300 border border-slate-700 transition-colors flex items-center gap-1"
                title="Switch between Monaco IDE and Direct Text Editor"
              >
                <Code className="w-3 h-3" />
                <span>{editorMode === 'monaco' ? 'IDE' : 'Direct'}</span>
              </button>

              {/* Maximize / Restore Editor Button (Desktop) */}
              <button
                onClick={() => setIsEditorMaximized(!isEditorMaximized)}
                className={`hidden lg:flex p-1.5 rounded-lg transition-colors text-xs items-center space-x-1 ${
                  isEditorMaximized
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
                title={isEditorMaximized ? 'Restore split view' : 'Maximize editor (full screen)'}
              >
                {isEditorMaximized ? (
                  <>
                    <Minimize2 className="w-3.5 h-3.5" />
                    <span>Restore</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Maximize</span>
                  </>
                )}
              </button>

              {/* Font Size Selector */}
              <div className="flex items-center space-x-1 text-xs text-slate-400">
                <Settings2 className="w-3.5 h-3.5" />
                <select
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  aria-label="Editor Font Size"
                  className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-1.5 py-0.5 focus:outline-none"
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
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                title="Reset to starter code"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Code Editor Container - Absolute Reliable Sizing & Fallback Engine */}
          <div
            className="flex-1 w-full min-h-[380px] relative bg-[#1e1e1e] flex flex-col overflow-hidden"
            style={{ minHeight: '380px' }}
          >
            {editorMode === 'monaco' ? (
              <Editor
                height="100%"
                width="100%"
                defaultLanguage="c"
                language="c"
                theme="vs-dark"
                value={code || problem.starter_code}
                onChange={handleCodeChange}
                onMount={(editor) => {
                  editorRef.current = editor;
                  setTimeout(() => editor.layout(), 100);
                  setTimeout(() => editor.layout(), 400);
                }}
                loading={
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
                    <span>Loading Monaco C Editor...</span>
                  </div>
                }
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
            ) : (
              <div className="flex-1 flex flex-col h-full bg-[#1e1e1e] p-3 text-slate-100 font-mono text-sm overflow-hidden">
                <textarea
                  value={code || problem.starter_code}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  spellCheck={false}
                  style={{ fontSize: `${fontSize}px` }}
                  className="w-full flex-1 bg-transparent text-slate-100 font-mono outline-none resize-none leading-relaxed overflow-y-auto"
                  placeholder="// Type your C implementation here..."
                />
              </div>
            )}
          </div>

          {/* Desktop Bottom Drawer: Test & Compilation Results Panel */}
          {isBottomPanelOpen && (
            <div
              className={`hidden lg:flex border-t border-slate-800 bg-slate-950 flex-col transition-all duration-200 shrink-0 z-10 ${
                isBottomPanelExpanded ? 'h-96' : 'h-64 sm:h-72'
              }`}
            >
              {/* Panel Header Tabs */}
              <div className="h-9 bg-slate-900 border-b border-slate-800 px-3 flex items-center justify-between shrink-0">
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setActiveBottomTab('tests')}
                    className={`px-3 py-1 text-xs font-medium rounded-t-md transition-colors ${
                      activeBottomTab === 'tests'
                        ? 'bg-slate-950 text-blue-400 border-t-2 border-blue-500'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Test Cases {activeTestResults.length > 0 && `(${activeTestResults.length})`}
                  </button>
                  <button
                    onClick={() => setActiveBottomTab('compiler')}
                    className={`px-3 py-1 text-xs font-medium rounded-t-md transition-colors ${
                      activeBottomTab === 'compiler'
                        ? 'bg-slate-950 text-blue-400 border-t-2 border-blue-500'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Compiler Output
                  </button>
                  <button
                    onClick={() => setActiveBottomTab('history')}
                    className={`px-3 py-1 text-xs font-medium rounded-t-md transition-colors ${
                      activeBottomTab === 'history'
                        ? 'bg-slate-950 text-blue-400 border-t-2 border-blue-500'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    History ({history.length})
                  </button>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setIsBottomPanelExpanded(!isBottomPanelExpanded)}
                    className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
                    title={isBottomPanelExpanded ? 'Restore height' : 'Expand height'}
                  >
                    {isBottomPanelExpanded ? (
                      <Minimize2 className="w-3.5 h-3.5" />
                    ) : (
                      <Maximize2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => setIsBottomPanelOpen(false)}
                    className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors flex items-center space-x-1 px-1.5"
                    title="Minimize panel"
                  >
                    <ChevronDown className="w-4 h-4" />
                    <span className="text-[11px] font-sans">Minimize</span>
                  </button>
                </div>
              </div>

              {/* Panel Content (Shared Desktop Component) */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Submission Verdict Banner */}
                {submissionResult && (
                  <div
                    className={`p-3 rounded-xl border flex items-center justify-between ${
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

                {/* Tests */}
                {activeBottomTab === 'tests' && (
                  <div>
                    {isRunning || isSubmitting ? (
                      <LoadingSpinner
                        message={
                          isRunning
                            ? 'Compiling and executing sample test suite...'
                            : 'Evaluating all hidden benchmark test suites...'
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
                            className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2 text-xs font-mono"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                {t.status === 'passed' ? (
                                  <span className="flex items-center text-emerald-400 font-semibold gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Case {t.test_case_index} Passed
                                  </span>
                                ) : (
                                  <span className="flex items-center text-rose-400 font-semibold gap-1">
                                    <XCircle className="w-3.5 h-3.5" /> Case {t.test_case_index} Failed
                                  </span>
                                )}
                                {t.is_hidden && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                                    Hidden Case
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-500">{t.time_ms} ms</span>
                            </div>

                            {!t.is_hidden && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                                <div>
                                  <span className="text-slate-500 text-[10px] block">Input</span>
                                  <pre className="bg-slate-950 p-2 rounded border border-slate-800 text-slate-300 overflow-x-auto whitespace-pre-wrap">
                                    {t.input}
                                  </pre>
                                </div>
                                <div>
                                  <span className="text-slate-500 text-[10px] block">Expected</span>
                                  <pre className="bg-slate-950 p-2 rounded border border-slate-800 text-emerald-300 overflow-x-auto whitespace-pre-wrap">
                                    {t.expected_output}
                                  </pre>
                                </div>
                                {t.status !== 'passed' && (
                                  <div className="md:col-span-2">
                                    <span className="text-rose-400 text-[10px] block font-semibold">
                                      Your Actual Output
                                    </span>
                                    <pre className="bg-rose-950/20 p-2 rounded border border-rose-500/20 text-rose-300 overflow-x-auto whitespace-pre-wrap">
                                      {t.actual_output || '(no output)'}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Compiler logs */}
                {activeBottomTab === 'compiler' && (
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs">
                    <div className="flex items-center space-x-2 text-slate-400 mb-2 pb-2 border-b border-slate-800">
                      <Terminal className="w-3.5 h-3.5 text-blue-400" />
                      <span>GCC Compilation & Diagnostics</span>
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

                {/* History */}
                {activeBottomTab === 'history' && (
                  <div className="space-y-2">
                    {history.length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-4">No submissions in this session yet.</p>
                    ) : (
                      history.map((h, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono"
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
            </div>
          )}

          {/* Action Bar (Run Code / Submit) */}
          <div className="h-14 bg-slate-900 border-t border-slate-800 px-3 sm:px-4 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <button
                onClick={() => {
                  if (window.innerWidth < 1024) {
                    setMobileTab('results');
                  } else {
                    setIsBottomPanelOpen(!isBottomPanelOpen);
                  }
                }}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  isBottomPanelOpen
                    ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
                title="Open results & console"
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Console</span>
                {activeTestResults.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-blue-500/20 text-blue-300 font-mono">
                    {activeTestResults.length}
                  </span>
                )}
              </button>

              <div className="text-[11px] text-slate-400 font-mono hidden xl:block">
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">Ctrl+Enter</kbd> Run,{' '}
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">Ctrl+Shift+Enter</kbd> Submit
              </div>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-3 ml-auto">
              <button
                onClick={handleRun}
                disabled={isRunning || isSubmitting}
                className="flex items-center space-x-1.5 px-3.5 sm:px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
              >
                <Play className="w-3.5 h-3.5 text-blue-400" />
                <span>{isRunning ? 'Running...' : 'Run Code'}</span>
              </button>

              <button
                onClick={handleSubmit}
                disabled={isRunning || isSubmitting}
                className="flex items-center space-x-1.5 px-4 sm:px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.02]"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Evaluating...' : 'Submit'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Dedicated Mobile Results Tab (shown when mobileTab === 'results' on screen < lg) */}
        {mobileTab === 'results' && (
          <div className="lg:hidden w-full h-full flex flex-col bg-slate-950 overflow-y-auto p-4 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-400" />
                Execution & Test Results
              </h2>
              <button
                onClick={() => setMobileTab('code')}
                className="text-xs text-blue-400 hover:underline flex items-center gap-1"
              >
                <Code2 className="w-3 h-3" /> Back to Code
              </button>
            </div>

            {/* Verdict */}
            {submissionResult && (
              <div
                className={`p-3 rounded-xl border flex items-center justify-between ${
                  submissionResult.verdict === 'accepted'
                    ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <VerdictBadge verdict={submissionResult.verdict} size="sm" />
                  <span className="text-xs font-mono">
                    {submissionResult.passed_tests}/{submissionResult.total_tests} passed
                  </span>
                </div>
                <div className="text-[11px] font-mono text-slate-400">
                  {submissionResult.execution_time_ms}ms
                </div>
              </div>
            )}

            {isRunning || isSubmitting ? (
              <LoadingSpinner
                message={
                  isRunning
                    ? 'Compiling and executing sample test cases...'
                    : 'Running full automated evaluation test suite...'
                }
              />
            ) : activeTestResults.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-500 space-y-3">
                <p>No tests executed yet.</p>
                <button
                  onClick={() => {
                    setMobileTab('code');
                    handleRun();
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold"
                >
                  Run Sample Tests
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {activeTestResults.map((t) => (
                  <div
                    key={t.test_case_index}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2 text-xs font-mono"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {t.status === 'passed' ? (
                          <span className="flex items-center text-emerald-400 font-semibold gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Case {t.test_case_index} Passed
                          </span>
                        ) : (
                          <span className="flex items-center text-rose-400 font-semibold gap-1">
                            <XCircle className="w-3.5 h-3.5" /> Case {t.test_case_index} Failed
                          </span>
                        )}
                        {t.is_hidden && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                            Hidden
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500">{t.time_ms} ms</span>
                    </div>

                    {!t.is_hidden && (
                      <div className="space-y-1.5 pt-1">
                        <div>
                          <span className="text-slate-500 text-[10px] block">Input:</span>
                          <pre className="bg-slate-950 p-2 rounded border border-slate-800 text-slate-300 overflow-x-auto whitespace-pre-wrap">
                            {t.input}
                          </pre>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px] block">Expected:</span>
                          <pre className="bg-slate-950 p-2 rounded border border-slate-800 text-emerald-300 overflow-x-auto whitespace-pre-wrap">
                            {t.expected_output}
                          </pre>
                        </div>
                        {t.status !== 'passed' && (
                          <div>
                            <span className="text-rose-400 text-[10px] block font-semibold">Your Output:</span>
                            <pre className="bg-rose-950/20 p-2 rounded border border-rose-500/20 text-rose-300 overflow-x-auto whitespace-pre-wrap">
                              {t.actual_output || '(no output)'}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Compiler diagnostics on mobile */}
            {activeCompilerOutput && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 font-mono text-xs mt-4">
                <span className="text-blue-400 font-bold block mb-1">Compiler Output:</span>
                <pre className="text-slate-300 whitespace-pre-wrap">{activeCompilerOutput}</pre>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hint Modal */}
      {hintModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
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
            <p className="text-sm text-slate-200 bg-slate-950 p-4 rounded-xl border border-slate-800 leading-relaxed font-sans">
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
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
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
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 uppercase text-[10px] block font-bold">
                    Time Complexity
                  </span>
                  <span className="text-blue-400 font-mono text-sm">
                    {solutionData.time_complexity}
                  </span>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
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
                <div className="text-slate-300 font-sans leading-relaxed whitespace-pre-line bg-slate-950 p-3 rounded-xl border border-slate-800">
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
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-xs font-semibold rounded-xl text-white shadow-md shadow-blue-600/20"
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
