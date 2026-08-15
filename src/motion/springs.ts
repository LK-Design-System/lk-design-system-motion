/**
 * lds-motion의 모션 토큰.
 *
 * LDS core에는 --duration-fast/normal/slow와 --ease-in-out만 있고 스프링
 * 계약이 없다 — 영상 모션의 스프링 설정은 이 레이어가 소유한다. 모든
 * 컴포지션이 같은 설정을 공유해야 덱 전체의 움직임이 한 몸이 된다.
 *
 * 설정은 감쇠 조화 진동자 파라미터다 (core/animate.ts의 spring 참고):
 *   zeta = damping / (2 * sqrt(stiffness * mass))
 *   zeta < 1 오버슈트, = 1 임계감쇠, > 1 과감쇠(느림)
 *
 * 정착 시간을 반드시 확인하고 고를 것 — 과감쇠 설정은 컴포지션이 끝날
 * 때까지 목표값에 도달하지 못해 슬라이드가 미묘하게 어긋난 채로 끝난다.
 * 아래 값은 30fps 기준 정착 프레임을 측정해서 정했다.
 */

export const springs = {
	/** 슬라이드·블록의 기본 등장. 임계감쇠, 오버슈트 없음, 17프레임(0.57s)에 정착. */
	entrance: {damping: 26, stiffness: 170, mass: 1},
	/** 강조용 등장. 5% 오버슈트 후 16프레임에 정착. */
	pop: {damping: 18, stiffness: 170, mass: 1},
	/** 부드러운 보조 요소 등장. 27프레임(0.9s)에 정착. */
	soft: {damping: 20, stiffness: 90, mass: 1},
} as const;

export const video = {
	width: 1920,
	height: 1080,
	fps: 30,
} as const;
