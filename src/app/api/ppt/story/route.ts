import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { deviceIdentity, DEVICE_COOKIE, DEVICE_MAX_AGE_SECONDS, isAuthenticated } from '@/lib/ppt/auth';
import { clientAddress, consumeRateLimit } from '@/lib/ppt/rate-limit';
import { briefSchema, planSchema } from '@/lib/ppt/storyboard';
import { readStory, startStory, stepStory, StoryError } from '@/lib/ppt/story-job';

export const runtime='nodejs';
const command=z.discriminatedUnion('op',[
  briefSchema.extend({op:z.literal('outline')}),
  z.object({op:z.literal('read'),id:z.string().uuid()}),
  z.object({op:z.literal('step'),id:z.string().uuid(),completed:z.number().int().min(0).max(30),plan:planSchema.optional()}),
]);
export async function POST(req:NextRequest){
  if(!isAuthenticated(req))return NextResponse.json({error:'请先输入邀请码'},{status:401});
  if(!req.headers.get('content-type')?.startsWith('application/json'))return NextResponse.json({error:'请输入 JSON 请求'},{status:415});
  const parsed=command.safeParse(await req.json().catch(()=>null));
  if(!parsed.success)return NextResponse.json({error:'请检查需求、大纲字段及 6～30 的页数范围'},{status:422});
  const c=parsed.data,device=deviceIdentity(req);
  if(c.op!=='read'&&!consumeRateLimit('story:'+c.op+':'+clientAddress(req.headers),c.op==='outline'?10:40,3600000))
    return NextResponse.json({error:'本小时生成次数已用完'},{status:429});
  try{
    const result=c.op==='outline'?await startStory(device.ownerHash,c.prompt,c.pageCount):
      c.op==='read'?await readStory(device.ownerHash,c.id):await stepStory(device.ownerHash,c.id,c.completed,c.plan);
    const res=NextResponse.json(result,{headers:{'Cache-Control':'private, no-store'}});
    if(device.cookieValue)res.cookies.set(DEVICE_COOKIE,device.cookieValue,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/',maxAge:DEVICE_MAX_AGE_SECONDS});
    return res;
  }catch(e){
    if(e instanceof StoryError)return NextResponse.json({error:e.message},{status:e.status});
    const requestId=crypto.randomUUID();
    console.error('story_failed',{requestId,operation:c.op,completed:c.op==='step'?c.completed:undefined,kind:e instanceof z.ZodError?'schema':e instanceof Error?e.name:'unknown'});
    const msg=c.op==='step'?'当前分组未完成。已保存的页可以继续使用，请查看进度后继续。':'未能读取或生成大纲，请检查模型配置后重试。';
    return NextResponse.json({error:msg+'（'+requestId.slice(0,8)+'）'},{status:502});
  }
}
