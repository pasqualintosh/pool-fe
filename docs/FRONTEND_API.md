# Panormous-tech CFP Voting: guida API per il frontend

Backend Express + MongoDB per votare le proposte della call for papers (CFP).
Questa guida descrive endpoint, interfacce TypeScript e flussi da implementare nel frontend.

- **Base URL**: `http://localhost:3000` in locale, `https://<progetto>.vercel.app` in produzione
- **Formato**: JSON (`Content-Type: application/json`), tranne l'import CSV (multipart)
- **Prefisso**: tutte le rotte iniziano con `/api`

---

## 1. Concetti

| Concetto | Descrizione |
| --- | --- |
| **CFP** | Una proposta di talk, importata da CSV. |
| **Voting session** | Un insieme di CFP da votare, identificato da un **session id** di 8 caratteri (es. `K7MQ2XPA`). Stato `open` o `closed`. |
| **Participant** | Un utente che si è unito alla sessione con il proprio `username`. |
| **Vote** | Un record per ogni coppia *(utente, CFP)* della sessione, creato automaticamente al join con i 4 criteri a `null`. Votare significa fare `PATCH` su questo record. |

### Identificazione dell'utente

Non c'è login: l'utente si identifica con **session id + username**.

- Lo username è **case-insensitive** e viene normalizzato in minuscolo (`" Mario "` diventa `"mario"`).
- Regole: 2-40 caratteri, solo lettere, numeri, `.`, `_` e `-`.
- Nelle chiamate "utente" (lettura voti, voto) lo username va inviato nell'header **`X-Username`**.
- Salvate `sessionId` e `username` nel `localStorage` per permettere di riprendere la votazione dopo un refresh.

> ⚠️ Per ora **non c'è autenticazione**: chi conosce session id e username può votare a nome di quell'utente, e gli endpoint di gestione (sezione 4) sono aperti a chiunque raggiunga l'API. È adatto a un uso interno tra organizzatori. In futuro è prevista un'integrazione con Auth0 o un sistema simile.

### Sessione id

8 caratteri maiuscoli, alfabeto `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (niente `0`, `O`, `1`, `I`).
Il backend accetta anche input minuscolo, ma conviene mostrare e inviare il valore in maiuscolo.

### Criteri di valutazione

`criteria_1`, `criteria_2`, `criteria_3`, `criteria_4`: **interi da 1 a 10**, oppure `null` (non ancora votato o reset).

---

## 2. Interfacce TypeScript

Il contratto dell'API sta nel backend, in **`src/types.ts`**. Il file non ha import: **copiatelo così com'è nel frontend** (per esempio in `src/api/types.ts`).
Il backend costruisce ogni risposta a partire da questi tipi (`src/serializers.ts`), quindi se il file cambia lo fa insieme all'API.

Tipi principali:

| Tipo | Uso |
| --- | --- |
| `VotingSession`, `Participant` | Info sessione |
| `Cfp` / `CfpWithContacts` | Proposta senza contatti / con email e telefono (solo nella risposta dell'import) |
| `Vote`, `Criteria`, `CriterionValue` | Record voto con i 4 criteri e `is_complete` |
| `JoinRequest`, `VoteUpdate`, `SessionUpdate` | Body delle richieste |
| `JoinResponse`, `ImportResponse`, `SessionResults`, `CfpResult` | Risposte |
| `ApiError` | Formato degli errori |
| `CRITERIA`, `CRITERIA_MIN`, `CRITERIA_MAX` | Costanti per costruire la UI dei criteri |

Note:
- Le date sono stringhe ISO 8601.
- `Cfp.description` può contenere a capo: renderizzatela con `white-space: pre-line`.
- `includes_live_coding_or_demo` e `already_spoken_at_tech_events` sono testo libero del form (es. `"Si"` / `"No"`).
- `Vote.cfp` è sempre popolata nelle risposte.
- `ApiError.error.details` c'è solo per errori su campi specifici (es. `{ "criteria_1": "must be..." }`). Per gli altri errori leggete `message`.

---

## 3. Endpoint utente (votanti)

### `GET /api/sessions/:sessionId`

Informazioni pubbliche sulla sessione. Usatelo per verificare che il codice esista prima del join.

**200** → `VotingSession` · **404** sessione inesistente · **400** formato id non valido

---

### `POST /api/sessions/:sessionId/join`

Unisce l'utente alla sessione e crea i suoi record voto (uno per CFP, criteri a `null`).
**Idempotente**: se l'utente è già nella sessione restituisce i voti esistenti, senza azzerarli. Usatelo anche per "riprendere" la sessione.

```http
POST /api/sessions/K7MQ2XPA/join
Content-Type: application/json

