'use client';
import Link from 'next/link';
import { useEffect,useState } from 'react';
import type { StoryPlan } from '@/lib/ppt/storyboard';

type State={id:string;plan:StoryPlan;confirmed:boolean;completed:number;total:number;code?:string};
const storageKey='dvsk-pro-current-story-v1';
const inputClass='w-full rounded-lg border border-slate-300 bg-white p-2';
const primary='rounded-lg bg-indigo-700 px-4 py-2 font-semibold text-white disabled:opacity-50';
async function command(body:Record<string,unknown>):Promise<State>{
  const res=await fetch('/api/ppt/story',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const json=await res.json();
  if(!res.ok)throw new Error(json.error||'请求失败');return json as State;
}
export function StoryStudio(){
  const [prompt,setPrompt]=useState(''),[audience,setAudience]=useState(''),[count,setCount]=useState(10),[job,setJob]=useState<State|null>(null);
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[loading,setLoading]=useState(true);
  useEffect(()=>{let live=true;const id=localStorage.getItem(storageKey);
    if(id)command({op:'read',id}).then(s=>{if(live)setJob(s)}).catch(e=>{if(live)setError(e.message)}).finally(()=>{if(live)setLoading(false)});
    else setLoading(false);return()=>{live=false}},[]);
  async function run(){
    if(busy)return;
    setBusy(true);setError('');
    try{
      if(!job){
        const s=await command({op:'outline',prompt:audience?'受众：'+audience+'\n需求：'+prompt:prompt,pageCount:count});
        setJob(s);localStorage.setItem(storageKey,s.id);
      }else{
        let s=job;
        while(!s.code){
          const old=s.completed;
          s=await command({op:'step',id:s.id,completed:s.completed,...(s.confirmed?{}:{plan:s.plan})});setJob(s);
          if(s.completed===old&&!s.code)throw Error('进度未更新，请稍后继续');
        }
      }
    }catch(e){
      setError(e instanceof Error?e.message:'网络连接中断，请稍后继续');
      if(job){try{const latest=await command({op:'read',id:job.id});if(latest.confirmed)setJob(latest)}catch{/* 保留当前画面供手动继续 */}}
    }finally{setBusy(false)}
  }
  function edit(pages:StoryPlan['pages']){if(job)setJob({...job,plan:{...job.plan,pages}})}
  return <main className="mx-auto max-w-3xl space-y-5 px-4 py-7 text-slate-900">
    <header className="flex items-center justify-between gap-3"><Link href="/ppt">← 工作台</Link><Link href="/ppt/settings">模型设置</Link></header>
    <h1 className="text-3xl font-bold">创意演示</h1>
    {loading?<p>正在读取草稿…</p>:!job?<section className="space-y-4"><label className="block">主题与要求<textarea className={inputClass} value={prompt} maxLength={5400} rows={5} onChange={e=>setPrompt(e.target.value)} placeholder="你想讲清楚什么？给出背景、关键事实和希望听众采取的行动。"/></label>
    <label className="block">受众<input className={inputClass} value={audience} maxLength={180} onChange={e=>setAudience(e.target.value)}/></label>
    <label className="block">页数<select className={inputClass} value={count} onChange={e=>setCount(Number(e.target.value))}>{Array.from({length:25},(_,i)=><option key={i}>{i+6}</option>)}</select></label>
    <button className={primary} disabled={busy||prompt.trim().length<20} onClick={run}>{busy?'正在设计全套大纲…':'生成创意大纲'}</button></section>:
    <section className="space-y-4"><h2 className="text-2xl font-bold">{job.plan.title}</h2>
    {job.confirmed?<p role="status">已完成 {job.completed} / {job.total} 页{job.code?'':job.completed<job.total?' · '+job.plan.pages[job.completed].chapter:' · 正在保存作品'}</p>:
    <ol className="space-y-3">{job.plan.pages.map((page,i)=><li key={i} className="space-y-2 rounded-xl border p-3"><div className="flex justify-between"><b>第 {i+1} 页</b><button disabled={busy||i===0} onClick={()=>{const pages=[...job.plan.pages];[pages[i-1],pages[i]]=[pages[i],pages[i-1]];edit(pages)}}>上移</button></div>
      {(['chapter','title','point','visual','bridge'] as const).map((k,j)=><label className="block text-sm" key={k}>{['章节','标题','讲述重点','画面设计','接页方式'][j]}<input disabled={busy} className={inputClass} value={page[k]} onChange={e=>edit(job.plan.pages.map((x,n)=>n===i?{...x,[k]:e.target.value}:x))}/></label>)}</li>)}</ol>}
    {job.code?<p><Link className={primary} href={'/ppt/view/'+job.code}>播放与分享 · {job.code}</Link></p>:<button className={primary} disabled={busy} onClick={run}>{busy?'正在制作…':job.confirmed?'继续制作':'确认大纲并制作整套'}</button>}
    {job.code&&<button onClick={()=>{localStorage.removeItem(storageKey);setJob(null);setError('')}}>开始另一份作品</button>}</section>}
    {!busy&&!job&&error&&<button onClick={()=>{localStorage.removeItem(storageKey);setError('')}}>清除本机草稿入口</button>}
    {error&&<p role="alert" className="text-red-700">{error}</p>}
  </main>;
}
