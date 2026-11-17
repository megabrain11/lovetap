-- ========================================================
-- LoveTap MVP Database Schema (Supabase / PostgreSQL)
-- v2 · 2026-11-16 — question_id / 서버 전용 테이블 / RLS 전면 거부
-- ========================================================
-- 여러 번 실행해도 안전하다(IF NOT EXISTS · DROP POLICY IF EXISTS).
--
-- v2 변경 요약
--  1. quizzes.question_id TEXT NOT NULL 추가
--     → 출제 당시 문항 id 사본. 문구(question_text/choice_a/choice_b)도 함께 보관하므로
--       data/questions.json 문구를 나중에 고쳐도 이미 뿌린 공유 링크가 깨지지 않는다.
--       (이전 버전은 question_text 문자열 대조로 문항을 복원했다)
--  2. couples / quizzes / results 의 anon 공개 정책(SELECT·INSERT)을 모두 회수
--     → 브라우저(anon 키)는 세 테이블을 직접 읽거나 쓸 수 없다.
--       데이터 접근은 이 앱의 Route Handler(/api/quizzes/...)만 수행하고,
--       그 서버가 SUPABASE_SERVICE_ROLE_KEY(service_role)로 접근한다.
--       따라서 quizzes.correct_choice(정답)와 couples.secret_letter는
--       브라우저로 내려갈 경로가 없다.
--
-- 적용 순서
--  1) 이 파일 전체를 Supabase SQL Editor에서 Run
--  2) Vercel(또는 .env.local)에 NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 등록
--  3) 배포 후 출제 → 풀이 → 결과 흐름 확인
-- ========================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Couples Table
CREATE TABLE IF NOT EXISTS public.couples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_name TEXT NOT NULL,
  creator_name TEXT NOT NULL,
  partner_name TEXT NOT NULL,
  photo_url TEXT,
  secret_letter TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Quizzes Table (5 questions per couple)
