import React from 'react';
import {
	Fill,
	useEntersViaTransition,
	useFrame,
	useVideoConfig,
} from './core/frames';
import {interpolate, spring} from './core/animate';
import {springs} from './motion/springs';

/**
 * SlideStage — LDS 슬라이드 레이아웃을 영상 프레임에 결정론적으로 올리는 무대.
 *
 * lds-slides-ui의 SlideSurface는 1280px 논리 캔버스를 ResizeObserver로
 * 컨테이너에 맞춘다. 헤드리스 렌더에서는 그 layout effect가 스크린샷 전에
 * 돈다는 보장이 없다 — 실측 결과 돌면 이중 스케일(2.25×), 안 돌면 미적용이
 * 나왔다. slides-ui alpha.3부터는 `scale="none"`이 계약이라, 자체 측정을
 * 아예 건너뛴다. 그 전에는 여기서 style.transform을 덮어써 강제로 껐다.
 *
 * 스케일은 useVideoConfig() 기반 순수 계산으로 이 컴포넌트가 소유한다.
 * 슬라이드의 내용·타이포·색·간격은 전부 LDS 소유이고, 여기는 시간과
 * 지오메트리만 소유한다.
 */

/** slides-ui 논리 캔버스 크기 (--slides-canvas-width, --slides-aspect 16:9) */
export const SLIDE_CANVAS = {width: 1280, height: 720} as const;

export type SlideStageProps = {
	/** lds-slides-ui 레이아웃 엘리먼트 하나 (TitleSlide, StatSlide, …) */
	children: React.ReactElement<{scale?: 'auto' | 'none'}>;
	/**
	 * 등장 모션. 'rise'는 스프링 상승 + 페이드인, 'none'은 정적.
	 *
	 * 생략하면 문맥에 따라 정해진다 — 덱에서 전환(push/fade)을 타고 들어오는
	 * 장면은 'none'(전환과 등장이 겹쳐 뿌예지는 것을 막는다), 그 외에는
	 * 'rise'. 명시하면 그 값이 항상 이긴다.
	 */
	entrance?: 'rise' | 'none';
	/** 등장 시작 프레임 오프셋 */
	entranceDelay?: number;
	/**
	 * 무대 배경 — 슬라이드 표면 뒤로 보이는 면.
	 * 기본은 LDS 시맨틱 배경 토큰. 존재하지 않는 토큰을 넘기면 CSS가
	 * 조용히 transparent로 떨어져 검은 화면이 비치므로, 반드시
	 * lds-theme에 실재하는 이름을 쓸 것 (--color-semantic-background-*).
	 */
	background?: string;
};

export const SlideStage: React.FC<SlideStageProps> = ({
	children,
	entrance,
	entranceDelay = 0,
	background = 'var(--color-semantic-background-band)',
}) => {
	const frame = useFrame();
	const {fps, width, height} = useVideoConfig();
	const viaTransition = useEntersViaTransition();
	const resolvedEntrance = entrance ?? (viaTransition ? 'none' : 'rise');

	const fitScale = Math.min(
		width / SLIDE_CANVAS.width,
		height / SLIDE_CANVAS.height,
	);

	const t = frame - entranceDelay;
	const active = resolvedEntrance !== 'none';
	const entranceSpring = active
		? spring({frame: t, fps, config: springs.entrance})
		: 1;
	const opacity = active
		? interpolate(t, [0, 18], [0, 1], {
				extrapolateLeft: 'clamp',
				extrapolateRight: 'clamp',
			})
		: 1;
	const translateY = interpolate(entranceSpring, [0, 1], [40, 0]);

	// 자체 스케일 무력화 — SlideStage 결정론의 핵심.
	// slides-ui alpha.3의 계약이라, 측정 자체가 일어나지 않는다.
	const slide = React.cloneElement(children, {scale: 'none'});

	return (
		<Fill style={{backgroundColor: background}}>
			<Fill style={{justifyContent: 'center', alignItems: 'center'}}>
				<div
					style={{
						width: SLIDE_CANVAS.width,
						height: SLIDE_CANVAS.height,
						transform: `scale(${fitScale}) translateY(${translateY / fitScale}px)`,
						opacity,
					}}
				>
					{slide}
				</div>
			</Fill>
		</Fill>
	);
};
