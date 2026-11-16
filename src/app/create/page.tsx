"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCategoryName, pickQuestions } from "@/lib/questions";
import { makeSlug, saveQuizLocal, shareUrl } from "@/lib/store";
import { createCoupleQuiz } from "@/lib/db";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { AnswerChoice, CoupleQuiz, Question } from "@/lib/types";

export default function CreatePage() {
  const router = useRouter();
  const [step, setStep] = useState<"names" | "quiz" | "done">("names");
  const [creatorName, setCreatorName] = useState("");
  const [partnerName, setPartnerName] = useState("");
  // 출제 문항 5개 (schema.sql: 5 questions per couple): 카테고리별로 고르게 섞어 뽑는다.
  // Math.random()은 prerender 중 쓸 수 없어 마운트 후 useEffect에서 뽑는다.
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, AnswerChoice>>({});
  const [key, setKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 마운트 후 클라이언트에서만 문항을 뽑아야 prerender/hydration이 깨지지 않음
    setQuestions(pickQuestions());
  }, []);

  const answeredCount = useMemo(
    () => questions.filter((q) => answers[String(q.id)]).length,
    [questions, answers],
  );

  function reshuffle() {
    setQuestions(pickQuestions());
    setAnswers({});
  }

  async function finish() {
    setSaving(true);
    setSaveError(null);
    const creator = creatorName.trim() || "나";
    const partner = partnerName.trim() || "상대";
    const base: Omit<CoupleQuiz, "key" | "createdAt"> = {
      coupleName: `${creator} & ${partner}`,
      creatorName: creator,
      partnerName: partner,
      questionIds: questions.map((q) => q.id),
      creatorAnswers: answers,
    };
    try {
      if (isSupabaseConfigured()) {
        // Supabase 모드: couples 행 + quizzes 행 5개 insert, key = couples.id(UUID)
        const coupleId = await createCoupleQuiz(base);
        setKey(coupleId);
      } else {
        // 로컬 모드: localStorage에 저장, key = lovetap-xxxxxx slug
        const slug = makeSlug();
        saveQuizLocal({ ...base, key: slug, createdAt: new Date().toISOString() });
        setKey(slug);
      }
      setStep("done");
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "저장에 실패했어요.");
    } finally {
      setSaving(false);
    }
  }

  async function copyLink() {
    if (!key) return;
    await navigator.clipboard.writeText(shareUrl(key));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (step === "done" && key) {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center px-5 py-10">
        <div className="card-kitsch w-full p-6 text-center">
          <p className="text-4xl">🎉</p>
          <h1 className="mt-3 text-2xl font-black">퀴즈가 완성됐어요!</h1>
          <p className="mt-2 text-ash-deep">
            {partnerName || "상대"}에게 링크를 보내면
            <br />
            풀이가 시작돼요.
          </p>
          <p className="mt-5 rounded-xl border-2 border-dashed border-ash bg-cream px-3 py-3 text-sm break-all">
            {shareUrl(key)}
          </p>
          <div className="mt-5 flex flex-col gap-3">
            <button
              onClick={copyLink}
              className="btn-tang rounded-full px-6 py-3 font-black"
            >
              {copied ? "복사됐어요 ✓" : "링크 복사하기"}
            </button>
            <button
              onClick={() => router.push(`/q/${key}`)}
              className="rounded-full border-2 border-ink bg-white px-6 py-3 font-black"
            >
              상대 화면 미리보기
            </button>
            <Link
              href="/"
              className="text-sm font-bold text-ash underline"
            >
              처음으로 돌아가기
            </Link>
          </div>
          {!isSupabaseConfigured() && (
            <p className="mt-4 text-xs text-ash">
              ※ 지금은 로컬 저장 모드예요. Supabase 연결 전에는 같은
              브라우저에서만 풀이가 보여요.
            </p>
          )}
        </div>
      </main>
    );
  }

  if (step === "names") {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-5 py-10">
        <p className="text-sm font-bold text-tang">1단계 · 출제하기</p>
        <h1 className="mt-2 text-3xl font-black">누구 커플 퀴즈예요?</h1>
        <div className="card-kitsch mt-6 space-y-4 p-6">
          <label className="block">
            <span className="font-bold">내 이름 (출제자)</span>
            <input
              value={creatorName}
              onChange={(e) => setCreatorName(e.target.value)}
              placeholder="예) 체다"
              className="mt-1 w-full rounded-xl border-2 border-ink px-4 py-3"
            />
          </label>
          <label className="block">
            <span className="font-bold">상대 이름 (풀이자)</span>
            <input
              value={partnerName}
              onChange={(e) => setPartnerName(e.target.value)}
              placeholder="예) 애쉬"
              className="mt-1 w-full rounded-xl border-2 border-ink px-4 py-3"
            />
          </label>
          <button
            onClick={() => setStep("quiz")}
            className="btn-tang w-full rounded-full px-6 py-3 font-black"
          >
            문항 고르러 가기 →
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-5 py-10">
      <p className="text-sm font-bold text-tang">1단계 · 출제하기</p>
      <h1 className="mt-2 text-3xl font-black">내 답을 먼저 정해요</h1>
      <p className="mt-1 text-ash-deep">
        {answeredCount}/{questions.length}문항 완료 · 상대는 같은 문제에
        자기 답을 골라요
      </p>
      <button
        onClick={reshuffle}
        className="mt-4 self-start rounded-full border-2 border-ink bg-white px-4 py-2 text-sm font-bold"
      >
        🔀 다른 문항으로 바꾸기
      </button>

      <div className="mt-4 space-y-4">
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

      {saveError && (
        <p className="mt-4 rounded-xl border-2 border-ink bg-blush px-4 py-3 text-sm font-bold">
          {saveError}
        </p>
      )}
      <button
        onClick={finish}
        disabled={answeredCount < questions.length || saving}
        className="btn-tang mt-6 rounded-full px-6 py-4 text-lg font-black disabled:opacity-40"
      >
        {saving
          ? "저장하는 중…"
          : answeredCount < questions.length
            ? `문항을 다 골라주세요 (${answeredCount}/${questions.length})`
            : "퀴즈 완성하고 링크 받기 →"}
      </button>
    </main>
  );
}
