import { getQuestionById } from "./questions";
import type {
  AnswerChoice,
  PublicQuestion,
  PublicQuiz,
  QuizDraft,
} from "./types";

// 서버 Route Handler가 쓰는 순수 로직 — 입력 검증, DB 행 변환, 공개 응답 조립, 채점.
// 이 파일은 브라우저에도 번들될 수 있으므로 시크릿(service_role 키 등)을 다루지 않는다.
// 정답(correct_choice)은 서버에서만 읽고, 공개 응답 타입(PublicQuiz)에는 존재하지 않는다.

/** 커플당 출제 문항 수 (supabase/schema.sql 주석: 5 questions per couple) */
export const QUIZ_QUESTION_COUNT = 5;

/** 이름류 입력 상한 — 스팸·비정상 페이로드 방지 */
const NAME_MAX = 40;
const COUPLE_NAME_MAX = 80;

/** 잘못된 요청(400)을 나타내는 에러. Route Handler가 status로 그대로 응답한다. */
export class QuizInputError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "QuizInputError";
    this.status = status;
  }
}

/** couples 행에서 공개해도 되는 컬럼만 (secret_letter 제외) */
export interface CouplePublicRow {
  id: string;
  couple_name: string;
  creator_name: string;
  partner_name: string;
  created_at: string;
}

/** quizzes 행에서 문항 표시에 필요한 컬럼만 (correct_choice 제외) */
export interface QuizPublicRow {
  question_id: string;
  order_index: number;
  question_text: string;
  choice_a: string;
  choice_b: string;
}

/** quizzes insert용 행 — 출제 당시 문구 사본 + 서버만 아는 정답 */
export interface QuizInsertRow extends QuizPublicRow {
  couple_id: string;
  correct_choice: AnswerChoice;
}

