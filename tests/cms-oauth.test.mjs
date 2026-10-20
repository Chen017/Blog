import assert from 'node:assert/strict';
import test from 'node:test';
import { createOAuthHandler } from '../cms/oauth.mjs';
const config={siteUrl:'https://www.etalib.space',clientId:'test-id',clientSecret:'test-secret'};
async function call(handler,url,cookie) {
    const res={headers:{},statusCode:200,setHeader(name,value){this.headers[name.toLowerCase()]=value;},writeHead(code,headers={}){this.statusCode=code;for(const[k,v]of Object.entries(headers))this.setHeader(k,v);},end(body=''){this.body=body;}};
    await handler({method:'GET',url,headers:{cookie}},res);
    return res;
}
test('unconfigured CMS reports the missing credentials without breaking the static site',async()=>{
    const res=await call(createOAuthHandler({siteUrl:config.siteUrl}),'/oauth?provider=github');
    assert.equal(res.statusCode,503);assert.match(res.body,/not configured/);
    assert.equal((await call(createOAuthHandler(config), '/oauth/health')).body, 'ready');
});
test('OAuth uses a browser-bound single-use state, PKCE, fixed callback and exact origin handshake',async()=>{
    const requests=[];
    const handler=createOAuthHandler(config,async(url,options)=>{
        requests.push({url,options});
        return {ok:true,json:async()=>url.includes('access_token')?{access_token:'test-token'}:url.endsWith('/user')?{login:'Chen017'}:{permissions:{push:true}}};
    });
    const start=await call(handler,'/oauth?provider=github&site_id=untrusted.example');
    const target=new URL(start.headers.location);
    assert.equal(target.origin,'https://github.com');assert.equal(target.searchParams.get('redirect_uri'),config.siteUrl+'/oauth/callback');
    assert.equal(target.searchParams.get('code_challenge_method'),'S256');assert.match(start.headers['set-cookie'],/HttpOnly; SameSite=Lax/);assert.match(start.headers['set-cookie'],/Secure/);
    const callback='/oauth/callback?code=test-code&state='+target.searchParams.get('state');
    assert.equal((await call(handler,callback)).statusCode,400);assert.equal(requests.length,0);
    const cookie=start.headers['set-cookie'].split(';')[0];
    const res=await call(handler,callback,cookie);
    assert.equal(res.statusCode,200);assert.equal(requests.length,3);assert.match(res.body,/authorization:github:success/);
    assert.match(res.body,/event\.source!==target\|\|event\.origin!==origin/);assert.match(res.body,/https:\/\/www\.etalib\.space/);
    assert.ok(!res.body.includes('test-secret'));assert.equal(res.headers['cache-control'],'no-store');
    assert.equal((await call(handler,callback,cookie)).statusCode,400);
    assert.ok(new URLSearchParams(requests[0].options.body).get('code_verifier'));
});
test('OAuth refuses a different account and a user without repository write access',async()=>{
    for(const forbidden of ['account','permission']){
        const handler=createOAuthHandler(config,async url=>({ok:true,json:async()=>url.includes('access_token')?{access_token:'token'}:url.endsWith('/user')?{login:forbidden==='account'?'SomeoneElse':'Chen017'}:{permissions:{push:false}}}));
        const start=await call(handler,'/oauth');const state=new URL(start.headers.location).searchParams.get('state');
        const res=await call(handler,'/oauth/callback?code=code&state='+state,start.headers['set-cookie'].split(';')[0]);
        assert.equal(res.statusCode,403);assert.ok(!res.body.includes('token'));
    }
});
test('OAuth fails closed when GitHub fails',async()=>{
    const handler=createOAuthHandler(config,async()=>{throw new Error('private network diagnostic');});
    const start=await call(handler,'/oauth');const state=new URL(start.headers.location).searchParams.get('state');
    const res=await call(handler,'/oauth/callback?code=code&state='+state,start.headers['set-cookie'].split(';')[0]);
    assert.equal(res.statusCode,502);assert.ok(!res.body.includes('private network diagnostic'));
});
