import { defineConfig, devices } from '@playwright/test';

// E2E owns an isolated production server by default. This avoids reusing a
// stale Next dev process that may be locked or deadlocked after cold compiles.
const requestedPort = Number.parseInt(process.env.PW_PORT || '3100', 10);
const e2ePort = Number.isInteger(requestedPort) && requestedPort > 0 ? requestedPort : 3100;
const baseURL = process.env.PW_BASE_URL || `http://127.0.0.1:${e2ePort}`;

// Keep local runs deterministic: the app is camera/model heavy and concurrent
// browser projects can starve a single Next process during first compilation.
const requestedWorkers = Number.parseInt(process.env.PW_WORKERS || '1', 10);
const e2eWorkers =
  Number.isInteger(requestedWorkers) && requestedWorkers > 0 ? requestedWorkers : 1;
const managesServer = !process.env.PW_NO_WEBSERVER && !process.env.PW_BASE_URL;

export default defineConfig({
  testDir: './e2e',
  timeout: 60000,
  retries: 1,
  workers: e2eWorkers,
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    // Desktop browsers
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },

    // Mobile browsers
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
    { name: 'Mobile Safari', use: { ...devices['iPhone 12'] } },

    // Tablet browsers
    { name: 'iPad', use: { ...devices['iPad Pro'] } },
    { name: 'Android Tablet', use: { ...devices['Galaxy Tab S4'] } },

    // Low-end devices for performance testing
    {
      name: 'Low-end Mobile',
      use: {
        ...devices['iPhone SE'],
        // Emulate slower CPU
        launchOptions: {
          args: ['--disable-features=TranslateUI', '--disable-ipc-flooding-protection'],
        },
      },
    },
  ],
  // Set PW_NO_WEBSERVER=1 when pointing at an already-running server via
  // PW_BASE_URL. Otherwise Playwright builds and owns a dedicated production
  // server, so stale `next dev` locks cannot make the suite wait indefinitely.
  webServer: managesServer
    ? {
        command: `pnpm build && pnpm start -- -p ${e2ePort}`,
        url: baseURL,
        reuseExistingServer: false,
        // A cold production build currently takes several minutes in this
        // repository; the server is still bounded instead of waiting forever.
        timeout: 480_000,
      }
    : undefined,
});
