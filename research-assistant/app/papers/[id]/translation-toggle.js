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
  const [paragraph, setParagraph] = useState('');
  const [preserveTerms, setPreserveTerms] = useState(true);
  const [paragraphLoading, setParagraphLoading] = useState(false);
  const [paragraphResult, setParagraphResult] = useState(null);
  const [paragraphError, setParagraphError] = useState('');

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

  async function onTranslateParagraph() {
    const text = paragraph.trim();
    if (!text) {
      setParagraphError('请输入要翻译的段落');
      return;
    }

    setParagraphLoading(true);
    setParagraphError('');
    try {
      const res = await fetch(`/api/papers/${paperId}/translate-paragraph`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paragraph: text, preserveTerms }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setParagraphError(json?.error || '段落翻译失败');
        return;
      }
      setParagraphResult(json?.translation || null);
    } catch {
      setParagraphError('段落翻译失败，请稍后重试');
    } finally {
      setParagraphLoading(false);
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

      <div style={{ marginTop: 14, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 14 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>段落翻译</div>
        <textarea
          value={paragraph}
          onChange={(e) => setParagraph(e.target.value)}
          placeholder="粘贴任意英文段落，支持缓存复用"
          rows={6}
          style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 10, padding: 10, fontSize: 14, lineHeight: 1.6 }}
        />

        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#374151' }}>
            <input
              type="checkbox"
              checked={preserveTerms}
              onChange={(e) => setPreserveTerms(e.target.checked)}
            />
            保留术语原文
          </label>
          <button
            type="button"
            onClick={onTranslateParagraph}
            disabled={paragraphLoading}
            style={{ ...btnStyle, borderRadius: 10, background: '#eff6ff', borderColor: '#93c5fd' }}
          >
            {paragraphLoading ? '翻译中...' : '翻译段落'}
          </button>
          {paragraphError ? <span style={{ fontSize: 12, color: '#dc2626' }}>{paragraphError}</span> : null}
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 6 }}>翻译结果</div>
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 10, minHeight: 72, whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
            {paragraphResult?.zh || '暂无翻译结果'}
          </div>
        </div>
      </div>
    </section>
  );
}
