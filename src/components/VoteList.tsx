import { Bitcoin, ExternalLink, ShieldCheck, ShieldOff } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useAuthor } from '@/hooks/useAuthor';
import { formatSats, formatTimestamp, truncateHex } from '@/lib/polls';
import type { Poll, Vote } from '@/lib/types';

interface VoteListProps {
  poll: Poll;
  votes: Vote[];
}

export function VoteList({ poll, votes }: VoteListProps) {
  if (votes.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">No votes cast yet.</p>
        </CardContent>
      </Card>
    );
  }

  // Deduplicate: latest vote per pubkey
  const uniqueVotes = new Map<string, Vote>();
  for (const vote of votes) {
    const existing = uniqueVotes.get(vote.pubkey);
    if (!existing || vote.createdAt > existing.createdAt) {
      uniqueVotes.set(vote.pubkey, vote);
    }
  }

  const deduped = Array.from(uniqueVotes.values()).sort(
    (a, b) => b.createdAt - a.createdAt,
  );

  return (
    <div className="space-y-2">
      {deduped.map((vote) => (
        <VoteRow key={vote.id} poll={poll} vote={vote} />
      ))}
    </div>
  );
}

function VoteRow({ poll, vote }: { poll: Poll; vote: Vote }) {
  const author = useAuthor(vote.pubkey);
  const metadata = author.data?.metadata;
  const isVerified = vote.depositAmountSats >= poll.depositAmountSats && !!vote.depositTxId;

  // Map selected option IDs to labels
  const selectedLabels = vote.selectedOptions
    .map((optId) => poll.options.find((o) => o.id === optId)?.label)
    .filter(Boolean);

  return (
    <Card className="py-3">
      <CardContent className="flex items-center gap-3 px-4">
        {/* Avatar */}
        <Avatar size="sm">
          {metadata?.picture && <AvatarImage src={metadata.picture} alt="" />}
          <AvatarFallback className="text-[10px]">
            {(metadata?.name ?? vote.pubkey.substring(0, 2)).substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        {/* Voter info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium truncate max-w-32">
              {metadata?.name ?? truncateHex(vote.pubkey)}
            </span>
            {selectedLabels.map((label) => (
              <Badge key={label} variant="secondary" className="text-xs">
                {label}
              </Badge>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
            <span>{formatTimestamp(vote.createdAt)}</span>
            {vote.depositAmountSats > 0 && (
              <>
                <span>·</span>
                <span className="flex items-center gap-0.5">
                  <Bitcoin className="size-3 text-primary" />
                  {formatSats(vote.depositAmountSats)}
                </span>
              </>
            )}
            {vote.depositTxId && (
              <>
                <span>·</span>
                <span className="flex items-center gap-0.5">
                  {vote.depositMethod === 'lightning' ? 'LN' : 'TX'}: {truncateHex(vote.depositTxId, 4)}
                  <ExternalLink className="size-3" />
                </span>
              </>
            )}
          </div>
        </div>

        {/* Verification status */}
        {isVerified ? (
          <ShieldCheck className="size-5 shrink-0 text-emerald-500" />
        ) : (
          <ShieldOff className="size-5 shrink-0 text-muted-foreground/40" />
        )}
      </CardContent>
    </Card>
  );
}
