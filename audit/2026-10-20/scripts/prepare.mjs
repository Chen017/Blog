import fs from 'node:fs/promises';
import path from 'node:path';
import yaml from 'js-yaml';
const root = process.cwd();
const base = path.join(root, '.astro/cms-audit');
const fixture = path.join(base, 'fixture');
const slugs = ['to-feel-not-fight', 'happy-new-year-2026', 'full-platform-music-players-cloud-local'];
await fs.mkdir(path.join(fixture, 'public/admin'), { recursive: true });
await fs.mkdir(path.join(base, 'originals'), { recursive: true });
for (const slug of slugs) {
  await fs.cp(path.join(root, 'src/content/posts', slug), path.join(fixture, 'src/content/posts', slug), { recursive: true });
  const ext = slug === slugs[2] ? 'mdx' : 'md';
  await fs.copyFile(path.join(root, 'src/content/posts', slug, `index.${ext}`), path.join(base, 'originals', `${slug}.${ext}`));
}
const common = [
  {label:'Title',name:'title',widget:'string'},
  {label:'Directory title',name:'directoryTitle',widget:'string',required:false},
  {label:'Published',name:'published',widget:'datetime',format:'YYYY-MM-DD',date_format:'YYYY-MM-DD',time_format:false},
  {label:'Description',name:'description',widget:'text',required:false},
  {label:'Category',name:'category',widget:'string',required:false},
  {label:'Cover',name:'cover',widget:'image',required:false},
  {label:'Draft',name:'draft',widget:'boolean',default:false},
];
const files = slugs.map((slug,i)=>({
  name:['plain','song','mdx'][i],label:['Plain article','Song article','MDX article'][i],
  file:`src/content/posts/${slug}/index.${i===2?'mdx':'md'}`,
  format:'yaml-frontmatter',media_folder:'',public_folder:'',fields:[...common,{label:'Body',name:'body',widget:'markdown'}],
}));
const config = {
  backend:{name:'github',repo:'local/audit-only',branch:'main'},
  local_backend:{url:'http://localhost:8081/api/v1'},
  locale:'en',media_folder:'public/assets/images',public_folder:'/assets/images',
  collections:[
    {name:'samples',label:'Existing samples',type:'files',format:'yaml-frontmatter',files},
    {name:'new_posts',label:'New bundled post',folder:'src/content/posts',create:true,
     extension:'md',format:'yaml-frontmatter',slug:'{{slug}}',path:'{{slug}}/index',
     media_folder:'',public_folder:'',fields:[...common,{label:'Body',name:'body',widget:'markdown'}]},
  ],
};
await fs.writeFile(path.join(fixture,'public/admin/config.yml'),yaml.dump(config,{lineWidth:-1}));
await fs.writeFile(path.join(fixture,'public/admin/index.html'),`<!doctype html><html><head><meta charset="utf-8"><title>Isolated Decap audit</title><meta name="robots" content="noindex"></head><body><script src="/decap-cms.js"></script></body></html>`);
await fs.writeFile(path.join(base,'manifest.json'),JSON.stringify({slugs,fixture,decap:'3.9.0',originalRoot:root},null,2));
console.log('Prepared isolated Decap fixture:',fixture);
