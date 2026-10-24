const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const INSTANCE_ZUID = process.env.ZESTY_INSTANCE_ZUID;
const TOKEN = process.env.ZESTY_DEVELOPER_TOKEN;
const BRANCH = process.env.BRANCH || 'stage';
const MANUAL_PUBLISH = process.env.MANUAL_PUBLISH === 'true';
// REPORT emits a Markdown summary of what would change and never writes (implies dry-run).
const REPORT = process.env.REPORT === 'true' || process.argv.includes('--report');
// CHECK is the read-only preflight for PRs into stage; VERIFY compares git with
// dev (stage) or live (production) after a deploy. Both cover every file unless
// DIFF_BASE narrows them (see main).
const CHECK = process.env.CHECK === 'true' || process.argv.includes('--check');
const VERIFY = process.env.VERIFY === 'true' || process.argv.includes('--verify');
// CHECK treats dev code that matches no recent git version as blocking unless this is set.
const ALLOW_DRIFT = process.env.ALLOW_DRIFT === 'true';
// Every read-only mode implies dry-run, and apiRequest refuses anything but GET in it.
const DRY_RUN =
  REPORT ||
  CHECK ||
  VERIFY ||
  process.env.DRY_RUN === 'true' ||
  process.argv.includes('--dry-run');
// Branch model: merges into `stage` save files to dev; merges into `production`
// publish dev→live, only where dev holds the branch's file. By default only files
// changed since DIFF_BASE (or whose mapping changed) are touched; FULL_SYNC=true
// processes every mapped file.
const FULL_SYNC = process.env.FULL_SYNC === 'true' || process.argv.includes('--full');
// Hybrid verification: git diff picks candidates, then (when a token is present)
// the instance's current content is fetched and compared so no-op saves are
// skipped. NO_API_CHECK disables it (dry runs only; main() refuses it otherwise).
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

// Repo-relative path with forward slashes, so it compares equal to git output on every OS.
const relPath = (p) => path.relative(process.cwd(), p).split(path.sep).join('/');

// Maps each config section to its on-disk folder and the Zesty API resource path.
const SECTIONS = {
  views: { dir: 'views', endpoint: 'views' },
  styles: { dir: 'styles', endpoint: 'stylesheets' },
  scripts: { dir: 'scripts', endpoint: 'scripts' }
};

// Managed in the Zesty manager, not git (layouts, menus). Never saved, created,
// or published from here, even if they appear in a diff or on disk.
const EXCLUDED_DIRS = ['views/z', 'views/menu-config'].map((d) => path.join(WEBENGINE_DIR, d));
const isExcluded = (p) => EXCLUDED_DIRS.some((d) => p === d || p.startsWith(d + path.sep));

// Owned outside this sync: never saved, published, created, adopted or compared
// from here. Paths are relative to webengine/; one ending in "/" covers a folder.
const OWNED_ELSEWHERE = [
  // Written on the instance by scripts/locations-endpoint-sync; git only holds a placeholder.
  { path: 'views/locations.json', owner: 'locations-endpoint-sync' },
  { path: 'views/locations-dev.json', owner: 'locations-endpoint-sync' },
  // Maintained by the mobile app's developer.
  { path: 'views/datasets/mobile_editor/', owner: 'mobile app developer' }
];
// Website files inside an owned-elsewhere folder that this sync still manages.
const MANAGED_EXCEPTIONS = ['views/datasets/mobile_editor/content_list/tags_stories.json'];
function ownerOf(p) {
  const rel = path.relative(WEBENGINE_DIR, p).split(path.sep).join('/');
  if (MANAGED_EXCEPTIONS.includes(rel)) return null;
  return (
    OWNED_ELSEWHERE.find((o) => (o.path.endsWith('/') ? rel.startsWith(o.path) : rel === o.path)) ||
    null
  );
}

// What the run leaves out on purpose, for one info block in the summaries:
// owned-elsewhere files, and wildcard-route keys (e.g. "/tags-pages/*/index.parsley")
// that can't exist as files.
const notManaged = { owned: new Map(), wildcard: [] };
function noteOwned(owner, p) {
  if (!notManaged.owned.has(owner)) notManaged.owned.set(owner, new Set());
  notManaged.owned.get(owner).add(p);
}

// Drift classification looks back this many commits per file, for at most this many files.
const HISTORY_DEPTH = 30;
const HISTORY_FILE_LIMIT = 500;

// Per-file failures. The run keeps going past them and exits 1 at the end.
const failures = [];
function recordFailure(file, action, err) {
  const error = err instanceof Error ? err.message : String(err);
  failures.push({ file, action, error });
  console.error(`❌ ${action} failed for ${file}: ${error}`);
}

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
      if (key.includes('*')) {
        notManaged.wildcard.push({ section, key, zuid: info.zuid });
        continue;
      }
      const localPath = resolveLocalPath(meta.dir, key);
      if (isExcluded(localPath)) continue;
      const owner = ownerOf(localPath);
      if (owner) {
        noteOwned(owner, localPath);
        continue;
      }
      items.push({
        section,
        key,
        zuid: info.zuid,
        endpoint: meta.endpoint,
        localPath
      });
    }
  }
  return items;
}

