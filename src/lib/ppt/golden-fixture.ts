import { resolveMotionPlan } from './motion';
import { normalizeDeckOutline, type DeckOutline } from './schema';

export const PPT_GOLDEN_TEMPLATE_VERSION = 1;
export const PPT_GOLDEN_VIEWPORT = { width: 1920, height: 1080 } as const;

function baseGoldenOutline(): DeckOutline {
  return normalizeDeckOutline({
    title: 'AI PPT 黄金样板',
    audience: '管理层与商业汇报审核人',
    goal: '用固定内容验证所有核心模板、品牌视觉、几何边界与动画终态',
    skill: { id: 'executive-briefing', version: 1, selectedBy: 'user' },
    design: { narrative: 'pitch', mood: 'professional', palette: 'blue', density: 'balanced' },
    research: { status: 'not-required' },
    slides: [
      {
        id: 'golden-cover', type: 'cover', variant: 'cinematic', theme: 'blue',
        eyebrow: '毓灵 YuLing AI · GOLDEN BASELINE', title: '让每一次汇报都可审核', emphasis: '可审核',
        tagline: '确定性样板 · 真实构建链路 · 逐页视觉防回归',
      },
      {
        id: 'golden-bullets', type: 'bullets', variant: 'three-cards', theme: 'mint',
        eyebrow: '表达原则', title: '三层信息，先结论再证据', emphasis: '先结论',
        items: ['结论先行', '一句话说清管理判断', '证据可核', '数据、来源与口径同行', '行动闭环', '明确责任人与下一步'],
        takeaway: '每页只承载一个核心判断。',
      },
      {
        id: 'process-roadmap', type: 'process', variant: 'roadmap', theme: 'violet',
        eyebrow: '协作流程', title: '四步闭环：从定框架到发 HTML', emphasis: '四步闭环',
        subtitle: '每一步都有明确责任人与交付物，过程可追溯',
        steps: [
          { title: '领导定思想', description: '明确汇报主张、叙事框架与每页数据要求' },
          { title: '系统生成骨架', description: '按框架自动生成页面与待填写字段清单' },
          { title: '下属补内容', description: '逐页填写事实、数字与来源，缺项高亮提醒' },
          { title: '审核后发布', description: '领导确认无误，一键输出可直接演示的 HTML' },
        ],
        takeaway: '框架、填充、审核、发布形成一条可追溯链路。',
      },
      {
        id: 'golden-comparison', type: 'comparison', variant: 'versus', theme: 'sunset',
        title: '从文件交付转向决策交付', emphasis: '决策交付',
        left: { title: '传统方式', items: ['版本散落', '数据口径不清', '修改意见难追踪'] },
        right: { title: '协作方式', items: ['框架先确认', '来源随内容保留', '批准后锁定发布'] },
      },
      {
        id: 'golden-tree', type: 'tree', variant: 'layer-stack', theme: 'blue',
        title: '管理汇报的证据结构', emphasis: '证据结构', root: '核心主张',
        branches: [
          { title: '经营事实', items: ['规模', '效率'] },
          { title: '原因判断', items: ['内部因素', '外部因素'] },
          { title: '行动方案', items: ['优先级', '责任人'] },
          { title: '风险约束', items: ['假设', '边界'] },
        ],
      },
      {
        id: 'golden-venn', type: 'venn', variant: 'circles', theme: 'mint',
        title: '好汇报是业务与证据的交集', emphasis: '交集',
        leftTitle: '业务判断', rightTitle: '可信证据',
        left: ['战略方向', '管理经验'], overlap: ['可执行结论', '可审核口径'], right: ['经营数据', '外部来源'],
      },
      {
        id: 'golden-kpi', type: 'kpi', variant: 'dashboard', theme: 'fire', dataStatus: 'demo', unit: '%',
        title: '关键指标形成清晰主次', emphasis: '清晰主次', source: '黄金样板合成数据',
        story: { question: '流程优化是否有效？', claim: '框架确认率达到 92%，返工同步下降', implication: '继续把框架确认作为内容填充的前置门槛。', focusKeys: ['框架确认率'] },
        metrics: [
          { label: '框架确认率', value: 92, suffix: '%', delta: 8, direction: 'up', note: '领导首次确认' },
          { label: '资料完整度', value: 86, suffix: '%', delta: 6, direction: 'up', note: '字段与来源齐全' },
          { label: '返工降低', value: 31, suffix: '%', delta: 4, direction: 'up', note: '相较传统流程' },
        ],
        takeaway: '先确认框架，可明显减少后续返工。',
      },
      {
        id: 'golden-bar', type: 'chart', variant: 'bar', theme: 'blue', dataStatus: 'demo', unit: '分',
        title: '五类能力呈现差异化表现', emphasis: '差异化', source: '黄金样板合成数据',
        story: { question: '哪项能力最强？', claim: '视觉与发布能力领先，数据治理仍有空间', implication: '下一阶段优先强化数据来源和统一口径。', focusKeys: ['视觉'] },
        labels: ['逻辑', '数据', '视觉', '审核', '发布'],
        series: [{ name: '成熟度', values: [88, 76, 92, 84, 90] }],
        takeaway: '视觉与发布能力领先，数据治理仍需持续加强。',
      },
      {
        id: 'golden-donut', type: 'chart', variant: 'donut', theme: 'violet', dataStatus: 'demo', unit: '%',
        title: '时间投入转向高价值判断', emphasis: '高价值判断', source: '黄金样板合成数据',
        story: { question: '团队时间花在哪里？', claim: '42% 的时间已用于判断与决策', implication: '继续压缩机械排版和沟通等待。', focusKeys: ['判断与决策'] },
        labels: ['判断与决策', '资料核对', '排版调整', '沟通等待'], values: [42, 28, 18, 12], center: '100%',
        takeaway: '自动化排版后，团队可把更多时间用于判断与核验。',
      },
      {
        id: 'golden-ranking', type: 'ranking', variant: 'horizontal-bars', theme: 'mint', dataStatus: 'demo', unit: '分',
        title: '区域表现一眼识别领先项', emphasis: '领先项', source: '黄金样板合成数据',
        story: { question: '哪个区域值得复制？', claim: '华东一区以 94 分领跑区域表现', implication: '复用华东一区的资料校验机制。', focusKeys: ['华东一区'] },
        entries: [
          { label: '华东一区', value: 94, change: 5 }, { label: '华南二区', value: 88, change: 2 },
          { label: '华北一区', value: 82, change: -1 }, { label: '西南一区', value: 77, change: 3 },
          { label: '华中一区', value: 71, change: -2 },
        ],
        takeaway: '复制华东一区的资料校验机制。',
      },
      {
        id: 'golden-finance', type: 'table', variant: 'financial-return', theme: 'sunset', dataStatus: 'demo', unit: '万元',
        title: '投入产出需要可复核计算', emphasis: '可复核', source: '黄金样板合成数据', currency: 'CNY',
        story: { question: '投入能否回收？', claim: '年度净收益 20 万元，预计 5.68 个月回收', implication: '在锁定计算口径后进入试点。', focusKeys: ['净收益'] },
        horizonMonths: 12, investment: 18,
        items: [
          { label: '内容制作', baseline: 42, proposed: 25 },
          { label: '沟通返工', baseline: 28, proposed: 14 },
          { label: '发布维护', baseline: 16, proposed: 9 },
        ],
        takeaway: '按年度口径测算，投入可在周期内回收。',
      },
      {
        id: 'golden-closing', type: 'closing', variant: 'action-card', theme: 'blue',
        title: '先把思想讲清，再把证据做实', emphasis: '证据做实',
        summary: '从一页正确开始，建立可持续复用的商业汇报系统。',
        actions: ['确认核心主张', '补齐事实来源', '完成领导审核'],
      },
    ],
  });
}

export function createGoldenOutline(): DeckOutline {
  const base = baseGoldenOutline();
  for (let index = 0; index < 500; index += 1) {
    const resolved = resolveMotionPlan(base, {
      mode: 'vivid', seedBase: `ai-ppt-golden-v${PPT_GOLDEN_TEMPLATE_VERSION}-${index}`, preserveLayouts: true,
    });
    const processMotion = resolved.motionPlan?.slides.find(slide => slide.slideId === 'process-roadmap');
    if (processMotion?.entrance === 'stamp') return resolved;
  }
  throw new Error('Unable to resolve deterministic golden stamp entrance');
}
