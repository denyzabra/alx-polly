import { NextResponse } from "next/server";
import { getUserPolls } from "@/app/lib/actions/poll-actions";

/**
 * @deprecated Use server actions directly instead of API routes
 * This route is kept for backward compatibility
 */
export async function GET(request: Request) {
  const { polls, error } = await getUserPolls();
  
  if (error === "Not authenticated") {
    return NextResponse.json(
      { polls: [], error: "Not authenticated" },
      { status: 401 }
    );
  }
  
  if (error) {
    return NextResponse.json({ polls: [], error }, { status: 500 });
  }

  return NextResponse.json({ polls });
}
