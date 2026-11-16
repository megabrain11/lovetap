# OG 이미지 (카톡 미리보기) 안내

카톡 공유 미리보기가 LoveTap 바이럴의 핵심이라 OG 이미지는 필수입니다.

## 규격

| 항목 | 값 |
| --- | --- |
| 크기 | **1200 × 630 px** (카톡·페북·X 공용) |
| 파일 | `public/og.png` (이미 포함 — 임시 버전, 아래 참고) |
| 비율 | 1.91:1 |
| 용량 | 1MB 이하 권장 |
| 안전 영역 | 좌우·상하 40px 여백 — 카톡이 가장자리를 잘라낼 수 있음 |

## 현재 상태

- `public/og.png`: ffmpeg + Noto Sans CJK KR로 만든 **임시 버전**
  (파스텔 배경 + "LoveTap / 우리 커플 싱크로율 테스트" 문구, 1200×630 확인됨).
  디자인만 다듬으면 바로 써도 되는 수준이지만, 최종본은 디자이너/피클이
  만든 이미지로 교체하는 것을 권장합니다.
- 최종 OG 이미지는 1200×630 이미지를 `public/og.png`에 덮어쓰면 됩니다.
  파일명만 같으면 코드 수정이 필요 없습니다.
- 메타 태그는 `src/app/layout.tsx`의 `openGraph.images`에 이미 연결돼 있고,
  `metadataBase`는 `NEXT_PUBLIC_SITE_URL` 기준입니다.

## 검증 방법

1. Vercel 배포 후 실제 URL을 얻는다.
2. 카톡에 URL을 붙여넣어 미리보기 이미지가 뜨는지 확인한다.
   (카톡 캐시가 강해서 안 바뀌면, URL 뒤에 `?v=2` 같은 쿼리를 붙여 테스트)
3. 카카오톡 공유 디버거(https://developers.kakao.com/tool/clear/og) 또는
   https://www.opengraph.xyz/ 에서도 확인 가능.

## PWA 아이콘

- `public/manifest.webmanifest`에 192px / 512px 아이콘을 참조하고 있습니다.
- `public/icon-192.png`, `public/icon-512.png`: ffmpeg으로 만든 **임시
  플레이스홀더** (주황 배경 + "LT"). 최종 아이콘으로 교체 권장.
