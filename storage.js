'use strict';
// Persistence boundary: UI owns event state; adapters own reading/writing snapshots.
// Retain the original key and v1 backup shape so existing data keeps working.
window.EventRepository = (() => {
  const key = 'my-event-planner-v1';
  const adapter = {
    async load() {
      const raw = localStorage.getItem(key);
      return raw === null ? {version: 1, events: []} : JSON.parse(raw);
    },
    async save(snapshot) { localStorage.setItem(key, JSON.stringify(snapshot)); }
  };
  const url = 'https://zzyeylxepmdhoqogcuii.supabase.co';
  const apiKey = 'sb_publishable__9wpOuHiP7NqTdyKbNDnCw__3O9ZkcV';
  const sessionKey = 'planner-cloud-session-v1';
  const read = (k, fallback) => { try { return JSON.parse(localStorage.getItem(k)) ?? fallback; } catch { return fallback; } };
  const put = (k,v) => localStorage.setItem(k,JSON.stringify(v));
  let session = read(sessionKey,null), writes = Promise.resolve(), refreshing, busy = false;
  const cacheKey = () => `${key}:${session.user.id}`;
  const cache = () => read(cacheKey(),{snapshot:{version:1,events:[]},revision:null,dirty:false});
  const status = text => { const el=document.querySelector('#connection'); if(el)el.textContent=text; };
  async function request(path, options={}, token) {
    const res=await fetch(url+path,{signal:AbortSignal.timeout(12000),...options,headers:{apikey:apiKey,'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`} : {}),...options.headers}});
    if(!res.ok)throw Error(`Cloud request failed (${res.status})`);
    return res.status===204?null:res.json();
  }
  function remember(value){put(sessionKey,value);session=value;}
  async function token(){
    if(session.expires_at>Date.now()/1000+60)return session.access_token;
    if(!refreshing)refreshing=request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token:session.refresh_token})}).then(value=>{remember(value);return value.access_token;}).finally(()=>{refreshing=null;});
    return refreshing;
  }
  async function push(record){
    const body={user_id:session.user.id,data:record.snapshot,updated_at:new Date().toISOString()};
    const suffix=record.revision===null?'':`?user_id=eq.${session.user.id}&updated_at=eq.${encodeURIComponent(record.revision)}`;
    const rows=await request('/rest/v1/planner_data'+suffix,{method:record.revision===null?'POST':'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(body)},await token());
    if(!rows?.length)throw Error('Cloud changed on another device');
    put(cacheKey(),{snapshot:record.snapshot,revision:rows[0].updated_at,dirty:false});status('Cloud synced');return record.snapshot;
  }
  async function loadCloud(){
    const local=cache();
    try{
      const rows=await request(`/rest/v1/planner_data?user_id=eq.${session.user.id}&select=data,updated_at`,{},await token());
      const remote=rows[0];
      if(local.dirty){if((remote?.updated_at||null)!==local.revision){status('Sync conflict · local edits preserved. Export backup.');return local.snapshot;}return await push(local);}
      if(remote){validate(remote.data);put(cacheKey(),{snapshot:remote.data,revision:remote.updated_at,dirty:false});status('Cloud synced');return remote.data;}
      if(localStorage.getItem(cacheKey())!==null){status('Cloud record unavailable · local copy retained');return local.snapshot;}
      const original=await adapter.load();
      if(original.events.length&&confirm('Copy existing events into your private cloud account? Your original device copy will be kept.')){validate(original);const record={snapshot:original,revision:null,dirty:true};put(cacheKey(),record);return await push(record);}
      status('Signed in · ready to sync');return local.snapshot;
    }catch{status('Cloud unavailable · device copy retained');return cache().snapshot;}
  }
  async function saveCloud(snapshot){const record={...cache(),snapshot,dirty:true};put(cacheKey(),record);try{await push(record);}catch{status('Not synced · edits saved on this device. Reopen online to retry.');}}
  function mount(){
    const button=document.createElement('button');button.textContent=session?'Cloud account':'Cloud sign in';document.querySelector('.header-actions').append(button);
    const dialog=document.createElement('dialog');document.body.append(dialog);
    dialog.innerHTML=session?'<div class="sectionhead"><h2>Cloud account</h2><button type="button" data-close>✕</button></div><p>Your cloud events are separate from local-only events.</p><button data-sync>Sync / refresh</button> <button data-out>Sign out</button><p data-message role="status"></p>':'<form><div class="sectionhead"><h2>Sign in to sync</h2><button type="button" data-close>✕</button></div><p>Use your planner email and password.</p><label>Email<input type="email" name="email" required autocomplete="username"></label><label>Password<input type="password" name="password" required autocomplete="current-password"></label><button class="primary">Sign in</button><p data-message role="status"></p></form>';
    button.onclick=()=>dialog.showModal();dialog.querySelector('[data-close]').onclick=()=>dialog.close();const message=dialog.querySelector('[data-message]');
    if(!session){status('Local data · sign in for cloud sync');dialog.querySelector('form').onsubmit=async e=>{e.preventDefault();if(busy)return;busy=true;message.textContent='Signing in…';try{const f=new FormData(e.target);await writes;remember(await request('/auth/v1/token?grant_type=password',{method:'POST',body:JSON.stringify({email:f.get('email'),password:f.get('password')})}));location.reload();}catch{message.textContent='Could not sign in. Check your email, password and connection.';busy=false;}};}
    else{dialog.querySelector('[data-sync]').onclick=()=>{if(!busy){busy=true;writes.finally(()=>location.reload());}};dialog.querySelector('[data-out]').onclick=async()=>{if(busy)return;busy=true;await writes.catch(()=>{});if(cache().dirty&&!confirm('Unsynced edits remain. Export a backup first. Sign out and retain the unsynced device copy for later?')){busy=false;return;}try{await request('/auth/v1/logout?scope=local',{method:'POST'},await token());}catch{}if(!cache().dirty)localStorage.removeItem(cacheKey());localStorage.removeItem(sessionKey);location.reload();};}
    addEventListener('online',()=>{if(session&&cache().dirty){writes=writes.catch(()=>{}).then(()=>saveCloud(cache().snapshot));}});
  }
  return {
    load: () => session ? loadCloud() : adapter.load(),
    mount,
    signedIn: () => !!session,
    save(snapshot) {
      // Capture now; serialize writes so a future async adapter preserves order.
      const copy = JSON.parse(JSON.stringify(snapshot));
      const result = writes.catch(() => {}).then(() => session ? saveCloud(copy) : adapter.save(copy));
      writes = result;
      return result;
    }
  };
})();
