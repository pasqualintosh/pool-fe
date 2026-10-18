import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getSession, joinSession, normalizeSessionId } from '../api/client';
import { loadIdentity, saveIdentity } from '../auth';
import type { VotingSession } from '../api/types';

export default function JoinPage() {
  const sessionId = normalizeSessionId(useParams().sessionId ?? '');
  const navigate = useNavigate();
  const [session, setSession] = useState<VotingSession | null>(null);
  const [username, setUsername] = useState(() => {
    const id = loadIdentity();
    return id?.sessionId === sessionId ? id.username : '';
  });
  const [error, setError] = useState<string | null>(null);
  const [fatal, setFatal] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getSession(sessionId).then(setSession).catch((e: Error) => setFatal(e.message));
  }, [sessionId]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await joinSession(sessionId, username.trim());
      saveIdentity({ sessionId, username: res.username });
      navigate(`/session/${sessionId}`, { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (fatal) return <div className="card narrow"><p className="error">{fatal}</p></div>;

  return (
    <form className="card narrow" onSubmit={submit}>
      <h1>Aderisci alla sessione</h1>
      <p className="muted">
        {session?.name ? `${session.name} · ` : ''}Codice <strong>{sessionId}</strong>
        {session && ` · ${session.cfp_count} proposte`}
      </p>
      {session?.status === 'closed' && <p className="banner">Sessione chiusa: potrà rientrare solo chi ha già partecipato.</p>}
      <label>
        Username
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="mario.rossi"
          minLength={2}
          maxLength={40}
          pattern="[\p{L}\p{N}._\-]+"
          title="2-40 caratteri: lettere, numeri, . _ -"
          autoFocus
          required
        />
      </label>
      {error && <p className="error">{error}</p>}
      <button className="primary" disabled={busy || !session}>
        {busy ? 'Adesione…' : 'Aderisci'}
      </button>
    </form>
  );
}
