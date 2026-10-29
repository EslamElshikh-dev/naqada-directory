import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
const paths=['/scripts/meta-pixel-bootstrap.js','/scripts/speed-insights-bootstrap.js'];
const entries=await Promise.all(paths.map(async path=>[path,'sha256-'+createHash('sha256').update(await readFile('public'+path)).digest('base64')]));
await writeFile('data/script-integrity.json',JSON.stringify(Object.fromEntries(entries),null,2)+'\n');
