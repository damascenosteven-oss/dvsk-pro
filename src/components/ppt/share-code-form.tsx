'use client';

import { useState } from 'react';
import { MonitorPlay } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ShareCodeForm() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const normalized = code.toUpperCase().replace(/[^23456789ABCDEFGHJKLMNPQRSTUVWXYZ]/g, '').slice(0, 8);
  return (
    <Card className="w-full max-w-md border-[var(--line-clr)] shadow-xl">
      <CardHeader className="items-center text-center">
        <div className="mb-2 grid size-14 place-items-center rounded-2xl mp-brand-gradient text-white"><MonitorPlay /></div>
        <CardTitle>电脑放映</CardTitle>
        <p className="text-sm text-[var(--muted-clr)]">输入手机端生成的 8 位分享码</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2"><Label htmlFor="share-code">分享码</Label><Input id="share-code" autoCapitalize="characters" autoComplete="off" className="h-14 text-center font-mono text-2xl font-black tracking-[0.18em]" value={normalized} onChange={event => setCode(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && normalized.length === 8) router.push(`/ppt/view/${normalized}`); }} /></div>
        <Button className="w-full mp-brand-gradient" disabled={normalized.length !== 8} onClick={() => router.push(`/ppt/view/${normalized}`)}>打开 PPT</Button>
        <p className="text-center text-xs text-[var(--subtle-clr)]">分享码有效期为生成后 7 天</p>
      </CardContent>
    </Card>
  );
}
