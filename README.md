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

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  — 없으면 앱은 localStorage 기반 로컬 모드로 동작합니다.
- `NEXT_PUBLIC_SITE_URL` — OG 메타·공유 링크 기준 주소 (기본값 https://lovetap.vercel.app)

## 데이터 — 실데이터 사용 중 ✅

피클이 텔레그램 그룹에서 공유한 실파일을 그대로 사용합니다
(원본: 텔레그램 AI 협업 그룹, 2026-11-13).

- `data/questions.json` — **실데이터 v1.0.0** (피클 제공 원본 그대로).
  문항 30개(데이트 & 취향 1–10 / 갈등 & 연락 11–20 / 상상 & 미래 21–30),
  카테고리 3개, 결과 티어 5개(퍼센트 기준: 100 / 80–99 / 60–79 / 40–59 / 0–39).
  각 티어에 title / description / share_caption 포함.
- `supabase/schema.sql` — **실데이터 원본 그대로** (피클 제공).
  테이블 3개(couples / quizzes / results) + RLS 정책(anon select/insert 공개).
  커플당 출제 문항 5개, 정답은 `correct_choice` ('A'/'B'),
  결과 점수는 0–100 퍼센트, 풀이 답안은 `partner_answers` JSONB
  (예: `{"1": "A", "2": "B"}`).
- `src/lib/db.ts` — 위 스키마에 맞춘 Supabase 연동 코드
  (couples insert → quizzes 5행 insert → results insert, UUID 키 흐름).
  환경변수가 없으면 `src/lib/store.ts`의 localStorage 모드로 폴백합니다.
- `couples.photo_url` / `secret_letter` 컬럼은 스키마에 있으나 MVP 플로우에서는
  아직 사용하지 않습니다 (추후 사진·편지 기능용).

## OG 이미지 / PWA

- `public/og.png` — 1200×630 임시 버전 (ffmpeg + Noto Sans CJK KR 제작,
  "밸런스 퀴즈 5문제로 알아보기").
  최종본 교체 방법은 `docs/og-image.md` 참고.
- `public/icon-192.png` / `icon-512.png` — 임시 플레이스홀더 ("LT").

## 다음 단계

1. **Supabase 연결** — Supabase 프로젝트 생성 → `supabase/schema.sql`을 SQL
   Editor에서 실행 → `.env.local`에 URL/anon 키 입력 → `npm run dev`로
   출제→풀이→결과 흐름을 실제 DB로 테스트.
   (연동 코드는 `src/lib/db.ts`에 이미 맞춰져 있음)
2. **GitHub push** — 로컬 git 레포는 초기화됨. GitHub에 빈 레포를 만든 뒤
   `git remote add origin <url>` → `git push -u origin main`.
3. **Vercel 배포** — GitHub 레포 연결 → 환경변수 입력 → 배포 →
   `NEXT_PUBLIC_SITE_URL`을 실제 도메인으로 교체 → 카톡 OG 미리보기 검증
   (자세한 방법은 `docs/og-image.md`).
