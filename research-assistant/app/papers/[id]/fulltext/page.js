import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { parseSummaryJson } from '@/lib/paper-quality';

function isHttpUrl(value) {
  return /^https?:\/\//i.test(String(value || '').trim());
}

function normalizeArxivId(raw) {
  if (!raw) return '';
  const text = String(raw).trim();

  const absMatch = text.match(/arxiv\.org\/abs\/([^?#]+)/i);
  if (absMatch?.[1]) return absMatch[1].replace(/v\d+$/i, '');

  const pdfMatch = text.match(/arxiv\.org\/pdf\/([^?#]+?)(?:\.pdf)?$/i);
  if (pdfMatch?.[1]) return pdfMatch[1].replace(/v\d+$/i, '');

  return text.replace(/^arxiv:/i, '').replace(/v\d+$/i, '');
}

function resolvePreviewTargets(summary) {
  const pdfUrl = String(summary?.pdfUrl || '').trim();
  if (isHttpUrl(pdfUrl)) {
    return {
      previewUrl: pdfUrl,
      openUrl: pdfUrl,
      from: 'pdfUrl',
    };
  }

  const arxivId = normalizeArxivId(summary?.arxivId || summary?.id || summary?.url);
  if (arxivId) {
    return {
      previewUrl: `https://arxiv.org/pdf/${arxivId}.pdf`,
      openUrl: `https://arxiv.org/abs/${arxivId}`,
      from: 'arxivId',
    };
  }

  return {
    previewUrl: '',
    openUrl: '',
    from: 'none',
  };
}

export default async function PaperFulltextPage({ params }) {
  const { id } = await params;
  const paper = await prisma.paper.findUnique({ where: { id } });
  if (!paper) return notFound();

  const summary = parseSummaryJson(paper.summaryJson);
  const { previewUrl, openUrl, from } = resolvePreviewTargets(summary);

  return (
    <main style={{ maxWidth: 1200, margin: '20px auto', padding: 24 }}>
      <div style={{ marginBottom: 12, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <Link href={`/papers/${paper.id}`} style={{ color: '#1d4ed8', textDecoration: 'none', fontSize: 14 }}>
          ← 返回文献详情
        </Link>
        <Link href="/papers" style={{ color: '#1d4ed8', textDecoration: 'none', fontSize: 14 }}>
          返回文献列表
        </Link>
      </div>

      <h2 style={{ marginBottom: 8 }}>全文预览</h2>
      <p style={{ marginTop: 0, color: '#475569', fontSize: 14 }}>{paper.title}</p>

      {previewUrl ? (
        <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
            <div style={{ color: '#64748b', fontSize: 13 }}>
              预览来源：{from === 'pdfUrl' ? 'summaryJson.pdfUrl' : 'summaryJson.arxivId'}
            </div>
            <a href={openUrl || previewUrl} target="_blank" rel="noreferrer" style={{ color: '#1d4ed8', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
              在新窗口打开原文
            </a>
          </div>

          <iframe
            src={previewUrl}
            title={`全文预览-${paper.title}`}
            style={{ width: '100%', minHeight: '75vh', border: '1px solid #e5e7eb', borderRadius: 10, background: '#f8fafc' }}
          />

          <p style={{ margin: '10px 2px 0', color: '#64748b', fontSize: 12 }}>
            若页面空白或被网站拦截，请使用右上角“在新窗口打开原文”。
          </p>
        </section>
      ) : (
        <section style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 12, padding: 14, color: '#9a3412' }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>暂时无法自动预览全文</div>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7 }}>
            当前文献缺少 <code>summaryJson.pdfUrl</code> 与 <code>summaryJson.arxivId</code>。
            你可以先在文献详情页补充这两个字段之一，或通过 arXiv 重新抓取后再打开本页。
          </p>
        </section>
      )}
    </main>
  );
}
