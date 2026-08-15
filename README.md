# lds-motion

LDS의 결정론적 모션 레이어 — lds-slides-ui의 슬라이드 레이아웃을 영상(MP4)으로
렌더링한다.

```
lds-core / lds-theme     토큰 (색·타이포·폰트·간격)
lds-slides-ui            슬라이드 레이아웃 16종 (정적)
lds-motion               시간·스케일·등장/전환 모션   ← 이 레포
```

내용·타이포·색은 디자인 시스템 소유, 움직임만 이 레포 소유다. 같은 입력은
항상 같은 영상을 만든다 (`npm run check:determinism`으로 가드).

**라이선스 비용 없음.** 엔진은 자체 구현이고 (`src/core/`, 약 450줄),
의존성은 전부 MIT/Apache다 — React, Vite, Playwright, ffmpeg-static.
Remotion을 쓰지 않는다 ([왜](#왜-remotion을-쓰지-않나)).

## 시작하기

```bash
git clone https://github.com/LK-Design-System/lk-design-system-motion.git
cd lk-design-system-motion
npm install
npm run dev
```

`npm install`이 Playwright용 Chromium(~130MB)과 FFmpeg 바이너리(~79MB)를
자동으로 받는다. 별도 설치는 없다. 프리뷰는 http://127.0.0.1:3112 —
컴포지션 선택, 프레임 스크러버, 재생.

## 렌더

```bash
node scripts/render.mjs TitleDemo out/title.mp4              # 영상
node scripts/render.mjs TitleDemo out/f60.png --frame=60     # 스틸 한 장
node scripts/render.mjs TitleDemo out/part.mp4 --range=0-59  # 구간만
npm run check:determinism                                    # 결정론 가드
```

## 새 슬라이드 만들기

`src/compositions/TitleDemo.tsx`가 레퍼런스다. 규칙은 둘 —
**`SlideStage`로 감싸고, `registry.tsx`에 등록한다:**

```tsx
import {SlideStage} from '../SlideStage';
import {StatSlide} from '@lk-design-system/lds-slides-ui';
import '../ldsStyles';

export const MyScene = () => (
  <SlideStage>
    <StatSlide {...props} />
  </SlideStage>
);
```

## 여러 슬라이드를 이어붙이기

`src/compositions/DeckDemo.tsx`가 레퍼런스다. 장면 목록을 `Deck`에 넘기면
순서대로 배치된다. 각 장면은 자기 로컬 프레임 0부터 시작하므로, 덱 어디에
놓였는지 신경 쓸 필요가 없다.

```tsx
import {Deck, deckDuration, type DeckEntry} from '../core/sequence';

export const scenes: DeckEntry[] = [
  {durationInFrames: 90, element: <SlideStage><TitleSlide … /></SlideStage>},
  {durationInFrames: 90, transition: 'push', transitionDuration: 15,
   element: <SlideStage><StatSlide … /></SlideStage>},
];

export const MyDeck = () => <Deck scenes={scenes} />;
export const myDeckDuration = deckDuration(scenes);   // registry에 이 값을 넣는다
```

전환은 장면을 겹치게 만들어서 덱 길이가 단순 합보다 짧다. 그래서
`durationInFrames`는 손으로 세지 말고 **`deckDuration()`으로 받는다.**

| 전환 | 쓰임 |
|---|---|
| `push` | 들어오는 장면이 오른쪽에서 밀고 들어온다. 내용이 겹치지 않아 **텍스트 슬라이드끼리는 이걸 쓴다** |
| `fade` | 크로스 디졸브. 겹치는 동안 두 장면이 동시에 보여 글자가 서로 비친다 — 사진·도형 장면용 |
| `none` | 겹침 없이 교체 (기본값) |

전환을 타고 들어오는 장면은 `SlideStage`의 자체 등장 모션이 자동으로 꺼진다.
전환과 등장이 두 겹으로 쌓여 뿌예지는 것을 막기 위해서다.

움직임은 `useFrame()`에서 유도한다. CSS `transition`/`animation`,
`setTimeout`, `Math.random()`은 렌더를 비결정적으로 만들어 금지다.

왜 그래야 하는지와 LDS 통합의 함정 4가지는
[.claude/skills/lds-motion/SKILL.md](.claude/skills/lds-motion/SKILL.md)에 있다.

## Claude Code와 함께 쓰기

이 레포를 clone하면 `.claude/skills/lds-motion`이 자동으로 잡힌다. "타이틀
슬라이드 하나 만들어서 MP4로 뽑아 줘"처럼 말하면 된다.

## 엔진

| API | 하는 일 |
|---|---|
| `useFrame()` | 현재 프레임 번호 |
| `useVideoConfig()` | width/height/fps/durationInFrames |
| `<Fill>` | 화면을 채우는 절대배치 레이어 |
| `interpolate(x, [in], [out], opts)` | 다중 구간 선형 보간 + clamp/easing |
| `spring({frame, fps, config})` | 감쇠 조화 진동자 해석해 (0→1) |

컴포지션은 `프레임 번호 → 정지 화면`의 순수 함수다. 렌더러는 화면을
녹화하지 않고 Playwright로 크롬을 열어 시간을 한 칸씩 밀며 프레임마다
스크린샷을 찍은 뒤 FFmpeg로 인코딩한다. 벽시계가 개입할 지점이 없어
결정론이 구조적으로 보장된다.

### 결정론의 범위

**같은 머신에서 다시 렌더하면 바이트까지 같다** — 이것이 가드가 보장하는
것이고, 실무에서 필요한 것이다.

OS가 다르면 바이트는 달라진다. 폰트 문제가 아니라(LDS가 Pretendard를
번들하고 양쪽 모두 같은 자소를 그린다) 크롬의 텍스트 래스터화 차이다 —
안티에일리어싱과 작은 글자의 advance 반올림. 눈으로는 구분되지 않는다.
바이트까지 같은 배포본이 필요하면 한 플랫폼에서 렌더한 파일을 쓴다
(CI 리눅스 산출물이 매 푸시마다 올라온다).

### 왜 Remotion을 쓰지 않나

이 파이프라인은 Remotion으로 먼저 프로토타이핑했고 잘 동작했다. 다만
Remotion은 BUSL 라이선스라 4인 이상 회사의 업무 사용에 유료 시트가 필요하다.
우리가 실제로 쓰던 기능은 프레임 컨텍스트 · interpolate/spring · 프리뷰 ·
프레임 스테핑 렌더러 넷뿐이었고, 이를 직접 구현하는 편이 쌌다. 스프링은
Remotion 코드가 아니라 감쇠 조화 진동자의 해석해로 새로 구현했다.

canvas 계열 대안(Motion Canvas, Revideo)은 MIT지만 React DOM을 렌더하지
않아 LDS 컴포넌트와 CSS 토큰을 재사용할 수 없다. 그래서 선택지가 아니었다.

## 알려진 핀

| 패키지 | 버전 | 비고 |
|---|---|---|
| lds-slides-ui | 0.1.0-alpha.1 | 레이아웃 원본 |
| lds-core / theme / product | 0.1.0-rc.4 | slides-ui의 자체 핀과 일치. 릴리스 라인(rc.69.x) 정렬은 slides-ui 업그레이드와 함께 진행 예정 |

## 라이선스

MIT.
