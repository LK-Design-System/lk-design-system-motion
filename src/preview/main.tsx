import React from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {CompositionHost, type CompositionDef} from '../core/frames';
import {compositions, findComposition} from '../compositions/registry';
import '../ldsStyles';

/**
 * lds-motion 프리뷰 / 렌더 호스트.
 *
 * 한 페이지가 두 가지로 동작한다:
 *  - 프리뷰(기본): 컴포지션 선택 + 프레임 스크러버 + 재생. 사람이 보는 화면.
 *  - 렌더(`?render=1`): 컨트롤 없이 컴포지션만 실제 해상도로. 렌더러가
 *    `window.__lkSetFrame(n)`으로 시간을 한 칸씩 밀며 스크린샷을 찍는다.
 *
 * 재생용 rAF는 프리뷰 전용이다. 렌더 경로는 프레임을 외부에서 주입받으므로
 * 벽시계가 개입할 지점이 없다.
 */

declare global {
	interface Window {
		__lkSetFrame: (frame: number) => void;
		__lkComposition: {
			id: string;
			width: number;
			height: number;
			fps: number;
			durationInFrames: number;
		};
		__lkReady: boolean;
	}
}

const params = new URLSearchParams(location.search);
const renderMode = params.get('render') === '1';
document.body.dataset.render = renderMode ? '1' : '0';

const Stage: React.FC<{comp: CompositionDef; frame: number}> = ({
	comp,
	frame,
}) => {
	const Component = comp.component;
	return (
		<div
			data-lk-stage
			style={{
				position: 'relative',
				width: comp.width,
				height: comp.height,
				overflow: 'hidden',
			}}
		>
			<CompositionHost
				frame={frame}
				config={{
					width: comp.width,
					height: comp.height,
					fps: comp.fps,
					durationInFrames: comp.durationInFrames,
				}}
			>
				<Component />
			</CompositionHost>
		</div>
	);
};

const RenderHost: React.FC = () => {
	const comp = findComposition(params.get('comp'));
	const [frame, setFrame] = React.useState(Number(params.get('frame') ?? 0));

	React.useEffect(() => {
		// flushSync로 setFrame이 반환되는 시점에 DOM이 이미 갱신돼 있게 한다.
		// (렌더러는 그 뒤 페인트만 기다리면 된다.)
		window.__lkSetFrame = (n) => flushSync(() => setFrame(n));
		window.__lkComposition = {
			id: comp.id,
			width: comp.width,
			height: comp.height,
			fps: comp.fps,
			durationInFrames: comp.durationInFrames,
		};
		window.__lkReady = true;
	}, [comp]);

	return <Stage comp={comp} frame={frame} />;
};

const Preview: React.FC = () => {
	const [id, setId] = React.useState(findComposition(params.get('comp')).id);
	const [frame, setFrame] = React.useState(0);
	const [playing, setPlaying] = React.useState(false);
	const comp = findComposition(id);

	// 재생은 프리뷰 전용 — 실제 시계로 프레임을 굴린다.
	React.useEffect(() => {
		if (!playing) return undefined;
		let raf = 0;
		let start: number | null = null;
		const startFrame = frame;
		const tick = (now: number) => {
			if (start === null) start = now;
			const elapsed = ((now - start) / 1000) * comp.fps;
			const next = Math.floor(startFrame + elapsed) % comp.durationInFrames;
			setFrame(next);
			raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [playing, comp]);

	// 스테이지를 화면에 맞춰 축소해서 보여준다 (프리뷰 표시용 스케일).
	const [box, setBox] = React.useState({w: window.innerWidth, h: window.innerHeight});
	React.useEffect(() => {
		const onResize = () => setBox({w: window.innerWidth, h: window.innerHeight});
		window.addEventListener('resize', onResize);
		return () => window.removeEventListener('resize', onResize);
	}, []);
	const scale = Math.min(
		(box.w - 64) / comp.width,
		(box.h - 160) / comp.height,
		1,
	);

	const label = `${String(frame).padStart(3, '0')} / ${comp.durationInFrames} · ${(
		frame / comp.fps
	).toFixed(2)}s`;

	return (
		<div
			style={{
				minHeight: '100vh',
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				gap: 24,
				color: '#e6e6e9',
				fontFamily: 'system-ui, sans-serif',
				padding: 24,
				boxSizing: 'border-box',
			}}
		>
			<div
				style={{
					width: comp.width * scale,
					height: comp.height * scale,
					overflow: 'hidden',
					boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
				}}
			>
				<div style={{transform: `scale(${scale})`, transformOrigin: 'top left'}}>
					<Stage comp={comp} frame={frame} />
				</div>
			</div>

			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					gap: 16,
					width: Math.min(comp.width * scale, box.w - 64),
				}}
			>
				<select
					value={id}
					onChange={(e) => {
						setId(e.target.value);
						setFrame(0);
						setPlaying(false);
					}}
					style={{padding: '6px 10px', fontSize: 14}}
				>
					{compositions.map((c) => (
						<option key={c.id} value={c.id}>
							{c.id}
						</option>
					))}
				</select>
				<button
					onClick={() => setPlaying((p) => !p)}
					style={{padding: '6px 14px', fontSize: 14, minWidth: 72}}
				>
					{playing ? '⏸ 정지' : '▶ 재생'}
				</button>
				<input
					type="range"
					min={0}
					max={comp.durationInFrames - 1}
					value={frame}
					onChange={(e) => {
						setPlaying(false);
						setFrame(Number(e.target.value));
					}}
					style={{flex: 1}}
				/>
				<code style={{fontSize: 13, minWidth: 150, textAlign: 'right'}}>
					{label}
				</code>
			</div>
		</div>
	);
};

// StrictMode는 쓰지 않는다 — 렌더 경로에서 이펙트/렌더가 두 번 도는 것은
// 결과에 영향은 없지만 프레임당 비용을 그대로 두 배로 만든다.
createRoot(document.getElementById('root')!).render(
	renderMode ? <RenderHost /> : <Preview />,
);
