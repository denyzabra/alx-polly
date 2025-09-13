/**
 * Type definitions for the polling application
 */

/**
 * Poll type representing a poll in the database
 */
export interface Poll {
  id: string;
  user_id: string;
  question: string;
  options: string[];
  created_at: string;
  updated_at: string;
  vote_counts?: VoteCount[];
}

/**
 * Vote count for a poll option
 */
export interface VoteCount {
  option_index: number;
  count: number;
}

/**
 * Vote type representing a vote in the database
 */
export interface Vote {
  id: string;
  poll_id: string;
  user_id: string | null;
  option_index: number;
  created_at: string;
}

/**
 * Response type for server actions
 */
export interface ActionResponse {
  error: string | null;
  data?: any;
}

/**
 * User type representing a user in the database
 */
export interface User {
  id: string;
  email: string;
  created_at: string;
}