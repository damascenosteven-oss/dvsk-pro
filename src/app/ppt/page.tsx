import type { Metadata } from 'next';
import PptStudio from '@/components/ppt/ppt-studio';

export const metadata: Metadata = { title: 'AI PPT 内测 · 毓灵' };

export default function PptPage() {
  return <PptStudio />;
}
