import type {CompositionDef} from '../core/frames';
import {video} from '../motion/springs';
import {TitleDemo} from './TitleDemo';

/**
 * 컴포지션 레지스트리 — 프리뷰와 렌더러가 공유하는 단일 목록.
 * 새 장면을 만들면 여기에 등록한다.
 */
export const compositions: CompositionDef[] = [
	{
		id: 'TitleDemo',
		component: TitleDemo,
		durationInFrames: 120,
		...video,
	},
];

export const findComposition = (id: string | null): CompositionDef => {
	const found = compositions.find((c) => c.id === id);
	if (!found) {
		if (id) {
			throw new Error(
				`알 수 없는 컴포지션 "${id}". 등록된 것: ${compositions
					.map((c) => c.id)
					.join(', ')}`,
			);
		}
		return compositions[0];
	}
	return found;
};
