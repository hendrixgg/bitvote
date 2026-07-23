import { cn } from '@/lib/utils';
import type { Poll, PollResults } from '@/lib/types';

interface PollResultsChartProps {
  poll: Poll;
  results: PollResults;
  selectedOption?: string;
}

const BAR_COLORS = [
  'bg-primary',
  'bg-chart-2',
  'bg-chart-3',
  'bg-chart-4',
  'bg-chart-5',
  'bg-primary/70',
  'bg-chart-2/70',
  'bg-chart-3/70',
  'bg-chart-4/70',
  'bg-chart-5/70',
];

export function PollResultsChart({ poll, results, selectedOption }: PollResultsChartProps) {
  const maxCount = Math.max(...Object.values(results.optionCounts), 1);

  return (
    <div className="space-y-3">
      {poll.options.map((opt, i) => {
        const count = results.optionCounts[opt.id] ?? 0;
        const pct = results.optionPercentages[opt.id] ?? 0;
        const width = maxCount > 0 ? (count / maxCount) * 100 : 0;
        const isSelected = opt.id === selectedOption;

        return (
          <div key={opt.id} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className={cn('font-medium', isSelected && 'text-primary')}>
                {isSelected && (
                  <span className="mr-1.5 inline-block text-primary">✓</span>
                )}
                {opt.label}
              </span>
              <span className="tabular-nums text-muted-foreground">
                {count} vote{count !== 1 ? 's' : ''} · {pct}%
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-700 motion-safe:ease-out',
                  BAR_COLORS[i % BAR_COLORS.length],
                  isSelected && 'ring-2 ring-primary ring-offset-1 ring-offset-background',
                )}
                style={{ width: `${width}%` }}
              />
            </div>
          </div>
        );
      })}

      <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
        <span>{results.totalVoters} total voter{results.totalVoters !== 1 ? 's' : ''}</span>
        <span>{results.verifiedVoters} verified (deposit confirmed)</span>
      </div>
    </div>
  );
}
