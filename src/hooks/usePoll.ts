import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { POLL_KIND, parsePollEvent } from '@/lib/polls';
import type { Poll } from '@/lib/types';

/** Fetch a single poll by its event ID */
export function usePoll(pollId: string | undefined) {
  const { nostr } = useNostr();

  return useQuery<Poll | null>({
    queryKey: ['bitvote', 'poll', pollId],
    enabled: !!pollId,
    queryFn: async (c) => {
      if (!pollId) return null;

      const events = await nostr.query(
        [{ kinds: [POLL_KIND], ids: [pollId], limit: 1 }],
        { signal: c.signal },
      );

      if (events.length === 0) return null;
      return parsePollEvent(events[0]);
    },
  });
}
