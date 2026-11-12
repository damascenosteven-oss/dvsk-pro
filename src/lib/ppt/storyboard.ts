import { z } from 'zod';

export const palette = {
  paper:'#ffffff', ink:'#1d1d1f', mist:'#f5f5f7', blue:'#0071e3', teal:'#30b0c7',
  violet:'#5856d6', sun:'#ff9500', rose:'#ff3b30', green:'#34c759',
} as const;
const color = z.enum(['paper','ink','mist','blue','teal','violet','sun','rose','green']);
export const briefSchema=z.object({prompt:z.string().trim().min(20).max(6000),pageCount:z.number().int().min(6).max(30)});
export const planSchema=z.object({
  title:z.string().trim().min(1).max(90),
  pages:z.array(z.object({
    chapter:z.string().trim().min(1).max(50), title:z.string().trim().min(1).max(64),
    point:z.string().trim().min(1).max(240), visual:z.string().trim().min(1).max(180),
    bridge:z.string().trim().min(1).max(120),
  })).min(6).max(30),
});
export type StoryPlan=z.infer<typeof planSchema>;
const obj=z.object({
  id:z.string().regex(/^[a-z][a-z0-9_-]{0,31}$/),kind:z.enum(['text','number','box','circle','line']),
  text:z.string().max(120),x:z.number().min(0).max(100),y:z.number().min(0).max(100),
  w:z.number().min(1).max(100),h:z.number().min(1).max(100),color,
  size:z.number().min(1.8).max(12),action:z.enum(['appear','rise','draw','travel','pulse']),
  beat:z.number().int().min(0).max(5),
}).strict();
const sceneSchema=z.object({page:z.number().int().min(1).max(30),background:z.enum(['paper','ink','mist']),
  transition:z.enum(['fade','carry','slide']),objects:z.array(obj).min(1).max(14)}).strict();
export type Scene=z.infer<typeof sceneSchema>;
export function groupRange(total:number,completed:number):[number,number]{
  if(!Number.isInteger(total)||total<6||total>30||!Number.isInteger(completed)||completed<0||completed>=total)throw Error('分组页数无效');
  return [completed+1,Math.min(total,completed+10)];
}
export function validateScenes(raw:unknown,first:number,last:number):Scene[]{
  const scenes=z.array(sceneSchema).length(last-first+1).parse(raw);
  for(const [i,scene] of scenes.entries()){
    if(scene.page!==first+i)throw Error('分镜页序与大纲不一致');
    const ids=new Set<string>(),words:Scene['objects']=[];
    for(const o of scene.objects){
      if(ids.has(o.id)||o.x+o.w>100.01||o.y+o.h>100.01)throw Error('对象标识重复或画面越界');
      ids.add(o.id);
      if(o.kind==='text'||o.kind==='number'){
        if(!o.text.trim()||o.color===scene.background)throw Error('正文缺失或不可见');
        for(const t of words)if(Math.min(t.x+t.w,o.x+o.w)>Math.max(t.x,o.x)+.2&&Math.min(t.y+t.h,o.y+o.h)>Math.max(t.y,o.y)+.2)throw Error('正文区域重叠');
        words.push(o);
      }
    }
    if(!words.length)throw Error('分镜缺少可阅读内容');
  }
  return scenes;
}

export function verifyAmounts(source:string,display:string){
  const numbers=(s:string)=>s.normalize('NFKC').replace(/\s+/g,'').match(/[-+]?\d+(?:\.\d+)?(?:个百分点|亿元|万元|元|个月|小时|分钟|千瓦时|人次|件|吨|%)/g)||[];
  if(/演示数据|假设示例/.test(display))return;
  const known=new Set(numbers(source));
  if(numbers(display).some(n=>!known.has(n)))throw Error('数值或单位缺少依据，请核对原文或标注演示数据');
}
export function inspectContinuity(accepted:Scene[],incoming:Scene[],pages:StoryPlan['pages']){
  const slides=[...accepted,...incoming];
  const copy=(s:Scene)=>s.objects.filter(o=>o.text).map(o=>o.text.trim()).join('\n');
  const layout=(s:Scene)=>s.objects.map(o=>[o.kind,Math.round(o.x/5),Math.round(o.y/5),Math.round(o.w/5),o.action,o.beat].join(':')).join('|');
  for(let i=accepted.length;i<slides.length;i++){
    const s=slides[i],prev=slides[i-1],design=pages[i]?.visual||'';
    if(slides.slice(0,i).some(x=>copy(x)===copy(s)))throw Error('正文与前页重复');
    if(s.transition==='carry'&&(!prev||!s.objects.some(o=>prev.objects.some(p=>p.id===o.id&&p.kind===o.kind))))throw Error('跨页对象缺少相邻对应');
    if(i>=2&&layout(prev)===layout(s)&&layout(slides[i-2])===layout(s)&&!/对照|对比|比较/.test(design))throw Error('连续三页构图及动作相同');
  }
}
