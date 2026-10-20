import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { parse } from 'node-html-parser';
import vm from 'node:vm';

const forms = vm.createContext({});
vm.runInContext(await readFile('public/admin/components.js', 'utf8'), forms);
const component = forms.BlogComponents.block;
const formContent = [
  component('song', { title: 'Form "Song" & {夜}', artist: '表单测试', cover: '/favicon/icon.png', audio: '/form-test.mp3', lyrics: '[00:01.00] Form-generated lyric', lyricOffset: '-0.2' }),
  component('note', { noteType: 'warning', text: 'Form-generated warning' }),
  component('spoiler', { text: 'Keep [brackets] and {braces}' }),
  component('math', { text: '\\frac{a}{b}=2' }),
  component('mermaid', { text: 'graph TD\n Form-->Output' }),
  component('image', { image: '/favicon/icon.png', alt: 'Form image' }),
].join('\n\n');

// Temporary posts exercise the actual Astro/MDX pipeline, then leave no content behind.
const created = [];
const body = `
## Integration check

Inline math $E=mc^2$.

> [!NOTE]
> Keep custom admonitions.

\`\`\`js
console.log('Keep copy, language badge and collapse');
\`\`\`

\`\`\`mermaid
graph LR
  A[Markdown] --> B[Astro]
\`\`\`

:::song{title="Beta Song" artist="Test" cover="/favicon/favicon.ico" audio="/beta-test.wav"}
[00:00.00] Keep synchronized lyrics
[00:01.00] Keep lyric offset
:::

:spoiler[Keep custom spoiler content]

${formContent}
`;
try {
  for (const extension of ['md', 'mdx']) {
    const file = `src/content/posts/beta-regression-${extension}.${extension}`;
    await writeFile(file, `---\ntitle: Beta regression ${extension}\npublished: 2026-01-01\ncategory: Beta\n---\n${body}`, { flag: 'wx' });
    created.push(file);
  }
  execFileSync(process.execPath, ['scripts/build-with-pagefind.cjs'], { stdio: 'inherit' });
  for (const extension of ['md', 'mdx']) {
    const html = parse(await readFile(`dist/posts/beta-regression-${extension}/index.html`, 'utf8'));
    for (const selector of ['.katex', '.mermaid[data-mermaid-code]', '[data-song-card]', 'spoiler', '.expressive-code', '.collapse-btn']) {
      assert.ok(html.querySelector(selector), `${extension}: missing ${selector}`);
    }
    assert.match(html.textContent, /Keep synchronized lyrics/);
    assert.match(html.querySelector('.mermaid').getAttribute('data-mermaid-code'), /A\[Markdown\]/);
    assert.match(html.toString(), /Copy code/);
    assert.equal(html.querySelector('spoiler').textContent, 'Keep custom spoiler content');
    assert.ok(!html.querySelector('.card-music, .card-github'));
    const song = html.querySelectorAll('[data-song-card]').find(card => card.getAttribute('data-song-artist') === '表单测试');
    assert.ok(song, `${extension}: missing form-generated song`);
    assert.equal(song.getAttribute('data-song-title'), 'Form "Song" & {夜}');
    assert.equal(song.getAttribute('data-lyric-offset'), '-0.2');
    assert.equal(song.querySelector('[data-lrc-source] li').textContent, 'Form-generated lyric');
    assert.ok(html.querySelector('.bdm-warning'));
    assert.ok(html.querySelector('.katex-display'));
    assert.ok(html.querySelectorAll('spoiler').some(node => node.textContent === 'Keep [brackets] and {braces}'));
    assert.ok(html.querySelector('img[alt="Form image"]'));
  }
  console.log('Markdown and MDX: math, Mermaid, song, spoiler and code controls verified.');
} finally {
  await Promise.all(created.map(file => unlink(file)));
}
