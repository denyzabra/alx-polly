import { NextResponse } from "next/server";
import { submitVote } from "@/app/lib/actions/poll-actions";

/**
 * @deprecated Use server actions directly instead of API routes
 * This route is kept for backward compatibility
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id: pollId } = params;

  let optionIndex: number;
  try {
    const body = await request.json();
    optionIndex = body.optionIndex;
    if (typeof optionIndex !== "number") {
      throw new Error("optionIndex is missing or not a number");
    }
  } catch (e) {
    return NextResponse.json(
      { error: "Invalid request body. Expecting { optionIndex: number }" },
      { status: 400 }
    );
  }

  const result = await submitVote(pollId, optionIndex);

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
