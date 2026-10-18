/**
 * Public API contract: request/response shapes returned by the backend.
 * This file has no imports on purpose, so the frontend can copy it verbatim.
 */

export type SessionStatus = 'open' | 'closed';

export const CRITERIA = ['criteria_1', 'criteria_2', 'criteria_3', 'criteria_4'] as const;
export type CriterionKey = (typeof CRITERIA)[number];
export const CRITERIA_MIN = 1;
export const CRITERIA_MAX = 10;

/** Integer between CRITERIA_MIN and CRITERIA_MAX, or null when not voted yet. */
export type CriterionValue = number | null;
export type Criteria = Record<CriterionKey, CriterionValue>;

export interface Participant {
  username: string;
  joined_at: string; // ISO date
}

export interface VotingSession {
  session_id: string;
  name: string | null;
  status: SessionStatus;
  cfp_count: number;
  participants: Participant[];
  created_at: string;
  closed_at: string | null;
}

/** A CFP as voters see it (speaker contact details stripped). */
export interface Cfp {
  _id: string;
  chronological_information: string | null; // form submission date, e.g. "26/09/2026 16.33.13"
  full_name: string | null;
  linkedin_github_website: string | null;
  current_role: string | null;
  title: string;
  description: string | null; // may contain newlines
  includes_live_coding_or_demo: string | null; // e.g. "Si" / "No"
  already_spoken_at_tech_events: string | null; // e.g. "Si" / "No"
  specific_technical_requirements: string | null;
  order: number | null;
  time: string | null; // e.g. "18:15"
  column_1: string | null;
  column_2: string | null;
  created_at: string;
  updated_at: string;
}

/** A CFP including the speaker contact details (returned only by the CSV import). */
export interface CfpWithContacts extends Cfp {
  email_address: string | null;
  email: string | null;
  phone: string | null;
}

export interface Vote extends Criteria {
  _id: string;
  session_id: string;
  username: string;
  cfp: Cfp;
  is_complete: boolean; // true when all criteria are set
  created_at: string;
  updated_at: string;
}

// --- Requests --------------------------------------------------------------

export interface JoinRequest {
  username: string;
}

/** Partial update: send only the criteria that changed; null resets one. */
export type VoteUpdate = Partial<Criteria>;

export interface SessionUpdate {
  status?: SessionStatus;
  name?: string | null;
}

// --- Responses -------------------------------------------------------------

export interface JoinResponse {
  session: VotingSession;
  username: string; // normalized username: use this one from now on
  votes: Vote[];
}

export interface ImportResponse extends VotingSession {
  cfps: CfpWithContacts[];
}

export interface VoterScores extends Criteria {
  username: string;
}

export interface CfpResult {
  cfp: Pick<Cfp, '_id' | 'title' | 'full_name' | 'order'>;
  voters: number; // participants with a vote record on this CFP
  complete_votes: number; // votes with all criteria set
  criteria_1_avg: number | null;
  criteria_2_avg: number | null;
  criteria_3_avg: number | null;
  criteria_4_avg: number | null;
  average_score: number | null; // mean of the criteria averages, 2 decimals
  total_score: number; // sum of every criterion score given by every voter (nulls ignored)
  votes: VoterScores[]; // what each participant voted on this CFP, sorted by username
}

export interface SessionResults {
  session_id: string;
  status: SessionStatus;
  results: CfpResult[]; // sorted by average_score desc
}

export interface ApiError {
  error: {
    code: string; // e.g. "BAD_REQUEST", "NOT_FOUND", "FORBIDDEN", "CONFLICT"
    message: string;
    details?: Record<string, string>; // per-field errors
  };
}
