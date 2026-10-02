import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eventSchema, cleanReferrer } from '../lib/event';
const event={id:crypto.randomUUID(),site:'moja-strona',visitorId:crypto.randomUUID(),sessionId:crypto.randomUUID(),name:'page_view',path:'/pricing?email=secret#name'};
test('strips sensitive query/hash and unknown fields',()=>{const result=eventSchema.parse({...event,email:'secret'});assert.equal(result.path,'/pricing');assert.ok(!('email' in result));});
test('limits payload, names and properties',()=>{assert.equal(eventSchema.safeParse({...event,name:'bad event'}).success,false);assert.equal(eventSchema.safeParse({...event,properties:{nested:{password:'secret'}}}).success,false);assert.equal(eventSchema.safeParse({...event,properties:Object.fromEntries(Array.from({length:11},(_,i)=>[i,'value']))}).success,false);});
test('retains only referrer hostname',()=>{assert.equal(cleanReferrer('https://google.com/search?q=private'),'google.com');assert.equal(cleanReferrer('invalid'),undefined);});
