import Link from 'next/link';
import { getRecommendedBaseUrl } from '@/lib/recommended-base-url';

export default async function QuickPage() {
  const { recommended, primary, fallback, isPrimaryAvailable } = await getRecommendedBaseUrl();

  const appLinks = [
    { href: '/', label: '首页门户' },
    { href: '/dashboard', label: '研究指挥台 Dashboard' },
    { href: '/papers', label: '文献库 Papers' },
    { href: '/search', label: '搜索 Search' },
    { href: '/visual-insights', label: '可视化 Visual Insights' },
    { href: '/experiments', label: '实验记录 Experiments' },
    { href: '/reports/daily', label: '日报 Reports Daily' },
    { href: '/reports/weekly', label: '周报 Reports Weekly' },
  ];

  const apiLinks = [
    { href: '/api/papers', label: '文献列表 API' },
    { href: '/api/papers/arxiv?q=edge ai', label: 'arXiv 搜索 API 示例' },
    { href: '/api/papers/quality-summary', label: '文献质量汇总 API' },
    { href: '/api/papers/auto-fetch', label: '自动抓取状态 API' },
    { href: '/api/papers/auto-fetch?run=1', label: '触发自动抓取 API' },
    { href: '/api/experiments', label: '实验列表 API' },
    { href: '/api/tasks?status=todo&take=20', label: '任务列表 API' },
    { href: '/api/dashboard-summary', label: '看板汇总 API' },
    { href: '/api/search?q=edge ai', label: '统一搜索 API 示例' },
    { href: '/api/model-route?taskType=literature_gap', label: '模型路由 API 示例' },
    { href: '/api/model-failover?taskType=code_execution&failed=openai-codex/gpt-5.3-codex&error=429', label: '模型故障切换 API 示例' },
  ];

  return (
    <main style={{ maxWidth: 1080, margin: '24px auto', padding: 24 }}>
      <h1 style={{ marginTop: 0 }}>Quick 入口页</h1>
      <p style={{ color: '#334155' }}>一页直达全部常用页面与 API 测试链接。</p>

      <section style={noticeStyle}>
        <div style={{ fontWeight: 700 }}>推荐访问基址：{recommended}</div>
        <div style={{ marginTop: 6, color: '#1e3a8a' }}>
          检测结果：{isPrimaryAvailable ? `${primary} 可访问（优先）` : `${primary} 不可访问，已切换推荐 ${fallback}`}
        </div>
      </section>

      <section style={{ marginTop: 18 }}>
        <h2>网页入口</h2>
        <div style={gridStyle}>
          {appLinks.map((item) => (
            <a key={item.href} href={`${recommended}${item.href}`} style={cardStyle}>
              {item.label}
              <small style={{ display: 'block', marginTop: 6, color: '#64748b' }}>{recommended}{item.href}</small>
            </a>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 22 }}>
        <h2>API 测试链接</h2>
        <div style={gridStyle}>
          {apiLinks.map((item) => (
            <a key={item.href} href={`${recommended}${item.href}`} style={apiCardStyle}>
              {item.label}
              <small style={{ display: 'block', marginTop: 6, color: '#64748b' }}>{recommended}{item.href}</small>
            </a>
          ))}
        </div>
      </section>

      <p style={{ marginTop: 24 }}>
        <Link href="/">← 返回首页</Link>
      </p>
    </main>
  );
}

const noticeStyle = {
  background: '#eff6ff',
  border: '1px solid #bfdbfe',
  borderRadius: 12,
  padding: 14,
};

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
  gap: 12,
};

const cardStyle = {
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: 10,
  padding: 14,
  textDecoration: 'none',
  color: '#0f172a',
  fontWeight: 600,
};

const apiCardStyle = {
  ...cardStyle,
  background: '#f8fafc',
};
