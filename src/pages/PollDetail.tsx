import { useParams, Link } from 'react-router-dom';
import { useSeoMeta } from '@unhead/react';
import { ArrowLeft, Bitcoin, Calendar, Clock, Lock, Share2, Users } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Layout } from '@/components/Layout';
import { PollStatusBadge } from '@/components/PollStatusBadge';
import { PollResultsChart } from '@/components/PollResultsChart';
import { CastVoteForm } from '@/components/CastVoteForm';
import { VoteList } from '@/components/VoteList';
import { usePoll } from '@/hooks/usePoll';
import { useVotes } from '@/hooks/useVotes';
import { useAuthor } from '@/hooks/useAuthor';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useToast } from '@/hooks/useToast';
import { calculatePollResults, formatSats, formatTimestamp, getPollStatus, truncateHex } from '@/lib/polls';

export default function PollDetail() {
  const { pollId } = useParams<{ pollId: string }>();
  const { data: poll, isLoading: pollLoading } = usePoll(pollId);
  const { data: votes = [], isLoading: votesLoading } = useVotes(pollId);
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useSeoMeta({
    title: poll ? `${poll.title} — BitVote` : 'Poll — BitVote',
    description: poll?.description || 'A Bitcoin-backed poll on Nostr.',
  });

  if (pollLoading) {
    return (
      <Layout>
        <div className="mx-auto max-w-3xl space-y-6">
          <Skeleton className="h-6 w-32" />
          <Card>
            <div className="p-6 space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <div className="space-y-3 mt-6">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          </Card>
        </div>
      </Layout>
    );
  }

  if (!poll) {
    return (
      <Layout>
        <div className="mx-auto max-w-3xl">
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <p className="text-lg font-medium">Poll not found</p>
              <p className="mt-1 text-muted-foreground">
                This poll may not exist or hasn&rsquo;t been relayed yet.
              </p>
              <Button asChild variant="outline" className="mt-4">
                <Link to="/">
                  <ArrowLeft className="size-4" />
                  Back to Polls
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  const status = getPollStatus(poll);
  const results = calculatePollResults(poll, votes);
  const userVote = user ? votes.find((v) => v.pubkey === user.pubkey) : undefined;
  const canVote = status === 'active' && !userVote;

  function handleShare() {
    const url = window.location.href;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        toast({ title: 'Link copied!', description: 'Poll link copied to clipboard.' });
      }).catch(() => {
        // Clipboard failed silently
      });
    }
  }

  function handleVoteCast() {
    // Invalidate votes query to refetch
    queryClient.invalidateQueries({ queryKey: ['bitvote', 'votes', pollId] });
  }

  return (
    <Layout>
      <div className="mx-auto max-w-3xl">
        {/* Back + actions */}
        <div className="mb-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/">
              <ArrowLeft className="size-4" />
              Back
            </Link>
          </Button>
          <Button variant="ghost" size="sm" onClick={handleShare}>
            <Share2 className="size-4" />
            Share
          </Button>
        </div>

        {/* Poll header card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-2xl">{poll.title}</CardTitle>
                {poll.description && (
                  <CardDescription className="mt-2 text-base">{poll.description}</CardDescription>
                )}
              </div>
              <PollStatusBadge poll={poll} />
            </div>
          </CardHeader>
          <CardContent>
            {/* Creator & metadata */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-muted-foreground">
              <PollCreator pubkey={poll.pubkey} />

              <div className="flex items-center gap-1.5">
                <Bitcoin className="size-4 text-primary" />
                <span className="font-medium">{formatSats(poll.depositAmountSats)}</span>
                <span className="text-xs">
                  ({poll.depositMethod === 'either'
                    ? 'On-chain / LN'
                    : poll.depositMethod === 'lightning'
                      ? 'Lightning'
                      : 'On-chain'})
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <Users className="size-4" />
                <span>{results.totalVoters} voter{results.totalVoters !== 1 ? 's' : ''}</span>
              </div>

              <Badge variant="outline" className="text-xs">
                {poll.pollType === 'singlechoice' ? 'Single choice' : 'Multiple choice'}
              </Badge>
            </div>

            <Separator className="my-4" />

            {/* Timeline info */}
            <div className="grid gap-3 text-sm sm:grid-cols-3">
              <div className="flex items-center gap-2 rounded-lg bg-secondary/50 p-3">
                <Calendar className="size-4 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">Voting Opens</div>
                  <div className="font-medium">{formatTimestamp(poll.votingStartsAt)}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-secondary/50 p-3">
                <Clock className="size-4 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">Voting Closes</div>
                  <div className="font-medium">{formatTimestamp(poll.votingEndsAt)}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-secondary/50 p-3">
                <Lock className="size-4 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">Lockup Ends</div>
                  <div className="font-medium">{formatTimestamp(poll.lockupEndsAt)}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results + Vote section */}
        <Tabs defaultValue={canVote ? 'vote' : 'results'}>
          <TabsList className="mb-6">
            <TabsTrigger value="results">
              Results
            </TabsTrigger>
            <TabsTrigger value="vote" disabled={status !== 'active'}>
              Vote
              {status !== 'active' && (
                <span className="ml-1 text-xs text-muted-foreground">
                  ({status === 'upcoming' ? 'Not yet open' : 'Closed'})
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="votes">
              Votes ({results.totalVoters})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="results">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Poll Results</CardTitle>
                <CardDescription>
                  {votesLoading ? 'Loading votes...' : `${results.totalVoters} total votes, ${results.verifiedVoters} verified with deposits`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {votesLoading ? (
                  <div className="space-y-4">
                    {poll.options.map((opt) => (
                      <div key={opt.id} className="space-y-2">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-3 w-full rounded-full" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <PollResultsChart
                    poll={poll}
                    results={results}
                    selectedOption={userVote?.selectedOptions[0]}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="vote">
            <CastVoteForm
              poll={poll}
              existingVote={userVote}
              onVoteCast={handleVoteCast}
            />
          </TabsContent>

          <TabsContent value="votes">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">All Votes</CardTitle>
                <CardDescription>
                  Individual vote records with deposit verification status.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <VoteList poll={poll} votes={votes} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

function PollCreator({ pubkey }: { pubkey: string }) {
  const author = useAuthor(pubkey);
  const metadata = author.data?.metadata;

  return (
    <div className="flex items-center gap-1.5">
      <Avatar size="sm">
        {metadata?.picture && <AvatarImage src={metadata.picture} alt="" />}
        <AvatarFallback className="text-[10px]">
          {(metadata?.name ?? pubkey.substring(0, 2)).substring(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <span className="max-w-28 truncate font-medium">
        {metadata?.name ?? truncateHex(pubkey)}
      </span>
    </div>
  );
}
