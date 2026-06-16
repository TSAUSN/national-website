const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const INSTANCE_ZUID = process.env.ZESTY_INSTANCE_ZUID;
const TOKEN = process.env.ZESTY_DEVELOPER_TOKEN;
const BRANCH = process.env.BRANCH || 'stage';
const MANUAL_PUBLISH = process.env.MANUAL_PUBLISH === 'true';
// REPORT emits a Markdown summary of what would change and never writes (implies dry-run).
const REPORT = process.env.REPORT === 'true' || process.argv.includes('--report');
const DRY_RUN = REPORT || process.env.DRY_RUN === 'true' || process.argv.includes('--dry-run');
// Branch model: merges into `stage` save files; merges into `production`
// save+publish them. By default only files changed by the push are touched
// (DIFF_BASE = the pre-push SHA); FULL_SYNC=true processes every mapped file.
const FULL_SYNC = process.env.FULL_SYNC === 'true' || process.argv.includes('--full');
// Hybrid verification: git diff picks candidates, then (when a token is present)
// the instance's current content is fetched and compared so no-op saves are
// skipped. NO_API_CHECK disables it.
const CAN_CHECK = !!(INSTANCE_ZUID && TOKEN) && process.env.NO_API_CHECK !== 'true';
const norm = (s) =>
  s == null
    ? ''
    : String(s)
        .replace(/\r\n/g, '\n')
        .replace(/[ \t]+$/gm, '')
        .replace(/\n+$/, '');

const CONFIG_PATH = path.join(process.cwd(), 'zesty.config.json');
const WEBENGINE_DIR = path.join(process.cwd(), 'webengine');

// Maps each config section to its on-disk folder and the Zesty API resource path.
const SECTIONS = {
  views: { dir: 'views', endpoint: 'views' },
  styles: { dir: 'styles', endpoint: 'stylesheets' },
  scripts: { dir: 'scripts', endpoint: 'scripts' }
};

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch (err) {
    console.error(`❌ Could not read ${CONFIG_PATH}: ${err.message}`);
    process.exit(1);
  }
}

// A config key may be a bare name ("home_page") or a path ("/components/header.html").
// Both resolve under webengine/<sectionDir>/. Guard against escaping that folder.
function resolveLocalPath(sectionDir, key) {
  const rel = key.replace(/^\/+/, '');
  const base = path.join(WEBENGINE_DIR, sectionDir);
  const full = path.join(base, rel);
  if (full !== base && !full.startsWith(base + path.sep)) {
    throw new Error(`Refusing path outside ${sectionDir}/: ${key}`);
  }
  return full;
}

function buildManifest(config) {
  const instance = config.instance || {};
  const items = [];
  for (const [section, meta] of Object.entries(SECTIONS)) {
    const entries = instance[section] || {};
    for (const [key, info] of Object.entries(entries)) {
      if (!info || !info.zuid) {
        console.warn(`⚠️  Skipping ${section}/${key}: missing zuid`);
        continue;
      }
      items.push({
        section,
        key,
        zuid: info.zuid,
        endpoint: meta.endpoint,
        localPath: resolveLocalPath(meta.dir, key)
      });
    }
  }
  return items;
}

// Repo-relative paths changed between DIFF_BASE and DIFF_HEAD. Returns null when
// there is no usable base to diff against (first push to a branch → DIFF_BASE is
// all-zeros; shallow clone; manual dispatch) so the caller falls back to a full
// sync. execFileSync (no shell) avoids any injection.
function changedFilePaths() {
  const base = process.env.DIFF_BASE;
  const head = process.env.DIFF_HEAD || 'HEAD';
  const isZero = (s) => !s || /^0+$/.test(s);
  if (isZero(base)) return null;
  try {
    const out = execFileSync('git', ['diff', '--name-only', base, head], {
      cwd: process.cwd(),
      encoding: 'utf8'
    });
    return new Set(
      out
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
    );
  } catch {
    return null;
  }
}

async function apiRequest(method, endpointPath, body) {
  const url = `https://${INSTANCE_ZUID}.api.zesty.io/v1${endpointPath}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${method} ${endpointPath} → ${res.status} ${text}`);
  }
  return res;
}

