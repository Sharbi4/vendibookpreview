import {defineConfig} from 'vitest/config';
import path from 'node:path';
export default defineConfig({test:{environment:'node',include:['src/test/growth/growthOutreachEndpoint.test.ts']},resolve:{alias:{'npm:@supabase/supabase-js@2/cors':path.resolve('src/test/growth/corsMock.ts'),'npm:zod@3.25.76':'zod'}}});