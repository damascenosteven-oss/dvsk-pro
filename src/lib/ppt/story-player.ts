import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { palette, type Scene, type StoryPlan } from './storyboard';

const runtime=String.raw`
const {plan,scenes,palette}=JSON.parse(document.getElementById('source').textContent);
const frame=document.getElementById('frame'), map=document.getElementById('map');
let at=-1,timer=null,auto=false,originX=null,observer=null;
function closeMap(){observer?.disconnect();observer=null;map.replaceChildren();map.hidden=true}
const reduced=matchMedia('(prefers-reduced-motion:reduce)');
function setAuto(value){
  auto=value;clearTimeout(timer);timer=null;
  document.getElementById('play').textContent=auto?'暂停自动播放':'自动播放';
  if(auto&&at<scenes.length-1&&!document.hidden)timer=setTimeout(()=>show(at+1),7000);
  else if(auto&&at===scenes.length-1)setAuto(false);
}
function show(index){
  if(index<0||index>=scenes.length)return;
  const old=frame.querySelector('article'),previous=new Map();
  const adjacent=at>=0&&index===at+1,scene=scenes[index],info=plan.pages[index];
  if(adjacent&&scene.transition==='carry'&&old)for(const e of old.querySelectorAll('[data-id]'))previous.set(e.dataset.id,e.getBoundingClientRect());
  at=index;closeMap();frame.replaceChildren();
  const page=document.createElement('article');page.dataset.page=index+1;page.style.background=palette[scene.background];
  page.style.color=scene.background==='ink'?palette.paper:palette.ink;frame.append(page);
  const chapter=document.createElement('small');chapter.textContent=info.chapter;page.append(chapter);
  const title=document.createElement('h1');title.textContent=info.title;page.append(title);
  const area=document.createElement('section');page.append(area);
  for(const o of scene.objects){
    const e=document.createElement('div');e.dataset.id=o.id;e.className='object '+o.kind;
    Object.assign(e.style,{left:o.x+'%',top:o.y+'%',width:o.w+'%',height:o.h+'%',fontSize:o.size+'cqw'});
    if(o.kind==='text'||o.kind==='number'){e.style.color=palette[o.color];e.textContent=o.text}
    else e.style.backgroundColor=palette[o.color];
    area.append(e);
    if(!reduced.matches){
      const rect=e.getBoundingClientRect(),prior=previous.get(o.id);
      const effects={appear:[{opacity:0},{opacity:1}],rise:[{opacity:0,transform:'translateY(.8em)'},{opacity:1,transform:'none'}],draw:[{clipPath:'inset(0 100% 0 0)'},{clipPath:'inset(0)'}],travel:[{opacity:0,transform:'translateX(-8cqw)'},{opacity:1,transform:'none'}],pulse:[{opacity:.6,transform:'scale(.96)'},{opacity:1,transform:'none'}]};
      const frames=prior?[{transform:'translate('+(prior.x-rect.x)+'px,'+(prior.y-rect.y)+'px)'},{transform:'none'}]:effects[o.action];
      e.animate(frames,{duration:prior?650:480,delay:prior?0:o.beat*420,fill:'backwards',easing:'ease-out'});
    }
  }
  const logo=document.getElementById('brand').content.cloneNode(true);page.append(logo);
  const pageNo=document.createElement('footer');pageNo.textContent=(index+1)+' / '+scenes.length;page.append(pageNo);
  if(!reduced.matches&&scene.transition!=='carry')page.animate(scene.transition==='slide'?[{transform:'translateX(3%)',opacity:.4},{transform:'none',opacity:1}]:[{opacity:.5},{opacity:1}],{duration:250});
  document.getElementById('back').disabled=!index;document.getElementById('next').disabled=index===scenes.length-1;setAuto(auto);
}
function toggleMap(){
  if(!map.hidden){closeMap();return}
  setAuto(false);map.hidden=false;
  observer=new IntersectionObserver(entries=>{for(const entry of entries){
    const item=entry.target,thumb=item.querySelector('.thumb'),scene=scenes[Number(item.dataset.index)];
    thumb.replaceChildren();if(!entry.isIntersecting)continue;
    thumb.style.backgroundColor=palette[scene.background];
    for(const o of scene.objects){const mini=document.createElement('span');mini.className='mini '+o.kind;
      Object.assign(mini.style,{left:(5+o.x*.9)+'%',top:(29+o.y*.58)+'%',width:(o.w*.9)+'%',height:(o.h*.58)+'%',fontSize:o.size+'cqw'});
      if(o.kind==='text'||o.kind==='number'){mini.style.color=palette[o.color];mini.textContent=o.text}
      else mini.style.backgroundColor=palette[o.color];thumb.append(mini)}
  }},{root:map});
  plan.pages.forEach((page,i)=>{const button=document.createElement('button');button.dataset.index=i;
    const thumb=document.createElement('span');thumb.className='thumb';thumb.setAttribute('aria-hidden','true');button.append(thumb,document.createTextNode((i+1)+'. '+page.title));button.onclick=()=>show(i);map.append(button);observer.observe(button)});
  map.children[at]?.scrollIntoView({block:'nearest'});
}
document.getElementById('list').onclick=toggleMap;
document.getElementById('back').onclick=()=>show(at-1);document.getElementById('next').onclick=()=>show(at+1);
document.getElementById('play').onclick=()=>setAuto(!auto);
addEventListener('keydown',e=>{if(e.key==='Escape'&&!map.hidden){toggleMap();return}if(!map.hidden)return;
 if(e.key==='ArrowRight')show(at+1);if(e.key==='ArrowLeft')show(at-1)});
frame.addEventListener('pointerdown',e=>{originX=e.clientX});
frame.addEventListener('pointercancel',()=>{originX=null});
frame.addEventListener('pointerup',e=>{if(originX!==null&&Math.abs(e.clientX-originX)>45)show(at+(e.clientX<originX?1:-1));originX=null});
document.addEventListener('visibilitychange',()=>{if(document.hidden)setAuto(false)});
addEventListener('pagehide',()=>setAuto(false));show(0);`;

