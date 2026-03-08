import { prisma } from '@/lib/prisma';
import {
  buildTranslationPayload,
  extractAbstract,
  mergeSummaryJson,
  readTranslationCache,
} from '@/lib/paper-translation';

function parseIncoming(reqBody) {
  if (!reqBody || typeof reqBody !== 'object') return {};

  const title = reqBody?.title || {};
  const abstract = reqBody?.abstract || {};

  return {
    title: {
      en: title.en || reqBody.titleEn,
      zh: title.zh || reqBody.titleZh,
    },
    abstract: {
      en: abstract.en || reqBody.abstractEn,
      zh: abstract.zh || reqBody.abstractZh,
    },
  };
}

async function handleTranslate(id, incoming = null) {
  if (!id) return Response.json({ error: 'paper id is required' }, { status: 400 });

  const paper = await prisma.paper.findUnique({ where: { id } });
  if (!paper) return Response.json({ error: 'paper not found' }, { status: 404 });

  const abstract = extractAbstract(paper.summaryJson);
  const cached = readTranslationCache(paper.summaryJson);
  const payload = buildTranslationPayload({
    title: paper.title,
    abstract,
    cached,
    incoming,
  });

  const nextSummaryJson = mergeSummaryJson(paper.summaryJson, payload);

  await prisma.paper.update({
    where: { id },
    data: { summaryJson: nextSummaryJson },
  });

  return Response.json({
    paperId: id,
    cached: Boolean(cached?.updatedAt),
    translations: payload,
  });
}

export async function GET(_req, { params }) {
  const { id } = await params;
  return handleTranslate(id);
}

export async function POST(req, { params }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  return handleTranslate(id, parseIncoming(body));
}
