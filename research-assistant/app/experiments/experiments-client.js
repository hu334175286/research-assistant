'use client';

import { useState } from 'react';

const box = {
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

export default function ExperimentsClient({ datasets, experiments }) {
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  async function handleCreate(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form).entries());

    if (!payload.datasetId) delete payload.datasetId;

    setSubmitting(true);
    setMessage('正在保存...');

    try {
      const res = await fetch('/api/experiments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || '保存失败');
      }

      setMessage('✅ 实验已创建');
      form.reset();
      window.location.reload();
    } catch (error) {
      setMessage(`❌ ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>
      <section style={box}>
        <h3 style={{ marginTop: 0 }}>实验列表</h3>
        {!experiments.length ? <p style={{ color: '#6b7280' }}>暂无实验记录。</p> : null}
        <ul style={{ paddingLeft: 20, margin: 0, display: 'grid', gap: 10 }}>
          {experiments.map((e) => (
            <li key={e.id}>
              <strong>{e.name}</strong>
              <div style={{ color: '#4b5563', fontSize: 13 }}>
                数据集名称：{e.dataset?.name || '未关联'}
              </div>
              <div style={{ color: '#4b5563', fontSize: 13 }}>
                datasetId：{e.datasetId || '-'}
              </div>
              <div style={{ color: '#4b5563', fontSize: 13 }}>
                datasetVersionSnapshot：{e.datasetVersionSnapshot || '-'}
              </div>
              {e.hypothesis ? <div style={{ color: '#6b7280', fontSize: 13 }}>假设：{e.hypothesis}</div> : null}
            </li>
          ))}
        </ul>
      </section>

      <section style={box}>
        <h3 style={{ marginTop: 0 }}>新增实验</h3>
        <form onSubmit={handleCreate} style={{ display: 'grid', gap: 10 }}>
          <input name="name" placeholder="实验名称（必填）" required style={inputStyle} />
          <textarea name="hypothesis" placeholder="实验假设（可选）" rows={3} style={inputStyle} />
          <textarea name="conclusion" placeholder="结论（可选）" rows={3} style={inputStyle} />
          <select name="datasetId" style={inputStyle} defaultValue="">
            <option value="">不关联数据集</option>
            {datasets.map((d) => (
              <option key={d.id} value={d.id}>{d.name}（{d.type}/{d.source}，version: {d.version || '-'}）</option>
            ))}
          </select>
          <input name="datasetVersionSnapshot" placeholder="datasetVersionSnapshot（可选，默认取数据集当前 version）" style={inputStyle} />
          <button disabled={submitting} type="submit" style={{ border: 0, borderRadius: 8, padding: '10px 12px', background: '#111827', color: '#fff' }}>
            {submitting ? '提交中...' : '创建实验'}
          </button>
          {message ? <p style={{ margin: 0, fontSize: 13, color: '#374151' }}>{message}</p> : null}
        </form>
      </section>
    </div>
  );
}
