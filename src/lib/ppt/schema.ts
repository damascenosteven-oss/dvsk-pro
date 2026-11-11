import { z } from 'zod';

const shortText = z.string().trim().min(1).max(120);
const bodyText = z.string().trim().min(1).max(280);
const stringList = z.array(bodyText).min(1).max(8);
const finiteNumber = z.number().finite().min(-1_000_000_000).max(1_000_000_000).refine(
  value => Math.abs(value * 100 - Math.round(value * 100)) < 1e-7,
  'numbers may have at most two decimal places',
);
const nonNegativeNumber = finiteNumber.min(0);
const positiveNumber = finiteNumber.refine(value => value > 0, 'value must be greater than zero');

export const researchSourceSchema = z.object({
  id: z.string().regex(/^S(?:[1-9]|1[0-2])$/),
  title: z.string().trim().min(1).max(180),
  url: z.url().refine(value => value.startsWith('https://'), 'source URL must use HTTPS'),
  publisher: z.string().trim().max(120).optional(),
  publishedAt: z.string().trim().max(40).optional(),
  snippet: z.string().trim().min(1).max(800),
});

export const deckResearchSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('not-required') }),
  z.object({ status: z.literal('insufficient'), retrievedAt: z.iso.datetime(), querySummary: z.string().trim().max(240) }),
  z.object({
    status: z.literal('completed'),
    retrievedAt: z.iso.datetime(),
    querySummary: z.string().trim().min(1).max(240),
    sources: z.array(researchSourceSchema).min(1).max(12),
  }),
]).default({ status: 'not-required' });

export const slideThemeSchema = z.enum(['blue', 'violet', 'sunset', 'mint', 'fire']);
export const deckDesignSchema = z.object({
  narrative: z.enum(['teach', 'proposal', 'report', 'pitch']).default('teach'),
  mood: z.enum(['professional', 'energetic', 'warm']).default('professional'),
  palette: z.enum(['blue', 'violet', 'sunset', 'mint', 'fire']).default('blue'),
  density: z.enum(['airy', 'balanced']).default('balanced'),
});

export const publicSkillIdSchema = z.enum([
  'executive-briefing',
  'data-research-report',
  'training-course',
  'product-launch',
  'project-proposal',
]);
export const presentationSkillIdSchema = z.union([publicSkillIdSchema, z.literal('legacy-general')]);
export const deckSkillSchema = z.object({
  id: presentationSkillIdSchema,
  version: z.literal(1),
  selectedBy: z.enum(['auto', 'user', 'legacy']),
}).default({ id: 'legacy-general', version: 1, selectedBy: 'legacy' });

export const motionModeSchema = z.enum(['auto', 'subtle', 'balanced', 'vivid']);
export const motionPersonaSchema = z.enum(['business', 'training', 'cinematic']);
export const motionRecipeSchema = z.enum([
  'precision-flow',
  'editorial-focus',
  'kinetic-classroom',
  'playful-cascade',
  'cinematic-depth',
  'launch-spotlight',
]);
export const motionBackgroundSchema = z.enum(['aurora', 'particles', 'kinetic-grid', 'spotlight', 'orbit']);
export const motionTransitionSchema = z.enum(['focus', 'depth', 'directional', 'wipe']);
export const motionEntranceSchema = z.enum(['fade', 'up', 'rise', 'left', 'right', 'blur', 'zoom', 'flip', 'pop', 'stamp']);
export const motionEffectSchema = z.enum([
  'hero-focus', 'hero-orbit', 'card-fan', 'spotlight-scan', 'content-cascade',
  'split-reveal', 'balance-pulse', 'flow-packet', 'step-climb', 'branch-grow',
  'layer-reveal', 'venn-focus', 'overlap-pulse', 'quote-reveal', 'action-cascade',
  'counter-focus', 'metric-pulse', 'chart-draw', 'data-scan', 'funnel-cascade',
  'stage-focus', 'matrix-pop', 'quadrant-scan', 'ranking-race', 'podium-focus',
  'table-cascade', 'ledger-scan', 'finance-focus', 'scatter-reveal', 'radar-sweep',
  'stacked-grow', 'heatmap-wave', 'method-build',
]);

