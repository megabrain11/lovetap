import { NextResponse } from "next/server";
import {
  buildQuizRows,
  parseQuizDraft,
  QuizInputError,
} from "@/lib/quiz-core";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

// 퀴즈 출제 — couples 1행 + quizzes 5행을 서버(service_role)에서만 쓴다.
// 브라우저는 문항 id와 출제자 답만 보내고, 문항 문구·선택지는 서버가
// data/questions.json에서 채운다(위조 방지). quizzes 행 실패 시 couples 행을 지워
// "커플만 남는 반쪽 상태"를 만들지 않는다.
export async function POST(request: Request) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { error: "서버 DB가 설정되지 않았습니다(SUPABASE_SERVICE_ROLE_KEY)." },
      { status: 503 },
    );
  }

  let draft;
  try {
    draft = parseQuizDraft(await request.json());
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

  const { data: coupleRows, error: coupleError } = await supabase
    .from("couples")
    .insert({
      couple_name: draft.coupleName,
      creator_name: draft.creatorName,
      partner_name: draft.partnerName,
    })
    .select("id");

  const coupleId = coupleRows?.[0]?.id as string | undefined;
  if (coupleError || !coupleId) {
    console.error("[api/quizzes] couples insert 실패", coupleError);
    return NextResponse.json(
      { error: "퀴즈를 저장하지 못했어요. 잠시 후 다시 시도해 주세요." },
      { status: 500 },
    );
  }

  const { error: quizError } = await supabase
    .from("quizzes")
    .insert(buildQuizRows(draft, coupleId));

  if (quizError) {
    console.error("[api/quizzes] quizzes insert 실패", quizError);
    // 반쪽 상태 정리 — 실패한 출제의 couples 행을 지운다(공유 링크가 생기지 않게).
    await supabase.from("couples").delete().eq("id", coupleId);
    return NextResponse.json(
      { error: "퀴즈를 저장하지 못했어요. 잠시 후 다시 시도해 주세요." },
      { status: 500 },
    );
  }

  return NextResponse.json({ key: coupleId }, { status: 201 });
}
