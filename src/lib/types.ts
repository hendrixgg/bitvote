/** Core types for BitVote — Bitcoin-backed Nostr polls */

/** A parsed poll derived from a NIP-88 kind 1068 event with BitVote extensions */
export interface Poll {
  /** Nostr event ID (hex) — serves as the unique poll ID */
  id: string;
  /** Nostr pubkey (hex) of the poll creator */
  pubkey: string;
  /** Poll title (max 50 chars) */
  title: string;
  /** Poll description (max 500 chars) */
  description: string;
  /** Vote options — at least 2, at most 10 */
  options: PollOption[];
  /** "singlechoice" | "multiplechoice" */
  pollType: 'singlechoice' | 'multiplechoice';
  /** Bitcoin deposit required to validate a vote (in sats) */
  depositAmountSats: number;
  /** Deposit method: "onchain" | "lightning" | "either" */
  depositMethod: DepositMethod;
  /** Vote casting period */
  votingStartsAt: number; // unix timestamp
  votingEndsAt: number; // unix timestamp
  /** Bitcoin deposit lockup period */
  lockupStartsAt: number; // unix timestamp
  lockupEndsAt: number; // unix timestamp
  /** When the poll event was created */
  createdAt: number; // unix timestamp
}

export interface PollOption {
  /** Unique identifier for this option (alphanumeric) */
  id: string;
  /** Human-readable label */
  label: string;
}

export type DepositMethod = 'onchain' | 'lightning' | 'either';

/** A parsed vote derived from a NIP-88 kind 1018 event with BitVote extensions */
export interface Vote {
  /** Nostr event ID of the vote event */
  id: string;
  /** The poll this vote belongs to (event ID) */
  pollId: string;
  /** Nostr pubkey (hex) of the voter */
  pubkey: string;
  /** Which option(s) were selected (option IDs) */
  selectedOptions: string[];
  /** Bitcoin deposit wallet address or invoice for proof of reserves */
  depositWalletId: string;
  /** Deposit method used */
  depositMethod: 'onchain' | 'lightning';
  /** Transaction ID or payment hash for verification */
  depositTxId: string;
  /** Amount deposited in sats */
  depositAmountSats: number;
  /** When the vote was created */
  createdAt: number;
}

/** Aggregated results for a poll */
export interface PollResults {
  /** Total unique voters */
  totalVoters: number;
  /** Count per option */
  optionCounts: Record<string, number>;
  /** Percentage per option (0-100) */
  optionPercentages: Record<string, number>;
  /** Verified (deposit confirmed) votes */
  verifiedVoters: number;
}

/** Status of a poll based on current time */
export type PollStatus = 'upcoming' | 'active' | 'ended' | 'lockup';

/** Form data for creating a new poll */
export interface CreatePollForm {
  title: string;
  description: string;
  options: string[];
  depositAmountSats: number;
  depositMethod: DepositMethod;
  votingStartsAt: Date;
  votingEndsAt: Date;
  lockupEndsAt: Date;
}
