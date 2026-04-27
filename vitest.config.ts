import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    env: {
      // 32-byte key (64 hex chars) used only during tests
      ENCRYPTION_KEY: '0000000000000000000000000000000000000000000000000000000000000000',
      NEXT_PUBLIC_WAREHOUSE_ZIP: '31548',
    },
  },
})
