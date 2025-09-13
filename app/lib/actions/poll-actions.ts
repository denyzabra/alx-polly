"use server";

/**
 * @fileoverview Poll management actions for creating, updating, and interacting with polls
 * 
 * This module provides server actions for handling poll operations including
 * creating new polls, fetching polls, submitting votes, and managing poll data.
 * It implements proper authorization checks to ensure users can only modify
 * their own polls and includes data validation for all operations.
 * 
 * All database operations use Supabase as the underlying data store.
 */

import { createClient } from "@/app/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { Poll, Vote, ActionResponse, VoteCount } from "@/app/lib/types";
import { redirect } from "next/navigation";

/**
 * Creates a new poll with the provided form data
 * 
 * This function creates a new poll in the database with the specified question
 * and options. It first verifies that the user is authenticated, then creates
 * the poll record with the user's ID and the provided poll details.
 * 
 * @param formData - FormData object containing the poll question and options
 * @returns ActionResponse with error status (null if successful)
 * @example
 * // In a form submit handler:
 * const result = await createPoll(formData);
 * if (!result.error) {
 *   // Poll created successfully
 * }
 */
export async function createPoll(formData: FormData): Promise<ActionResponse> {
  const supabase = await createClient();

  const question = formData.get("question") as string;
  const options = formData.getAll("options").filter(Boolean) as string[];

  if (!question || options.length < 2) {
    return { error: "Please provide a question and at least two options." };
  }

  // Get user from session
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) {
    return { error: userError.message };
  }
  if (!user) {
    return { error: "You must be logged in to create a poll." };
  }

  const { data, error } = await supabase.from("polls").insert([
    {
      user_id: user.id,
      question,
      options,
    },
  ]).select().single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/polls");
  return { error: null, data: data as Poll };
}

/**
 * Action to create a new poll, designed for use with useActionState.
 * Handles form submission, data validation, and redirection on success.
 *
 * @param prevState - The previous state from useActionState.
 * @param formData - FormData object containing the poll question and options.
 * @returns An object with an error message, or redirects on success.
 */
export async function createPollAction(
  prevState: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const question = formData.get("question") as string;
  const options = formData.getAll("options").filter(Boolean) as string[];

  if (!question || options.length < 2) {
    return { error: "Please provide a question and at least two options." };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return { error: "You must be logged in to create a poll." };
  }

  const { error } = await supabase.from("polls").insert([
    {
      user_id: user.id,
      question,
      options,
    },
  ]);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/polls");
  redirect("/polls");
}


/**
 * Get polls created by the current user
 * 
 * @returns ActionResponse with array of Poll objects or error
 */
export async function getUserPolls(): Promise<ActionResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated", data: [] as Poll[] };

  const { data, error } = await supabase
    .from("polls")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return { error: error.message, data: [] as Poll[] };
  return { error: null, data: data as Poll[] };
}

/**
 * Get a poll by its ID, including vote counts
 * 
 * @param id - The ID of the poll to retrieve
 * @returns ActionResponse with Poll object or error
 */
export async function getPollById(id: string): Promise<ActionResponse> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("polls")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return { error: error.message };
  return { error: null, data: data as Poll };
}

/**
 * Submit a vote for a specific poll option
 * 
 * @param pollId - The ID of the poll to vote on
 * @param optionIndex - The index of the option to vote for
 * @returns ActionResponse with error status (null if successful)
 */
export async function submitVote(pollId: string, optionIndex: number): Promise<ActionResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Optionally require login to vote
  // if (!user) return { error: 'You must be logged in to vote.' };

  // Check if poll exists
  const { data: poll, error: pollError } = await supabase
    .from("polls")
    .select("id")
    .eq("id", pollId)
    .single();

  if (pollError) {
    return { error: "Poll not found" };
  }

  // Check if user has already voted (if user is logged in)
  if (user) {
    const { data: existingVote, error: voteCheckError } = await supabase
      .from("votes")
      .select("id")
      .eq("poll_id", pollId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingVote) {
      return { error: "You have already voted on this poll" };
    }
  }

  // Submit the vote
  const { data: voteData, error } = await supabase.from("votes").insert([
    {
      poll_id: pollId,
      user_id: user?.id ?? null,
      option_index: optionIndex,
    },
  ]).select().single();

  if (error) return { error: error.message };
  
  // Revalidate the poll page to show updated results
  revalidatePath(`/polls/${pollId}`);
  return { error: null, data: voteData as Vote };
}

/**
 * Delete a poll by its ID
 * 
 * @param pollId - The ID of the poll to delete
 * @returns ActionResponse with error status (null if successful)
 */
export async function deletePoll(pollId: string): Promise<ActionResponse> {
  const supabase = await createClient();

  // Get user from session
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) {
    return { error: userError.message };
  }
  if (!user) {
    return { error: "You must be logged in to delete a poll." };
  }

  // Check if poll exists and is owned by the user
  const { data: poll, error: pollError } = await supabase
    .from("polls")
    .select("id")
    .eq("id", pollId)
    .eq("user_id", user.id)
    .single();

  if (pollError) {
    return { error: "Poll not found or you don't have permission to delete it." };
  }

  // Delete votes first to maintain referential integrity
  const { error: votesError } = await supabase
    .from("votes")
    .delete()
    .eq("poll_id", pollId);

  if (votesError) {
    return { error: `Failed to delete votes: ${votesError.message}` };
  }

  // Delete the poll
  const { error } = await supabase
    .from("polls")
    .delete()
    .eq("id", pollId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/polls");
  return { error: null };
}

/**
 * Update an existing poll with new question and options
 * 
 * @param pollId - The ID of the poll to update
 * @param formData - FormData object containing the updated poll question and options
 * @returns Object with error status (null if successful)
 */
export async function updatePoll(pollId: string, formData: FormData) {
  const supabase = await createClient();

  const question = formData.get("question") as string;
  const options = formData.getAll("options").filter(Boolean) as string[];

  if (!question || options.length < 2) {
    return { error: "Please provide a question and at least two options." };
  }

  // Get user from session
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) {
    return { error: userError.message };
  }
  if (!user) {
    return { error: "You must be logged in to update a poll." };
  }

  // Only allow updating polls owned by the user
  const { error } = await supabase
    .from("polls")
    .update({ question, options })
    .eq("id", pollId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  // Revalidate paths to update UI
  revalidatePath(`/polls/${pollId}`);
  revalidatePath(`/polls/${pollId}/edit`);
  revalidatePath('/polls');
  
  return { error: null };
}