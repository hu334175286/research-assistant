import Link from 'next/link';

const builtIn = [
  { name: '文献管理', desc: '管理论文、质量分层、BibTeX导出', href: '/papers' },
  { name: '可视化分析', desc: '质量分布、来源占比、趋势图', href: '/visual-insights' },
  { name: '全局搜索', desc: '跨文献/实验/报告统一检索', href: '/search' },
  { name: '快速入口', desc: '常用页面、模型切换、系统状态', href: '/quick' },
  { name: '模型路由', desc: '按任务类型查看模型策略', href: '/api/model-route?taskType=literature_gap' },
  { name: '故障切换', desc: '模拟错误并查看自动切换建议', href: '/api/model-failover?taskType=code_execution&failed=openai-codex/gpt-5.3-codex&error=429&dryRun=1' },
];

const externalTools = [
  {
    category: 'LaTeX 工具',
    items: [
      { name: 'Overleaf', url: 'https://www.overleaf.com', note: '在线 LaTeX 协作写作' },
      { name: 'TeX Live', url: 'https://www.tug.org/texlive/', note: '本地 LaTeX 编译环境' },
    ],
  },
  {
    category: 'Python 与数据分析',
    items: [
      { name: 'Anaconda', url: 'https://www.anaconda.com/', note: 'Python 科研环境管理' },
      { name: 'Jupyter', url: 'https://jupyter.org/', note: '交互式数据分析' },
    ],
  },
  {
    category: '写作与翻译',
    items: [
      { name: 'DeepL', url: 'https://www.deepl.com/', note: '高质量学术翻译' },
      { name: 'Grammarly', url: 'https://www.grammarly.com/', note: '英文润色' },
    ],
  },
  {
    category: '查重与期刊查找（建议外链）',
    items: [
      { name: 'Crossref', url: 'https://search.crossref.org/', note: '文献检索与 DOI 查询' },
      { name: 'Scimago Journal Rank', url: 'https://www.scimagojr.com/', note: '期刊分区与影响力参考' },
    ],
  },
];

function Card({ title, children }) {
  return (
    <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 14 }}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      {children}
    </section>
  );
}

export default function ToolsPage() {
  return (
    <main style={{ maxWidth: 1100, margin: '24px auto', padding: 24 }}>
      <h2 style={{ marginTop: 0 }}>科研工具中心</h2>
      <p style={{ color: '#6b7280' }}>原则：高频能力内置，低频/专业能力外链聚合。</p>

      <div style={{ display: 'grid', gap: 14 }}>
        <Card title="内置能力（推荐优先使用）">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
            {builtIn.map((t) => (
              <Link
                key={t.name}
                href={t.href}
                style={{
                  border: '1px solid #dbeafe',
                  background: '#f8fbff',
                  borderRadius: 10,
                  padding: 12,
                  textDecoration: 'none',
                  color: '#0f172a',
                }}
              >
                <div style={{ fontWeight: 700 }}>{t.name}</div>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 6 }}>{t.desc}</div>
              </Link>
            ))}
          </div>
        </Card>

        {externalTools.map((group) => (
          <Card key={group.category} title={group.category}>
            <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8 }}>
              {group.items.map((item) => (
                <li key={item.name}>
                  <a href={item.url} target="_blank" rel="noreferrer">{item.name}</a>
                  <span style={{ color: '#6b7280' }}> — {item.note}</span>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </main>
  );
}
