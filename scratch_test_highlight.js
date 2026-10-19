
function highlightC(code) {
  let html = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const tokens = [];
  const saveToken = (content, className) => {
    const idx = tokens.length;
    tokens.push('<span class="' + className + '">' + content + '</span>');
    return '___TOKEN_' + idx + '___';
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
    html = html.replace('___TOKEN_' + idx + '___', t);
  });

  return html;
}

const testCode = "#include <stdio.h>\n#include <stdlib.h>\n#include <string.h>\n\nint main(void) {\n    // Simulate C implicit and explicit type conversions\n    return 0;\n}\n";
console.log('Result HTML:');
console.log(highlightC(testCode));
