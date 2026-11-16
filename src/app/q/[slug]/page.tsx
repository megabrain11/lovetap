"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getCategoryName, getQuestionById } from "@/lib/questions";
import { loadQuizLocal, saveResultLocal } from "@/lib/store";
import { loadCoupleQuiz, saveResult } from "@/lib/db";
import { isSupabaseConfigured } from "@/lib/supabase";
import { calcScore } from "@/lib/sync";
import type { AnswerChoice, CoupleQuiz } from "@/lib/types";

export default function SolvePage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex w-full max-w-xl flex-1 items-center justify-center px-5 py-10">
          <p className="text-ash-deep">퀴즈를 불러오는 중…</p>
        </main>
      }
    >
      <SolveContent />
    </Suspense>
  );
}

function SolveContent() {
  const params = useParams();
  const key = params.slug as string;
  const router = useRouter();
  const [quiz, setQuiz] = useState<CoupleQuiz | null | undefined>(undefined);
  const [answers, setAnswers] = useState<Record<string, AnswerChoice>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loaded = isSupabaseConfigured()
        ? await loadCoupleQuiz(key)
        : loadQuizLocal(key);
      if (!cancelled) setQuiz(loaded);
    })();
    return () => {
      cancelled = true;
    };
  }, [key]);

  const questions = useMemo(
    () =>
      (quiz?.questionIds ?? [])
        .map((id) => getQuestionById(id))
        .filter((q): q is NonNullable<typeof q> => Boolean(q)),
    [quiz],
  );

  const answeredCount = useMemo(
    () => questions.filter((q) => answers[String(q.id)]).length,
    [questions, answers],
  );

  async function submit() {
    if (!quiz) return;
    setSubmitting(true);
    setSubmitError(null);
    const { matches, total, score } = calcScore(
      quiz.creatorAnswers,
      answers,
      quiz.questionIds,
    );
    try {
      if (isSupabaseConfigured()) {
        await saveResult(quiz.key, {
          partnerAnswers: answers,
          matches,
          total,
          score,
        });
      } else {
        saveResultLocal({
          key: quiz.key,
          partnerAnswers: answers,
          matches,
          total,
          score,
          solvedAt: new Date().toISOString(),
        });
      }
      router.push(`/result/${quiz.key}`);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "제출에 실패했어요.");
    } finally {
      setSubmitting(false);
    }
  }

  if (quiz === undefined) {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-1 items-center justify-center px-5 py-10">
        <p className="text-ash-deep">퀴즈를 불러오는 중…</p>
      </main>
    );
  }

  if (quiz === null) {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center px-5 py-10">
        <div className="card-kitsch w-full p-6 text-center">
          <p className="text-4xl">😿</p>
          <h1 className="mt-3 text-2xl font-black">
            퀴즈를 찾을 수 없어요
          </h1>
          <p className="mt-2 text-ash-deep">
            링크가 잘못됐거나, 출제자가 아직 Supabase에 연결하지 않은
            로컬 모드 퀴즈일 수 있어요.
          </p>
          <Link
            href="/create"
            className="btn-tang mt-5 inline-block rounded-full px-6 py-3 font-black"
          >
            나도 퀴즈 만들기 →
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-5 py-10">
      <p className="text-sm font-bold text-tang">2단계 · 풀이하기</p>
      <h1 className="mt-2 text-3xl font-black">
        {quiz.creatorName}의 퀴즈에 답해요
      </h1>
      <p className="mt-1 text-ash-deep">
        {quiz.partnerName}님, {quiz.creatorName}과 같은 답을 고르면
        싱크로율이 올라가요 · {answeredCount}/{questions.length}문항
      </p>

      <div className="mt-6 space-y-4">
        {questions.map((q, i) => (
          <article key={q.id} className="card-kitsch p-5">
            <p className="text-xs font-bold text-ash">
              Q{i + 1} · {getCategoryName(q.category)}
            </p>
            <h2 className="mt-1 text-lg font-black">{q.question}</h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {(["A", "B"] as const).map((choice) => (
                <button
                  key={choice}
                  onClick={() =>
                    setAnswers((prev) => ({ ...prev, [String(q.id)]: choice }))
                  }
                  className={`rounded-xl border-2 px-3 py-3 text-sm font-bold ${
                    answers[String(q.id)] === choice
                      ? "border-ink bg-tang text-white"
                      : "border-ink bg-white"
                  }`}
                >
                  {choice === "A" ? q.choice_a : q.choice_b}
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>

      {submitError && (
        <p className="mt-4 rounded-xl border-2 border-ink bg-blush px-4 py-3 text-sm font-bold">
          {submitError}
        </p>
      )}
      <button
        onClick={submit}
        disabled={answeredCount < questions.length || submitting}
        className="btn-tang mt-6 rounded-full px-6 py-4 text-lg font-black disabled:opacity-40"
      >
        {submitting
          ? "채점하는 중…"
          : answeredCount < questions.length
            ? `문항을 다 골라주세요 (${answeredCount}/${questions.length})`
            : "결과 보기 💌"}
      </button>
    </main>
  );
}