export const slideMotionSchema = z.object({
  slideId: z.string().regex(/^[a-z0-9-]{1,40}$/),
  entrance: motionEntranceSchema,
  effect: motionEffectSchema,
  stagger: z.number().int().min(70).max(180),
});

export const motionPlanSchema = z.object({
  version: z.literal(1),
  mode: motionModeSchema,
  persona: motionPersonaSchema,
  recipe: motionRecipeSchema,
  seed: z.string().regex(/^[a-f0-9]{16}$/),
  background: motionBackgroundSchema,
  transition: motionTransitionSchema,
  layoutSignature: z.string().regex(/^[a-f0-9]{12}$/),
  fingerprint: z.string().regex(/^v1:[a-f0-9]{16}$/),
  slides: z.array(slideMotionSchema).min(6).max(12),
});

const baseSlide = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,40}$/),
  title: shortText,
  subtitle: z.string().trim().max(180).optional(),
  theme: slideThemeSchema.default('blue'),
  eyebrow: z.string().trim().max(48).optional(),
  emphasis: z.string().trim().max(48).optional(),
  takeaway: z.string().trim().max(160).optional(),
  sourceIds: z.array(z.string().regex(/^S(?:[1-9]|1[0-2])$/)).max(6).optional(),
});

const dataFields = {
  dataStatus: z.enum(['demo', 'user-provided', 'researched']).default('demo'),
  source: z.string().trim().max(160).optional(),
  unit: z.string().trim().max(24).optional(),
  note: z.string().trim().max(160).optional(),
  story: z.object({
    question: z.string().trim().min(1).max(120),
    claim: z.string().trim().min(1).max(160),
    implication: z.string().trim().min(1).max(180),
    focusKeys: z.array(shortText).max(3).default([]),
  }).optional(),
};

const chartSeries = z.object({ name: shortText, values: z.array(finiteNumber).min(1).max(8) });

const funnelSlide = baseSlide.extend({
  type: z.literal('funnel'),
  variant: z.literal('conversion').default('conversion'),
  ...dataFields,
  stages: z.array(z.object({ label: shortText, value: nonNegativeNumber })).min(3).max(6),
}).superRefine((slide, context) => {
  slide.stages.forEach((stage, index) => {
    if (index > 0 && stage.value > slide.stages[index - 1].value) {
      context.addIssue({ code: 'custom', path: ['stages', index, 'value'], message: 'funnel values must be non-increasing' });
    }
  });
});

const barOrLineChart = (variant: 'bar' | 'line') => baseSlide.extend({
  type: z.literal('chart'),
  variant: z.literal(variant),
  ...dataFields,
  labels: z.array(shortText).min(2).max(8),
  series: z.array(chartSeries).min(1).max(3),
}).superRefine((slide, context) => {
  slide.series.forEach((series, index) => {
    if (series.values.length !== slide.labels.length) {
      context.addIssue({ code: 'custom', path: ['series', index, 'values'], message: 'series values must match labels' });
    }
  });
});

const donutChart = baseSlide.extend({
  type: z.literal('chart'),
  variant: z.literal('donut'),
  ...dataFields,
  labels: z.array(shortText).min(2).max(6),
  values: z.array(nonNegativeNumber).min(2).max(6),
  center: z.string().trim().max(32).optional(),
}).superRefine((slide, context) => {
  if (slide.values.length !== slide.labels.length) {
    context.addIssue({ code: 'custom', path: ['values'], message: 'donut values must match labels' });
  }
  if (slide.values.reduce((sum, value) => sum + value, 0) <= 0) {
    context.addIssue({ code: 'custom', path: ['values'], message: 'donut values cannot all be zero' });
  }
});