export async function renderStory(plan:StoryPlan,scenes:Scene[]){
  const logo=(await readFile(path.join(process.cwd(),'public','yuling-logo.png'))).toString('base64');
  const data=JSON.stringify({plan,scenes,palette}).replaceAll('<','\\u003c');
  return Buffer.from(`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DVSK Pro · 播放</title><style>
*{box-sizing:border-box}body{margin:0;height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#171826;font-family:system-ui,"Microsoft YaHei",sans-serif}#frame{width:min(100vw,calc((100dvh - 52px)*16/9));aspect-ratio:16/9;container-type:inline-size;position:relative;touch-action:pan-y}article{position:absolute;inset:0;overflow:hidden}small,h1,footer,.logo,section{position:absolute}small{left:5%;top:4%;font-weight:700;font-size:1.4cqw}h1{left:5%;top:9%;width:90%;margin:0;font-size:3.7cqw;line-height:1.16;text-wrap:balance}section{left:5%;top:29%;width:90%;height:58%}.object{position:absolute;line-height:1.15;overflow-wrap:anywhere;white-space:pre-line}.text,.number{z-index:1}.number{font-weight:750;font-variant-numeric:tabular-nums}.box{border-radius:1cqw}.circle{border-radius:50%}.logo{left:5%;bottom:4%;height:5%;width:auto}footer{right:5%;bottom:4%;font-size:1.4cqw}nav{display:flex;gap:4px;align-items:center;height:48px}button{background:#252836;color:white;border:1px solid #64697a;border-radius:6px;padding:6px 10px;cursor:pointer}button:disabled{opacity:.45}#map{position:fixed;inset:8% 6% 58px;background:#171826;overflow:auto;padding:15px;z-index:3}#map button{margin:4px;width:min(180px,40vw);vertical-align:top}.thumb{display:block;position:relative;width:100%;aspect-ratio:16/9;container-type:inline-size;overflow:hidden;margin-bottom:5px}.mini{position:absolute;text-align:left;line-height:1.15;overflow:hidden}
</style><div id="frame"></div><nav><button id="back">上一页</button><button id="list">页码目录</button><button id="play">自动播放</button><button id="next">下一页</button></nav><aside id="map" hidden></aside><template id="brand"><img class="logo" alt="毓灵" src="data:image/png;base64,${logo}"></template><script id="source" type="application/json">${data}</script><script>${runtime}</script></html>`);
}
