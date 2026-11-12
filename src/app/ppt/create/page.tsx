import Link from 'next/link';
import { cookies } from 'next/headers';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/ppt/auth';
import { StoryStudio } from '@/components/ppt/story-studio';
export default async function CreatePage(){
  const cookie=(await cookies()).get(SESSION_COOKIE)?.value;
  if(!verifySessionToken(cookie))return <main className="mx-auto max-w-xl p-8"><Link href="/ppt">输入邀请码以开始创作</Link></main>;
  return <StoryStudio/>;
}
