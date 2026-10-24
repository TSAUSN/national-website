const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

// Static checks on the files a PR changes (merge-base of DIFF_BASE...DIFF_HEAD).
// Read-only: no API calls, no writes. Exits 1 when any error is found.
const BASE_REF = process.env.BASE_REF || 'development';
const DIFF_BASE = process.env.DIFF_BASE || `origin/${BASE_REF}`;
const DIFF_HEAD = process.env.DIFF_HEAD || 'HEAD';
// Release branches get the stricter rules (no docs, no unmappable views).
const STRICT = ['stage', 'production'].includes(BASE_REF);

const EXCLUDED_DIRS = ['webengine/views/z/', 'webengine/views/menu-config/'];
const isExcluded = (p) => EXCLUDED_DIRS.some((d) => p.startsWith(d));
const isDoc = (p) => /\.md$/i.test(p) || p.startsWith('docs/') || p.startsWith('.claude/');

const DEBUG_PATTERNS = [
  { level: 'error', re: /(^|[\s;{}])debugger\s*(;|$)/, message: 'Leftover `debugger` statement.' },
  {
    level: 'warning',
    re: /\bconsole\.(log|debug|trace|dir|table)\s*\(/,
    message: 'Leftover console output. Remove it unless it is intentional.'
  },
  { level: 'warning', re: /\b(TODO|FIXME|HACK)\b/, message: 'TODO/FIXME note. Track it in Coda instead.' },
  {
    level: 'warning',
    re: /\bcoda[-_ ]?\d{3,}\b/i,
    message: 'Ticket reference in code. Put it in the commit or PR instead.'
  }
];

const findings = [];
const report = (level, file, line, message) => findings.push({ level, file, line, message });

function git(args) {
  return execFileSync('git', ['-c', 'core.quotePath=false', ...args], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024
  });
}

const readAtHead = (file) => git(['show', `${DIFF_HEAD}:${file}`]);

// Added/modified paths with their status. Renames count as delete + add.
function changedFiles() {
  const out = git(['diff', '--name-status', '-z', '--no-renames', '--diff-filter=AMT', `${DIFF_BASE}...${DIFF_HEAD}`]);
  const parts = out.split('\0').filter(Boolean);
  const files = [];
  for (let i = 0; i + 1 < parts.length; i += 2) files.push({ status: parts[i], file: parts[i + 1] });
  return files;
}

function checkPaths(files) {
  for (const { file } of files) {
    if (isExcluded(file)) {
      report('error', file, 1, 'Platform-owned path (layouts/menus are managed in the Zesty manager). Remove it from the PR.');
    } else if (STRICT && isDoc(file)) {
      report('error', file, 1, `Docs and .md files stay out of PRs into ${BASE_REF}.`);
    }
  }
}

// Parsley-templated .json views can't be parsed statically, so they're skipped.
function checkJson(files) {
  for (const { file } of files) {
    if (!file.endsWith('.json') || isExcluded(file)) continue;
    const raw = readAtHead(file);
    if (raw.includes('{{')) continue;
    try {
      JSON.parse(raw);
    } catch (err) {
      report('error', file, 1, `Invalid JSON: ${err.message}`);
    }
  }
}

function loadConfig() {
  try {
    return JSON.parse(readAtHead('zesty.config.json'));
  } catch (err) {
    report('error', 'zesty.config.json', 1, `Could not read config: ${err.message}`);
    return null;
  }
}

function checkConfig(config) {
  const seen = new Map();
  for (const [section, entries] of Object.entries((config && config.instance) || {})) {
    for (const [key, info] of Object.entries(entries || {})) {
      if (!info || !info.zuid) {
        report('error', 'zesty.config.json', 1, `${section}/${key} has no zuid.`);
        continue;
      }
      if (seen.has(info.zuid)) {
        report('error', 'zesty.config.json', 1, `ZUID ${info.zuid} is mapped twice: ${seen.get(info.zuid)} and ${section}/${key}.`);
      } else {
        seen.set(info.zuid, `${section}/${key}`);
      }
    }
  }
}

