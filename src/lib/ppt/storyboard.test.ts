import test from 'node:test';
import assert from 'node:assert/strict';
import { briefSchema, groupRange, validateScenes, inspectContinuity, verifyAmounts, type Scene } from './storyboard';

for (const n of [6,12,13,21,30]) test(`one brief and contiguous production groups for ${n} pages`, () => {
  assert(briefSchema.safeParse({prompt:'新员工投诉处理培训：从交接到专人负责，演示沟通与回访过程。',pageCount:n}).success);
  const pages:number[]=[];
  while(pages.length<n){const [first,last]=groupRange(n,pages.length);assert(last-first<10);for(let i=first;i<=last;i++)pages.push(i);}
  assert.deepEqual(pages,Array.from({length:n},(_,i)=>i+1));
});
test('numeric values must keep the supplied unit or carry a visible demo label',()=>{
  assert.throws(()=>verifyAmounts('节省 14 万元','节省 14 亿元'),/数值/);
  verifyAmounts('节省 14 万元','节省14万元');
  verifyAmounts('','演示数据：节省 9 万元');
});
const scene=(page:number):Scene=>({page,background:'paper',transition:'fade',objects:[{id:'ticket',kind:'text',text:'一次交接',x:5,y:8,w:65,h:20,color:'ink',size:5,action:'rise',beat:0}]});
test('reject skipped pages, non-brand paint, out-of-bounds and hidden text',()=>{
  assert.throws(()=>validateScenes([scene(2)],1,1));
  for(const patch of [{color:'lime'},{x:99},{color:'paper'}]){
    const s=scene(1);Object.assign(s.objects[0],patch);assert.throws(()=>validateScenes([s],1,1));
  }
  const s=scene(1);s.objects.push({...s.objects[0],id:'other'});assert.throws(()=>validateScenes([s],1,1));
  assert.equal(validateScenes([scene(1)],1,1).length,1);
});
test('inspect adjacent chapters for copy-paste, broken carries and unexplained repeated designs',()=>{
  const a=scene(10),b=scene(11);
  assert.throws(()=>inspectContinuity([a],[b],[]),/正文/);
  b.objects[0].text='联络客户';b.transition='carry';b.objects[0].id='other';
  assert.throws(()=>inspectContinuity([a],[b],[]),/跨页/);
  b.transition='fade'; const c=scene(12);c.objects[0].text='改进流程';
  assert.throws(()=>inspectContinuity([a,b],[c],[]),/构图/);
});
