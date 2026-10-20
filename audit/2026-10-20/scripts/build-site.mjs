import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {parse} from 'node-html-parser';
import crypto from 'node:crypto';
const root=process.cwd();const base=path.join(root,'.astro/cms-audit');const site=path.join(base,'site');
if(!process.argv.includes('--verify-only')) {
execFileSync(process.execPath,[path.join(root,'node_modules/astro/bin/astro.mjs'),'build','--root',site],{stdio:'inherit',cwd:root});
const pkgDir=path.join(root,'node_modules/pagefind');const pkg=JSON.parse(await fs.readFile(path.join(pkgDir,'package.json'),'utf8'));
const bin=typeof pkg.bin==='string'?pkg.bin:pkg.bin.pagefind;
execFileSync(process.execPath,[path.join(pkgDir,bin),'--site',path.join(site,'dist')],{stdio:'inherit',cwd:site});
execFileSync(process.execPath,[path.join(root,'scripts/verify-build.mjs')],{stdio:'inherit',cwd:site});
}
const variants={};
for(const variant of ['rich','safe']){
 const output=variant==='rich'?path.join(base,'rich-dist'):path.join(site,'dist');
 const plain=parse(await fs.readFile(path.join(output,'posts/to-feel-not-fight/index.html'),'utf8'));
 const song=parse(await fs.readFile(path.join(output,'posts/happy-new-year-2026/index.html'),'utf8'));
 const mdx=parse(await fs.readFile(path.join(output,'posts/full-platform-music-players-cloud-local/index.html'),'utf8'));
 assert.ok(plain.textContent.includes('DECAP_AUDIT_PLAIN_RICH'));
 assert.ok(song.querySelector('[data-song-card]'));
 assert.ok(mdx.textContent.includes(variant==='rich'?'DECAP_AUDIT_MDX_RICH':'DECAP_AUDIT_MDX_RAW'));
 const article=mdx.querySelector('.custom-md[data-pagefind-body]');const images=article.querySelectorAll('img');
 assert.equal(images.length,12);
 for(const image of images){const src=image.getAttribute('src');assert.ok(src?.startsWith('/_astro/'));await fs.access(path.join(output,src.slice(1)));}
 const spoilers=song.querySelectorAll('spoiler');const nonemptySpoilers=spoilers.filter(e=>e.textContent.trim()).length;
 assert.equal(nonemptySpoilers,variant==='safe'?2:0);
 variants[variant]={songCards:song.querySelectorAll('[data-song-card]').length,spoilerElements:spoilers.length,nonemptySpoilerElements:nonemptySpoilers,mdxImages:images.length,mdxLocalAssetsExist:true,plainImages:plain.querySelector('.custom-md[data-pagefind-body]').querySelectorAll('img').length};
}
const newPost=parse(await fs.readFile(path.join(site,'dist/posts/decap-audit-bundle/index.html'),'utf8'));
const newImg=newPost.querySelector('[data-pagefind-body] img[alt="Audit uploaded image"]');assert.ok(newImg);
await fs.access(path.join(site,'dist',newImg.getAttribute('src').slice(1)));
const originalImage=await fs.readFile(path.join(root,'src/content/posts/to-feel-not-fight/image.png'));
const upload=await fs.readFile(path.join(base,'fixture/src/content/posts/decap-audit-bundle/image.png'));
assert.ok(upload.equals(originalImage));
variants.newPost={path:'src/content/posts/decap-audit-bundle/index.md',imagePath:'src/content/posts/decap-audit-bundle/image.png',uploadBytes:upload.length,uploadedImageMatchesOriginal:true,renderedInlineImageExists:true,cover:'image.png',articleUrl:'/posts/decap-audit-bundle/'};
const hashes=JSON.parse(await fs.readFile(path.join(base,'content-hashes.json'),'utf8'));
for(const[file,hash]of Object.entries(hashes))assert.equal(crypto.createHash('sha256').update(await fs.readFile(path.join(root,file))).digest('hex'),hash,'Original content changed: '+file);
variants.originalContent={filesChecked:Object.keys(hashes).length,unchanged:true};
await fs.writeFile(path.join(root,'audit/2026-10-20/build-results.json'),JSON.stringify(variants,null,2)+'\n');
console.log('DECAP_AUDIT_RESULTS',JSON.stringify(variants,null,2));
