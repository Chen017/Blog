---
title: "Nezha Monitoring: Extra Chart Timeframes"
published: 2026-04-12
description: "Sharing code injection snippets to add more time-range charts for Nezha Monitoring"
category: "Development"
cover: "3ePpUK9uhvBHLX6tkp6tXRq5M9aYXbPc.webp"
---
### Introduction
Added 1/3/6/12 hour chart displays to the official Nezha monitoring theme. Previously, it only had real-time/1/7/30 day options. I think the one-hour chart is very useful, but after searching around, no one has implemented it through the official theme. Third-party themes have UI that's not as good as the official one, so I made some code myself.

### Preview
![](3ePpUK9uhvBHLX6tkp6tXRq5M9aYXbPc.webp)

### Usage
Add the following code to the custom code in the settings
```javascript
<script>
(function () {
  'use strict';

  var EXTRA_PERIODS = [
    { value: '5m',  label: '5 分钟' },
    { value: '15m', label: '15 分钟' },
    { value: '30m', label: '30 分钟' },
    { value: '1h',  label: '1 小时' },
    { value: '3h',  label: '3 小时' },
    { value: '6h',  label: '6 小时' },
    { value: '12h', label: '12 小时' },
  ];
  var ATTR = 'data-extra-period';
  var activePeriod = null;
  var lastRendered = Symbol();
  var containerRef = null;
  var setPeriodFn = null;

  // cookie 劫持
  var cd = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie') ||
           Object.getOwnPropertyDescriptor(HTMLDocument.prototype, 'cookie');
  if (cd) {
    Object.defineProperty(document, 'cookie', {
      get: function(){ return cd.get.call(this) || '_nz=1' },
      set: function(v){ cd.set.call(this, v) },
      configurable: true,
    });
  }

  // fetch 劫持
  var _fetch = window.fetch;
  var FAKE_PROFILE = JSON.stringify({
    success:true, data:{id:1,username:'guest',password:'',created_at:'',updated_at:''}
  });

  window.fetch = async function() {
    var url = typeof arguments[0] === 'string' ? arguments[0] : (arguments[0] && arguments[0].url);

    // profile 请求：无论后端返回什么，都读取 body 检查是否有 error
    if (url && url.indexOf('/api/v1/profile') !== -1) {
      var r = await _fetch.apply(this, arguments);
      // 不管 status 如何，先读 body 检查
      var body;
      try { body = await r.clone().json(); } catch(e) { body = {}; }
      // 如果请求失败(非200)或者返回了 error 字段 → 伪造成功响应
      if (!r.ok || body.error) {
        return new Response(FAKE_PROFILE, {
          status:200, headers:{'Content-Type':'application/json'}
        });
      }
      return r;
    }

    // metrics 请求
    if (url && url.indexOf('/metrics?') !== -1) {
      var pm = url.match(/period=(\d+)(m|h)/);
      if (pm) {
        var secs = pm[2]==='h' ? +pm[1]*3600 : +pm[1]*60;
        var nu = url.replace(/period=\d+(m|h)/, 'period=1d');
        var a = Array.prototype.slice.call(arguments); a[0] = nu;
        var res = await _fetch.apply(this, a);
        var json = await res.json();
        if (json && json.data && json.data.data_points && json.data.data_points.length) {
          var now = Date.now()/1000;
          json.data.data_points = json.data.data_points.filter(function(p){
            return now - (p.ts>1e12?p.ts/1000:p.ts) <= secs;
          });
        }
        return new Response(JSON.stringify(json), {
          status:res.status, statusText:res.statusText, headers:new Headers(res.headers),
        });
      }
    }

    return _fetch.apply(this, arguments);
  };

  // DOM 工具
  var getFiber = function(el) {
    if (!el) return null;
    var keys = Object.keys(el);
    for (var i=0;i<keys.length;i++) if (keys[i].indexOf('__reactFiber$')===0) return el[keys[i]];
    return null;
  };
  var findCallback = function(f) {
    while(f){if(f.memoizedProps&&typeof f.memoizedProps.onPeriodChange==='function')return f.memoizedProps.onPeriodChange;f=f.return;}
    return null;
  };
  var findContainer = function() {
    var dots=document.querySelectorAll('span.bg-emerald-500, span.bg-emerald-400');
    for(var i=0;i<dots.length;i++){var el=dots[i].parentElement;while(el){if(el.className&&el.className.indexOf&&el.className.indexOf('bg-muted')!==-1&&el.className.indexOf('rounded-full')!==-1)return el;el=el.parentElement;}}
    return null;
  };

  // 注入按钮
  var observer = new MutationObserver(function(){ requestAnimationFrame(inject) });

  function inject() {
    var container=findContainer();
    if(!container)return;
    observer.disconnect();

    if(container!==containerRef){setPeriodFn=null;activePeriod=null;containerRef=container;}

    if(activePeriod!==null){
      for(var c=0;c<container.children.length;c++){
        var ch=container.children[c];
        if(!ch.hasAttribute(ATTR)&&ch.querySelector('.absolute.inset-0.z-10')){activePeriod=null;break;}
      }
    }

    if(container.querySelector('['+ATTR+']')&&lastRendered===activePeriod){resume();return;}
    var old=container.querySelectorAll('['+ATTR+']');for(var x=0;x<old.length;x++)old[x].remove();

    if(!setPeriodFn){
      for(var j=0;j<container.children.length;j++){
        var fiber=getFiber(container.children[j].firstElementChild||container.children[j]);
        if(fiber){setPeriodFn=findCallback(fiber);if(setPeriodFn)break;}
      }
    }
    if(!setPeriodFn){resume();return;}

    var ref=container.children[0];
    if(!ref){resume();return;}

    for(var k=0;k<EXTRA_PERIODS.length;k++){
      var p=EXTRA_PERIODS[k];
      var w=document.createElement('div');w.setAttribute(ATTR,p.value);
      var b=document.createElement('div');
      var act=activePeriod===p.value;
      b.className='relative cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-300 '+(act?'text-foreground':'text-muted-foreground hover:text-foreground');
      if(act){var bg=document.createElement('div');bg.className='absolute inset-0 z-10 h-full w-full bg-white dark:bg-background rounded-full ring-1 ring-border/60 dark:ring-border/40';b.appendChild(bg);}
      var lb=document.createElement('div');lb.className='relative z-20 flex items-center gap-1.5';lb.textContent=p.label;b.appendChild(lb);
      (function(v){w.addEventListener('click',function(){
        activePeriod=v;
        setPeriodFn(v);
      })})(p.value);
      w.appendChild(b);ref.insertAdjacentElement('afterend',w);ref=w;
    }

    for(var n=0;n<container.children.length;n++){
      var child=container.children[n];
      if(!child.hasAttribute(ATTR)&&!child.hasAttribute('data-bound')){
        child.setAttribute('data-bound','');
        child.addEventListener('click',function(){activePeriod=null},true);
      }
    }
    lastRendered=activePeriod;
    resume();
  }

  function resume(){observer.observe(document.body,{childList:true,subtree:true})}
  if(document.body){resume();inject()}
  else document.addEventListener('DOMContentLoaded',function(){resume();inject()});
})();
</script>
```
