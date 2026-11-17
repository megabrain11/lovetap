import { getQuestionById } from "./questions";
import {
  loadQuizLocal,
  loadResultLocal,
  makeSlug,
  saveQuizLocal,
  saveResultLocal,
} from "./store";
import { isSupabaseConfigured } from "./supabase";
import { calcScore } from "./sync";
import type {
  AnswerChoice,
  PublicQuestion,
  PublicQuiz,
  QuizDraft,
  QuizResult,
} from "./types";

// 데이터 접근 계층.
// - 서버 DB 모드: 브라우저는 Supabase에 직접 붙지 않고 이 앱의 Route Handler만 부른다.
//     POST /api/quizzes                      출제(couple 1행 + quizzes 5행)
//     GET  /api/quizzes/[slug]               풀이용 문항(정답·편지 제외)
//     POST /api/quizzes/[slug]/results       답안 제출 → 서버 채점·저장
//     GET  /api/quizzes/[slug]/results       최신 결과
//   정답 비교는 전부 서버에서 일어나고, 브라우저는 correct_choice를 받은 적이 없다.
// - 로컬 모드(NEXT_PUBLIC_SUPABASE_URL 없음): src/lib/store.ts의 localStorage로 폴백.
//   같은 브라우저에서만 동작하는 데모 흐름은 그대로 유지된다.

const API_QUIZZES = "/api/quizzes";

async function readJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function errorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && "error" in body) {
    const message = (body as { error?: unknown }).error;
    if (typeof message === "string" && message) return message;
  }
  return fallback;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const body = await readJson(res);
  if (!res.ok) {
    throw new Error(errorMessage(body, `요청에 실패했어요 (${res.status})`));
  }
  return body as T;
}

/** 404는 "없음"으로 돌려주는 조회용 — 결과가 아직 없을 때 에러 화면 대신 안내를 띄운다. */
async function requestJsonOrNull<T>(
  path: string,
  init?: RequestInit,
): Promise<T | null> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (res.status === 404) return null;
  const body = await readJson(res);
  if (!res.ok) {
    throw new Error(errorMessage(body, `요청에 실패했어요 (${res.status})`));
  }
  return body as T;
}

/** 로컬 모드: 저장된 CoupleQuiz + data/questions.json 사본으로 풀이 화면 데이터를 만든다. */
function localQuizToPublic(quiz: {
  key: string;
  coupleName: string;
  creatorName: string;
  partnerName: string;
  questionIds: number[];
  createdAt: string;
}): PublicQuiz {
  const questions: PublicQuestion[] = [];
  quiz.questionIds.forEach((id, i) => {
    const question = getQuestionById(id);
    if (!question) return;
    questions.push({
      questionId: String(question.id),
      orderIndex: i + 1,
      question: question.question,
      choiceA: question.choice_a,
      choiceB: question.choice_b,
    });
  });
  return {
    key: quiz.key,
    coupleName: quiz.coupleName,
    creatorName: quiz.creatorName,
    partnerName: quiz.partnerName,
    questions,
    createdAt: quiz.createdAt,
  };
}

/** 출제 완료: 서버 모드면 DB(couples + quizzes 5행), 로컬 모드면 localStorage. */
export async function createCoupleQuiz(draft: QuizDraft): Promise<string> {
  if (isSupabaseConfigured()) {
    const body = await requestJson<{ key?: string }>(API_QUIZZES, {
      method: "POST",
      body: JSON.stringify(draft),
    });
    if (!body?.key) throw new Error("퀴즈 키를 받지 못했어요.");
    return body.key;
  }

  const slug = makeSlug();
  saveQuizLocal({ ...draft, key: slug, createdAt: new Date().toISOString() });
  return slug;
}

/** 풀이 화면용: slug로 커플 + 문항 5개 조회 (정답·secret_letter는 오지 않는다). */
export async function loadPublicQuiz(key: string): Promise<PublicQuiz | null> {
  if (isSupabaseConfigured()) {
    return requestJsonOrNull<PublicQuiz>(
      `${API_QUIZZES}/${encodeURIComponent(key)}`,
    );
  }
  const local = loadQuizLocal(key);
  return local ? localQuizToPublic(local) : null;
}

/** 풀이 제출: 서버가 채점해 results에 저장하고 점수를 돌려준다. */
export async function submitQuizAnswers(
  key: string,
  answers: Record<string, AnswerChoice>,
): Promise<QuizResult> {
  if (isSupabaseConfigured()) {
    const body = await requestJson<{
      matches: number;
      total: number;
      score: number;
      solvedAt: string;
    }>(`${API_QUIZZES}/${encodeURIComponent(key)}/results`, {
      method: "POST",
      body: JSON.stringify({ answers }),
    });
    return { key, ...body };
  }

  const local = loadQuizLocal(key);
  if (!local) throw new Error("퀴즈를 찾을 수 없어요.");
  const { matches, total, score } = calcScore(
    local.creatorAnswers,
    answers,
    local.questionIds,
  );
  const result: QuizResult = {
    key,
    partnerAnswers: answers,
    matches,
    total,
    score,
    solvedAt: new Date().toISOString(),
  };
  saveResultLocal(result);
  return result;
}

/** 결과 화면용: 해당 slug의 가장 최근 결과 1건. */
export async function loadLatestResult(key: string): Promise<QuizResult | null> {
  if (isSupabaseConfigured()) {
    const body = await requestJsonOrNull<{
      matches: number;
      total: number;
      score: number;
      solvedAt: string;
    }>(`${API_QUIZZES}/${encodeURIComponent(key)}/results`);
    return body ? { key, ...body } : null;
  }
  return loadResultLocal(key);
}
