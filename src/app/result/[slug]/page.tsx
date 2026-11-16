"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toPng } from "html-to-image";
import ResultCard from "@/components/ResultCard";
import { getResultTier } from "@/lib/sync";
import { loadQuizLocal, loadResultLocal, shareUrl } from "@/lib/store";
import { loadCoupleQuiz, loadLatestResult } from "@/lib/db";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { CoupleQuiz, QuizResult } from "@/lib/types";

export default function ResultPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex w-full max-w-xl flex-1 items-center justify-center px-5 py-10">
          <p className="text-ash-deep">결과를 불러오는 중…</p>
        </main>
      }
    >
      <ResultContent />
    </Suspense>
  );
}

function ResultContent() {
  const params = useParams();
  const key = params.slug as string;
  const cardRef = useRef<HTMLDivElement>(null);
  const [quiz, setQuiz] = useState<CoupleQuiz | null | undefined>(undefined);
  const [result, setResult] = useState<QuizResult | null | undefined>(
    undefined,
  );
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [q, r] = isSupabaseConfigured()
        ? await Promise.all([loadCoupleQuiz(key), loadLatestResult(key)])
        : [loadQuizLocal(key), loadResultLocal(key)];
      if (!cancelled) {
        setQuiz(q);
        setResult(r);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [key]);

  async function saveImage() {
    if (!cardRef.current) return;
    const dataUrl = await toPng(cardRef.current, { pixelRatio: 2 });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `lovetap-result-${key}.png`;
    a.click();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function share() {
    const url = shareUrl(key);
    if (navigator.share) {
      try {
        await navigator.share({
          title: "LoveTap — 우리 커플 싱크로율",
          text: result
            ? getResultTier(result.score).share_caption
            : "우리 커플 싱크로율을 확인해 봐!",
          url,
        });
        setShared(true);
        return;
      } catch {
        // 공유 취소 시 조용히 무시
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (quiz === undefined || result === undefined) {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-1 items-center justify-center px-5 py-10">
        <p className="text-ash-deep">결과를 불러오는 중…</p>
      </main>
    );
  }

  if (!quiz || !result) {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center px-5 py-10">
        <div className="card-kitsch w-full p-6 text-center">
          <p className="text-4xl">😿</p>
          <h1 className="mt-3 text-2xl font-black">결과가 없어요</h1>
          <p className="mt-2 text-ash-deep">
            아직 풀이가 끝나지 않았어요. 링크를 받은 상대가 퀴즈를 풀면
            결과가 여기에 나와요.
          </p>
          <Link
            href={`/q/${key}`}
            className="btn-tang mt-5 inline-block rounded-full px-6 py-3 font-black"
          >
            퀴즈 풀러 가기 →
          </Link>
        </div>
      </main>
    );
  }

  const tier = getResultTier(result.score);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-5 py-10">
      <p className="text-sm font-bold text-tang">3단계 · 소장하기</p>
      <h1 className="mt-2 text-3xl font-black">우리 결과 나왔어요!</h1>

      <div className="mt-6">
        <ResultCard
          ref={cardRef}
          creatorName={quiz.creatorName}
          partnerName={quiz.partnerName}
          score={result.score}
          matches={result.matches}
          total={result.total}
          tier={tier}
        />
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <button
          onClick={saveImage}
          className="btn-tang rounded-full px-6 py-4 text-lg font-black"
        >
          {saved ? "저장됐어요 ✓" : "📥 결과 카드 이미지로 저장"}
        </button>
        <button
          onClick={share}
          className="rounded-full border-2 border-ink bg-white px-6 py-4 text-lg font-black"
        >
          {shared
            ? "공유했어요 ✓"
            : copied
              ? "링크 복사됐어요 ✓"
              : "🔗 카톡으로 공유하기"}
        </button>
        <Link
          href="/create"
          className="rounded-full border-2 border-ink bg-blush px-6 py-4 text-center text-lg font-black"
        >
          나도 퀴즈 만들기 →
        </Link>
      </div>

      <p className="mt-6 text-center text-sm text-ash">
        카톡 공유 시 OG 미리보기로 싱크로율이 보여요.
        <br />
        (OG 이미지는 public/og.png, docs/og-image.md 참고)
      </p>
    </main>
  );
}
