# context.md — 현재 업무 현황

> 최종 업데이트: 2026-06-12

## 현재 상태

Phase 0~3 전체 완료 후 Opus 심층 분석 완료. 다음 세션에서 개선 작업 착수 예정.

**테스트 상태 (중요):** `npm test` 현재 실패.  
커밋 `3b50c57b`에서 테스트 파일 전부 삭제됨 → 안전망 0.  
**다음 세션 첫 작업 = 테스트 복원.**

**빌드 상태:** `next build && next start` 정상 (dev 서버는 Turbopack OOM 이슈로 권장 안 함)

## 다음 착수 항목 (우선순위 순)

1. **H-1** 테스트 복원 — git에서 `*.test.ts` 파일 복원 + vitest.config 추가
2. **H-4** simulation POST fallthrough 버그 수정 (`api/simulation/route.ts`)
3. **H-2** CSV RFC 4180 파서/직렬화 교체 (`util/csv.ts`, `api/csv/route.ts`)
4. **H-3** z-score → MAD 기반 수정 (`balance/analyze.ts:47`)
5. **H-7** SEED_TEMPLATES 단일화 (`genre-wizard/route.ts` 인라인 제거)
6. **H-5/H-6** DataEditor(1248줄) / SimulationView(1371줄) 컴포넌트 분리
7. **F-1** 진척도 페이싱 시뮬레이터 (신기능, 가장 가치 높음)

## 전체 개선 목록

→ 상세 내용은 `docs/IMPROVEMENTS.md` 참조 (30개 항목 + 추가 기능 6개)

## 주요 경로

- DB: `data/game-data-studio.db`
- 실행: `npm run dev` (포트 3001), 빌드: `npm run build && npm start`
- 테스트: `npm test` (현재 실패 — 복원 필요)
