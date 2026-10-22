import { mkdir, writeFile, readFile, unlink, access, rmdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { parse } from 'node-html-parser';

const output = new URL('./', import.meta.url);
const fixtures = {
  'review-protected/index.md': `---
title: Review nested protected fixture
published: 2026-10-22
encrypted: true
password: review-only-password
description: ''
---
REVIEW_PRIVATE_FIRST_PARAGRAPH_62891.

## Protected heading

Private second paragraph.

![Protected image](../to-feel-not-fight/image.png)
`,
  'review-empty-password.md': `---
title: Review empty password fixture
published: 2026-10-22
encrypted: true
password: ''
---
REVIEW_UNPROTECTED_BODY_74821.
`,
  'review-custom-route.md': `---
title: Review custom route fixture
published: 2026-10-22
routeName: posts/review-custom/
---
Review route fixture.

## \`<img src=x onerror="document.documentElement.dataset.reviewToc='executed'">\`

![Relative sibling image](to-feel-not-fight/image.png)

![Relative parent image](../posts/to-feel-not-fight/image.png)
`,
};
const created = [];
try {
  for (const [name, source] of Object.entries(fixtures)) {
    const path = `src/content/posts/${name}`;
    if (name.includes('/')) await mkdir('src/content/posts/review-protected');
    await writeFile(path, source, { flag: 'wx' });
    created.push(path);
  }
  execFileSync(process.execPath, ['scripts/test-markdown.mjs'], { stdio: 'inherit' });
  const home = parse(await readFile('dist/index.html', 'utf8'));
  const protectedPage = parse(await readFile('dist/posts/review-protected/index.html', 'utf8'));
  const emptyPage = parse(await readFile('dist/posts/review-empty-password/index.html', 'utf8'));
  const rss = await readFile('dist/rss.xml', 'utf8');
  const atom = await readFile('dist/atom.xml', 'utf8');
  const has = path => access(path).then(() => true, () => false);
  const report = {
    protected: {
      homeLeaksFirstParagraph: home.textContent.includes('REVIEW_PRIVATE_FIRST_PARAGRAPH_62891'),
      protectedPageLeaksBody: protectedPage.textContent.includes('REVIEW_PRIVATE_FIRST_PARAGRAPH_62891'),
      encryptedPayloadPresent: Boolean(protectedPage.querySelector('[data-encrypted]')),
      rssLeaksBody: rss.includes('REVIEW_PRIVATE_FIRST_PARAGRAPH_62891'),
      atomLeaksBody: atom.includes('REVIEW_PRIVATE_FIRST_PARAGRAPH_62891'),
    },
    emptyPassword: {
      publishedAsPlaintext: emptyPage.textContent.includes('REVIEW_UNPROTECTED_BODY_74821'),
      passwordPromptPresent: Boolean(emptyPage.querySelector('#password-protection')),
    },
    customRoute: {
      generatedAliasExists: await has('dist/posts/review-custom/index.html'),
      linkedFromHome: home.querySelectorAll('a').filter(a => a.textContent.trim() === 'Review custom route fixture').map(a => a.getAttribute('href')),
      doublePrefixPathExists: await has('dist/posts/posts/review-custom/index.html'),
    },
    feed: {
      rssExposesMdxImports: rss.includes('import saltImg1 from'),
      atomExposesMdxImports: atom.includes('import saltImg1 from'),
    },
  };
  await mkdir(output, { recursive: true });
  await writeFile(new URL('probe-results.json', output), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
} finally {
  await Promise.all(created.map(path => unlink(path)));
  if (created.some(path => path.includes('review-protected/'))) await rmdir('src/content/posts/review-protected');
}
