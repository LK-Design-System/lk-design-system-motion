#!/usr/bin/env node
/**
 * 결정론 가드: 같은 프레임을 두 번 렌더해서 바이트 단위로 비교한다.
 * SlideStage 지오메트리나 웹팩 설정을 건드린 뒤에는 반드시 이걸 돌린다.
 * ResizeObserver/effect 타이밍에 기대는 코드가 섞이면 여기서 잡힌다.
 *
 * 사용: node scripts/check-determinism.mjs [compositionId] [frame]
 */
import {execSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync, mkdirSync, rmSync} from 'node:fs';

const composition = process.argv[2] ?? 'TitleDemo';
const frame = process.argv[3] ?? '45';
const dir = 'out/.determinism';

rmSync(dir, {recursive: true, force: true});
mkdirSync(dir, {recursive: true});

const render = (name) => {
	execSync(
		`npx remotion still ${composition} ${dir}/${name}.png --frame=${frame}`,
		{stdio: 'pipe'},
	);
	return createHash('sha256').update(readFileSync(`${dir}/${name}.png`)).digest('hex');
};

console.log(`[determinism] ${composition} frame=${frame} — 2회 렌더 비교`);
const a = render('a');
const b = render('b');

if (a === b) {
	console.log(`[determinism] OK — sha256 ${a.slice(0, 16)}…`);
	rmSync(dir, {recursive: true, force: true});
} else {
	console.error(`[determinism] FAIL — 두 렌더가 다르다.`);
	console.error(`  a: ${a}`);
	console.error(`  b: ${b}`);
	console.error(`  ${dir}/a.png, b.png를 비교해서 비결정 원인을 찾아라.`);
	process.exit(1);
}
