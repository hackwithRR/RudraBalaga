const fs = require('fs');

// ---------- extract inline script blocks ----------
function extractBlocks(src) {
  const lines = src.split('\n');
  const blocks = [];
  const openRe = /<script(?![^>]*\bsrc=)/i;
  for (let i = 0; i < lines.length; i++) {
    if (openRe.test(lines[i])) {
      let end = -1;
      for (let j = i + 1; j < lines.length; j++) {
        if (/<\/script>/i.test(lines[j])) { end = j; break; }
      }
      blocks.push({
        startLine: i + 1,
        endLine: end + 1,
        content: lines.slice(i + 1, end >= 0 ? end : i).join('\n'),
      });
      if (end >= 0) i = end; else break;
    }
  }
  return blocks;
}

// ---------- tokenizer-aware bracket tracker ----------
function trackBrackets(code) {
  const stack = [];
  const pairs = { ')': '(', ']': '[', '}': '{' };
  let i = 0, line = 1;
  const n = code.length;
  let prevSignificant = '';
  let prevWord = '';

  while (i < n) {
    const ch = code[i];
    if (ch === '\n') { line++; i++; continue; }
    if (ch === '/' && code[i + 1] === '/') { while (i < n && code[i] !== '\n') i++; continue; }
    if (ch === '/' && code[i + 1] === '*') {
      i += 2;
      while (i < n && !(code[i] === '*' && code[i + 1] === '/')) { if (code[i] === '\n') line++; i++; }
      i += 2; continue;
    }
    if (ch === "'" || ch === '"') {
      const q = ch; i++;
      while (i < n && code[i] !== q) { if (code[i] === '\\') i++; if (code[i] === '\n') line++; i++; }
      i++; prevSignificant = q; prevWord = ''; continue;
    }
    if (ch === '`') {
      i++;
      let depth = 0;
      while (i < n) {
        const c = code[i];
        if (c === '\\') { i += 2; continue; }
        if (c === '\n') { line++; i++; continue; }
        if (depth === 0 && c === '`') { i++; break; }
        if (c === '$' && code[i + 1] === '{') { depth++; i += 2; stack.push({ type: '$', line }); continue; }
        if (c === '}' && depth > 0) { depth--; i++; stack.pop(); continue; }
        if (depth > 0) {
          if (c === "'" || c === '"') {
            const q2 = c; i++;
            while (i < n && code[i] !== q2) { if (code[i] === '\\') i++; if (code[i] === '\n') line++; i++; }
            i++; continue;
          }
          if (c === '`') {
            i++;
            while (i < n && code[i] !== '`') { if (code[i] === '\\') i++; if (code[i] === '\n') line++; i++; }
            i++; continue;
          }
          if (c === '/' && code[i + 1] === '/') { while (i < n && code[i] !== '\n') i++; continue; }
          if (c === '/' && code[i + 1] === '*') {
            i += 2;
            while (i < n && !(code[i] === '*' && code[i + 1] === '/')) { if (code[i] === '\n') line++; i++; }
            i += 2; continue;
          }
        }
        i++;
      }
      prevSignificant = '`'; prevWord = ''; continue;
    }

    if (ch === '/' &&
        (prevSignificant === '' || '=([{!&|?:;,+-*%<>~^'.includes(prevSignificant) ||
         ['return','typeof','in','of','new','delete','void','instanceof','do','else','case'].includes(prevWord))) {
      const startLine = line;
      i++;
      let inClass = false, ok = false;
      while (i < n) {
        const c = code[i];
        if (c === '\\') { i += 2; continue; }
        if (c === '\n') break;
        if (c === '[') inClass = true;
        else if (c === ']') inClass = false;
        else if (c === '/' && !inClass) { ok = true; i++; break; }
        i++;
      }
      if (ok) {
        while (i < n && /[a-z]/i.test(code[i])) i++;
        prevSignificant = '/'; prevWord = ''; continue;
      }
      prevSignificant = '/'; prevWord = '';
      continue;
    }
    if (ch === '(' || ch === '[' || ch === '{') {
      stack.push({ type: ch, line });
      prevSignificant = ch; prevWord = ''; i++; continue;
    }
    if (ch === ')' || ch === ']' || ch === '}') {
      const want = pairs[ch];
      const top = stack[stack.length - 1];
      if (!top) console.log(`  [tracker] EXTRA CLOSER '${ch}' at code-line ${line}`);
      else if (top.type !== want) {
        console.log(`  [tracker] MISMATCH: closer '${ch}' at code-line ${line} vs top '${top.type}' from code-line ${top.line}`);
        stack.pop();
      } else stack.pop();
      prevSignificant = ch; prevWord = ''; i++; continue;
    }
    if (/[A-Za-z_$0-9]/.test(ch)) {
      let w = '';
      while (i < n && /[A-Za-z_$0-9]/.test(code[i])) { w += code[i]; i++; }
      prevSignificant = w[w.length - 1]; prevWord = w; continue;
    }
    prevSignificant = ch; prevWord = ''; i++;
  }
  return stack;
}

// ---------- main ----------
const file = process.argv[2] || 'admin.html';
const src = fs.readFileSync(file, 'utf8');
const blocks = extractBlocks(src);
console.log('Inline script blocks found:', blocks.length);

for (let b = 0; b < blocks.length; b++) {
  const blk = blocks[b];
  console.log(`\n=== Block ${b}: HTML lines ${blk.startLine}-${blk.endLine} (${blk.content.split('\n').length} code lines) ===`);
  try {
    new Function(blk.content);
    console.log('  -> SYNTAX OK');
  } catch (e) {
    console.log('  -> PARSE ERROR:', e.message);
    const offset = blk.startLine;
    try { new Function(blk.content); } catch (_) {}
    const stack = trackBrackets(blk.content);
    if (stack.length) {
      console.log('  Unclosed tokens remaining:');
      stack.forEach(s => console.log(`     '${s.type}' opened at CODE line ${s.line} ==> HTML line ${s.line + offset}`));
    } else {
      console.log('  Brackets balanced per tracker (see mismatch warnings above).');
    }
  }
}