{ "username": "Mario" }
```

| Status | Significato |
| --- | --- |
| **201** | Nuovo partecipante → `JoinResponse` |
| **200** | Già partecipante → `JoinResponse` con i voti esistenti |
| **400** | username non valido |
| **404** | sessione inesistente |
| **409** | sessione chiusa e utente non ancora partecipante |

Un utente già partecipante può rientrare anche a sessione chiusa (sola lettura).

---

### `GET /api/sessions/:sessionId/cfps`

Elenco delle CFP della sessione (`Cfp[]`), ordinate per `order`. Non richiede username.
Non serve se usate il join, perché ogni `Vote` contiene già la sua `cfp`.

---

### `GET /api/sessions/:sessionId/votes`

Tutti i voti dell'utente nella sessione (`Vote[]`, con `cfp` popolata).

```http
GET /api/sessions/K7MQ2XPA/votes
X-Username: mario
```

**200** `Vote[]` · **401** manca `X-Username` · **403** utente non partecipante · **404** sessione inesistente

---

### `GET /api/votes/:voteId`

Un singolo voto dell'utente. Header `X-Username` obbligatorio.

**200** `Vote` · **403** il voto appartiene a un altro utente · **404** voto inesistente

---

### `PATCH /api/votes/:voteId`

Aggiorna i criteri di un voto e **restituisce il record aggiornato**.
L'aggiornamento è **parziale**: inviate solo i criteri modificati. `null` azzera un criterio.

```http
PATCH /api/votes/6710c2f1e4b0a1b2c3d4e5f6
X-Username: mario
Content-Type: application/json

{ "criteria_1": 8, "criteria_3": 10 }
```

| Status | Significato |
| --- | --- |
| **200** | `Vote` aggiornato |
| **400** | valori non validi (non interi, fuori range 1-10, campi sconosciuti, body vuoto). `details` indica il campo |
| **401** | manca `X-Username` |
| **403** | il voto appartiene a un altro utente |
| **404** | voto inesistente |
| **409** | sessione chiusa: il voto non è più modificabile |

Esempio di errore 400:

```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "Invalid criteria",
    "details": { "criteria_1": "must be an integer between 1 and 10, or null" }
  }
}
```

---

## 4. Endpoint di gestione sessioni

Servono a creare, chiudere e analizzare le sessioni. Non richiedono header particolari.
Si possono usare da una pagina di gestione del frontend oppure via curl/Postman.

### `POST /api/sessions/import`

Carica il CSV delle CFP (export di Google Forms), crea i record CFP e una nuova voting session.

`multipart/form-data`:
- `file` (obbligatorio): il CSV, max 4 MB
- `uuid` (obbligatorio): un identificatore generato dal frontend (es. `crypto.randomUUID()`) **prima** della richiesta. Salvatelo in `localStorage`: è il segreto che identifica chi ha creato la sessione e serve per vedere i voti non anonimizzati in `/results` (vedi sotto). Non viene mai restituito da nessuna risposta, quindi se lo perdete non è recuperabile.
- `name` (opzionale): nome leggibile della sessione

```bash
curl -X POST http://localhost:3000/api/sessions/import \
  -F "name=CFP Panormous 2026" \
  -F "uuid=$(uuidgen)" \
  -F "file=@cfp.csv"