// zuid → ["section: key", ...] across every config entry, excluded ones included.
function zuidOwners(config) {
  const owners = new Map();
  for (const section of Object.keys(SECTIONS)) {
    for (const [key, info] of Object.entries((config.instance || {})[section] || {})) {
      if (!info || !info.zuid) continue;
      if (!owners.has(info.zuid)) owners.set(info.zuid, []);
      owners.get(info.zuid).push(`${section}: ${key}`);
    }
  }
  return owners;
}

// Repo-relative paths changed between DIFF_BASE and DIFF_HEAD. Returns null when
// there is no base to diff against (first push to a branch → DIFF_BASE is
// all-zeros; manual dispatch) so the caller falls back to a full sync. If a real
// DIFF_BASE can't be diffed (e.g. missing from a shallow clone), a writing run
// exits instead of silently widening to a full sync; read-only runs fall back.
// --no-renames lists a rename as delete + add, so the old path stays in scope.
// execFileSync (no shell) avoids any injection.
function changedFilePaths() {
  const base = process.env.DIFF_BASE;
  const head = process.env.DIFF_HEAD || 'HEAD';
  const isZero = (s) => !s || /^0+$/.test(s);
  if (isZero(base)) return null;
  try {
    const out = execFileSync('git', ['diff', '--name-only', '--no-renames', base, head], {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    return new Set(
      out
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
    );
  } catch (err) {
    const why = String((err.stderr || err.message || '').toString().trim()).split('\n')[0];
    if (!DRY_RUN) {
      console.error(
        `❌ git diff ${base}..${head} failed (${why}). Refusing to fall back to a full run; nothing was written.`
      );
      process.exit(1);
    }
    console.warn(`⚠️  git diff ${base}..${head} failed (${why}); read-only run, using full scope.`);
    return null;
  }
}

async function apiRequest(method, endpointPath, body) {
  // Hard guard: dry-run, report, check and verify runs may only read.
  if (DRY_RUN && method !== 'GET') {
    throw new Error(`Refusing ${method} ${endpointPath} in a read-only run`);
  }
  const url = `https://${INSTANCE_ZUID}.api.zesty.io/v1${endpointPath}`;
  const headers = { Authorization: `Bearer ${TOKEN}` };
  const init = { method, headers };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  const res = await fetch(url, init);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${method} ${endpointPath} → ${res.status} ${text}`);
  }
  return res;
}

// Each resource exists in two statuses: "dev" (the stage/working copy) and
// "live" (what's published to production), each with its own code. Fetch the
// one the run needs (stage→dev, production→live) via ?status=, one list call
// per section. Returns a zuid→code map, each section's resources (for adopting
// unmapped files by fileName), and the sections whose listing failed, so a
// missing listing is never mistaken for "everything differs".
async function fetchInstanceCode(status) {
  const map = new Map();
  const files = {};
  const failed = new Set();
  for (const [section, meta] of Object.entries(SECTIONS)) {
    try {
      // GET responses are cached per URL; a unique param returns current content.
      const res = await apiRequest('GET', `/web/${meta.endpoint}?status=${status}&_=${Date.now()}`);
      const json = await res.json();
      if (!Array.isArray(json.data)) throw new Error('response has no data array');
      files[section] = [];
      for (const item of json.data) {
        if (!item || !item.ZUID) continue;
        if (typeof item.code === 'string') {
          map.set(item.ZUID, { code: item.code, version: item.version });
        }
        files[section].push({ zuid: item.ZUID, fileName: item.fileName, type: item.type });
      }
    } catch (err) {
      failed.add(section);
      delete files[section];
      console.error(`❌ Could not list ${status} ${meta.endpoint}: ${err.message}`);
    }
  }
  return { map, files, failed };
}

// Never write blind: a section without a listing would turn every item in it
// into a write. Writing runs abort before touching anything; read-only runs
// record the gap and drop that section's items from the comparison.
function requireListing(listing, sections, status) {
  const missing = [...sections].filter((s) => listing.failed.has(s));
  if (!missing.length) return;
  if (!DRY_RUN) {
    throw new Error(
      `No ${status} listing for ${missing.join(', ')} — aborting before any write (the instance was not changed).`
    );
  }
  for (const s of missing) {
    recordFailure(`webengine/${SECTIONS[s].dir}/`, `list ${status}`, 'listing failed; not compared');
  }
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
      if (mappedPaths.has(full) || isExcluded(full)) continue;
      const owner = ownerOf(full);
      if (owner) {
        noteOwned(owner, full);
        continue;
      }
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

// Sort new files into adopt / create / blocked. A new file whose name matches
// exactly one resource already on the instance (unmapped, e.g. created in the
// manager or by a run whose mapping was lost) is adopted: mapped to that ZUID
// and saved like any other item. Instance fileNames may or may not carry a
// leading "/", so both sides are compared without it. Without a listing (no
// token) every file goes to create, as before. `differs` marks an adoption whose
// instance code isn't the local file's.
function planNewFiles(newFiles, listing, config) {
  const owners = zuidOwners(config);
  const bySection = {};
  for (const [section, resources] of Object.entries((listing && listing.files) || {})) {
    const byName = new Map();
    for (const r of resources) {
      if (typeof r.fileName !== 'string') continue;
      const name = r.fileName.replace(/^\/+/, '');
      if (!byName.has(name)) byName.set(name, []);
      byName.get(name).push(r);
    }
    bySection[section] = byName;
  }
  const plan = { create: [], adopt: [], blocked: [] };
  for (const nf of newFiles) {
    const name = nf.rel.split(path.sep).join('/');
    const { fileName, type } = inferResource(nf.section, nf.rel);
    const byName = bySection[nf.section];
    if (!byName) {
      plan.create.push(nf);
      continue;
    }
    const matches = byName.get(name) || [];
    if (matches.length > 1) {
      plan.blocked.push({
        nf,
        action: 'adopt',
        reason: `${matches.length} instance resources are named ${name} (${matches.map((m) => m.zuid).join(', ')}); map the right one in zesty.config.json by hand`
      });
    } else if (matches.length === 1) {
      const m = matches[0];
      const owner = owners.get(m.zuid);
      if (owner) {
        plan.blocked.push({
          nf,
          action: 'adopt',
          reason: `instance resource ${m.zuid} (${m.fileName}) is already mapped as ${owner.join(', ')}`
        });
      } else {
        // Adopting then saving overwrites the instance code, so flag when it differs.
        const current = listing.map.get(m.zuid);
        const instanceCode = current ? current.code : null;
        const differs =
          instanceCode === null || norm(instanceCode) !== norm(fs.readFileSync(nf.localPath, 'utf8'));
        plan.adopt.push({ nf, resource: m, differs, instanceCode });
      }
    } else if (nf.endpoint === 'views' && !type) {
      plan.blocked.push({
        nf,
        action: 'create',
        reason: `view type can't be inferred for extensionless view (fileName=${fileName}) and no instance resource has that name. Create it in the Zesty admin (templateset for a parent URL view, pageset for a per-instance view), then add its ZUID to zesty.config.json.`
      });
    } else {
      plan.create.push(nf);
    }
  }
  return plan;
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
  const rel = relPath(nf.localPath);
  // /web/views POST requires a `type`, but extensionless view files
  // (templateset = parent URL view, pageset = per-instance view) can't be
  // disambiguated from the filename alone. With a listing, planNewFiles has
  // already adopted or blocked these; this skip only happens without a token.
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
    // A failed publish must not lose the new ZUID, so record it and carry on.
    try {
      await apiRequest('PUT', `/web/${nf.endpoint}/${zuid}?action=publish&purge_cache=true`, {
        code
      });
      console.log(`   → published ${zuid}`);
    } catch (err) {
      recordFailure(rel, 'publish', err);
    }
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

