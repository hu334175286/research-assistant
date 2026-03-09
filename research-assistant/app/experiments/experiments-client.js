'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

const PAGE_SIZE = 20;

const STATUS_CONFIG = {
  draft: { label: '构思中', color: '#f59e0b', bg: '#fef3c7', icon: '💡' },
  running: { label: '运行中', color: '#3b82f6', bg: '#dbeafe', icon: '⚡' },
  completed: { label: '已完成', color: '#10b981', bg: '#d1fae5', icon: '✅' },
  failed: { label: '失败', color: '#ef4444', bg: '#fee2e2', icon: '❌' },
  archived: { label: '已归档', color: '#6b7280', bg: '#f3f4f6', icon: '📦' },
};

export default function ExperimentsClient({ datasets, papers, initialItems = [], initialMeta }) {
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [datasetFilter, setDatasetFilter] = useState('all');
  const [paperFilter, setPaperFilter] = useState('all');
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [experiments, setExperiments] = useState(initialItems);
  const [meta, setMeta] = useState(initialMeta || {
    total: initialItems.length,
    page: 1,
    pageSize: PAGE_SIZE,
    totalPages: 1,
    hasMore: false,
  });
  const [loading, setLoading] = useState(false);

  // Fetch experiments with filters
  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          includeMeta: '1',
          page: String(meta.page || 1),
          pageSize: String(meta.pageSize || PAGE_SIZE),
        });

        if (keyword.trim()) params.set('keyword', keyword.trim());
        if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
        if (datasetFilter && datasetFilter !== 'all') params.set('dataset', datasetFilter);
        if (paperFilter && paperFilter !== 'all') params.set('paperId', paperFilter);

        const res = await fetch(`/api/experiments?${params.toString()}`);
        if (!res.ok) throw new Error('加载实验列表失败');

        const data = await res.json();
        setExperiments(Array.isArray(data.items) ? data.items : []);
        setMeta(data.meta || { total: 0, page: 1, pageSize: PAGE_SIZE, totalPages: 1, hasMore: false });
      } catch (error) {
        setMessage(`❌ ${error.message}`);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [keyword, statusFilter, datasetFilter, paperFilter, meta.page, meta.pageSize]);

  const summaryText = useMemo(() => {
    const total = meta?.total ?? experiments.length;
    const page = meta?.page ?? 1;
    const totalPages = meta?.totalPages ?? 1;
    return `共 ${total} 条 · 第 ${page}/${totalPages} 页`;
  }, [meta, experiments.length]);

  async function handleCreate(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
      name: formData.get('name'),
      hypothesis: formData.get('hypothesis'),
      conclusion: formData.get('conclusion'),
      tags: formData.get('tags'),
      sourcePaperId: formData.get('sourcePaperId') || null,
      datasetId: formData.get('datasetId') || null,
      datasetVersionSnapshot: formData.get('datasetVersionSnapshot'),
      codeSnapshot: formData.get('codeSnapshot'),
      environment: formData.get('environment'),
      configJson: formData.get('configJson') ? JSON.parse(formData.get('configJson')) : null,
    };

    setSubmitting(true);
    setMessage('正在创建实验...');

    try {
      const res = await fetch('/api/experiments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || '创建失败');
      }

      setMessage('✅ 实验创建成功');
      form.reset();
      setShowCreateForm(false);
      // Refresh list
      setMeta((prev) => ({ ...prev, page: 1 }));
    } catch (error) {
      setMessage(`❌ ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  async function updateStatus(id, newStatus) {
    try {
      const res = await fetch(`/api/experiments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('更新失败');
      // Refresh
      setMeta((prev) => ({ ...prev }));
    } catch (error) {
      setMessage(`❌ ${error.message}`);
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 24 }}>
      {/* Sidebar Filters */}
      <aside className="animate-slideIn">
        <div className="card" style={{ padding: 20, position: 'sticky', top: 80 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700 }}>筛选条件</h3>
          
          {/* Keyword Search */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 500 }}>
              关键词检索
            </label>
            <input
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value);
                setMeta((prev) => ({ ...prev, page: 1 }));
              }}
              placeholder="名称 / 假设 / 结论..."
              style={inputStyle}
            />
          </div>

          {/* Status Filter */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 500 }}>
              实验状态
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <FilterChip 
                active={statusFilter === 'all'} 
                onClick={() => { setStatusFilter('all'); setMeta(p => ({ ...p, page: 1 })); }}
                label="全部"
              />
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <FilterChip
                  key={key}
                  active={statusFilter === key}
                  onClick={() => { setStatusFilter(key); setMeta(p => ({ ...p, page: 1 })); }}
                  label={config.label}
                  color={config.color}
                />
              ))}
            </div>
          </div>

          {/* Dataset Filter */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 500 }}>
              关联数据集
            </label>
            <select
              value={datasetFilter}
              onChange={(e) => { setDatasetFilter(e.target.value); setMeta(p => ({ ...p, page: 1 })); }}
              style={inputStyle}
            >
              <option value="all">全部数据集</option>
              <option value="none">未关联数据集</option>
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Paper Filter */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 500 }}>
              来源文献
            </label>
            <select
              value={paperFilter}
              onChange={(e) => { setPaperFilter(e.target.value); setMeta(p => ({ ...p, page: 1 })); }}
              style={inputStyle}
            >
              <option value="all">全部文献</option>
              <option value="none">无关联文献</option>
              {papers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title.slice(0, 40)}{p.title.length > 40 ? '...' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Summary */}
          <div style={{ padding: '12px 0', borderTop: '1px solid var(--border)', fontSize: 13, color: 'var(--text-secondary)' }}>
            {summaryText}
            {loading && <span style={{ marginLeft: 8 }}>⏳</span>}
          </div>

          {/* Create Button */}
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: 12 }}
          >
            {showCreateForm ? '取消创建' : '+ 新建实验'}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="animate-fadeIn">
        {/* Create Form */}
        {showCreateForm && (
          <div className="card-elevated" style={{ padding: 24, marginBottom: 24 }}>
            <h3 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700 }}>🆕 新建实验</h3>
            <form onSubmit={handleCreate}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelStyle}>实验名称 *</label>
                  <input name="name" required style={inputStyle} placeholder="例如：WiFi感知基线实验" />
                </div>
                <div>
                  <label style={labelStyle}>标签（逗号分隔）</label>
                  <input name="tags" style={inputStyle} placeholder="wifi, csi, baseline" />
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                <label style={labelStyle}>实验假设</label>
                <textarea name="hypothesis" rows={2} style={inputStyle} placeholder="你想验证什么假设？" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
                <div>
                  <label style={labelStyle}>来源文献（可选）</label>
                  <select name="sourcePaperId" style={inputStyle} defaultValue="">
                    <option value="">不关联文献</option>
                    {papers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.year} · {p.title.slice(0, 50)}{p.title.length > 50 ? '...' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>关联数据集（可选）</label>
                  <select name="datasetId" style={inputStyle} defaultValue="">
                    <option value="">不关联数据集</option>
                    {datasets.map((d) => (
                      <option key={d.id} value={d.id}>{d.name} ({d.type})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
                <div>
                  <label style={labelStyle}>代码版本（git commit）</label>
                  <input name="codeSnapshot" style={inputStyle} placeholder="例如：a1b2c3d" />
                </div>
                <div>
                  <label style={labelStyle}>环境信息</label>
                  <input name="environment" style={inputStyle} placeholder="Python 3.9, PyTorch 2.0..." />
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                <label style={labelStyle}>配置快照（JSON格式）</label>
                <textarea name="configJson" rows={3} style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 12 }} 
                  placeholder={`{\n  "lr": 0.001,\n  "batch_size": 32,\n  "epochs": 100\n}`} />
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  {submitting ? '创建中...' : '✅ 创建实验'}
                </button>
                <button type="button" onClick={() => setShowCreateForm(false)} className="btn btn-ghost">
                  取消
                </button>
              </div>
              {message && (
                <div style={{ marginTop: 12, padding: 12, borderRadius: 8, background: message.startsWith('✅') ? '#d1fae5' : '#fee2e2', color: message.startsWith('✅') ? '#065f46' : '#991b1b' }}>
                  {message}
                </div>
              )}
            </form>
          </div>
        )}

        {/* Experiments List */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>实验列表</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setMeta(p => ({ ...p, page: Math.max(1, (p.page || 1) - 1) }))}
                disabled={(meta.page || 1) <= 1 || loading}
                className="btn btn-ghost"
                style={{ padding: '6px 12px' }}
              >
                ← 上一页
              </button>
              <span style={{ padding: '6px 12px', color: 'var(--text-secondary)' }}>
                {meta.page || 1} / {meta.totalPages || 1}
              </span>
              <button
                onClick={() => setMeta(p => ({ ...p, page: (p.page || 1) + 1 }))}
                disabled={!meta.hasMore || loading}
                className="btn btn-ghost"
                style={{ padding: '6px 12px' }}
              >
                下一页 →
              </button>
            </div>
          </div>

          {!experiments.length ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🔬</div>
              <p>暂无匹配实验</p>
              <p style={{ fontSize: 13 }}>尝试调整筛选条件或创建新实验</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 16 }}>
              {experiments.map((exp) => (
                <ExperimentCard 
                  key={exp.id} 
                  exp={exp} 
                  onStatusChange={updateStatus}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterChip({ active, onClick, label, color }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '4px 10px',
        borderRadius: 20,
        border: 'none',
        fontSize: 12,
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all 0.2s',
        background: active ? (color || 'var(--primary)') : 'var(--bg)',
        color: active ? '#fff' : 'var(--text-secondary)',
      }}
    >
      {label}
    </button>
  );
}

