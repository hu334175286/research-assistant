import Link from 'next/link';
import { getRecommendedBaseUrl } from '@/lib/recommended-base-url';
import ModelSwitchPanel from '@/app/components/model-switch-panel';
import { getModelHealthSummary } from '@/lib/model-health';
import { getLatestModelSwitchEvent } from '@/lib/model-switch-log';
import { readLatestVerifyResult } from '@/lib/verify-runner';
import { readCurrentModel } from '@/lib/model-runtime-status';
import { getRuntimePortHealth } from '@/lib/runtime-port-health';

const healthColorMap = {
  green: { bg: '#dcfce7', fg: '#166534', border: '#86efac', text: '绿色' },
  yellow: { bg: '#fef9c3', fg: '#854d0e', border: '#fde047', text: '黄色' },
  red: { bg: '#fee2e2', fg: '#991b1b', border: '#fca5a5', text: '红色' },
};

export default async function QuickPage() {
  const [recommendedInfo, modelHealthList, latestSwitchEvent, currentModel, runtimeHealth] = await Promise.all([
    getRecommendedBaseUrl(),
    getModelHealthSummary(),
    getLatestModelSwitchEvent(),
    readCurrentModel(),
    getRuntimePortHealth(),
  ]);

  let latestVerifyStatus = null;
  try {
    latestVerifyStatus = await readLatestVerifyResult();
  } catch {
    latestVerifyStatus = null;
  }

  const { recommended, primary, fallback, isPrimaryAvailable, checks: baseUrlChecks = [] } = recommendedInfo;

  const appLinks = [
    { href: '/tools', label: '科研工具中心 Tools' },
    { href: '/api/tools', label: '工具配置 API' },
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
    { href: '/api/model-switch', label: '模型手动切换 API（POST）' },
    { href: '/api/model-health', label: '模型健康度 API' },
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
        <div style={{ marginTop: 8, fontSize: 13, color: '#334155' }}>
          基址巡检：{baseUrlChecks.map((item) => `${item.url} ${item.available ? '✅' : '❌'}`).join(' ｜ ')}
        </div>
      </section>

      <section style={{ marginTop: 18 }}>
        <h2>端口与健康检查（3000 / 3124）</h2>
        <div style={gridStyle}>
          {runtimeHealth.checks.map((item) => (
            <div key={item.port} style={cardStyle}>
              <div style={metaLabelStyle}>端口 {item.port}</div>
              <div style={metaValueStyle}>{item.ok ? '✅ 运行中' : '❌ 未响应'}</div>
              <small style={metaHintStyle}>监听地址：{item.baseUrl}</small>
              <small style={metaHintStyle}>/ 状态：{item.rootStatus ?? 'timeout'}（{item.rootMs}ms）</small>
              <small style={metaHintStyle}>/api/tools 状态：{item.apiStatus ?? 'timeout'}（{item.apiMs}ms）</small>
            </div>
          ))}
          <div style={cardStyle}>
            <div style={metaLabelStyle}>当前建议端口</div>
            <div style={metaValueStyle}>{runtimeHealth.activePort ?? '未检测到活动服务'}</div>
            <small style={metaHintStyle}>建议地址：{runtimeHealth.activeBaseUrl || recommended}</small>
          </div>
        </div>
      </section>

      <section style={{ marginTop: 18 }}>
        <h2>系统状态总览</h2>
        <div style={gridStyle}>
          <div style={cardStyle}>
            <div style={metaLabelStyle}>模型当前</div>
            <div style={metaValueStyle}>{currentModel?.label || 'unknown'}</div>
            <small style={metaHintStyle}>{currentModel?.model || '未读取到模型 ID'}</small>
          </div>
          <div style={cardStyle}>
            <div style={metaLabelStyle}>最近切换</div>
            <div style={metaValueStyle}>{latestSwitchEvent ? `${latestSwitchEvent.from || '-'} → ${latestSwitchEvent.to || '-'}` : '暂无记录'}</div>
            <small style={metaHintStyle}>{latestSwitchEvent?.ts || '尚未发生手动切换'}</small>
          </div>
          <div style={cardStyle}>
            <div style={metaLabelStyle}>推荐基址</div>
            <div style={metaValueStyle}>{recommended}</div>
            <small style={metaHintStyle}>{isPrimaryAvailable ? '主基址可访问' : '主基址异常，已自动推荐备用基址'}</small>
          </div>
          <div style={cardStyle}>
            <div style={metaLabelStyle}>验证状态</div>
            <div style={metaValueStyle}>{latestVerifyStatus?.ok ? '✅ verify 通过' : latestVerifyStatus ? '❌ verify 未通过' : '未执行 verify'}</div>
            <small style={metaHintStyle}>{latestVerifyStatus?.ts || '点击下方按钮可一键触发 verify'}</small>
          </div>
        </div>
      </section>

      <section style={{ marginTop: 18 }}>
        <h2>模型可用性 / 配额预警</h2>
        <p style={{ marginTop: 6, color: '#475569', fontSize: 14 }}>
          部分 provider 不返回真实剩余额度，当前为事件近似预警。
        </p>
        <div style={gridStyle}>
          {modelHealthList.map((item) => {
            const palette = healthColorMap[item.health] || healthColorMap.green;
            return (
              <div key={item.model} style={{ ...healthCardStyle, borderColor: palette.border }}>
                <div style={{ fontWeight: 600, color: '#0f172a' }}>{item.model}</div>
                <div style={{ marginTop: 8, display: 'inline-block', padding: '2px 10px', borderRadius: 999, background: palette.bg, color: palette.fg, fontSize: 12, fontWeight: 700 }}>
                  {palette.text}
                </div>
                <div style={{ marginTop: 10, fontSize: 13, color: '#334155' }}>最近失败次数：{item.failCount}</div>
                <div style={{ marginTop: 4, fontSize: 13, color: '#334155' }}>最近切换事件数：{item.switchCount}</div>
              </div>
            );
          })}
        </div>
      </section>

      <ModelSwitchPanel />

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

const healthCardStyle = {
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: 10,
  padding: 14,
};

const metaLabelStyle = {
  fontSize: 13,
  color: '#64748b',
};

const metaValueStyle = {
  marginTop: 6,
  fontWeight: 700,
  color: '#0f172a',
  wordBreak: 'break-all',
};

const metaHintStyle = {
  display: 'block',
  marginTop: 6,
  color: '#64748b',
};
