import React from 'react';
import {
	AbsoluteFill,
	interpolate,
	spring,
	useCurrentFrame,
	useVideoConfig,
} from 'remotion';
import {springs} from './motion/springs';

/**
 * SlideStage — LDS 슬라이드 레이아웃을 영상 프레임에 결정론적으로 올리는 무대.
 *
 * lds-slides-ui의 SlideSurface는 1280px 논리 캔버스를 ResizeObserver로
 * 컨테이너에 맞춘다. 헤드리스 렌더에서는 그 layout effect가 스크린샷 전에
 * 돈다는 보장이 없다 — 실측 결과 돌면 이중 스케일(2.25×), 안 돌면 미적용이
 * 나왔다. 그래서 이 컴포넌트가 규칙이다:
 *
 *   1. 자식 슬라이드에 style.transform='none'을 주입해 자체 스케일을 끈다.
 *      (SlideSurface는 ...style을 transform 뒤에 스프레드하므로 안전하다.)
 *   2. 스케일은 useVideoConfig() 기반 순수 계산으로 이 컴포넌트가 소유한다.
 *
 * 슬라이드의 내용·타이포·색·간격은 전부 LDS 소유이고, 여기는 시간과
 * 지오메트리만 소유한다.
 */

/** slides-ui 논리 캔버스 크기 (--slides-canvas-width, --slides-aspect 16:9) */
export const SLIDE_CANVAS = {width: 1280, height: 720} as const;

export type SlideStageProps = {
	/** lds-slides-ui 레이아웃 엘리먼트 하나 (TitleSlide, StatSlide, …) */
	children: React.ReactElement<{style?: React.CSSProperties}>;
	/**
	 * 등장 모션. 'rise'는 스프링 상승 + 페이드인, 'none'은 정적.
	 * 기본값 'rise'.
	 */
	entrance?: 'rise' | 'none';
	/** 등장 시작 프레임 오프셋 (Sequence 없이 지연시킬 때) */
	entranceDelay?: number;
	/** 무대 배경. 기본은 LDS 시맨틱 배경 토큰. */
	background?: string;
};

export const SlideStage: React.FC<SlideStageProps> = ({
	children,
	entrance = 'rise',
	entranceDelay = 0,
	background = 'var(--color-semantic-bg-normal)',
}) => {
	const frame = useCurrentFrame();
	const {fps, width, height} = useVideoConfig();

	const fitScale = Math.min(
		width / SLIDE_CANVAS.width,
		height / SLIDE_CANVAS.height,
	);

	const t = frame - entranceDelay;
	const active = entrance !== 'none';
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
	const slide = React.cloneElement(children, {
		style: {...children.props.style, transform: 'none'},
	});

	return (
		<AbsoluteFill style={{backgroundColor: background}}>
			<AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
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
			</AbsoluteFill>
		</AbsoluteFill>
	);
};
