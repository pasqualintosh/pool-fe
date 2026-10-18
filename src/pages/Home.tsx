import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSession, importCsv, normalizeSessionId } from '../api/client';

type Tab = 'import' | 'code';

export default function Home() {
  const [tab, setTab] = useState<Tab>('code');
  return (
    <div className="card narrow">
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'code'} onClick={() => setTab('code')}>
          Inserisci un codice sessione
        </button>
        <button role="tab" aria-selected={tab === 'import'} onClick={() => setTab('import')}>
          Importa CSV
        </button>
      </div>
      {tab === 'code' ? <CodeForm /> : <ImportForm />}
    </div>
  );
}

function CodeForm() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const id = normalizeSessionId(code);
      await getSession(id);
      navigate(`/join/${id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <label>
        Codice sessione
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          maxLength={8}
          placeholder="K7MQ2XPA"
          autoFocus
          required
        />
      </label>
      {error && <p className="error">{error}</p>}
      <button className="primary" disabled={busy}>
        {busy ? 'Verifica…' : 'Continua'}
      </button>
    </form>
  );
}

function ImportForm() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const res = await importCsv(file, name);
      navigate(`/join/${res.session_id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <label>
        Nome sessione (opzionale)
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label>
        File CSV (max 4 MB)
        <input type="file" accept=".csv,text/csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required />
      </label>
      {error && <p className="error">{error}</p>}
      <button className="primary" disabled={busy || !file}>
        {busy ? 'Importo…' : 'Importa e crea sessione'}
      </button>
    </form>
  );
}
