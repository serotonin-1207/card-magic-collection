// Android 앱에 넣을 파일을 www/에 모은다. 글꼴까지 앱 안에 넣어 인터넷 없이 같은 화면이 나오게 한다.
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'www');
const fontPkg = join(root, 'node_modules', '@fontsource', 'gowun-batang');

rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, 'fonts', 'files'), { recursive: true });
for (const dir of ['css', 'js', 'icons']) cpSync(join(root, dir), join(out, dir), { recursive: true });

const WEIGHTS = ['400', '700'];
writeFileSync(join(out, 'fonts', 'gowun-batang.css'), WEIGHTS.map((w) => readFileSync(join(fontPkg, `${w}.css`), 'utf8')).join('\n'));
for (const f of readdirSync(join(fontPkg, 'files'))) {
  if (WEIGHTS.some((w) => f.endsWith(`-${w}-normal.woff2`))) cpSync(join(fontPkg, 'files', f), join(out, 'fonts', 'files', f));
}

const html = readFileSync(join(root, 'index.html'), 'utf8')
  .replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis[^>]*>/, '<link rel="stylesheet" href="fonts/gowun-batang.css">')
  .replace(/\s*<link rel="manifest"[^>]*>/, '');
if (html.includes('googleapis')) throw new Error('외부 글꼴 주소가 남아 있습니다');
writeFileSync(join(out, 'index.html'), html);
console.log('www/ 준비 완료');
