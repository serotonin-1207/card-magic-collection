// 미리보기용 한 파일 페이지를 만든다. 실행: node scripts/build-preview.mjs <출력 경로>
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
const out = process.argv[2];
if (!out) throw new Error('출력 경로를 지정하세요');

const html = read('index.html');
const body = /<div id="app">[\s\S]*?<\/nav>\s*<\/div>/.exec(html)[0];
const scripts = ['js/logic.js', 'js/tricks.js', 'js/stage.js', 'js/app.js'].map(read).join('\n');

writeFileSync(out, `<title>카드 마술 모음</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&display=swap">
<style>
${read('css/style.css')}
</style>
${body}
<script>globalThis.CARD_PREVIEW = true;</script>
<script>
${scripts.replace(/<\/script/g, '<\\/script')}
</script>
`);
console.log('written', out);