// Each resource exists in two statuses: "dev" (the stage/working copy) and
// "live" (what's published to production), each with its own code. Fetch the
// one the run needs (stage→dev, production→live) via ?status=, one list call
// per section, and build a zuid→code map. Resources missing from the map fall
// through to a write.
async function fetchInstanceCode(status) {
  const map = new Map();
  for (const meta of Object.values(SECTIONS)) {
    try {
      const url = `https://${INSTANCE_ZUID}.api.zesty.io/v1/web/${meta.endpoint}?status=${status}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
      if (!res.ok) continue;
      const json = await res.json();
      for (const item of json.data || []) {
        if (item && item.ZUID && typeof item.code === 'string') {
          map.set(item.ZUID, { code: item.code, version: item.version });
        }
      }
    } catch {
      /* leave map partial */
    }
  }
  return map;
}

// Every file currently on disk under webengine/<section>/ (skips dotfiles).
function walkFiles(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const out = [];
  for (const e of entries) {
    if (e.name.startsWith('.')) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walkFiles(full));
    else if (e.isFile()) out.push(full);
  }
  return out;
}

// Files present on disk but not yet mapped in zesty.config.json — these need
// to be CREATED as instance resources (the branch preview renders them from
// GitHub, but they don't exist in the instance until created).
function findNewFiles(mappedPaths) {
  const news = [];
  for (const [section, meta] of Object.entries(SECTIONS)) {
    const base = path.join(WEBENGINE_DIR, meta.dir);
    for (const full of walkFiles(base)) {
      if (mappedPaths.has(full)) continue;
      news.push({
        section,
        endpoint: meta.endpoint,
        localPath: full,
        rel: path.relative(base, full)
      });
    }
  }
  return news;
}

// Derive the Zesty fileName, resource type, and config key for a new file.
// Views with an extension are "endpoint" views (ajax-json, path-style fileName);
// extensionless views are snippets. Styles/scripts type comes from the extension.
function inferResource(section, rel) {
  const posix = rel.split(path.sep).join('/');
  const ext = path.extname(rel).toLowerCase();
  if (section === 'styles') {
    const type = ext === '.scss' ? 'text/scss' : ext === '.css' ? 'text/css' : 'text/less';
    return { fileName: posix, type, configKey: posix };
  }
  if (section === 'scripts') {
    return { fileName: posix, type: 'text/javascript', configKey: posix };
  }
  if (ext) {
    return { fileName: `/${posix}`, type: 'ajax-json', configKey: `/${posix}` };
  }
  return { fileName: posix, type: undefined, configKey: posix };
}

// Zesty wraps responses as { data: {...} } in most cases; be lenient.
function extractZuid(json) {
  const d = (json && json.data) || json || {};
  return d.ZUID || d.zuid || json.ZUID || json.zuid || null;
}

// POST /web/<endpoint> to create a brand-new resource, returning its new ZUID.
// Returns null when the resource can't be auto-created (e.g. extensionless view
// where templateset vs pageset can't be inferred from the filename). The caller
// must filter nulls before treating the array as a list of created resources.
async function createNew(nf, publish) {
  const code = fs.readFileSync(nf.localPath, 'utf8');
  const { fileName, type, configKey } = inferResource(nf.section, nf.rel);
  const rel = path.relative(process.cwd(), nf.localPath);
  // /web/views POST requires a `type`, but extensionless view files
  // (templateset = parent URL view, pageset = per-instance view) can't be
  // disambiguated from the filename alone. Skip with a warning rather than
  // failing the whole sync — the resource needs to be created in the Zesty
  // admin and its ZUID added to zesty.config.json before sync will manage it.
  if (nf.endpoint === 'views' && !type) {
    console.log(
      `⏭️  Skip ${rel} → ${nf.endpoint} (fileName=${fileName}) — view type can't be inferred for extensionless view. Create it in the Zesty admin (templateset for a parent URL view, pageset for a per-instance view), then add its ZUID to zesty.config.json.`
    );
    return null;
  }
  console.log(
    `✨ ${DRY_RUN ? '[dry-run] ' : ''}Create ${rel} → ${nf.endpoint} (fileName=${fileName}${type ? `, type=${type}` : ''})`
  );
  if (DRY_RUN) return { section: nf.section, configKey, zuid: 'DRYRUN-ZUID', type };
  const payload = type ? { code, fileName, type } : { code, fileName };
  const res = await apiRequest('POST', `/web/${nf.endpoint}`, payload);
  const json = await res.json().catch(() => ({}));
  const zuid = extractZuid(json);
  if (!zuid) {
    throw new Error(
      `Created ${rel} but no ZUID in response: ${JSON.stringify(json).slice(0, 200)}`
    );
  }
  console.log(`   → new ZUID ${zuid}`);
  if (publish) {
    await apiRequest('PUT', `/web/${nf.endpoint}/${zuid}?action=publish&purge_cache=true`, {
      code
    });
    console.log(`   → published ${zuid}`);
  }
  return { section: nf.section, configKey, zuid, type };
}

