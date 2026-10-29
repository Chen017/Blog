import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
for (const provider of ['twikoo','waline']) test(provider+' disposes old page listeners',async()=>{
 const code=(await readFile('src/components/comment/'+provider+'.astro','utf8')).match(/<script is:inline define:vars=\{\{ config \}\}>([\s\S]*?)<\/script>/)[1];
 const document=new EventTarget(); document.readyState='complete';let element={},calls=0;document.getElementById=()=>element;const window=new EventTarget();window.location={pathname:'/posts/test/'};
 const context=vm.createContext({window,document,config:{},Promise,console,clearTimeout,setTimeout,twikoo:{init(){calls++}},Waline:{init(){calls++}}});
 vm.runInContext(code,context);await Promise.resolve();document.dispatchEvent(new Event('astro:before-swap'));element={};document.dispatchEvent(new Event('twilight:page:loaded'));await Promise.resolve();assert.equal(calls,1);vm.runInContext(code,context);document.dispatchEvent(new Event('twilight:page:loaded'));await Promise.resolve();assert.equal(calls,2);
});
