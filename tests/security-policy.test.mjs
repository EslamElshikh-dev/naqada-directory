import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
const record={exports:{}};
vm.runInNewContext(ts.transpileModule(readFileSync('lib/security-policy.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module:record,exports:record.exports});
const {contentSecurityPolicy,dynamicDocument}=record.exports;
test('only dynamic documents and real filter requests receive request nonces',()=>{
 for(const path of ['/','/listing/صيدلية/','/about/','/account/login/'])assert.equal(dynamicDocument(path,new URLSearchParams()),false);
 assert.equal(dynamicDocument('/directory/',new URLSearchParams('utm_source=facebook')),false);
 for(const path of ['/account/','/admin/data-quality/','/search/'])assert.equal(dynamicDocument(path,new URLSearchParams()),true);
 assert.equal(dynamicDocument('/directory/',new URLSearchParams('q=')),true);
});
test('nonce policy is strict and the public ISR exception is explicit',()=>{
 const strict=contentSecurityPolicy('unit-test-nonce').split('; ').find(x=>x.startsWith('script-src '));
 assert.ok(strict.includes("'strict-dynamic'"));assert.ok(strict.includes("'nonce-unit-test-nonce'"));assert.ok(!strict.includes("'unsafe-inline'"));
 assert.ok(contentSecurityPolicy().includes("script-src-attr 'none'"));assert.ok(contentSecurityPolicy().includes('report-to csp-endpoint'));
 assert.ok(contentSecurityPolicy().includes('upgrade-insecure-requests'));
 assert.ok(!contentSecurityPolicy(undefined,false).includes('upgrade-insecure-requests'));
});
test('first-party bootstrap integrity hashes match the shipped bytes',()=>{
 for(const [path,hash]of Object.entries(JSON.parse(readFileSync('data/script-integrity.json','utf8'))))assert.equal(hash,'sha256-'+createHash('sha256').update(readFileSync('public'+path)).digest('base64'));
});
