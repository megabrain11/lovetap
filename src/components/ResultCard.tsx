import { forwardRef } from "react";
import type { ResultTier } from "@/lib/types";

interface Props {
  creatorName: string;
  partnerName: string;
  score: number; // 퍼센트 0-100
  matches: number;
  total: number;
  tier: ResultTier; // 실데이터 result_tiers에서 찾은 티어
}

/**
 * 결과 카드 — html-to-image로 PNG 캡처하는 대상.
 * 배경·폰트는 인라인 스타일에 가깝게 유지해 캡처 시 깨지지 않게 한다.
 */
const ResultCard = forwardRef<HTMLDivElement, Props>(function ResultCard(
  { creatorName, partnerName, score, matches, total, tier },
  ref,
) {
  return (
    <div
      ref={ref}
      className="w-full rounded-3xl border-2 border-ink bg-white p-6 text-center"
      style={{ boxShadow: "6px 6px 0 #2b2b2b" }}
    >
      <p className="text-sm font-bold tracking-widest text-ash">
        LOVETAP · 커플 싱크로율
      </p>
      <p className="mt-3 text-4xl font-black text-tang">{score}%</p>
      <p className="mt-2 text-xl leading-snug font-black">{tier.title}</p>
      <p className="mt-1 text-sm font-bold text-ash-deep">
        {matches}/{total}문항 일치
      </p>
      <p className="mt-3 text-ash-deep">{tier.description}</p>
      <p className="mt-5 text-sm font-bold">
        🐱 {creatorName} × 🐈 {partnerName}
      </p>
      <p className="mt-1 text-xs text-ash">lovetap · 나도 테스트하기</p>
    </div>
  );
});

export default ResultCard;
