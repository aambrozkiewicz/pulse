import { test } from 'node:test';
import assert from 'node:assert/strict';
import { siteConfigSchema } from '../lib/site-config';
const config = {key: 'moja-strona', name: 'Moja strona', origins: ['https://example.com'], conversionEvent: 'purchase_completed', funnelSteps: ['page_view', 'checkout_started', 'purchase_completed']};
test('accepts independent site events and optional steps', () => {
 assert.deepEqual(siteConfigSchema.parse(config), config);
 assert.equal(siteConfigSchema.safeParse({...config, funnelSteps: []}).success, true);
});
test('rejects invalid event names, duplicated and excessive steps', () => {
 for (const conversionEvent of ['', 'Bad Event', '1purchase', 'a'.repeat(65)]) assert.equal(siteConfigSchema.safeParse({...config, conversionEvent}).success, false);
 for (const funnelSteps of [['page_view', 'page_view'], ['bad step'], Array.from({length: 11}, (_, i) => `step_${i}`)]) assert.equal(siteConfigSchema.safeParse({...config, funnelSteps}).success, false);
});
test('only accepts configured HTTP origins without paths', () => {
 for (const origin of ['https://example.com/path', 'https://example.com/', 'ftp://example.com']) assert.equal(siteConfigSchema.safeParse({...config, origins: [origin]}).success, false);
 assert.equal(siteConfigSchema.safeParse({...config, origins: ['http://localhost:8080']}).success, true);
});
test('accepts wildcard origins and up to 100 client domains', () => {
 assert.equal(siteConfigSchema.safeParse({...config, origins: ['https://*.eatally.pl', 'https://mojlunch.pl']}).success, true);
 const origins = Array.from({length: 100}, (_, i) => `https://client${i}.example.com`);
 assert.equal(siteConfigSchema.safeParse({...config, origins}).success, true);
 assert.equal(siteConfigSchema.safeParse({...config, origins: [...origins, 'https://extra.example.com']}).success, false);
});
