import Link from 'next/link';
import { getRecommendedBaseUrl } from '@/lib/recommended-base-url';
import ModelSwitchPanel from '@/app/components/model-switch-panel';
import { getModelHealthSummary } from '@/lib/model-health';
import { getLatestModelSwitchEvent } from '@/lib/model-switch-log';
import { readLatestVerifyResult } from '@/lib/verify-runner';
import { readCurrentModel } from '@/lib/model-runtime-status';
import { getRuntimePortHealth } from '@/lib/runtime-port-health';
import { loadDemoExamples } from '@/lib/demo-examples';
import { ui, statusPill } from '@/app/components/unified-ui';

const healthColorMap = {
  green: { bg: '#dcfce7', fg: '#166534', border: '#86efac', text: '绿色' },
  yellow: { bg: '#fef9c3', fg: '#854d0e', border: '#fde047', text: '黄色' },
  red: { bg: '#fee2e2', fg: '#991b1b', border: '#fca5a5', text: '红色' },
};

export default async function QuickPage() {
  let pageError = null;
  let recommendedInfo;
  let modelHealthList = [];
  let latestSwitchEvent = null;
  let currentModel = null;
  let runtimeHealth = { checks: [], activePort: null, activeBaseUrl: null };

  try {
    [recommendedInfo, modelHealthList, latestSwitchEvent, currentModel, runtimeHealth] = await Promise.all([
      getRecommendedBaseUrl(),
      getModelHealthSummary(),
      getLatestModelSwitchEvent(),
      readCurrentModel(),
      getRuntimePortHealth(),
    ]);
  } catch {
    pageError = '系统状态加载失败，请稍后刷新；若持续异常，可先访问 /api/tools 进行连通性排查。';
  }

  let latestVerifyStatus = null;
  try {
    latestVerifyStatus = await readLatestVerifyResult();
  } catch {
    latestVerifyStatus = null;
  }

  const {
    recommended = 'http://127.0.0.1:3000',
    primary = 'http://127.0.0.1:3000',
    fallback = 'http://127.0.0.1:3124',
    isPrimaryAvailable = true,
    checks: baseUrlChecks = [],
  } = recommendedInfo || {};

  const demoExamples = loadDemoExamples();

  const appLinks = [
    { href: '/dashboard', label: '研究指挥台 Dashboard', desc: '项目总览与任务推进' },
    { href: '/papers', label: '文献库 Papers', desc: '检索、筛选与导出文献' },
    { href: '/search', label: '搜索 Search', desc: '统一搜索资料与结论' },
    { href: '/visual-insights', label: '可视化 Visual Insights', desc: '关键指标图表分析' },
    { href: '/experiments', label: '实验记录 Experiments', desc: '实验追踪与复盘' },
    { href: '/reports/daily', label: '日报 Reports Daily', desc: '自动生成日报' },
    { href: '/reports/weekly', label: '周报 Reports Weekly', desc: '周复盘与趋势追踪' },
    { href: '/tools', label: '科研工具中心 Tools', desc: '工具配置与执行入口' },
  ];

  const apiLinks = [
    { href: '/api/papers', label: '文献列表 API' },
    { href: '/api/papers/arxiv?q=edge ai', label: 'arXiv 搜索 API 示例' },
    { href: '/api/papers/quality-summary', label: '文献质量汇总 API' },
    { href: '/api/papers/auto-fetch?run=1', label: '触发自动抓取 API' },
    { href: '/api/model-switch', label: '模型手动切换 API（POST）' },
    { href: '/api/model-health', label: '模型健康度 API' },
  ];

  return (
    <main style={ui.page}>
      <section style={heroStyle}>
        <div>
          <h1 style={{ margin: 0, fontSize: 30 }}>Quick 工作台</h1>
          <p style={{ margin: '8px 0 0', color: '#475569' }}>今日进展、一键操作、模块导航、最近更新一页完成。</p>
          <p style={{ margin: '8px 0 0', color: '#1e3a8a', fontSize: 13 }}>
            推荐访问：{recommended}（{isPrimaryAvailable ? `${primary} 可访问` : `${primary} 异常，已切换 ${fallback}`}）
          </p>
        </div>
        <div style={heroActionsStyle}>
          <a href={`${recommended}/api/papers/auto-fetch?run=1`} style={primaryBtnStyle}>一键抓取文献</a>
          <a href={`${recommended}/api/model-health`} style={secondaryBtnStyle}>查看模型健康度</a>
          <a href={`${recommended}/api/tools`} style={secondaryBtnStyle}>工具配置 API</a>
        </div>
      </section>

      {pageError ? (
        <section style={errorStateStyle}>
          <strong>状态加载异常</strong>
          <p style={{ margin: '8px 0 0' }}>{pageError}</p>
          <p style={{ margin: '8px 0 0', fontSize: 13 }}>建议操作：先访问 /api/tools，确认服务正常后返回本页刷新。</p>
        </section>
      ) : null}

      <section style={{ marginTop: 18 }}>
        <h2 style={sectionTitleStyle}>今日进展</h2>
        <div style={gridStyle}>
          <StatusCard title="当前模型" value={currentModel?.label || 'unknown'} hint={currentModel?.model || '未读取到模型 ID'} />
          <StatusCard
            title="验证状态"
            value={latestVerifyStatus?.ok ? '✅ verify 通过' : latestVerifyStatus ? '❌ verify 未通过' : '未执行 verify'}
            hint={latestVerifyStatus?.ts || '可先运行 npm run verify，再回到本页确认'}
          />
          <StatusCard
            title="最近模型切换"
            value={latestSwitchEvent ? `${latestSwitchEvent.from || '-'} → ${latestSwitchEvent.to || '-'}` : '暂无切换记录'}
            hint={latestSwitchEvent?.ts || '当前无需人工切换'}
          />
          <StatusCard
            title="活跃端口"
            value={runtimeHealth.activePort || '未检测到活动服务'}
            hint={runtimeHealth.activeBaseUrl || recommended}
          />

        </div>
      </section>

      <section style={{ marginTop: 18 }}>
        <h2 style={sectionTitleStyle}>一键操作</h2>
        <div style={gridStyle}>
          {apiLinks.map((item) => (
            <a key={item.href} href={`${recommended}${item.href}`} style={panelActionCardStyle}>
              <div style={{ fontWeight: 700 }}>{item.label}</div>
              <small style={smallLinkStyle}>{recommended}{item.href}</small>
            </a>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 18 }}>
        <h2 style={sectionTitleStyle}>模块卡片</h2>
        <div style={gridStyle}>
          {appLinks.map((item) => (
            <a key={item.href} href={`${recommended}${item.href}`} style={moduleCardStyle}>
              <div style={{ fontWeight: 700 }}>{item.label}</div>
              <div style={{ marginTop: 6, color: '#475569', fontSize: 13 }}>{item.desc}</div>
              <small style={smallLinkStyle}>{recommended}{item.href}</small>
            </a>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 18 }}>
        <h2 style={sectionTitleStyle}>最近更新</h2>
        <div style={{ ...panelStyle, padding: 14 }}>
          <div style={{ fontSize: 13, color: '#334155' }}>
            基址巡检：{baseUrlChecks.length ? baseUrlChecks.map((item) => `${item.url} ${item.available ? '✅' : '❌'}`).join(' ｜ ') : '暂无巡检结果，建议稍后刷新。'}
          </div>
          {runtimeHealth.checks?.length ? (
            <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
              {runtimeHealth.checks.map((item) => (
                <div key={item.port} style={miniCheckStyle}>
                  端口 {item.port}：{item.ok ? '✅ 运行中' : '❌ 未响应'} ｜ / {item.rootStatus ?? 'timeout'}（{item.rootMs}ms）｜ /api/tools {item.apiStatus ?? 'timeout'}（{item.apiMs}ms）
                </div>
              ))}
            </div>
          ) : (
            <div style={emptyHintStyle}>暂无端口巡检数据。你可以访问 /api/tools 进行手动连通性确认。</div>
          )}
        </div>
      </section>

      <section style={{ marginTop: 18 }}>
        <h2 style={sectionTitleStyle}>模型可用性 / 配额预警</h2>
        {modelHealthList.length ? (
          <div style={gridStyle}>
            {modelHealthList.map((item) => {
              const palette = healthColorMap[item.health] || healthColorMap.green;
              return (
                <div key={item.model} style={{ ...healthCardStyle, borderColor: palette.border }}>
                  <div style={{ fontWeight: 700 }}>{item.model}</div>
                  <div style={{ marginTop: 8 }}>
                    <span style={statusPill(item.health === 'green' ? 'success' : item.health === 'yellow' ? 'warning' : 'danger')}>
                      {palette.text}
                    </span>
                  </div>
                  <div style={{ marginTop: 10, fontSize: 13, color: '#334155' }}>最近失败次数：{item.failCount}</div>
                  <div style={{ marginTop: 4, fontSize: 13, color: '#334155' }}>最近切换事件数：{item.switchCount}</div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={emptyStateStyle}>
            <strong>暂无模型健康数据</strong>
            <p style={{ margin: '8px 0 0' }}>可先触发一次 API 调用或执行 verify，系统将自动累积健康度样本。</p>
          </div>
        )}
      </section>

      <ModelSwitchPanel />

      {demoExamples.quick.length ? (
        <section style={{ marginTop: 18 }}>
          <h2 style={sectionTitleStyle}>演示场景（DEMO）</h2>
          <div style={gridStyle}>
            {demoExamples.quick.slice(0, 3).map((item) => (
              <article key={item.id || item.title} style={moduleCardStyle}>
                <div style={{ fontSize: 12, color: '#1d4ed8', marginBottom: 6 }}>[DEMO]</div>
                <div style={{ fontWeight: 700 }}>{item.title}</div>
                <small style={{ display: 'block', marginTop: 6, color: '#64748b' }}>{item.desc}</small>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <p style={{ marginTop: 24 }}>
        <Link href="/">← 返回首页</Link>
      </p>
    </main>
  );
}

function StatusCard({ title, value, hint }) {
  return (
    <div style={panelStyle}>
      <div style={{ fontSize: 13, color: '#64748b' }}>{title}</div>
      <div style={{ marginTop: 6, fontWeight: 800, color: '#0f172a', wordBreak: 'break-all' }}>{value}</div>
      <small style={{ display: 'block', marginTop: 6, color: '#64748b' }}>{hint}</small>
    </div>
  );
}

const heroStyle = ui.hero;

const heroActionsStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 10,
  alignContent: 'flex-start',
};

const primaryBtnStyle = {
  ...ui.buttonPrimary,
  background: '#fff',
  color: '#1d4ed8',
  border: '1px solid #fff',
};

const secondaryBtnStyle = {
  ...ui.buttonGhost,
  background: 'rgba(255,255,255,0.15)',
  color: '#fff',
  border: '1px solid rgba(255,255,255,0.3)',
};

const sectionTitleStyle = ui.sectionTitle;

const gridStyle = ui.grid;

const panelStyle = ui.card;

const panelActionCardStyle = {
  ...panelStyle,
  textDecoration: 'none',
  color: '#0f172a',
  background: '#f8fafc',
};

const moduleCardStyle = {
  ...panelStyle,
  textDecoration: 'none',
  color: '#0f172a',
};

const healthCardStyle = {
  ...panelStyle,
  border: '1px solid #e2e8f0',
};

const smallLinkStyle = {
  display: 'block',
  marginTop: 8,
  color: '#64748b',
  fontSize: 12,
  wordBreak: 'break-all',
};

const emptyStateStyle = ui.empty;

const errorStateStyle = {
  ...ui.error,
  marginTop: 14,
};

const emptyHintStyle = {
  ...ui.empty,
  marginTop: 10,
  fontSize: 13,
};

const miniCheckStyle = {
  fontSize: 13,
  color: '#334155',
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: 10,
  padding: 8,
};
