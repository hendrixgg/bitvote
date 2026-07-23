import { useState } from 'react';
import { Bitcoin, Zap, Link as LinkIcon, ShieldCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useToast } from '@/hooks/useToast';
import { VOTE_KIND, buildVoteTags, formatSats, validateVoteOptions } from '@/lib/polls';
import type { Poll, Vote } from '@/lib/types';
import { cn } from '@/lib/utils';

interface CastVoteFormProps {
  poll: Poll;
  existingVote?: Vote;
  onVoteCast?: () => void;
}

export function CastVoteForm({ poll, existingVote, onVoteCast }: CastVoteFormProps) {
  const { user } = useCurrentUser();
  const { mutateAsync: createEvent, isPending } = useNostrPublish();
  const { toast } = useToast();

  const [selectedOption, setSelectedOption] = useState<string>(existingVote?.selectedOptions[0] ?? '');
  const [depositMethod, setDepositMethod] = useState<'onchain' | 'lightning'>(
    poll.depositMethod === 'lightning' ? 'lightning' : 'onchain',
  );
  const [walletAddress, setWalletAddress] = useState('');
  const [txId, setTxId] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!user) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">Log in with your Nostr identity to cast a vote.</p>
        </CardContent>
      </Card>
    );
  }

  if (existingVote) {
    const selectedLabels = existingVote.selectedOptions
      .map((optId) => poll.options.find((o) => o.id === optId)?.label)
      .filter(Boolean);

    return (
      <Card className="border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-900/10">
        <CardContent className="py-6 text-center">
          <ShieldCheck className="mx-auto mb-2 size-8 text-emerald-500" />
          <p className="font-medium">You already voted!</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Your selection: {selectedLabels.join(', ')}
          </p>
        </CardContent>
      </Card>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    const validationError = validateVoteOptions(poll, [selectedOption]);
    if (validationError) {
      setError(validationError);
      return;
    }

    // For polls requiring deposits, validate wallet info
    if (poll.depositAmountSats > 0) {
      if (!walletAddress.trim()) {
        setError('Please enter your deposit wallet address.');
        return;
      }
    }

    setError(null);

    const tags = buildVoteTags({
      pollId: poll.id,
      selectedOptions: [selectedOption],
      depositWalletId: walletAddress.trim(),
      depositMethod,
      depositTxId: txId.trim(),
      depositAmountSats: poll.depositAmountSats,
    });

    try {
      await createEvent({
        kind: VOTE_KIND,
        content: '',
        tags,
      });

      toast({
        title: 'Vote cast!',
        description: 'Your vote has been published to Nostr.',
      });

      onVoteCast?.();
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to cast vote',
        variant: 'destructive',
      });
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Cast Your Vote</CardTitle>
          <CardDescription>
            Select an option
            {poll.depositAmountSats > 0 && (
              <> and deposit <span className="font-medium text-primary">{formatSats(poll.depositAmountSats)}</span> to secure your vote</>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Option selection */}
          <RadioGroup value={selectedOption} onValueChange={setSelectedOption}>
            {poll.options.map((opt, i) => (
              <label
                key={opt.id}
                className={cn(
                  'flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors',
                  selectedOption === opt.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/30 hover:bg-accent/50',
                )}
              >
                <RadioGroupItem value={opt.id} id={`vote-${opt.id}`} />
                <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-xs font-semibold text-secondary-foreground">
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="text-sm font-medium">{opt.label}</span>
              </label>
            ))}
          </RadioGroup>

          {/* Deposit section */}
          {poll.depositAmountSats > 0 && (
            <div className="space-y-4 rounded-lg border border-dashed border-primary/30 bg-primary/5 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                <Bitcoin className="size-4" />
                Bitcoin Deposit Required: {formatSats(poll.depositAmountSats)}
              </div>

              {poll.depositMethod === 'either' && (
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Select value={depositMethod} onValueChange={(v) => setDepositMethod(v as 'onchain' | 'lightning')}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="onchain">
                        <LinkIcon className="mr-1 inline size-3" />
                        On-chain Bitcoin
                      </SelectItem>
                      <SelectItem value="lightning">
                        <Zap className="mr-1 inline size-3" />
                        Lightning Network
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="walletAddress">
                  {depositMethod === 'lightning' ? 'Lightning Wallet / Invoice ID' : 'Bitcoin Wallet Address'}
                </Label>
                <Input
                  id="walletAddress"
                  placeholder={
                    depositMethod === 'lightning'
                      ? 'lnbc...'
                      : 'bc1...'
                  }
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {depositMethod === 'lightning'
                    ? 'Enter your Lightning invoice or HODL invoice ID for deposit verification.'
                    : 'Enter the Bitcoin address where you deposited funds for this poll.'}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="txId">Transaction / Payment Hash (optional)</Label>
                <Input
                  id="txId"
                  placeholder={
                    depositMethod === 'lightning'
                      ? 'Payment hash...'
                      : 'Transaction ID...'
                  }
                  value={txId}
                  onChange={(e) => setTxId(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Provide the transaction ID or payment hash for on-chain proof of reserves verification.
                </p>
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isPending || !selectedOption}
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Publishing vote...
              </span>
            ) : (
              <>
                <ShieldCheck className="size-4" />
                Cast Vote
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
