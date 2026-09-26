import { isDirectoryAdmin } from '@/lib/auth/admin';
import { isGoldModerator } from '@/lib/auth/moderator';
import { resolveSession, sessionJson } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await resolveSession();
  if (!session) return sessionJson({ isAdmin: false, isModerator: false }, null, 403);
  const [isAdmin, isModerator] = await Promise.all([
    isDirectoryAdmin(session.accessToken), isGoldModerator(session.accessToken),
  ]);
  return sessionJson({ isAdmin, isModerator }, session, isAdmin || isModerator ? 200 : 403);
}
