import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fresh, replayMigrations, denied } from './helpers/supabase-postgres.mjs';

const migration = new URL('../supabase/migrations/20261112070000_scoped_content_revalidation.sql', import.meta.url);

test('scoped webhook outbox preserves public freshness without feed housekeeping purges', { timeout: 60000 }, async t => {
  const db = await fresh();
  try {
    await replayMigrations(db);
    // Real PostgreSQL triggers/outbox, with an isolated pg_net recorder only.
    await db.exec(`
      create table net._http_response(id bigint primary key,status_code int);
      create table net.test_requests(id bigint generated always as identity primary key,body jsonb);
      create or replace function net.http_post(url text,body jsonb default '{}',params jsonb default '{}',headers jsonb default '{}',timeout_milliseconds int default 1000)
      returns bigint language sql as $$ insert into net.test_requests(body) values(body) returning id $$;
      insert into vault.decrypted_secrets values('naqada_content_revalidation_secret',repeat('x',32));
    `);
    const version = async () => (await db.query('select version from naqada_private.content_revalidation')).rows[0].version;
    const requests = async () => (await db.query('select body from net.test_requests order by id')).rows.map(r => r.body);
    const acknowledge = async () => {
      await db.exec('insert into net._http_response select request_id,200 from naqada_private.content_revalidation where request_id is not null on conflict(id) do update set status_code=200; select naqada_private.dispatch_content_revalidation()');
    };
    const addNews = async id => db.query("insert into public.naqada_news_archive(id,url,payload,published_at) values($1,$2,$3,now()) on conflict(id) do nothing", [id, `https://example.invalid/${id}`, JSON.stringify({ id, title: 'Synthetic news', privateTestMarker: 'MUST_NOT_LEAVE_DATABASE' })]);
    await t.test('all five content tables use row triggers and feed bookkeeping has no trigger', async () => {
      const triggers = (await db.query("select c.relname as table_name, (t.tgtype & 1)=1 as row_level from pg_trigger t join pg_class c on c.oid=t.tgrelid where t.tgname='naqada_content_revalidation' order by c.relname")).rows;
      assert.deepEqual(triggers.map(row => row.table_name), ['directory_business_locations','directory_curated_content','directory_owner_listings','naqada_jobs','naqada_news_archive']);
      assert.ok(triggers.every(row => row.row_level));
    });
    await t.test('empty writes, duplicate archives and feed-state writes do not enqueue invalidation', async () => {
      const before = await version();
      await db.exec("update public.naqada_jobs set title=title where false; delete from public.naqada_news_archive where false; update public.naqada_job_feed_state set last_checked_at=now(),latest_added=0 where id=1");
      assert.equal(await version(), before);
      await addNews('story-one');
      const after = await version();
      await addNews('story-one');
      await db.exec("update public.naqada_news_archive set payload=payload,captured_at=now() where id='story-one'");
      assert.equal(await version(), after);
      assert.deepEqual((await requests()).at(-1).scopes, ['news-archive']);
      await acknowledge();
    });
    await t.test('verified location changes invalidate business data; private provenance edits do not', async () => {
      const before = await version();
      await db.exec("update public.directory_business_locations set latitude=latitude where false; delete from public.directory_business_locations where false");
      assert.equal(await version(), before);
      await db.exec("insert into public.directory_business_locations(place_id,latitude,longitude,source_url,source_name,checked_at) values('synthetic-place',25.9,32.7,'https://www.google.com/maps/?q=synthetic','Synthetic provenance',now())");
      assert.equal(await version(), before + 1);
      assert.deepEqual((await requests()).at(-1).scopes, ['business']);
      await acknowledge();
      await db.exec("update public.directory_business_locations set latitude=latitude,longitude=longitude where place_id='synthetic-place'");
      assert.equal(await version(), before + 1);
      await db.exec("update public.directory_business_locations set source_name='Updated provenance',checked_at=now() where place_id='synthetic-place'");
      assert.equal(await version(), before + 1);
      await db.exec("update public.directory_business_locations set latitude=25.8 where place_id='synthetic-place'");
      assert.equal(await version(), before + 2);
      assert.deepEqual((await requests()).at(-1).scopes, ['business']);
      await acknowledge();
      await db.exec("delete from public.directory_business_locations where place_id='synthetic-place'");
      assert.equal(await version(), before + 3);
      await acknowledge();
    });
    await t.test('pending jobs are silent; publishing, changing, closing and deleting public jobs enqueue jobs only', async () => {
      const before = await version();
      await db.exec("insert into public.naqada_jobs(id,kind,title,locality,field,description,contact_kind,contact_value) values('00000000-0000-4000-8000-000000000001','offer','Synthetic job','نقادة','خدمات','Synthetic description longer than twenty characters','email','synthetic@example.invalid')");
      await db.exec("update public.naqada_jobs set title='Another pending title' where id='00000000-0000-4000-8000-000000000001'");
      assert.equal(await version(), before);
      await db.exec("update public.naqada_jobs set status='published',published_at=now(),expires_at=now()+interval '7 days' where id='00000000-0000-4000-8000-000000000001'");
      assert.equal(await version(), before + 1);
      assert.deepEqual((await requests()).at(-1).scopes, ['jobs']);
      await acknowledge();
      const published = await version();
      await db.exec("update public.naqada_jobs set title=title,updated_at=now() where id='00000000-0000-4000-8000-000000000001'");
      assert.equal(await version(), published);
      await db.exec("update public.naqada_jobs set title='Changed public job' where id='00000000-0000-4000-8000-000000000001'");
      assert.equal(await version(), published + 1);
      await acknowledge();
      await db.exec("update public.naqada_jobs set status='closed' where id='00000000-0000-4000-8000-000000000001'");
      assert.equal(await version(), published + 2);
      await acknowledge();
      await db.exec("update public.naqada_jobs set status='published' where id='00000000-0000-4000-8000-000000000001'");
      await acknowledge();
      const preDelete = await version();
      await db.exec("delete from public.naqada_jobs where id='00000000-0000-4000-8000-000000000001'");
      assert.equal(await version(), preDelete + 1);
      await acknowledge();
    });
    await t.test('curated hidden tombstones and kind moves invalidate both affected kinds; drafts remain private', async () => {
      await db.exec("insert into auth.users(id,email) values('00000000-0000-4000-8000-000000000002','synthetic@example.invalid')");
      const before = await version();
      await db.exec("insert into public.directory_curated_content(kind,slug,origin,created_by,updated_by) values('news','synthetic-story','static','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000002')");
      assert.equal(await version(), before);
      await db.exec("update public.directory_curated_content set status='hidden' where slug='synthetic-story'");
      assert.equal(await version(), before + 1);
      assert.deepEqual((await requests()).at(-1).scopes, ['news']);
      await acknowledge();
      const hidden = await version();
      await db.exec("update public.directory_curated_content set payload='{}',draft_payload='{}' where slug='synthetic-story'");
      assert.equal(await version(), hidden, 'Draft-only editing leaves the public timestamp unchanged');
      await db.exec("update public.directory_curated_content set updated_at=updated_at+interval '1 second' where slug='synthetic-story'");
      assert.equal(await version(), hidden + 1, 'Public updatedAt ordering corrections must refresh even a hidden tombstone');
      assert.deepEqual((await requests()).at(-1).scopes, ['news']);
      await acknowledge();
      await db.exec("update public.directory_curated_content set kind='article' where slug='synthetic-story'");
      assert.deepEqual((await requests()).at(-1).scopes, ['article', 'news']);
      await acknowledge();
      await db.exec("delete from public.directory_curated_content where slug='synthetic-story'");
      assert.deepEqual((await requests()).at(-1).scopes, ['article']);
      await acknowledge();
    });
    await t.test('owner publication and withdrawal are scoped, including deletion of a published row', async () => {
      const before = await version();
      await db.exec("insert into public.directory_owner_listings(id,owner_user_id,name,phone,hours,address,description,category,locality) values('00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000002','Synthetic activity','01012345678','daily','Synthetic address','Synthetic description longer than twenty characters','خدمات','نقادة')");
      assert.equal(await version(), before);
      await db.exec("insert into public.directory_member_roles(user_id,role_code,role_label,frame_code,active) values('00000000-0000-4000-8000-000000000002','gold_moderator','Test editor','gold',true); select set_config('request.jwt.claims','{\"sub\":\"00000000-0000-4000-8000-000000000002\",\"role\":\"authenticated\"}',false)");
      await db.exec("update public.directory_owner_listings set status='published' where id='00000000-0000-4000-8000-000000000003'");
      assert.deepEqual((await requests()).at(-1).scopes, ['owner-listings']);
      await acknowledge();
      const published = await version();
      // The owner guard stamps updated_at, even when visible text is unchanged.
      // That timestamp is public and feeds sitemap/public consumers.
      await db.exec("update public.directory_owner_listings set name=name where id='00000000-0000-4000-8000-000000000003'");
      assert.equal(await version(), published + 1);
      assert.deepEqual((await requests()).at(-1).scopes, ['owner-listings']);
      await acknowledge();
      await db.exec("delete from public.directory_owner_listings where id='00000000-0000-4000-8000-000000000003'");
      assert.equal(await version(), before + 3);
      await acknowledge();
    });
    await t.test('in-flight acknowledgement cannot swallow later changes, including changes to the same scope', async () => {
      await addNews('inflight-one');
      const sentVersion = (await requests()).at(-1).version;
      const count = (await requests()).length;
      await addNews('inflight-two');
      await db.exec("insert into public.directory_curated_content(kind,slug,origin,status,created_by,updated_by) values('business','inflight-business','static','hidden','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000002')");
      assert.equal((await requests()).length, count, 'Coalesce while the previous request is pending');
      await acknowledge();
      assert.equal((await requests()).length, count + 1);
      const next = (await requests()).at(-1);
      assert.deepEqual(next.scopes, ['business', 'news-archive']);
      assert.ok(next.version > sentVersion);
      const state = (await db.query('select * from naqada_private.content_revalidation')).rows[0];
      assert.equal(state.delivered_version, sentVersion);
      assert.equal(state.requested_version, next.version);
      await acknowledge();
      assert.equal((await db.query('select version=delivered_version as caught_up from naqada_private.content_revalidation')).rows[0].caught_up, true);
    });
    await t.test('failed and timed-out delivery retries without advancing the acknowledgement', async () => {
      await addNews('retry-story');
      const original = (await requests()).at(-1);
      const count = (await requests()).length;
      await db.exec('insert into net._http_response select request_id,503 from naqada_private.content_revalidation; select naqada_private.dispatch_content_revalidation()');
      assert.equal((await requests()).length, count + 1);
      assert.deepEqual((await requests()).at(-1), original);
      await db.exec("update naqada_private.content_revalidation set requested_at=now()-interval '46 seconds'; select naqada_private.dispatch_content_revalidation()");
      assert.equal((await requests()).length, count + 2);
      assert.deepEqual((await requests()).at(-1), original);
      await acknowledge();
    });
    await t.test('migration is repeatable, preserves legacy work, and keeps the outbox private', async () => {
      await db.exec(fs.readFileSync(migration, 'utf8'));
      await db.exec('update naqada_private.content_revalidation set version=version+1,request_id=null');
      await db.exec(fs.readFileSync(migration, 'utf8'));
      await db.exec('select naqada_private.dispatch_content_revalidation()');
      assert.deepEqual((await requests()).at(-1).scopes, ['article', 'business', 'jobs', 'news', 'news-archive', 'owner-listings', 'role_model']);
      for (const role of ['anon','authenticated']) {
        await denied(db, role, null, 'select * from naqada_private.content_revalidation_scopes');
        await denied(db, role, null, 'select naqada_private.dispatch_content_revalidation()');
      }
      for (const body of await requests()) {
        assert.deepEqual(Object.keys(body).sort(), ['scopes','source','version']);
        assert.equal(body.source, 'supabase');
        assert.ok(!JSON.stringify(body).includes('MUST_NOT_LEAVE_DATABASE'));
      }
    });
  } finally { await db.close(); }
});
