import { RESULT_TIERS } from "./questions";
import type { AnswerChoice, ResultTier } from "./types";

/** 퍼센트 점수(0-100)로 결과 티어를 찾는다. */
export function getResultTier(scorePercent: number): ResultTier {
  const tier = RESULT_TIERS.find(
    (t) => scorePercent >= t.min_score && scorePercent <= t.max_score,
  );
  return tier ?? RESULT_TIERS[RESULT_TIERS.length - 1];
}

/** 출제자 답과 풀이자 답을 비교해 일치 수와 퍼센트 점수를 계산한다. */
export function calcScore(
  creatorAnswers: Record<string, AnswerChoice>,
  partnerAnswers: Record<string, AnswerChoice>,
  questionIds: number[],
): { matches: number; total: number; score: number } {
  const total = questionIds.length;
  const matches = questionIds.filter(
    (id) =>
      creatorAnswers[String(id)] &&
      creatorAnswers[String(id)] === partnerAnswers[String(id)],
  ).length;
  const score = total === 0 ? 0 : Math.round((matches / total) * 100);
  return { matches, total, score };
}
