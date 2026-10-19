import { useEffect, useState, useCallback, type FC } from 'react';
import { useParams, Link } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { CForgeCodeEditor } from '../components/editor/CForgeCodeEditor';
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
} from 'lucide-react';

export const ProblemSolve: FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [problem, setProblem] = useState<Problem | null>(null);
  const [code, setCode] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Editor states
  const [fontSize, setFontSize] = useState<number>(14);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [editorEngine, setEditorEngine] = useState<'cforge' | 'monaco'>('cforge');
  const [isEditorMaximized, setIsEditorMaximized] = useState(false);

  // Tabs
  const [mobileTab, setMobileTab] = useState<'problem' | 'code' | 'results'>('code');
  const [leftTab, setLeftTab] = useState<'statement' | 'hints' | 'editorial'>('statement');
  const [activeBottomTab, setActiveBottomTab] = useState<'tests' | 'compiler' | 'history'>('tests');
  const [isBottomPanelOpen, setIsBottomPanelOpen] = useState(false);

  // Results
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    if (slug) {
      localStorage.setItem(`cforge_code_${slug}`, newCode);
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

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-950">
        <LoadingSpinner message="Initializing GCC C17 execution environment..." />
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
            title="Back to Problem Catalog"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center space-x-2 min-w-0">
            <span className="text-xs sm:text-sm font-semibold text-white truncate max-w-[150px] sm:max-w-xs md:max-w-md">
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

        {/* Mobile Segmented Tab Navigation (< lg only) */}
        <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800 lg:hidden">
          <button
            onClick={() => setMobileTab('problem')}
            className={`flex items-center space-x-1 px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
              mobileTab === 'problem' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3 h-3" />
            <span>Problem</span>
          </button>
          <button
            onClick={() => setMobileTab('code')}
            className={`flex items-center space-x-1 px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
              mobileTab === 'code' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code2 className="w-3 h-3" />
            <span>Editor</span>
          </button>
          <button
            onClick={() => setMobileTab('results')}
            className={`flex items-center space-x-1 px-2.5 py-1 text-xs rounded-lg font-medium transition-all relative ${
              mobileTab === 'results' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3 h-3" />
            <span>Results</span>
            {activeTestResults.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
          </button>
        </div>

        {/* Top Right Quick Actions */}
        <div className="flex items-center space-x-1.5 sm:space-x-2">
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

      {/* Main Workspace Layout: STRICT 50/50 Split on Desktop */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Left Pane: Problem Description & Editorial (50% on desktop) */}
        <div
          className={`border-b lg:border-b-0 lg:border-r border-slate-800 overflow-y-auto bg-slate-950 flex flex-col ${
            isEditorMaximized
              ? 'hidden'
              : 'w-full lg:w-1/2 h-full ' + (mobileTab === 'problem' ? 'flex' : 'hidden lg:flex')
          }`}
        >
          {/* Left Pane Tabs */}
          <div className="h-10 bg-slate-900 border-b border-slate-800 px-4 flex items-center space-x-2 shrink-0">
            <button
              onClick={() => setLeftTab('statement')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                leftTab === 'statement'
                  ? 'bg-slate-800 text-blue-400 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Description</span>
            </button>
            <button
              onClick={() => setLeftTab('hints')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                leftTab === 'hints'
                  ? 'bg-slate-800 text-amber-400 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Lightbulb className="w-3.5 h-3.5" />
              <span>Hints ({problem.hints?.length || 0})</span>
            </button>
            <button
              onClick={() => setLeftTab('editorial')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                leftTab === 'editorial'
                  ? 'bg-slate-800 text-indigo-400 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Editorial</span>
            </button>
          </div>

          {/* Left Pane Content Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {leftTab === 'statement' && (
              <>
                {/* Title & Badges */}
                <div className="space-y-2">
                  <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                    {problem.title}
                  </h1>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <DifficultyBadge difficulty={problem.difficulty} />
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                      {problem.topic?.name}
                    </span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                      Mode: {problem.execution_mode}
                    </span>
                    {problem.companies && problem.companies.length > 0 && (
                      <div className="flex items-center gap-1.5 text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 rounded-full">
                        <Building2 className="w-3 h-3" />
                        <span>Asked in: {problem.companies.map((c) => c.company_name).join(', ')}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div className="prose prose-invert max-w-none text-slate-300 text-sm leading-relaxed whitespace-pre-line font-sans">
                  {problem.description}
                </div>

                {/* Input & Output Format */}
                <div className="space-y-3 bg-slate-900/70 border border-slate-800 rounded-xl p-4 text-xs font-mono">
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
                <div className="space-y-2 bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <Cpu className="w-3.5 h-3.5 text-blue-400" />
                    Constraints & Requirements
                  </h3>
                  <p className="text-xs font-mono text-slate-300 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    {problem.constraints}
                  </p>
                </div>

                {/* Examples */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Examples</h3>
                  {problem.examples?.map((ex, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-900/70 border border-slate-800 rounded-xl overflow-hidden text-xs font-mono"
                    >
                      <div className="bg-slate-800/60 px-3.5 py-1.5 flex items-center justify-between text-slate-400 border-b border-slate-800">
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
                          <pre className="bg-slate-950 p-2 rounded border border-slate-800 text-slate-200 overflow-x-auto whitespace-pre-wrap">
                            {ex.input}
                          </pre>
                        </div>
                        <div>
                          <span className="text-slate-500 uppercase text-[10px] block font-bold mb-0.5">
                            Expected Output
                          </span>
                          <pre className="bg-slate-950 p-2 rounded border border-slate-800 text-emerald-300 overflow-x-auto whitespace-pre-wrap">
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
              </>
            )}

            {leftTab === 'hints' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-400" /> Hints & Architectural Approaches
                </h3>
                {problem.hints && problem.hints.length > 0 ? (
                  problem.hints.map((hint, i) => (
                    <div
                      key={i}
                      className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 space-y-1.5"
                    >
                      <span className="text-[11px] font-bold text-amber-400 uppercase">Hint #{i + 1}</span>
                      <p className="leading-relaxed font-sans">{hint}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500">No hints recorded for this challenge.</p>
                )}
              </div>
            )}

            {leftTab === 'editorial' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 uppercase text-[10px] block font-bold">Time Complexity</span>
                    <span className="text-blue-400 font-mono text-sm">{problem.time_complexity || 'O(N)'}</span>
                  </div>
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 uppercase text-[10px] block font-bold">Space Complexity</span>
                    <span className="text-purple-400 font-mono text-sm">{problem.space_complexity || 'O(1)'}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-slate-200 uppercase text-xs">Architectural Design</h4>
                  <div className="text-slate-300 font-sans text-xs leading-relaxed whitespace-pre-line bg-slate-900 p-4 rounded-xl border border-slate-800">
                    {problem.explanation}
                  </div>
                </div>

                {problem.common_mistakes && problem.common_mistakes.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-bold text-amber-400 uppercase text-xs flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" /> Common Pitfalls
                    </h4>
                    <ul className="list-disc pl-5 space-y-1 text-slate-300 font-sans text-xs">
                      {problem.common_mistakes.map((m, i) => (
                        <li key={i}>{m}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Pane: Code Editor + Bottom Results Drawer (50% on desktop) */}
        <div
          className={`flex flex-col bg-slate-900 overflow-hidden ${
            isEditorMaximized
              ? 'w-full h-full'
              : 'w-full lg:w-1/2 h-full ' + (mobileTab === 'code' ? 'flex' : 'hidden lg:flex')
          }`}
        >
          {/* Editor Header Toolbar */}
          <div className="h-10 bg-slate-900 border-b border-slate-800 px-3 sm:px-4 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-2 text-xs font-mono text-slate-300">
              <FileCode className="w-4 h-4 text-blue-400" />
              <span>solution.c</span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400 hidden sm:inline">C17 (GCC 13.2)</span>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-3">
              {/* Editor Engine Switcher */}
              <button
                onClick={() => setEditorEngine(editorEngine === 'cforge' ? 'monaco' : 'cforge')}
                className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700 transition-colors"
                title="Toggle between CForge Ultra Editor and Monaco IDE"
              >
                {editorEngine === 'cforge' ? 'CForge Pro' : 'Monaco IDE'}
              </button>

              {/* Maximize Toggle */}
              <button
                onClick={() => setIsEditorMaximized(!isEditorMaximized)}
                className={`hidden lg:flex p-1.5 rounded-lg transition-colors text-xs items-center space-x-1 ${
                  isEditorMaximized
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
                title={isEditorMaximized ? 'Restore split view' : 'Maximize editor (full screen)'}
              >
                {isEditorMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
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

          {/* Code Editor Body */}
          <div className="flex-1 w-full min-h-[250px] relative overflow-hidden flex flex-col">
            {editorEngine === 'cforge' ? (
              <CForgeCodeEditor
                value={code || problem.starter_code}
                onChange={handleCodeChange}
                fontSize={fontSize}
              />
            ) : (
              <Editor
                height="100%"
                width="100%"
                defaultLanguage="c"
                language="c"
                theme="vs-dark"
                value={code || problem.starter_code}
                onChange={(val) => handleCodeChange(val || '')}
                options={{
                  fontSize,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 4,
                  lineNumbers: 'on',
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                }}
              />
            )}
          </div>

          {/* Collapsible Test Console Drawer (Sits directly above bottom action bar) */}
          {isBottomPanelOpen && (
            <div className="border-t border-slate-800 bg-slate-950 flex flex-col shrink-0 h-64 sm:h-72 transition-all">
              {/* Drawer Tabs */}
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

                <button
                  onClick={() => setIsBottomPanelOpen(false)}
                  className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors flex items-center space-x-1 px-1.5"
                  title="Close console"
                >
                  <ChevronDown className="w-4 h-4" />
                  <span className="text-[11px] font-sans">Close</span>
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
                    <div className="text-xs font-mono text-slate-400">
                      <span>Time: {submissionResult.execution_time_ms}ms</span>
                    </div>
                  </div>
                )}

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
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeBottomTab === 'compiler' && (
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs">
                    <span className="text-blue-400 font-bold block mb-1">Compiler Output:</span>
                    <pre className="text-slate-300 whitespace-pre-wrap leading-relaxed">
                      {activeCompilerOutput || 'No diagnostics recorded. Click Run Code to compile.'}
                    </pre>
                  </div>
                )}

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
                          <span className="uppercase text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                            {h.type}
                          </span>
                          <span className="text-slate-500">{h.time}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sticky Bottom Action Bar - ALWAYS VISIBLE AT BOTTOM */}
          <div className="h-14 bg-slate-900 border-t border-slate-800 px-3 sm:px-4 flex items-center justify-between shrink-0 z-10">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <button
                onClick={() => setIsBottomPanelOpen(!isBottomPanelOpen)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  isBottomPanelOpen
                    ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
                title="Toggle test console"
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Console</span>
                {activeTestResults.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-blue-500/20 text-blue-300 font-mono">
                    {activeTestResults.length}
                  </span>
                )}
                {isBottomPanelOpen ? <ChevronDown className="w-3.5 h-3.5 ml-0.5" /> : <ChevronUp className="w-3.5 h-3.5 ml-0.5" />}
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
                <Code2 className="w-3 h-3" /> Back to Editor
              </button>
            </div>

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
                    : 'Evaluating all hidden benchmark test suites...'
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
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
