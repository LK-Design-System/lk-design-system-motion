import React from 'react';
import {
	CompositionHost,
	SceneEntryProvider,
	useFrame,
	useVideoConfig,
} from './frames';
import {Easing, interpolate} from './animate';

/**
 * lds-motion 엔진 — 장면 배치와 전환.
 *
 * Scene은 전역 프레임을 자기 로컬 프레임(`frame - from`)으로 다시 제공한다.
 * 그래서 장면 안의 컴포넌트는 자기가 덱 어디에 놓였는지 몰라도 되고,
 * 0부터 시작하는 자기 시간만 다루면 된다. 순수 함수 계약은 그대로다.
 *
 * 전환은 Deck이 소유한다. 들어오는 장면의 등장뿐 아니라 나가는 장면의
 * 퇴장까지 한 쌍으로 맞춰야 하기 때문에, Scene 혼자서는 결정할 수 없다.
 */

/**
 * - `none`  겹침 없이 교체
 * - `push`  들어오는 장면이 오른쪽에서 밀고 들어오며 앞 장면을 왼쪽으로 민다.
 *           내용이 겹치지 않아 LDS 슬라이드(불투명 흰 표면)에 적합하다.
 * - `fade`  크로스 디졸브. 겹치는 동안 두 장면이 동시에 보이므로 글자가
 *           서로 비친다 — 사진·도형 장면에는 맞지만 텍스트 슬라이드끼리는
 *           `push`를 쓸 것.
 */
export type Transition = 'none' | 'fade' | 'push';

type TransitionState = {type: Transition; progress: number};

const layerStyle = (
	enter: TransitionState,
	exit: TransitionState,
): React.CSSProperties => {
	let opacity = 1;
	let translateX = 0;

	if (enter.type === 'fade') opacity = enter.progress;
	if (enter.type === 'push') translateX = (1 - enter.progress) * 100;

	// 나가는 쪽: fade는 들어오는 장면이 위에서 덮으므로 그대로 두고,
	// push만 왼쪽으로 밀어낸다.
	if (exit.type === 'push') translateX = -exit.progress * 100;

	return {
		position: 'absolute',
		inset: 0,
		opacity,
		transform: translateX === 0 ? undefined : `translateX(${translateX}%)`,
	};
};

export type SceneProps = {
	/** 덱 전체 기준 시작 프레임 */
	from: number;
	/** 이 장면의 길이 */
	durationInFrames: number;
	/** 이 장면이 등장할 때의 전환 */
	enter?: {type: Transition; duration: number};
	/** 다음 장면에 밀려날 때의 전환 */
	exit?: {type: Transition; duration: number; at: number};
	children: React.ReactNode;
};

/**
 * 한 장면. 활성 구간 밖에서는 아무것도 렌더하지 않는다 —
 * 마운트 자체를 없애야 장면 수가 늘어도 프레임당 비용이 늘지 않는다.
 */
export const Scene: React.FC<SceneProps> = ({
	from,
	durationInFrames,
	enter,
	exit,
	children,
}) => {
	const frame = useFrame();
	const config = useVideoConfig();

	const local = frame - from;
	if (local < 0 || local >= durationInFrames) return null;

	const ease = Easing.easeOutQuint;
	const progressOf = (t: number, duration: number) =>
		duration > 0
			? interpolate(t, [0, duration], [0, 1], {
					extrapolateLeft: 'clamp',
					extrapolateRight: 'clamp',
					easing: ease,
				})
			: 1;

	const enterState: TransitionState = enter
		? {type: enter.type, progress: progressOf(local, enter.duration)}
		: {type: 'none', progress: 1};

	const exitState: TransitionState = exit
		? {type: exit.type, progress: progressOf(frame - exit.at, exit.duration)}
		: {type: 'none', progress: 0};

	return (
		<div data-lk-scene style={layerStyle(enterState, exitState)}>
			<CompositionHost frame={local} config={{...config, durationInFrames}}>
				<SceneEntryProvider value={enterState.type !== 'none'}>
					{children}
				</SceneEntryProvider>
			</CompositionHost>
		</div>
	);
};

export type DeckEntry = {
	/** 장면 내용 */
	element: React.ReactNode;
	/** 이 장면의 길이(프레임) */
	durationInFrames: number;
	/** 앞 장면에서 이 장면으로 넘어올 때의 전환. 첫 장면에서는 무시된다. */
	transition?: Transition;
	/** 겹침 길이(프레임). transition이 'none'이 아닐 때만 의미가 있다. */
	transitionDuration?: number;
};

type Placed = {
	entry: DeckEntry;
	from: number;
	enterType: Transition;
	enterDuration: number;
};

/** Deck과 deckDuration이 공유하는 단일 배치 규칙. */
const place = (scenes: DeckEntry[]): {placed: Placed[]; total: number} => {
	let cursor = 0;
	const placed = scenes.map((entry, i) => {
		const type = i > 0 ? (entry.transition ?? 'none') : 'none';
		const overlap = type === 'none' ? 0 : (entry.transitionDuration ?? 0);
		const from = Math.max(0, cursor - overlap);
		cursor = from + entry.durationInFrames;
		return {entry, from, enterType: type, enterDuration: overlap};
	});
	return {placed, total: cursor};
};

/**
 * 장면 목록을 순서대로 배치한다. 전환이 있는 장면은 앞 장면과 겹치도록
 * 시작 프레임을 당기므로, 덱 전체 길이는 단순 합이 아니라 겹침만큼 짧다.
 * 컴포지션 등록 시 durationInFrames에는 `deckDuration()` 값을 넣는다.
 */
export const Deck: React.FC<{scenes: DeckEntry[]}> = ({scenes}) => {
	const {placed} = place(scenes);

	return (
		<>
			{placed.map((scene, i) => {
				const next = placed[i + 1];
				return (
					<Scene
						key={i}
						from={scene.from}
						durationInFrames={scene.entry.durationInFrames}
						enter={
							scene.enterType === 'none'
								? undefined
								: {type: scene.enterType, duration: scene.enterDuration}
						}
						exit={
							next && next.enterType !== 'none'
								? {
										type: next.enterType,
										duration: next.enterDuration,
										at: next.from,
									}
								: undefined
						}
					>
						{scene.entry.element}
					</Scene>
				);
			})}
		</>
	);
};

/** Deck과 동일한 배치 규칙으로 전체 길이를 계산한다. */
export const deckDuration = (scenes: DeckEntry[]): number =>
	place(scenes).total;
