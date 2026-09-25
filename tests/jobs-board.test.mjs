import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';
import { LOCAL_PLACES } from '../supabase/functions/naqada-jobs/places.ts';

test('every published village and activity locality can submit a local job', () => {
  const allowed = new Set(LOCAL_PLACES);
  const localities = JSON.parse(readFileSync(new URL('../data/localities.json', import.meta.url)));
  for (const locality of localities) assert.ok(allowed.has(locality.name), `missing ${locality.name}`);

  const data = new URL('../data/', import.meta.url);
  for (const file of readdirSync(data).filter((name) => /^businesses-\d+\.json$/.test(name))) {
    for (const business of JSON.parse(readFileSync(new URL(file, data)))) {
      let name = (business.locality || 'مركز نقادة').split('/')[0].trim();
      if (name === 'كوم الضبع') name = 'نجع كوم الضبع';
      if (name === 'شرق الترعة') name = 'نجع شرق الترعة';
      assert.ok(allowed.has(name), `${file}: ${name}`);
    }
  }
});
