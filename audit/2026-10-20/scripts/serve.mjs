import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
const base=path.resolve('.astro/cms-audit');
const fixture=path.join(base,'fixture');
const mime={'.html':'text/html; charset=utf-8','.yml':'text/yaml','.js':'text/javascript','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};
http.createServer(async(req,res)=>{
 try {
  let url=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  let file=url==='/decap-cms.js'?path.join(base,'decap-cms.js'):path.join(fixture,url);
  if(url==='/'||url==='/admin/'||url==='/admin')file=path.join(fixture,'public/admin/index.html');
  if(url==='/admin/config.yml')file=path.join(fixture,'public/admin/config.yml');
  if(!file.startsWith(base+path.sep))throw new Error('Invalid path');
  res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');
  res.setHeader('Cache-Control','no-store');res.end(await fs.readFile(file));
 } catch {res.statusCode=404;res.end('Not found');}
}).listen(4179,'127.0.0.1',()=>console.log('Audit UI: http://localhost:4179/admin/'));
