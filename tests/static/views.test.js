const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const {
  ROOT,
  listViews,
  listScripts,
  checkBlocks,
  unbalancedTags,
  includes,
  maxBranches,
  toPlainJs,
  inlineScripts
} = require('./parsley');

// Problems that already exist. These tests still run and show as TODO, but don't
// fail the suite. Fix the view, then remove its entry.
const KNOWN_ISSUES = {
  'modules/all-stories-archive': { scripts: 'line 9 is `let  = null;` (variable name missing)' },
  'modules/contact-us': { scripts: 'line 79 prints getImage() into JS without quotes' },
  'modules/location-finder': { includes: 'line 77 includes modules/utility-scripts, which does not exist' },
  news_archive: { includes: 'line 1 includes modules/news-archive-search; the view is components/news-archive-search' },
  'find-story.json': { braces: 'line 65 is missing a } after .state' },
  'stories.json': { blocks: '{{if}} on line 42 is never closed' },
  'service-catalog.json': { blocks: '{{if}} on line 2 is never closed before {{/each}}' }
};

const views = listViews();
const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'zesty.config.json'), 'utf8'));
const knownViews = new Set([
  ...views.map((v) => v.rel),
  ...Object.keys((config.instance && config.instance.views) || {}).map((k) => k.replace(/^\/+/, ''))
]);

// Compiled as strict so slips like `let  = null;` (valid sloppy JS: assigns a
// global named "let") fail. Nothing runs; it's a parse only.
function syntaxError(code, filename) {
  try {
    new vm.Script(`'use strict';${code}`, { filename });
    return null;
  } catch (err) {
    const line = Number((String(err.stack).match(/^[^\n]*:(\d+)\n/) || [])[1]) || 1;
    return { line, message: err.message };
  }
}

for (const view of views) {
  const src = fs.readFileSync(view.full, 'utf8');
  const known = KNOWN_ISSUES[view.rel] || {};
  const opts = (key) => (known[key] ? { todo: known[key] } : {});

  describe(`views/${view.rel}`, () => {
    test('if/each blocks are balanced', opts('blocks'), () => {
      const problem = checkBlocks(src);
      assert.equal(problem, null, problem);
    });

    test('tag braces are balanced', opts('braces'), () => {
      assert.deepEqual(unbalancedTags(src), []);
    });

    test('includes point at existing views', opts('includes'), () => {
      const missing = includes(src)
        .filter((i) => !knownViews.has(i.target))
        .map((i) => `line ${i.line}: ${i.target}`);
      assert.deepEqual(missing, [], 'include target is not a view in webengine/views or zesty.config.json');
    });

    if (!view.rel.endsWith('.json')) {
      test('inline scripts are valid JavaScript', opts('scripts'), () => {
        const errors = new Set();
        for (const s of inlineScripts(src)) {
          for (let branch = 0; branch < maxBranches(s.code); branch++) {
            const err = syntaxError(toPlainJs(s.code, branch), view.rel);
            if (err) errors.add(`line ${s.line + err.line - 1}: ${err.message}`);
          }
        }
        assert.deepEqual([...errors], []);
      });
    }
  });
}

describe('scripts', () => {
  for (const script of listScripts()) {
    test(`scripts/${script.rel} is valid JavaScript`, () => {
      const err = syntaxError(fs.readFileSync(script.full, 'utf8'), script.rel);
      assert.equal(err, null, err && `line ${err.line}: ${err.message}`);
    });
  }
});
