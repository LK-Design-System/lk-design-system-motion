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
- 같은 입력이 같은 영상(해시)을 만드는 결정론 검증은 릴리스 게이트다. exact-SHA 자동 CI 증거를 재사용하며, 핸드오프만을 이유로 개발 PC에서 전체 `check:determinism`을 중복 실행하지 않는다.

## 동시 작업

- 다른 에이전트의 워크트리 변경·미푸시 커밋을 발견하면 되돌리거나 덮어쓰지 말고, 겹치지 않는 파일만 수정하며, 충돌은 보고한다.

## CI·릴리스 실행 호스트 (필수)

- 다른 PC에서 이 저장소를 열거나 clone해도 그 PC가 CI·릴리스 실행 호스트가 되지 않는다. 개발 PC는 소스 편집, 로컬 미리보기와 변경 범위의 빠른 검사만 수행한다. 작업 종료만을 이유로 전체 suite·Storybook sweep·전체 영상 렌더·패키지 pack을 로컬에서 실행하지 않는다.
- LDS 시리즈의 패키지 릴리스·발행 준비는 **server04의 승인·자격검증된 격리 VM**에서 수행한다(2026-10-08 소유자 결정). server04 호스트에서 직접 빌드하지 않는다. 저장소별 selected-repo/workflow 권한과 별도 runner 등록·디스크·최소권한 credential을 유지하며 Portal VM/runner를 재사용하지 않는다.
- 기존 자동 CI·Pages·교차 OS 검증의 실제 실행 경로는 아래 현행 표와 workflow가 정본이다. 이 지침을 추가했다고 runner 이관이 완료된 것은 아니다. 기존 Windows 검증을 Linux로 대체하거나 runner를 새로 등록하는 것은 별도 승인·자격검증 없이 수행하지 않는다. 공개 저장소의 표준 GitHub-hosted runner를 유료 runner로 오인하지 않는다.
- 정확한 source SHA의 자동 CI 결과를 재사용한다. 전체 검증은 기존 승인된 CI 또는 자격검증된 server04 릴리스 VM에 맡기며 로컬 전체 검증이나 수동 dispatch로 중복하지 않는다. 전체 검증이 필요한 변경인데 승인된 실행 환경이 없으면 `release_environment_unavailable`로 보고하고 멈춘다. 현재 PC, aipc1, 노트북, server02로 fallback하지 않는다.
- 새 PC의 누락된 VM·runner·SSH 설정은 자동 생성/등록/credential 복사의 근거가 아니다. 등록 상태와 host identity를 먼저 조회하고 기존 승인 범위 안에서만 진행한다. 편집·push 승인은 태그 push, 패키지 발행, 제품 배포, 서버 변경 승인이 아니다.
- 빌드·발행을 시작한 경우 정확한 SHA/run을 종료까지 감시하고 실패 원인을 비밀값 없이 보고한다. 무관한 dirty 작업과 타인 배포를 보존한다.
- 공통 절차: [LDS 실행 호스트 정책](https://github.com/LK-Design-System/lk-design-system/blob/main/docs/OPERATIONS.md#execution-host-policy). 형제 checkout이 없는 단독 clone에서도 이 원격 문서를 읽을 수 있다.
- 저장소 규칙을 수정할 때 `AGENTS.md`와 `CLAUDE.md`를 함께 갱신한다.

### 이 저장소의 현행 실행 경로

cold-clone CI는 GitHub-hosted Ubuntu/Windows의 결정론·MP4 검증이다. 개발 PC의 해당 컴포지션 미리보기와 구분한다. 전용 패키지 발행 workflow/runner는 구성되어 있지 않다.
