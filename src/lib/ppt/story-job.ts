import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { allocateShareCode, RETENTION_MS, saveDeck, saveDeckHistory } from './storage';
import { produceGroup, proposeStory } from './story-model';
import { groupRange, inspectContinuity, planSchema, type Scene, type StoryPlan } from './storyboard';
import { renderStory } from './story-player';
import { checkStoryGeometry } from './story-qa';

type Job={version:1;id:string;owner:string;brief:string;plan:StoryPlan;confirmed:boolean;scenes:Scene[];created:number;code?:string;published?:boolean};
export class StoryError extends Error{constructor(message:string,readonly status=422){super(message)}}
const active=new Set<string>();
async function directory(){
  const root=process.env.PPT_STORY_DRAFTS_DIR || path.join(process.env.PPT_MODEL_SETTINGS_DIR||'/var/lib/yuling-ppt/model-settings','story-drafts');
  await mkdir(root,{recursive:true,mode:0o700});return root;
}
async function jobPath(id:string,owner:string){
  if(!/^[a-f\d-]{36}$/.test(id)||!/^[a-f\d]{64}$/.test(owner))throw new StoryError('未找到草稿',404);
  return path.join(await directory(),owner+'-'+id+'.json');
}
async function persist(job:Job){
  const dest=await jobPath(job.id,job.owner),tmp=dest+'.'+randomUUID()+'.tmp';
  try{await writeFile(tmp,JSON.stringify(job),{flag:'wx',mode:0o600});await rename(tmp,dest)}
  finally{await unlink(tmp).catch((e:NodeJS.ErrnoException)=>{if(e.code!=='ENOENT')throw e})}
}
async function load(id:string,owner:string):Promise<Job>{
  const file=await jobPath(id,owner);
  let data:string;
  try{data=await readFile(file,'utf8')}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')throw new StoryError('未找到这台设备的草稿',404);throw e}
  const j=JSON.parse(data) as Job;
  if(j.version!==1||j.owner!==owner||j.id!==id)throw new StoryError('草稿校验失败');
  if(Date.now()-j.created>=RETENTION_MS){await unlink(file);throw new StoryError('草稿已到期',410)}
  return j;
}
function status(j:Job){return {id:j.id,plan:j.plan,confirmed:j.confirmed,completed:j.scenes.length,total:j.plan.pages.length,code:j.published?j.code:undefined}}
export async function startStory(owner:string,brief:string,count:number){
  const plan=await proposeStory(brief,count);
  const job:Job={version:1,owner,id:randomUUID(),brief,plan,created:Date.now(),confirmed:false,scenes:[]};
  await persist(job);return status(job);
}
export async function readStory(owner:string,id:string){return status(await load(id,owner))}
export async function stepStory(owner:string,id:string,completed:number,edited?:StoryPlan){
  if(active.size)throw new StoryError('正在制作其他分组，请稍后继续',409);
  active.add(id);
  try{
    const j=await load(id,owner);
    if(j.published||completed<j.scenes.length)return status(j);
    if(completed!==j.scenes.length)throw new StoryError('进度已变化，请刷新',409);
    if(!j.confirmed){
      const approved=planSchema.parse(edited);
      if(approved.pages.length!==j.plan.pages.length)throw new StoryError('审阅后页数须与约定一致');
      j.plan=approved;j.confirmed=true;await persist(j);
    }
    if(completed<j.plan.pages.length){
      const [first,last]=groupRange(j.plan.pages.length,completed);
      const scenes=await produceGroup(j.plan,j.brief,first,last,j.scenes);
      inspectContinuity(j.scenes,scenes,j.plan.pages);
      const partial={title:j.plan.title,pages:j.plan.pages.slice(first-1,last)};
      await checkStoryGeometry(await renderStory(partial,scenes),scenes.length);
      j.scenes.push(...scenes);await persist(j);
    }
    if(j.scenes.length===j.plan.pages.length){
      if(!j.code){j.code=await allocateShareCode();await persist(j)}
      const html=await renderStory(j.plan,j.scenes),createdAt=new Date(j.created).toISOString();
      const expiresAt=await saveDeck(j.code,html,j.plan.title,{ownerHash:owner,now:j.created,format:'story-v1',researchStatus:'not-required'});
      await saveDeckHistory(owner,{code:j.code,title:j.plan.title,createdAt,expiresAt,researchStatus:'not-required',motionProfile:'创意分镜'});
      j.published=true;await persist(j);
    }
    return status(j);
  }finally{active.delete(id)}
}
