(async () => {
  const status = document.querySelector('#access-status');
  const form = document.querySelector('#access-form');
  const field = document.querySelector('#access-key');
  const scope = new URL('./', location.href);
  const store = 'rfm-public-link-key';
  const fail = message => { status.textContent = message; form.hidden = false; };
  form.addEventListener('submit', event => {
    event.preventDefault(); const url = new URL(location.href);
    url.searchParams.set('key', field.value.trim()); location.replace(url.href);
  });
  let key = new URL(location.href).searchParams.get('key');
  if (!key) { try { key = sessionStorage.getItem(store); } catch {} }
  if (!key) { fail('Open your access link, or enter its key to continue.'); return; }
  try {
    const manifest = await (await fetch(new URL('manifest.json', scope), {cache:'no-store'})).json();
    const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key)))].map(n=>n.toString(16).padStart(2,'0')).join('');
    if (digest !== manifest.key_hash) { try { sessionStorage.removeItem(store); } catch {} fail('This access key is not valid.'); return; }
    try { sessionStorage.setItem(store, key); } catch {}
    const url = new URL(location.href); url.searchParams.set('key', key); history.replaceState(null, '', url);
    if (!('serviceWorker' in navigator)) { fail('Please use a current browser with service worker support.'); return; }
    status.textContent = 'Opening the research site…';
    const registration = await navigator.serviceWorker.register(new URL('site-sw.js', scope), {scope:scope.pathname, updateViaCache:'none'});
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) await new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true}));
    if (registration.waiting) registration.waiting.postMessage({type:'activate'});
    location.reload();
  } catch { fail('The site could not open. Please reload and try again.'); }
})();
