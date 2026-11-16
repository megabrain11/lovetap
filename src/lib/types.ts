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

/** 풀이자 답안 + 결과 — supabase results 행에 대응 (score는 0-100 퍼센트). */
export interface QuizResult {
  key: string;
  partnerAnswers: Record<string, AnswerChoice>;
  matches: number; // 일치 문항 수
  total: number; // 출제 문항 수 (5)
  score: number; // 퍼센트 0-100
  solvedAt: string; // ISO
}
