import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { fresh,replayMigrations,asRole,denied,assertRls } from './helpers/supabase-postgres.mjs';

test('fresh database preserves explicit grants, contributor isolation and review workflows', {timeout:60000}, async()=>{
 const db=await fresh();
 try {
  const files=await replayMigrations(db);assert.ok(files.length>=30);
  await assertRls(db,23);
  assert.equal((await db.query('select (select count(*) from public.directory_admins)+(select count(*) from public.directory_member_roles)+(select count(*) from public.directory_contributor_accounts) as privileged_seeds')).rows[0].privileged_seeds,0,'A fresh environment must not enroll production identities');
  // The server must be able to read the data used by the application's backend,
  // even when table creation supplies no automatic grants. Browser access and
  // the intentionally restricted intake role are exercised separately below.
  for(const table of ['member_profiles','site_reviews','directory_admins','analytics_pageviews','analytics_visitors','directory_member_roles','directory_member_state','directory_moderator_audit','directory_owner_listings','directory_curated_content','directory_request_notifications','naqada_sanad_interactions']) {
   await asRole(db,'service_role',null,`select * from public.${table} limit 0`);
  }
  const owner='10000000-0000-4000-8000-000000000001',other='10000000-0000-4000-8000-000000000002',gold='10000000-0000-4000-8000-000000000003',admin='10000000-0000-4000-8000-000000000004';
  for(const [id,email,name] of [[owner,'owner@example.invalid','Synthetic owner'],[other,'other@example.invalid','Synthetic other'],[gold,'editor@example.invalid','Synthetic editor'],[admin,'admin@example.invalid','Synthetic admin']]) {
   await db.query('insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)',[id,email,JSON.stringify({full_name:name})]);
  }
  await db.exec(`insert into public.directory_admins(email,active) values('admin@example.invalid',true);
    insert into public.directory_member_roles(user_id,role_code,role_label,frame_code,active) values('${gold}','gold_moderator','Test editor','gold',true);`);
  const contributor='10000000-0000-4000-8000-000000000010',hidden='10000000-0000-4000-8000-000000000011';
  await db.query("insert into public.directory_contributors(id,slug,display_name,status) values($1,'synthetic-active','Synthetic contributor','active'),($2,'synthetic-hidden','Hidden contributor','inactive')",[contributor,hidden]);
  await db.query('insert into public.directory_contributor_accounts(contributor_id,user_id) values($1,$2)',[contributor,owner]);
  await db.query("insert into public.directory_contributor_permissions(contributor_id,permission) values($1,'test_permission')",[contributor]);
  assert.equal((await asRole(db,'anon',null,'select count(*)::int n from public.directory_contributors')).rows[0].n,1);
  assert.equal((await asRole(db,'authenticated',owner,'select count(*)::int n from public.directory_contributor_accounts')).rows[0].n,1);
  assert.equal((await asRole(db,'authenticated',other,'select count(*)::int n from public.directory_contributor_accounts')).rows[0].n,0);
  assert.equal((await asRole(db,'authenticated',owner,'select count(*)::int n from public.directory_contributor_permissions')).rows[0].n,1);
  assert.equal((await asRole(db,'authenticated',other,'select count(*)::int n from public.directory_contributor_permissions')).rows[0].n,0);
  await denied(db,'anon',null,'select * from public.directory_contributor_accounts');
  await denied(db,'authenticated',owner,"update public.directory_contributor_permissions set enabled=false");
  await asRole(db,'service_role',null,"insert into public.directory_contributions(request_type,name,contact) values('add','Synthetic intake','private@example.invalid')");
  await asRole(db,'service_role',null,"insert into public.directory_events(event_type) values('search')");
  await denied(db,'anon',null,'select * from public.directory_contributions');
  await denied(db,'service_role',null,'select * from public.directory_events');
  await denied(db,'service_role',null,'delete from public.directory_contributions');
  await asRole(db,'service_role',null,"select public.consume_public_rate_limit('synthetic',repeat('a',64),2)");
  await asRole(db,'authenticated',owner,"update public.member_profiles set full_name='Updated owner' where id=auth.uid()");
  assert.equal((await asRole(db,'authenticated',other,'select count(*)::int n from public.member_profiles where id=$1',[owner])).rows[0].n,0);
  await denied(db,'anon',null,'select * from public.member_profiles');
  await db.query("insert into public.directory_contributions(request_type,name,submitted_by_user_id,review_notes) values('add','Owned contribution',$1,'PRIVATE INTERNAL NOTE'),('add','Other contribution',$2,'OTHER PRIVATE NOTE')",[owner,other]);
  await denied(db,'authenticated',owner,'select review_notes from public.directory_contributions');
  await denied(db,'authenticated',owner,'select * from public.directory_contributions');
  const source=fs.readFileSync(new URL('../lib/auth/contributor.ts',import.meta.url),'utf8');
  const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
  const exports={};
  vm.runInNewContext(compiled,{
   exports,
   require: name=>{assert.equal(name,'@/lib/auth/supabase-rest');return {SUPABASE_URL:'https://database.invalid',restHeaders:()=>({})};},
   fetch:async input=>{
    const url=new URL(input);assert.equal(url.origin,'https://database.invalid');assert.equal(url.pathname,'/rest/v1/directory_contributions');
    const columns=url.searchParams.get('select').split(',');
    for(const column of columns)assert.match(column,/^[a-z_]+$/);
    const user=url.searchParams.get('submitted_by_user_id').slice(3);
    const data=await asRole(db,'authenticated',owner,`select ${columns.map(c=>'"'+c+'"').join(',')} from public.directory_contributions where submitted_by_user_id=$1`,[user]);
    return Response.json(data.rows);
   },
  });
  const activity=await exports.getContributorActivity('synthetic-token',owner);
  assert.equal(activity.total,1,'The actual contributor client must work with column-level grants');
  assert.equal(activity.recent[0].name,'Owned contribution');
  assert.equal(activity.recent[0].locality,null);
  assert.ok(!JSON.stringify(activity).includes('PRIVATE'));
  // Run the existing SQL assertions against a clean rebuilt schema and synthetic
  // identities. Each script owns its transaction and rolls all its writes back.
  for(const file of ['activity-review.sql','activity-covers.sql','request-notifications.sql','complete-article-editor.sql']) {
   try { await db.exec(fs.readFileSync(new URL(file,import.meta.url),'utf8')); }
   catch(cause) { throw new Error(`${file}: ${cause.message}`,{cause}); }
  }
  const constraint=fs.readFileSync(new URL('../supabase/migrations/20261023070942_reconcile_contribution_status_constraint.sql',import.meta.url),'utf8');
  await db.exec(constraint);await db.exec(constraint); // Forward repair is safe to repeat.
 } finally { await db.close(); }
});
