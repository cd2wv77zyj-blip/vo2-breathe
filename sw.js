const CACHE="vo2-breathe-v7-9-2";
const ASSETS=["./","./index.html","./styles-v7-9.css?v=7.9.2","./app-v7-9.js?v=7.9.2","./manifest.webmanifest","./icon-192-v792.png","./icon-512-v792.png","./apple-touch-icon-v792.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));self.skipWaiting();});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener("fetch",e=>{
 if(e.request.method!=="GET")return;
 if(e.request.mode==="navigate"){
   e.respondWith(fetch(e.request,{cache:"no-store"}).then(r=>{const x=r.clone();caches.open(CACHE).then(c=>c.put("./index.html",x));return r;}).catch(()=>caches.match("./index.html")));return;
 }
 e.respondWith(fetch(e.request,{cache:"no-store"}).then(r=>{const x=r.clone();caches.open(CACHE).then(c=>c.put(e.request,x));return r;}).catch(()=>caches.match(e.request)));
});