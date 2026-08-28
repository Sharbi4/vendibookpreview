import fs from 'node:fs';
const path = 'src/pages/SaleCheckout.tsx';
let s = fs.readFileSync(path, 'utf8');
const bad = `import { useCheckoutState } from '@/hooks/useCheckoutState';\nimport {\nimport { getPublicDisplayName } from '@/lib/displayName';\n  JourneyProgress,`;
const good = `import { useCheckoutState } from '@/hooks/useCheckoutState';\nimport { getPublicDisplayName } from '@/lib/displayName';\nimport {\n  JourneyProgress,`;
if (!s.includes(bad)) throw new Error('Expected malformed import not found');
s = s.replace(bad, good);
fs.writeFileSync(path, s);
