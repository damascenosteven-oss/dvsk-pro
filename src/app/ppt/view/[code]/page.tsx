import Link from 'next/link';

export default async function PptPlayerPage({ params }: { params: Promise<{ code: string }> }) {
  const code = (await params).code.toUpperCase();
  return (
    <main className="fixed inset-0 z-50 bg-[#080a10]">
      <iframe
        title={`AI PPT ${code}`}
        src={`/api/ppt/decks/${encodeURIComponent(code)}`}
        className="h-full w-full border-0"
        sandbox="allow-scripts allow-downloads"
        allow="fullscreen"
      />
      <Link href="/ppt/view" className="fixed left-3 top-3 z-50 rounded-full bg-black/55 px-3 py-1.5 text-xs font-semibold text-white/85 backdrop-blur">更换分享码</Link>
    </main>
  );
}
