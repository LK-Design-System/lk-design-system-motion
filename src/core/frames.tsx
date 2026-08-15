import React from 'react';

/**
 * lds-motion 엔진 — 프레임 컨텍스트.
 *
 * 원칙은 하나다: 컴포지션은 `프레임 번호 → 정지 화면`의 순수 함수다.
 * 시간은 밖(프리뷰 스크러버 또는 렌더러)에서 주입되고, 컴포넌트는
 * useFrame()으로 읽기만 한다. 벽시계(rAF, setTimeout, CSS animation)에
 * 기대는 코드는 이 계약 밖이며 렌더 결정론을 깨뜨린다.
 */

export type VideoConfig = {
	width: number;
	height: number;
	fps: number;
	durationInFrames: number;
};

export type CompositionDef = VideoConfig & {
	id: string;
	component: React.ComponentType;
};

const FrameContext = React.createContext<number>(0);
const ConfigContext = React.createContext<VideoConfig | null>(null);

export const CompositionHost: React.FC<{
	frame: number;
	config: VideoConfig;
	children: React.ReactNode;
}> = ({frame, config, children}) => (
	<ConfigContext.Provider value={config}>
		<FrameContext.Provider value={frame}>{children}</FrameContext.Provider>
	</ConfigContext.Provider>
);

/** 현재 프레임 번호. 모든 움직임은 여기서 유도한다. */
export const useFrame = (): number => React.useContext(FrameContext);

/** 컴포지션의 해상도·fps·길이. */
export const useVideoConfig = (): VideoConfig => {
	const config = React.useContext(ConfigContext);
	if (!config) {
		throw new Error('useVideoConfig()는 CompositionHost 안에서만 호출할 수 있다');
	}
	return config;
};

/** 화면을 가득 채우는 레이어 (Remotion AbsoluteFill 대응). */
export const Fill: React.FC<{
	style?: React.CSSProperties;
	children?: React.ReactNode;
}> = ({style, children}) => (
	<div
		style={{
			position: 'absolute',
			inset: 0,
			display: 'flex',
			flexDirection: 'column',
			...style,
		}}
	>
		{children}
	</div>
);
