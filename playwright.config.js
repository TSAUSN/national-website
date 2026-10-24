const { defineConfig, devices } = require('@playwright/test');

// Render tests for webengine modules. BASE_URL picks the environment (defaults
// to production); previews and staging also need QA_ACCESS_QUERY.
module.exports = defineConfig({
  testDir: 'tests/render',
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  workers: 2,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: process.env.BASE_URL || 'https://www.salvationarmyusa.org',
    screenshot: 'only-on-failure'
  }
});
