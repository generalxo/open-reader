import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  out: './src/electron/db/migrations',
  schema: './src/electron/db/schema.ts',
  dialect: 'sqlite',
  dbCredentials: {
    url: 'file:./dev.db',
  },
})
