/**
 * Utility functions for parsing, creating, and validating BitVote polls and votes.
 * Based on NIP-88 (kind 1068 / kind 1018) with BitVote-specific extensions.
 */

import type { NostrEvent } from '@nostrify/nostrify';
import type { Poll, PollOption, PollResults, PollStatus, Vote, DepositMethod } from './types';

// ─── Kind constants ──────────────────────────────────────────────
export const POLL_KIND = 1068;
export const VOTE_KIND = 1018;

// ─── Tag helpers ─────────────────────────────────────────────────

function getTagValue(event: NostrEvent, name: string): string | undefined {
  return event.tags.find(([n]) => n === name)?.[1];
}

function getTagValues(event: NostrEvent, name: string): string[][] {
  return event.tags.filter(([n]) => n === name);
}

// ─── Generate option IDs ─────────────────────────────────────────

/** Generate a random alphanumeric option ID */
export function generateOptionId(): string {
  return Math.random().toString(36).substring(2, 11);
}

// ─── Parse Nostr events into BitVote types ───────────────────────

/** Parse a kind 1068 event into a Poll object. Returns null if invalid. */
export function parsePollEvent(event: NostrEvent): Poll | null {
  if (event.kind !== POLL_KIND) return null;

  const optionTags = getTagValues(event, 'option');
  if (optionTags.length < 2 || optionTags.length > 10) return null;

  const options: PollOption[] = optionTags.map(([, id, label]) => ({
    id: id ?? '',
    label: label ?? '',
  }));

  // Validate all options have IDs and labels
  if (options.some((o) => !o.id || !o.label)) return null;

  // Check for unique option IDs
  const ids = new Set(options.map((o) => o.id));
  if (ids.size !== options.length) return null;

  const pollType = (getTagValue(event, 'polltype') ?? 'singlechoice') as 'singlechoice' | 'multiplechoice';
  const depositAmountSats = parseInt(getTagValue(event, 'deposit_amount') ?? '0', 10);
  const depositMethod = (getTagValue(event, 'deposit_method') ?? 'either') as DepositMethod;

  const votingStartsAt = parseInt(getTagValue(event, 'startsAt') ?? String(event.created_at), 10);
  const votingEndsAt = parseInt(getTagValue(event, 'endsAt') ?? '0', 10);
  const lockupStartsAt = parseInt(getTagValue(event, 'lockup_starts') ?? String(votingStartsAt), 10);
  const lockupEndsAt = parseInt(getTagValue(event, 'lockup_ends') ?? String(votingEndsAt), 10);

  // Title is in the content field (NIP-88 style) or a "title" tag (BitVote extension)
  const title = getTagValue(event, 'title') ?? (event.content.substring(0, 50) || 'Untitled Poll');
  const description = getTagValue(event, 'description') ?? '';

  return {
    id: event.id,
    pubkey: event.pubkey,
    title,
    description,
    options,
    pollType,
    depositAmountSats,
    depositMethod,
    votingStartsAt,
    votingEndsAt,
    lockupStartsAt,
    lockupEndsAt,
    createdAt: event.created_at,
  };
}

/** Parse a kind 1018 event into a Vote object. Returns null if invalid. */
export function parseVoteEvent(event: NostrEvent): Vote | null {
  if (event.kind !== VOTE_KIND) return null;

  const pollId = getTagValue(event, 'e');
  if (!pollId) return null;

  const responseTags = getTagValues(event, 'response');
  const selectedOptions = responseTags.map(([, optionId]) => optionId).filter(Boolean);
  if (selectedOptions.length === 0) return null;

  return {
    id: event.id,
    pollId,
    pubkey: event.pubkey,
    selectedOptions,
    depositWalletId: getTagValue(event, 'deposit_wallet') ?? '',
    depositMethod: (getTagValue(event, 'deposit_type') ?? 'onchain') as 'onchain' | 'lightning',
    depositTxId: getTagValue(event, 'deposit_tx') ?? '',
    depositAmountSats: parseInt(getTagValue(event, 'deposit_amount') ?? '0', 10),
    createdAt: event.created_at,
  };
}

// ─── Build Nostr event tags from form data ───────────────────────

/** Build tags for a poll event (kind 1068) */
export function buildPollTags(params: {
  title: string;
  description: string;
  options: { id: string; label: string }[];
  pollType: 'singlechoice' | 'multiplechoice';
  depositAmountSats: number;
  depositMethod: DepositMethod;
  votingStartsAt: number;
  votingEndsAt: number;
  lockupStartsAt: number;
  lockupEndsAt: number;
}): string[][] {
  const tags: string[][] = [];

  // NIP-88 standard tags
  for (const opt of params.options) {
    tags.push(['option', opt.id, opt.label]);
  }
  tags.push(['polltype', params.pollType]);
  tags.push(['endsAt', String(params.votingEndsAt)]);
  tags.push(['startsAt', String(params.votingStartsAt)]);

  // BitVote extension tags
  tags.push(['title', params.title]);
  tags.push(['description', params.description]);
  tags.push(['deposit_amount', String(params.depositAmountSats)]);
  tags.push(['deposit_method', params.depositMethod]);
  tags.push(['lockup_starts', String(params.lockupStartsAt)]);
  tags.push(['lockup_ends', String(params.lockupEndsAt)]);

  // Alt tag for clients that don't understand this event
  tags.push(['alt', `BitVote poll: ${params.title}`]);

  // Tag for discoverability
  tags.push(['t', 'bitvote']);
  tags.push(['t', 'poll']);

  return tags;
}

