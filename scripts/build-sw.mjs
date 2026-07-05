import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const distDir = path.resolve('dist');

function walk(dir, base = '') {
  const entries = readdirSync(dir);
  let files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry);
    const rel = base ? `${base}/${entry}` : entry;
    if (statSync(full).isDirectory()) {
      files = files.concat(walk(full, rel));
    } else {
      files.push(rel);
    }
  }
  return files;
}

const files = walk(distDir).filter((f) => f !== 'sw.js');
const urls = files.map((f) => `./${f}`);

const cacheHash = createHash('sha1').update(urls.slice().sort().join(',')).digest('hex').slice(0, 10);
const cacheName = `fruit-garden-${cacheHash}`;

const template = readFileSync(path.resolve('scripts/sw.template.js'), 'utf8');
const output = template
  .replace('__CACHE_NAME__', cacheName)
  .replace('__PRECACHE_URLS__', JSON.stringify(urls));

writeFileSync(path.join(distDir, 'sw.js'), output);
console.log(`Generated dist/sw.js — cache "${cacheName}" precaching ${urls.length} files`);