const scatterChart = baseSlide.extend({
  type: z.literal('chart'),
  variant: z.literal('scatter'),
  ...dataFields,
  xAxis: z.object({ label: shortText, min: finiteNumber, max: finiteNumber }),
  yAxis: z.object({ label: shortText, min: finiteNumber, max: finiteNumber }),
  points: z.array(z.object({ label: shortText, x: finiteNumber, y: finiteNumber, group: shortText.optional() })).min(3).max(20),
  referenceLines: z.array(z.object({ axis: z.enum(['x', 'y']), value: finiteNumber, label: shortText })).max(4).default([]),
  quadrants: z.array(shortText).length(4).optional(),
}).superRefine((slide, context) => {
  if (slide.xAxis.max <= slide.xAxis.min) context.addIssue({ code: 'custom', path: ['xAxis', 'max'], message: 'x axis maximum must exceed minimum' });
  if (slide.yAxis.max <= slide.yAxis.min) context.addIssue({ code: 'custom', path: ['yAxis', 'max'], message: 'y axis maximum must exceed minimum' });
  slide.points.forEach((point, index) => {
    if (point.x < slide.xAxis.min || point.x > slide.xAxis.max) context.addIssue({ code: 'custom', path: ['points', index, 'x'], message: 'point must fit x axis domain' });
    if (point.y < slide.yAxis.min || point.y > slide.yAxis.max) context.addIssue({ code: 'custom', path: ['points', index, 'y'], message: 'point must fit y axis domain' });
  });
});

const radarChart = baseSlide.extend({
  type: z.literal('chart'),
  variant: z.literal('radar'),
  ...dataFields,
  axes: z.array(shortText).min(4).max(8),
  maxValue: positiveNumber,
  series: z.array(z.object({ name: shortText, values: z.array(nonNegativeNumber).min(4).max(8) })).min(1).max(2),
}).superRefine((slide, context) => {
  slide.series.forEach((series, index) => {
    if (series.values.length !== slide.axes.length) context.addIssue({ code: 'custom', path: ['series', index, 'values'], message: 'radar values must match axes' });
    if (series.values.some(value => value > slide.maxValue)) context.addIssue({ code: 'custom', path: ['series', index, 'values'], message: 'radar values cannot exceed maxValue' });
  });
});

const stackedBarChart = baseSlide.extend({
  type: z.literal('chart'),
  variant: z.literal('stacked-bar'),
  ...dataFields,
  mode: z.enum(['absolute', 'percent']).default('absolute'),
  labels: z.array(shortText).min(2).max(8),
  series: z.array(chartSeries).min(2).max(5),
}).superRefine((slide, context) => {
  slide.series.forEach((series, index) => {
    if (series.values.length !== slide.labels.length) context.addIssue({ code: 'custom', path: ['series', index, 'values'], message: 'stacked values must match labels' });
    if (series.values.some(value => value < 0)) context.addIssue({ code: 'custom', path: ['series', index, 'values'], message: 'stacked values must be non-negative' });
  });
  if (slide.mode === 'percent') slide.labels.forEach((_, labelIndex) => {
    const total = slide.series.reduce((sum, series) => sum + (series.values[labelIndex] || 0), 0);
    if (Math.abs(total - 100) > 0.1) context.addIssue({ code: 'custom', path: ['series'], message: 'percent stacks must total 100 for every label' });
  });
});

const heatmapSlide = baseSlide.extend({
  type: z.literal('heatmap'),
  variant: z.literal('matrix').default('matrix'),
  ...dataFields,
  columns: z.array(shortText).min(3).max(8),
  rows: z.array(z.object({ label: shortText, values: z.array(finiteNumber).min(3).max(8) })).min(3).max(10),
  colorScale: z.enum(['sequential', 'diverging']).default('sequential'),
  midpoint: finiteNumber.optional(),
}).superRefine((slide, context) => {
  slide.rows.forEach((row, index) => {
    if (row.values.length !== slide.columns.length) context.addIssue({ code: 'custom', path: ['rows', index, 'values'], message: 'heatmap values must match columns' });
  });
  if (slide.colorScale === 'diverging' && slide.midpoint === undefined) context.addIssue({ code: 'custom', path: ['midpoint'], message: 'diverging heatmap requires a midpoint' });
});

