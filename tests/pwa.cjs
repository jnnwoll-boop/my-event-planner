const { chromium, devices } = require('playwright');
const assert = require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 const context=await browser.newContext({...devices['iPhone 13'],defaultBrowserType:undefined});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await page.goto('http://127.0.0.1:8000/');
 assert.equal(await page.locator('#backup').isVisible(),false);
 await page.evaluate(()=>navigator.serviceWorker.ready);
 await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
 const manifest=await page.evaluate(async()=> (await fetch('manifest.webmanifest')).json());
 assert.equal(manifest.display,'standalone');assert.equal(manifest.icons.length,3);
 for(const icon of [...manifest.icons,{src:'icons/apple-touch-icon.png',sizes:'180x180'}]){
  const actual=await page.evaluate(async src=>{const i=new Image();i.src=src;await i.decode();return `${i.naturalWidth}x${i.naturalHeight}`},icon.src);assert.equal(actual,icon.sizes);
 }
 await page.getByRole('button',{name:'Install app',exact:true}).tap();assert.match(await page.locator('#installHelp').innerText(),/Add to Home Screen/);await page.getByRole('button',{name:'Close installation help'}).tap();
 await page.getByRole('button',{name:'Create your first event'}).tap();await page.locator('[name=name]').fill('A long mobile celebration name that should wrap comfortably');await page.locator('[name=date]').fill('2027-05-02');await page.getByRole('button',{name:'Save event',exact:true}).tap();
 for(const width of [320,375,390,430,844,1280]){
  await page.setViewportSize({width,height:844});
  for(const name of ['Overview','Food & drinks','Shopping list','Preparation']){
   await page.getByRole('button',{name,exact:true}).click();
   if(name==='Shopping list' && width===320){await page.locator('#itemForm [name=name]').fill('Large shopping item name to check mobile wrapping');await page.locator('[name=price]').fill('12');await page.getByRole('button',{name:'Add item',exact:true}).click()}
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${width}px ${name} overflow`);
   const short=await page.locator('button:visible,input:visible,select:visible').evaluateAll(nodes=>nodes.filter(n=>n.getBoundingClientRect().height<44).map(n=>n.outerHTML));assert.deepEqual(short,[],`Touch targets at ${width}px ${name}`);
  }
 }
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'/tmp/my-event-planner-pwa-mobile.png',fullPage:true});
 await context.setOffline(true);await page.reload();await page.getByRole('button',{name:'Plan this event →'}).tap();await page.getByRole('button',{name:'Shopping list',exact:true}).tap();await page.getByLabel('Purchased Large shopping item name to check mobile wrapping',{exact:true}).check();await page.reload();await page.getByRole('button',{name:'Plan this event →'}).tap();await page.getByRole('button',{name:'Overview',exact:true}).tap();assert.match(await page.locator('.stats').innerText(),/\$12.00/);
 const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Export backup',exact:true}).tap();const d=await downloadPromise;assert.equal(d.suggestedFilename(),'my-event-planner-backup.json');
 assert.deepEqual(errors,[]);await browser.close();console.log('PASS: manifest, PNG dimensions, install help, 320–1280px event sections, 44px targets, offline reload/edit/persistence/export, no browser errors. Chromium iPhone emulation; not a physical iPhone test.');
})().catch(e=>{console.error(e);process.exit(1)});
