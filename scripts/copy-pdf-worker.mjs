// Copies the pdf.js worker into public/ as a `.js` file (not `.mjs`).
//
// Why: the deployed Power Apps host enforces `worker-src 'none'`, so PDF.js
// falls back to its main-thread "fake worker", which dynamically imports the
// worker script. The host's storage proxy serves `.mjs` as
// `application/octet-stream`, which strict module-MIME checking rejects — but
// it serves `.js` as `text/javascript`. Shipping the worker as a same-origin
// `.js` asset makes the fallback import succeed under `script-src 'self'`.
//
// Runs in `prebuild` so the copy always matches the installed pdfjs-dist.

import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = resolve(root, 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs');
const dest = resolve(root, 'public/pdf.worker.min.js');

mkdirSync(dirname(dest), { recursive: true });
copyFileSync(src, dest);
console.log('Copied pdf.js worker -> public/pdf.worker.min.js');
