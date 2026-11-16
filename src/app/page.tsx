import Link from "next/link";

const STEPS = [
  {
    emoji: "✏️",
    title: "1. 출제하기",
    desc: "밸런스 퀴즈 5문제를 골라 내 답을 먼저 정해요.",
  },
  {
    emoji: "💌",
    title: "2. 풀이 · 결과",
    desc: "링크를 받은 상대가 풀면 우리 싱크로율이 바로 나와요.",
  },
  {
    emoji: "💾",
    title: "3. 소장하기",
    desc: "결과 카드를 이미지로 저장해 카톡·인스타에 자랑해요.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center px-5 py-10">
      <p className="rounded-full border-2 border-ink bg-butter px-4 py-1 text-sm font-bold">
        🧡 커플 밸런스 퀴즈
      </p>
      <h1 className="mt-6 text-center text-5xl leading-tight font-black tracking-tight">
        우리 둘,
        <br />
        <span className="text-tang">얼마나</span> 잘 맞을까?
      </h1>
      <p className="mt-4 text-center text-lg text-ash-deep">
        밸런스 퀴즈 5문제로 알아보는
        <br />
        우리 커플 싱크로율 테스트
      </p>

      <div className="mt-8 flex items-center gap-3 text-4xl" aria-hidden>
        <span>🐱</span>
        <span className="text-2xl font-black text-tang">×</span>
        <span>🐈</span>
      </div>

      <Link
        href="/create"
        className="btn-tang mt-8 rounded-full px-8 py-4 text-xl font-black"
      >
        퀴즈 만들기 →
      </Link>

      <section className="mt-12 w-full space-y-4">
        {STEPS.map((s) => (
          <article key={s.title} className="card-kitsch p-5">
            <h2 className="text-lg font-black">
              {s.emoji} {s.title}
            </h2>
            <p className="mt-1 text-ash-deep">{s.desc}</p>
          </article>
        ))}
      </section>

      <p className="mt-10 text-center text-sm text-ash">
        가입 없이 바로 시작 · 결과는 링크로만 공유돼요
      </p>
    </main>
  );
}