function ExperimentCard({ exp, onStatusChange }) {
  const status = STATUS_CONFIG[exp.status] || STATUS_CONFIG.draft;
  const config = exp.configJson ? JSON.parse(exp.configJson) : null;
  const metrics = exp.metricsJson ? JSON.parse(exp.metricsJson) : null;

  return (
    <div className="card hover-lift" style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 24 }}>{status.icon}</span>
          <div>
            <h4 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{exp.name}</h4>
            <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
              <span style={{ 
                padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 500,
                background: status.bg, color: status.color
              }}>
                {status.label}
              </span>
              {exp.tags?.split(',').map(tag => tag.trim()).filter(Boolean).map(tag => (
                <span key={tag} className="badge badge-blue">{tag}</span>
              ))}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {exp.status === 'draft' && (
            <button onClick={() => onStatusChange(exp.id, 'running')} className="btn btn-primary" style={{ padding: '4px 10px', fontSize: 12 }}>
              开始运行
            </button>
          )}
          {exp.status === 'running' && (
            <>
              <button onClick={() => onStatusChange(exp.id, 'completed')} className="btn" style={{ padding: '4px 10px', fontSize: 12, background: '#10b981', color: '#fff' }}>
                标记完成
              </button>
              <button onClick={() => onStatusChange(exp.id, 'failed')} className="btn" style={{ padding: '4px 10px', fontSize: 12, background: '#ef4444', color: '#fff' }}>
                标记失败
              </button>
            </>
          )}
          {(exp.status === 'completed' || exp.status === 'failed') && (
            <button onClick={() => onStatusChange(exp.id, 'archived')} className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }}>
              归档
            </button>
          )}
        </div>
      </div>

      {/* Hypothesis */}
      {exp.hypothesis && (
        <div style={{ marginBottom: 12, padding: 12, background: 'var(--bg)', borderRadius: 8 }}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>🎯 假设</div>
          <div style={{ fontSize: 14 }}>{exp.hypothesis}</div>
        </div>
      )}

      {/* Links & Info */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 13, color: 'var(--text-secondary)' }}>
        {exp.sourcePaper && (
          <div>
            📄 来源：<Link href={`/papers/${exp.sourcePaper.id}`} style={{ color: 'var(--primary)' }}>
              {exp.sourcePaper.title.slice(0, 40)}...
            </Link>
          </div>
        )}
        {exp.dataset && (
          <div>
            💾 数据集：<span style={{ color: 'var(--text)' }}>{exp.dataset.name}</span>
            {exp.datasetVersionSnapshot && <span style={{ marginLeft: 4, fontSize: 11 }}>(v{exp.datasetVersionSnapshot})</span>}
          </div>
        )}
        {exp.codeSnapshot && (
          <div>🔧 代码：{exp.codeSnapshot.slice(0, 8)}</div>
        )}
      </div>

      {/* Config & Metrics Preview */}
      {(config || metrics) && (
        <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {config && (
            <div style={{ padding: 10, background: '#f8fafc', borderRadius: 8, fontSize: 12 }}>
              <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>⚙️ 配置</div>
              <code style={{ color: 'var(--text)' }}>{JSON.stringify(config).slice(0, 100)}...</code>
            </div>
          )}
          {metrics && (
            <div style={{ padding: 10, background: '#f0fdf4', borderRadius: 8, fontSize: 12 }}>
              <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>📊 指标</div>
              <code style={{ color: 'var(--text)' }}>{JSON.stringify(metrics).slice(0, 100)}...</code>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)' }}>
        <span>创建于 {new Date(exp.createdAt).toLocaleDateString('zh-CN')}</span>
        <Link href={`/experiments/${exp.id}`} style={{ color: 'var(--primary)' }}>查看详情 →</Link>
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontSize: 14,
  background: 'var(--bg-elevated)',
  color: 'var(--text)',
};

const labelStyle = {
  display: 'block',
  fontSize: 12,
  fontWeight: 500,
  color: 'var(--text-secondary)',
  marginBottom: 6,
};
