-- ========================================================
-- LoveTap MVP Database Schema (Supabase / PostgreSQL)
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
  question_text TEXT NOT NULL,
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
  partner_answers JSONB NOT NULL, -- e.g. {"1": "A", "2": "B", "3": "A", "4": "B", "5": "A"}
  solved_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_quizzes_couple_id ON public.quizzes(couple_id);
CREATE INDEX IF NOT EXISTS idx_results_couple_id ON public.results(couple_id);

-- ========================================================
-- Row Level Security (RLS) Policies
-- Public anonymous app: anyone can create and read by couple_id
-- ========================================================

ALTER TABLE public.couples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;

-- Couples policies
CREATE POLICY "Allow public select on couples"
  ON public.couples FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert on couples"
  ON public.couples FOR INSERT
  WITH CHECK (true);

-- Quizzes policies
CREATE POLICY "Allow public select on quizzes"
  ON public.quizzes FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert on quizzes"
  ON public.quizzes FOR INSERT
  WITH CHECK (true);

-- Results policies
CREATE POLICY "Allow public select on results"
  ON public.results FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert on results"
  ON public.results FOR INSERT
  WITH CHECK (true);
