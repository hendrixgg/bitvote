import { Link } from 'react-router-dom';
import { Bitcoin, Clock, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PollStatusBadge } from '@/components/PollStatusBadge';
import { formatSats, relativeTime, getPollStatus } from '@/lib/polls';
import type { Poll } from '@/lib/types';
import { useAuthor } from '@/hooks/useAuthor';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface PollCardProps {
  poll: Poll;
  voteCount?: number;
}

export function PollCard({ poll, voteCount }: PollCardProps) {
  const author = useAuthor(poll.pubkey);
  const metadata = author.data?.metadata;
  const status = getPollStatus(poll);

  return (
    <Link to={`/poll/${poll.id}`} className="group block">
      <Card className="transition-all duration-200 hover:shadow-md hover:border-primary/30 motion-safe:hover:-translate-y-0.5">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <CardTitle className="text-lg leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                {poll.title}
              </CardTitle>
              {poll.description && (
                <CardDescription className="mt-1.5 line-clamp-2">
                  {poll.description}
                </CardDescription>
              )}
            </div>
            <PollStatusBadge poll={poll} />
          </div>
        </CardHeader>
        <CardContent>
          {/* Options preview */}
          <div className="mb-4 flex flex-wrap gap-1.5">
            {poll.options.slice(0, 4).map((opt) => (
              <span
                key={opt.id}
                className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
              >
                {opt.label}
              </span>
            ))}
            {poll.options.length > 4 && (
              <span className="rounded-md bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                +{poll.options.length - 4} more
              </span>
            )}
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            {/* Author */}
            <div className="flex items-center gap-1.5">
              <Avatar size="sm">
                {metadata?.picture && <AvatarImage src={metadata.picture} alt="" />}
                <AvatarFallback className="text-[10px]">
                  {(metadata?.name ?? poll.pubkey.substring(0, 2)).substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="max-w-24 truncate">{metadata?.name ?? `${poll.pubkey.substring(0, 8)}...`}</span>
            </div>

            {/* Deposit */}
            <div className="flex items-center gap-1">
              <Bitcoin className="size-3 text-primary" />
              <span>{formatSats(poll.depositAmountSats)}</span>
            </div>

            {/* Timing */}
            <div className="flex items-center gap-1">
              <Clock className="size-3" />
              <span>
                {status === 'upcoming'
                  ? `Starts ${relativeTime(poll.votingStartsAt)}`
                  : status === 'active'
                    ? `Ends ${relativeTime(poll.votingEndsAt)}`
                    : status === 'lockup'
                      ? `Lockup ends ${relativeTime(poll.lockupEndsAt)}`
                      : `Ended ${relativeTime(poll.votingEndsAt)}`}
              </span>
            </div>

            {/* Vote count */}
            {voteCount !== undefined && (
              <div className="flex items-center gap-1">
                <Users className="size-3" />
                <span>{voteCount} vote{voteCount !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
