'use client';

import { useState } from 'react';

const cardStyle = {
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: 12,
  padding: 14,
};

const inputStyle = {
  width: '100%',
  border: '1px solid #d1d5db',
  borderRadius: 8,
  padding: '8px 10px',
  fontSize: 14,
};

const thStyle = {
  textAlign: 'left',
  borderBottom: '1px solid #e5e7eb',
  padding: '6px 4px',
  color: '#4b5563',
  fontWeight: 600,
};

const tdStyle = {
  borderBottom: '1px solid #f3f4f6',
  padding: '6px 4px',
  color: '#111827',
};

export default function DatasetsClient({ initialDatasets, typeOptions, sourceOptions, selectedType, selectedSource }) {
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    setSubmitting(true);
    setMessage('正在保存...');

    try {
      const res = await fetch('/api/datasets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || '保存失败');
      }

      setMessage('✅ 已登记数据集元数据');
      form.reset();
      window.location.reload();
    } catch (error) {
      setMessage(`❌ ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
      <section style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>数据集列表</h3>

        <form method="get" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 10, marginBottom: 12 }}>
          <select name="type" defaultValue={selectedType} style={inputStyle}>
            <option value="">全部类型</option>
            {typeOptions.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select name="source" defaultValue={selectedSource} style={inputStyle}>
            <option value="">全部来源</option>
            {sourceOptions.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button type="submit" style={{ border: 0, borderRadius: 8, padding: '0 14px', background: '#2563eb', color: '#fff' }}>筛选</button>
        </form>

        {!initialDatasets.length ? (
          <p style={{ color: '#6b7280' }}>暂无数据集记录。</p>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {initialDatasets.map((d) => (
              <article key={d.id} style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <strong>{d.name}</strong>
                  <span style={{ color: '#6b7280', fontSize: 13 }}>关联实验：{d._count?.experiments ?? 0}</span>
                </div>
                <p style={{ margin: '8px 0', color: '#4b5563' }}>{d.note || '暂无备注'}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 13 }}>
                  <Tag label={`类型：${d.type ?? '-'}`} />
                  <Tag label={`来源：${d.source ?? '-'}`} />
                  {d.version ? <Tag label={`版本：${d.version}`} /> : null}
                  {d.license ? <Tag label={`License：${d.license}`} /> : null}
                  {typeof d.sizeBytes === 'number' ? <Tag label={`大小：${d.sizeBytes} bytes`} /> : null}
                </div>

                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 13, color: '#374151', marginBottom: 6 }}>切分记录（train / val / test）</div>
                  {!d.splits?.length ? (
                    <p style={{ margin: 0, color: '#9ca3af', fontSize: 13 }}>暂无切分记录</p>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr>
                          <th style={thStyle}>split</th>
                          <th style={thStyle}>count</th>
                          <th style={thStyle}>ratio</th>
                          <th style={thStyle}>note</th>
                        </tr>
                      </thead>
                      <tbody>
                        {d.splits.map((s) => (
                          <tr key={s.id}>
                            <td style={tdStyle}>{s.split}</td>
                            <td style={tdStyle}>{s.count ?? '-'}</td>
                            <td style={tdStyle}>{typeof s.ratio === 'number' ? s.ratio : '-'}</td>
                            <td style={tdStyle}>{s.note || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>新增数据集元数据</h3>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 10 }}>
          <input name="name" placeholder="数据集名称（必填）" required style={inputStyle} />
          <input name="type" placeholder="类型（如 图像/文本/时序）" required style={inputStyle} />
          <input name="source" placeholder="来源（个人上传/模型生成/公开集）" required style={inputStyle} />
          <input name="format" placeholder="格式（可选，如 CSV/JSON）" style={inputStyle} />
          <input name="sizeText" placeholder="规模（可选，如 20k 样本）" style={inputStyle} />
          <input name="owner" placeholder="登记人（可选）" style={inputStyle} />
          <textarea name="description" placeholder="描述（可选）" rows={4} style={inputStyle} />
          <input name="tags" placeholder="标签（可选，逗号分隔）" style={inputStyle} />
          <button disabled={submitting} type="submit" style={{ border: 0, borderRadius: 8, padding: '10px 12px', background: '#111827', color: '#fff' }}>
            {submitting ? '提交中...' : '登记数据集'}
          </button>
          {message ? <p style={{ margin: 0, fontSize: 13, color: '#374151' }}>{message}</p> : null}
        </form>
      </section>
    </div>
  );
}

function Tag({ label }) {
  return <span style={{ background: '#f3f4f6', borderRadius: 999, padding: '2px 8px' }}>{label}</span>;
}
