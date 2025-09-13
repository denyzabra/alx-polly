'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { submitVote } from '@/app/lib/actions/poll-actions';
import PollResults from './PollResults';

interface PollVotingFormProps {
  poll: {
    id: string;
    question: string;
    options: string[];
    vote_counts?: number[];
  };
  pollId: string;
}

export default function PollVotingForm({ poll, pollId }: PollVotingFormProps) {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVote = async () => {
    if (selectedOption === null) {
      setError('Please select an option');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const result = await submitVote(pollId, selectedOption);
      
      if (result.error) {
        setError(result.error);
      } else {
        setHasVoted(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (hasVoted) {
    return <PollResults poll={poll} />;
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-100 p-3 rounded-md text-red-800 text-sm">
          {error}
        </div>
      )}
      
      <RadioGroup
        value={selectedOption?.toString()}
        onValueChange={(value: string) => {
          setSelectedOption(parseInt(value));
          setError(null);
        }}
        disabled={isSubmitting}
      >
        {poll.options.map((option, index) => (
          <div 
            key={index} 
            className={`flex items-center space-x-2 p-2 rounded ${isSubmitting ? 'opacity-70' : 'hover:bg-slate-100'}`}
          >
            <RadioGroupItem value={index.toString()} id={`option-${index}`} disabled={isSubmitting} />
            <Label 
              htmlFor={`option-${index}`} 
              className={`flex-grow ${isSubmitting ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {option}
            </Label>
          </div>
        ))}
      </RadioGroup>

      <Button 
        onClick={handleVote} 
        className="w-full" 
        disabled={isSubmitting || selectedOption === null}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Submitting...
          </>
        ) : (
          'Submit Vote'
        )}
      </Button>
    </div>
  );
}