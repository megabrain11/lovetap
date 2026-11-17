import type { CoupleQuiz, QuizResult } from "./types";

// 로컬 저장소 (Supabase 연결 전까지의 임시 저장소).
// Supabase 연동이 완료되면 src/lib/db.ts의 함수들이 같은 역할을 한다.
// 저장 키: lovetap:quiz:<key>, lovetap:result:<key>
// key: 로컬 모드에서는 lovetap-xxxxxx slug, Supabase 모드에서는 couples.id(UUID).

const QUIZ_PREFIX = "lovetap:quiz:";
const RESULT_PREFIX = "lovetap:result:";

/** 로컬 모드용 공유 키 생성: lovetap-xxxxxx (영문 소문자+숫자 6자리) */
export function makeSlug(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let suffix = "";
  for (let i = 0; i < 6; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `lovetap-${suffix}`;
}

export function saveQuizLocal(quiz: CoupleQuiz): void {
  localStorage.setItem(QUIZ_PREFIX + quiz.key, JSON.stringify(quiz));
}

export function loadQuizLocal(key: string): CoupleQuiz | null {
  const raw = localStorage.getItem(QUIZ_PREFIX + key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CoupleQuiz;
  } catch {
    return null;
  }
}

export function saveResultLocal(result: QuizResult): void {
  localStorage.setItem(RESULT_PREFIX + result.key, JSON.stringify(result));
}

export function loadResultLocal(key: string): QuizResult | null {
  const raw = localStorage.getItem(RESULT_PREFIX + key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as QuizResult;
  } catch {
    return null;
  }
}

/** 공유 링크 절대 URL (카톡 공유용). */
export function shareUrl(key: string): string {
  const base =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_SITE_URL ?? "https://lovetap-psi.vercel.app";
  return `${base}/q/${key}`;
}
