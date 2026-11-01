import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// Only authored posts and their media can skip the full regression suite.
// Unknown paths, empty diffs, missing history and non-fast-forward pushes fail closed.
export function isContentOnly(paths) {
  return paths.length > 0 && paths.every((path) =>
    /^src\/content\/posts\/.+\.(?:md|mdx|png|jpe?g|gif|webp|avif|svg|mp4|webm|mp3|m4a|ogg|wav|pdf)$/i.test(path) ||
    /^public\/assets\/(?:images|media)\/.+\.(?:png|jpe?g|gif|webp|avif|svg|mp4|webm|mp3|m4a|ogg|wav|pdf)$/i.test(path)
  );
}

export function classify(before, after) {
  if (!/^[0-9a-f]{40}$/.test(before ?? '') || /^0+$/.test(before) || !/^[0-9a-f]{40}$/.test(after ?? '')) return false;
  try {
    execFileSync('git', ['merge-base', '--is-ancestor', before, after], { stdio: 'ignore' });
    const output = execFileSync('git', ['diff', '--no-renames', '--name-only', '-z', before, after]);
    return isContentOnly(output.toString('utf8').split('\0').filter(Boolean));
  } catch {
    return false;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let before;
  try {
    const url = `${process.env.GITHUB_API_URL}/repos/${process.env.GITHUB_REPOSITORY}/actions/workflows/deploy.yml/runs?branch=main&status=success&per_page=1`;
    const response = await fetch(url, { headers: { Authorization: `Bearer ${process.env.GH_TOKEN}`, Accept: 'application/vnd.github+json' } });
    if (response.ok) before = (await response.json()).workflow_runs?.[0]?.head_sha;
  } catch {
    // An unavailable deployment history must never bypass validation.
  }
  const contentOnly = classify(before, process.env.AFTER);
  appendFileSync(process.env.GITHUB_OUTPUT, `content-only=${contentOnly}\n`);
  console.log(contentOnly ? 'Content-only: build and deploy' : 'Full validation required');
}