const methodologySlide = baseSlide.extend({
  type: z.literal('methodology'),
  variant: z.literal('score-model').default('score-model'),
  ...dataFields,
  formula: z.string().trim().min(1).max(180),
  components: z.array(z.object({ label: shortText, weight: nonNegativeNumber.max(100), description: bodyText })).min(2).max(6),
}).superRefine((slide, context) => {
  const total = slide.components.reduce((sum, component) => sum + component.weight, 0);
  if (Math.abs(total - 100) > 0.1) context.addIssue({ code: 'custom', path: ['components'], message: 'methodology weights must total 100' });
});

const dataTable = baseSlide.extend({
  type: z.literal('table'),
  variant: z.literal('data-table'),
  ...dataFields,
  headers: z.array(shortText).min(2).max(6),
  rows: z.array(z.object({
    label: shortText,
    values: z.array(z.union([z.string().trim().min(1).max(80), finiteNumber])).min(1).max(5),
  })).min(2).max(8),
}).superRefine((slide, context) => {
  slide.rows.forEach((row, index) => {
    if (row.values.length !== slide.headers.length - 1) {
      context.addIssue({ code: 'custom', path: ['rows', index, 'values'], message: 'row values must match headers after the label column' });
    }
  });
});

const financialTable = baseSlide.extend({
  type: z.literal('table'),
  variant: z.literal('financial-return'),
  ...dataFields,
  currency: z.enum(['CNY', 'USD']).default('CNY'),
  horizonMonths: z.number().int().min(1).max(36),
  investment: positiveNumber,
  items: z.array(z.object({ label: shortText, baseline: nonNegativeNumber, proposed: nonNegativeNumber })).min(2).max(6),
}).superRefine((slide, context) => {
  slide.items.forEach((item, index) => {
    if (item.proposed > item.baseline) context.addIssue({ code: 'custom', path: ['items', index, 'proposed'], message: 'proposed cost must not exceed baseline cost' });
  });
});

const highlightTable = baseSlide.extend({
  type: z.literal('table'),
  variant: z.literal('highlight-table'),
  ...dataFields,
  headers: z.array(shortText).min(2).max(6),
  rows: z.array(z.object({ label: shortText, values: z.array(z.union([z.string().trim().min(1).max(80), finiteNumber])).min(1).max(5) })).min(2).max(8),
  highlights: z.array(z.object({ row: z.number().int().min(0).max(7), column: z.number().int().min(0).max(4), tone: z.enum(['best', 'risk', 'focus']) })).max(12).default([]),
  totalRow: z.number().int().min(0).max(7).optional(),
}).superRefine((slide, context) => {
  slide.rows.forEach((row, index) => {
    if (row.values.length !== slide.headers.length - 1) context.addIssue({ code: 'custom', path: ['rows', index, 'values'], message: 'row values must match headers after the label column' });
  });
  slide.highlights.forEach((highlight, index) => {
    if (highlight.row >= slide.rows.length || highlight.column >= slide.headers.length - 1) context.addIssue({ code: 'custom', path: ['highlights', index], message: 'highlight must reference an existing cell' });
  });
  if (slide.totalRow !== undefined && slide.totalRow >= slide.rows.length) context.addIssue({ code: 'custom', path: ['totalRow'], message: 'total row must exist' });
});

