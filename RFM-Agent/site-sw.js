/* Public ciphertext delivery; content is decrypted only with the link's random key. */
const RELEASE = '92a6ccd65053';
const ROOT = self.registration.scope;
let manifestPromise;
const manifests = () => manifestPromise ||= fetch(new URL('manifest.json',ROOT),{cache:'no-store'}).then(r=>{if(!r.ok)throw Error();return r.json();});
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('message',event=>{if(event.data?.type==='activate')self.skipWaiting();});
const hex = bytes => [...new Uint8Array(bytes)].map(n=>n.toString(16).padStart(2,'0')).join('');
async function accessKey(request,clientId) {
  let value = new URL(request.url).searchParams.get('key');
  if (!value && clientId) { const client=await self.clients.get(clientId); if(client)value=new URL(client.url).searchParams.get('key'); }
  return value;
}
async function serve(event,path) {
  const manifest = await manifests();
  const item = manifest.files[path];
  if (!item) return new Response('Not found',{status:404,headers:{'Content-Type':'text/plain','Cache-Control':'no-store'}});
  const key = await accessKey(event.request,event.clientId);
  if (!key || hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(key))) !== manifest.key_hash) {
    if (event.request.mode==='navigate') return fetch(new URL('access-shell.html',ROOT),{cache:'no-store'});
    return new Response('Access key required',{status:403});
  }
  try {
    const material=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(key));
    const aes=await crypto.subtle.importKey('raw',material,{name:'AES-GCM'},false,['decrypt']);
    const response=await fetch(new URL(item.blob,ROOT),{cache:'no-store'});
    if(!response.ok)throw Error();
    const bytes=new Uint8Array(await response.arrayBuffer());
    const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes.slice(0,12),additionalData:new TextEncoder().encode(path)},aes,bytes.slice(12));
    const stream=new Blob([plain]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Response(stream,{headers:{'Content-Type':item.mime,'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'}});
  } catch { return new Response('The encrypted file could not be opened. Reload the access link.',{status:502,headers:{'Content-Type':'text/plain','Cache-Control':'no-store'}}); }
}
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url),root=new URL(ROOT);
  if(url.origin!==root.origin || !url.pathname.startsWith(root.pathname) || event.request.method!=='GET')return;
  let path;try {path=decodeURIComponent(url.pathname.slice(root.pathname.length))||'index.html';}catch{return;}
  if(['access.js','viewer.js','site-sw.js','manifest.json','access-shell.html','robots.txt'].includes(path)||path.startsWith('_sealed/'))return;
  event.respondWith(serve(event,path).catch(()=>new Response('Site temporarily unavailable',{status:503})));
});
