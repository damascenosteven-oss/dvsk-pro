import assert from 'node:assert/strict';
import test from 'node:test';
import { createGoldenOutline, PPT_GOLDEN_TEMPLATE_VERSION, PPT_GOLDEN_VIEWPORT } from './golden-fixture';
import { deckOutlineSchema } from './schema';

test('golden fixture is deterministic and covers the visual regression contract', () => {
  const first = createGoldenOutline();
  const second = createGoldenOutline();
  assert.deepEqual(first, second);
  assert.equal(PPT_GOLDEN_TEMPLATE_VERSION, 1);
  assert.deepEqual(PPT_GOLDEN_VIEWPORT, { width: 1920, height: 1080 });
  assert.equal(first.slides.length, 12);
  assert.deepEqual(first.slides.map(slide => slide.type), [
    'cover', 'bullets', 'process', 'comparison', 'tree', 'venn', 'kpi', 'chart', 'chart', 'ranking', 'table', 'closing',
  ]);
  const processIndex = first.slides.findIndex(slide => slide.id === 'process-roadmap');
  const process = first.slides[processIndex];
  assert.equal(process.type, 'process');
  assert.equal(process.variant, 'roadmap');
  assert.equal(process.title, '四步闭环：从定框架到发 HTML');
  assert.equal(process.emphasis, '四步闭环');
  assert.equal(process.steps.length, 4);
  assert.equal(first.motionPlan?.slides[processIndex].entrance, 'stamp');
  assert.equal(deckOutlineSchema.safeParse(first).success, true);
});
