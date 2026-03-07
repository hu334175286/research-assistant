import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import ModelRouteSelector from '@/app/components/model-route-selector';
import { listRecentFailoverEvents } from '@/lib/model-failover-events';

export default async function HomePage() {
  const [paperCount, expCount, taskCount, failoverEvents] = await Promise.all([
    prisma.paper.count(),
    prisma.experiment.count(),
    prisma.task.count({ where: { status: { in: ['todo', 'doing', 'blocked'] } } }),
    listRecentFailoverEvents(10),
  ]);

  return (
    <main style={{ maxWidth: 1100, margin: '24px auto', padding: 24 }}>
      <section style={{ background: 'linear-gradient(135deg, #1d4ed8, #0ea5e9)', color: '#fff', borderRadius: 16, padding: 24 }}>
        <h1 style={{ margin: 0 }}>个人研究助手门户</h1>
        <p style={{ opacity: 0.95 }}>聚焦“智能物联感知与处理”：文献收集、实验记录、日报周报、模型路由。</p>
        <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
          <Link href="/papers" style={btn}>去文献库</Link>
          <Link href="/dashboard" style={btnGhost}>打开研究指挥台</Link>
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 18 }}>
        <Card title="文献总量" value={String(paperCount)} />
        <Card title="实验总量" value={String(expCount)} />
        <Card title="待办任务" value={String(taskCount)} />
      </section>

      <section style={{ marginTop: 18, background: '#fff', borderRadius: 12, padding: 16 }}>
        <h3 style={{ marginTop: 0 }}>快速入口</h3>
        <ul style={{ lineHeight: 1.9 }}>
          <li><Link href="/papers">文献管理（含 arXiv 抓取接口）</Link></li>
          <li><Link href="/experiments">实验记录</Link></li>
          <li><Link href="/visual-insights">科研可视化看板</Link></li>
          <li><Link href="/reports/daily">日报查看</Link> / <Link href="/reports/weekly">周报查看</Link></li>
          <li><a href="/api/model-route?taskType=literature_gap">模型路由示例 API</a></li>
          <li><a href="/api/model-failover?taskType=code_execution&failed=openai-codex/gpt-5.3-codex&error=429">故障切换示例 API</a></li>
        </ul>
      </section>

      <section style={{ marginTop: 18, background: '#fff', borderRadius: 12, padding: 16 }}>
        <h3 style={{ marginTop: 0 }}>最近模型切换事件</h3>
        {failoverEvents.length ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid #eee' }}>
                  <th style={th}>时间</th>
                  <th style={th}>任务类型</th>
                  <th style={th}>From</th>
                  <th style={th}>To</th>
                  <th style={th}>原因</th>
                  <th style={th}>范围</th>
                </tr>
              </thead>
              <tbody>
                {failoverEvents.map((event, idx) => (
                  <tr key={`${event.ts || 'na'}-${idx}`} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={td}>{event.ts || '-'}</td>
                    <td style={td}>{event.taskType || '-'}</td>
                    <td style={td}>{event.from || '-'}</td>
                    <td style={td}>{event.to || '-'}</td>
                    <td style={td}>{event.reason || '-'}</td>
                    <td style={td}>{event.scope || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: '#666', marginBottom: 0 }}>暂无切换事件。</p>
        )}
      </section>

      <ModelRouteSelector />
    </main>
  );
}

const btn = { background: '#fff', color: '#1d4ed8', padding: '8px 12px', borderRadius: 8, textDecoration: 'none', fontWeight: 600 };
const btnGhost = { background: 'rgba(255,255,255,.16)', color: '#fff', padding: '8px 12px', borderRadius: 8, textDecoration: 'none', fontWeight: 600, border: '1px solid rgba(255,255,255,.35)' };
const th = { padding: '8px 10px', fontWeight: 600, color: '#374151' };
const td = { padding: '8px 10px', color: '#111827', whiteSpace: 'nowrap' };

function Card({ title, value }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
      <div style={{ color: '#666', fontSize: 13 }}>{title}</div>
      <div style={{ fontSize: 30, fontWeight: 700 }}>{value}</div>
    </div>
  );
}
