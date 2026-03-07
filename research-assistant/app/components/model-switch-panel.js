'use client';

import { useEffect, useState } from 'react';

const MODEL_OPTIONS = ['Codex', 'QwenCoder', 'Kimi'];

export default function ModelSwitchPanel() {
  const [currentModel, setCurrentModel] = useState('Codex');
  const [status, setStatus] = useState('');
  const [loadingModel, setLoadingModel] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState('尚未执行 verify。');

  useEffect(() => {
    (async () => {
      try {
        const [switchRes, verifyRes] = await Promise.all([
          fetch('/api/model-switch'),
          fetch('/api/verify/latest'),
        ]);

        const switchJson = await switchRes.json();
        if (switchRes.ok && switchJson?.currentModel) {
          setCurrentModel(switchJson.currentModel);
        }

        const latest = await verifyRes.json();
        if (verifyRes.ok && latest?.ts) {
          setVerifyStatus(`${latest.ok ? '✅' : '❌'} ${latest.ok ? 'verify 通过' : 'verify 未通过'}（${latest.ts}）`);
        }
      } catch {
        // noop
      }
    })();
  }, []);

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
          scope: 'global_default',
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        const detail = [json?.reasonCn, json?.detail].filter(Boolean).join('；');
        throw new Error(detail || json?.error || '切换失败');
      }

      setCurrentModel(targetModel);
      setStatus(json.message || '模型切换成功');
    } catch (e) {
      setStatus(`切换失败：${e.message || String(e)}`);
    } finally {
      setLoadingModel('');
    }
  };

  const runVerify = async () => {
    setVerifyLoading(true);
    setVerifyStatus('verify 执行中，请稍候...');
    try {
      const res = await fetch('/api/verify/run', { method: 'POST' });
      const s = await res.json();
      if (s?.ts) {
        setVerifyStatus(`${s.ok ? '✅' : '❌'} ${s.ok ? 'verify 通过' : 'verify 未通过'}（${s.ts}，耗时 ${Math.round((s.durationMs || 0) / 1000)}s）`);
      } else {
        setVerifyStatus(res.ok ? '✅ verify 完成。' : '❌ verify 失败。');
      }
    } catch (e) {
      setVerifyStatus(`❌ verify 请求失败：${e.message || String(e)}`);
    } finally {
      setVerifyLoading(false);
    }
  };

  return (
    <section style={panelStyle}>
      <h2 style={{ marginTop: 0 }}>一键切模型（联动 OpenClaw 默认模型）</h2>
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

      <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <button
          onClick={runVerify}
          disabled={verifyLoading}
          style={{
            padding: '8px 14px',
            borderRadius: 8,
            border: '1px solid #0891b2',
            background: verifyLoading ? '#cffafe' : '#06b6d4',
            color: verifyLoading ? '#0e7490' : '#fff',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          {verifyLoading ? 'verify 执行中...' : '一键执行 verify'}
        </button>
        <span style={{ color: '#334155', fontSize: 13 }}>{verifyStatus}</span>
      </div>

      <div style={{ marginTop: 10, color: '#6b7280', fontSize: 13 }}>
        说明：此操作会修改 OpenClaw 默认模型（后续会话生效），并记录切换日志。
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
