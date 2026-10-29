"""Real PostgreSQL 17.6 + GoTrue + PostgREST, with disposable data only.

Runs on a local Docker host or a free standard runner for this public repository.
There is no managed project URL, API key, production data, or billable resource.
Auth schema/users/sessions come from GoTrue itself; application SQL is unmodified
apart from replacing scheduling/network extensions with no-op local fixtures.
"""
import base64
import hashlib
import hmac
import json
import re
import secrets
import subprocess
import time
import urllib.error
import urllib.request
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
COMPOSE = ["docker", "compose", "-f", str(Path(__file__).with_name("compose.yml"))]
JWT_SECRET = b"isolated-acceptance-jwt-only-never-production-191"
RESULTS = []


def command(*args, data=None):
    return subprocess.run(args, input=data, text=True, capture_output=True, check=True).stdout


def sql(query):
    return command(*COMPOSE, "exec", "-T", "db", "psql", "-U", "postgres", "-d", "postgres",
                   "-v", "ON_ERROR_STOP=1", "-At", data=query).strip()


def quote(value):
    return "'" + str(value).replace("'", "''") + "'"


def check(name, condition):
    if not condition:
        raise AssertionError(name)
    RESULTS.append(name)
    print("PASS " + name, flush=True)


def request(service, path, method="GET", data=None, token=None, expected=(200,), headers=None):
    port = {"auth": 19999, "rest": 13000}[service]
    url = f"http://127.0.0.1:{port}/{path}"
    h = {"Content-Type": "application/json"}
    if token:
        h["Authorization"] = "Bearer " + token
    if headers:
        h.update(headers)
    req = urllib.request.Request(url, method=method, headers=h,
                                 data=None if data is None else json.dumps(data).encode())
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            status, raw = response.status, response.read()
    except urllib.error.HTTPError as error:
        status, raw = error.code, error.read()
    body = json.loads(raw) if raw else None
    if status not in expected:
        code = body.get("code", body.get("error_code")) if isinstance(body, dict) else None
        raise AssertionError(f"{service} {method} {path}: HTTP {status}, code {code}; expected {expected}")
    return body


def ready(service, path):
    for _ in range(60):
        try:
            request(service, path)
            return
        except (OSError, AssertionError):
            time.sleep(1)
    raise RuntimeError(service + " did not become ready")


def local_service_jwt():
    def encode(value):
        return base64.urlsafe_b64encode(json.dumps(value, separators=(",", ":")).encode()).rstrip(b"=")
    payload = {"role": "service_role", "iss": "supabase", "iat": int(time.time()), "exp": int(time.time()) + 3600}
    unsigned = encode({"alg": "HS256", "typ": "JWT"}) + b"." + encode(payload)
    sig = base64.urlsafe_b64encode(hmac.new(JWT_SECRET, unsigned, hashlib.sha256).digest()).rstrip(b"=")
    return (unsigned + b"." + sig).decode()


def denied(name, path, token=None, method="GET", data=None, headers=None):
    body = request("rest", path, method, data, token, (401, 403), headers)
    check(name, body["code"] == "42501")