export const slideSchema = z.union([
  baseSlide.extend({ type: z.literal('cover'), variant: z.enum(['cinematic', 'split-hero']).default('cinematic'), tagline: bodyText }),
  baseSlide.extend({ type: z.literal('bullets'), variant: z.enum(['feature-list', 'three-cards', 'spotlight']).default('feature-list'), items: stringList }),
  baseSlide.extend({
    type: z.literal('comparison'),
    variant: z.enum(['versus', 'two-column']).default('versus'),
    left: z.object({ title: shortText, items: stringList.max(5) }),
    right: z.object({ title: shortText, items: stringList.max(5) }),
  }),
  baseSlide.extend({
    type: z.literal('process'),
    variant: z.enum(['flow', 'ladder', 'roadmap']).default('flow'),
    steps: z.array(z.object({ title: shortText, description: bodyText })).min(2).max(6),
  }),
  baseSlide.extend({
    type: z.literal('tree'),
    variant: z.enum(['mind-map', 'layer-stack']).default('mind-map'),
    root: shortText,
    branches: z.array(z.object({ title: shortText, items: z.array(shortText).min(1).max(4) })).min(2).max(5),
  }),
  baseSlide.extend({
    type: z.literal('venn'),
    variant: z.literal('circles').default('circles'),
    leftTitle: shortText,
    rightTitle: shortText,
    left: stringList.max(4),
    overlap: stringList.max(4),
    right: stringList.max(4),
  }),
  baseSlide.extend({ type: z.literal('closing'), variant: z.enum(['quote', 'action-card']).default('action-card'), summary: bodyText, actions: stringList.max(5) }),
  baseSlide.extend({
    type: z.literal('kpi'),
    variant: z.literal('dashboard').default('dashboard'),
    ...dataFields,
    metrics: z.array(z.object({
      label: shortText,
      value: finiteNumber,
      suffix: z.string().trim().max(16).optional(),
      delta: finiteNumber.optional(),
      direction: z.enum(['up', 'down', 'flat']).default('flat'),
      note: z.string().trim().max(100).optional(),
    })).min(2).max(4),
  }),
  barOrLineChart('bar'),
  barOrLineChart('line'),
  donutChart,
  scatterChart,
  radarChart,
  stackedBarChart,
  funnelSlide,
  baseSlide.extend({
    type: z.literal('matrix'),
    variant: z.literal('quadrant').default('quadrant'),
    ...dataFields,
    axes: z.object({ xLow: shortText, xHigh: shortText, yLow: shortText, yHigh: shortText }),
    quadrants: z.array(shortText).length(4),
    points: z.array(z.object({ label: shortText, x: z.number().min(0).max(100), y: z.number().min(0).max(100) })).min(2).max(8),
  }),
  baseSlide.extend({
    type: z.literal('ranking'),
    variant: z.literal('horizontal-bars'),
    ...dataFields,
    entries: z.array(z.object({ label: shortText, value: finiteNumber, change: finiteNumber.optional() })).min(3).max(8),
  }),
  baseSlide.extend({
    type: z.literal('ranking'),
    variant: z.literal('grouped'),
    ...dataFields,
    groups: z.array(z.object({ title: shortText, entries: z.array(z.object({ label: shortText, value: finiteNumber, change: finiteNumber.optional() })).min(3).max(6) })).min(2).max(4),
  }),
  heatmapSlide,
  methodologySlide,
  dataTable,
  financialTable,
  highlightTable,
]);

