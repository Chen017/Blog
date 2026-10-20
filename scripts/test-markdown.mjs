import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { parse } from 'node-html-parser';

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

:::music{title="Beta Music" artist="Test" cover="/favicon/favicon.ico" audio="/beta-test.wav"}
[00:00.00] Keep music lyrics
:::

::github{repo="withastro/astro"}
`;
try {
  for (const extension of ['md', 'mdx']) {
    const file = `src/content/posts/beta-regression-${extension}.${extension}`;
    await writeFile(file, `---\ntitle: Beta regression ${extension}\npublished: 2026-01-01\ncategory: Beta\ntags: [Regression]\n---\n${body}`, { flag: 'wx' });
    created.push(file);
  }
  execFileSync(process.execPath, ['scripts/build-with-pagefind.cjs'], { stdio: 'inherit' });
  for (const extension of ['md', 'mdx']) {
    const html = parse(await readFile(`dist/posts/beta-regression-${extension}/index.html`, 'utf8'));
    for (const selector of ['.katex', '.mermaid[data-mermaid-code]', '[data-song-card]', '.card-music', '.card-github', '.expressive-code', '.collapse-btn']) {
      assert.ok(html.querySelector(selector), `${extension}: missing ${selector}`);
    }
    assert.match(html.textContent, /Keep synchronized lyrics/);
    assert.match(html.querySelector('.mermaid').getAttribute('data-mermaid-code'), /A\[Markdown\]/);
    assert.match(html.toString(), /Copy code/);
  }
  console.log('Markdown and MDX: math, Mermaid, song/music/GitHub cards and code controls verified.');
} finally {
  await Promise.all(created.map(file => unlink(file)));
}