/** 채점용 행 — 정답만 */
export interface QuizAnswerRow {
  question_id: string;
  correct_choice: AnswerChoice;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 공유 링크 slug는 couples.id(UUID)다. UUID가 아니면 DB에 물어보지 않고 404 처리한다. */
export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function isAnswerChoice(value: unknown): value is AnswerChoice {
  return value === "A" || value === "B";
}

function readName(value: unknown, fallback?: string): string {
  if (typeof value !== "string") {
    if (fallback !== undefined) return fallback;
    throw new QuizInputError("이름은 문자열이어야 합니다.");
  }
  const trimmed = value.trim();
  if (!trimmed) {
    if (fallback !== undefined) return fallback;
    throw new QuizInputError("이름을 입력해 주세요.");
  }
  if (trimmed.length > NAME_MAX) {
    throw new QuizInputError(`이름은 ${NAME_MAX}자 이하여야 합니다.`);
  }
  return trimmed;
}

/** CreatePage가 보낸 본문(unknown)을 검증해 출제 초안으로 만든다.
 *  문항 문구·선택지는 서버가 data/questions.json에서 직접 채우므로 클라이언트가
 *  임의 문구를 넣어 위조할 수 없다. */
export function parseQuizDraft(input: unknown): QuizDraft {
  if (!input || typeof input !== "object") {
    throw new QuizInputError("요청 본문이 올바르지 않습니다.");
  }
  const body = input as Record<string, unknown>;

  const creatorName = readName(body.creatorName, "나");
  const partnerName = readName(body.partnerName, "상대");
  const coupleNameRaw = body.coupleName;
  const coupleName =
    typeof coupleNameRaw === "string" && coupleNameRaw.trim()
      ? coupleNameRaw.trim().slice(0, COUPLE_NAME_MAX)
      : `${creatorName} & ${partnerName}`;

  const rawIds = body.questionIds;
  if (!Array.isArray(rawIds) || rawIds.length !== QUIZ_QUESTION_COUNT) {
    throw new QuizInputError(
      `문항은 정확히 ${QUIZ_QUESTION_COUNT}개여야 합니다.`,
    );
  }
  const questionIds: number[] = [];
  for (const raw of rawIds) {
    const id = typeof raw === "number" ? raw : Number(raw);
    if (!Number.isInteger(id) || id <= 0) {
      throw new QuizInputError("문항 id가 올바르지 않습니다.");
    }
    if (!getQuestionById(id)) {
      throw new QuizInputError(`문항을 찾을 수 없습니다: ${id}`);
    }
    if (questionIds.includes(id)) {
      throw new QuizInputError("같은 문항이 중복되었습니다.");
    }
    questionIds.push(id);
  }

  const rawAnswers = body.creatorAnswers;
  if (!rawAnswers || typeof rawAnswers !== "object") {
    throw new QuizInputError("출제자 답안이 없습니다.");
  }
  const creatorAnswers: Record<string, AnswerChoice> = {};
  for (const id of questionIds) {
    const choice = (rawAnswers as Record<string, unknown>)[String(id)];
    if (!isAnswerChoice(choice)) {
      throw new QuizInputError(`문항 ${id}의 답을 골라주세요.`);
    }
    creatorAnswers[String(id)] = choice;
  }

  return {
    coupleName,
    creatorName,
    partnerName,
    questionIds,
    creatorAnswers,
  };
}

/** 출제 초안 → quizzes insert 행 5개. 문구는 서버의 data/questions.json 사본을 쓴다. */
export function buildQuizRows(
  draft: QuizDraft,
  coupleId: string,
): QuizInsertRow[] {
  return draft.questionIds.map((id, i) => {
    const question = getQuestionById(id);
    if (!question) {
      throw new QuizInputError(`문항을 찾을 수 없습니다: ${id}`);
    }
    const correctChoice = draft.creatorAnswers[String(id)];
    if (!isAnswerChoice(correctChoice)) {
      throw new QuizInputError(`문항 ${id}의 답을 골라주세요.`);
    }
    return {
      couple_id: coupleId,
      order_index: i + 1,
      question_id: String(id),
      question_text: question.question,
      choice_a: question.choice_a,
      choice_b: question.choice_b,
      correct_choice: correctChoice,
    };
  });
}

/** DB 행 → 공개 응답. correct_choice·secret_letter는 이 함수에 들어오지도 않는다. */
export function toPublicQuiz(
  couple: CouplePublicRow,
  quizRows: QuizPublicRow[],
): PublicQuiz {
  const questions: PublicQuestion[] = [...quizRows]
    .sort((a, b) => a.order_index - b.order_index)
    .map((row) => ({
      questionId: String(row.question_id),
      orderIndex: row.order_index,
      question: row.question_text,
      choiceA: row.choice_a,
      choiceB: row.choice_b,
    }));

  return {
    key: couple.id,
    coupleName: couple.couple_name,
    creatorName: couple.creator_name,
    partnerName: couple.partner_name,
    questions,
    createdAt: couple.created_at,
  };
}

/** 풀이자 답안 본문 검증 — 이 퀴즈의 문항에 모두 답했는지 확인한다.
 *  미응답을 허용하면 아무것도 안 고르고 제출해 results 행을 계속 만들 수 있다. */
export function parseAnswers(
  input: unknown,
  questionIds: string[],
): Record<string, AnswerChoice> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new QuizInputError("답안이 올바르지 않습니다.");
  }
  const raw = input as Record<string, unknown>;
  const answers: Record<string, AnswerChoice> = {};
  for (const id of questionIds) {
    const choice = raw[id];
    if (!isAnswerChoice(choice)) {
      throw new QuizInputError("모든 문항에 답해 주세요.");
    }
    answers[id] = choice;
  }
  return answers;
}

/** 서버 채점 — 정답 비교는 여기서만 일어난다. */
export function gradeAnswers(
  quizRows: QuizAnswerRow[],
  answers: Record<string, AnswerChoice>,
): { matches: number; total: number; score: number } {
  const total = quizRows.length;
  const matches = quizRows.filter(
    (row) => answers[row.question_id] === row.correct_choice,
  ).length;
  const score = total === 0 ? 0 : Math.round((matches / total) * 100);
  return { matches, total, score };
}

/** results 행(저장된 점수)에서 화면이 쓰는 형태로 되돌린다. */
export function toResultView(
  row: { score: number; solved_at: string },
  total: number,
): { matches: number; total: number; score: number; solvedAt: string } {
  return {
    matches: Math.round((row.score / 100) * total),
    total,
    score: row.score,
    solvedAt: row.solved_at,
  };
}
