import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getPaperQuality, qualityLabel, parseSummaryJson } from '@/lib/paper-quality';
import { buildTranslationPayload, extractAbstract, readTranslationCache } from '@/lib/paper-translation';
import TranslationToggle from './translation-toggle';

function parseTags(tags = '') {
  return String(tags)
    .split(/[;,，]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export default async function PaperDetailPage({ params }) {
  const { id } = await params;
  const paper = await prisma.paper.findUnique({ where: { id } });
  if (!paper) return notFound();

  const summary = parseSummaryJson(paper.summaryJson);
  const abstract = extractAbstract(paper.summaryJson);
  const quality = qualityLabel(getPaperQuality(paper));
  const tags = parseTags(paper.tags);
  const cache = readTranslationCache(paper.summaryJson);
  const initialTranslations = buildTranslationPayload({
    title: paper.title,
    abstract,
    cached: cache,
  });

  const originalLink = summary?.url || summary?.pdfUrl || null;

  return (
    <main style={{ maxWidth: 960, margin: '20px auto', padding: 24 }}>
      <div style={{ marginBottom: 12 }}>
        <Link href="/papers" style={{ color: '#1d4ed8', textDecoration: 'none', fontSize: 14 }}>
          ← 返回文献列表
        </Link>
      </div>

      <h2 style={{ marginBottom: 10 }}>{paper.title}</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
        <Meta label="来源" value={paper.source || '-'} />
        <Meta label="年份" value={paper.year || '-'} />
        <Meta label="质量层级" value={quality} />
        <Meta
          label="原文链接"
          value={originalLink ? <a href={originalLink} target="_blank" rel="noreferrer" style={{ color: '#1d4ed8' }}>{originalLink}</a> : '-'}
        />
      </div>

      <section style={{ marginTop: 14, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 14 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>标签</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {tags.length ? tags.map((tag) => (
            <span key={tag} style={{ background: '#eef2ff', color: '#3730a3', borderRadius: 999, padding: '4px 10px', fontSize: 12 }}>
              {tag}
            </span>
          )) : <span style={{ color: '#6b7280', fontSize: 13 }}>暂无标签</span>}
        </div>
      </section>

      <TranslationToggle paperId={paper.id} initial={initialTranslations} />
    </main>
  );
}

function Meta({ label, value }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 12 }}>
      <div style={{ color: '#6b7280', fontSize: 12, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 14, color: '#111827', wordBreak: 'break-all' }}>{value}</div>
    </div>
  );
}
