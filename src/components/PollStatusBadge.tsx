import { Badge } from '@/components/ui/badge';
import { getPollStatus, getPollStatusLabel } from '@/lib/polls';
import type { Poll, PollStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

const statusColors: Record<PollStatus, string> = {
  upcoming: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  lockup: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  ended: 'bg-muted text-muted-foreground',
};

export function PollStatusBadge({ poll }: { poll: Poll }) {
  const status = getPollStatus(poll);
  const label = getPollStatusLabel(status);

  return (
    <Badge variant="outline" className={cn('border-0 font-medium', statusColors[status])}>
      {status === 'active' && (
        <span className="mr-1.5 inline-block size-1.5 animate-pulse rounded-full bg-emerald-500" />
      )}
      {label}
    </Badge>
  );
}
