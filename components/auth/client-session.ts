'use client';

export type ClientSessionUser = {
  id: string;
  displayName: string;
  email: string;
  avatarUrl: string;
  emailVerified: boolean;
  createdAt: string;
};

type Listener = (user: ClientSessionUser | null | undefined) => void;
let cachedUser: ClientSessionUser | null | undefined;
let pending: Promise<ClientSessionUser | null> | null = null;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((listener) => listener(cachedUser));
}

async function load(force = false) {
  if (!force && cachedUser !== undefined) return cachedUser;
  if (!force && pending) return pending;
  pending = fetch('/api/auth/session', { cache: 'no-store', credentials: 'same-origin' })
    .then(async (response) => {
      if (!response.ok) return null;
      const data = await response.json() as { user?: ClientSessionUser | null };
      return data.user || null;
    })
    .catch(() => null)
    .then((user) => {
      cachedUser = user;
      emit();
      return user;
    })
    .finally(() => { pending = null; });
  return pending;
}

export function ensureClientSession() { return load(false); }
export function refreshClientSession() { cachedUser = undefined; emit(); return load(true); }
export function setClientSessionUser(user: ClientSessionUser | null) { cachedUser = user; emit(); }
export function updateClientSessionUser(patch: Partial<ClientSessionUser>) {
  if (cachedUser) { cachedUser = { ...cachedUser, ...patch }; emit(); }
}
export function subscribeClientSession(listener: Listener) {
  listeners.add(listener);
  listener(cachedUser);
  return () => { listeners.delete(listener); };
}
