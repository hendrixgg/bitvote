import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { VOTE_KIND, parseVoteEvent } from '@/lib/polls';
import type { Vote } from '@/lib/types';

/** Fetch all votes for a given poll */
export function useVotes(pollId: string | undefined) {
  const { nostr } = useNostr();

  return useQuery<Vote[]>({
    queryKey: ['bitvote', 'votes', pollId],
    enabled: !!pollId,
    queryFn: async (c) => {
      if (!pollId) return [];

      const events = await nostr.query(
        [{ kinds: [VOTE_KIND], '#e': [pollId], limit: 500 }],
        { signal: c.signal },
      );

      return events
        .map(parseVoteEvent)
        .filter((v): v is Vote => v !== null)
        .sort((a, b) => b.createdAt - a.createdAt);
    },
    refetchInterval: 30000, // Refetch every 30s for live updates
  });
}
