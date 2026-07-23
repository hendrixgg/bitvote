import { useSeoMeta } from '@unhead/react';
import { Bitcoin, PlusCircle, Vote } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Layout } from '@/components/Layout';
import { PollCard } from '@/components/PollCard';
import { usePolls } from '@/hooks/usePolls';
import { getPollStatus } from '@/lib/polls';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export default function Index() {
  useSeoMeta({
    title: 'BitVote — Bitcoin-Backed Polls on Nostr',
    description: 'Create and vote on polls backed by Bitcoin deposits. Every vote requires skin in the game.',
  });

  const { data: polls, isLoading } = usePolls();
  const { user } = useCurrentUser();

  const activePolls = polls?.filter((p) => getPollStatus(p) === 'active') ?? [];
  const upcomingPolls = polls?.filter((p) => getPollStatus(p) === 'upcoming') ?? [];
  const endedPolls = polls?.filter((p) => ['ended', 'lockup'].includes(getPollStatus(p))) ?? [];

  return (
    <Layout>
      {/* Hero section */}
      <section className="relative isolate mb-8 overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-6 py-10 sm:px-10 sm:py-14">
        <div className="absolute -top-20 -right-20 size-64 rounded-full bg-primary/10 blur-3xl -z-10" />
        <div className="absolute -bottom-16 -left-16 size-48 rounded-full bg-primary/5 blur-2xl -z-10" />

        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
                <Vote className="size-6" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">BitVote</h1>
            </div>
            <p className="max-w-lg text-muted-foreground leading-relaxed">
              Bitcoin-backed polls on Nostr. Create polls, cast votes with skin in the game, 
              and see results backed by real Bitcoin deposits.
            </p>
          </div>

          {user && (
            <Button asChild size="lg" className="rounded-full shadow-lg shadow-primary/25">
              <Link to="/create">
                <PlusCircle className="size-4" />
                Create Poll
              </Link>
            </Button>
          )}
        </div>

        {/* Stats row */}
        <div className="mt-8 grid grid-cols-3 gap-4">
          {[
            { label: 'Active Polls', value: isLoading ? '—' : String(activePolls.length), icon: Vote },
            { label: 'Total Polls', value: isLoading ? '—' : String(polls?.length ?? 0), icon: Bitcoin },
            { label: 'Upcoming', value: isLoading ? '—' : String(upcomingPolls.length), icon: PlusCircle },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-xl bg-background/60 backdrop-blur-sm p-4 text-center shadow-sm">
              <Icon className="mx-auto mb-1.5 size-4 text-primary" />
              <div className="text-2xl font-bold">{value}</div>
              <div className="text-xs text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Poll tabs */}
      <Tabs defaultValue="active">
        <TabsList className="mb-6">
          <TabsTrigger value="active">
            Active{activePolls.length > 0 && ` (${activePolls.length})`}
          </TabsTrigger>
          <TabsTrigger value="upcoming">
            Upcoming{upcomingPolls.length > 0 && ` (${upcomingPolls.length})`}
          </TabsTrigger>
          <TabsTrigger value="ended">
            Ended{endedPolls.length > 0 && ` (${endedPolls.length})`}
          </TabsTrigger>
          <TabsTrigger value="all">
            All{polls && polls.length > 0 && ` (${polls.length})`}
          </TabsTrigger>
        </TabsList>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <div className="p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Skeleton className="h-5 w-14 rounded-md" />
                    <Skeleton className="h-5 w-14 rounded-md" />
                    <Skeleton className="h-5 w-14 rounded-md" />
                  </div>
                  <div className="mt-4 flex gap-4">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <>
            <TabsContent value="active">
              <PollGrid polls={activePolls} emptyMessage="No active polls right now. Be the first to create one!" />
            </TabsContent>
            <TabsContent value="upcoming">
              <PollGrid polls={upcomingPolls} emptyMessage="No upcoming polls scheduled." />
            </TabsContent>
            <TabsContent value="ended">
              <PollGrid polls={endedPolls} emptyMessage="No ended polls yet." />
            </TabsContent>
            <TabsContent value="all">
              <PollGrid polls={polls ?? []} emptyMessage="No polls found. Connect to relays and create the first one!" />
            </TabsContent>
          </>
        )}
      </Tabs>
    </Layout>
  );
}

function PollGrid({ polls, emptyMessage }: { polls: import('@/lib/types').Poll[]; emptyMessage: string }) {
  if (polls.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 px-8 text-center">
          <Bitcoin className="mx-auto mb-3 size-8 text-muted-foreground/50" />
          <p className="text-muted-foreground max-w-sm mx-auto">{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {polls.map((poll) => (
        <PollCard key={poll.id} poll={poll} />
      ))}
    </div>
  );
}
