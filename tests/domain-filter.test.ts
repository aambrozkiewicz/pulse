import { test } from 'node:test';
import assert from 'node:assert/strict';
import { domainFilter, unknownDomain } from '../lib/domain-filter';

test('all domains includes historical events; unknown selects only missing domains', () => {
 assert.equal(domainFilter('').text, '');
 assert.equal(domainFilter(unknownDomain).text, 'AND "domain" IS NULL');
});
test('domain values remain bound parameters even for hostile URL input', () => {
 const domain = "eatally.pl' OR 1=1 --";
 const filter = domainFilter(domain);
 assert.equal(filter.text, 'AND "domain"=$1');
 assert.deepEqual(filter.values, [domain]);
});
