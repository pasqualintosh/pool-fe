import { useCallback, useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { getResults, joinSession, normalizeSessionId, updateVote } from '../api/client';
import { clearIdentity, loadIdentity } from '../auth';
import {
  CRITERIA,
  CRITERIA_MAX,
  CRITERIA_MIN,
  type Criteria,
  type SessionResults,
  type Vote,
  type VotingSession,
} from '../api/types';

const RANGE = Array.from({ length: CRITERIA_MAX - CRITERIA_MIN + 1 }, (_, i) => i + CRITERIA_MIN);
const label = (k: string) => `Criterio ${k.split('_')[1]}`;

export default function VotingPage() {
  const sessionId = normalizeSessionId(useParams().sessionId ?? '');
  const identity = loadIdentity();
  const navigate = useNavigate();
  const [session, setSession] = useState<VotingSession | null>(null);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SessionResults | null>(null);
  const [resultsError, setResultsError] = useState<string | null>(null);
  const [loadingResults, setLoadingResults] = useState(false);

  const username = identity?.sessionId === sessionId ? identity.username : null;

  const refreshResults = useCallback(async () => {
    setLoadingResults(true);
    setResultsError(null);
    try {
      setResults(await getResults(sessionId));
    } catch (e) {
      setResultsError((e as Error).message);
    } finally {
      setLoadingResults(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (!username) return;
    // join is idempotent: it resumes the session and returns existing votes
    joinSession(sessionId, username)
      .then((res) => {
        setSession(res.session);
        setVotes([...res.votes].sort((a, b) => (a.cfp.order ?? 0) - (b.cfp.order ?? 0)));
      })
      .catch((e: Error) => setError(e.message));
    refreshResults();
  }, [sessionId, username, refreshResults]);

  if (!username) return <Navigate to={`/join/${sessionId}`} replace />;
  if (error) return <div className="card"><p className="error">{error}</p></div>;

  const closed = session?.status === 'closed';
  const done = votes.filter((v) => v.is_complete).length;

  function replaceVote(v: Vote) {
    setVotes((prev) => prev.map((x) => (x._id === v._id ? v : x)));
    refreshResults();
  }

  return (
    <>
      <div className="session-bar">
        <div>
          <h1>{session?.name ?? `Sessione ${sessionId}`}</h1>
          <p className="muted">
            Codice {sessionId} · {username} · votate {done}/{votes.length}
          </p>
        </div>
        <button
          onClick={() => {
            clearIdentity();
            navigate('/');
          }}
        >
          Esci
        </button>
      </div>
      {closed && <p className="banner">Votazione chiusa</p>}

      <section className="cfp-list">
        {votes.map((v) => (
          <CfpRow key={v._id} vote={v} username={username} disabled={closed} onVoted={replaceVote} />
        ))}
      </section>

      <section className="card results">
        <div className="results-head">
          <h2>Risultati</h2>
          <button onClick={refreshResults} disabled={loadingResults}>
            {loadingResults ? 'Aggiorno…' : 'Aggiorna risultati'}
          </button>
        </div>
        {resultsError && <p className="error">{resultsError}</p>}
        {results && <ResultsTable results={results} />}
      </section>
    </>
  );
}

function CfpRow({
  vote,
  username,
  disabled,
  onVoted,
}: {
  vote: Vote;
  username: string;
  disabled: boolean;
  onVoted: (v: Vote) => void;
}) {
  const { cfp } = vote;
  // A complete vote is final: once confirmed there is no way back in the UI.
  const locked = vote.is_complete || disabled;
  const [draft, setDraft] = useState<Criteria>(() => ({
    criteria_1: vote.criteria_1,
    criteria_2: vote.criteria_2,
    criteria_3: vote.criteria_3,
    criteria_4: vote.criteria_4,
  }));
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ready = CRITERIA.every((k) => draft[k] !== null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      onVoted(await updateVote(vote._id, username, draft));
      setConfirming(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className={`card cfp ${vote.is_complete ? 'voted' : ''}`}>
      <div className="cfp-info">
        <h3>{cfp.title}</h3>
        <p className="muted">
          {cfp.full_name}
          {cfp.current_role ? ` · ${cfp.current_role}` : ''}
        </p>
      </div>
      <div className="criteria">
        {CRITERIA.map((k) => (
          <label key={k}>
            {label(k)}
            <select
              value={draft[k] ?? ''}
              disabled={locked}
              onChange={(e) => setDraft({ ...draft, [k]: e.target.value ? Number(e.target.value) : null })}
            >
              <option value="">—</option>
              {RANGE.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        ))}
        {error && <p className="error">{error}</p>}
        {vote.is_complete ? (
          <span className="chip">Votato ✓</span>
        ) : (
          <button className="primary" disabled={locked || !ready || busy} onClick={() => setConfirming(true)}>
            Vota
          </button>
        )}
      </div>
      {confirming && (
        <div className="modal-backdrop">
          <div className="modal card">
            <h3>Confermi il voto?</h3>
            <p>
              «{cfp.title}»: {CRITERIA.map((k) => `${label(k)} ${draft[k]}`).join(', ')}.
              <br />
              <strong>Non sarà possibile tornare indietro.</strong>
            </p>
            <div className="actions">
              <button onClick={() => setConfirming(false)} disabled={busy}>
                Annulla
              </button>
              <button className="primary" onClick={submit} disabled={busy}>
                {busy ? 'Invio…' : 'Conferma voto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

function ResultsTable({ results }: { results: SessionResults }) {
  const fmt = (n: number | null) => (n === null ? '—' : n.toFixed(2));
  const sum = (v: Criteria) => CRITERIA.reduce((a, k) => a + (v[k] ?? 0), 0);
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>CFP / votante</th>
            {CRITERIA.map((k) => (
              <th key={k}>{label(k)}</th>
            ))}
            <th>Somma</th>
            <th>Media</th>
          </tr>
        </thead>
        {results.results.map((r) => (
          <tbody key={r.cfp._id}>
            <tr className="cfp-row">
              <td>
                <strong>{r.cfp.title}</strong>
                {r.cfp.full_name && <div className="muted">{r.cfp.full_name}</div>}
              </td>
              {CRITERIA.map((k) => (
                <td key={k}>{fmt(r[`${k}_avg` as const])}</td>
              ))}
              <td>
                <strong>{r.total_score}</strong>
              </td>
              <td>
                <strong>{fmt(r.average_score)}</strong>
              </td>
            </tr>
            {r.votes.map((v) => (
              <tr key={v.username} className="voter-row">
                <td>↳ {v.username}</td>
                {CRITERIA.map((k) => (
                  <td key={k}>{v[k] ?? '—'}</td>
                ))}
                <td>{sum(v)}</td>
                <td />
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </div>
  );
}