// The stage sync can't create extensionless views (templateset vs pageset is
// ambiguous), so a new one must be created in the manager and mapped first.
function checkNewViews(files, config) {
  const views = (config && config.instance && config.instance.views) || {};
  const mapped = new Set(Object.keys(views).map((k) => `webengine/views/${k.replace(/^\/+/, '')}`));
  for (const { status, file } of files) {
    if (status !== 'A' || !file.startsWith('webengine/views/') || isExcluded(file)) continue;
    if (file.split('/').some((seg) => seg.startsWith('.'))) continue;
    if (path.posix.extname(file) || mapped.has(file)) continue;
    report(
      STRICT ? 'error' : 'warning',
      file,
      1,
      'New extensionless view is not in zesty.config.json, so the stage sync will skip it. Create it in the Zesty manager (templateset or pageset) and map its ZUID.'
    );
  }
}

// Scans only lines the PR adds under webengine/, so existing code isn't flagged.
function checkDebugCode() {
  const out = git(['diff', '-U0', '--no-renames', '--diff-filter=AMT', `${DIFF_BASE}...${DIFF_HEAD}`, '--', 'webengine/']);
  let file = null;
  let line = 0;
  for (const text of out.split('\n')) {
    if (text.startsWith('+++ ')) {
      let name = text.slice(4).replace(/\t$/, '');
      if (name.startsWith('"')) {
        try {
          name = JSON.parse(name);
        } catch {}
      }
      file = name === '/dev/null' ? null : name.replace(/^b\//, '');
      if (file && isExcluded(file)) file = null;
    } else if (text.startsWith('@@')) {
      const m = text.match(/\+(\d+)/);
      line = m ? Number(m[1]) : 0;
    } else if (text.startsWith('+') && file) {
      for (const p of DEBUG_PATTERNS) {
        if (p.re.test(text.slice(1))) report(p.level, file, line, p.message);
      }
      line++;
    }
  }
}

const escapeData = (s) => String(s).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
const escapeProp = (s) => escapeData(s).replace(/:/g, '%3A').replace(/,/g, '%2C');

function emit() {
  const errors = findings.filter((f) => f.level === 'error');
  const warnings = findings.filter((f) => f.level === 'warning');
  for (const f of findings) {
    if (process.env.GITHUB_ACTIONS === 'true') {
      console.log(`::${f.level} file=${escapeProp(f.file)},line=${f.line}::${escapeData(f.message)}`);
    } else {
      console.log(`${f.level === 'error' ? '❌' : '⚠️ '} ${f.file}:${f.line} ${f.message}`);
    }
  }
  const summary = `${errors.length} error(s), ${warnings.length} warning(s)`;
  console.log(findings.length ? `\n${summary}` : '✓ No problems found');

  if (process.env.GITHUB_STEP_SUMMARY) {
    const rows = findings.map(
      (f) => `| ${f.level === 'error' ? '❌' : '⚠️'} | \`${f.file}:${f.line}\` | ${f.message.replace(/\|/g, '\\|')} |`
    );
    const md = [
      `## PR validation into \`${BASE_REF}\``,
      '',
      findings.length ? summary : 'No problems found.',
      '',
      ...(rows.length ? ['| | Location | Problem |', '| --- | --- | --- |', ...rows] : [])
    ].join('\n');
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n');
  }
  return errors.length;
}

function main() {
  let files;
  try {
    files = changedFiles();
  } catch (err) {
    console.error(`❌ Could not diff ${DIFF_BASE}...${DIFF_HEAD}: ${err.message}`);
    process.exit(1);
  }
  console.log(`Validating ${files.length} changed file(s), ${DIFF_BASE}...${DIFF_HEAD} into ${BASE_REF}${STRICT ? ' (strict)' : ''}\n`);

  const config = loadConfig();
  checkPaths(files);
  checkJson(files);
  checkConfig(config);
  checkNewViews(files, config);
  checkDebugCode();

  process.exit(emit() ? 1 : 0);
}

main();
