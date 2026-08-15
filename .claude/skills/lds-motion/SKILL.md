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
// @ts-expect-error — lds-slides-ui는 타입 선언이 없는 JS 패키지다
import {TitleSlide} from '@lk-design-system/lds-slides-ui';
import '../ldsStyles';

export const MyScene = () => (
  <SlideStage>
    <TitleSlide eyebrow="…" title="…" subtitle="…" foot="…" />
  </SlideStage>
);
```

SlideStage가 하는 일: ① 자식에 `style.transform='none'`을 주입해 자체
스케일을 끄고(SlideSurface는 `...style`을 transform 뒤에 스프레드하므로
안전), ② `useVideoConfig()` 기반 순수 계산으로 스케일을 소유한다.
만든 장면은 `src/compositions/registry.tsx`에 등록해야 프리뷰·렌더러가 본다.

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

## 알려진 상태

- vendored LDS 핀: core/theme/product **rc.4**, slides-ui **alpha.1**,
  editorial **alpha.3**. 릴리스 라인은 rc.69.x — slides-ui 정렬 전까지 rc.4 유지.
- `npm pack`은 `vendor/*.tgz`를 항상 제외한다. 그래서 slides-ui 내부의
  `file:` 참조가 깨지고, package.json의 `overrides`로 우리 vendor로 돌린다.
- 렌더는 단일 탭 순차다 (120프레임 ≈ 13초). 분 단위 영상이 필요해지면
  프레임 구간을 나눠 병렬화한다 (`--range=A-B`가 이미 있다).
