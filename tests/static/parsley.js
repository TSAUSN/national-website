const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const VIEWS_DIR = path.join(ROOT, 'webengine', 'views');
const SCRIPTS_DIR = path.join(ROOT, 'webengine', 'scripts');

// Platform-owned (layouts, menus) and rollback snapshots aren't ours to test.
const EXCLUDED = ['z', 'menu-config', '_zesty'].map((d) => path.join(VIEWS_DIR, d));
const isExcluded = (p) => EXCLUDED.some((d) => p === d || p.startsWith(d + path.sep));

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.')) continue;
    const full = path.join(dir, e.name);
    if (isExcluded(full)) continue;
    if (e.isDirectory()) out.push(...walk(full));
    else if (e.isFile()) out.push(full);
  }
  return out;
}

const toRel = (base, full) => path.relative(base, full).split(path.sep).join('/');

function listViews() {
  return walk(VIEWS_DIR).map((full) => ({ rel: toRel(VIEWS_DIR, full), full }));
}

function listScripts() {
  return walk(SCRIPTS_DIR)
    .filter((f) => f.endsWith('.js'))
    .map((full) => ({ rel: toRel(SCRIPTS_DIR, full), full }));
}

const lineAt = (src, index) => src.slice(0, index).split('\n').length;

// Splits source into text and {{ }} tags. Braces inside a tag are matched, so
// {{truepath({this.zuid})}} and {{$x = {a.filter({b}).c} }} stay one tag. A tag
// whose braces never balance ends at the next }} and is flagged `unbalanced`.
function tokenize(src) {
  const tokens = [];
  let i = 0;
  while (i < src.length) {
    const start = src.indexOf('{{', i);
    if (start === -1) break;
    let depth = 0;
    let end = -1;
    for (let j = start + 2; j < src.length; j++) {
      if (src[j] === '{') depth++;
      else if (src[j] === '}') {
        if (depth === 0 && src[j + 1] === '}') {
          end = j + 2;
          break;
        }
        depth = Math.max(0, depth - 1);
      }
    }
    const unbalanced = end === -1;
    if (unbalanced) {
      const close = src.indexOf('}}', start + 2);
      if (close === -1) break;
      end = close + 2;
    }
    if (start > i) tokens.push({ type: 'text', value: src.slice(i, start), index: i });
    tokens.push({
      type: 'tag',
      value: src.slice(start, end),
      body: src.slice(start + 2, end - 2).trim(),
      index: start,
      unbalanced
    });
    i = end;
  }
  if (i < src.length) tokens.push({ type: 'text', value: src.slice(i), index: i });
  return tokens;
}

// Control keyword of a tag: if, else-if, else, each, close-if, close-each, or null.
function keyword(body) {
  const word = (body.match(/^\/?[a-z-]+/) || [''])[0];
  if (word === 'if' || word === 'each' || word === 'else' || word === 'else-if') return word;
  if (word === '/if' || word === 'end-if') return 'close-if';
  if (word === '/each' || word === 'end-each') return 'close-each';
  return null;
}

// Returns the first structural problem in the if/each nesting, or null.
function checkBlocks(src) {
  const stack = [];
  for (const t of tokenize(src)) {
    if (t.type !== 'tag') continue;
    const kw = keyword(t.body);
    const line = lineAt(src, t.index);
    if (kw === 'if' || kw === 'each') stack.push({ kw, line });
    else if (kw === 'else' || kw === 'else-if') {
      if (!stack.length || stack[stack.length - 1].kw !== 'if') return `line ${line}: {{${kw}}} outside an {{if}}`;
    } else if (kw === 'close-if' || kw === 'close-each') {
      const want = kw === 'close-if' ? 'if' : 'each';
      const open = stack.pop();
      if (!open) return `line ${line}: closing {{${want}}} with no opener`;
      if (open.kw !== want) return `line ${line}: closes {{${want}}} but {{${open.kw}}} from line ${open.line} is open`;
    }
  }
  if (stack.length) return `unclosed ${stack.map((s) => `{{${s.kw}}} from line ${s.line}`).join(', ')}`;
  return null;
}

