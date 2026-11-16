import data from "../../data/questions.json";
import type { Question, QuizData, ResultTier } from "./types";

// 실데이터: data/questions.json (피클 제공 v1.0.0, 원본 그대로 사용)
// 구조: version / project / categories[{id,name,range}] /
//       questions[{id:number, category, question, choice_a, choice_b}] /
//       result_tiers[{min_score, max_score, title, description, share_caption}]
const quizData = data as unknown as QuizData;

export const QUIZ_TITLE = quizData.project;
export const QUIZ_VERSION = quizData.version;
export const CATEGORIES = quizData.categories;
export const RESULT_TIERS: ResultTier[] = quizData.result_tiers;

/** 스키마 기준 커플당 출제 문항 수: 5개 (schema.sql: "5 questions per couple") */
export const PICK_COUNT = 5;

export function getAllQuestions(): Question[] {
  return quizData.questions;
}

export function getQuestionsByCategory(categoryId: string): Question[] {
  return quizData.questions.filter((q) => q.category === categoryId);
}

export function getQuestionById(id: number): Question | undefined {
  return quizData.questions.find((q) => q.id === id);
}

export function getCategoryName(categoryId: string): string {
  return CATEGORIES.find((c) => c.id === categoryId)?.name ?? categoryId;
}

/** 카테고리별로 고르게 섞어서 count개 문항을 뽑는다 (기본 5개).
 *  range 기준으로 각 카테고리에서 2/2/1개씩 뽑는 식으로 라운드로빈한다. */
export function pickQuestions(count: number = PICK_COUNT): Question[] {
  const byCategory = CATEGORIES.map((c) => getQuestionsByCategory(c.id));
  const picked: Question[] = [];
  let round = 0;
  while (picked.length < count) {
    let added = false;
    for (const list of byCategory) {
      if (picked.length >= count) break;
      const shuffled = [...list].sort(() => Math.random() - 0.5);
      const candidate = shuffled[round];
      if (candidate && !picked.some((q) => q.id === candidate.id)) {
        picked.push(candidate);
        added = true;
      }
    }
    if (!added) break;
    round++;
  }
  return picked.sort(() => Math.random() - 0.5).slice(0, count);
}
