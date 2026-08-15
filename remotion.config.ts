import {Config} from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);

// LDS 패키지(@lk-design-system/lds-slides-ui 등)는 트랜스파일 없이 raw JSX
// 소스로 배포된다. Remotion의 기본 웹팩 설정은 node_modules의 .jsx를
// 처리하지 않으므로, LDS 스코프에 한정한 esbuild 룰을 추가한다.
Config.overrideWebpackConfig((config) => ({
	...config,
	module: {
		...config.module,
		rules: [
			...(config.module?.rules ?? []),
			{
				test: /\.jsx$/,
				include: /@lk-design-system/,
				use: [
					{
						loader: require.resolve('esbuild-loader'),
						options: {loader: 'jsx', target: 'chrome85'},
					},
				],
			},
		],
	},
}));
