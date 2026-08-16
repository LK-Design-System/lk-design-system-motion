import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
	plugins: [react()],
	server: {port: 3112, host: '127.0.0.1'},
	// LDS 패키지는 트랜스파일 없는 raw JSX로 배포된다. Vite의 의존성
	// 사전 번들(esbuild)이 .jsx를 처리하므로 별도 로더 설정이 필요 없다 —
	// Remotion의 웹팩에서 필요했던 esbuild-loader 룰의 대체다.
	optimizeDeps: {
		include: ['@lk-design-system/lds-slides-ui'],
	},
});
