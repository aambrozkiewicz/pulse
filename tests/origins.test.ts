import { test } from 'node:test';
import assert from 'node:assert/strict';
import { allowedOrigin, isOriginPattern } from '../lib/origins';

test('wildcards allow new and nested subdomains without allowing the root or lookalikes', () => {
 const patterns = ['https://*.eatally.pl', 'https://mojlunch.pl'];
 for (const origin of ['https://klient.eatally.pl', 'https://a.b.eatally.pl', 'https://mojlunch.pl']) assert.equal(allowedOrigin(origin, patterns), true, origin);
 for (const origin of ['https://eatally.pl', 'https://fakeeatally.pl', 'https://eatally.pl.evil.com', 'https://klient.eatally.pl.evil.com', 'https://www.mojlunch.pl', 'http://klient.eatally.pl', 'https://klient.eatally.pl:8443', 'null', 'https://*.eatally.pl']) assert.equal(allowedOrigin(origin, patterns), false, origin);
});

test('exact origins and wildcard ports remain explicit', () => {
 assert.equal(allowedOrigin('http://localhost:8080', ['http://localhost:8080']), true);
 assert.equal(allowedOrigin('https://eatally.pl', ['https://eatally.pl']), true);
 assert.equal(allowedOrigin('https://a.eatally.pl:8443', ['https://*.eatally.pl:8443']), true);
 assert.equal(allowedOrigin('https://a.eatally.pl', ['https://*.eatally.pl:8443']), false);
});

test('rejects malformed patterns, credentials and unrestricted wildcards', () => {
 for (const value of ['https://*', 'https://*.pl', 'https://foo*.eatally.pl', 'https://*.*.eatally.pl', 'https://*.eatally.pl/', 'https://*.eatally.pl/path', 'https://user:pass@*.eatally.pl', 'https://*.eatally.pl?query=1', 'https://*.eatally.pl#hash', 'ftp://*.eatally.pl', 'invalid']) assert.equal(isOriginPattern(value), false, value);
 assert.equal(isOriginPattern('https://*.eatally.pl'), true);
});
