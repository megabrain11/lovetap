"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getCategoryName, getQuestionById } from "@/lib/questions";
import { loadPublicQuiz, submitQuizAnswers } from "@/lib/db";
import type { AnswerChoice, PublicQuiz } from "@/lib/types";

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

/** 문항 카테고리 라벨 — 공개 응답에는 없으므로 data/questions.json에서 찾아 표시만 한다. */
function categoryLabel(questionId: string): string | null {
  const question = getQuestionById(Number(questionId));
  return question ? getCategoryName(question.category) : null;
}

function SolveContent() {
  const params = useParams();
  const key = params.slug as string;
  const router = useRouter();
  const [quiz, setQuiz] = useState<PublicQuiz | null | undefined>(undefined);
  const [answers, setAnswers] = useState<Record<string, AnswerChoice>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // 서버 모드: GET /api/quizzes/[slug] — 정답은 내려오지 않는다.
      // 로컬 모드: localStorage에 저장된 출제본.
      const loaded = await loadPublicQuiz(key);
      if (!cancelled) setQuiz(loaded);
    })();
    return () => {
      cancelled = true;
    };
  }, [key]);

  const questions = useMemo(() => quiz?.questions ?? [], [quiz]);

  const answeredCount = useMemo(
    () =>
      questions.filter((q) => answers[String(q.questionId)]).length,
    [questions, answers],
  );

  async function submit() {
    if (!quiz) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      // 채점은 서버가 quizzes.correct_choice로 수행하고 results에 저장한다.
      await submitQuizAnswers(quiz.key, answers);
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
        {questions.map((q, i) => {
          const category = categoryLabel(q.questionId);
          return (
            <article key={q.questionId} className="card-kitsch p-5">
              <p className="text-xs font-bold text-ash">
                Q{i + 1}
                {category ? ` · ${category}` : ""}
              </p>
              <h2 className="mt-1 text-lg font-black">{q.question}</h2>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {(["A", "B"] as const).map((choice) => (
                  <button
                    key={choice}
                    onClick={() =>
                      setAnswers((prev) => ({
                        ...prev,
                        [q.questionId]: choice,
                      }))
                    }
                    className={`rounded-xl border-2 px-3 py-3 text-sm font-bold ${
                      answers[q.questionId] === choice
                        ? "border-ink bg-tang text-white"
                        : "border-ink bg-white"
                    }`}
                  >
                    {choice === "A" ? q.choiceA : q.choiceB}
                  </button>
                ))}
              </div>
            </article>
          );
        })}
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
