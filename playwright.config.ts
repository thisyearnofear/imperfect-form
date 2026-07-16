import { defineConfig, devices } from '@playwright/test';

// Override when localhost:3000 is occupied: PW_BASE_URL=http://localhost:3100
const baseURL = process.env.PW_BASE_URL || 'http://localhost:3000';

export default defineConfig({
  testDir: './e2e',
  timeout: 60000,
  retries: 1,
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
  // Set PW_NO_WEBSERVER=1 when a Next lock already owns the directory
  // (reuseExistingServer alone is not enough — `next dev` exits 1 on lock).
  webServer: process.env.PW_NO_WEBSERVER
    ? undefined
    : {
        command: 'pnpm dev',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
      },
});
