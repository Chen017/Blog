import { defineConfig } from '@playwright/test';

// Match the committed screenshot environment. Browser revisions come from pnpm-lock.yaml.
const chromium = (name, width, height, touch = false) => ({
  name,
  use: { browserName: 'chromium', viewport: { width, height }, hasTouch: touch, isMobile: touch },
});

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  failOnFlakyTests: !!process.env.CI,
  updateSnapshots: process.env.CI ? 'none' : 'missing',
  workers: process.env.CI ? 2 : 3,
  timeout: 45_000,
  expect: { timeout: 8_000, toHaveScreenshot: { animations: 'allow', threshold: 0.2, maxDiffPixelRatio: 0.003 } },
  reporter: [['list'], ['html', { open: 'never' }]],
  outputDir: 'test-results',
  snapshotPathTemplate: '{testDir}/snapshots/{platform}/{projectName}/{arg}{ext}',
  use: {
    baseURL: 'http://127.0.0.1:4321',
    locale: 'en-US',
    timezoneId: 'Asia/Singapore',
    colorScheme: 'dark',
    reducedMotion: 'no-preference',
    deviceScaleFactor: 1,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    // Never rebuild here: Markdown integration and production builds share dist.
    command: 'pnpm preview --host 127.0.0.1 --port 4321',
    url: 'http://127.0.0.1:4321',
    reuseExistingServer: false,
    timeout: 30_000,
  },
  projects: [
    chromium('desktop', 1440, 900),
    chromium('phone', 390, 844, true),
    chromium('tablet', 768, 1024, true),
    chromium('narrow', 320, 740, true),
    ...(process.env.BROWSER_MATRIX === 'extended' ? [
      { name: 'firefox', use: { browserName: 'firefox', viewport: { width: 1440, height: 900 } } },
      { name: 'webkit', use: { browserName: 'webkit', viewport: { width: 1440, height: 900 } } },
    ] : []),
  ],
});