def main():
    subprocess.run([*COMPOSE, "up", "-d", "--wait", "db"], check=True)
    check("real PostgreSQL 17.6", sql("show server_version;").startswith("17.6"))
    # Reuse the existing infrastructure fixtures, but let GoTrue install its real
    # auth.users / sessions / refresh-token tables instead of a simplified table.
    helper = (ROOT / "tests/helpers/supabase-postgres.mjs").read_text()
    bootstrap = helper.split("await db.exec(`", 1)[1].split("`);", 1)[0]
    bootstrap = re.sub(r"create table auth\.users\s*\([\s\S]*?\);", "", bootstrap)
    assert "create table auth.users" not in bootstrap
    sql(bootstrap + "\ncreate role authenticator login noinherit password 'isolated-acceptance-rest-only';"
        "grant anon,authenticated,service_role to authenticator;")
    subprocess.run([*COMPOSE, "up", "-d", "auth"], check=True)
    ready("auth", "health")
    check("GoTrue installed real Auth tables", sql("select to_regclass('auth.refresh_tokens') is not null;") == "t")
    check("empty application schema", sql("select count(*) from pg_tables where schemaname='public';") == "0")
    files = sorted((ROOT / "supabase/migrations").glob("*.sql"))
    for file in files:
        source = re.sub(r"create\s+extension\s+if\s+not\s+exists\s+(?:pg_cron|pg_net)(?:\s+with\s+schema\s+\w+)?\s*;",
                        "-- Scheduling/network is isolated local scaffolding.", file.read_text(), flags=re.I)
        try:
            sql(source)
        except subprocess.CalledProcessError as error:
            raise RuntimeError(f"Migration {file.name}: {error.stderr}") from error
    check(f"all {len(files)} migrations replay on PostgreSQL 17.6", len(files) >= 35)
    check("24 application tables have RLS", sql("select count(*)=24 and bool_and(rowsecurity) from pg_tables where schemaname='public';") == "t")
    check("webhook state stays outside exposed schemas", sql("select not has_schema_privilege('anon','naqada_private','usage') and not has_schema_privilege('authenticated','naqada_private','usage');") == "t")
    check("no privileged accounts seeded", sql("select (select count(*) from public.directory_admins)+(select count(*) from public.directory_member_roles)+(select count(*) from public.directory_contributor_accounts);") == "0")
    subprocess.run([*COMPOSE, "up", "-d", "rest"], check=True)
    ready("rest", "directory_contributors?select=id&limit=0")
    sql("insert into public.directory_business_locations(place_id,latitude,longitude,source_url,source_name,checked_at) values('isolated-place',25.9,32.7,'https://www.google.com/maps/?q=isolated','Isolated acceptance',now());")
    coordinates = request("rest", "directory_business_locations?select=place_id,latitude,longitude")
    check("verified coordinates readable through public API", len(coordinates) == 1 and coordinates[0]["place_id"] == "isolated-place")
    denied("visitors cannot modify verified coordinates", "directory_business_locations?place_id=eq.isolated-place", method="PATCH", data={"latitude": 0})

    users = []
    for index in range(4):
        email, password = f"acceptance-{index}@example.invalid", secrets.token_urlsafe(24)
        signup = request("auth", "signup", "POST", {"email": email, "password": password,
            "data": {"full_name": f"Isolated member {index}", "role": "admin", "is_admin": True}})
        user = signup.get("user", signup)
        check(f"Auth signup {index} confirmed", bool(user.get("email_confirmed_at")))
        session = request("auth", "token?grant_type=password", "POST", {"email": email, "password": password})
        refreshed = request("auth", "token?grant_type=refresh_token", "POST", {"refresh_token": session["refresh_token"]})
        identity = request("auth", "user", token=refreshed["access_token"])
        check(f"login and refresh preserve identity {index}", identity["id"] == user["id"])
        users.append({"id": identity["id"], "token": refreshed["access_token"], "email": email})
    a, b, gold, admin = users
    aid, bid, gid = a["id"], b["id"], gold["id"]
    at, bt, gt, dt = a["token"], b["token"], gold["token"], admin["token"]
    rep = {"Prefer": "return=representation"}
    check("editable metadata cannot create an admin", request("rest", "rpc/is_directory_admin", "POST", {}, at) is False)
    check("editable metadata cannot create a reviewer", request("rest", "rpc/can_moderate_naqada", "POST", {}, at) is False)
    check("no privileged signup seeds", sql("select (select count(*) from public.directory_admins)+(select count(*) from public.directory_member_roles)+(select count(*) from public.directory_contributor_accounts);") == "0")
    sql(f"insert into public.directory_admins(email,active) values({quote(admin['email'])},true);"
        f"insert into public.directory_member_roles(user_id,role_code,role_label,frame_code,active) values({quote(gid)},'gold_moderator','Isolated reviewer','gold',true);")
    check("trusted operator provisions admin", request("rest", "rpc/is_directory_admin", "POST", {}, dt) is True)
    check("trusted operator provisions reviewer", request("rest", "rpc/can_moderate_naqada", "POST", {}, gt) is True)
    denied("member cannot enroll as admin", "directory_admins", at, "POST", {"email": a["email"]})
    denied("member cannot enroll as reviewer", "directory_member_roles", at, "POST", {"user_id": aid, "role_code": "gold_moderator", "role_label": "Forged", "frame_code": "gold"})

    contributor, hidden = str(uuid.uuid4()), str(uuid.uuid4())
    sql(f"insert into public.directory_contributors(id,slug,display_name,status) values({quote(contributor)},'synthetic-active','Isolated contributor','active'),({quote(hidden)},'synthetic-hidden','Hidden contributor','inactive');"
        f"insert into public.directory_contributor_accounts(contributor_id,user_id) values({quote(contributor)},{quote(aid)});"
        f"insert into public.directory_contributor_permissions(contributor_id,permission) values({quote(contributor)},'test_permission');")
    check("only active contributor profile public", len(request("rest", "directory_contributors?select=id,display_name")) == 1)
    check("contributor reads own mapping", len(request("rest", "directory_contributor_accounts?select=contributor_id,active", token=at)) == 1)
    check("foreign contributor mapping hidden", request("rest", "directory_contributor_accounts?select=contributor_id,active", token=bt) == [])
    check("contributor reads own permissions", len(request("rest", "directory_contributor_permissions?select=permission,enabled", token=at)) == 1)
    check("foreign contributor permissions hidden", request("rest", "directory_contributor_permissions?select=permission,enabled", token=bt) == [])
    denied("anonymous account mapping denied", "directory_contributor_accounts?select=contributor_id")
    denied("contributor cannot change permissions", f"directory_contributor_permissions?contributor_id=eq.{contributor}", at, "PATCH", {"enabled": False})
    denied("contributor cannot remap account", f"directory_contributor_accounts?user_id=eq.{aid}", at, "PATCH", {"user_id": bid})

    check("member profile reads own identity", len(request("rest", f"member_profiles?id=eq.{aid}", token=at)) == 1)
    check("member profile isolates identity", request("rest", f"member_profiles?id=eq.{aid}", token=bt) == [])
    denied("anonymous private profile denied", "member_profiles?select=id")
    check("member can edit own profile", len(request("rest", f"member_profiles?id=eq.{aid}", "PATCH", {"full_name": "Updated isolated member"}, at, headers=rep)) == 1)
    check("foreign profile edit affects no rows", request("rest", f"member_profiles?id=eq.{aid}", "PATCH", {"full_name": "Forged"}, bt, headers=rep) == [])

    service = local_service_jwt()
    # Exercise server access through HTTP without publishing a production catalog.
    for table in ("member_profiles", "directory_owner_listings", "directory_curated_content",
                  "directory_request_notifications", "analytics_pageviews"):
        check("server Data API access " + table, request("rest", table + "?select=*&limit=0", token=service) == [])
    cid = str(uuid.uuid4())
    contribution = {"id": cid, "request_type": "add", "name": "Owned isolated contribution",
                    "submitted_by_user_id": aid, "review_notes": "PRIVATE INTERNAL NOTE"}
    request("rest", "directory_contributions", "POST", contribution, service, (201,))
    request("rest", "directory_contributions", "POST", {**contribution, "id": str(uuid.uuid4()), "submitted_by_user_id": bid}, service, (201,))
    # This is the exact column projection in getContributorActivity.
    projection = "id,request_type,name,status,created_at"
    activity_path = f"directory_contributions?select={projection}&submitted_by_user_id=eq.{aid}&order=created_at.desc&limit=500"
    activity = request("rest", activity_path, token=at)
    check("real contributor activity projection works", len(activity) == 1 and activity[0]["id"] == cid)
    check("foreign JWT cannot read contributor activity", request("rest", activity_path, token=bt) == [])
    check("activity excludes internal notes", "PRIVATE" not in json.dumps(activity))
    denied("member internal review notes denied", "directory_contributions?select=id,review_notes", at)
    denied("member wildcard contribution selection denied", "directory_contributions?select=*", at)
    denied("member private contact selection denied", "directory_contributions?select=contact", at)
    denied("anonymous contributions denied", f"directory_contributions?select={projection}")
    denied("member direct intake insertion denied", "directory_contributions", at, "POST", {"request_type": "add", "name": "Forged intake"})
    denied("member direct status change denied", f"directory_contributions?id=eq.{cid}", at, "PATCH", {"status": "published"})
    review_args = {"p_id": cid, "p_action": "request_info", "p_message": "Please confirm the isolated address"}
    rejection = request("rest", "rpc/review_naqada_contribution", "POST", review_args, at, (400,))
    check("ordinary member cannot invoke review RPC", rejection["code"] == "P0001")
    denied("anonymous review RPC denied", "rpc/review_naqada_contribution", method="POST", data=review_args)
    result = request("rest", "rpc/review_naqada_contribution", "POST", review_args, dt)
    check("admin request_info accepts needs_info", result["status"] == "needs_info")
    message = request("rest", f"directory_contributions?id=eq.{cid}&select=status,review_message", token=at)
    check("member receives safe review message", message[0]["status"] == "needs_info" and message[0]["review_message"] == review_args["p_message"])
    queue = request("rest", "rpc/get_naqada_contribution_queue", "POST", {}, gt)
    check("authorized reviewer reads private queue", any(item["id"] == cid and item["reviewNotes"] == "PRIVATE INTERNAL NOTE" for item in queue["items"]))
    rejection = request("rest", "rpc/get_naqada_contribution_queue", "POST", {}, at, (400,))
    check("ordinary member cannot read review queue", rejection["code"] == "P0001")
    public_payload = {"title": "Isolated test business", "summary": "Isolated public summary without personal data",
                      "category": "Test shops", "locality": "Test village"}
    published = request("rest", "rpc/publish_naqada_contribution", "POST", {"p_id": cid, "p_payload": public_payload}, gt)
    check("gold reviewer publishes contribution", published["status"] == "published")
    public_content = request("rest", "rpc/get_public_naqada_content", "POST", {"p_kind": "business"})
    check("published contribution visible through public API", any(item["slug"] == "editor-" + cid for item in public_content))
    check("publication does not leak private note", "PRIVATE INTERNAL NOTE" not in json.dumps(public_content))

    listing = {"id": str(uuid.uuid4()), "owner_user_id": aid, "name": "Isolated owner activity",
               "phone": "01100000000", "hours": "Every test day", "address": "Isolated test address",
               "description": "Only an isolated synthetic activity for acceptance", "category": "Test shops", "locality": "Test village"}
    lid = listing["id"]
    created = request("rest", "directory_owner_listings", "POST", listing, at, (201,), rep)
    check("owner submits pending activity", created[0]["status"] == "pending")
    check("pending activity hidden from visitor", request("rest", f"directory_owner_listings?id=eq.{lid}") == [])
    check("pending activity hidden from another member", request("rest", f"directory_owner_listings?id=eq.{lid}", token=bt) == [])
    check("gold sees pending activity", len(request("rest", f"directory_owner_listings?id=eq.{lid}", token=gt)) == 1)
    self_publish = request("rest", f"directory_owner_listings?id=eq.{lid}", "PATCH", {"status": "published"}, at, headers=rep)
    check("owner cannot self-publish", self_publish[0]["status"] == "pending")
    check("foreign owner edit affects no rows", request("rest", f"directory_owner_listings?id=eq.{lid}", "PATCH", {"name": "Forged"}, bt, headers=rep) == [])
    denied("member cannot use publication RPC", "rpc/review_naqada_owner_listing", at, "POST", {"p_id": lid, "p_status": "published"})
    published = request("rest", "rpc/review_naqada_owner_listing", "POST", {"p_id": lid, "p_status": "published"}, gt)
    check("gold publication succeeds", published["ok"] and published["changed"])
    retry = request("rest", "rpc/review_naqada_owner_listing", "POST", {"p_id": lid, "p_status": "published"}, gt)
    check("review retry is idempotent", retry["ok"] and retry["changed"] is False)
    check("reviewed activity immediately public", len(request("rest", f"directory_owner_listings?id=eq.{lid}")) == 1)
    check("single publication notice", sql(f"select count(*) from public.directory_request_notifications where request_id={quote(lid)} and request_kind='business' and status='published';") == "1")
    check("single separate cover reminder", sql(f"select count(*) from public.directory_request_notifications where request_id={quote(lid)} and request_kind='cover';") == "1")
    check("single moderation audit", sql(f"select count(*) from public.directory_moderator_audit where target_id={quote(lid)};") == "1")
    check("owner receives notification", len(request("rest", f"directory_request_notifications?request_id=eq.{lid}", token=at)) == 2)
    check("notification isolated from other JWT", request("rest", f"directory_request_notifications?request_id=eq.{lid}", token=bt) == [])
    denied("anonymous notifications denied", "directory_request_notifications?select=id")

    # Execute the original SQL acceptance suites on native PostgreSQL 17 as well.
    # Each suite rolls back synthetic writes; the article suite needs a wrapper.
    for name in ("activity-review.sql", "activity-covers.sql", "request-notifications.sql", "complete-article-editor.sql"):
        source = (ROOT / "tests" / name).read_text()
        if name == "complete-article-editor.sql":
            source = "BEGIN;\n" + source + "\nROLLBACK;"
        sql(source)
        check("PostgreSQL 17 SQL suite " + name, True)
    repair = (ROOT / "supabase/migrations/20261023070942_reconcile_contribution_status_constraint.sql").read_text()
    sql(repair + repair)
    check("constraint repair can repeat", "needs_info" in sql("select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.directory_contributions'::regclass and conname='directory_contributions_status_check';"))
    denied("anonymous event reads denied", "directory_events?select=id")
    denied("service event reads remain denied", "directory_events?select=id", service)
    denied("service intake deletion remains denied", f"directory_contributions?id=eq.{cid}", service, "DELETE")
    invalid = request("rest", "rpc/is_directory_admin", "POST", {}, "invalid-jwt", (401,))
    check("invalid JWT rejected", invalid["code"].startswith("PGRST"))
    print(json.dumps({"postgres": "17.6", "migrations": len(files), "rls_tables": 24,
        "passed": len(RESULTS), "cases": RESULTS, "environment": "disposable local services; no managed resources"}), flush=True)


if __name__ == "__main__":
    try:
        main()
    except subprocess.CalledProcessError as error:
        # Commands contain only local fixture values, never remote credentials.
        print(error.stderr, flush=True)
        raise
