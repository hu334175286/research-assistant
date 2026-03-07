'use client';

import { useState } from 'react';

const MODEL_OPTIONS = ['Codex', 'QwenCoder', 'Kimi'];

export default function ModelSwitchPanel() {
  const [currentModel, setCurrentModel] = useState('Codex');
  const [status, setStatus] = useState('');
  const [loadingModel, setLoadingModel] = useState('');

  const switchModel = async (targetModel) => {
    if (targetModel === currentModel) {
      setStatus(`当前已是 ${targetModel}，无需切换。`);
      return;
    }

    setLoadingModel(targetModel);
    setStatus('');

    try {
      const res = await fetch('/api/model-switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetModel,
          fromModel: currentModel,
          reason: 'manual_quick_switch',
          scope: 'session',
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || '切换失败');

      setCurrentModel(targetModel);
      setStatus(json.message || '模型切换成功');
    } catch (e) {
      setStatus(`切换失败：${e.message || String(e)}`);
    } finally {
      setLoadingModel('');
    }
  };

  return (
    <section style={panelStyle}>
      <h2 style={{ marginTop: 0 }}>会话内一键切模型（项目内模拟）</h2>
      <p style={{ marginTop: 0, color: '#475569' }}>当前模型：<strong>{currentModel}</strong></p>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {MODEL_OPTIONS.map((model) => {
          const isActive = model === currentModel;
          const isLoading = loadingModel === model;
          return (
            <button
              key={model}
              onClick={() => switchModel(model)}
              disabled={isLoading}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                border: isActive ? '1px solid #1d4ed8' : '1px solid #cbd5e1',
                background: isActive ? '#dbeafe' : '#fff',
                color: '#0f172a',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              {isLoading ? `切换到 ${model}...` : model}
            </button>
          );
        })}
      </div>

      {status && <div style={{ marginTop: 12, color: '#0f172a' }}>{status}</div>}
    </section>
  );
}

const panelStyle = {
  marginTop: 22,
  border: '1px solid #dbeafe',
  background: '#f8fbff',
  borderRadius: 12,
  padding: 16,
};
