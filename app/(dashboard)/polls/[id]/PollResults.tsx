'use client';

interface PollResultsProps {
  poll: {
    id: string;
    question: string;
    options: string[];
    vote_counts?: number[];
  };
}

export default function PollResults({ poll }: PollResultsProps) {
  // Calculate total votes
  const totalVotes = poll.vote_counts ? 
    poll.vote_counts.reduce((sum, count) => sum + count, 0) : 0;

  const getPercentage = (votes: number) => {
    if (totalVotes === 0) return 0;
    return Math.round((votes / totalVotes) * 100);
  };

  return (
    <div className="space-y-4">
      <h3 className="font-medium">Results:</h3>
      {poll.options.map((option, index) => {
        const voteCount = poll.vote_counts?.[index] || 0;
        return (
          <div key={index} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>{option}</span>
              <span>{getPercentage(voteCount)}% ({voteCount} votes)</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full" 
                style={{ width: `${getPercentage(voteCount)}%` }}
              ></div>
            </div>
          </div>
        );
      })}
      <div className="text-sm text-slate-500 pt-2">
        Total votes: {totalVotes}
      </div>
    </div>
  );
}