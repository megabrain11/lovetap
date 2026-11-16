import { getSupabase } from "./supabase";
import { getQuestionById } from "./questions";
import type {
  AnswerChoice,
  CoupleQuiz,
  QuizResult,
} from "./types";

// Supabase 연동 — supabase/schema.sql(피클 제공 원본) 기준.
// 테이블 3개: couples / quizzes / results. RLS는 anon 키로 select/insert 공개.
// 환경변수가 없으면 getSupabase()가 null을 반환하므로, 호출 전에
// isSupabaseConfigured()로 확인하고 로컬 모드(src/lib/store.ts)로 폴백할 것.

// --- 행 타입 (DB 컬럼명 그대로) ---
interface CoupleRow {
  id: string;
  couple_name: string;
  creator_name: string;
  partner_name: string;
  photo_url: string | null;
  secret_letter: string | null;
  created_at: string;
}

interface QuizRow {
  id: string;
  couple_id: string;
  order_index: number;
  question_text: string;
  choice_a: string;
  choice_b: string;
  correct_choice: AnswerChoice;
  created_at: string;
}

interface ResultRow {
  id: string;
  couple_id: string;
  score: number;
  partner_answers: Record<string, AnswerChoice>;
  solved_at: string;
}

/** 출제 완료: couples 행 1개 + quizzes 행 5개 insert → couples.id(UUID) 반환 */
export async function createCoupleQuiz(
  quiz: Omit<CoupleQuiz, "key" | "createdAt">,
): Promise<string> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase가 설정되지 않았습니다.");

  const { data: couple, error: coupleError } = await supabase
    .from("couples")
    .insert({
      couple_name: quiz.coupleName,
      creator_name: quiz.creatorName,
      partner_name: quiz.partnerName,
    })
    .select("id")
    .single();
  if (coupleError || !couple) {
    throw new Error(`couples insert 실패: ${coupleError?.message}`);
  }

  const rows = quiz.questionIds.map((qid, i) => {
    const q = getQuestionById(qid);
    if (!q) throw new Error(`문항을 찾을 수 없습니다: ${qid}`);
    return {
      couple_id: couple.id as string,
      order_index: i + 1,
      question_text: q.question,
      choice_a: q.choice_a,
      choice_b: q.choice_b,
      correct_choice: quiz.creatorAnswers[String(qid)],
    };
  });
  const { error: quizError } = await supabase
    .from("quizzes")
    .insert(rows);
  if (quizError) {
    throw new Error(`quizzes insert 실패: ${quizError.message}`);
  }
  return couple.id as string;
}

/** 풀이 화면용: couples.id(UUID)로 커플 + 출제 문항 5개 조회 */
export async function loadCoupleQuiz(
  coupleId: string,
): Promise<CoupleQuiz | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data: couple, error: coupleError } = await supabase
    .from("couples")
    .select("*")
    .eq("id", coupleId)
    .single();
  if (coupleError || !couple) return null;
  const c = couple as CoupleRow;

  const { data: quizRows, error: quizError } = await supabase
    .from("quizzes")
    .select("*")
    .eq("couple_id", coupleId)
    .order("order_index", { ascending: true });
  if (quizError || !quizRows) return null;
  const rows = quizRows as QuizRow[];

  // 출제 문항은 data/questions.json의 id와 대조해 questionIds로 복원한다.
  // (question_text가 일치하는 문항을 찾는다 — 같은 문구라도 id가 다르면 별개 문항)
  const { getAllQuestions } = await import("./questions");
  const all = getAllQuestions();
  const questionIds: number[] = [];
  const creatorAnswers: Record<string, AnswerChoice> = {};
  for (const row of rows) {
    const match = all.find(
      (q) =>
        q.question === row.question_text &&
        q.choice_a === row.choice_a &&
        q.choice_b === row.choice_b,
    );
    if (!match) continue;
    questionIds.push(match.id);
    creatorAnswers[String(match.id)] = row.correct_choice;
  }
  if (questionIds.length === 0) return null;

  return {
    key: c.id,
    coupleName: c.couple_name,
    creatorName: c.creator_name,
    partnerName: c.partner_name,
    questionIds,
    creatorAnswers,
    createdAt: c.created_at,
  };
}

/** 풀이 제출: results 행 insert (score는 0-100 퍼센트) */
export async function saveResult(
  coupleId: string,
  result: Omit<QuizResult, "key" | "solvedAt">,
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase가 설정되지 않았습니다.");
  const { error } = await supabase.from("results").insert({
    couple_id: coupleId,
    score: result.score,
    partner_answers: result.partnerAnswers,
  });
  if (error) throw new Error(`results insert 실패: ${error.message}`);
}

/** 결과 화면용: 해당 커플의 가장 최근 결과 1건 조회 */
export async function loadLatestResult(
  coupleId: string,
): Promise<QuizResult | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("results")
    .select("*")
    .eq("couple_id", coupleId)
    .order("solved_at", { ascending: false })
    .limit(1)
    .single();
  if (error || !data) return null;
  const r = data as ResultRow;
  const total = Object.keys(r.partner_answers).length;
  const score = r.score;
  return {
    key: coupleId,
    partnerAnswers: r.partner_answers,
    matches: Math.round((score / 100) * total),
    total,
    score,
    solvedAt: r.solved_at,
  };
}
