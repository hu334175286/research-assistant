'use client';

import { useMemo, useState } from 'react';

const btnStyle = {
  border: '1px solid #d1d5db',
  background: '#fff',
  borderRadius: 999,
  fontSize: 13,
  padding: '6px 12px',
  cursor: 'pointer',
};

export default function TranslationToggle({ paperId, initial }) {
  const [lang, setLang] = useState('original');
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(false);

  const shownTitle = useMemo(() => {
    if (lang === 'zh') return data?.title?.zh || data?.title?.en || '';
    return data?.title?.en || '';
  }, [lang, data]);

  const shownAbstract = useMemo(() => {
    if (lang === 'zh') return data?.abstract?.zh || data?.abstract?.en || '';
    return data?.abstract?.en || '';
  }, [lang, data]);

  async function switchLang(nextLang) {
    setLang(nextLang);
    if (nextLang !== 'zh') return;
    if (data?.title?.zh && data?.abstract?.zh) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/papers/${paperId}/translate`);
      if (!res.ok) return;
      const json = await res.json();
      setData(json.translations || data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section style={{ marginTop: 18 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
        <button
          type="button"
          onClick={() => switchLang('original')}
          style={{ ...btnStyle, background: lang === 'original' ? '#eef2ff' : '#fff', borderColor: lang === 'original' ? '#6366f1' : '#d1d5db' }}
        >
          原文
        </button>
        <button
          type="button"
          onClick={() => switchLang('zh')}
          style={{ ...btnStyle, background: lang === 'zh' ? '#eff6ff' : '#fff', borderColor: lang === 'zh' ? '#2563eb' : '#d1d5db' }}
        >
          中文
        </button>
        {loading ? <span style={{ fontSize: 12, color: '#6b7280' }}>翻译加载中...</span> : null}
      </div>

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 14 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>标题</div>
        <div style={{ lineHeight: 1.7 }}>{shownTitle || '暂无'}</div>
        <div style={{ fontWeight: 600, margin: '14px 0 8px' }}>摘要</div>
        <div style={{ lineHeight: 1.8, color: '#374151', whiteSpace: 'pre-wrap' }}>{shownAbstract || '暂无摘要'}</div>
      </div>
    </section>
  );
}
