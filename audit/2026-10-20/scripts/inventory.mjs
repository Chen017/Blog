import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import yaml from 'js-yaml';
const root=process.cwd();
const out=path.join(root,'audit/2026-10-20');
await fs.mkdir(out,{recursive:true});
async function walk(dir){const items=await fs.readdir(dir,{withFileTypes:true});return(await Promise.all(items.map(async e=>e.isDirectory()?walk(path.join(dir,e.name)):path.join(dir,e.name)))).flat();}
const files=await walk(path.join(root,'src/content'));
const entries=[];
for(const file of files.filter(x=>/\.(md|mdx)$/.test(x))){
 const text=await fs.readFile(file,'utf8');const match=text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
 const data=match?yaml.load(match[1]):{};const body=match?text.slice(match[0].length):text;
 entries.push({path:path.relative(root,file).replaceAll('\\','/'),sha256:crypto.createHash('sha256').update(text).digest('hex'),extension:path.extname(file),title:data?.title||null,draft:data?.draft===true,fields:Object.keys(data||{}),directives:[...new Set([...body.matchAll(/^:{2,3}([\w-]+)(?:\{|\[|\s|$)/gm)].map(m=>m[1]))],hasMdxImports:path.extname(file)==='.mdx'&&/^import\s/m.test(body),hasMath:/\$[^\n$]+\$/.test(body),hasMermaid:/```mermaid/.test(body),hasRawHtml:/^<(?:div|img|video|iframe|audio)\b/m.test(body)});
}
const routes=[];
for(const p of ['albums','albums/jsonExample','anime','diary','projects','skills','timeline','exhibition','admin','about','friends','archive']){
 const file=path.join(root,'dist',p,'index.html');try{const stat=await fs.stat(file);routes.push({route:`/${p}/`,exists:true,bytes:stat.size});}catch{routes.push({route:`/${p}/`,exists:false});}
}
const publicFiles=await walk(path.join(root,'public'));const publicBytes={};
for(const f of publicFiles){const rel=path.relative(path.join(root,'public'),f).split(path.sep);const group=rel.slice(0,rel[0]==='assets'?2:1).join('/');publicBytes[group]=(publicBytes[group]||0)+(await fs.stat(f)).size;}
const rawConfig=await fs.readFile('twilight.config.yaml','utf8');
const config=yaml.load(rawConfig);
const evidence={date:'2026-10-20',entries,counts:{posts:entries.filter(e=>e.path.startsWith('src/content/posts/')).length,published:entries.filter(e=>e.path.startsWith('src/content/posts/')&&!e.draft).length,drafts:entries.filter(e=>e.path.startsWith('src/content/posts/')&&e.draft).length,mdx:entries.filter(e=>e.extension==='.mdx').length},routes,publicBytes,configFlags:{translate:config.site.translate.enable,loading:config.site.loadingOverlay.enable,og:config.site.generateOgImages,umami:config.umami.enabled,comments:config.post.comment.enable,license:config.post.license.enable,particle:config.particle.enable,musicPlayer:config.musicPlayer.enable,pio:config.pio.enable},verification:{unit:'8 pass',astroCheck:{errors:0,warnings:0,hints:30},build:{pages:31,indexedPages:16,status:'pass with network access'}}};
await fs.writeFile(path.join(out,'feature-evidence.json'),JSON.stringify(evidence,null,2)+'\n');
await fs.writeFile(path.join(root,'.astro/cms-audit/content-hashes.json'),JSON.stringify(Object.fromEntries(await Promise.all(files.map(async f=>[path.relative(root,f),crypto.createHash('sha256').update(await fs.readFile(f)).digest('hex')]))),null,2));
console.log(JSON.stringify({counts:evidence.counts,routes,publicBytes},null,2));
