import fs from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd();
const base=path.join(root,'.astro/cms-audit');
const site=path.join(base,'site');
await fs.mkdir(site,{recursive:true});
for(const folder of ['src','public','scripts','tests'])await fs.cp(path.join(root,folder),path.join(site,folder),{recursive:true});
for(const file of ['package.json','astro.config.mjs','svelte.config.js','tsconfig.json','postcss.config.mjs','twilight.config.yaml','pagefind.yml'])await fs.copyFile(path.join(root,file),path.join(site,file));
await fs.cp(path.join(base,'fixture/src/content/posts'),path.join(site,'src/content/posts'),{recursive:true});
const variant=process.argv[2]||'safe';
if(variant==='rich'){
 await fs.copyFile(path.join(base,'song-rich.md'),path.join(site,'src/content/posts/happy-new-year-2026/index.md'));
 await fs.copyFile(path.join(base,'mdx-rich.mdx'),path.join(site,'src/content/posts/full-platform-music-players-cloud-local/index.mdx'));
}
console.log('Prepared isolated site variant:',variant);
