import { z } from 'zod';
import { GroupFormatError, groupSchemaError, type GroupRange } from './group-feedback';
import { palette, pageTransitions, sceneActions } from './storyboard';

const name = 'submit_scenes';
const string = {type:'string'};
const number = {type:'number'};
const integer = {type:'integer'};
function enumeration(values:readonly string[]) { return {type:'string', enum:values}; }
function record(properties:Record<string,unknown>) {
  return {type:'object', properties, required:Object.keys(properties), additionalProperties:false};
}
const object = record({
  id:string, kind:enumeration(['text','number','box','circle','line']), text:string,
  x:number, y:number, w:number, h:number, color:enumeration(Object.keys(palette)),
  size:number, action:enumeration(sceneActions), beat:integer,
});
const scene = record({
  page:integer, background:enumeration(['paper','mist','ink']), transition:enumeration(pageTransitions),
  objects:{type:'array',items:object},
});
export const strictSceneRequest = {
  thinking:{type:'disabled'},
  tools:[{type:'function',function:{name,strict:true,description:'提交指定页的完整视觉分镜',parameters:record({scenes:{type:'array',items:scene}})}}],
  tool_choice:{type:'function',function:{name}},
};

const envelope=z.object({choices:z.array(z.object({finish_reason:z.string(),message:z.unknown()})).length(1)});
const message=z.object({tool_calls:z.array(z.object({
  type:z.literal('function'),function:z.object({name:z.literal(name),arguments:z.string()}),
})).length(1)});

export function readSceneArguments(raw:unknown,range:GroupRange) {
  const parsed=envelope.safeParse(raw);
  if(!parsed.success)throw groupSchemaError(range,'envelope',raw,parsed.error);
  const choice=parsed.data.choices[0];
  if(choice.finish_reason==='length')throw new GroupFormatError(range,'envelope',[{path:'finish_reason',rule:'truncated'}]);
  const calls=message.safeParse(choice.message);
  if(!calls.success)throw groupSchemaError(range,'envelope',choice.message,calls.error);
  if(choice.finish_reason!=='tool_calls')throw new GroupFormatError(range,'envelope',[{path:'finish_reason',rule:'unsupported'}]);
  return calls.data.tool_calls[0].function.arguments;
}