// Atomic: write a temp file beside the config, then rename it over the original,
// so an interrupted run never leaves a truncated zesty.config.json.
function writeConfig(config, indent) {
  const tmp = `${CONFIG_PATH}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(tmp, JSON.stringify(config, null, indent) + '\n');
    fs.renameSync(tmp, CONFIG_PATH);
  } catch (err) {
    fs.rmSync(tmp, { force: true });
    throw err;
  }
}

// STAGE: write the repo file to the resource's dev (working) version. Compares
// to current dev content and skips if identical. Never publishes.
async function saveDevItem(item, devMap) {
  const rel = relPath(item.localPath);
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

// PRODUCTION: publish only — promote the resource's dev version to live, and
// only when that version is this branch's file, so live always ends up equal to
// git. Never writes repo content, never creates. Anything that can't be
// published as git has it throws, so the run fails and the next one retries it.
async function publishItem(item, devMap, liveMap) {
  const rel = relPath(item.localPath);
  const dry = DRY_RUN ? '[dry-run] ' : '';
  if (!devMap || !liveMap) {
    console.warn(`⚠️  ${dry}No dev/live data (token?), skip ${rel}`);
    return null;
  }
  if (!fs.existsSync(item.localPath)) {
    console.warn(`⚠️  ${dry}Missing local file, skipping: ${rel}`);
    return null;
  }
  const code = fs.readFileSync(item.localPath, 'utf8');
  const live = liveMap.get(item.zuid);
  if (live && norm(live.code) === norm(code)) {
    console.log(`✓ ${dry}Already live, skip ${rel} → ${item.endpoint}/${item.zuid}`);
    return null;
  }
  const dev = devMap.get(item.zuid);
  if (!dev) {
    throw new Error('not on dev yet; merge it through stage first so the stage sync saves it');
  }
  // Publishing dev as-is would ship whatever dev holds: a newer stage change, a
  // manager edit, or a branch preview's leak.
  if (norm(dev.code) !== norm(code)) {
    throw new Error(
      "dev holds different code than this branch (a newer stage change, a manager edit, or a failed stage sync); get this version onto dev through stage, then re-run"
    );
  }
  if (dev.version === undefined || dev.version === null) {
    throw new Error('dev has no version number to publish');
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

// Markdown bullet list, capped so a PR comment stays under GitHub's size limit.
function mdList(arr, max = 200) {
  if (!arr.length) return '_none_';
  const lines = arr.slice(0, max).map((r) => `- ${r}`);
  if (arr.length > max) lines.push(`- _…and ${arr.length - max} more_`);
  return lines.join('\n');
}
const mdCode = (s) => `\`${s}\``;
const failureLines = (list) => list.map((f) => `${mdCode(f.file)} — ${f.action}: ${f.error}`);

// Markdown summary for a PR comment. Stage shows what gets added/updated (vs
// dev); production is publish-only and shows what gets promoted dev→live.
// `adopted` is [{ rel, differs }]; `missingLocal` holds ready-made Markdown labels.
function reportMarkdown({
  created,
  adopted = [],
  written,
  skipped,
  publish,
  total,
  newCount = 0,
  missingLocal = []
}) {
  const list = (arr) => mdList(arr.map(mdCode));
  const failed = failures.length
    ? ['', `**❌ Failed (${failures.length}):**`, mdList(failureLines(failures))]
    : [];
  const notManagedBlock = ['', ...notManagedLines()];
  if (publish) {
    const lines = [
      '### 🚀 Production publish preview (publish-only)',
      '',
      `**Will publish — promote dev → live (${written.length}):**`,
      list(written),
      '',
      `**Already live, skipped:** ${skipped}`,
      ...notManagedBlock,
      ...failed
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
    `**Existing resources to adopt (${adopted.length}):**`,
    mdList(
      adopted.map(
        (a) => mdCode(a.rel) + (a.differs ? ' — ⚠️ dev code differs and will be overwritten' : '')
      )
    ),
    '',
    `**Will add/update — differ from dev (${written.length}):**`,
    list(written),
    '',
    `**Unchanged, skipped:** ${skipped}`,
    '',
    `**⚠️ Mapped keys with no local file, skipped (${missingLocal.length}):**`,
    mdList(missingLocal),
    ...notManagedBlock,
    ...failed,
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

// Sections a run needs a listing for: those with mapped items or new files in scope.
const sectionsOf = (...lists) => new Set(lists.flat().map((x) => x.section));

// STAGE: create or adopt new resources, then save changed files to their dev version. No publish.
async function runStage(items, newFiles, manifest, config, indent) {
  const dev = CAN_CHECK ? await fetchInstanceCode('dev') : null;
  if (dev) {
    requireListing(dev, sectionsOf(items, newFiles), 'dev');
    items = items.filter((it) => !dev.failed.has(it.section));
    newFiles = newFiles.filter((nf) => !dev.failed.has(nf.section));
  }
  const devMap = dev ? dev.map : null;
  const plan = planNewFiles(newFiles, dev, config);
  for (const b of plan.blocked) recordFailure(relPath(b.nf.localPath), b.action, b.reason);

  const created = [];
  const createdRels = [];
  for (const nf of plan.create) {
    try {
      const result = await createNew(nf, false);
      if (result) {
        created.push(result);
        createdRels.push(relPath(nf.localPath));
      }
    } catch (err) {
      recordFailure(relPath(nf.localPath), 'create', err);
    }
  }
  const adoptedRels = [];
  const adoptedItems = [];
  for (const { nf, resource, differs } of plan.adopt) {
    const rel = relPath(nf.localPath);
    console.log(
      `🔗 ${DRY_RUN ? '[dry-run] ' : ''}Adopt ${rel} → ${nf.endpoint}/${resource.zuid} (fileName=${resource.fileName}, type=${resource.type})${differs ? ' — dev code differs, will be overwritten' : ''}`
    );
    created.push({
      section: nf.section,
      configKey: resource.fileName,
      zuid: resource.zuid,
      type: resource.type
    });
    adoptedRels.push({ rel, differs });
    adoptedItems.push({
      section: nf.section,
      key: resource.fileName,
      zuid: resource.zuid,
      endpoint: nf.endpoint,
      localPath: nf.localPath
    });
  }
  // Written before any save, so new ZUIDs survive even if later files fail.
  if (created.length && !DRY_RUN) {
    addToConfig(config, created);
    writeConfig(config, indent);
    console.log(`📝 Mapped ${created.length} new resource(s) into zesty.config.json.`);
  }
  const toSave = items.concat(adoptedItems);
  const written = [];
  let skipped = 0;
  for (const item of toSave) {
    try {
      const r = await saveDevItem(item, devMap);
      if (r) written.push(r);
      else skipped++;
    } catch (err) {
      recordFailure(relPath(item.localPath), 'save', err);
    }
  }
  const missingLocal = toSave
    .filter((it) => !fs.existsSync(it.localPath))
    .map((item) => keyLabel({ item }));
  emitReport({
    created: createdRels,
    adopted: adoptedRels,
    written,
    skipped: skipped - missingLocal.length,
    publish: false,
    total: manifest.length,
    missingLocal
  });
  const counts = `created ${createdRels.length}, adopted ${adoptedRels.length}, saved ${written.length}/${toSave.length} to dev`;
  console.log(
    failures.length
      ? `\n⚠️ Stage sync finished with ${failures.length} failure(s) — ${counts}.`
      : `\n🎉 Stage sync complete — ${counts}.`
  );
}

// PRODUCTION: publish only — promote dev→live for changed resources. No creates, no content writes.
// An unmapped file in scope is a failure: production can't create it, and once
// its mapping arrives through stage the config-key scope brings it back.
async function runProduction(items, newFiles, manifest) {
  for (const nf of newFiles) {
    recordFailure(
      relPath(nf.localPath),
      'publish',
      "not mapped in zesty.config.json; production can't create resources, so merge it through stage first"
    );
  }
  const dev = CAN_CHECK ? await fetchInstanceCode('dev') : null;
  const live = CAN_CHECK ? await fetchInstanceCode('live') : null;
  if (dev && live) {
    const needed = sectionsOf(items);
    requireListing(dev, needed, 'dev');
    requireListing(live, needed, 'live');
    items = items.filter((it) => !dev.failed.has(it.section) && !live.failed.has(it.section));
  }
  const devMap = dev ? dev.map : null;
  const liveMap = live ? live.map : null;
  const published = [];
  let skipped = 0;
  for (const item of items) {
    try {
      const r = await publishItem(item, devMap, liveMap);
      if (r) published.push(r);
      else skipped++;
    } catch (err) {
      recordFailure(relPath(item.localPath), 'publish', err);
    }
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
    failures.length
      ? `\n⚠️ Production publish finished with ${failures.length} failure(s) — promoted ${published.length}/${items.length} dev→live.`
      : `\n🎉 Production publish complete — promoted ${published.length}/${items.length} dev→live.`
  );
}

// The most recent of the last HISTORY_DEPTH commits touching relFile whose
// version equals instanceCode: its SHA, false if none matches, or null when no
// answer is possible (not a git checkout, or a shallow clone whose missing
// history could hold a match).
let shallowRepo;
function gitHistoryMatch(relFile, instanceCode) {
  const git = (args) =>
    execFileSync('git', ['--literal-pathspecs', ...args], {
      cwd: process.cwd(),
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'ignore']
    });
  if (shallowRepo === undefined) {
    try {
      shallowRepo = git(['rev-parse', '--is-shallow-repository']).trim() === 'true';
    } catch {
      shallowRepo = null;
    }
  }
  if (shallowRepo !== false) return null;
  let shas;
  try {
    shas = git(['log', '--format=%H', '-n', String(HISTORY_DEPTH), '--', relFile])
      .split('\n')
      .filter(Boolean);
  } catch {
    return null;
  }
  if (!shas.length) return null;
  const target = norm(instanceCode);
  for (const sha of shas) {
    let blob;
    try {
      blob = git(['show', `${sha}:./${relFile}`]);
    } catch {
      continue; // the commit deleted or renamed the file
    }
    if (norm(blob) === target) return sha;
  }
  return false;
}

// Sorts a file whose instance code differs from disk into "behind git" (the
// instance holds an earlier git version; a sync catches up), "not from git"
// (likely a manager-only edit a sync would overwrite) or "unclassified" (no
// usable history, or past the lookup cap).
function classifyDrift(out, entry, instanceCode) {
  if (out.lookups >= HISTORY_FILE_LIMIT) {
    out.truncated = true;
    out.unclassified.push({ ...entry, reason: 'lookup cap reached' });
    return;
  }
  out.lookups++;
  const sha = gitHistoryMatch(entry.rel, instanceCode);
  if (sha === null) {
    out.unclassified.push({ ...entry, reason: shallowRepo ? 'shallow clone' : 'no git history' });
  } else if (sha) out.behind.push({ ...entry, sha });
  else out.notFromGit.push(entry);
}

// Compare every mapped file on disk with the instance's code for one status.
// `extra` adds already-differing entries (e.g. adopt candidates). Differences
// are classified with `first` entries ahead, so the history lookup cap is spent
// on them before anything else.
function compareWithInstance(manifest, listing, { extra = [], first = () => false } = {}) {
  const out = {
    compared: 0,
    lookups: 0,
    truncated: false,
    missingLocal: [],
    missingOnInstance: [],
    behind: [],
    notFromGit: [],
    unclassified: []
  };
  const differing = [];
  for (const item of manifest) {
    const rel = relPath(item.localPath);
    if (!fs.existsSync(item.localPath)) {
      out.missingLocal.push({ rel, item });
      continue;
    }
    if (listing.failed.has(item.section)) continue;
    const current = listing.map.get(item.zuid);
    if (!current) {
      out.missingOnInstance.push({ rel, item });
      continue;
    }
    out.compared++;
    if (norm(current.code) === norm(fs.readFileSync(item.localPath, 'utf8'))) continue;
    differing.push({ entry: { rel, item }, code: current.code });
  }
  differing.push(...extra);
  const ordered = differing
    .filter((d) => first(d.entry))
    .concat(differing.filter((d) => !first(d.entry)));
  for (const d of ordered) classifyDrift(out, d.entry, d.code);
  return out;
}

const keyLabel = (m) => `${mdCode(`${m.item.section}: ${m.item.key}`)} → ${m.item.zuid}`;
const target = (x) =>
  `${mdCode(x.rel)} → ${x.item.endpoint}/${x.item.zuid}${x.adopt ? ' (unmapped, would be adopted)' : ''}`;
const notManagedLines = () => {
  const owned = [...notManaged.owned].map(
    ([o, paths]) => `${mdCode(`webengine/${o.path}`)} — ${o.owner} (${paths.size} file(s))`
  );
  const wildcard = notManaged.wildcard.map(
    (w) => `${mdCode(`${w.section}: ${w.key}`)} → ${w.zuid} (wildcard route, can't be a file)`
  );
  return [
    `**⏭️ Not managed in git, skipped (${owned.length + wildcard.length}):**`,
    mdList(owned.concat(wildcard))
  ];
};

// Config keys added or re-pointed to another ZUID since `base`, as "section: key".
// Null when the base config can't be read, so callers treat every key as changed.
function changedConfigKeys(config, base) {
  let before;
  try {
    const raw = execFileSync('git', ['show', `${base}:./zesty.config.json`], {
      cwd: process.cwd(),
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'ignore']
    });
    before = JSON.parse(raw).instance || {};
  } catch {
    return null;
  }
  const changed = new Set();
  for (const section of Object.keys(SECTIONS)) {
    const old = before[section] || {};
    for (const [key, info] of Object.entries((config.instance || {})[section] || {})) {
      if (!old[key] || !info || old[key].zuid !== info.zuid) changed.add(`${section}: ${key}`);
    }
  }
  return changed;
}

function writeSummary(fileName, md) {
  fs.writeFileSync(path.join(process.cwd(), fileName), md + '\n');
  console.log('\n' + md);
}

// CHECK: read-only preflight for a PR into stage. Exits 1 on anything that
// would make the stage sync fail, lose a file, or overwrite a manager edit.
// With `changed` (the PR's files since DIFF_BASE), only problems in the PR
// block; the same problems elsewhere are listed as pre-existing info.
async function runCheck(manifest, newFiles, config, changed) {
  const dev = await fetchInstanceCode('dev');
  requireListing(dev, Object.keys(SECTIONS), 'dev');
  const plan = planNewFiles(
    newFiles.filter((nf) => !dev.failed.has(nf.section)),
    dev,
    config
  );
  const changedKeys = changed ? changedConfigKeys(config, process.env.DIFF_BASE) : null;
  const keyChanged = (section, key) => !changedKeys || changedKeys.has(`${section}: ${key}`);
  // In the PR: the file is in the diff, or its config key was added or re-pointed.
  const inPR = (rel, item) =>
    !changed ||
    changed.has(rel) ||
    (!!item && item.key !== undefined && keyChanged(item.section, item.key));

  // Adopting saves the local file over the resource, so a differing adopt
  // candidate is drift like any other mapped file. PR files are classified first.
  const adoptDrift = [];
  const noDevCode = [];
  for (const a of plan.adopt) {
    if (!a.differs) continue;
    const entry = {
      rel: relPath(a.nf.localPath),
      item: { endpoint: a.nf.endpoint, zuid: a.resource.zuid },
      adopt: true
    };
    if (a.instanceCode === null) noDevCode.push({ ...entry, reason: 'no dev code' });
    else adoptDrift.push({ entry, code: a.instanceCode });
  }
  const cmp = compareWithInstance(manifest, dev, {
    extra: adoptDrift,
    first: (e) => inPR(e.rel, e.item)
  });
  cmp.unclassified.push(...noDevCode);
  const split = (arr, test) => [arr.filter(test), arr.filter((x) => !test(x))];
  const dupeInPR = ([, labels]) =>
    labels.some((label) => {
      const at = label.indexOf(': ');
      const section = label.slice(0, at);
      const key = label.slice(at + 2);
      let rel = null;
      try {
        rel = relPath(resolveLocalPath(SECTIONS[section].dir, key));
      } catch {
        /* unresolvable key: judged by the config change alone */
      }
      return !changed || (rel && changed.has(rel)) || keyChanged(section, key);
    });

  const nfRel = (x) => relPath(x.nf.localPath);
  const [blockedNew, oldBlockedNew] = split(plan.blocked, (b) => inPR(nfRel(b)));
  const [missingLocal, oldMissingLocal] = split(cmp.missingLocal, (m) => inPR(m.rel, m.item));
  const [dupes, oldDupes] = split(
    [...zuidOwners(config)].filter(([, keys]) => keys.length > 1),
    dupeInPR
  );
  const [missingOnDev, oldMissingOnDev] = split(cmp.missingOnInstance, (m) => inPR(m.rel, m.item));
  const [notFromGit, oldNotFromGit] = split(cmp.notFromGit, (d) => inPR(d.rel, d.item));
  const [unclassified, oldUnclassified] = split(cmp.unclassified, (d) => inPR(d.rel, d.item));
  const [behind, oldBehind] = split(cmp.behind, (d) => inPR(d.rel, d.item));
  const [creates, oldCreates] = split(plan.create, (nf) => inPR(relPath(nf.localPath)));
  const [adopts, oldAdopts] = split(plan.adopt, (a) => inPR(nfRel(a)));

  // Unclassified drift (shallow clone, no history, lookup cap) is a warning: its origin is unknown.
  const driftBlocks = !ALLOW_DRIFT && notFromGit.length;
  const blocking =
    blockedNew.length ||
    missingLocal.length ||
    dupes.length ||
    missingOnDev.length ||
    driftBlocks ||
    failures.length;

  const driftMark = ALLOW_DRIFT ? '⚠️ Allowed (ALLOW_DRIFT)' : '❌ Blocking';
  const blockedLine = (b) => `${mdCode(nfRel(b))} — ${b.reason}`;
  const dupeLine = ([zuid, keys]) => `${zuid}: ${keys.map(mdCode).join(', ')}`;
  const behindLine = (b) => `${target(b)} (= ${b.sha.slice(0, 7)})`;
  const unknownLine = (u) => `${target(u)} (${u.reason})`;
  const createLine = (nf) => mdCode(relPath(nf.localPath));
  const adoptLine = (a) =>
    `${mdCode(nfRel(a))} → ${a.nf.endpoint}/${a.resource.zuid} (${a.resource.type})${a.differs ? ' — dev code differs (see drift)' : ''}`;
  const block = (title, arr, fmt) => [`**${title} (${arr.length}):**`, mdList(arr.map(fmt)), ''];

  const lines = [
    `### 🔎 Stage preflight — ${blocking ? '❌ blocked' : '✅ ready'}`,
    '',
    changed
      ? `Scope: the ${changed.size} file(s) changed since ${mdCode(String(process.env.DIFF_BASE).slice(0, 7))}. Problems elsewhere are listed under _Pre-existing_ and don't block.`
      : 'Scope: every file (no DIFF_BASE).',
    '',
    ...block("❌ Blocking — new files that can't be created or adopted", blockedNew, blockedLine),
    ...block('❌ Blocking — mapped keys with no local file', missingLocal, keyLabel),
    ...block('❌ Blocking — ZUIDs mapped by more than one key', dupes, dupeLine),
    ...block('❌ Blocking — mapped resources missing on dev', missingOnDev, target),
    ...block(`${driftMark} — dev differs and matches no recent git version`, notFromGit, target)
  ];
  if (unclassified.length) {
    lines.push(...block('⚠️ Warning — dev differs, origin unknown', unclassified, unknownLine));
  }
  lines.push(
    ...block('ℹ️ Dev is behind git — the sync will catch up', behind, behindLine),
    ...block('ℹ️ New files to create', creates, createLine),
    ...block('ℹ️ Existing resources to adopt', adopts, adoptLine),
    ...notManagedLines()
  );
  if (failures.length) {
    lines.push('', `**❌ Failed (${failures.length}):**`, mdList(failureLines(failures)));
  }
  if (changed) {
    const old = [
      ["New files that can't be created or adopted", oldBlockedNew, blockedLine],
      ['Mapped keys with no local file', oldMissingLocal, keyLabel],
      ['ZUIDs mapped by more than one key', oldDupes, dupeLine],
      ['Mapped resources missing on dev', oldMissingOnDev, target],
      ['Dev differs and matches no recent git version', oldNotFromGit, target],
      ['Dev differs, origin unknown', oldUnclassified, unknownLine],
      ['Dev is behind git', oldBehind, behindLine],
      ['New files to create', oldCreates, createLine],
      ['Existing resources to adopt', oldAdopts, adoptLine]
    ].filter(([, arr]) => arr.length);
    const total = old.reduce((n, [, arr]) => n + arr.length, 0);
    lines.push(
      '',
      '<details>',
      `<summary>Pre-existing (not in this PR) — ${total} item(s), not blocking</summary>`,
      ''
    );
    for (const [title, arr, fmt] of old) lines.push(...block(title, arr, fmt));
    lines.push('</details>');
  }
  if (cmp.truncated) {
    lines.push(
      '',
      `> ⚠️ Git history was checked for the first ${HISTORY_FILE_LIMIT} differing files only (last ${HISTORY_DEPTH} commits each).`
    );
  }
  lines.push(
    '',
    `<sub>${manifest.length} mapped resources · ${cmp.compared} compared with dev · read-only · zesty-sync</sub>`,
    '<!-- zesty-sync-check -->'
  );
  writeSummary('zesty-check.md', lines.join('\n'));
  if (blocking) process.exitCode = 1;
}

// VERIFY: read-only check that git equals dev (stage) or live (production) for
// the mapped files in scope (the sync's scope, or every file without DIFF_BASE).
// Fails only on mismatches and on mapped resources missing from the instance;
// unmapped files and keys without a local file are info.
async function runVerify(items, newFiles, status, manifest) {
  const listing = await fetchInstanceCode(status);
  requireListing(listing, Object.keys(SECTIONS), status);
  const cmp = compareWithInstance(items, listing);
  const unmapped = newFiles.map((nf) => relPath(nf.localPath));
  const mismatches = cmp.behind.length + cmp.notFromGit.length + cmp.unclassified.length;
  const bad = mismatches || cmp.missingOnInstance.length || failures.length;
  const lines = [
    `### 🔍 Verify git ↔ ${status} — ${bad ? '❌ mismatches' : '✅ in sync'}`,
    '',
    `**❌ ${status} matches no recent git version (${cmp.notFromGit.length}):**`,
    mdList(cmp.notFromGit.map(target)),
    '',
    `**❌ ${status} holds an earlier git version (${cmp.behind.length}):**`,
    mdList(cmp.behind.map((b) => `${target(b)} (= ${b.sha.slice(0, 7)})`)),
    ''
  ];
  if (cmp.unclassified.length) {
    lines.push(
      `**❌ ${status} differs, not classified (${cmp.unclassified.length}):**`,
      mdList(cmp.unclassified.map((u) => `${target(u)} (${u.reason})`)),
      ''
    );
  }
  lines.push(
    `**❌ Mapped resources missing on ${status} (${cmp.missingOnInstance.length}):**`,
    mdList(cmp.missingOnInstance.map(target)),
    '',
    `**ℹ️ Files on disk with no mapping (${unmapped.length}):**`,
    mdList(unmapped.map(mdCode)),
    '',
    `**ℹ️ Mapped keys with no local file (${cmp.missingLocal.length}):**`,
    mdList(cmp.missingLocal.map(keyLabel)),
    '',
    ...notManagedLines()
  );
  if (failures.length) {
    lines.push('', `**❌ Failed (${failures.length}):**`, mdList(failureLines(failures)));
  }
  lines.push(
    '',
    `<sub>${items.length} of ${manifest.length} mapped resources in scope · ${cmp.compared} compared with ${status} · read-only · zesty-sync</sub>`,
    '<!-- zesty-sync-verify -->'
  );
  writeSummary('zesty-verify.md', lines.join('\n'));
  if (bad) process.exitCode = 1;
}

function reportFailures() {
  if (!failures.length) return;
  console.error(`\n❌ ${failures.length} failure(s):`);
  for (const f of failures) console.error(`   - ${f.file} — ${f.action}: ${f.error}`);
  process.exitCode = 1;
}

async function main() {
  if (!DRY_RUN && (!INSTANCE_ZUID || !TOKEN)) {
    console.error('❌ Missing ZESTY_INSTANCE_ZUID or ZESTY_DEVELOPER_TOKEN in environment');
    process.exit(1);
  }
  if (process.env.NO_API_CHECK === 'true' && !DRY_RUN) {
    console.error(
      '❌ NO_API_CHECK=true is only allowed in a dry run: without the instance listing every file would be written blind.'
    );
    process.exit(1);
  }
  if ((CHECK || VERIFY) && !CAN_CHECK) {
    console.error(
      '❌ CHECK and VERIFY compare with the instance: they need ZESTY_INSTANCE_ZUID and ZESTY_DEVELOPER_TOKEN (and no NO_API_CHECK)'
    );
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
  // CHECK and VERIFY default to every file; with DIFF_BASE, CHECK judges the PR's
  // files and VERIFY the same files the sync touched.
  let changed = null;
  if (!FULL_SYNC && (!(CHECK || VERIFY) || process.env.DIFF_BASE)) {
    changed = changedFilePaths();
    if (changed === null) {
      console.warn('⚠️  Could not determine changed files — falling back to a full sync.');
    } else if (CHECK) {
      scope = `PR (${changed.size} changed files; ${manifest.length} mapped + ${newFiles.length} new checked)`;
    } else {
      // A mapped file is also in scope when its config key was added or
      // re-pointed, e.g. a mapping that reached this branch after the file did.
      let keys = new Set();
      if (changed.has('zesty.config.json')) {
        keys = changedConfigKeys(config, process.env.DIFF_BASE);
        if (keys === null) {
          console.warn('⚠️  Could not read zesty.config.json at DIFF_BASE; scoping by changed files only.');
          keys = new Set();
        }
      }
      const inScope = (p) => changed.has(relPath(p));
      items = manifest.filter((it) => inScope(it.localPath) || keys.has(`${it.section}: ${it.key}`));
      newFiles = newFiles.filter((nf) => inScope(nf.localPath));
      scope = `changed (${items.length} update + ${newFiles.length} new, of ${manifest.length} mapped)`;
    }
  }

  const mode = CHECK ? 'check' : VERIFY ? 'verify' : shouldPublish ? 'publish' : 'sync';
  console.log(`🚀 Zesty ${mode} | branch=${BRANCH} | dry-run=${DRY_RUN} | scope=${scope}`);

  // stage = create + save (repo→dev); production = publish only (dev→live).
  if (CHECK) await runCheck(manifest, newFiles, config, changed);
  else if (VERIFY) await runVerify(items, newFiles, shouldPublish ? 'live' : 'dev', manifest);
  else if (shouldPublish) await runProduction(items, newFiles, manifest);
  else await runStage(items, newFiles, manifest, config, indent);
  reportFailures();
}

main().catch((err) => {
  console.error('💥 Error:', err.message);
  process.exit(1);
});
