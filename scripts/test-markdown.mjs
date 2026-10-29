import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile, unlink, mkdir, rmdir, readdir } from 'node:fs/promises';
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
const createdDirectories = [];
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
  const protectedFile = 'src/content/posts/beta-protected.md';
  await writeFile(protectedFile, `---\ntitle: Protected regression\npublished: 2026-10-22\nencrypted: true\npassword: regression-password\n---\n\nPRIVATE_REGRESSION_BODY_78521\n\n## Protected heading\n\n![Unlock image](/favicon/icon.png)\n`, { flag: 'wx' });
  created.push(protectedFile);
  await mkdir('src/content/posts/beta-route');
  createdDirectories.push('src/content/posts/beta-route');
  const routeFile = 'src/content/posts/beta-route/index.md';
  await writeFile(routeFile, `---\ntitle: Route regression\npublished: 2026-10-22\nrouteName: /posts/beta-canonical/\n---\n\nPublic route regression.\n\n## \`<img src=x onerror="document.documentElement.dataset.tocRegression='unsafe'">\`\n\n![Parent directory image](../to-feel-not-fight/image.png)\n`, { flag: 'wx' });
  created.push(routeFile);
  for (const extension of ['md', 'mdx']) {
    const file = `src/content/posts/beta-regression-${extension}.${extension}`;
    await writeFile(file, `---\ntitle: Beta regression ${extension}\npublished: 2026-01-01\ncategory: Beta\ntextAlign: ${extension === "md" ? "center" : "left"}\n---\n${body}`, { flag: 'wx' });
    created.push(file);
  }
  execFileSync(process.execPath, ['scripts/build-with-pagefind.cjs'], { stdio: 'inherit', env: { ...process.env, UMAMI_API_KEY: 'BUILD_ONLY_SECRET_CANARY_65291' } });
  const home = await readFile('dist/index.html', 'utf8');
  assert.ok(!home.includes('PRIVATE_REGRESSION_BODY_78521'), 'Protected body must not become a home excerpt');
  assert.ok(home.includes('/posts/beta-canonical/') && !home.includes('/posts/posts/beta-canonical/'), 'Use canonical route links');
  const protectedPage = parse(await readFile('dist/posts/beta-protected/index.html', 'utf8'));
  assert.ok(protectedPage.querySelector('[data-encrypted]'));
  assert.ok(!protectedPage.textContent.includes('PRIVATE_REGRESSION_BODY_78521'));
  for (const file of (await readdir('dist', { recursive: true })).filter(file => /\.(?:html|js|mjs|json|yml)$/.test(file))) {
    const text = await readFile(`dist/${file}`, 'utf8');
    assert.ok(!text.includes('BUILD_ONLY_SECRET_CANARY_65291'), `${file}: build credentials leaked into public output`);
    assert.ok(!text.includes('data-umami-api-key'), `${file}: analytics credential attribute in public output`);
  }
  for (const extension of ['md', 'mdx']) {
    const html = parse(await readFile(`dist/posts/beta-regression-${extension}/index.html`, 'utf8'));
    assert.equal(html.querySelector('.vs-article').getAttribute('data-align'), extension === 'md' ? 'center' : 'left', `${extension}: alignment must follow frontmatter`);
    assert.ok(!html.querySelector('.vs-updated'), `${extension}: no visible last-edited label`);
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
  for (const directory of createdDirectories) await rmdir(directory);
}