// Tags whose { } don't pair up, e.g. {{ a.filter({b.filter({c}).d).e }}.
function unbalancedTags(src) {
  return tokenize(src)
    .filter((t) => t.type === 'tag' && t.unbalanced)
    .map((t) => `line ${lineAt(src, t.index)}: ${t.value}`);
}

// Static {{include name}} view targets. Dynamic ({{include {this.x}}}) and
// remote URL includes are skipped.
function includes(src) {
  const out = [];
  for (const t of tokenize(src)) {
    if (t.type !== 'tag') continue;
    const m = t.body.match(/^include\s+([^\s{}()]+)$/);
    if (m && !/^https?:\/\//i.test(m[1])) out.push({ target: m[1].replace(/^\/+/, ''), line: lineAt(src, t.index) });
  }
  return out;
}

const blank = (s) => s.replace(/[^\n]/g, '');

// Tags that print a URL. Their placeholder (@URL@) is only valid JS inside a
// string or comment, so an unquoted URL fails like it does in the browser.
const URL_TAG = /\b(getImage|getMediaURL|truepath)\s*\(|\binstance\.domain\b/;

// Most branches any single {{if}} in src has (if + else-ifs + else).
function maxBranches(src) {
  let max = 1;
  const stack = [];
  for (const t of tokenize(src)) {
    if (t.type !== 'tag') continue;
    const kw = keyword(t.body);
    if (kw === 'if' || kw === 'each') stack.push(1);
    else if ((kw === 'else' || kw === 'else-if') && stack.length) max = Math.max(max, ++stack[stack.length - 1]);
    else if ((kw === 'close-if' || kw === 'close-each') && stack.length) stack.pop();
  }
  return max;
}

// Turns Parsley-laced JS into plain JS for a syntax check: keeps branch number
// `branch` of every if/else (0 = the if itself), swaps output tags for a
// placeholder and drops assignments. Removed text keeps its newlines so error
// lines still match. Check each branch from 0 to maxBranches(src) - 1.
function toPlainJs(src, branch = 0) {
  let out = '';
  const stack = [];
  const active = () => stack.every((s) => s.on);
  for (const t of tokenize(src)) {
    if (t.type === 'text') {
      out += active() ? t.value : blank(t.value);
      continue;
    }
    const kw = keyword(t.body);
    if (kw === 'if') stack.push({ n: 0, on: branch === 0 });
    else if (kw === 'each') stack.push({ n: 0, on: true });
    else if ((kw === 'else' || kw === 'else-if') && stack.length) {
      const top = stack[stack.length - 1];
      top.n++;
      top.on = top.n === branch;
    }
    else if ((kw === 'close-if' || kw === 'close-each') && stack.length) stack.pop();
    else if (!kw && active() && !/^\$[\w.]+\s*=(?!=)/.test(t.body)) {
      out += (URL_TAG.test(t.body) ? '@URL@' : '__P__') + blank(t.value);
      continue;
    }
    out += blank(t.value);
  }
  return out;
}

// Inline classic <script> blocks; external, JSON, template and module scripts are skipped.
function inlineScripts(src) {
  const out = [];
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(src))) {
    const attrs = m[1];
    if (/\bsrc\s*=/i.test(attrs)) continue;
    const type = (attrs.match(/\btype\s*=\s*["']?([^"'\s>]+)/i) || [])[1];
    if (type && !/^(text|application)\/javascript$/i.test(type)) continue;
    if (!m[2].trim()) continue;
    const bodyIndex = m.index + m[0].indexOf('>') + 1;
    out.push({ code: m[2], line: lineAt(src, bodyIndex) });
  }
  return out;
}

module.exports = {
  ROOT,
  VIEWS_DIR,
  listViews,
  listScripts,
  tokenize,
  checkBlocks,
  unbalancedTags,
  includes,
  maxBranches,
  toPlainJs,
  inlineScripts
};
