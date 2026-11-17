import { NextResponse } from "next/server";
import {
  gradeAnswers,
  isUuid,
  parseAnswers,
  QuizInputError,
  toResultView,
} from "@/lib/quiz-core";
import type { QuizAnswerRow } from "@/lib/quiz-core";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

interface Params {
  params: Promise<{ slug: string }>;
}

// 답안 제출·채점 — quizzes.correct_choice와의 비교는 서버에서만 한다.
// 브라우저는 자기 답만 보내고, 돌려받는 것은 점수뿐이다.
export async function POST(request: Request, { params }: Params) {
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

  const { data: quizData, error: quizError } = await supabase
    .from("quizzes")
    .select("question_id, correct_choice")
    .eq("couple_id", slug)
    .order("order_index", { ascending: true });

  if (quizError) {
    console.error("[api/quizzes/[slug]/results] quizzes select 실패", quizError);
    return NextResponse.json(
      { error: "채점하지 못했어요. 잠시 후 다시 시도해 주세요." },
      { status: 500 },
    );
  }
  const quizRows = (quizData ?? []) as QuizAnswerRow[];
  if (quizRows.length === 0) {
    return NextResponse.json({ error: "퀴즈를 찾을 수 없어요." }, { status: 404 });
  }

  let answers;
  try {
    const body = (await request.json()) as { answers?: unknown } | null;
    answers = parseAnswers(
      body?.answers,
      quizRows.map((row) => String(row.question_id)),
    );
  } catch (error) {
    if (error instanceof QuizInputError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    return NextResponse.json(
      { error: "요청 본문을 읽을 수 없습니다." },
      { status: 400 },
    );
  }

  const { matches, total, score } = gradeAnswers(quizRows, answers);

  const { data: inserted, error: insertError } = await supabase
    .from("results")
    .insert({ couple_id: slug, score, partner_answers: answers })
    .select("solved_at");

  if (insertError) {
    console.error("[api/quizzes/[slug]/results] results insert 실패", insertError);
    return NextResponse.json(
      { error: "결과를 저장하지 못했어요. 잠시 후 다시 시도해 주세요." },
      { status: 500 },
    );
  }

  const solvedAt =
    (inserted?.[0]?.solved_at as string | undefined) ??
    new Date().toISOString();

  return NextResponse.json({ matches, total, score, solvedAt });
}

// 결과 조회 — 해당 slug의 최신 결과 1건. 답안 원문(partner_answers)은 돌려주지 않는다.
export async function GET(_request: Request, { params }: Params) {
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

  const { count, error: countError } = await supabase
    .from("quizzes")
    .select("question_id", { count: "exact", head: true })
    .eq("couple_id", slug);

  if (countError) {
    console.error("[api/quizzes/[slug]/results] quizzes count 실패", countError);
    return NextResponse.json(
      { error: "결과를 불러오지 못했어요." },
      { status: 500 },
    );
  }
  const total = count ?? 0;
  if (total === 0) {
    return NextResponse.json({ error: "퀴즈를 찾을 수 없어요." }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("results")
    .select("score, solved_at")
    .eq("couple_id", slug)
    .order("solved_at", { ascending: false })
    .limit(1);

  if (error) {
    console.error("[api/quizzes/[slug]/results] results select 실패", error);
    return NextResponse.json(
      { error: "결과를 불러오지 못했어요." },
      { status: 500 },
    );
  }
  const row = data?.[0] as { score: number; solved_at: string } | undefined;
  if (!row) {
    return NextResponse.json({ error: "아직 결과가 없어요." }, { status: 404 });
  }

  return NextResponse.json(toResultView(row, total));
}
