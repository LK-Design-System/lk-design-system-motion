---
name: lds-motion
description: LDS 슬라이드 레이아웃을 결정론적 영상/MP4로 렌더링할 때 사용. 슬라이드 영상, 모션그래픽, 덱 렌더링 작업 전에 로드할 것.
---

# lds-motion — LDS 슬라이드를 영상으로

이 레포는 lds-slides-ui의 정적 슬라이드 레이아웃 위에 모션을 얹어 결정론적
MP4를 뽑는다. **엔진은 자체 구현이다** (`src/core/`) — Remotion을 쓰지
않는다. 라이선스 비용이 0이어야 했고, 우리가 쓰는 기능이 좁아서 직접
만드는 편이 쌌다. Remotion API 이름을 쓰지 말 것 (`useCurrentFrame`,
`AbsoluteFill`, `<Composition>` 등) — 이 레포에는 없다.

## 엔진 (src/core/)

| 우리 것 | 하는 일 |
|---|---|
| `useFrame()` | 현재 프레임 번호. 모든 움직임은 여기서 유도한다. |
| `useVideoConfig()` | width/height/fps/durationInFrames |
| `<Fill>` | 화면을 채우는 절대배치 레이어 |
| `interpolate(x, [in], [out], opts)` | 다중 구간 선형 보간 + clamp/easing |
| `spring({frame, fps, config})` | 감쇠 조화 진동자 해석해 (0→1) |
| `<CompositionHost>` | 프레임·설정을 컨텍스트로 주입 (프리뷰/렌더러가 사용) |
| `<Scene>` / `<Deck>` / `deckDuration()` | 장면 배치와 전환 (`core/sequence.tsx`) |
| `Easing` | linear / easeOutCubic / easeInOutCubic / easeOutQuint |

**핵심 계약: 컴포지션은 `프레임 번호 → 정지 화면`의 순수 함수다.**
`setTimeout`, `requestAnimationFrame`, `Date.now()`, `Math.random()`,
CSS `transition`/`animation`, ResizeObserver 측정 — 전부 금지다. 벽시계에
기대는 순간 렌더가 비결정적이 된다.

## 소유권 경계 (바꾸지 말 것)

- 슬라이드의 내용·타이포·색·간격 → **lds-slides-ui / lds-core / lds-theme 소유.**
  스타일을 덮어쓰지 말고 토큰(`var(--...)`)을 그대로 쓴다.
- 시간·스케일·등장/전환 모션 → **이 레포 소유.**
  스프링 설정은 `src/motion/springs.ts` 하나에서만 온다. 컴포지션마다
  임의의 damping/stiffness를 새로 만들지 않는다.

## 함정 1 — 슬라이드는 반드시 SlideStage로 감싼다

SlideSurface는 1280px 논리 캔버스를 ResizeObserver + layout effect로
컨테이너에 맞춘다. 헤드리스 렌더에서 이 effect 타이밍은 보장되지 않는다.
실측: 돌면 이중 스케일(2.25×), 안 돌면 미적용.

```tsx
import {SlideStage} from '../SlideStage';
import {TitleSlide} from '@lk-design-system/lds-slides-ui';
import '../ldsStyles';

export const MyScene = () => (
  <SlideStage>
    <TitleSlide eyebrow="…" title="…" subtitle="…" foot="…" />
  </SlideStage>
);
```

`@ts-expect-error`를 붙이지 않는다. slides-ui는 자체 `.d.ts`가 없는 JS
패키지지만 `src/types/lds-slides-ui.d.ts`에 앰비언트 선언을 두었으므로
타입이 잡힌다. 습관적으로 붙이면 `check:types`가 `TS2578: Unused
'@ts-expect-error' directive`로 실패한다.

SlideStage가 하는 일: ① 자식에 `scale="none"`을 넘겨 SlideSurface의 자체
측정을 아예 끄고(slides-ui alpha.3부터의 계약), ② `useVideoConfig()` 기반
순수 계산으로 스케일을 소유한다.
만든 장면은 `src/compositions/registry.tsx`에 등록해야 프리뷰·렌더러가 본다.

