import { defineConfig } from 'vitest/config';
export default defineConfig({test:{environment:'node',include:['src/test/buyerMatchRentals.database.test.ts'],maxWorkers:1}});
