// End-to-end test of production Next routes. Only the external model and COS are replaced.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright-core';

const root=await mkdtemp(path.join(os.tmpdir(),'dvsk-story-test-'));
const port=Number(process.env.STORY_TEST_PORT||3487),base='http://127.0.0.1:'+port;
const chrome=[process.env.PPT_CHROME_PATH,'/usr/bin/google-chrome','/usr/bin/chromium','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(x=>x&&existsSync(x));
assert(chrome,'Chrome required');
const fixture=new URL('../deploy/test/outline-entry-fixture.mjs',import.meta.url).href;
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
  const diagnostics=await browser.newContext();
  const post=data=>diagnostics.request.post(base+'/api/ppt/story',{data});
  assert.equal((await diagnostics.request.post(base+'/api/ppt/session',{data:{password:'fixture-invite'}})).status(),200);
  const outline=await post({op:'outline',prompt:'分组格式测试，向新员工讲解投诉处理中的工作职责与交接流程。',pageCount:30});
  assert.equal(outline.status(),200);
  const {id,plan}=await outline.json();
  for(const [index,stage,path,rule] of [
    [0,'envelope','choices','missing'],[1,'body','content','invalid_json'],
    [2,'list','scenes','missing'],[3,'list','scenes','count'],
    [4,'scene','scenes[2].objects[1].action','missing'],
    [5,'scene','scenes[2].objects[1].action','unsupported'],
    [6,'scene','scenes[0].objects[0]','unknown_field'],
    [7],[8,'scene','scenes[2].objects[1].action','missing'],
  ]){
    const completed=index===8?10:0;
    const res=await post({op:'step',id,completed,plan});
    if(index===7){assert.equal(res.status(),200);assert.equal((await res.json()).completed,10);continue}
    assert.equal(res.status(),502);
    const {error}=await res.json();
    assert.ok(error.includes('已保存 '+completed+' 页'),error);
    const requestId=error.match(/[0-9a-f-]{36}/)?.[0];
    assert.ok(requestId,'missing request ID');
    const line=log.split('\n').find(line=>line.includes(requestId));
    const event=JSON.parse(line.slice(line.indexOf('{')));
    assert.equal(event.stage,stage);
    assert.equal(event.issues[0].path,path);
    assert.equal(event.issues[0].rule,rule);
    if(index===3)assert.match(error,/预期 10.*实际 9/);
    if([4,5,8].includes(index))assert.ok(error.includes('第 '+(completed+3)+' 页第 2 个对象'));
    if(index===6){assert.equal(event.issues.length,5);assert.equal(event.omitted,5)}
    assert.ok(!(log+error).includes('PRIVATE_DRAFT_BODY_SENTINEL'));
    const saved=await (await post({op:'read',id})).json();
    assert.equal(saved.completed,completed);assert.equal(saved.code,undefined);
  }
  assert.equal((log.match(/STORY_CALL /g)||[]).length,10);
  const loginState=await diagnostics.storageState();
  await diagnostics.close();console.log('PASS group failures and durable progress');
  const normalStart=log.length;
  for(const n of [6,12,13,21,30]){
    const ctx=await browser.newContext({viewport:{width:1280,height:800},reducedMotion:'reduce'}),tab=await ctx.newPage();
    const bad=await ctx.request.post(base+'/api/ppt/story',{data:{op:'read',id:'not-a-uuid'}});assert.equal(bad.status(),401);
    if(n===6)await ctx.addCookies(loginState.cookies);
    else {const login=await ctx.request.post(base+'/api/ppt/session',{data:{password:'fixture-invite'}});assert.equal(login.status(),200)}
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
    const calls=[...log.slice(normalStart).matchAll(/STORY_CALL (\{[^\r\n]+\})/g)].map(m=>JSON.parse(m[1])).filter(v=>v.count===n).map(v=>v.start);
    assert.deepEqual(calls,[0,...Array.from({length:Math.ceil(n/10)},(_,i)=>1+i*10)]);
    console.log('PASS',n,'pages, one work, approved content, production HTTP, share, map and narrow viewport');await ctx.close();
  }
} catch(e){console.error(log.split('\n').filter(line=>/Error|story_failed|STORY_CALL|failed|Ready in/.test(line)).slice(-30).join('\n'));throw e}
finally{await browser?.close();server.kill();await exited;await rm(root,{recursive:true,force:true})}