```

**201** → `ImportResponse` (`VotingSession & { cfps: CfpWithContacts[] }`). Comunicate il `session_id` ai votanti.

È l'unica risposta che include i contatti degli speaker (`email_address`, `email`, `phone`). Tutti gli altri endpoint li omettono.

Le colonne sono mappate **per posizione** sui campi seguenti:

| Colonna CSV | Campo DB |
| --- | --- |
| Informazioni cronologiche | `chronological_information` |
| Indirizzo email | `email_address` |
| Nome e Cognome | `full_name` |
| Email | `email` |
| Telefono | `phone` |
| Profilo Linkedin / github / sito | `linkedin_github_website` |
| Ruolo attuale | `current_role` |
| Titolo | `title` |
| Descrizione | `description` |
| Il talk include live coding o demo? | `includes_live_coding_or_demo` |
| Hai già parlato a eventi tech? | `already_spoken_at_tech_events` |
| Esigenze tecniche particolari | `specific_technical_requirements` |
| Ordine | `order` (numero) |
| Orario | `time` |
| Colonna 1 | `column_1` |
| Colonna 2 | `column_2` |

Le righe senza titolo vengono ignorate. Le celle vuote diventano `null`.

### `GET /api/sessions`

Elenco di tutte le sessioni (`VotingSession[]`), dalla più recente.

### `PATCH /api/sessions/:sessionId`

Chiude o riapre una sessione e/o la rinomina.

```json
{ "status": "closed" }
```
```json
{ "status": "open", "name": "CFP 2026 - secondo giro" }
```

**200** → `VotingSession` aggiornata.

### `GET /api/sessions/:sessionId/results`

Classifica aggregata → `SessionResults`. Le medie ignorano i criteri `null`.
Ogni `CfpResult` include anche `total_score` (somma di tutti i punteggi di tutti i votanti) e `votes` (i singoli punteggi dati a quella CFP, **anonimizzati** di default: nessun campo username, solo i criteri).

Query param opzionale `uuid`: se corrisponde allo `uuid` passato all'`/import` di questa sessione (quello salvato in `localStorage` da chi l'ha creata), ogni voce di `votes` include anche `username` — solo chi ha creato la sessione può quindi vedere chi ha votato cosa.

```
GET /api/sessions/:sessionId/results?uuid=<quello salvato in localStorage>
```

---

## 5. Flussi di interazione

### 5.1 Accesso alla sessione

```
[Schermata "Entra"]
  input: session id, username
        │
        ▼
POST /api/sessions/:sessionId/join  { username }
        │
        ├── 201/200 → salva { sessionId, username: res.username } in localStorage
        │             → vai a "Lista proposte" con res.votes
        ├── 404     → "Sessione non trovata"
        ├── 409     → "La sessione è chiusa"
        └── 400     → mostra error.message sotto il campo username
```

Al refresh, se `localStorage` contiene `sessionId` e `username`, rifate il join (è idempotente) oppure `GET /votes` per ricaricare lo stato.

### 5.2 Lista proposte

- Mostrate le `votes` ordinate per `vote.cfp.order` con titolo, speaker e stato (`is_complete`).
- Indicatore di avanzamento: `votes.filter(v => v.is_complete).length / votes.length`.
- Se `session.status === 'closed'` disabilitate gli input e mostrate un banner "Votazione chiusa".

### 5.3 Votazione di una proposta

```
[Dettaglio CFP]  titolo, descrizione (pre-line), ruolo, link, demo sì/no...
  4 controlli 1-10 (slider, select o stelle)
        │  al cambio (debounce ~400ms) oppure al click su "Salva"
        ▼
PATCH /api/votes/:voteId   X-Username   { criteria_N: value }
        │
        ├── 200 → sostituisci il vote nello stato locale con la risposta
        ├── 409 → sessione chiusa: blocca la UI e ricarica la sessione
        └── 400 → mostra error.details[criteria_N]
```

Il voto resta modificabile fino alla chiusura della sessione: la stessa PATCH serve per creare e per modificare.

### 5.4 Chiusura e risultati

```
PATCH /api/sessions/:id { status: "closed" }  →  GET /api/sessions/:id/results
```

---

## 6. Esempio di client

```ts
import type { JoinResponse, Vote, VoteUpdate, VotingSession } from './types'; // copia di src/types.ts

const API = import.meta.env.VITE_API_URL; // es. http://localhost:3000

async function api<T>(path: string, init: RequestInit = {}, username?: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(username ? { 'X-Username': username } : {}),
      ...init.headers,
    },
  });
  const body = await res.json();
  if (!res.ok) throw Object.assign(new Error(body.error?.message ?? 'Request failed'), { status: res.status, ...body.error });
  return body as T;
}

export const getSession = (sessionId: string) =>
  api<VotingSession>(`/api/sessions/${sessionId.trim().toUpperCase()}`);

export const joinSession = (sessionId: string, username: string) =>
  api<JoinResponse>(`/api/sessions/${sessionId.trim().toUpperCase()}/join`, {
    method: 'POST',
    body: JSON.stringify({ username }),
  });

export const getMyVotes = (sessionId: string, username: string) =>
  api<Vote[]>(`/api/sessions/${sessionId}/votes`, {}, username);

export const updateVote = (voteId: string, username: string, update: VoteUpdate) =>
  api<Vote>(`/api/votes/${voteId}`, { method: 'PATCH', body: JSON.stringify(update) }, username);
```

---

## 7. CORS

Il backend accetta richieste solo dalle origini in `CORS_ORIGINS` (lista separata da virgole, es. `http://localhost:5173,https://voting.panormous.tech`).
Se il frontend gira su un'altra origine, va aggiunta lì (e nelle env di Vercel).

## 8. Health check

`GET /api/health` → `{ "status": "ok" }` (non tocca il database).
