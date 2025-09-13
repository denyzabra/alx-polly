"use client";

import { useState, useEffect } from "react";
import { useActionState } from "react";
import { createPollAction } from "@/app/lib/actions/poll-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function PollCreateForm() {
  const [options, setOptions] = useState(["", ""]);
  
  const [state, formAction, isPending] = useActionState(createPollAction, { error: null });

  const handleOptionChange = (idx: number, value: string) => {
    setOptions((opts) => opts.map((opt, i) => (i === idx ? value : opt)));
  };

  const addOption = () => setOptions((opts) => [...opts, ""]);
  const removeOption = (idx: number) => {
    if (options.length > 2) {
      setOptions((opts) => opts.filter((_, i) => i !== idx));
    }
  };

  useEffect(() => {
    if (state?.error) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <form
      action={formAction}
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
      <Button 
        type="submit"
        disabled={isPending}
        className="w-full"
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
