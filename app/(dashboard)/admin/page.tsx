import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { DeletePollButton } from "./components/DeletePollButton";
import React from "react";
// The layout.tsx file handles the authorization check

interface Poll {
  id: string;
  question: string;
  user_id: string;
  created_at: string;
  options: { text: string; votes: number }[];
}

async function getAllPolls() {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("polls")
    .select("*")
    .order("created_at", { ascending: false });
    
  if (error) {
    console.error('Error fetching polls:', error);
    return [];
  }
  
  return data || [];
}

export default async function AdminPage() {
  // Fetch all polls server-side
  const polls = await getAllPolls();

  return (
    <div className="p-6 space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Admin Panel</h1>
        <p className="text-gray-600 mt-2">
          View and manage all polls in the system.
        </p>
      </div>

      <div className="grid gap-4">
        {polls.map((poll) => (
          <Card key={poll.id} className="border-l-4 border-l-blue-500">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{poll.question}</CardTitle>
                  <CardDescription>
                    <div className="space-y-1 mt-2">
                      <div>
                        Poll ID:{" "}
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                          {poll.id}
                        </code>
                      </div>
                      <div>
                        Owner ID:{" "}
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                          {poll.user_id}
                        </code>
                      </div>
                      <div>
                        Created:{" "}
                        {new Date(poll.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </CardDescription>
                </div>
                <DeletePollButton pollId={poll.id} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <h4 className="font-medium">Options:</h4>
                <ul className="list-disc list-inside space-y-1">
                  {poll.options.map((option: { text: string; votes: number }, index: number) => (
                    <li key={index} className="text-gray-700">
                      {option.text} ({option.votes} votes)
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {polls.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No polls found in the system.
        </div>
      )}
    </div>
  );
}
