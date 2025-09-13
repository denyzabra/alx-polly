import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { getPollById } from '@/app/lib/actions/poll-actions';
import PollVotingForm from './PollVotingForm';
import PollResults from './PollResults';
import PollQRCode from '@/app/components/PollQRCode';

export default async function PollDetailPage({ params }: { params: { id: string } }) {
  const { poll, error } = await getPollById(params.id);
  
  if (error || !poll) {
    notFound();
  }
  
  // Calculate total votes
  const totalVotes = poll.options ? poll.options.reduce((sum, option, index) => {
    // Get vote count for this option from the database
    const voteCount = poll.vote_counts?.[index] || 0;
    return sum + voteCount;
  }, 0) : 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/polls" className="text-blue-600 hover:underline">
          &larr; Back to Polls
        </Link>
        <div className="flex space-x-2">
          <Button variant="outline" asChild>
            <Link href={`/polls/${params.id}/edit`}>Edit Poll</Link>
          </Button>
          <Button variant="outline" className="text-red-500 hover:text-red-700" asChild>
            <Link href={`/polls/${params.id}/delete`}>Delete</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{poll.question}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <PollVotingForm poll={poll} pollId={params.id} />
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
        <div className="flex justify-between w-full">
          <div className="text-sm text-muted-foreground">
            Created {new Date(poll.created_at).toLocaleDateString()}
          </div>
          <div className="text-sm text-muted-foreground">
            {totalVotes} vote{totalVotes !== 1 ? "s" : ""}
          </div>
        </div>
        
        <PollQRCode pollId={params.id} />
      </CardFooter>
      </Card>

      <div className="pt-4">
        <h2 className="text-xl font-semibold mb-4">Share this poll</h2>
        <div className="flex space-x-2">
          <Button variant="outline" className="flex-1">
            Copy Link
          </Button>
          <Button variant="outline" className="flex-1">
            Share on Twitter
          </Button>
        </div>
      </div>
    </div>
  );
}