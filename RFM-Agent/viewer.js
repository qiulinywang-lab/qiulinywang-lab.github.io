(() => {
  const root = new URL('./', document.currentScript.src);
  const key = new URL(location.href).searchParams.get('key');
  if (!key) return;
  try { sessionStorage.setItem('rfm-public-link-key',key); } catch {}
  const withKey = value => {
    if (!value) return value;
    const url = new URL(value, location.href);
    if (url.origin === root.origin && url.pathname.startsWith(root.pathname)) url.searchParams.set('key',key);
    return url.href;
  };
  for (const method of ['pushState','replaceState']) {
    const original = history[method].bind(history);
    history[method] = (state,unused,url) => original(state,unused,url == null ? url : withKey(url));
  }
  const rewrite = () => document.querySelectorAll('a[href]').forEach(a => {
    const url = new URL(a.getAttribute('href'),location.href);
    if (url.origin === root.origin && url.pathname.startsWith(root.pathname)) {
      const target = withKey(url); if (a.href !== target) a.href = target;
    }
  });
  document.addEventListener('click',event=>{const a=event.target.closest('a[href]');if(a)a.href=withKey(a.getAttribute('href'));},true);
  document.addEventListener('DOMContentLoaded',()=>{
    rewrite(); new MutationObserver(rewrite).observe(document.body,{childList:true,subtree:true});
  });
  navigator.serviceWorker?.register(new URL('site-sw.js',root),{scope:root.pathname,updateViaCache:'none'}).catch(()=>{});
})();
