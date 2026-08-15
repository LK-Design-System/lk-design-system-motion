import React from 'react';
import {TitleSlide, StatSlide, EndSlide} from '@lk-design-system/lds-slides-ui';
import {Deck, deckDuration, type DeckEntry} from '../core/sequence';
import {SlideStage} from '../SlideStage';
import '../ldsStyles';

/**
 * 여러 슬라이드를 크로스페이드로 이어붙인 덱. Scene/Deck 배치의 레퍼런스다.
 *
 * 각 장면은 자기 로컬 프레임 0부터 시작하므로 SlideStage의 등장 모션이
 * 장면마다 새로 재생된다 — 덱 어디에 놓였는지 신경 쓸 필요가 없다.
 */
export const deckDemoScenes: DeckEntry[] = [
	{
		durationInFrames: 90,
		element: (
			<SlideStage>
				<TitleSlide
					eyebrow="LK ROBOTICS"
					title="LDS × 모션"
					subtitle="디자인 시스템의 슬라이드를 그대로 영상으로 만든다"
					foot="lds-motion"
				/>
			</SlideStage>
		),
	},
	{
		durationInFrames: 90,
		transition: 'push',
		transitionDuration: 15,
		element: (
			<SlideStage>
				<StatSlide
					eyebrow="파이프라인"
					title="렌더 결과"
					figures={[
						{value: 120, unit: '프레임', label: '컴포지션 길이', claim: '30fps · 4초.'},
						{
							value: 13,
							unit: '초',
							label: '렌더 시간',
							claim: '1920×1080 프레임 스테핑.',
							emphasis: true,
						},
						{value: 0, unit: '원', label: '라이선스 비용', claim: '엔진 자체 구현.'},
					]}
					source="lds-motion 측정값"
					foot="lds-motion"
				/>
			</SlideStage>
		),
	},
	{
		durationInFrames: 75,
		transition: 'push',
		transitionDuration: 15,
		element: (
			<SlideStage>
				<EndSlide
					message="같은 입력은 항상 같은 영상을 만든다"
					contact="github.com/LK-Design-System/lk-design-system-motion"
					foot="lds-motion"
				/>
			</SlideStage>
		),
	},
];

export const DeckDemo: React.FC = () => <Deck scenes={deckDemoScenes} />;

export const deckDemoDuration = deckDuration(deckDemoScenes);
