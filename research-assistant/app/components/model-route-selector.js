'use client';

import { useState } from 'react';

const TASKS = [
  { key: 'code_execution', label: '代码执行（重构/修错）' },
  { key: 'literature_gap', label: '文献空白分析' },
  { key: 'paper_screening', label: '论文筛选与分层' },
  { key: 'figure_understanding', label: '图表/图像理解' },
  { key: 'daily_weekly', label: '日报/周报生成' },
  { key: 'paper_writing', label: '论文写作与润色' },
  { key: 'quick_iter', label: '快速迭代任务' },
];

export default function ModelRouteSelector() {
  const [taskType, setTaskType] = useState('paper_screening');
  const [loading, setLoading] = useState(false);
  const [route, setRoute] = useState(null);
  const [error, setError] = useState('');

  const loadRoute = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/model-route?taskType=${encodeURIComponent(taskType)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || '查询失败');
      setRoute(json);
    } catch (e) {
      setRoute(null);
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section style={{ marginTop: 18, background: '#fff', borderRadius: 12, padding: 16 }}>
      <h3 style={{ marginTop: 0 }}>任务类型选择器（模型路由）</h3>
      <p style={{ color: '#666', marginTop: 0 }}>选择任务类型，查看当前主模型与降级链路。</p>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <select
          value={taskType}
          onChange={(e) => setTaskType(e.target.value)}
          style={{ padding: '8px 10px', border: '1px solid #d0d7de', borderRadius: 8, minWidth: 260 }}
        >
          {TASKS.map((t) => (
            <option key={t.key} value={t.key}>{t.label}</option>
          ))}
        </select>
        <button onClick={loadRoute} disabled={loading} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #2563eb', background: '#2563eb', color: '#fff', cursor: 'pointer' }}>
          {loading ? '查询中...' : '查询路由'}
        </button>
      </div>

      {error && <div style={{ marginTop: 10, color: '#b42318' }}>错误：{error}</div>}

      {route && (
        <div style={{ marginTop: 12, border: '1px solid #e5e7eb', borderRadius: 10, padding: 12, background: '#fafafa' }}>
          <div><strong>任务类型：</strong>{route.taskType}</div>
          <div><strong>主模型：</strong>{route.primary}</div>
          <div><strong>Fallback：</strong>{(route.fallbacks || []).length ? route.fallbacks.join(' → ') : '无'}</div>
          <div><strong>超时：</strong>{route.timeoutMs} ms</div>
          <div><strong>重试：</strong>{route.maxRetries}</div>
        </div>
      )}
    </section>
  );
}