// Match the existing config's indentation so the writeback diff stays small.
function detectIndent(raw) {
  const m = raw.match(/\n([ \t]+)"/);
  return m ? m[1] : '  ';
}

function addToConfig(config, created) {
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  config.instance = config.instance || {};
  for (const c of created) {
    config.instance[c.section] = config.instance[c.section] || {};
    config.instance[c.section][c.configKey] = {
      zuid: c.zuid,
      type: c.type || 'snippet',
      updatedAt: now,
      createdAt: now
    };
  }
}

// STAGE: write the repo file to the resource's dev (working) version. Compares
// to current dev content and skips if identical. Never publishes.
async function saveDevItem(item, devMap) {
  const rel = path.relative(process.cwd(), item.localPath);
  if (!fs.existsSync(item.localPath)) {
    console.warn(`⚠️  Missing local file, skipping: ${rel}`);
    return null;
  }
  const code = fs.readFileSync(item.localPath, 'utf8');
  const dry = DRY_RUN ? '[dry-run] ' : '';
  if (devMap) {
    const current = devMap.get(item.zuid);
    if (current && norm(current.code) === norm(code)) {
      console.log(`✓ ${dry}Unchanged, skip ${rel} → ${item.endpoint}/${item.zuid}`);
      return null;
    }
  }
  console.log(`💾 ${dry}Save ${rel} → ${item.endpoint}/${item.zuid}`);
  if (!DRY_RUN) {
    await apiRequest('PUT', `/web/${item.endpoint}/${item.zuid}`, { code });
  }
  return rel;
}

// PRODUCTION: publish only — promote the resource's dev version to live where
// they differ. Never writes repo content, never creates. A resource not yet on
// dev is skipped (it must be saved via stage first).
async function publishItem(item, devMap, liveMap) {
  const rel = path.relative(process.cwd(), item.localPath);
  const dry = DRY_RUN ? '[dry-run] ' : '';
  if (!devMap || !liveMap) {
    console.warn(`⚠️  ${dry}No dev/live data (token?), skip ${rel}`);
    return null;
  }
  const dev = devMap.get(item.zuid);
  if (!dev) {
    console.warn(`⚠️  ${dry}Not on dev yet — promote via stage, skip ${rel} → ${item.zuid}`);
    return null;
  }
  const live = liveMap.get(item.zuid);
  if (live && norm(live.code) === norm(dev.code)) {
    console.log(`✓ ${dry}Already live, skip ${rel} → ${item.endpoint}/${item.zuid}`);
    return null;
  }
  if (dev.version === undefined || dev.version === null) {
    console.warn(`⚠️  ${dry}No dev version number, skip ${rel} → ${item.zuid}`);
    return null;
  }
  console.log(`🚀 ${dry}Publish v${dev.version} (dev→live) ${rel} → ${item.endpoint}/${item.zuid}`);
  if (!DRY_RUN) {
    // Publish the existing dev version by number — no re-save, no new version.
    await apiRequest(
      'POST',
      `/web/${item.endpoint}/${item.zuid}/versions/${dev.version}?purge_cache=true`,
      {}
    );
  }
  return rel;
}

// Markdown summary for a PR comment. Stage shows what gets added/updated (vs
// dev); production is publish-only and shows what gets promoted dev→live.
function reportMarkdown({ created, written, skipped, publish, total, newCount = 0 }) {
  const list = (arr) => (arr.length ? arr.map((r) => `- \`${r}\``).join('\n') : '_none_');
  if (publish) {
    const lines = [
      '### 🚀 Production publish preview (publish-only)',
      '',
      `**Will publish — promote dev → live (${written.length}):**`,
      list(written),
      '',
      `**Already live, skipped:** ${skipped}`
    ];
    if (newCount) {
      lines.push(
        '',
        `> ⚠️ ${newCount} new file(s) in this diff won't be created on production (publish-only). Promote them via \`stage\` first.`
      );
    }
    lines.push(
      '',
      `<sub>${total} mapped resources · publish-only · zesty-sync</sub>`,
      '<!-- zesty-sync-report -->'
    );
    return lines.join('\n');
  }
  return [
    '### 💾 Stage sync preview',
    '',
    `**New files to create (${created.length}):**`,
    list(created),
    '',
    `**Will add/update — differ from dev (${written.length}):**`,
    list(written),
    '',
    `**Unchanged, skipped:** ${skipped}`,
    '',
    `<sub>${total} mapped resources · zesty-sync</sub>`,
    '<!-- zesty-sync-report -->'
  ].join('\n');
}

function emitReport(args) {
  if (!REPORT) return;
  const md = reportMarkdown(args);
  fs.writeFileSync(path.join(process.cwd(), 'zesty-report.md'), md + '\n');
  console.log('\n' + md);
}

// STAGE: create new resources, then save changed files to their dev version. No publish.
async function runStage(items, newFiles, manifest, config, indent) {
  const created = [];
  const createdRels = [];
  for (const nf of newFiles) {
    const result = await createNew(nf, false);
    if (result) {
      created.push(result);
      createdRels.push(path.relative(process.cwd(), nf.localPath));
    }
  }
  if (created.length && !DRY_RUN) {
    addToConfig(config, created);
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, indent) + '\n');
    console.log(`📝 Mapped ${created.length} new resource(s) into zesty.config.json.`);
  }
  const devMap = CAN_CHECK ? await fetchInstanceCode('dev') : null;
  const written = [];
  let skipped = 0;
  for (const item of items) {
    const r = await saveDevItem(item, devMap);
    if (r) written.push(r);
    else skipped++;
  }
  emitReport({ created: createdRels, written, skipped, publish: false, total: manifest.length });
  console.log(
    `\n🎉 Stage sync complete — created ${created.length}, saved ${written.length}/${items.length} to dev.`
  );
}

