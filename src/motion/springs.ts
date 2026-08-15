/**
 * lds-motion의 모션 토큰.
 * LDS core에는 --duration-fast/normal/slow와 --ease-in-out만 있고
 * 스프링 계약이 없다 — 영상 모션의 스프링 설정은 이 레이어가 소유한다.
 * 모든 컴포지션이 같은 설정을 공유해야 덱 전체의 움직임이 한 몸이 된다.
 */

export const springs = {
	/** 슬라이드·블록의 기본 등장 */
	entrance: {damping: 200, stiffness: 100, mass: 0.8},
	/** 부드러운 보조 요소 등장 */
	soft: {damping: 30, stiffness: 80, mass: 1},
} as const;

export const video = {
	width: 1920,
	height: 1080,
	fps: 30,
} as const;
