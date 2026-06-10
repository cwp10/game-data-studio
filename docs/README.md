# docs — Game Data Studio 기획·연구 자료

## 📋 계획
- [PLAN.md](./PLAN.md) — **전면 고도화 계획 정본** (Phase 0 RPG 온보딩 → 1 에디터 UX → 2 시뮬 → 3 추가, + §12 RPG 6종 스키마 부록)

## 🖼 와이어프레임 & UI
- [wireframe.html](./wireframe.html) — **PLAN 고도화 예상 와이어프레임** (브라우저로 열기). 현재 앱 디자인 토큰 계승, 사이드바 nav로 화면 전환.
  - Phase 0 RPG 6종 온보딩 / Phase 1 데이터 에디터(undo·셀선택·자동저장·수치메모) / Phase 2 시뮬(전투 승률+Wilson CI·HP추이·로그, 가챠·DPS·레이더) / Phase 3 밸런싱 AI 리포트·스키마 유효성·FK
- `research/current-ui/` — Playwright로 캡처한 **현재 앱 실제 화면**(01 홈 / 02 데이터 / 03 밸런싱 / 04 시뮬 / 05 스키마) + 와이어프레임 캡처(wf-*)
  - 현재→고도화 비교: 시뮬은 "AI→C# 수식 도출"(현재) → "네이티브 엔진 승률+CI"(고도화), 데이터는 셀선택·undo·자동저장 표시 신규

## 🔬 연구 자료

### indiebalancing 경쟁 제품 분석 (`research/indiebalancing/`)
동일 도메인(게임 밸런스 데이터 스프레드시트) 경쟁 제품 "인디밸런싱"(velog @dj258255 7편) 분석.

- [SOURCES.md](./research/indiebalancing/SOURCES.md) — velog 7편 원문 URL·요약 + 우리 적용 판단
- [SURVEY-DATA.md](./research/indiebalancing/SURVEY-DATA.md) — **설문 차트 실측 데이터**(n=12, 이미지 직접 판독) + 곡선 5종 표
- 설문·곡선 이미지 12종 (`*.png`) — Q1 역할 / Q2 장르 / Q4 도구 / Q5 페인 / Q8 원하는기능 / Q9 의향 / Q11 가격 / 곡선 5종 등

### 핵심 검증 (설문 실측)
- "밸런스 검증 어려움" **83.3%** 압도적 1위 → 밸런싱/시뮬이 제품 핵심
- 개발 장르 **로그라이크 50% 1위** → RPG 6종에 로그라이크 포함 적중
- **전용 툴 0%** → 시장 공백 / 사용 의향 부정 0%