/** Build tags for a vote event (kind 1018) */
export function buildVoteTags(params: {
  pollId: string;
  selectedOptions: string[];
  depositWalletId: string;
  depositMethod: 'onchain' | 'lightning';
  depositTxId: string;
  depositAmountSats: number;
}): string[][] {
  const tags: string[][] = [];

  // NIP-88 standard tags
  tags.push(['e', params.pollId]);
  for (const optionId of params.selectedOptions) {
    tags.push(['response', optionId]);
  }

  // BitVote extension tags
  tags.push(['deposit_wallet', params.depositWalletId]);
  tags.push(['deposit_type', params.depositMethod]);
  tags.push(['deposit_tx', params.depositTxId]);
  tags.push(['deposit_amount', String(params.depositAmountSats)]);

  // Alt tag
  tags.push(['alt', 'BitVote poll response']);

  return tags;
}

// ─── Poll status ─────────────────────────────────────────────────

/** Determine the current status of a poll */
export function getPollStatus(poll: Poll): PollStatus {
  const now = Math.floor(Date.now() / 1000);

  if (now < poll.votingStartsAt) return 'upcoming';
  if (now >= poll.votingStartsAt && now <= poll.votingEndsAt) return 'active';
  if (now > poll.votingEndsAt && now <= poll.lockupEndsAt) return 'lockup';
  return 'ended';
}

/** Get a human-readable status label */
export function getPollStatusLabel(status: PollStatus): string {
  switch (status) {
    case 'upcoming': return 'Upcoming';
    case 'active': return 'Voting Open';
    case 'lockup': return 'Lockup Period';
    case 'ended': return 'Ended';
  }
}

// ─── Calculate results ───────────────────────────────────────────

/** Calculate poll results from a set of votes. Enforces one vote per pubkey. */
export function calculatePollResults(poll: Poll, votes: Vote[]): PollResults {
  // Deduplicate: keep latest vote per pubkey (within voting period)
  const voteMap = new Map<string, Vote>();
  for (const vote of votes) {
    if (vote.createdAt > poll.votingEndsAt) continue; // ignore votes after deadline
    const existing = voteMap.get(vote.pubkey);
    if (!existing || vote.createdAt > existing.createdAt) {
      voteMap.set(vote.pubkey, vote);
    }
  }

  const deduped = Array.from(voteMap.values());
  const totalVoters = deduped.length;
  const verifiedVoters = deduped.filter((v) => v.depositAmountSats >= poll.depositAmountSats && v.depositTxId).length;

  // Count each option
  const optionCounts: Record<string, number> = {};
  for (const opt of poll.options) {
    optionCounts[opt.id] = 0;
  }

  for (const vote of deduped) {
    if (poll.pollType === 'singlechoice') {
      const selected = vote.selectedOptions[0];
      if (selected && selected in optionCounts) {
        optionCounts[selected]++;
      }
    } else {
      // multiplechoice — count each unique selection
      const seen = new Set<string>();
      for (const optId of vote.selectedOptions) {
        if (optId in optionCounts && !seen.has(optId)) {
          optionCounts[optId]++;
          seen.add(optId);
        }
      }
    }
  }

  // Calculate percentages
  const optionPercentages: Record<string, number> = {};
  for (const opt of poll.options) {
    optionPercentages[opt.id] = totalVoters > 0
      ? Math.round((optionCounts[opt.id] / totalVoters) * 100)
      : 0;
  }

  return { totalVoters, optionCounts, optionPercentages, verifiedVoters };
}

// ─── Validation ──────────────────────────────────────────────────

/** Validate that a vote's selected options match the poll */
export function validateVoteOptions(poll: Poll, selectedOptions: string[]): string | null {
  if (selectedOptions.length === 0) {
    return 'You must select at least one option.';
  }

  const validIds = new Set(poll.options.map((o) => o.id));
  for (const optId of selectedOptions) {
    if (!validIds.has(optId)) {
      return `Invalid option: ${optId}`;
    }
  }

  if (poll.pollType === 'singlechoice' && selectedOptions.length > 1) {
    return 'This poll allows only one selection.';
  }

  return null;
}

// ─── Formatting helpers ──────────────────────────────────────────

/** Format satoshis for display */
export function formatSats(sats: number): string {
  if (sats >= 100_000_000) {
    return `${(sats / 100_000_000).toFixed(8).replace(/\.?0+$/, '')} BTC`;
  }
  return `${sats.toLocaleString()} sats`;
}

/** Format a unix timestamp for display */
export function formatTimestamp(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Short relative time (e.g., "2h ago", "in 3d") */
export function relativeTime(ts: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = ts - now;
  const absDiff = Math.abs(diff);

  if (absDiff < 60) return diff > 0 ? 'in a moment' : 'just now';
  if (absDiff < 3600) {
    const m = Math.floor(absDiff / 60);
    return diff > 0 ? `in ${m}m` : `${m}m ago`;
  }
  if (absDiff < 86400) {
    const h = Math.floor(absDiff / 3600);
    return diff > 0 ? `in ${h}h` : `${h}h ago`;
  }
  const d = Math.floor(absDiff / 86400);
  return diff > 0 ? `in ${d}d` : `${d}d ago`;
}

/** Truncate a hex string for display */
export function truncateHex(hex: string, chars: number = 8): string {
  if (hex.length <= chars * 2) return hex;
  return `${hex.substring(0, chars)}...${hex.substring(hex.length - chars)}`;
}
