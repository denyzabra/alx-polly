import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getPollById } from "@/app/lib/actions/poll-actions";

/**
 * @deprecated Use server actions directly instead of API routes
 * This route is kept for backward compatibility
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { poll, error } = await getPollById(params.id);

  if (error || !poll) {
    return NextResponse.json(
      { poll: null, error: error || "Poll not found." },
      { status: 404 }
    );
  }
  return NextResponse.json({ poll });
}

import { updatePoll } from "@/app/lib/actions/poll-actions";

/**
 * @deprecated Use server actions directly instead of API routes
 * This route is kept for backward compatibility
 */
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const formData = await request.formData();
  const result = await updatePoll(params.id, formData);

  if (result.error) {
    // Determine appropriate status code based on error message
    let statusCode = 500;
    if (result.error.includes("not logged in") || result.error.includes("must be logged in")) {
      statusCode = 401;
    } else if (result.error.includes("provide a question")) {
      statusCode = 400;
    }

    return NextResponse.json({ error: result.error }, { status: statusCode });
  }

  // The updatePoll function already handles revalidation
  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const { id } = params;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  const { error } = await supabase
    .from("polls")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidatePath("/polls");
  return new Response(null, { status: 204 });
}
