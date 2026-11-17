// 앱이 "서버 DB 모드"인지 판단하는 플래그.
// 브라우저는 이제 Supabase에 직접 붙지 않는다 — 테이블 접근은 Route Handler
// (/api/quizzes/...)가 service_role 키로만 수행하고, RLS는 anon을 전면 거부한다.
// 따라서 브라우저가 알아야 할 것은 "서버 API를 쓸 수 있는 배포인가"뿐이고,
// 그 기준은 NEXT_PUBLIC_SUPABASE_URL의 존재 여부다.
// (anon 키는 더 이상 테이블 접근에 쓸 수 없으므로 판단에 쓰지 않는다.)
export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
}
