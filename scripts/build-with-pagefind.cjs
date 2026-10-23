const { execFileSync } = require('node:child_process');
const { existsSync, readFileSync } = require('node:fs');
const { join, resolve } = require('node:path');

// Preview and the VPS nginx image publish the same static directory.
// Never infer a target from stale caches or CI environment variables.
const root = resolve(__dirname, '..');
const outputDir = join(root, 'dist');

function runPackageBin(name, binName, args) {
  const packageDir = join(root, 'node_modules', name);
  const manifest = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8'));
  const bin = typeof manifest.bin === 'string' ? manifest.bin : manifest.bin[binName];
  execFileSync(process.execPath, [join(packageDir, bin), ...args], { cwd: root, stdio: 'inherit' });
}

try {
  runPackageBin('astro', 'astro', ['build']);
  if (!existsSync(join(outputDir, 'index.html'))) throw new Error('Astro did not generate dist/index.html');
  execFileSync(process.execPath, [join(__dirname, 'optimize-picture-formats.mjs')], { cwd: root, stdio: 'inherit' });
  runPackageBin('pagefind', 'pagefind', ['--site', outputDir]);
  execFileSync(process.execPath, [join(__dirname, 'verify-build.mjs')], { cwd: root, stdio: 'inherit' });
} catch (error) {
  console.error('Static build failed:', error.message);
  process.exitCode = 1;
}
