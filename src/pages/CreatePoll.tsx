import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSeoMeta } from '@unhead/react';
import { PlusCircle, Trash2, Bitcoin, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Layout } from '@/components/Layout';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useToast } from '@/hooks/useToast';
import { POLL_KIND, buildPollTags, generateOptionId } from '@/lib/polls';
import type { DepositMethod } from '@/lib/types';

export default function CreatePoll() {
  useSeoMeta({
    title: 'Create Poll — BitVote',
    description: 'Create a new Bitcoin-backed poll on Nostr.',
  });

  const { user } = useCurrentUser();
  const navigate = useNavigate();
  const { mutateAsync: createEvent, isPending } = useNostrPublish();
  const { toast } = useToast();

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [pollType, setPollType] = useState<'singlechoice' | 'multiplechoice'>('singlechoice');
  const [depositAmount, setDepositAmount] = useState('1000');
  const [depositMethod, setDepositMethod] = useState<DepositMethod>('either');
  const [votingStartsAt, setVotingStartsAt] = useState('');
  const [votingEndsAt, setVotingEndsAt] = useState('');
  const [lockupEndsAt, setLockupEndsAt] = useState('');

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  function addOption() {
    if (options.length >= 10) return;
    setOptions([...options, '']);
  }

  function removeOption(index: number) {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== index));
  }

  function updateOption(index: number, value: string) {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};

    if (!title.trim()) errs.title = 'Title is required';
    else if (title.length > 50) errs.title = 'Title must be 50 characters or less';

    if (description.length > 500) errs.description = 'Description must be 500 characters or less';

    const trimmedOptions = options.map((o) => o.trim()).filter(Boolean);
    if (trimmedOptions.length < 2) errs.options = 'At least 2 options are required';
    if (new Set(trimmedOptions).size !== trimmedOptions.length) errs.options = 'All options must be unique';

    const amount = parseInt(depositAmount, 10);
    if (isNaN(amount) || amount < 0) errs.deposit = 'Deposit must be a valid number (0 for no deposit)';

    if (!votingStartsAt) errs.votingStartsAt = 'Start date is required';
    if (!votingEndsAt) errs.votingEndsAt = 'End date is required';
    if (!lockupEndsAt) errs.lockupEndsAt = 'Lockup end date is required';

    if (votingStartsAt && votingEndsAt) {
      const start = new Date(votingStartsAt).getTime();
      const end = new Date(votingEndsAt).getTime();
      if (end <= start) errs.votingEndsAt = 'End date must be after start date';
    }

    if (votingEndsAt && lockupEndsAt) {
      const voteEnd = new Date(votingEndsAt).getTime();
      const lockEnd = new Date(lockupEndsAt).getTime();
      if (lockEnd < voteEnd) errs.lockupEndsAt = 'Lockup end must be at or after voting end date';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!validate()) return;

    const trimmedOptions = options.map((o) => o.trim()).filter(Boolean);
    const vStartTs = Math.floor(new Date(votingStartsAt).getTime() / 1000);
    const vEndTs = Math.floor(new Date(votingEndsAt).getTime() / 1000);
    const lEndTs = Math.floor(new Date(lockupEndsAt).getTime() / 1000);

    const tags = buildPollTags({
      title: title.trim(),
      description: description.trim(),
      options: trimmedOptions.map((label) => ({ id: generateOptionId(), label })),
      pollType,
      depositAmountSats: parseInt(depositAmount, 10),
      depositMethod,
      votingStartsAt: vStartTs,
      votingEndsAt: vEndTs,
      lockupStartsAt: vStartTs,
      lockupEndsAt: lEndTs,
    });

    try {
      const event = await createEvent({
        kind: POLL_KIND,
        content: title.trim(),
        tags,
      });

      toast({
        title: 'Poll created!',
        description: 'Your Bitcoin-backed poll is live on Nostr.',
      });

      navigate(`/poll/${event.id}`);
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to create poll',
        variant: 'destructive',
      });
    }
  }

  if (!user) {
    return (
      <Layout>
        <Card className="mx-auto max-w-lg border-dashed">
          <CardContent className="py-12 px-8 text-center">
            <Bitcoin className="mx-auto mb-3 size-8 text-muted-foreground/50" />
            <p className="text-muted-foreground mb-4">You must be logged in to create a poll.</p>
            <p className="text-sm text-muted-foreground">
              Click &ldquo;Join&rdquo; in the header to connect your Nostr identity.
            </p>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto max-w-2xl">
        {/* Back link */}
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link to="/">
            <ArrowLeft className="size-4" />
            Back to Polls
          </Link>
        </Button>

        <form onSubmit={handleSubmit}>
          {/* Basic Info */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlusCircle className="size-5 text-primary" />
                Create a Poll
              </CardTitle>
              <CardDescription>
                Set up your Bitcoin-backed poll. Voters will need to deposit BTC to cast their vote.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Poll Title</Label>
                <Input
                  id="title"
                  placeholder="What should we decide?"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={50}
                  aria-invalid={!!errors.title}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  {errors.title ? (
                    <span className="text-destructive">{errors.title}</span>
                  ) : (
                    <span />
                  )}
                  <span>{title.length}/50</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Add context or rules for your poll..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={500}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  {errors.description ? (
                    <span className="text-destructive">{errors.description}</span>
                  ) : (
                    <span />
                  )}
                  <span>{description.length}/500</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Vote Options */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Vote Options</CardTitle>
              <CardDescription>Add 2–10 unique options for voters to choose from.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-xs font-semibold text-secondary-foreground">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <Input
                    placeholder={`Option ${i + 1}`}
                    value={opt}
                    onChange={(e) => updateOption(i, e.target.value)}
                  />
                  {options.length > 2 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeOption(i)}
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              ))}

              {errors.options && (
                <p className="text-sm text-destructive">{errors.options}</p>
              )}

              {options.length < 10 && (
                <Button type="button" variant="outline" size="sm" onClick={addOption}>
                  <PlusCircle className="size-4" />
                  Add Option
                </Button>
              )}

              <Separator />

              <div className="space-y-2">
                <Label>Poll Type</Label>
                <RadioGroup
                  value={pollType}
                  onValueChange={(v) => setPollType(v as 'singlechoice' | 'multiplechoice')}
                  className="flex gap-4"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="singlechoice" id="single" />
                    <Label htmlFor="single" className="font-normal">Single choice</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="multiplechoice" id="multi" />
                    <Label htmlFor="multi" className="font-normal">Multiple choice</Label>
                  </div>
                </RadioGroup>
              </div>
            </CardContent>
          </Card>

          {/* Bitcoin Deposit */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bitcoin className="size-5 text-primary" />
                Bitcoin Deposit
              </CardTitle>
              <CardDescription>
                Require voters to lock up Bitcoin to validate their votes. Set to 0 for free voting.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="depositAmount">Deposit Amount (sats)</Label>
                <div className="relative">
                  <Input
                    id="depositAmount"
                    type="number"
                    min="0"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="pr-14"
                    aria-invalid={!!errors.deposit}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    sats
                  </span>
                </div>
                {errors.deposit && (
                  <p className="text-sm text-destructive">{errors.deposit}</p>
                )}
                {parseInt(depositAmount, 10) > 0 && (
                  <p className="text-xs text-muted-foreground">
                    ≈ {(parseInt(depositAmount, 10) / 100_000_000).toFixed(8)} BTC
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Deposit Method</Label>
                <Select value={depositMethod} onValueChange={(v) => setDepositMethod(v as DepositMethod)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="either">Either (On-chain or Lightning)</SelectItem>
                    <SelectItem value="onchain">On-chain only</SelectItem>
                    <SelectItem value="lightning">Lightning only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
              <CardDescription>
                Set the voting period and Bitcoin lockup period.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="votingStart">Voting Starts</Label>
                  <Input
                    id="votingStart"
                    type="datetime-local"
                    value={votingStartsAt}
                    onChange={(e) => setVotingStartsAt(e.target.value)}
                    aria-invalid={!!errors.votingStartsAt}
                  />
                  {errors.votingStartsAt && (
                    <p className="text-sm text-destructive">{errors.votingStartsAt}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="votingEnd">Voting Ends</Label>
                  <Input
                    id="votingEnd"
                    type="datetime-local"
                    value={votingEndsAt}
                    onChange={(e) => setVotingEndsAt(e.target.value)}
                    aria-invalid={!!errors.votingEndsAt}
                  />
                  {errors.votingEndsAt && (
                    <p className="text-sm text-destructive">{errors.votingEndsAt}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lockupEnd">
                  Deposit Lockup Ends
                  <span className="ml-1 text-xs text-muted-foreground">(must be ≥ voting end)</span>
                </Label>
                <Input
                  id="lockupEnd"
                  type="datetime-local"
                  value={lockupEndsAt}
                  onChange={(e) => setLockupEndsAt(e.target.value)}
                  aria-invalid={!!errors.lockupEndsAt}
                />
                {errors.lockupEndsAt && (
                  <p className="text-sm text-destructive">{errors.lockupEndsAt}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <Button
            type="submit"
            size="lg"
            className="w-full rounded-xl shadow-lg shadow-primary/25"
            disabled={isPending}
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Publishing to Nostr...
              </span>
            ) : (
              <>
                <Bitcoin className="size-4" />
                Create Bitcoin-Backed Poll
              </>
            )}
          </Button>
        </form>
      </div>
    </Layout>
  );
}