CREATE TABLE IF NOT EXISTS public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  order_index INT NOT NULL,
  question_id TEXT NOT NULL, -- data/questions.json 의 문항 id (출제 당시 사본)
  question_text TEXT NOT NULL, -- 출제 당시 문구 사본
  choice_a TEXT NOT NULL,
  choice_b TEXT NOT NULL,
  correct_choice CHAR(1) NOT NULL CHECK (correct_choice IN ('A', 'B')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. Results Table
CREATE TABLE IF NOT EXISTS public.results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  score INT NOT NULL CHECK (score >= 0 AND score <= 100),
  partner_answers JSONB NOT NULL, -- {"1": "A", "2": "B", ...} — question_id 기준
  solved_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ------------------------------------------------------------------
-- 기존 프로젝트용 마이그레이션 (이미 테이블이 있는 경우)
-- CREATE TABLE IF NOT EXISTS는 기존 테이블에 컬럼을 더하지 않으므로 직접 추가한다.
-- ------------------------------------------------------------------
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS question_id TEXT;

-- 기존 행 백필: data/questions.json v1.0.0 문구 → 문항 id
-- (운영 데이터가 아직 없으면 이 UPDATE는 아무 행도 건드리지 않는다)
UPDATE public.quizzes AS q
SET question_id = m.question_id
FROM (VALUES
  ('주말 데이트는?', '1'),
  ('고기 먹을 때 나의 굽기 스타일은?', '2'),
  ('여행 갈 때 계획은?', '3'),
  ('음식 마지막 한입 남았을 때?', '4'),
  ('데이트 중 침묵이 흐를 때?', '5'),
  ('기념일에 가고 싶은 곳은?', '6'),
  ('내가 더 좋아하는 스킨십은?', '7'),
  ('둘만의 커플템을 맞춘다면?', '8'),
  ('피곤한 날 연인을 만나면?', '9'),
  ('연인과 노래방에 가면?', '10'),
  ('내가 삐졌을 때 바라는 건?', '11'),
  ('서운한 점이 생겼을 때?', '12'),
  ('바쁜 날 연인의 카톡 답장은?', '13'),
  ('싸우고 난 뒤 먼저 화해하는 쪽은?', '14'),
  ('질투가 나는 순간은?', '15'),
  ('힘든 일 털어놓을 때 원하는 반응은?', '16'),
  ('술자리 연락 스타일은?', '17'),
  ('연인의 ''비즈니스 이성 친구'' 허용 범위는?', '18'),
  ('연인이 약속에 30분 늦는다면?', '19'),
  ('화났을 때 나의 태도는?', '20'),
  ('크리스마스에 함께 보내고 싶은 하루는?', '21'),
  ('10년 뒤 우리 둘의 모습은?', '22'),
  ('로또 1등(20억)에 당첨된다면?', '23'),
  ('무인도에 단둘이 갇힌다면 나의 역할은?', '24'),
  ('연인이 바퀴벌레로 변한다면?', '25'),
  ('타임머신을 타고 갈 수 있다면?', '26'),
  ('연인이 갑자기 삭발을 하고 나타난다면?', '27'),
  ('서로의 스마트폰 비밀번호는?', '28'),
  ('연인이 우주비행사가 되어 1년 떠난다면?', '29'),
  ('다시 태어나도 지금 연인과?', '30')

) AS m(question_text, question_id)
WHERE q.question_id IS NULL
  AND q.question_text = m.question_text;

-- 백필 후 NOT NULL 확정. 아래가 실패하면 question_id가 비어 있는 옛 행이 있다는 뜻이므로
-- 그 행을 지우거나 question_id를 채운 뒤 다시 실행한다(운영 데이터가 없으면 발생하지 않는다).
ALTER TABLE public.quizzes ALTER COLUMN question_id SET NOT NULL;

-- 한 커플 안에서 같은 문항이 두 번 들어가지 않게 한다.
CREATE UNIQUE INDEX IF NOT EXISTS idx_quizzes_couple_question
  ON public.quizzes(couple_id, question_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_quizzes_couple_id ON public.quizzes(couple_id);
CREATE INDEX IF NOT EXISTS idx_results_couple_id ON public.results(couple_id);

-- ========================================================
-- Row Level Security (RLS)
-- 공개 정책 없음 = 기본 거부. service_role만 RLS를 우회해 접근한다.
-- ========================================================

ALTER TABLE public.couples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;

-- v1의 anon 공개 정책 회수 (재실행 안전). 아래 정책은 다시 만들지 않는다.
DROP POLICY IF EXISTS "Allow public select on couples" ON public.couples;
DROP POLICY IF EXISTS "Allow public insert on couples" ON public.couples;
DROP POLICY IF EXISTS "Allow public select on quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Allow public insert on quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Allow public select on results" ON public.results;
DROP POLICY IF EXISTS "Allow public insert on results" ON public.results;

-- 테이블 권한도 회수한다 (RLS와 별개로 한 겹 더).
-- anon = 브라우저에 실리는 공개 키, authenticated = 로그인 사용자(이 앱은 인증을 쓰지 않는다).
REVOKE ALL ON public.couples, public.quizzes, public.results FROM anon, authenticated;

-- service_role은 RLS 우회 + 기본 권한을 갖지만, 명시해 두어 재실행에도 상태를 고정한다.
GRANT ALL ON public.couples, public.quizzes, public.results TO service_role;

-- ========================================================
-- 적용 확인 (SQL Editor에서 실행해 보기)
-- ========================================================
-- 1) 정책이 0행이어야 한다 (공개 정책이 하나도 남지 않음)
--    SELECT * FROM pg_policies
--    WHERE schemaname = 'public' AND tablename IN ('couples', 'quizzes', 'results');
-- 2) anon이 테이블 권한을 갖지 않아야 한다
--    SELECT grantee, table_name, privilege_type
--    FROM information_schema.role_table_grants
--    WHERE grantee IN ('anon', 'authenticated')
--      AND table_name IN ('couples', 'quizzes', 'results');
-- 3) question_id가 NOT NULL이어야 한다
--    SELECT column_name, is_nullable FROM information_schema.columns
--    WHERE table_name = 'quizzes' AND column_name = 'question_id';

-- ========================================================
-- 남는 위험 (이 스키마로도 남는 것)
--  · /api/quizzes POST·results POST는 공개 엔드포인트라 스팸 행 생성이 가능하다.
--    (필요하면 Vercel WAF·Upstash rate limit을 API 앞단에 둔다)
--  · couples.id(UUID)를 아는 사람은 그 커플의 문항·결과를 볼 수 있다 — 링크를 받은
--    사람만 본다는 이 앱의 의도된 동작이다.
--  · results는 재풀이마다 새 행이 쌓인다. 화면은 최신 1건만 보여준다.
-- ========================================================
