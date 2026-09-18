import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Edge-function modules use Deno `npm:` specifiers; map them so shared
      // transaction-document logic can be unit tested in Node.
      'npm:@supabase/supabase-js@2.45.0': '@supabase/supabase-js',
      'npm:@supabase/supabase-js@2': '@supabase/supabase-js',
    },
  },
});
