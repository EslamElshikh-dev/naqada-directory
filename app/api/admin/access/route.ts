import { isDirectoryAdmin } from '@/lib/auth/admin';
import { resolveSession, sessionJson } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await resolveSession();
  if (!session || !(await isDirectoryAdmin(session.accessToken))) {
    return sessionJson({ isAdmin: false }, session, 403);
  }
  return sessionJson({ isAdmin: true }, session);
}
