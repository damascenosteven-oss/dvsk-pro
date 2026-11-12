import { existsSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { browserCandidates } from './platform';

export async function checkStoryGeometry(html:Buffer,pages:number){
  const executablePath=browserCandidates().find(existsSync);
  if(!executablePath)throw Error('找不到用于页面检查的浏览器');
  const browser=await chromium.launch({executablePath,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  try{
    const tab=await browser.newPage({viewport:{width:1280,height:780},reducedMotion:'reduce',offline:true});
    await tab.setContent(html.toString('utf8'));
    for(let i=1;i<=pages;i++){
      const valid=await tab.evaluate(n=>{
        const page=document.querySelector<HTMLElement>('article');
        if(page?.dataset.page!==String(n)||!page.querySelector<HTMLImageElement>('img.logo')?.naturalWidth)return false;
        const section=page.querySelector('section')!.getBoundingClientRect();
        const header=page.querySelector('h1')!.getBoundingClientRect();
        if(header.bottom>section.top+1)return false;
        return [...page.querySelectorAll<HTMLElement>('.text,.number')].every(box=>box.scrollHeight<=box.clientHeight+2 && box.scrollWidth<=box.clientWidth+2);
      },i);
      if(!valid)throw Error('逐页检查发现遮挡、文字溢出或标志缺失（组内第 '+i+' 页）');
      if(i<pages)await tab.locator('#next').click();
    }
  }finally{await browser.close()}
}
