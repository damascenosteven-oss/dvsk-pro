import { z } from 'zod';

export type GroupRange = {first:number; last:number};
type Stage = 'envelope' | 'body' | 'list' | 'scene' | 'upstream';
type Rule = keyof typeof rules;
const rules = {
  rejected:'模型服务拒绝了分组请求', truncated:'分镜输出被截断',
  missing:'缺少必填字段', unsupported:'取值不受支持', unknown_field:'存在未支持字段',
  count:'页数不符', invalid_json:'无法解析 JSON', type:'字段类型不符',
  too_small:'低于允许下限', too_big:'超出允许上限', format:'字段格式不符',
};
type Finding = {path:string; rule:Rule; page?:number; object?:number};
const names = new Set('choices message tool_calls function name type arguments content finish_reason scenes page background transition objects id kind text x y w h color size action beat'.split(' '));

export class GroupFormatError extends Error {
  constructor(readonly range:GroupRange, readonly stage:Stage, readonly issues:Finding[],
    readonly omitted=0, readonly counts?:{expected:number;actual:number}) {
    super('Group format validation failed');
  }
  feedback(requestId:string) {
    const {first,last}=this.range;
    const issue=this.issues[0];
    const location=issue.page ? '第 '+issue.page+' 页'+(issue.object?'第 '+issue.object+' 个对象':'')+'，' : '';
    const field=issue.path.endsWith('.action')?'动画动作':issue.path;
    const explanation=issue.rule==='missing'?'缺少'+field:field+' '+rules[issue.rule];
    const detail=this.counts ? '页数不符，预期 '+this.counts.expected+'、实际 '+this.counts.actual :
      this.stage==='body' ? '模型正文无法解析 JSON' : location+explanation;
    return '第 '+first+'～'+last+' 页未完成：'+detail+'。已保存 '+(first-1)+' 页，可继续本组。（'+requestId+'）';
  }
}

export function groupSchemaError(range:GroupRange,stage:Stage,raw:unknown,error:z.ZodError){
  const seen=new Set<string>(), issues:Finding[]=[];
  for(const issue of error.issues){
    let path=stage==='scene'?'scenes':'', value=raw;
    let page:number|undefined, object:number|undefined;
    for(const key of issue.path){
      if(typeof key==='number'){
        if(!Array.isArray(value)||!Number.isSafeInteger(key)||key<0||key>=value.length)break;
        if(path==='scenes' && key<=range.last-range.first)page=range.first+key;
        if(page && path.endsWith('.objects'))object=key+1;
        path+='['+key+']'; value=value[key];
      }else if(typeof key==='string' && names.has(key)){
        path+=(path?'.':'')+key;
        value=value && typeof value==='object' && Object.prototype.hasOwnProperty.call(value,key) ? (value as Record<string,unknown>)[key] : undefined;
      }else break;
    }
    const rule:Rule=issue.code==='unrecognized_keys'?'unknown_field':value===undefined?'missing':
      issue.code==='invalid_value'?'unsupported':issue.code==='invalid_type'?'type':
      issue.code==='too_big'?'too_big':issue.code==='too_small'?'too_small':'format';
    path ||= stage==='envelope'?'response':'scenes';
    const identity=path+'|'+rule;
    if(seen.has(identity))continue;
    seen.add(identity);
    if(issues.length<5)issues.push({path,rule,page,object});
  }
  return new GroupFormatError(range,stage,issues,seen.size-issues.length);
}
