const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync(require('node:path').join(__dirname,'../storage.js'),'utf8');
const user = {user:{id:'test-user'},access_token:'test',expires_at:Date.now()/1000+3600};
const key = 'my-event-planner-v1';
const original = {version:1,events:[{id:'local'}]};
let remote = null, offline = false;
function device(initial = {}, migrate=true){
 const values = new Map(Object.entries(initial).map(([k,v])=>[k,JSON.stringify(v)]));
 const localStorage = {getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
 const fetch = async (path,options)=>{
  if(offline)throw Error('offline');
  assert.equal(options.headers.Authorization,'Bearer test');
  const method=options.method||'GET';
  let result;
  if(method==='GET')result=remote?[remote]:[];
  else if(method==='POST'&&!remote){remote=JSON.parse(options.body);result=[remote];}
  else if(method==='PATCH'&&remote&&new URL(path).searchParams.get('updated_at')===`eq.${remote.updated_at}`){remote=JSON.parse(options.body);result=[remote];}
  else result=[];
  return {ok:true,status:200,json:async()=>result};
 };
 const window={};
 vm.runInNewContext(source,{window,localStorage,fetch,document:{querySelector:()=>null},validate:()=>{},confirm:()=>migrate,AbortSignal});
 return {repo:window.EventRepository,values};
}
(async()=>{
 const local=device();await local.repo.save(original);assert.equal((await local.repo.load()).events[0].id,'local');
 const a=device({[key]:original,'planner-cloud-session-v1':user});assert.equal((await a.repo.load()).events[0].id,'local');
 assert.equal(JSON.parse(a.values.get(key)).events[0].id,'local');
 const b=device({'planner-cloud-session-v1':user});assert.equal((await b.repo.load()).events[0].id,'local');
 await new Promise(r=>setTimeout(r,5));
 await a.repo.save({version:1,events:[{id:'updated'}]});assert.equal(remote.data.events[0].id,'updated');
 await b.repo.save({version:1,events:[{id:'conflict'}]});assert.equal(remote.data.events[0].id,'updated');assert.equal((await b.repo.load()).events[0].id,'conflict');
 offline=true;await a.repo.save({version:1,events:[{id:'offline'}]});assert.equal((await a.repo.load()).events[0].id,'offline');offline=false;assert.equal((await a.repo.load()).events[0].id,'offline');assert.equal(remote.data.events[0].id,'offline');
 console.log('PASS local preservation, migration, second device sync, conflict protection, offline edits and retry');
})().catch(e=>{console.error(e);process.exit(1)});