**쓸 수 있는 슬라이드와 prop은 [`src/types/lds-slides-ui.d.ts`](../../../src/types/lds-slides-ui.d.ts)에 전부 있다** —
레이아웃 14종과 각 prop 시그니처의 단일 출처다. 슬라이드를 고를 때
node_modules를 뒤지지 말고 이 파일을 먼저 연다.

## 덱 만들기

`src/compositions/DeckDemo.tsx`가 레퍼런스다.

```tsx
export const scenes: DeckEntry[] = [
  {durationInFrames: 90, element: <SlideStage><TitleSlide … /></SlideStage>},
  {durationInFrames: 90, transition: 'push', transitionDuration: 15,
   element: <SlideStage><StatSlide … /></SlideStage>},
];
export const MyDeck = () => <Deck scenes={scenes} />;
export const myDeckDuration = deckDuration(scenes);
```

**텍스트 슬라이드끼리는 `push`를 쓴다.** LDS 슬라이드는 불투명한 흰 표면
(`--slides-surface`)이라 `fade`로 겹치면 두 장면의 글자가 서로 비쳐 지저분해진다.
`fade`는 사진·도형 장면용이다.

`durationInFrames`를 손으로 세지 말 것 — 전환이 장면을 겹치게 만들어 덱
길이가 단순 합보다 짧다. `deckDuration()`이 `Deck`과 같은 배치 규칙을 쓴다.

전환을 타고 들어오는 장면은 SlideStage의 자체 등장이 자동으로 꺼진다
(`useEntersViaTransition`). 전환과 등장이 두 겹으로 쌓이면 화면이 뿌예진다 —
실제로 한 번 그렇게 렌더됐다. 명시적으로 `entrance="rise"`를 주면 그 값이 이긴다.

## 함정 2 — 존재하지 않는 CSS 토큰은 조용히 실패한다

`var(--없는-토큰)`은 에러가 아니라 transparent로 떨어져 검은 화면이
비친다. 실제로 `--color-semantic-bg-normal`로 착각해 한 번 당했다 —
올바른 이름은 `--color-semantic-background-*`다:

```
--color-semantic-background-band            슬라이드 뒤 무대 배경 (기본값)
--color-semantic-background-normal-normal
--color-semantic-background-elevated-normal 슬라이드 표면(--slides-surface)
```

새 토큰을 쓰기 전에 실재하는지 확인한다:
```bash
grep -rn "--color-semantic-background" node_modules/@lk-design-system/*/tokens/
```

## 함정 3 — 스프링 설정은 정착 시간을 확인하고 고른다

`zeta = damping / (2*sqrt(stiffness*mass))`가 1보다 크면 과감쇠다. 과감쇠
설정은 컴포지션이 끝날 때까지 목표값에 도달하지 못해 슬라이드가 미묘하게
어긋난 채로 끝난다 — 실제로 `{damping:200, stiffness:100, mass:0.8}`은
프레임 119에서도 0.86에 머물렀다. `src/motion/springs.ts`의 값들은 정착
프레임을 측정해서 정한 것이다. 새로 만들 일이 있으면 반드시 측정한다.

## 함정 4 — LDS 제품 컴포넌트의 wall-clock 애니메이션

lds-core/product에는 `infinite` CSS keyframe을 쓰는 컴포넌트가 있다:
스피너(`lk-spin`, `lk-circular-spin`), 스켈레톤(`lk-skel`), indeterminate
프로그레스(`lk-prog-indet`), 상태 펄스(`lk-status-indicator-pulse`),
브랜드 웨이브(`lk-brand-wave-*`), 엘리베이터 방향(`lk-elevator-direction-*`).
이들은 렌더 프레임마다 위상이 보장되지 않는다. 영상에 쓰려면 `useFrame()`
으로 움직임을 재구현한다. slides-ui 자체는 애니메이션이 0이라 안전하다.

## 렌더러 동작 (scripts/render.mjs)

Vite 서버 기동 → Playwright 크롬이 `?comp=<id>&render=1` 로드 →
`document.fonts.ready` 대기(LDS 폰트가 폴백으로 찍히는 것 방지) →
프레임마다 `window.__lkSetFrame(n)` + double-rAF로 페인트 확정 후 스크린샷
→ FFmpeg(ffmpeg-static 번들 바이너리)로 H.264 인코딩.

