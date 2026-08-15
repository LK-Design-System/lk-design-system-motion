import React from 'react';
import {Composition} from 'remotion';
import {TitleDemo} from './compositions/TitleDemo';
import {video} from './motion/springs';

export const RemotionRoot: React.FC = () => {
	return (
		<>
			<Composition
				id="TitleDemo"
				component={TitleDemo}
				durationInFrames={120}
				fps={video.fps}
				width={video.width}
				height={video.height}
			/>
		</>
	);
};
