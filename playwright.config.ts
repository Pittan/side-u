import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  use: { baseURL: 'http://localhost:5174' },
  projects: [
    { name: 'iphone', use: { ...devices['iPhone 13'] } },
    { name: 'android', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'pnpm vite --port 5174 --strictPort',
    url: 'http://localhost:5174',
    reuseExistingServer: !process.env.CI,
    // Apple Music の流れをテストするためのダミーのトークン（本物の Apple には接続しない）
    env: { VITE_APPLE_DEVELOPER_TOKEN: 'test-developer-token', VITE_APPLE_DEVELOPER_TOKEN_EXP: '4102444800' },
  },
})
