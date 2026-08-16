import React from 'react';
import {TitleSlide} from '@lk-design-system/lds-slides-ui';
import {SlideStage} from '../SlideStage';
import '../ldsStyles';

/** SlideStage 파이프라인의 레퍼런스 컴포지션. */
export const TitleDemo: React.FC = () => {
	return (
		<SlideStage>
			<TitleSlide
				eyebrow="LK ROBOTICS"
				title="LDS × Motion"
				subtitle="디자인 시스템의 슬라이드 레이아웃을 결정론적 영상으로 렌더링한다"
				foot="lds-motion"
			/>
		</SlideStage>
	);
};
