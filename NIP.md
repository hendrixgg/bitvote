# BitVote — Custom Nostr Schema

BitVote extends [NIP-88 (Polls)](https://github.com/nostr-protocol/nips/blob/master/88.md) with Bitcoin-deposit-backed voting. The base protocol uses **kind 1068** for polls and **kind 1018** for poll responses, as defined in NIP-88.

## Extensions to kind 1068 (Poll)

BitVote adds the following tags to NIP-88 poll events:

| Tag | Description | Example |
|-----|-------------|---------|
| `title` | Poll title (max 50 chars) | `["title", "Best Bitcoin wallet?"]` |
| `description` | Poll description (max 500 chars) | `["description", "Vote for your preferred..."]` |
| `deposit_amount` | Required BTC deposit in satoshis | `["deposit_amount", "10000"]` |
| `deposit_method` | Accepted deposit method: `onchain`, `lightning`, or `either` | `["deposit_method", "either"]` |
| `startsAt` | Unix timestamp when voting opens | `["startsAt", "1720000000"]` |
| `lockup_starts` | Unix timestamp when deposit lockup begins | `["lockup_starts", "1720000000"]` |
| `lockup_ends` | Unix timestamp when deposit lockup ends (must be ≥ `endsAt`) | `["lockup_ends", "1720500000"]` |
| `t` | Topic tags for discoverability | `["t", "bitvote"]`, `["t", "poll"]` |
| `alt` | NIP-31 alt text | `["alt", "BitVote poll: Best Bitcoin wallet?"]` |

Standard NIP-88 tags (`option`, `polltype`, `endsAt`, `relay`) are preserved.

## Extensions to kind 1018 (Poll Response / Vote)

BitVote adds deposit proof tags to NIP-88 vote events:

| Tag | Description | Example |
|-----|-------------|---------|
| `deposit_wallet` | Wallet address or invoice used for deposit | `["deposit_wallet", "bc1q..."]` |
| `deposit_type` | Deposit method used: `onchain` or `lightning` | `["deposit_type", "onchain"]` |
| `deposit_tx` | Transaction ID or payment hash | `["deposit_tx", "abc123..."]` |
| `deposit_amount` | Amount deposited in satoshis | `["deposit_amount", "10000"]` |
| `alt` | NIP-31 alt text | `["alt", "BitVote poll response"]` |

Standard NIP-88 tags (`e`, `response`) are preserved.

## Discovery

All BitVote polls include `["t", "bitvote"]` for relay-level filtering:

```ts
nostr.query([{ kinds: [1068], '#t': ['bitvote'], limit: 100 }])
```

## Validation Rules

1. **One vote per pubkey**: For duplicate votes from the same pubkey, the latest event (by `created_at`) within the voting period is used.
2. **Vote option check**: Each `response` tag value must match an `option` ID from the referenced poll.
3. **Deposit verification**: Votes with `deposit_amount` ≥ the poll's required amount AND a non-empty `deposit_tx` are considered "verified."
4. **Timeline enforcement**: Votes with `created_at` after the poll's `endsAt` are excluded from results.
