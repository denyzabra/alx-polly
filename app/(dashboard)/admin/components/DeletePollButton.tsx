'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { deletePoll } from '@/app/lib/actions/poll-actions';
import { useRouter } from 'next/navigation';

interface DeletePollButtonProps {
  pollId: string;
}

export function DeletePollButton({ pollId }: DeletePollButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setLoading(true);
    const result = await deletePoll(pollId);

    if (!result.error) {
      // Refresh the current route
      router.refresh();
    } else {
      console.error('Failed to delete poll:', result.error);
    }

    setLoading(false);
  };

  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={handleDelete}
      disabled={loading}
    >
      {loading ? "Deleting..." : "Delete"}
    </Button>
  );
}