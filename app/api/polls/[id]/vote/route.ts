import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("votes").insert([
    {
      poll_id: pollId,
      user_id: user?.id ?? null,
      option_index: optionIndex,
    },
  ]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
