import { z } from 'zod';
import { modelTransport } from './model-http';
import { modelSettingsStore } from './model-settings';
import { palette, planSchema, validateScenes, verifyAmounts, type StoryPlan, type Scene } from './storyboard';

async function jsonRequest(instructions:string,input:unknown,maxTokens:number){
  const {config}=await modelSettingsStore().read();
  const endpoint=config.baseUrl+'/chat/completions';
  const standard=config.provider==='deepseek'&&new URL(endpoint).origin==='https://api.deepseek.com'&&config.model==='deepseek-flash';
  const response=await modelTransport.send(endpoint,config.apiKey,{
    model:config.model,stream:false,response_format:{type:'json_object'},
    [config.tokenLimitField]:maxTokens,...(standard?{thinking:{type:'disabled'}}:{}),
    messages:[{role:'system',content:instructions},{role:'user',content:JSON.stringify(input)}],
  },AbortSignal.timeout(90000));
  if(!response.ok)throw Error('模型服务未能完成当前请求');
  const result=z.object({choices:z.array(z.object({finish_reason:z.string().nullish(),message:z.object({content:z.string().min(1)})})).min(1)}).parse(await response.json());
  if(result.choices[0].finish_reason==='length')throw Error('模型分镜输出被截断');
  return JSON.parse(result.choices[0].message.content) as unknown;
}
export async function proposeStory(prompt:string,pageCount:number){
  const result=planSchema.parse(await jsonRequest(
    '为中文商业或教学演示设计全套可编辑故事大纲。把用户口语映射到实际问题并忠实保留原意、数值、单位和期间。没有事实依据时给出待核实项，合成数字标明演示。返回 JSON {title,pages:[{chapter,title,point,visual,bridge}]}。页数必须精确；每一页有独立的问题和结论。visual 描述本页对象及动作，bridge 说明和相邻页的衔接，整个演示沿同一条叙事线展开。提案无需预选模板。标题最多40字，每个其他字段最多100字。', {pageCount,prompt},8000));
  if(result.pages.length!==pageCount)throw Error('大纲页数不符');
  for(const page of result.pages)verifyAmounts(prompt,page.title+' '+page.point);
  return result;
}
export async function produceGroup(plan:StoryPlan,brief:string,first:number,last:number,previous:Scene[]){
  const payload=await jsonRequest(
    '为指定的连续页设计完整中文视觉分镜。只返回 JSON {scenes:[{page,background,transition,objects:[]}]}; page从1计。background=paper|mist|ink；transition=fade|slide|carry；carry 让相邻页的同一id对象从旧位置移到新位置。画面自带标题、章节、公司标志和页码。对象位于标题以下内容区域，x,y,w,h 为0到100的相对百分比，须完整落在区内。每个对象字段必须恰为 {id,kind,text,x,y,w,h,color,size,action,beat}。id 为字母开头的小写英文标识，可包含数字、短横线和下划线；同页唯一。kind=text|number|box|circle|line；非文字 text 置空；size 为整个画布宽度的百分比1.8到12；action=appear|rise|draw|travel|pulse；beat为0到5的整数。用3到8个对象讲清每页，正文区高仅约画布宽度的0.33倍，请给文字足够宽高，正文短句，字不互遮。形状在底层，文字在上。使用提供的色名，确保文字对比度；不要写CSS或代码。重要对象可跨页延续，连续三页避免相同构图和动作，确有比较目的可复用。上下组衔接要连续。内容须符合已审核重点，保持数值、单位与口径准确，额外示例数字标演示。', {brief,plan,first,last,colors:Object.keys(palette),recent:previous.slice(-2)},12000);
  const {scenes}=z.object({scenes:z.array(z.unknown())}).parse(payload);
  const checked=validateScenes(scenes,first,last);
  for(const s of checked){
    const p=plan.pages[s.page-1];
    verifyAmounts(brief+' '+p.title+' '+p.point,s.objects.map(o=>o.text).join(' '));
  }
  return checked;
}
