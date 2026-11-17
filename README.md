# LoveTap — 커플 바이럴 퀴즈 & PWA 마이크로 앱

밸런스 퀴즈 5문제로 알아보는 우리 커플 싱크로율 테스트.
카톡 공유(OG 미리보기)가 바이럴 핵심인 PWA 마이크로 앱입니다.

## 3단계 MVP 플로우

| 단계 | 화면 | 경로 |
| --- | --- | --- |
| 1. 출제 | 이름 입력 → 문항 5개에 내 답 정하기 → 공유 링크 생성 | `/create` |
| 2. 풀이 / 결과 | 링크로 들어온 상대가 같은 5문항 풀이 → 싱크로율 계산 | `/q/[slug]` → `/result/[slug]` |
| 3. 소장 | 결과 카드 이미지 저장 / 카톡 공유 / 링크 복사 | `/result/[slug]` |

## 스택

- Next.js 16 (App Router) + React 19 + Tailwind CSS v4
- Vercel 배포 전제, Supabase 무료 티어
- PWA: `public/manifest.webmanifest` + 아이콘 192/512px

## 디자인

파스텔 키치 톤, 오렌지(#FF7A1A)·그레이 듀오를 포인트로.
토큰은 `src/app/globals.css`의 `@theme`에 정의.

## 로컬 실행

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # 프로덕션 빌드 확인
```

## 환경변수

`.env.example`을 `.env.local`로 복사해 입력하세요. (실제 키는 절대 커밋 금지)

```bash
cp .env.example .env.local
```

- `NEXT_PUBLIC_SUPABASE_URL` — 있으면 서버 DB 모드, 없으면 localStorage 기반 로컬 모드.
- `SUPABASE_SERVICE_ROLE_KEY` — **서버 전용**. Route Handler(`/api/quizzes/...`)가
  이 키로만 테이블에 접근합니다. `NEXT_PUBLIC_` 접두사를 절대 붙이지 마세요.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — 더 이상 테이블 접근에 쓰이지 않습니다(RLS가 anon 전면 차단).
- `NEXT_PUBLIC_SITE_URL` — OG 메타·공유 링크 기준 주소 (기본값 https://lovetap-psi.vercel.app)

## API (서버 채점)

브라우저는 Supabase에 직접 붙지 않습니다. 모든 DB 접근은 Route Handler에서 일어나고,
정답(`quizzes.correct_choice`)과 `couples.secret_letter`는 응답에 포함되지 않습니다.

| 메서드 | 경로 | 역할 |
| --- | --- | --- |
| POST | `/api/quizzes` | couples 1행 + quizzes 5행 저장 → `{ key }`(couples.id) |
| GET | `/api/quizzes/[slug]` | 풀이용 문항(문구·선택지·순서만) |
| POST | `/api/quizzes/[slug]/results` | 답안 제출 → 서버 채점·results 저장 → `{ score, matches, total, solvedAt }` |
| GET | `/api/quizzes/[slug]/results` | 최신 결과 1건 |

호출은 `src/lib/db.ts`가 담당합니다(`createCoupleQuiz` / `loadPublicQuiz` /
`submitQuizAnswers` / `loadLatestResult`). `NEXT_PUBLIC_SUPABASE_URL`이 없으면
`src/lib/store.ts`의 localStorage 모드로 폴백합니다.

## 데이터 — 실데이터 사용 중 ✅

피클이 텔레그램 그룹에서 공유한 실파일을 그대로 사용합니다
(원본: 텔레그램 AI 협업 그룹, 2026-11-13).

- `data/questions.json` — **실데이터 v1.0.0** (피클 제공 원본 그대로).
  문항 30개(데이트 & 취향 1–10 / 갈등 & 연락 11–20 / 상상 & 미래 21–30),
  카테고리 3개, 결과 티어 5개(퍼센트 기준: 100 / 80–99 / 60–79 / 40–59 / 0–39).
  각 티어에 title / description / share_caption 포함.
- `supabase/schema.sql` — 스키마 v2.
  테이블 3개(couples / quizzes / results). `quizzes.question_id TEXT NOT NULL`에
  출제 당시 문항 id를 저장하고, `question_text`/`choice_a`/`choice_b`도 사본으로 보관합니다
  (문구를 나중에 고쳐도 이미 뿌린 링크가 깨지지 않음).
  RLS는 **공개 정책 없음(기본 거부)** — anon·authenticated의 테이블 권한도 회수되어
  service_role(서버)만 접근합니다. 커플당 문항 5개, 정답은 `correct_choice`('A'/'B'),
  점수는 0–100 퍼센트, 답안은 `partner_answers` JSONB(question_id 기준, 예: `{"1":"A"}`).
- `src/lib/db.ts` — `/api/...`를 호출하는 데이터 접근 계층
  (출제 → 풀이 조회 → 답안 제출·채점 → 결과 조회).
  `src/lib/quiz-core.ts`가 서버측 검증·채점·공개 응답 조립을 맡습니다.
- `couples.photo_url` / `secret_letter` 컬럼은 스키마에 있으나 MVP 플로우에서는
  아직 사용하지 않습니다 (추후 사진·편지 기능용).

## OG 이미지 / PWA

- `public/og.png` — 1200×630 임시 버전 (ffmpeg + Noto Sans CJK KR 제작,
  "밸런스 퀴즈 5문제로 알아보기").
  최종본 교체 방법은 `docs/og-image.md` 참고.
- `public/icon-192.png` / `icon-512.png` — 임시 플레이스홀더 ("LT").

## 다음 단계

1. **Supabase 연결** — Supabase 프로젝트 생성 → `supabase/schema.sql`을 SQL
   Editor에서 실행 → Vercel/.env.local에 `NEXT_PUBLIC_SUPABASE_URL`과
   `SUPABASE_SERVICE_ROLE_KEY` 입력 → `npm run dev`로 출제→풀이→결과 흐름 확인.
2. **GitHub push** — 로컬 git 레포는 초기화됨. GitHub에 빈 레포를 만든 뒤
   `git remote add origin <url>` → `git push -u origin main`.
3. **Vercel 배포** — GitHub 레포 연결 → 환경변수 입력 → 배포 →
   `NEXT_PUBLIC_SITE_URL`을 실제 도메인으로 교체 → 카톡 OG 미리보기 검증
   (자세한 방법은 `docs/og-image.md`).
