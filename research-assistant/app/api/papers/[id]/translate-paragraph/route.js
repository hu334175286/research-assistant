import { prisma } from '@/lib/prisma';
import {
  appendParagraphCache,
  buildParagraphTranslation,
  findParagraphCache,
  mergeSummaryJson,
  readTranslationCache,
} from '@/lib/paper-translation';

function parseBody(body) {
  const paragraph = typeof body?.paragraph === 'string' ? body.paragraph.trim() : '';
  const preserveTerms = Boolean(body?.preserveTerms);
  const incoming = body?.translation && typeof body.translation === 'object' ? body.translation : null;
  return { paragraph, preserveTerms, incoming };
}

export async function POST(req, { params }) {
  const { id } = await params;
  if (!id) return Response.json({ error: 'paper id is required' }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const { paragraph, preserveTerms, incoming } = parseBody(body);
  if (!paragraph) return Response.json({ error: 'paragraph is required' }, { status: 400 });

  const paper = await prisma.paper.findUnique({ where: { id } });
  if (!paper) return Response.json({ error: 'paper not found' }, { status: 404 });

  const cache = readTranslationCache(paper.summaryJson);
  const cachedParagraph = findParagraphCache(cache.paragraphs, paragraph, preserveTerms);

  if (cachedParagraph) {
    return Response.json({
      paperId: id,
      cached: true,
      translation: {
        source: cachedParagraph.source,
        en: cachedParagraph.en,
        zh: cachedParagraph.zh,
        preserveTerms: Boolean(cachedParagraph.preserveTerms),
        updatedAt: cachedParagraph.updatedAt,
      },
    });
  }

  const generated = buildParagraphTranslation({ paragraph, incoming, preserveTerms });
  const paragraphEntry = {
    source: paragraph,
    en: generated.en,
    zh: generated.zh,
    preserveTerms,
    updatedAt: generated.updatedAt,
  };

  const nextParagraphs = appendParagraphCache(cache.paragraphs, paragraphEntry);
  const nextSummaryJson = mergeSummaryJson(paper.summaryJson, {
    ...cache,
    paragraphs: nextParagraphs,
    updatedAt: new Date().toISOString(),
  });

  await prisma.paper.update({
    where: { id },
    data: { summaryJson: nextSummaryJson },
  });

  return Response.json({
    paperId: id,
    cached: false,
    translation: paragraphEntry,
  });
}
