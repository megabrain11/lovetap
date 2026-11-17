// LoveTap 공통 타입 — 실데이터 기준 (피클 제공 questions.json v1.0.0 / schema.sql)
// data/questions.json과 supabase/schema.sql이 원본이다. 구조 변경 시 두 파일을 먼저 확인할 것.

export type AnswerChoice = "A" | "B";

export interface Category {
  id: string;
  name: string;
  range: [number, number]; // 해당 카테고리 문항 id 범위 (예: [1, 10])
}

export interface Question {
  id: number;
  category: string;
  question: string;
  choice_a: string;
  choice_b: string;
}

export interface ResultTier {
  min_score: number; // 퍼센트 하한 (0-100)
  max_score: number; // 퍼센트 상한 (0-100)
  title: string;
  description: string;
  share_caption: string;
}

export interface QuizData {
  version: string;
  project: string;
  categories: Category[];
  questions: Question[];
  result_tiers: ResultTier[];
}

/** 출제자가 만든 퀴즈 한 세트 — supabase couples 행 + quizzes 행 5개에 대응.
 *  key: 공유 링크 식별자. Supabase 연결 시 couples.id(UUID),
 *  로컬 모드에서는 lovetap-xxxxxx slug. */
export interface CoupleQuiz {
  key: string;
  coupleName: string;
  creatorName: string;
  partnerName: string;
  questionIds: number[]; // 출제 문항 5개 (schema: 5 questions per couple)
  creatorAnswers: Record<string, AnswerChoice>; // {"1": "A"} — question id(문자열) -> 출제자 답
  createdAt: string; // ISO
}

/** 출제 요청으로 넘기는 값 — key/createdAt은 서버(또는 로컬 저장)가 만든다. */
export type QuizDraft = Omit<CoupleQuiz, "key" | "createdAt">;

/** 풀이 화면에 내려보내는 문항.
 *  quizzes 행의 출제 당시 사본(question_text/choice_a/choice_b)이며,
 *  정답(correct_choice)은 이 타입에 아예 존재하지 않는다 — 브라우저로 나가지 않는다. */
export interface PublicQuestion {
  questionId: string; // data/questions.json id를 문자열로 (schema: quizzes.question_id TEXT)
  orderIndex: number; // 1..5
  question: string;
  choiceA: string;
  choiceB: string;
}

/** 공유 링크(slug)로 조회되는 퀴즈 — 브라우저가 아는 전부.
 *  couples.secret_letter와 quizzes.correct_choice는 포함하지 않는다. */
export interface PublicQuiz {
  key: string; // couples.id(UUID)
  coupleName: string;
  creatorName: string;
  partnerName: string;
  questions: PublicQuestion[];
  createdAt: string; // ISO
}

/** 풀이자 답안 + 결과 — supabase results 행에 대응 (score는 0-100 퍼센트).
 *  partnerAnswers는 서버 API 응답에 포함하지 않는다(결과 화면에 필요 없음).
 *  로컬 모드에서만 채워진다. */
export interface QuizResult {
  key: string;
  partnerAnswers?: Record<string, AnswerChoice>;
  matches: number; // 일치 문항 수
  total: number; // 출제 문항 수 (5)
  score: number; // 퍼센트 0-100
  solvedAt: string; // ISO
}
