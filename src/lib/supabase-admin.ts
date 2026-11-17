import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// 서버 전용 Supabase 클라이언트 (service_role).
// - RLS는 anon/authenticated에 대해 전면 거부로 바뀌었으므로(supabase/schema.sql),
//   데이터 접근은 이 키를 쓰는 Route Handler(/api/...)에서만 일어난다.
// - SUPABASE_SERVICE_ROLE_KEY는 NEXT_PUBLIC_ 접두사가 없어 브라우저 번들에 들어가지
//   않는다. 이 모듈을 클라이언트 컴포넌트에서 import 하면 안 된다.
// - 키가 없으면 null을 반환하고, API는 503으로 응답한다(앱은 로컬 모드로 동작).

let client: SupabaseClient | null | undefined;

export function getSupabaseAdmin(): SupabaseClient | null {
  if (typeof window !== "undefined") {
    throw new Error("getSupabaseAdmin()은 서버에서만 호출해야 합니다.");
  }
  if (client !== undefined) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    client = null;
    return client;
  }

  client = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

/** 서버 DB가 설정됐는지 — API가 503 대신 실제 작업을 할 수 있는 상태인지 판단용 */
export function isServerDbConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}
