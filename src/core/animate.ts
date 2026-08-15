/**
 * lds-motion 엔진 — 애니메이션 수학.
 * 전부 순수 함수: 같은 입력은 항상 같은 값을 낸다. 상태·시계 없음.
 */

export type InterpolateOptions = {
	extrapolateLeft?: 'extend' | 'clamp';
	extrapolateRight?: 'extend' | 'clamp';
	easing?: (t: number) => number;
};

/**
 * 프레임(또는 임의 입력)을 출력 범위로 선형 변환한다.
 * 다중 구간 지원: interpolate(f, [0, 10, 20], [0, 1, 0.5])
 */
export const interpolate = (
	input: number,
	inputRange: readonly number[],
	outputRange: readonly number[],
	options: InterpolateOptions = {},
): number => {
	if (inputRange.length !== outputRange.length || inputRange.length < 2) {
		throw new Error('inputRange와 outputRange는 길이가 같고 2 이상이어야 한다');
	}
	const {extrapolateLeft = 'extend', extrapolateRight = 'extend', easing} =
		options;

	if (input <= inputRange[0]) {
		if (extrapolateLeft === 'clamp') return outputRange[0];
	}
	if (input >= inputRange[inputRange.length - 1]) {
		if (extrapolateRight === 'clamp') return outputRange[outputRange.length - 1];
	}

	// 해당 구간 탐색 (범위 밖이면 양끝 구간으로 외삽)
	let i = 0;
	while (i < inputRange.length - 2 && input >= inputRange[i + 1]) i++;

	const [x0, x1] = [inputRange[i], inputRange[i + 1]];
	const [y0, y1] = [outputRange[i], outputRange[i + 1]];
	let t = x1 === x0 ? 0 : (input - x0) / (x1 - x0);
	if (easing) t = easing(Math.min(1, Math.max(0, t)));
	return y0 + (y1 - y0) * t;
};

/** 표준 이징 곡선. interpolate의 easing 옵션에 넘긴다. */
export const Easing = {
	linear: (t: number) => t,
	easeOutCubic: (t: number) => 1 - Math.pow(1 - t, 3),
	easeInOutCubic: (t: number) =>
		t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
	/** 슬라이드 전환용 — 빠르게 출발해 부드럽게 멈춘다 */
	easeOutQuint: (t: number) => 1 - Math.pow(1 - t, 5),
} as const;

export type SpringConfig = {
	damping: number;
	stiffness: number;
	mass: number;
};

/**
 * 감쇠 조화 진동자의 해석해 — 0에서 1로 가는 스프링.
 * 시뮬레이션 루프 없이 닫힌 식으로 계산하므로 프레임마다 정확히 재현된다.
 */
export const spring = ({
	frame,
	fps,
	config,
}: {
	frame: number;
	fps: number;
	config: SpringConfig;
}): number => {
	if (frame <= 0) return 0;
	const t = frame / fps;
	const {damping: c, stiffness: k, mass: m} = config;
	const w0 = Math.sqrt(k / m); // 고유 진동수
	const zeta = c / (2 * Math.sqrt(k * m)); // 감쇠비

	if (zeta < 1) {
		// 미감쇠: 오버슈트 후 수렴
		const wd = w0 * Math.sqrt(1 - zeta * zeta);
		return (
			1 -
			Math.exp(-zeta * w0 * t) *
				(Math.cos(wd * t) + ((zeta * w0) / wd) * Math.sin(wd * t))
		);
	}
	if (zeta === 1) {
		// 임계 감쇠
		return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
	}
	// 과감쇠: 오버슈트 없이 수렴
	const s = Math.sqrt(zeta * zeta - 1);
	const r1 = -w0 * (zeta - s);
	const r2 = -w0 * (zeta + s);
	const a = r2 / (r2 - r1);
	const b = -r1 / (r2 - r1);
	return 1 - (a * Math.exp(r1 * t) + b * Math.exp(r2 * t));
};
