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

const CREATOR_UUIDS_KEY = 'pool-fe:creator-uuids';

function loadCreatorUuids(): Record<string, string> {
  try {
    const raw = localStorage.getItem(CREATOR_UUIDS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

/** The uuid proving this browser created `sessionId`, if it did. */
export function getCreatorUuid(sessionId: string): string | null {
  return loadCreatorUuids()[sessionId] ?? null;
}

export function saveCreatorUuid(sessionId: string, uuid: string) {
  try {
    const uuids = loadCreatorUuids();
    uuids[sessionId] = uuid;
    localStorage.setItem(CREATOR_UUIDS_KEY, JSON.stringify(uuids));
  } catch {
    /* ignore */
  }
}
