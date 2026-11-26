import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fresh, replayMigrations, denied } from './helpers/supabase-postgres.mjs';

const migration = new URL('../supabase/migrations/20261126030223_news_item_revalidation.sql', import.meta.url);
const oldMigration = new URL('../supabase/migrations/20261112070000_scoped_content_revalidation.sql', import.meta.url);

test('item-scoped news outbox is complete across retries, overlapping mutations and legacy work', { timeout: 60000 }, async t => {
  const db = await fresh();
  try {
    await replayMigrations(db);
    await db.exec(`create table net._http_response(id bigint primary key,status_code int);
      create table net.test_requests(id bigint generated always as identity primary key,body jsonb);
      create or replace function net.http_post(url text,body jsonb default '{}',params jsonb default '{}',headers jsonb default '{}',timeout_milliseconds int default 1000)
      returns bigint language sql as $$ insert into net.test_requests(body) values(body) returning id $$;
      insert into vault.decrypted_secrets values('naqada_content_revalidation_secret',repeat('x',32));`);
    const requests = async () => (await db.query('select body from net.test_requests order by id')).rows.map(r => r.body);
    const ack = () => db.exec('insert into net._http_response select request_id,200 from naqada_private.content_revalidation where request_id is not null on conflict(id) do update set status_code=200; select naqada_private.dispatch_content_revalidation()');
    const add = id => db.query("insert into public.naqada_news_archive(id,url,payload,published_at) values($1,$2,$3,now())", [id, `https://example.invalid/${id}`, JSON.stringify({ id, title: 'PUBLIC', privateMarker: 'PRIVATE_MUST_NOT_LEAVE_DATABASE' })]);
    await db.exec('select naqada_private.dispatch_content_revalidation()'); await ack();
    await t.test('insert, edit, rename and deletion include both public route IDs where necessary', async () => {
      await add('story-alpha'); assert.deepEqual((await requests()).at(-1).newsItems, ['story-alpha']); await ack();
      await db.exec("update public.naqada_news_archive set payload=payload||'{\"title\":\"CORRECTED\"}' where id='story-alpha'");
      assert.deepEqual((await requests()).at(-1).newsItems, ['story-alpha']); await ack();
      await db.exec("update public.naqada_news_archive set id='story-beta',payload=payload||'{\"id\":\"story-beta\"}' where id='story-alpha'");
      assert.deepEqual((await requests()).at(-1).newsItems, ['story-alpha','story-beta']); await ack();
      await db.exec("delete from public.naqada_news_archive where id='story-beta'");
      assert.deepEqual((await requests()).at(-1).newsItems, ['story-beta']); await ack();
    });
    await t.test('publishing, hiding, moving kinds and changing public slugs preserve targeted tombstones', async () => {
      await db.exec("insert into auth.users(id,email) values('00000000-0000-4000-8000-000000000002','fixture@example.invalid'); insert into public.directory_curated_content(kind,slug,origin,status,created_by,updated_by) values('news','original-one','original','draft','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000002')");
      const before=(await requests()).length;
      await db.exec("update public.directory_curated_content set draft_payload='{\"title\":\"PRIVATE_MUST_NOT_LEAVE_DATABASE\"}' where slug='original-one'");
      assert.equal((await requests()).length,before);
      await db.exec("update public.directory_curated_content set status='published' where slug='original-one'");
      assert.deepEqual((await requests()).at(-1).newsItems,['original-one']); await ack();
      await db.exec("update public.directory_curated_content set slug='original-two',status='hidden' where slug='original-one'");
      assert.deepEqual((await requests()).at(-1).newsItems,['original-one','original-two']); await ack();
      await db.exec("update public.directory_curated_content set kind='article' where slug='original-two'");
      const body=(await requests()).at(-1);
      assert.deepEqual(body.scopes,['article','news']); assert.deepEqual(body.newsItems,['original-two']); await ack();
    });
    await t.test('acknowledging an older version cannot erase a newer update of the same item', async () => {
      await add('same-item'); const first=(await requests()).at(-1);
      await db.exec("update public.naqada_news_archive set payload=payload||'{\"title\":\"NEWER\"}' where id='same-item'");
      await add('another-item'); await ack();
      const second=(await requests()).at(-1);
      assert.ok(second.version>first.version); assert.deepEqual(second.newsItems,['another-item','same-item']);
      await db.exec('insert into net._http_response select request_id,503 from naqada_private.content_revalidation; select naqada_private.dispatch_content_revalidation()');
      assert.deepEqual((await requests()).at(-1),second); await ack();
      assert.equal((await db.query('select count(*) as n from naqada_private.content_revalidation_news_items')).rows[0].n,0);
    });
    await t.test('oversized batches and unrouteable archive IDs use a complete broad fallback', async () => {
      await add('batch-anchor');
      for (let i=0;i<101;i++) await add(`batch-${String(i).padStart(3,'0')}`);
      await ack();
      assert.equal((await requests()).at(-1).newsItems,undefined,'Never send a truncated list and then acknowledge every change'); await ack();
      await add('unrouteable_id'); assert.equal((await requests()).at(-1).newsItems,undefined); await ack();
    });
    await t.test('pending legacy work is broad once, migration replay is safe, and no private data leaves the database', async () => {
      await db.exec(fs.readFileSync(oldMigration,'utf8')); await add('legacy-item');
      assert.equal((await requests()).at(-1).newsItems,undefined);
      await db.exec(fs.readFileSync(migration,'utf8')); await add('target-after-legacy');
      await ack(); assert.deepEqual((await requests()).at(-1).newsItems,['target-after-legacy']); await ack();
      await add('replay-item'); const last=(await requests()).at(-1);
      await db.exec(fs.readFileSync(migration,'utf8'));
      await db.exec("update naqada_private.content_revalidation set requested_at=now()-interval '46 seconds'; select naqada_private.dispatch_content_revalidation()");
      assert.deepEqual((await requests()).at(-1),last); await ack();
      for (const role of ['anon','authenticated']) await denied(db,role,null,'select * from naqada_private.content_revalidation_news_items');
      for (const body of await requests()) {
        assert.doesNotMatch(JSON.stringify(body),/PRIVATE_MUST_NOT_LEAVE_DATABASE|fixture@example|payload|draft_payload/);
        assert.ok(Object.keys(body).every(key=>['source','version','scopes','newsItems'].includes(key)));
      }
    });
  } finally { await db.close(); }
});