화면 녹화가 아니라 시간을 수동으로 미는 방식이라 벽시계가 개입할 지점이 없다.

## 스타일 로드

CSS 임포트는 `src/ldsStyles.ts` 한 곳만 유지한다 (core → theme → slides 순).
컴포지션에서 `import '../ldsStyles'` 한 줄이면 된다.

## 검증 루프 (납품 전 필수)

```bash
node scripts/render.mjs <Comp> out/check.png --frame=<n>   # 1. 프레임 직접 확인
npm run check:determinism [Comp] [frame]                   # 2. 2회 렌더 SHA256 비교
node scripts/render.mjs <Comp> out/<name>.mp4              # 3. MP4
```

엔진(`src/core/`), SlideStage 지오메트리, 렌더러를 건드렸다면 2번은 필수다.

## 결정론의 범위 — 같은 플랫폼 안에서다

`check:determinism`이 보장하는 것은 **같은 머신에서 다시 렌더하면 바이트까지
같다**는 것이다. OS가 다르면 바이트는 달라진다.

CI에서 실측(2026-08-15): 리눅스와 윈도우의 같은 프레임을 비교하니 SHA256이
달랐다. 원인은 폰트가 아니다 — LDS가 Pretendard woff2를 번들하고 양쪽 모두
정상 로드되며, 3배 확대 비교에서 자소 형태가 동일했다. 차이는 크롬의 텍스트
래스터화다: 자소 가장자리 안티에일리어싱, 그리고 작은 글자에서 advance
반올림이 누적돼 한 줄 전체 폭이 1% 남짓 어긋난다. **눈으로는 구분되지
않는다.**

이건 브라우저로 텍스트를 그리는 모든 렌더러의 공통 성질이고 고칠 대상이
아니다. 다만:

- 결정론 가드를 "OS 무관 동일"로 오해하지 말 것. CI는 OS별로 각자 2회
  렌더해 비교한다 — 그게 맞는 검증이다.
- 바이트까지 같은 산출물이 필요하면(재현 빌드, 배포본 고정) **한 플랫폼에서
  렌더해 그 파일을 배포한다.** CI의 리눅스 산출물을 쓰면 된다.
- 동료마다 미묘하게 다른 파일이 나오는 것은 정상이다. 영상 내용은 같다.

## 알려진 상태

- vendored LDS 핀: core/theme/product **rc.69.27**, slides-ui **alpha.8**
  (2026-08-17, 위임 복귀 세대 — 위성의 손말이 표·레일이 업스트림 Table·
  Timeline 위임으로 돌아갔다. 새 tgz는 레지스트리에서 `npm pack`으로 받되,
  이 레포엔 .npmrc가 없으므로 스코프 레지스트리가 설정된 디렉터리에서 받아
  `vendor/`로 옮긴다). 정본은 이
  문서가 아니라 `package.json`과 `vendor/`의 실물 tgz다 — 어긋나 보이면
  그쪽을 믿는다. rc.4→rc.69.18 65버전 점프에서도 렌더 산출물은 바이트까지
  동일했다 — 격차는 비호환이 아니라 기록되지 않은 상태였다.
- ~~editorial~~은 없다. 2026-08-16에 slides-ui로 흡수됐고 저장소도 삭제됐다.
  export 이름은 그대로 slides-ui에서 나온다.
- 이 레포는 `private: true`다. clone해서 쓰는 도구이지 퍼블리시하는
  패키지가 아니다 — `main`·`exports`·`files`가 없어 설치할 것이 없다.
  `npm pack`이 `vendor/*.tgz`를 항상 제외하므로, 퍼블리시하는 순간
  `file:` 의존이 소비자 설치에서 해소되지 않는다. private이 그 함정을
  구조적으로 막고, 대신 clone 설치가 레지스트리 인증 없이 끝난다.
- 렌더는 단일 탭 순차다 (120프레임 ≈ 13초). 분 단위 영상이 필요해지면
  프레임 구간을 나눠 병렬화한다 (`--range=A-B`가 이미 있다).
