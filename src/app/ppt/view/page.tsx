import type { Metadata } from 'next';
import ShareCodeForm from '@/components/ppt/share-code-form';

export const metadata: Metadata = { title: '电脑放映 · 毓灵 AI PPT' };

export default function PptViewerEntryPage() {
  return <main className="fixed inset-0 z-50 grid place-items-center bg-[radial-gradient(circle_at_top,#eef1ff,#e9ebef_65%)] p-5"><ShareCodeForm /></main>;
}
