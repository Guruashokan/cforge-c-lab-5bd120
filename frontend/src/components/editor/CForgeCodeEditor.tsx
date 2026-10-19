import { useState, useRef, type FC, type ChangeEvent, type KeyboardEvent } from 'react';
import { Copy, Check } from 'lucide-react';

interface CForgeCodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  fontSize?: number;
  readOnly?: boolean;
}

function highlightC(code: string): string {
  let html = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const tokens: string[] = [];
  const saveToken = (content: string, className: string) => {
    const idx = tokens.length;
    tokens.push(`<span class="${className}">${content}</span>`);
    return `___TOKEN_${idx}___`;
  };

  html = html.replace(/\/\*[\s\S]*?\*\//g, (m) => saveToken(m, 'text-slate-400 italic'));
  html = html.replace(/\/\/.*$/gm, (m) => saveToken(m, 'text-slate-400 italic'));
  html = html.replace(/"(\\.|[^"\\])*"/g, (m) => saveToken(m, 'text-emerald-400 font-medium'));
  html = html.replace(/'(\\.|[^'\\])*'/g, (m) => saveToken(m, 'text-emerald-300 font-medium'));
  html = html.replace(/^\s*#\s*(include|define|undef|ifdef|ifndef|if|else|elif|endif|pragma)[^\n]*/gm, (m) => saveToken(m, 'text-purple-400 font-semibold'));

  const types = /\b(int|char|float|double|void|size_t|ssize_t|int8_t|int16_t|int32_t|int64_t|uint8_t|uint16_t|uint32_t|uint64_t|bool|struct|union|enum|typedef|FILE|pthread_t|pthread_mutex_t|atomic_size_t|_Atomic|uintptr_t|intptr_t)\b/g;
  html = html.replace(types, '<span class="text-sky-400 font-semibold">$1</span>');

  const keywords = /\b(return|if|else|for|while|do|switch|case|default|break|continue|goto|sizeof|static|const|volatile|extern|inline)\b/g;
  html = html.replace(keywords, '<span class="text-pink-400 font-semibold">$1</span>');

  const constants = /\b(NULL|true|false|EXIT_SUCCESS|EXIT_FAILURE|EOF)\b/g;
  html = html.replace(constants, '<span class="text-amber-400 font-bold">$1</span>');

  html = html.replace(/\b(0x[0-9a-fA-F]+|[0-9]+(\.[0-9]+)?f?)\b/g, '<span class="text-amber-300">$1</span>');

  const funcs = /\b(printf|scanf|malloc|calloc|realloc|free|memset|memcpy|strcpy|strlen|strcmp|fopen|fclose|fread|fwrite|fprintf|exit|qsort)\b(?=\s*\()/g;
  html = html.replace(funcs, '<span class="text-yellow-300 font-medium">$1</span>');

  tokens.forEach((t, idx) => {
    html = html.replace(`___TOKEN_${idx}___`, t);
  });

  return html;
}

export const CForgeCodeEditor: FC<CForgeCodeEditorProps> = ({
  value,
  onChange,
  fontSize = 14,
  readOnly = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  const lines = value.split('\n');
  const totalLines = lines.length;

  const handleScroll = () => {
    if (!textareaRef.current) return;
    const top = textareaRef.current.scrollTop;
    const left = textareaRef.current.scrollLeft;
    if (preRef.current) {
      preRef.current.scrollTop = top;
      preRef.current.scrollLeft = left;
    }
    if (gutterRef.current) {
      gutterRef.current.scrollTop = top;
    }
  };

  const updateCursorPosition = () => {
    if (!textareaRef.current) return;
    const selStart = textareaRef.current.selectionStart;
    const textBefore = value.substring(0, selStart);
    const lineNum = textBefore.split('\n').length;
    const lastNewlineIdx = textBefore.lastIndexOf('\n');
    const colNum = lastNewlineIdx === -1 ? selStart + 1 : selStart - lastNewlineIdx;
    setCursorPos({ line: lineNum, col: colNum });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (readOnly) return;
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    if (e.key === 'Tab') {
      e.preventDefault();
      const spaces = '    ';
      const newVal = value.substring(0, start) + spaces + value.substring(end);
      onChange(newVal);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 4;
        updateCursorPosition();
      }, 0);
      return;
    }

    const autoPairs: Record<string, string> = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'" };
    if (autoPairs[e.key]) {
      e.preventDefault();
      const open = e.key;
      const close = autoPairs[e.key];
      const selected = value.substring(start, end);
      const newVal = value.substring(0, start) + open + selected + close + value.substring(end);
      onChange(newVal);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 1;
        updateCursorPosition();
      }, 0);
      return;
    }

    if (e.key === 'Enter') {
      const currentLineText = value.substring(0, start).split('\n').pop() || '';
      const indentMatch = currentLineText.match(/^\s*/);
      let indent = indentMatch ? indentMatch[0] : '';
      if (currentLineText.trim().endsWith('{')) {
        indent += '    ';
      }
      e.preventDefault();
      const insertText = '\n' + indent;
      const newVal = value.substring(0, start) + insertText + value.substring(end);
      onChange(newVal);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + insertText.length;
        updateCursorPosition();
      }, 0);
      return;
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const highlightedHtml = highlightC(value);

  return (
    <div className="flex-1 flex flex-col h-full w-full bg-[#18181b] border-t border-slate-800 overflow-hidden font-mono text-xs select-none">
      <div className="flex-1 flex overflow-hidden relative">
        <div
          ref={gutterRef}
          aria-hidden="true"
          className="w-12 sm:w-14 bg-[#111113] border-r border-slate-800/80 text-slate-500 text-right pr-3 pt-3.5 pb-20 select-none overflow-hidden shrink-0 font-mono leading-6"
          style={{ fontSize: `${fontSize}px` }}
        >
          {Array.from({ length: Math.max(totalLines, 1) }).map((_, idx) => {
            const lineNum = idx + 1;
            const isCurrentLine = lineNum === cursorPos.line;
            return (
              <div
                key={lineNum}
                className={`${isCurrentLine ? 'text-blue-400 font-bold bg-blue-500/10' : 'text-slate-600'}`}
              >
                {lineNum}
              </div>
            );
          })}
        </div>

        <div className="flex-1 relative overflow-hidden h-full">
          <pre
            ref={preRef}
            aria-hidden="true"
            className="absolute inset-0 p-3.5 m-0 overflow-hidden font-mono leading-6 pointer-events-none whitespace-pre text-slate-100"
            style={{ fontSize: `${fontSize}px`, tabSize: 4 }}
            dangerouslySetInnerHTML={{ __html: highlightedHtml + '\n\n' }}
          />
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => {
              onChange(e.target.value);
              updateCursorPosition();
            }}
            onKeyDown={handleKeyDown}
            onKeyUp={updateCursorPosition}
            onClick={updateCursorPosition}
            onScroll={handleScroll}
            readOnly={readOnly}
            spellCheck={false}
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect="off"
            placeholder="// Write your C implementation here..."
            className="absolute inset-0 w-full h-full p-3.5 m-0 bg-transparent text-transparent caret-white font-mono leading-6 resize-none outline-none overflow-auto whitespace-pre z-10 selection:bg-blue-600/35 selection:text-white"
            style={{ fontSize: `${fontSize}px`, tabSize: 4 }}
          />
        </div>
      </div>

      <div className="h-6 bg-[#111113] border-t border-slate-800/80 px-3 flex items-center justify-between text-[11px] text-slate-400 font-mono shrink-0">
        <div className="flex items-center space-x-3">
          <span className="flex items-center gap-1 text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            C17 (GCC 13.2)
          </span>
          <span className="text-slate-600">|</span>
          <span>Ln {cursorPos.line}, Col {cursorPos.col}</span>
          <span className="text-slate-600">|</span>
          <span>{totalLines} lines</span>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleCopy}
            className="text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1"
            title="Copy code"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </>
            )}
          </button>
          <span className="text-slate-600">|</span>
          <span>Spaces: 4</span>
          <span className="text-slate-600">|</span>
          <span>UTF-8</span>
        </div>
      </div>
    </div>
  );
};
