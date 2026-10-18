const KEY = 'pool-fe:identity';

export interface Identity {
  sessionId: string;
  username: string;
}

export function loadIdentity(): Identity | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Identity) : null;
  } catch {
    return null;
  }
}

export function saveIdentity(identity: Identity) {
  try {
    localStorage.setItem(KEY, JSON.stringify(identity));
  } catch {
    /* ignore */
  }
}

export function clearIdentity() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
