import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd();
async function bin(packageName, name) {
    const dir=path.join(root,'node_modules',packageName);
    const pkg=JSON.parse(await readFile(path.join(dir,'package.json'),'utf8'));
    return path.join(dir,typeof pkg.bin==='string'?pkg.bin:pkg.bin[name]);
}
const children=[];
let stopping=false;
function stop(code=0) {
    if(stopping)return;
    stopping=true;
    for(const child of children)child.kill();
    process.exitCode=code;
}
for(const [entry,args,env] of [
    [await bin('decap-server','decap-server'),[],{BIND_HOST:'127.0.0.1',PORT:'8081',GIT_REPO_DIRECTORY:root}],
    [await bin('astro','astro'),['dev','--host','127.0.0.1'],{}],
]) {
    const child=spawn(process.execPath,[entry,...args],{cwd:root,stdio:'inherit',env:{...process.env,...env}});
    children.push(child);
    child.on('error',error=>{console.error(error.message);stop(1);});
    child.on('exit',code=>{if(!stopping)stop(code||0);});
}
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>stop());
console.log('本地文章管理：http://127.0.0.1:4321/admin/ （保存到当前目录；不会自动提交 GitHub）');