// PRODUCTION: publish only — promote dev→live for changed resources. No creates, no content writes.
async function runProduction(items, newFiles, manifest) {
  if (newFiles.length) {
    console.warn(
      `⚠️  ${newFiles.length} new file(s) in scope won't be created on production (publish-only) — promote via stage first:`
    );
    for (const nf of newFiles) console.warn(`   - ${path.relative(process.cwd(), nf.localPath)}`);
  }
  const devMap = CAN_CHECK ? await fetchInstanceCode('dev') : null;
  const liveMap = CAN_CHECK ? await fetchInstanceCode('live') : null;
  const published = [];
  let skipped = 0;
  for (const item of items) {
    const r = await publishItem(item, devMap, liveMap);
    if (r) published.push(r);
    else skipped++;
  }
  emitReport({
    created: [],
    written: published,
    skipped,
    publish: true,
    total: manifest.length,
    newCount: newFiles.length
  });
  console.log(
    `\n🎉 Production publish complete — promoted ${published.length}/${items.length} dev→live.`
  );
}

async function main() {
  if (!DRY_RUN && (!INSTANCE_ZUID || !TOKEN)) {
    console.error('❌ Missing ZESTY_INSTANCE_ZUID or ZESTY_DEVELOPER_TOKEN in environment');
    process.exit(1);
  }

  const config = loadConfig();
  const indent = detectIndent(fs.readFileSync(CONFIG_PATH, 'utf8'));
  const manifest = buildManifest(config);
  const mappedPaths = new Set(manifest.map((m) => m.localPath));
  const shouldPublish = BRANCH === 'production' || MANUAL_PUBLISH;

  // Updates = files already mapped by ZUID; creates = on disk but not yet mapped.
  let items = manifest;
  let newFiles = findNewFiles(mappedPaths);
  let scope = `full (${manifest.length} mapped + ${newFiles.length} new)`;
  if (!FULL_SYNC) {
    const changed = changedFilePaths();
    if (changed === null) {
      console.warn('⚠️  Could not determine changed files — falling back to a full sync.');
    } else {
      const inScope = (p) => changed.has(path.relative(process.cwd(), p));
      items = manifest.filter((it) => inScope(it.localPath));
      newFiles = newFiles.filter((nf) => inScope(nf.localPath));
      scope = `changed (${items.length} update + ${newFiles.length} new, of ${manifest.length} mapped)`;
    }
  }

  console.log(
    `🚀 Zesty ${shouldPublish ? 'publish' : 'sync'} | branch=${BRANCH} | dry-run=${DRY_RUN} | scope=${scope}`
  );

  // stage = create + save (repo→dev); production = publish only (dev→live).
  if (shouldPublish) await runProduction(items, newFiles, manifest);
  else await runStage(items, newFiles, manifest, config, indent);
}

main().catch((err) => {
  console.error('💥 Error:', err.message);
  process.exit(1);
});
