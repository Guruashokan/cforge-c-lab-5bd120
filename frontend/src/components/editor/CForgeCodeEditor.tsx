import { useState, useMemo, type FC } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { cpp } from '@codemirror/lang-cpp';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import { EditorView } from '@codemirror/view';
import { Copy, Check } from 'lucide-react';

interface CForgeCodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  fontSize?: number;
  readOnly?: boolean;
}

export const CForgeCodeEditor: FC<CForgeCodeEditorProps> = ({
  value,
  onChange,
  fontSize = 14,
  readOnly = false,
}) => {
  const [copied, setCopied] = useState(false);

  const totalLines = useMemo(() => {
    return (value || '').split('\n').length;
  }, [value]);

  const customTheme = useMemo(() => {
    return EditorView.theme({
      '&': {
        height: '100%',
        backgroundColor: '#18181b',
        fontSize: `${fontSize}px`,
      },
      '.cm-scroller': {
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        lineHeight: '1.6',
        overflow: 'auto',
      },
      '.cm-content': {
        padding: '12px 4px',
        caretColor: '#38bdf8',
      },
      '.cm-cursor': {
        borderLeftColor: '#38bdf8',
        borderLeftWidth: '2px',
      },
      '.cm-gutters': {
        backgroundColor: '#111113',
        color: '#64748b',
        borderRight: '1px solid #27272a',
        paddingRight: '6px',
        userSelect: 'none',
      },
      '.cm-activeLineGutter': {
        backgroundColor: '#1e293b',
        color: '#38bdf8',
        fontWeight: 'bold',
      },
      '.cm-activeLine': {
        backgroundColor: '#1e293b22',
      },
      '.cm-selectionBackground, ::selection': {
        backgroundColor: '#2563eb40 !important',
      },
    });
  }, [fontSize]);

  const extensions = useMemo(() => {
    return [
      cpp(),
      customTheme,
      EditorView.lineWrapping,
    ];
  }, [customTheme]);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col h-full w-full bg-[#18181b] overflow-hidden font-mono text-xs">
      {/* Editor Main Canvas */}
      <div className="flex-1 w-full h-full relative overflow-hidden">
        <CodeMirror
          value={value}
          height="100%"
          theme={vscodeDark}
          extensions={extensions}
          onChange={(val) => {
            onChange(val);
          }}
          readOnly={readOnly}
          editable={!readOnly}
          basicSetup={{
            lineNumbers: true,
            highlightActiveLineGutter: true,
            highlightSpecialChars: true,
            history: true,
            foldGutter: true,
            drawSelection: true,
            dropCursor: true,
            allowMultipleSelections: false,
            indentOnInput: true,
            syntaxHighlighting: true,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: true,
            rectangularSelection: true,
            crosshairCursor: false,
            highlightActiveLine: true,
            highlightSelectionMatches: true,
            closeBracketsKeymap: true,
            defaultKeymap: true,
            searchKeymap: true,
            historyKeymap: true,
            foldKeymap: true,
            completionKeymap: true,
            lintKeymap: true,
            tabSize: 4,
          }}
          className="h-full w-full text-left"
        />
      </div>

      {/* VS Code Style Status Bar */}
      <div className="h-6 bg-[#111113] border-t border-slate-800 px-3 flex items-center justify-between text-[11px] text-slate-400 font-mono shrink-0 select-none">
        <div className="flex items-center space-x-3">
          <span className="flex items-center gap-1.5 text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            C17 (GCC 13.2)
          </span>
          <span className="text-slate-600">|</span>
          <span>{totalLines} lines</span>
          <span className="text-slate-600 hidden sm:inline">|</span>
          <span className="hidden sm:inline">UTF-8</span>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleCopy}
            className="text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1 py-0.5 px-1 rounded hover:bg-slate-800"
            title="Copy entire code to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400 font-medium">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </>
            )}
          </button>
          <span className="text-slate-600">|</span>
          <span>Tab: 4 Spaces</span>
        </div>
      </div>
    </div>
  );
};
