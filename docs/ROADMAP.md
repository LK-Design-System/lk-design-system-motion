# 추가 과제 — 공개 레포 조사 기반 (2026-08-16)

같은 문제를 푸는 공개 레포들을 조사해서 이 레포에 실익이 있는 것만 추렸다.
조사 대상과 걸러낸 이유는 [맨 아래](#조사에서-걸러낸-것)에 있다 — 같은 후보를
다시 검토하는 낭비를 막기 위해 기록해 둔다.

원칙은 유지한다: **엔진은 바꾸지 않는다.** 자체 450줄 엔진이 요구사항
(프레임 순수 함수 · 결정론 · LDS DOM/토큰 재사용 · 라이선스 비용 0)을 정확히
덮고 있고, 조사 결과도 이를 뒤집을 근거가 없었다. 아래 과제는 전부 엔진
위에 얹는 것들이다.

---

## 1. Seekable 애니메이션 어댑터 — 함정 4 해소

**문제.** lds-core/product의 `infinite` CSS keyframe 컴포넌트(스피너, 스켈레톤,
indeterminate 프로그레스, 상태 펄스, 브랜드 웨이브, 엘리베이터 방향)는 벽시계
위상이라 영상에 못 쓰고, 쓰려면 `useFrame()`으로 움직임을 재구현해야 한다
(SKILL.md 함정 4). 재구현은 LDS 소유의 모션을 이 레포가 복제하는 것이라
소유권 경계상으로도 나쁘다.

**해법.** CSS 애니메이션을 끄는 대신 **프레임마다 시각을 고정**한다.
렌더러가 `window.__lkSetFrame(n)` 직후에:

```js
document.getAnimations().forEach(a => {
  a.pause();
  a.currentTime = (n / fps) * 1000;
});
```

Web Animations API는 CSS `animation`도 `getAnimations()`로 잡아주므로,
LDS 컴포넌트를 수정하지 않고 위상을 결정론적으로 만들 수 있다.

**선례.** [hyperframes](https://github.com/heygen-com/hyperframes)의 어댑터
계층이 정확히 이 방식이다 (CSS/WAAPI/GSAP/Lottie를 프레임 시간으로 시킹).
JS 시간 함수까지 통째로 가상화하는 고전으로
[timeweb/timesnap](https://github.com/tungs/timeweb)이 있지만, 우리는 컴포지션이
이미 `useFrame()` 순수 함수라 JS 쪽 가상화는 불필요하다 — CSS만 잡으면 된다.

**작업.**
- `scripts/render.mjs`: 스크린샷 전 훅에 `getAnimations()` 시킹 추가
- `src/preview/`: 프리뷰 스크러버도 같은 시킹을 태워 렌더와 일치시킴
- SKILL.md 함정 4를 "재구현하라"에서 "어댑터가 잡아준다, 단 △△는 예외"로 갱신

**검증.** 스피너를 넣은 테스트 컴포지션으로 `check:determinism` 2회 통과 +
서로 다른 프레임에서 위상이 실제로 전진하는지 스틸 비교. 이게 통과하기
전에는 함정 4의 기존 규칙(재구현)이 유효하다.

**주의.** `transition`은 상태 변화 트리거라 이 방식으로 안 잡힌다 — 금지
목록에 그대로 남는다. 또 `getAnimations()`가 반환하지 않는 케이스(SVG SMIL
등)는 조사 필요.

## 2. 렌더 병렬화 — 분 단위 영상 대비

**문제.** 렌더는 단일 탭 순차다 (120프레임 ≈ 13초). 분 단위 영상이면
10분대에 진입한다. README에 "필요해지면 `--range`로 나눈다"고만 적혀 있고
실행 수단이 없다.

**해법.** `--range=A-B`가 이미 있으므로 얇은 오케스트레이터만 추가한다:

- `scripts/render-parallel.mjs <Comp> <out> [--jobs=N]`
- 전체 프레임을 N개 구간으로 나눠 render.mjs를 자식 프로세스로 병렬 실행
- 구간별 mp4를 FFmpeg concat demuxer로 무손실 이어붙임 (재인코딩 없이)

**선례.** [revideo](https://github.com/redotvideo/revideo)가 Motion Canvas를
포크하며 추가한 것이 정확히 이 워커 분할 렌더 파이프라인이다.
hyperframes는 같은 구조를 Lambda까지 확장했는데, 우리 규모에서는 로컬
프로세스 분할이면 충분하다.

**검증.** `--jobs=1` 결과와 `--jobs=4` 결과의 SHA256 비교 — 병렬화가
결정론을 깨지 않는다는 것 자체를 가드로 만든다 (`check:determinism`에
병렬 케이스 추가). 구간 경계 프레임 중복/누락이 흔한 함정이다.

**시점.** 분 단위 컴포지션이 실제로 생길 때. 그 전에는 착수하지 않는다.

## 3. 모션 토큰 승격 — springs.ts의 다음 단계

**문제.** 스프링·easing·표준 지속시간이 이 레포의 `src/motion/springs.ts`에만
있다. 지금은 소비자가 이 레포 하나라 문제없지만, 다른 표면(Storybook 데모,
로보틱스 UI 전환 등)이 같은 모션 어휘를 원하는 순간 값이 복제되기 시작한다.

**해법.** 정착 프레임을 측정해 둔 현재 값들을 업스트림 lds-theme의 모션
토큰(duration/easing 계열)으로 승격하고, 이 레포는 그 토큰의 소비자가 된다.

**선례.** [Carbon의 packages/motion](https://github.com/carbon-design-system/carbon/tree/main/packages/motion)이
가장 성숙한 사례다 — productive/expressive 두 계열의 duration·easing 토큰 +
[stylelint 플러그인](https://github.com/carbon-design-system/stylelint-plugin-carbon-tokens)으로
토큰 사용을 CI에서 강제. 후자는 LDS의 `check:lds-style` 게이트 문화와 결이 같다.

**주의.** 이것은 업스트림 lk-design-system의 표면(surface baseline) 변경이라
**이 레포에서 결정할 수 없다.** lds-3d의 assets export 때와 같은 절차 —
업스트림 합의부터. 스프링 상수(damping/stiffness)는 CSS 토큰으로 표현이
안 되므로, 토큰화 대상은 duration/easing까지이고 스프링 설정 자체는
당분간 springs.ts에 남는 것이 맞다.

**시점.** 두 번째 소비자가 나타날 때. 그 전에 하면 추측 설계다.

## 4. 스킬 문서에 패턴 카탈로그 추가

**문제.** SKILL.md는 함정(하지 말 것)은 충실한데, 권장 조합(할 것)이 얇다.
"어떤 슬라이드에 어떤 등장/전환이 어울리는가"가 TitleDemo/DeckDemo 코드에
암묵적으로만 있다.

**해법.** SKILL.md 또는 `docs/patterns.md`에 소형 카탈로그를 만든다:
슬라이드 유형(텍스트/통계/사진/코드) × 권장 entrance·transition·duration 표,
그리고 근거 (예: "텍스트끼리 push" 규칙은 이미 있음 — 그 층위의 규칙을
14종 전체로 확장).

**선례.** hyperframes의 catalog(전환·오버레이·차트 블록)와 frame.md
(디자인 시스템 스펙 → 영상 컴포지션 번역 레이어). 에이전트가 조합을
추측하지 않게 하는 것이 목적이라는 점에서 우리 스킬과 같은 문제의식이다.

**검증.** 콜드 뉴커머 테스트(이미 커밋 이력에 있는 O4 리테스트 방식) —
카탈로그만 보고 새 덱을 조립할 수 있는지.

---

## 조사에서 걸러낸 것

| 후보 | 상태 | 걸러낸 이유 |
|---|---|---|
| [Remotion](https://github.com/remotion-dev/remotion) 복귀 | 56k★, BUSL | 라이선스 비용. 이미 프로토타이핑에서 결론남. API 설계 참고로만 |
| [hyperframes](https://github.com/heygen-com/hyperframes)로 교체 | 41k★, Apache-2.0 | HTML 저작 모델이라 React 컴포지션·slides-ui 재사용과 안 맞음. 어댑터·카탈로그 아이디어만 차용 (과제 1·4) |
| [Motion Canvas](https://github.com/motion-canvas/motion-canvas) / [revideo](https://github.com/redotvideo/revideo) | MIT | canvas 렌더라 LDS DOM/CSS 토큰 재사용 불가 (기존 결론 유지). revideo의 병렬 렌더 구조만 차용 (과제 2) |
| [GSAP](https://github.com/greensock/GSAP) | 무료화됨 | 오픈소스 아님 (Webflow 소유 클로즈드 소스, 경쟁 도구 제한 조항). 벽시계 기반이라 엔진 대체재도 아님 |
| [theatre.js](https://github.com/theatre-js/theatre) | 12.6k★ | 2024-08 이후 휴면. 타임라인 GUI는 프리뷰 스크러버로 충분 |
| rendiv / motionforge | <100★ | 스타·활동성 미미. 검색에 잡히지만 참고 가치 없음 |
| [editly](https://github.com/mifi/editly) | 5.5k★ | 선언적 FFmpeg 편집기 — DOM 렌더가 아니라 방향이 다름. 2025-05 이후 휴면 |