export const deckOutlineSchema = z.object({
  title: shortText,
  audience: z.string().trim().min(1).max(160),
  goal: z.string().trim().min(1).max(240),
  skill: deckSkillSchema,
  design: deckDesignSchema.default({ narrative: 'teach', mood: 'professional', palette: 'blue', density: 'balanced' }),
  research: deckResearchSchema,
  motionPlan: motionPlanSchema.optional(),
  slides: z.array(slideSchema).min(6).max(12),
}).superRefine((deck, context) => {
  if (deck.slides[0]?.type !== 'cover') context.addIssue({ code: 'custom', path: ['slides', 0, 'type'], message: 'first slide must be cover' });
  const lastIndex = deck.slides.length - 1;
  if (deck.slides[lastIndex]?.type !== 'closing') context.addIssue({ code: 'custom', path: ['slides', lastIndex, 'type'], message: 'last slide must be closing' });
  deck.slides.forEach((slide, index) => {
    if (slide.emphasis && !slide.title.includes(slide.emphasis)) {
      context.addIssue({ code: 'custom', path: ['slides', index, 'emphasis'], message: 'emphasis must appear in title' });
    }
    if (index >= 2 && slide.variant === deck.slides[index - 1].variant && slide.variant === deck.slides[index - 2].variant) {
      context.addIssue({ code: 'custom', path: ['slides', index, 'variant'], message: 'three consecutive slides cannot use the same variant' });
    }
    if ('dataStatus' in slide && slide.dataStatus === 'user-provided' && !slide.source?.trim()) {
      context.addIssue({ code: 'custom', path: ['slides', index, 'source'], message: 'user-provided data requires a source' });
    }
    const knownSourceIds = new Set(deck.research.status === 'completed' ? deck.research.sources.map(source => source.id) : []);
    for (const sourceId of slide.sourceIds || []) {
      if (!knownSourceIds.has(sourceId)) context.addIssue({ code: 'custom', path: ['slides', index, 'sourceIds'], message: 'slide source ID must exist in deck research sources' });
    }
    if ('dataStatus' in slide && slide.dataStatus === 'researched' && (!slide.sourceIds || slide.sourceIds.length === 0)) {
      context.addIssue({ code: 'custom', path: ['slides', index, 'sourceIds'], message: 'researched data requires at least one source ID' });
    }
  });
  if (deck.motionPlan) {
    if (deck.motionPlan.slides.length !== deck.slides.length) {
      context.addIssue({ code: 'custom', path: ['motionPlan', 'slides'], message: 'motion plan must cover every slide' });
    } else {
      deck.slides.forEach((slide, index) => {
        if (deck.motionPlan?.slides[index]?.slideId !== slide.id) {
          context.addIssue({ code: 'custom', path: ['motionPlan', 'slides', index, 'slideId'], message: 'motion slide IDs must match deck order' });
        }
      });
    }
  }
});

export const outlineRequestSchema = z.object({
  prompt: z.string().trim().min(20).max(6000),
  pageCount: z.number().int().min(6).max(12),
  motionMode: motionModeSchema.default('auto'),
  skillId: z.union([z.literal('auto'), publicSkillIdSchema]).default('auto'),
});

export const sessionRequestSchema = z.object({ password: z.string().min(1).max(200) });

export type Slide = z.infer<typeof slideSchema>;
export type DeckOutline = z.infer<typeof deckOutlineSchema>;
export type SlideTheme = z.infer<typeof slideThemeSchema>;
export type PublicSkillId = z.infer<typeof publicSkillIdSchema>;
export type PresentationSkillId = z.infer<typeof presentationSkillIdSchema>;
export type MotionMode = z.infer<typeof motionModeSchema>;
export type MotionPersona = z.infer<typeof motionPersonaSchema>;
export type MotionPlan = z.infer<typeof motionPlanSchema>;
export type SlideMotion = z.infer<typeof slideMotionSchema>;

type FinancialInput = {
  horizonMonths: number;
  investment: number;
  items: Array<{ baseline: number; proposed: number }>;
};

const roundMoney = (value: number): number => Math.round(value * 100) / 100;

export function calculateFinancialSummary(input: FinancialInput) {
  const baseline = input.items.reduce((sum, item) => sum + item.baseline, 0);
  const proposed = input.items.reduce((sum, item) => sum + item.proposed, 0);
  const annualSavings = baseline - proposed;
  const grossSavings = annualSavings * input.horizonMonths / 12;
  const netBenefit = grossSavings - input.investment;
  const roiPercent = input.investment > 0 ? netBenefit / input.investment * 100 : 0;
  const paybackMonths = annualSavings > 0 ? input.investment / (annualSavings / 12) : 0;
  return {
    baseline: roundMoney(baseline),
    proposed: roundMoney(proposed),
    grossSavings: roundMoney(grossSavings),
    netBenefit: roundMoney(netBenefit),
    roiPercent: roundMoney(roiPercent),
    paybackMonths: roundMoney(paybackMonths),
  };
}

export function normalizeDeckOutline(input: unknown): DeckOutline {
  return deckOutlineSchema.parse(input);
}
