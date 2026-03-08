import Link from 'next/link';
import { loadToolsConfig } from '@/lib/tools-config';

function Card({ title, children }) {
  return (
    <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 14 }}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      {children}
    </section>
  );
}

export default async function ToolsPage() {
  const { builtIn, externalGroups, sourceNote } = loadToolsConfig();

  return (
    <main style={{ maxWidth: 1100, margin: '24px auto', padding: 24 }}>
      <h2 style={{ marginTop: 0 }}>科研工具中心</h2>
      <p style={{ color: '#6b7280' }}>原则：高频能力内置，低频/专业能力外链聚合。</p>

      <p style={{ marginTop: 8 }}>
        <a href="/api/tools" target="_blank" rel="noreferrer">查看工具配置 API（/api/tools）</a>
      </p>

      <section style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 12, padding: 14, marginBottom: 14 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>示例数据来源说明</div>
        <div style={{ color: '#475569', fontSize: 14 }}>
          {sourceNote || '工具列表优先展示真实配置；如内容不足，可通过 seed:demo 注入带 [DEMO] 标记的演示工具。'}
        </div>
      </section>

      <div style={{ display: 'grid', gap: 14 }}>
        <Card title="内置能力（推荐优先使用）">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
            {builtIn.map((t) => (
              <Link
                key={t.id || t.name}
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
                <div style={{ fontWeight: 700 }}>
                  {t.name}
                  {t.demo ? <span style={{ marginLeft: 8, fontSize: 12, color: '#1d4ed8', background: '#dbeafe', borderRadius: 999, padding: '2px 8px' }}>[DEMO]</span> : null}
                </div>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 6 }}>{t.desc}</div>
              </Link>
            ))}
          </div>
        </Card>

        {externalGroups.map((group) => (
          <Card key={group.id || group.category} title={group.category}>
            <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8 }}>
              {(group.items || []).map((item) => (
                <li key={item.id || item.name}>
                  <a href={item.url} target="_blank" rel="noreferrer">{item.name}</a>
                  {item.demo ? <span style={{ marginLeft: 6, fontSize: 12, color: '#1d4ed8', background: '#dbeafe', borderRadius: 999, padding: '1px 8px' }}>[DEMO]</span> : null}
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
