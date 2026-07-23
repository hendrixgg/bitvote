import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { POLL_KIND, parsePollEvent } from '@/lib/polls';
import type { Poll } from '@/lib/types';

/** Fetch all BitVote polls from relays */
export function usePolls() {
  const { nostr } = useNostr();

  return useQuery<Poll[]>({
    queryKey: ['bitvote', 'polls'],
    queryFn: async (c) => {
      const events = await nostr.query(
        [{ kinds: [POLL_KIND], '#t': ['bitvote'], limit: 100 }],
        { signal: c.signal },
      );

      return events
        .map(parsePollEvent)
        .filter((p): p is Poll => p !== null)
        .sort((a, b) => b.createdAt - a.createdAt);
    },
  });
}
