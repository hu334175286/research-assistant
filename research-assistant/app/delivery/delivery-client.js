'use client';

import { useMemo, useState } from 'react';
import { ui, statusPill } from '@/app/components/unified-ui';

const STATUS_OPTIONS = [
  { key: 'all', label: '全部' },
  { key: 'completed', label: '已完成' },
  { key: 'in_progress', label: '进行中' },
  { key: 'planned', label: '待开发' },
];

const STATUS_STYLE = {
  completed: { text: '已完成', color: '#166534', bg: '#dcfce7' },
  in_progress: { text: '进行中', color: '#92400e', bg: '#fef3c7' },
  planned: { text: '待开发', color: '#1e3a8a', bg: '#dbeafe' },
};

function Badge({ status }) {
  const cfg = STATUS_STYLE[status] || STATUS_STYLE.planned;
  return (
    <span style={{ ...statusPill(status === 'completed' ? 'success' : status === 'in_progress' ? 'warning' : 'info') }}>
      {cfg.text}
    </span>
  );
}

export default function DeliveryClient({ project, updatedAt, sourceNote, items }) {
  const [status, setStatus] = useState('all');

  const filtered = useMemo(
    () => (status === 'all' ? items : items.filter((item) => item.status === status)),
    [items, status],
  );

  const summary = useMemo(() => {
    const base = { total: filtered.length, completed: 0, in_progress: 0, planned: 0 };
    filtered.forEach((item) => {
      base[item.status] += 1;
    });
    const toPct = (v) => (base.total ? `${((v / base.total) * 100).toFixed(1)}%` : '0.0%');
    return {
      ...base,
      completionRate: toPct(base.completed),
      inProgressRate: toPct(base.in_progress),
      plannedRate: toPct(base.planned),
    };
  }, [filtered]);

  return (
    <main style={ui.page}>
      <h2 style={{ marginTop: 0 }}>功能落地清单</h2>
      <p style={{ color: '#6b7280', marginTop: 6 }}>
        项目：{project} ｜ 更新时间：{updatedAt || '-'} ｜ 接口：
        <a href="/api/delivery-status" target="_blank" rel="noreferrer"> /api/delivery-status</a>
      </p>

      <section style={{ ...ui.cardSoft, marginTop: 12 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>示例数据来源说明</div>
        <div style={{ color: '#475569', fontSize: 14 }}>
          {sourceNote || '默认展示真实配置数据；若条目不足，seed:demo 会注入带 [DEMO] 标记的演示条目。'}
        </div>
      </section>

      <section style={{ ...ui.card, marginTop: 12 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setStatus(opt.key)}
              style={{
                ...ui.buttonGhost,
                padding: '6px 10px',
                border: status === opt.key ? '1px solid #2563eb' : '1px solid #d1d5db',
                background: status === opt.key ? '#eff6ff' : '#fff',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div style={{ marginTop: 10, color: '#374151', fontSize: 14 }}>
          共 {summary.total} 项：已完成 {summary.completed}（{summary.completionRate}）｜ 进行中 {summary.in_progress}（{summary.inProgressRate}）｜ 待开发 {summary.planned}（{summary.plannedRate}）
        </div>
      </section>

      <section style={{ marginTop: 14, display: 'grid', gap: 12 }}>
        {filtered.length ? filtered.map((item) => (
          <article key={item.id} style={ui.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 18 }}>
                {item.feature}
                {item.demo ? <span style={{ ...statusPill('info'), marginLeft: 8 }}>[DEMO]</span> : null}
              </h3>
              <Badge status={item.status} />
            </div>
            <p style={{ color: '#4b5563', marginTop: 8, marginBottom: 8 }}>{item.description}</p>
            <div style={{ fontSize: 14 }}>
              可验证链接：
              {item.verifyLinks.length ? (
                item.verifyLinks.map((link, idx) => (
                  <span key={`${item.id}-${link}`}>
                    {idx ? ' ｜ ' : ' '}
                    <a href={link} target="_blank" rel="noreferrer">{link}</a>
                  </span>
                ))
              ) : (
                <span style={{ color: '#6b7280' }}>暂无</span>
              )}
            </div>
          </article>
        )) : (
          <div style={ui.empty}>
            <strong>当前状态筛选下暂无条目</strong>
            <p style={{ margin: '8px 0 0', fontSize: 13 }}>建议切换到“全部”，或检查 config/delivery-checklist.json 中状态字段是否为 completed / in_progress / planned。</p>
          </div>
        )}
      </section>
    </main>
  );
}
