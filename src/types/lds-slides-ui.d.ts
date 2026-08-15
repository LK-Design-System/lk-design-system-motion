/**
 * @lk-design-system/lds-slides-ui 앰비언트 타입 선언.
 *
 * slides-ui는 타입 선언 없는 JS 패키지다(alpha 단계). 컴포지션마다
 * @ts-expect-error를 흩뿌리는 대신 여기서 한 번 선언한다 — 자동완성도 살고,
 * 슬라이드 prop을 잘못 쓰면 tsc가 잡아준다.
 *
 * 소스는 slides-ui의 `src/components/slides/*.jsx`다. 패키지를 올릴 때
 * 시그니처가 바뀌었는지 함께 확인할 것. slides-ui가 자체 .d.ts를 갖게 되면
 * 이 파일은 지운다.
 */
declare module '@lk-design-system/lds-slides-ui' {
	import type * as React from 'react';

	/** 모든 슬라이드가 SlideSurface로 내려보내는 공통 prop */
	interface SlideBase extends React.HTMLAttributes<HTMLElement> {
		style?: React.CSSProperties;
		/** 푸터 라벨 (보통 덱·팀 이름) */
		foot?: React.ReactNode;
		/** false면 푸터 스트립 자체를 없앤다 */
		footer?: boolean;
		/** 발표자 노트 — 캔버스에는 렌더되지 않는다 */
		notes?: React.ReactNode;
		/** 덱 종류 프리셋. --slides-* 토큰 값을 바꾼다. */
		preset?: 'keynote' | 'briefing';
		safeArea?: boolean;
	}

	export interface Figure {
		value: React.ReactNode;
		unit?: React.ReactNode;
		label?: React.ReactNode;
		claim?: React.ReactNode;
		/** 덱당 하나만 강조된다 — 먼저 선언한 것이 가져간다 */
		emphasis?: boolean;
	}

	export const SlideSurface: React.FC<SlideBase & {children?: React.ReactNode}>;

	export const TitleSlide: React.FC<
		SlideBase & {
			eyebrow?: React.ReactNode;
			title?: React.ReactNode;
			subtitle?: React.ReactNode;
		}
	>;

	export const SectionSlide: React.FC<
		SlideBase & {
			index?: number | string;
			title?: React.ReactNode;
			subtitle?: React.ReactNode;
		}
	>;

	export const ContentSlide: React.FC<
		SlideBase & {
			eyebrow?: React.ReactNode;
			title?: React.ReactNode;
			governing?: React.ReactNode;
			children?: React.ReactNode;
		}
	>;

	export const StatSlide: React.FC<
		SlideBase & {
			eyebrow?: React.ReactNode;
			title?: React.ReactNode;
			figures?: Figure[];
			source?: React.ReactNode;
		}
	>;

	export const StatementSlide: React.FC<
		SlideBase & {
			eyebrow?: React.ReactNode;
			statement?: React.ReactNode;
			attribution?: React.ReactNode;
		}
	>;

	export const SplitSlide: React.FC<
		SlideBase & {
			ratio?: string;
			left?: React.ReactNode;
			right?: React.ReactNode;
		}
	>;

	export const CodeSlide: React.FC<
		SlideBase & {
			eyebrow?: React.ReactNode;
			title?: React.ReactNode;
			governing?: React.ReactNode;
			code?: string;
			caption?: React.ReactNode;
			/** 강조할 1-based 줄 번호 */
			highlight?: number[];
		}
	>;

	export const CompareSlide: React.FC<
		SlideBase & {
			eyebrow?: React.ReactNode;
			title?: React.ReactNode;
			governing?: React.ReactNode;
			criteria?: unknown[];
			options?: unknown[];
			recommendation?: React.ReactNode;
			caption?: React.ReactNode;
			source?: React.ReactNode;
		}
	>;

	export const FigureSlide: React.FC<
		SlideBase & {
			eyebrow?: React.ReactNode;
			title?: React.ReactNode;
			governing?: React.ReactNode;
			annotations?: unknown[];
			caption?: React.ReactNode;
			source?: React.ReactNode;
			children?: React.ReactNode;
		}
	>;

	export const ImageSlide: React.FC<
		SlideBase & {
			eyebrow?: React.ReactNode;
			title?: React.ReactNode;
			governing?: React.ReactNode;
			src?: string;
			alt?: string;
			caption?: React.ReactNode;
			source?: React.ReactNode;
			aspect?: string;
			fit?: 'cover' | 'contain';
			bleed?: boolean;
		}
	>;

	export const AgendaSlide: React.FC<
		SlideBase & {
			title?: React.ReactNode;
			items?: unknown[];
			current?: number;
		}
	>;

	export const RoadmapSlide: React.FC<
		SlideBase & {
			eyebrow?: React.ReactNode;
			title?: React.ReactNode;
			governing?: React.ReactNode;
			phases?: unknown[];
			source?: React.ReactNode;
		}
	>;

	export const AssessmentSlide: React.FC<
		SlideBase & {
			eyebrow?: React.ReactNode;
			title?: React.ReactNode;
			governing?: React.ReactNode;
			metrics?: unknown[];
			caption?: React.ReactNode;
			source?: React.ReactNode;
		}
	>;

	export const EndSlide: React.FC<
		SlideBase & {
			message?: React.ReactNode;
			contact?: React.ReactNode;
		}
	>;

	export const Fit: React.FC<SlideBase & {children?: React.ReactNode}>;

	export const Step: React.FC<
		SlideBase & {at?: number; as?: React.ElementType; children?: React.ReactNode}
	>;

	// DeckViewer / PresenterView는 화면용 인터랙티브 컴포넌트다.
	// 영상 렌더에는 쓰지 않는다 (키보드·타이머에 의존한다).
	export const DeckViewer: React.FC<Record<string, unknown>>;
	export const PresenterView: React.FC<Record<string, unknown>>;
}
