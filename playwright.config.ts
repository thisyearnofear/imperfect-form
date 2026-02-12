import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  timeout: 60000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:3000',
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
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
