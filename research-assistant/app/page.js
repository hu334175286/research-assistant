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
    <main style={{ maxWidth: 1200, margin: '32px auto', padding: '0 24px' }}>
      {/* Hero Section */}
      <section className="animate-fadeIn" style={{ 
        background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #0ea5e9 100%)', 
        color: '#fff', 
        borderRadius: 24, 
        padding: '48px 40px',
        boxShadow: '0 20px 40px rgba(37, 99, 235, 0.3)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="badge badge-blue" style={{ marginBottom: 16, background: 'rgba(255,255,255,0.2)', color: '#fff' }}>
            🔬 智能物联感知与处理
          </div>
          <h1 style={{ margin: '0 0 16px', fontSize: 42, fontWeight: 800, letterSpacing: '-0.02em' }}>
            个人研究助手
          </h1>
          <p style={{ opacity: 0.9, fontSize: 18, maxWidth: 600, margin: '0 0 28px', lineHeight: 1.6 }}>
            文献智能收集 · 实验记录管理 · 日报周报自动生成 · 模型路由调度
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <Link href="/papers" className="btn" style={{ 
              background: '#fff', color: '#2563eb', padding: '12px 24px', 
              borderRadius: 12, textDecoration: 'none', fontWeight: 600,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
            }}>
              📚 浏览文献库
            </Link>
            <Link href="/dashboard" style={{ 
              background: 'rgba(255,255,255,0.15)', color: '#fff', 
              padding: '12px 24px', borderRadius: 12, textDecoration: 'none', 
              fontWeight: 600, border: '1px solid rgba(255,255,255,0.3)',
              backdropFilter: 'blur(10px)'
            }}>
              📊 研究指挥台
            </Link>
          </div>
        </div>
        {/* Decorative elements */}
        <div style={{ position: 'absolute', top: -50, right: -50, width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
        <div style={{ position: 'absolute', bottom: -80, right: 100, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />
      </section>

      {/* Stats Cards */}
      <section className="animate-fadeIn" style={{ marginTop: 32 }}>
        <div className="grid-stats">
          <StatCard title="文献总量" value={paperCount} icon="📚" color="#2563eb" />
          <StatCard title="实验记录" value={expCount} icon="🧪" color="#10b981" />
          <StatCard title="待办任务" value={taskCount} icon="✅" color="#f59e0b" />
          <StatCard title="模型路由" value="v3" icon="⚡" color="#8b5cf6" />
        </div>
      </section>

      {/* Quick Access Grid */}
      <section className="animate-fadeIn" style={{ marginTop: 32 }}>
        <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20, color: 'var(--text)' }}>快速入口</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          <QuickCard href="/papers" icon="📚" title="文献管理" desc="arXiv 抓取、筛选、导出" color="#2563eb" />
          <QuickCard href="/datasets" icon="💾" title="数据集中心" desc="数据集版本管理与关联" color="#10b981" />
          <QuickCard href="/experiments" icon="🧪" title="实验记录" desc="实验假设、结果、数据集关联" color="#f59e0b" />
          <QuickCard href="/visual-insights" icon="📈" title="科研可视化" desc="数据洞察与趋势分析" color="#8b5cf6" />
          <QuickCard href="/reports/daily" icon="📅" title="日报查看" desc="每日研究进展汇总" color="#0ea5e9" />
          <QuickCard href="/reports/weekly" icon="📊" title="周报查看" desc="每周研究成果总结" color="#ec4899" />
        </div>
      </section>

      {/* API & Tools */}
      <section className="animate-fadeIn" style={{ marginTop: 32 }}>
        <div className="card-elevated" style={{ padding: 24 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>开发者工具</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <CodeLink href="/api/model-route?taskType=literature_gap" label="模型路由 API" />
            <CodeLink href="/api/papers/auto-fetch?run=1" label="立即抓取文献" />
            <CodeLink href="/api/delivery-status" label="落地状态 API" />
            <CodeLink href="/delivery" label="功能落地清单" />
          </div>
        </div>
      </section>

      {/* Failover Events */}
      {failoverEvents.length > 0 && (
        <section className="animate-fadeIn" style={{ marginTop: 32 }}>
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>最近模型切换事件</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--border)' }}>
                    <th style={th}>时间</th>
                    <th style={th}>任务类型</th>
                    <th style={th}>From</th>
                    <th style={th}>To</th>
                    <th style={th}>原因</th>
                  </tr>
                </thead>
                <tbody>
                  {failoverEvents.map((event, idx) => (
                    <tr key={`${event.ts || 'na'}-${idx}`} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={td}>{event.ts || '-'}</td>
                      <td style={td}><span className="badge badge-blue">{event.taskType || '-'}</span></td>
                      <td style={td}>{event.from || '-'}</td>
                      <td style={td}>{event.to || '-'}</td>
                      <td style={td}>{event.reason || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      <ModelRouteSelector />
    </main>
  );
}

function StatCard({ title, value, icon, color }) {
  return (
    <div className="card hover-lift" style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ 
        width: 56, height: 56, borderRadius: 16, 
        background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 28
      }}>
        {icon}
      </div>
      <div>
        <div style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 32, fontWeight: 700, color }}>{value}</div>
      </div>
    </div>
  );
}

function QuickCard({ href, icon, title, desc, color }) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div className="card hover-lift" style={{ padding: 20, height: '100%' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>{icon}</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>{title}</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{desc}</div>
      </div>
    </Link>
  );
}

function CodeLink({ href, label }) {
  return (
    <a href={href} style={{ 
      padding: '8px 16px', background: 'var(--bg)', borderRadius: 8,
      color: 'var(--primary)', textDecoration: 'none', fontSize: 13, fontWeight: 500,
      border: '1px solid var(--border)', fontFamily: 'monospace'
    }}>
      {label}
    </a>
  );
}

const th = { padding: '10px 12px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase' };
const td = { padding: '10px 12px', color: 'var(--text)' };
