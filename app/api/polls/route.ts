import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const formData = await request.formData();

  const question = formData.get("question") as string;
  const options = formData.getAll("options").filter(Boolean) as string[];

  if (!question || options.length < 2) {
    return NextResponse.json(
      { error: "Please provide a question and at least two options." },
      { status: 400 }
    );
  }

  // Get user from session
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) {
    return NextResponse.json({ error: userError.message }, { status: 401 });
  }
  if (!user) {
    return NextResponse.json(
      { error: "You must be logged in to create a poll." },
      { status: 401 }
    );
  }

  const { data, error } = await supabase
    .from("polls")
    .insert([
      {
        user_id: user.id,
        question,
        options,
      },
    ])
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidatePath("/polls");
  return NextResponse.json({ poll: data }, { status: 201 });
}
