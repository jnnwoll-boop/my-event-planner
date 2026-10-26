const {chromium, devices}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 const context=await browser.newContext({...devices['iPhone 13'],acceptDownloads:true});
 const page=await context.newPage();page.on('dialog',d=>d.accept());const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.TEST_BASE_URL||'http://127.0.0.1:8001/');
 await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
 async function create(name){await page.getByRole('button',{name:/Create (your first )?event|Create your first event/}).first().click();await page.locator('#eventForm [name=name]').fill(name);await page.locator('[name=date]').fill('2027-06-12');await page.getByRole('button',{name:'Save event',exact:true}).click();await page.getByRole('button',{name:'Ideas',exact:true}).click()}
 await create('Birthday ideas');
 const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=2400;c.height=1600;const x=c.getContext('2d');x.fillStyle='#28634d';x.fillRect(0,0,c.width,c.height);x.fillStyle='orange';x.fillRect(300,200,800,800);return c.toDataURL('image/png').split(',')[1]});
 const photo={name:'decor.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')};
 await page.locator('#ideaPhotos').setInputFiles([photo,{...photo,name:'cake.png'}]);await page.waitForFunction(()=>document.querySelector('#ideaStatus').textContent.includes('2 photos added'));
 assert.equal(await page.locator('.idea-card').count(),2);
 const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('my-event-planner-v1')));
 assert(stored.events[0].ideas[0].image.length<=180000);assert(stored.events[0].ideas[0].image.startsWith('data:image/jpeg;'));
 const size=await page.locator('.idea-card img').first().evaluate(img=>({width:img.naturalWidth,height:img.naturalHeight}));assert.equal(size.width,1000);assert.equal(size.height,667);
 await page.getByLabel('Caption for photo 1',{exact:true}).fill('Sage green <ribbons>');await page.getByLabel('Category for photo 1',{exact:true}).selectOption('Decor');await page.getByRole('button',{name:'Save details',exact:true}).first().click();await page.waitForFunction(()=>document.querySelector('#ideaStatus').textContent==='Photo details saved.');
 // Invalid files, including malformed images, do not add records.
 await page.locator('#ideaPhotos').setInputFiles({name:'bad.png',mimeType:'image/png',buffer:Buffer.from('not an image')});await page.waitForFunction(()=>document.querySelector('#ideaStatus').textContent.includes('could not be opened'));assert.equal(await page.locator('.idea-card').count(),2);
 // Real quota failures roll back new images and leave the persisted snapshot untouched.
 const before=await page.evaluate(()=>localStorage.getItem('my-event-planner-v1'));
 await page.evaluate(()=>{window.originalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new DOMException('full','QuotaExceededError')}});
 await page.locator('#ideaPhotos').setInputFiles(photo);await page.waitForFunction(()=>document.querySelector('#ideaStatus').textContent.includes('Nothing was changed'));assert.equal(await page.locator('.idea-card').count(),2);assert.equal(await page.evaluate(()=>localStorage.getItem('my-event-planner-v1')),before);
 await page.evaluate(()=>Storage.prototype.setItem=window.originalSetItem);
 await page.getByRole('button',{name:'Delete photo 2',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('.idea-card').length===1);
 for(const width of [320,390,844,1280]){await page.setViewportSize({width,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(await page.locator('#content button,#content input,#content select').evaluateAll(nodes=>nodes.filter(n=>n.getBoundingClientRect().height<44).map(n=>n.outerHTML)),[])}
 await page.getByRole('button',{name:'All events',exact:false}).click();await create('Second event');assert.equal(await page.locator('.idea-card').count(),0);
 const dl=page.waitForEvent('download');await page.getByRole('button',{name:'Export backup',exact:true}).click();const downloaded=await dl;const backup=JSON.parse(fs.readFileSync(await downloaded.path(),'utf8'));assert.equal(backup.events[0].ideas[0].caption,'Sage green <ribbons>');assert.equal(backup.events[0].ideas[0].category,'Decor');
 await page.getByRole('button',{name:'Overview',exact:true}).click();await page.getByRole('button',{name:'Delete event',exact:true}).click();
 await page.locator('#backup').setInputFiles({name:'restore.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});await page.waitForFunction(()=>document.querySelectorAll('.card').length===2);
 // Invalid image URLs are rejected, preserving valid events.
 const bad=structuredClone(backup);bad.events[0].ideas[0].image='https://example.com/photo.jpg';await page.locator('#backup').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bad))});await page.waitForFunction(()=>document.querySelector('#notice').textContent.includes('invalid'));assert.equal(await page.locator('.card').count(),2);
 await context.setOffline(true);await page.reload();await page.getByRole('button',{name:'Plan this event →'}).first().click();await page.getByRole('button',{name:'Ideas',exact:true}).click();assert.equal(await page.locator('.idea-card').count(),1);assert.equal(await page.getByLabel('Caption for photo 1',{exact:true}).inputValue(),'Sage green <ribbons>');assert(await page.locator('.idea-card img').evaluate(i=>i.complete&&i.naturalWidth>0));
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'/tmp/event-planner-ideas.png',fullPage:true});
 // Previous backups with no ideas property still import.
 const legacy=structuredClone(backup);for(const event of legacy.events)delete event.ideas;await page.locator('#backup').setInputFiles({name:'legacy.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(legacy))});await page.waitForSelector('.card');await page.getByRole('button',{name:'Plan this event →'}).first().click();await page.getByRole('button',{name:'Ideas',exact:true}).click();assert.equal(await page.locator('.idea-card').count(),0);
 assert.deepEqual(errors,[]);await browser.close();console.log('PASS: multi-photo upload/compression, captions/categories, deletion, event isolation, quota rollback, invalid photo/import rejection, backup round trip, legacy backups, offline image persistence, mobile gallery/touch targets.');
})().catch(e=>{console.error(e);process.exit(1)});
