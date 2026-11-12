// End-to-end test of production Next routes. Only the external model and COS are replaced.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright-core';

const root=await mkdtemp(path.join(os.tmpdir(),'dvsk-story-test-'));
const port=Number(process.env.STORY_TEST_PORT||3487),base='http://127.0.0.1:'+port;
const chrome=[process.env.PPT_CHROME_PATH,'/usr/bin/google-chrome','/usr/bin/chromium','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(x=>x&&existsSync(x));
assert(chrome,'Chrome required');
const fixture=pathToFileURL(path.resolve('deploy/test/outline-entry-fixture.mjs')).href;
const server=spawn(process.execPath,['--import',fixture,'node_modules/next/dist/bin/next','start','-H','127.0.0.1','-p',String(port)],{env:{...process.env,
 OUTLINE_FIXTURE_CASE:'story',PPT_MODEL_SETTINGS_DIR:path.join(root,'no-saved-settings'),PPT_STORY_DRAFTS_DIR:path.join(root,'private-drafts'),
 PPT_CHROME_PATH:chrome,PPT_INVITE_PASSWORD:'fixture-invite',PPT_SESSION_SECRET:'fixture-session-secret-for-http-test',
 DEEPSEEK_API_KEY:'fixture-key',DEEPSEEK_MODEL:'deepseek-flash',DEEPSEEK_BASE_URL:'https://api.deepseek.com',
 COS_BUCKET:'fixture-bucket',COS_REGION:'ap-shanghai',COS_SECRET_ID:'fixture-id',COS_SECRET_KEY:'fixture-secret',
},stdio:['ignore','pipe','pipe']});
let log='';for(const stream of [server.stdout,server.stderr])stream.on('data',chunk=>{log=(log+chunk).slice(-60000)});
const exited=new Promise(resolve=>server.once('exit',resolve));let browser;
try{
  for(let i=0;i<80;i++){if(server.exitCode!==null)throw Error('test server exited');if(await fetch(base+'/api/health').then(r=>r.ok).catch(()=>false))break;await delay(250)}
  browser=await chromium.launch({executablePath:chrome,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  for(const n of [6,12,13,21,30]){
    const ctx=await browser.newContext({viewport:{width:1280,height:800},reducedMotion:'reduce'}),tab=await ctx.newPage();
    const bad=await ctx.request.post(base+'/api/ppt/story',{data:{op:'read',id:'not-a-uuid'}});assert.equal(bad.status(),401);
    const login=await ctx.request.post(base+'/api/ppt/session',{data:{password:'fixture-invite'}});assert.equal(login.status(),200);
    await tab.goto(base+'/ppt');await tab.getByRole('link',{name:'创作 6～30 页 PPT'}).click();
    await tab.getByLabel('主题与要求').fill('新员工投诉处理培训，从部门交接走向专人负责，每一步有明确的角色与行动。');
    await tab.getByLabel('页数').selectOption(String(n));await tab.getByRole('button',{name:'生成创意大纲'}).click();
    await tab.getByLabel('讲述重点',{exact:true}).first().fill('先记录客户诉求，交给唯一负责人');
    await tab.getByRole('button',{name:'确认大纲并制作整套'}).click();
    if(n===21){
      await tab.getByRole('alert').filter({hasText:'当前分组未完成'}).waitFor({timeout:120000});await tab.getByRole('button',{name:'继续制作'}).waitFor();await tab.reload();await tab.getByText(/已完成 10 \/ 21 页/).waitFor();
      await tab.getByRole('button',{name:'继续制作'}).click();
    }
    const share=tab.getByRole('link',{name:/播放与分享/});await share.waitFor({timeout:180000});
    await share.click();const player=tab.frameLocator('iframe');await player.locator('article[data-page="1"]').waitFor();
    assert.match(await player.locator('article').innerText(),/先记录客户诉求/);
    await player.locator('#list').click();assert.equal(await player.locator('#map button').count(),n);
    await player.locator('#map button').last().click();assert.equal(await player.locator('article').count(),1);
    assert.equal(await player.locator('footer').innerText(),n+' / '+n);assert.equal(await player.locator('#map button').count(),0);
    await tab.setViewportSize({width:390,height:844});await player.locator('#back').click();await player.locator('#next').click();assert.equal(await player.locator('article').getAttribute('data-page'),String(n));
    const calls=[...log.matchAll(/STORY_CALL (\{[^\r\n]+\})/g)].map(m=>JSON.parse(m[1])).filter(v=>v.count===n).map(v=>v.start);
    assert.deepEqual(calls,[0,...Array.from({length:Math.ceil(n/10)},(_,i)=>1+i*10)]);
    console.log('PASS',n,'pages, one work, approved content, production HTTP, share, map and narrow viewport');await ctx.close();
  }
} catch(e){console.error(log.split('\n').filter(line=>/Error|story_failed|STORY_CALL|failed|Ready in/.test(line)).slice(-30).join('\n'));throw e}
finally{await browser?.close();server.kill();await exited;await rm(root,{recursive:true,force:true})}
