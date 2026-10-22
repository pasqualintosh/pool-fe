import type {
  ImportResponse,
  JoinResponse,
  SessionResults,
  SessionUpdate,
  Vote,
  VoteUpdate,
  VotingSession,
} from './types';

const API = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

export class ApiRequestError extends Error {
  status: number;
  code?: string;
  details?: Record<string, string>;
  constructor(status: number, message: string, code?: string, details?: Record<string, string>) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function api<T>(path: string, init: RequestInit = {}, username?: string): Promise<T> {
  const isForm = init.body instanceof FormData;
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, {
      ...init,
      headers: {
        ...(isForm ? {} : { 'Content-Type': 'application/json' }),
        ...(username ? { 'X-Username': username } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new ApiRequestError(0, 'Backend non raggiungibile');
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiRequestError(
      res.status,
      body?.error?.message ?? 'Richiesta non riuscita',
      body?.error?.code,
      body?.error?.details,
    );
  }
  return body as T;
}

export const normalizeSessionId = (id: string) => id.trim().toUpperCase();

export const importCsv = (file: File, uuid: string, name?: string) => {
  const form = new FormData();
  form.append('file', file);
  form.append('uuid', uuid);
  if (name?.trim()) form.append('name', name.trim());
  return api<ImportResponse>('/api/sessions/import', { method: 'POST', body: form });
};

export const getSession = (sessionId: string) =>
  api<VotingSession>(`/api/sessions/${normalizeSessionId(sessionId)}`);

export const joinSession = (sessionId: string, username: string) =>
  api<JoinResponse>(`/api/sessions/${normalizeSessionId(sessionId)}/join`, {
    method: 'POST',
    body: JSON.stringify({ username }),
  });

export const getMyVotes = (sessionId: string, username: string) =>
  api<Vote[]>(`/api/sessions/${sessionId}/votes`, {}, username);

export const updateVote = (voteId: string, username: string, update: VoteUpdate) =>
  api<Vote>(`/api/votes/${voteId}`, { method: 'PATCH', body: JSON.stringify(update) }, username);

export const updateSession = (sessionId: string, update: SessionUpdate) =>
  api<VotingSession>(`/api/sessions/${sessionId}`, { method: 'PATCH', body: JSON.stringify(update) });

export const getResults = (sessionId: string, creatorUuid?: string | null) => {
  const query = creatorUuid ? `?uuid=${encodeURIComponent(creatorUuid)}` : '';
  return api<SessionResults>(`/api/sessions/${sessionId}/results${query}`);
};
