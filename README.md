# lds-motion

LDS의 결정론적 모션 레이어 — lds-slides-ui의 슬라이드 레이아웃을 Remotion으로
영상(MP4)에 렌더링한다.

```
lds-core / lds-theme     토큰 (색·타이포·폰트·간격)
lds-slides-ui            슬라이드 레이아웃 16종 (정적)
lds-motion               시간·스케일·등장/전환 모션   ← 이 레포
```

내용·타이포·색은 디자인 시스템 소유, 움직임만 이 레포 소유다. 같은 입력은
항상 같은 영상을 만든다 (`npm run check:determinism`으로 가드).

## 시작하기

```bash
git clone https://github.com/LK-Design-System/lk-design-system-motion.git
cd lk-design-system-motion
npm install
npm run dev          # Remotion Studio (localhost:3112)
```

LDS 의존성은 `vendor/`에 tgz로 고정돼 있어 별도 레지스트리 인증이 필요 없다.
FFmpeg 설치도 필요 없다 (Remotion 4 내장). 첫 렌더 때 Chrome Headless
Shell(~113MB)을 자동으로 받는다.

## 렌더

```bash
npx remotion render TitleDemo out/title.mp4      # 영상
npx remotion still TitleDemo out/f60.png --frame=60   # 스틸 한 장
npm run check:determinism                        # 결정론 가드
```

## 새 슬라이드 만들기

`src/compositions/TitleDemo.tsx`가 레퍼런스다. 규칙은 하나 —
**슬라이드는 반드시 `SlideStage`로 감싼다:**

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

왜 그래야 하는지(SlideSurface 자체 스케일의 비결정성), LDS 통합의 함정
전체는 [.claude/skills/lds-motion/SKILL.md](.claude/skills/lds-motion/SKILL.md)에
있다.

## Claude Code와 함께 쓰기

이 레포를 clone하면 `.claude/skills/`의 스킬이 자동으로 잡힌다:

- **lds-motion** — LDS 통합 계약 (함정 3개, SlideStage, 검증 루프)
- **remotion-*** — Remotion 공식 에이전트 스킬 (마크업·렌더·스튜디오 등)

"타이틀 슬라이드 하나 만들어서 MP4로 뽑아 줘"처럼 말하면 된다.

## 알려진 핀

| 패키지 | 버전 | 비고 |
|---|---|---|
| lds-slides-ui | 0.1.0-alpha.1 | 레이아웃 원본 |
| lds-core / lds-theme | 0.1.0-rc.4 | slides-ui의 자체 핀과 일치. 릴리스 라인(rc.69.x) 정렬은 slides-ui 업그레이드와 함께 진행 예정 |

## 라이선스

이 레포 자체는 MIT. **Remotion은 별도 라이선스**다 — 4인 이상 회사의
업무 사용은 [Remotion Company License](https://www.remotion.pro/license)가
필요하다. 사내 배포 전 확인할 것.
