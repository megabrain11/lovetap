import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Supabase 클라이언트.
// 환경변수(NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)가 없으면
// null을 반환하고, 앱은 localStorage 기반 로컬 모드로 동작한다.
// 실제 키 연결은 다음 단계(.env.local에 키 입력 후 재배포)에서 활성화된다.
let client: SupabaseClient | null | undefined;

export function getSupabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    client = null;
    return client;
  }
  client = createClient(url, anonKey);
  return client;
}

export function isSupabaseConfigured(): boolean {
  return getSupabase() !== null;
}
