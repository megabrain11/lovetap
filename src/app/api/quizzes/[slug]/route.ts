import { NextResponse } from "next/server";
import { isUuid, toPublicQuiz } from "@/lib/quiz-core";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { CouplePublicRow, QuizPublicRow } from "@/lib/quiz-core";

// 풀이용 퀴즈 조회 — 정답(correct_choice)과 secret_letter는 절대 내려보내지 않는다.
// select 목록을 명시해 DB에서부터 그 컬럼을 읽지 않는다.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  if (!isUuid(slug)) {
    return NextResponse.json({ error: "퀴즈를 찾을 수 없어요." }, { status: 404 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { error: "서버 DB가 설정되지 않았습니다(SUPABASE_SERVICE_ROLE_KEY)." },
      { status: 503 },
    );
  }

  const { data: coupleData, error: coupleError } = await supabase
    .from("couples")
    .select("id, couple_name, creator_name, partner_name, created_at")
    .eq("id", slug)
    .limit(1);

  if (coupleError) {
    console.error("[api/quizzes/[slug]] couples select 실패", coupleError);
    return NextResponse.json(
      { error: "퀴즈를 불러오지 못했어요." },
      { status: 500 },
    );
  }
  const couple = coupleData?.[0] as CouplePublicRow | undefined;
  if (!couple) {
    return NextResponse.json({ error: "퀴즈를 찾을 수 없어요." }, { status: 404 });
  }

  const { data: quizData, error: quizError } = await supabase
    .from("quizzes")
    .select("question_id, order_index, question_text, choice_a, choice_b")
    .eq("couple_id", slug)
    .order("order_index", { ascending: true });

  if (quizError) {
    console.error("[api/quizzes/[slug]] quizzes select 실패", quizError);
    return NextResponse.json(
      { error: "퀴즈를 불러오지 못했어요." },
      { status: 500 },
    );
  }

  return NextResponse.json(
    toPublicQuiz(couple, (quizData ?? []) as QuizPublicRow[]),
  );
}
