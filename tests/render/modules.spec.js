const { test, expect } = require('@playwright/test');
const PAGES = require('./module-pages');

// Previews and staging are password-protected; the access query rides on every navigation.
const ACCESS = (process.env.QA_ACCESS_QUERY || '').replace(/^\?/, '');
const withAccess = (p) => (ACCESS ? `${p}${p.includes('?') ? '&' : '?'}${ACCESS}` : p);

// Text that only shows up when Parsley fails to render.
const PARSLEY_ERRORS = [/\{\{[\s\S]*?\}\}/, /parsley (error|exception)/i];

// Errors already on production, matched by the function that throws (or the
// message, for parse errors). They're annotated on the test but don't fail it.
// Fix the view, then remove its entry.
const KNOWN_JS_ERRORS = [
  { fn: 'updateViewContentLink', view: 'loader', issue: '#view-content-button is missing' },
  { fn: 'adjustPaginationBullets', view: 'modules/news', issue: 'toggleButtonState is not defined in this module' },
  { fn: 'init', view: 'components/header', issue: '.header-content-loader is missing' },
  {
    fn: 'findHelpButtonAddressSuggestion',
    view: 'components/header-find-help-modal',
    issue: 'runs before Google Maps has loaded'
  },
  {
    message: 'missing ) after argument list',
    view: 'modules/contact-us',
    issue: 'line 79 prints getImage() into JS without quotes'
  },
  {
    message: "(reading 'nextElementSibling')",
    view: 'modules/benefits-perks',
    issue: 'line 88 reads cards[0] when the page has no info cards'
  }
];

// Site-logged notices about third-party tags loading slowly; not a module problem.
const IGNORED_MESSAGES = [/^Tealium failed to load/];

// Third-party tags (analytics, embeds) log their own errors; only the site's count.
function isSiteError(url, baseURL) {
  if (!url) return true;
  try {
    return new URL(url).host === new URL(baseURL).host;
  } catch {
    return false;
  }
}

for (const { path, status = 200, modules } of PAGES) {
  test.describe(path, () => {
    let page;
    let response;
    const jsErrors = [];

    test.beforeAll(async ({ browser }, testInfo) => {
      const baseURL = testInfo.project.use.baseURL;
      page = await browser.newPage({ baseURL });
      page.on('pageerror', (err) => {
        const stack = String(err.stack || '');
        const frames = stack.match(/https?:\/\/[^\s)]+/g) || [];
        const fn = (stack.match(/\n\s+at ([\w$.]+) \(/) || [])[1] || null;
        if (!frames.length || frames.some((u) => isSiteError(u, baseURL))) jsErrors.push({ message: err.message, fn });
      });
      page.on('console', (msg) => {
        // The page's own non-200 status (e.g. the 404 page) is expected, not an error.
        if (msg.location().url === page.url() && msg.text().startsWith('Failed to load resource')) return;
        if (IGNORED_MESSAGES.some((re) => re.test(msg.text()))) return;
        if (msg.type() === 'error' && isSiteError(msg.location().url, baseURL)) {
          jsErrors.push({ message: msg.text(), fn: null });
        }
      });
      response = await page.goto(withAccess(path), { waitUntil: 'load' });
      await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
    });

    test.afterAll(async () => {
      if (page) await page.close();
    });

    test(`responds ${status}`, () => {
      expect(response && response.status()).toBe(status);
    });

    test('has no unrendered Parsley', async () => {
      const text = await page.locator('body').innerText();
      for (const pattern of PARSLEY_ERRORS) expect(text).not.toMatch(pattern);
    });

    test('has no site JavaScript errors', () => {
      const unknown = [];
      for (const e of jsErrors) {
        const known = KNOWN_JS_ERRORS.find((k) => (k.fn ? k.fn === e.fn : e.message.includes(k.message)));
        if (known) {
          test.info().annotations.push({ type: 'known issue', description: `${known.view}: ${e.message} (${known.issue})` });
        } else {
          unknown.push(e.fn ? `${e.message} (in ${e.fn})` : e.message);
        }
      }
      expect(unknown).toEqual([]);
    });

    for (const m of modules) {
      if (m.marker) {
        test(`${m.module} script is included`, async () => {
          const scripts = await page.locator('script:not([src])').allTextContents();
          expect(scripts.some((s) => s.includes(m.marker))).toBe(true);
        });
        continue;
      }
      test(`${m.module} renders`, async () => {
        const el = page.locator(m.selector).first();
        if (m.visible === false) await expect(el).toBeAttached();
        else await expect(el).toBeVisible();
      });
    }
  });
}
