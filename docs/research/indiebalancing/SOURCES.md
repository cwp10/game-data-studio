# indiebalancing 원문 출처 (velog @dj258255)

> 우리 Game Data Studio와 동일 도메인(게임 밸런스 데이터 스프레드시트)의 경쟁 제품 "인디밸런싱" 개발기. 7편.
> 제품: https://indiebalancing.vercel.app/ · 오픈소스: https://github.com/dj258255/indiebalancing
> 분석일: 2026-06-10. 설문 차트 실측은 [SURVEY-DATA.md](./SURVEY-DATA.md) 참조.

## 1. 시장조사 마쳤습니다 (제품 소개 + 곡선 5종)
https://velog.io/@dj258255/시장조사-마쳤습니다
- 제품 개요: 인디게임 밸런스 데이터 관리 웹 툴. 게임 특화 함수·전투 시뮬·엔진 코드 생성.
- 핵심 기능: 게임 특화 함수 70+(DAMAGE/SCALE/TTK/DPS/EHP/DIMINISH), 시트 간 참조, 순환 참조 감지, 성장 곡선/레이더 차트, 엔진(Unity/Godot/Unreal) 코드 생성, 전투 시뮬(몬테카를로 1k~100k, Wilson 95%), Z-score 이상치, Goal Solver.
- **곡선 5종 비교표 삽입** → SURVEY-DATA.md.
- 한계: 구간별 복합곡선·특수효과 시뮬·사용자 정의 수식·협업·AI 자동밸런싱 없음.

## 2. 시장조사 중간점검 입니다 (설문 결과 본체)
https://velog.io/@dj258255/시장조사-중간점검-입니다
- 설문 n=12. **차트 다수 삽입 → SURVEY-DATA.md에 실측 판독.**
- 기능 우선순위(본문): 1.스프레드시트 UI > 2.엔진 연동 > 3.시각화 > 4.DPS/EHP/TTK 자동계산 > 5.몬테카를로.
- Open Core 결정. 비포함: AI 자동밸런싱, 만능 커버(80% 솔루션), 엔진 플러그인.
- 타겟: 1~5인 인디팀, 전담 밸런서 부재, VBA 역량 낮음.

## 3. 테이블 드래그 성능 최적화
https://velog.io/@dj258255/테이블-드래그-성능-최적화
- TanStack Table 기반. Set O(1) 셀 조회, rafThrottle, 드래그 중 DOM 직접 조작(React 우회), will-change.
- **우리 적용 판단: 미적용**(우리는 셀 드래그 선택 자체가 없음 — 존재하지 않는 기능의 최적화).

## 4. 셀 입력 및 수식바 동기화 최적화
https://velog.io/@dj258255/셀-입력-및-수식바-동기화-최적화
- 결론: debounce/throttle 없이 **즉시 동기화**. "premature optimization 금지". 오픈소스(Fortune-Sheet/Univer/Luckysheet) 벤치마킹.
- **우리 적용: 동기화는 즉시 setState 원칙 채택.**

## 5. IME(한글/중국어/일본어) 입력 처리
https://velog.io/@dj258255/IME-한글중국어일본어-입력-처리
- 한글 조합 분리 버그 → uncontrolled(defaultValue) + isComposingRef(compositionStart/End) + keyDown에서 isComposing/keyCode 229 가드.
- **우리 적용: Phase 1 P1-1 최우선**(DataEditor.tsx:451 Enter 가드).

## 6. 첫 사용자 피드백 개선 (24개 항목)
https://velog.io/@dj258255/첫-사용자-피드백-개선
- 버그7·성능3·UI6·UX8·신규6. Undo/Redo(50단계), 자동저장 표시기, 행/열 전체선택, 열 리사이즈, ESC 통일(useEscapeKey), 수식 참조 하이라이트, useRef 최신값(stale 클로저 방지).
- **우리 적용: Phase 1 전반**(undo/redo, ESC 훅, 자동저장 표시기 등).

## 7. MVP 공개하겠습니다 (최종 기능)
https://velog.io/@dj258255/MVP-공개하겠습니다
- 15개 기능: 전투 시뮬(스킬: 데미지/힐/무적/부활/범위, 전투 로그+그래프), DPS 분산, 경제 시뮬(인플레/디플레), 성장곡선/레이더, 가챠(천장), Goal Solver, 곡선 피팅, 난이도 곡선/플레이타임.
- 기술 스택: Next.js 16 + React 19 + TS + Zustand + Tailwind + TanStack Table v8 + Recharts.
- **우리 적용: Phase 2/3 시뮬·차트**(단 차트는 자체 SVG 유지, Zustand 미도입 — 우리 아키텍처 차이).

---

## 우리 제품과의 핵심 차이 (moat)
indiebalancing = 클라이언트 스프레드시트. **우리 = MCP + AI 대화 브리지 + 영속 SQLite + 스키마/관계.**
→ 패리티가 아니라 검증된 아이디어만 선별 차용. 계획 정본: [../../PLAN.md](../../PLAN.md).
