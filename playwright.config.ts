import { defineConfig, devices } from '@playwright/test'

// 開発中の `pnpm dev`（5173 から空いている番号を使う）と重ならないよう、ふだん使わない番号を使う。
// 既存のサーバーは再利用しない（ダミーの Apple トークンを渡した専用のサーバーでテストするため）
const PORT = 4317

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  use: { baseURL: `http://localhost:${PORT}` },
  projects: [
    { name: 'iphone', use: { ...devices['iPhone 13'] } },
    { name: 'android', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: `vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    // Apple Music の流れをテストするためのダミーのトークン（本物の Apple には接続しない）
    env: { VITE_APPLE_DEVELOPER_TOKEN: 'test-developer-token', VITE_APPLE_DEVELOPER_TOKEN_EXP: '4102444800' },
  },
})
