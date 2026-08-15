#!/usr/bin/env node
/**
 * lds-motion 렌더러 — 프레임 스테핑 방식.
 *
 * 화면 녹화가 아니다. 크롬을 열고 시간을 한 칸씩 수동으로 밀면서
 * 프레임마다 스크린샷을 찍은 뒤 FFmpeg로 인코딩한다. 벽시계가 개입할
 * 지점이 없으므로 같은 입력은 항상 같은 출력을 만든다.
 *
 * 사용:
 *   node scripts/render.mjs TitleDemo out/title.mp4
 *   node scripts/render.mjs TitleDemo out/frame.png --frame=60
 *   node scripts/render.mjs TitleDemo out/title.mp4 --range=0-59
 */
import {createServer} from 'vite';
import {chromium} from 'playwright';
import ffmpegPath from 'ffmpeg-static';
import {spawnSync} from 'node:child_process';
import {mkdirSync, rmSync, existsSync} from 'node:fs';
import {dirname, extname, resolve} from 'node:path';

const argv = process.argv.slice(2);
const positional = argv.filter((a) => !a.startsWith('--'));
const flag = (name) => {
	const hit = argv.find((a) => a.startsWith(`--${name}=`));
	return hit ? hit.slice(name.length + 3) : null;
};

const compositionId = positional[0];
const output = positional[1];
if (!compositionId || !output) {
	console.error(
		'사용법: node scripts/render.mjs <CompositionId> <출력경로> [--frame=N] [--range=A-B] [--crf=18]',
	);
	process.exit(1);
}

const stillMode = extname(output).toLowerCase() === '.png';
const crf = flag('crf') ?? '18';

mkdirSync(dirname(resolve(output)), {recursive: true});

const server = await createServer({
	server: {port: 0},
	logLevel: 'error',
	configFile: 'vite.config.ts',
});
await server.listen();
const {port} = server.httpServer.address();
const base = `http://127.0.0.1:${port}`;

const browser = await chromium.launch();
let exitCode = 0;

try {
	const page = await browser.newPage({deviceScaleFactor: 1});
	page.on('pageerror', (err) => {
		console.error('[page error]', err.message);
		exitCode = 1;
	});

	await page.goto(
		`${base}/?comp=${encodeURIComponent(compositionId)}&render=1`,
		{waitUntil: 'load'},
	);
	await page.waitForFunction(() => window.__lkReady === true, {timeout: 30_000});

	const config = await page.evaluate(() => window.__lkComposition);
	await page.setViewportSize({width: config.width, height: config.height});

	// LDS는 @font-face로 자기 폰트를 싣는다. 폰트가 로드되기 전에 찍으면
	// 폴백 글꼴로 렌더된 프레임이 섞인다 — 한 번만, 반드시 기다린다.
	await page.evaluate(() => document.fonts.ready);

	const stage = page.locator('[data-lk-stage]');

	/** 프레임 n을 DOM에 반영하고 실제 페인트까지 끝났음을 보장한다. */
	const seek = async (n) => {
		await page.evaluate((frame) => {
			window.__lkSetFrame(frame);
			// flushSync로 DOM은 이미 갱신됐다. 두 번의 rAF로 다음 페인트가
			// 화면에 올라온 것까지 확인한 뒤에야 스크린샷을 찍는다.
			return new Promise((done) =>
				requestAnimationFrame(() => requestAnimationFrame(done)),
			);
		}, n);
	};

	if (stillMode) {
		const frame = Number(flag('frame') ?? 0);
		await seek(frame);
		await stage.screenshot({path: output, type: 'png'});
		console.log(`[render] still ${compositionId} frame=${frame} → ${output}`);
	} else {
		const range = flag('range');
		const [from, to] = range
			? range.split('-').map(Number)
			: [0, config.durationInFrames - 1];
		const tmp = resolve('out/.frames');
		rmSync(tmp, {recursive: true, force: true});
		mkdirSync(tmp, {recursive: true});

		const total = to - from + 1;
		const started = Date.now();
		for (let i = 0; i < total; i++) {
			await seek(from + i);
			await stage.screenshot({
				path: `${tmp}/f-${String(i).padStart(5, '0')}.png`,
				type: 'png',
			});
			if (i % 20 === 0 || i === total - 1) {
				process.stdout.write(`\r[render] ${i + 1}/${total} 프레임`);
			}
		}
		const elapsed = ((Date.now() - started) / 1000).toFixed(1);
		process.stdout.write(`\r[render] ${total}/${total} 프레임 (${elapsed}s)\n`);

		console.log('[encode] FFmpeg 인코딩');
		const ff = spawnSync(
			ffmpegPath,
			[
				'-y',
				'-framerate', String(config.fps),
				'-i', `${tmp}/f-%05d.png`,
				'-c:v', 'libx264',
				'-preset', 'slow',
				'-crf', crf,
				'-pix_fmt', 'yuv420p',
				'-movflags', '+faststart',
				output,
			],
			{stdio: ['ignore', 'ignore', 'pipe']},
		);
		if (ff.status !== 0) {
			console.error(String(ff.stderr));
			throw new Error(`FFmpeg 실패 (exit ${ff.status})`);
		}
		rmSync(tmp, {recursive: true, force: true});
		console.log(`[render] ${output}`);
	}
} catch (err) {
	console.error(`[render] 실패: ${err.message}`);
	exitCode = 1;
} finally {
	await browser.close();
	await server.close();
}

if (!stillMode && exitCode === 0 && !existsSync(output)) exitCode = 1;
process.exit(exitCode);
