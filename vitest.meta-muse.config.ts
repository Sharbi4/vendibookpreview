import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { environment: 'node', include: ['src/test/growth/metaMuseDatabase.test.ts'] } });