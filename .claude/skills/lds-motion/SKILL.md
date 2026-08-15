---
name: lds-motion
description: LDS 슬라이드 레이아웃을 Remotion으로 결정론적 영상/MP4로 렌더링할 때 사용. 슬라이드 영상, 모션그래픽, 덱 렌더링 작업 전에 로드할 것.
---

# lds-motion — LDS × Remotion 통합 계약

이 레포는 lds-slides-ui의 정적 슬라이드 레이아웃 위에 Remotion 모션을 얹어
결정론적 MP4를 뽑는다. 범용 Remotion 작법은 `remotion-markup` /
`remotion-best-practices` 스킬을 따르고, 이 문서는 **LDS 통합에서만 생기는
계약**을 다룬다.

## 소유권 경계 (바꾸지 말 것)

- 슬라이드의 내용·타이포·색·간격 → **lds-slides-ui / lds-core / lds-theme 소유.**
  스타일을 덮어쓰지 말고 토큰(`var(--...)`)을 그대로 쓴다.
- 시간·스케일·등장/전환 모션 → **이 레포 소유.**
  스프링 설정은 `src/motion/springs.ts` 하나에서만 온다. 컴포지션마다
  임의의 damping/stiffness를 새로 만들지 않는다.

## 함정 1 — LDS 패키지는 raw JSX로 배포된다

`@lk-design-system/*`의 소스는 트랜스파일 없는 `.jsx`다. Remotion 기본
웹팩은 node_modules의 `.jsx`를 처리하지 않는다. 해법은 이미
`remotion.config.ts`의 esbuild 룰에 있다 — **지우지 말 것.**
`Module parse failed: Unexpected token ... <` 에러가 나오면 이 룰부터 확인.

## 함정 2 — SlideSurface의 자체 스케일은 비결정적이다

SlideSurface는 1280px 논리 캔버스를 ResizeObserver + layout effect로
컨테이너에 맞춘다. 헤드리스 렌더에서 이 effect 타이밍은 보장되지 않는다.
실측: 돌면 이중 스케일(2.25×), 안 돌면 미적용.

**규칙: 슬라이드를 프레임에 직접 놓지 말고 반드시 `SlideStage`로 감싼다.**

```tsx
import {SlideStage} from '../SlideStage';
import {TitleSlide} from '@lk-design-system/lds-slides-ui';
import '../ldsStyles';

<SlideStage>
  <TitleSlide eyebrow="…" title="…" subtitle="…" foot="…" />
</SlideStage>
```

SlideStage가 하는 일: ① 자식에 `style.transform='none'`을 주입해 자체
스케일을 끄고(SlideSurface는 `...style`을 transform 뒤에 스프레드하므로
안전), ② `useVideoConfig()` 기반 순수 계산으로 스케일을 소유한다.
같은 이유로 **ResizeObserver·useLayoutEffect 측정·`Math.random()`·
`Date.now()`에 기대는 코드를 컴포지션에 넣지 않는다.**

## 함정 3 — LDS 제품 컴포넌트의 wall-clock 애니메이션

lds-core/product에는 `infinite` CSS keyframe을 쓰는 컴포넌트가 있다:
스피너(`lk-spin`, `lk-circular-spin`), 스켈레톤(`lk-skel`), indeterminate
프로그레스(`lk-prog-indet`), 상태 펄스(`lk-status-indicator-pulse`),
브랜드 웨이브(`lk-brand-wave-*`), 엘리베이터 방향(`lk-elevator-direction-*`).
이들은 렌더 프레임마다 위상이 보장되지 않는다. 영상에 쓰려면
`useCurrentFrame()`으로 움직임을 재구현한다. slides-ui 자체는 애니메이션이
0이라 안전하다.

## 스타일 로드

CSS 임포트는 `src/ldsStyles.ts` 한 곳만 유지한다 (core → theme → slides 순).
컴포지션에서 `import '../ldsStyles'` 한 줄이면 된다.

## 검증 루프 (납품 전 필수)

1. `npx remotion still <Comp> out/check.png --frame=<n>` → 프레임을 직접 확인
2. 지오메트리·웹팩·스케일을 건드렸다면: `npm run check:determinism [Comp] [frame]`
   — 같은 프레임 2회 렌더 SHA256 비교
3. `npx remotion render <Comp> out/<name>.mp4`

## 알려진 상태

- vendored LDS 핀: core/theme **rc.4**, slides-ui **alpha.1** (slides-ui의
  자체 핀과 일치). 릴리스 라인은 rc.69.x — slides-ui 정렬 전까지 rc.4 유지.
- FFmpeg 별도 설치 불필요 (Remotion 4 내장). Chrome Headless Shell은 첫
  렌더 때 자동 다운로드.
