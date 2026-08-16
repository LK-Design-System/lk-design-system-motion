# Repository agent instructions

이 레포는 lds-slides-ui의 슬라이드 레이아웃을 **결정론적 MP4**로 렌더링하는 모션 레이어다. 어떤 에이전트든(Claude, Codex 등) 작업 전에 이 파일을 읽는다.

## 저작 계약 (MANDATORY)

- 슬라이드 영상·모션그래픽·덱 렌더링 작업 전에 [`.claude/skills/lds-motion/SKILL.md`](.claude/skills/lds-motion/SKILL.md)를 읽고 따른다. 스킬 디렉터리에 있지만 **도구 중립 마크다운**이며, 이 저장소의 저작 계약 정본이다 — 엔진 어휘(`useFrame`/`interpolate`/`spring`), 결정론 계약, 함정 목록이 거기 있다.
- **컴포지션은 `프레임 번호 → 정지 화면`의 순수 함수다.** `setTimeout`, `requestAnimationFrame`, `Date.now()`, `Math.random()`, CSS `transition`/`animation` 금지 — 벽시계에 기대는 순간 렌더가 비결정적이 된다.
- Remotion API 이름(`useCurrentFrame`, `AbsoluteFill`, `<Composition>` 등)을 쓰지 않는다. 이 레포의 엔진은 자체 구현(`src/core/`)이다.

## 소유권 경계

- 슬라이드의 내용·타이포·색·간격은 **lds-slides-ui / lds-core / lds-theme 소유** — 스타일을 덮어쓰지 말고 토큰을 그대로 쓴다. 시간·스케일·등장/전환 모션만 이 레포 소유다.
- 스프링 설정은 `src/motion/springs.ts` 하나에서만 온다. 컴포지션마다 임의 damping/stiffness를 만들지 않는다.
- 부족한 것이 슬라이드 레이아웃이면 lk-design-system-slides에, 토큰이면 lk-design-system에 별도 스코프로 보고한다 — 이 레포에서 우회 구현하지 않는다.

## 의존성

- LDS 패키지는 `vendor/` tarball의 `file:` 의존이다. `node_modules`나 vendor tarball 내용물을 편집하지 않는다. 업그레이드는 새 tarball을 받아 `vendor/`를 교체하고 렌더 결과를 비교하는 커밋 단위 작업이다.

## 검증

- 작업 중에는 관련 컴포지션의 프리뷰(`npm run dev`)와 타입(`npm run check:types`)으로 좁게 확인한다.
- 핸드오프 전에 `npm run check:determinism`을 돌린다 — 같은 입력이 같은 영상(해시)을 만드는지가 이 레포의 릴리스 게이트다.

## 동시 작업

- 다른 에이전트의 워크트리 변경·미푸시 커밋을 발견하면 되돌리거나 덮어쓰지 말고, 겹치지 않는 파일만 수정하며, 충돌은 보고한다.
