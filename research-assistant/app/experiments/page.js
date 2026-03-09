import { prisma } from '@/lib/prisma';
import ExperimentsClient from './experiments-client';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;

export default async function ExperimentsPage() {
  const [experiments, experimentsTotal, datasets, papers, stats] = await Promise.all([
    prisma.experiment.findMany({
      orderBy: { createdAt: 'desc' },
      take: PAGE_SIZE,
      include: { 
        dataset: true,
        sourcePaper: { select: { id: true, title: true, year: true } }
      },
    }),
    prisma.experiment.count(),
    prisma.dataset.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, type: true, source: true, version: true },
      take: 200,
    }),
    prisma.paper.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, year: true, venueTier: true },
      take: 100,
    }),
    // 统计信息
    prisma.experiment.groupBy({
      by: ['status'],
      _count: { status: true }
    })
  ]);

  const statusStats = {
    draft: 0, running: 0, completed: 0, failed: 0, archived: 0,
    ...Object.fromEntries(stats.map(s => [s.status, s._count.status]))
  };

  return (
    <main style={{ maxWidth: 1200, margin: '32px auto', padding: '0 24px' }}>
      {/* Header */}
      <div className="animate-fadeIn" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{ 
            width: 48, height: 48, borderRadius: 14,
            background: 'linear-gradient(135deg, #10b981, #0ea5e9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24
          }}>
            🧪
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800 }}>实验库</h1>
            <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)' }}>
              全生命周期管理：构思 → 设计 → 运行 → 分析 → 归档
            </p>
          </div>
        </div>
      </div>

      {/* Status Overview */}
      <div className="animate-fadeIn grid-stats" style={{ marginBottom: 24 }}>
        <StatusCard title="构思中" value={statusStats.draft} icon="💡" color="#f59e0b" />
        <StatusCard title="运行中" value={statusStats.running} icon="⚡" color="#3b82f6" />
        <StatusCard title="已完成" value={statusStats.completed} icon="✅" color="#10b981" />
        <StatusCard title="失败" value={statusStats.failed} icon="❌" color="#ef4444" />
        <StatusCard title="已归档" value={statusStats.archived} icon="📦" color="#6b7280" />
      </div>

      {/* Main Content */}
      <ExperimentsClient
        datasets={datasets}
        papers={papers}
        initialItems={experiments}
        initialMeta={{
          total: experimentsTotal,
          page: 1,
          pageSize: PAGE_SIZE,
          totalPages: Math.max(1, Math.ceil(experimentsTotal / PAGE_SIZE)),
          hasMore: PAGE_SIZE < experimentsTotal,
        }}
      />
    </main>
  );
}

function StatusCard({ title, value, icon, color }) {
  return (
    <div className="card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ 
        width: 48, height: 48, borderRadius: 12,
        background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 24
      }}>
        {icon}
      </div>
      <div>
        <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
      </div>
    </div>
  );
}
