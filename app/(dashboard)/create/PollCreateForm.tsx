"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPoll } from "@/app/lib/actions/poll-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export default function PollCreateForm() {
  const router = useRouter();
  const [options, setOptions] = useState(["", ""]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleOptionChange = (idx: number, value: string) => {
    setOptions((opts) => opts.map((opt, i) => (i === idx ? value : opt)));
  };

  const addOption = () => setOptions((opts) => [...opts, ""]);
  const removeOption = (idx: number) => {
    if (options.length > 2) {
      setOptions((opts) => opts.filter((_, i) => i !== idx));
    }
  };

  return (
    <form
      action={async (formData) => {
        setError(null);
        setSuccess(false);
        
        startTransition(async () => {
          try {
            const res = await createPoll(formData);
            if (res?.error) {
              setError(res.error);
            } else {
              setSuccess(true);
              setTimeout(() => {
                router.push("/polls");
              }, 1200);
            }
          } catch (err) {
            setError(err instanceof Error ? err.message : 'An unexpected error occurred');
          }
        });
      }}
      className="space-y-6 max-w-md mx-auto"
    >
      <div>
        <Label htmlFor="question">Poll Question</Label>
        <Input name="question" id="question" required disabled={isPending} />
      </div>
      <div>
        <Label>Options</Label>
        {options.map((opt, idx) => (
          <div key={idx} className="flex items-center gap-2 mb-2">
            <Input
              name="options"
              value={opt}
              onChange={(e) => handleOptionChange(idx, e.target.value)}
              required
              disabled={isPending}
            />
            {options.length > 2 && (
              <Button 
                type="button" 
                variant="destructive" 
                onClick={() => removeOption(idx)}
                disabled={isPending}
              >
                Remove
              </Button>
            )}
          </div>
        ))}
        <Button 
          type="button" 
          onClick={addOption} 
          variant="secondary"
          disabled={isPending}
        >
          Add Option
        </Button>
      </div>
      {error && <div className="text-red-500">{error}</div>}
      {success && <div className="text-green-600">Poll created! Redirecting...</div>}
      <Button 
        type="submit"
        disabled={isPending}
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating Poll...
          </>
        ) : (
          'Create Poll'
        )}
      </Button>
    </form>
  );
}