import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read=name=>JSON.parse(readFileSync(new URL(`../src/locales/${name}.json`,import.meta.url),'utf8'));
test('both languages have identical keys and interpolation parameters',()=>{const a=read('zh-TW'),b=read('en');assert.deepEqual(Object.keys(a).sort(),Object.keys(b).sort());for(const key of Object.keys(a)){assert.ok(a[key].trim());assert.ok(b[key].trim());assert.deepEqual(a[key].match(/\{\{\w+\}\}/g)?.sort(),b[key].match(/\{\{\w+\}\}/g)?.sort(),key);}});
