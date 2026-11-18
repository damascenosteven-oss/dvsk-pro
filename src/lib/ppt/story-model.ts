import { z } from 'zod';
import { modelTransport } from './model-http';
import { modelSettingsStore } from './model-settings';
import { palette, sceneActions, pageTransitions, planSchema, validateScenes, verifyAmounts, type StoryPlan, type Scene } from './storyboard';

import { GroupFormatError, groupSchemaError, type GroupRange } from './group-feedback';

import { readSceneArguments, strictSceneRequest } from './scene-tool';

async function jsonRequest(instructions:string,input:unknown,maxTokens:number,range?:GroupRange){
  const {config}=await modelSettingsStore().read();
  const endpoint=config.baseUrl+'/chat/completions';
  const standard=config.provider==='deepseek'&&new URL(endpoint).origin==='https://api.deepseek.com'&&config.model==='deepseek-flash';
  const strict=range && standard && ['https://api.deepseek.com','https://api.deepseek.com/v1','https://api.deepseek.com/beta'].includes(config.baseUrl);
  const target=strict?'https://api.deepseek.com/beta/chat/completions':endpoint;
  const response=await modelTransport.send(target,config.apiKey,{
    model:config.model,stream:false,...(strict?strictSceneRequest:{response_format:{type:'json_object'}}),
    [config.tokenLimitField]:maxTokens,...(standard?{thinking:{type:'disabled'}}:{}),
    messages:[{role:'system',content:instructions},{role:'user',content:JSON.stringify(input)}],
  },AbortSignal.timeout(90000));
  if(!response.ok){
    if(strict)throw new GroupFormatError(range,'upstream',[{path:'response',rule:'rejected'}]);
    throw Error('模型服务未能完成当前请求');
  }
  let raw:unknown;
  try { raw=await response.json(); } catch(error) {
    if(range && error instanceof SyntaxError)throw new GroupFormatError(range,'envelope',[{path:'response',rule:'invalid_json'}]);
    throw error;
  }
  let content:string;
  if(strict)content=readSceneArguments(raw,range);
  else {
    const parsed=z.object({choices:z.array(z.object({finish_reason:z.string().nullish(),message:z.object({content:z.string().min(1)})})).min(1)}).safeParse(raw);
    if(!parsed.success)throw range ? groupSchemaError(range,'envelope',raw,parsed.error) : parsed.error;
    const choice=parsed.data.choices[0];
    if(choice.finish_reason==='length')throw Error('模型分镜输出被截断');
    content=choice.message.content;
  }
  try { return JSON.parse(content) as unknown; } catch(error) {
    if(range && error instanceof SyntaxError){
      if(strict){
        const empty=/^[\t\n\r ]*$/.test(content);
        const message=error.message;
        const match=message.match(/(?: in JSON at position | in JSON at position | at position )(\d+) \(line \d+ column \d+\)/);
        const offset=match && Number.isSafeInteger(Number(match[1])) && Number(match[1])<=content.length ? Number(match[1]) : null;
        const unfinished=!empty && (/^Unexpected end of JSON input$/.test(message) || /^Unterminated string in JSON at position \d+ \(line \d+ column \d+\)$/.test(message) && offset===content.length);
        throw new GroupFormatError(range,'body',[{path:'arguments',rule:'invalid_json'}],0,undefined,
          {reason:empty?'empty':unfinished?'unfinished':'syntax',length:content.length,offset});
      }
      throw new GroupFormatError(range,'body',[{path:'content',rule:'invalid_json'}]);
    }
    throw error;
  }
}
export async function proposeStory(prompt:string,pageCount:number){
  const result=planSchema.parse(await jsonRequest(
    '为中文商业或教学演示设计全套可编辑故事大纲。把用户口语映射到实际问题并忠实保留原意、数值、单位和期间。没有事实依据时给出待核实项，合成数字标明演示。返回 JSON {title,pages:[{chapter,title,point,visual,bridge}]}。页数必须精确；每一页有独立的问题和结论。visual 描述本页对象及动作，bridge 说明和相邻页的衔接，整个演示沿同一条叙事线展开。提案无需预选模板。标题最多40字，每个其他字段最多100字。', {pageCount,prompt},8000));
  if(result.pages.length!==pageCount)throw Error('大纲页数不符');
  for(const page of result.pages)verifyAmounts(prompt,page.title+' '+page.point);
  return result;
}
const exampleScene:Scene = {
  page:1, background:'paper', transition:'fade',
  objects:[
    {id:'route', kind:'line', text:'', x:8, y:44, w:82, h:2, color:'blue', size:2, action:'draw', beat:0},
    {id:'ticket', kind:'text', text:'客户工单', x:8, y:12, w:36, h:28, color:'ink', size:3, action:'travel', beat:1},
    {id:'owner', kind:'text', text:'交给负责人', x:52, y:52, w:40, h:30, color:'ink', size:3, action:'pulse', beat:2},
  ],
};

export async function produceGroup(plan:StoryPlan,brief:string,first:number,last:number,previous:Scene[]){
  const range={first,last};
  const payload=await jsonRequest(
    `为指定的连续页设计完整中文视觉分镜。以 JSON 表示 {scenes:[{page,background,transition,objects:[]}]}; page从1计。background=paper|mist|ink；transition=${pageTransitions.join('|')}；carry 让相邻页的同一id对象从旧位置移到新位置。画面自带标题、章节、公司标志和页码。对象位于标题以下内容区域，x,y,w,h 为0到100的相对百分比，须完整落在区内。每个对象字段必须恰为 {id,kind,text,x,y,w,h,color,size,action,beat}。id 为字母开头的小写英文标识，可包含数字、短横线和下划线；同页唯一。kind=text|number|box|circle|line；非文字 text 置空；size 为整个画布宽度的百分比1.8到12；对象 action=${sceneActions.join('|')}；beat为0到5的整数。用3到8个对象讲清每页，正文区高仅约画布宽度的0.33倍，请给文字足够宽高，正文短句，字不互遮。形状在底层，文字在上。使用提供的色名，确保文字对比度；不要写CSS或代码。重要对象可跨页延续，连续三页避免相同构图和动作，确有比较目的可复用。上下组衔接要连续。内容须符合已审核重点，保持数值、单位与口径准确，额外示例数字标演示。单页示例：${JSON.stringify(exampleScene)}。`, {brief,plan,first,last,colors:Object.keys(palette),recent:previous.slice(-2)},12000,range);
  const list=z.object({scenes:z.array(z.unknown())}).safeParse(payload);
  if(!list.success)throw groupSchemaError(range,'list',payload,list.error);
  const {scenes}=list.data;
  const expected=last-first+1;
  if(scenes.length!==expected)throw new GroupFormatError(range,'list',[{path:'scenes',rule:'count'}],0,{expected,actual:scenes.length});
  let checked:Scene[];
  try { checked=validateScenes(scenes,first,last); } catch(error) {
    if(error instanceof z.ZodError)throw groupSchemaError(range,'scene',scenes,error);
    throw error;
  }
  for(const s of checked){
    const p=plan.pages[s.page-1];
    verifyAmounts(brief+' '+p.title+' '+p.point,s.objects.map(o=>o.text).join(' '));
  }
  return checked;
}
