import { prisma } from '@/lib/prisma';

function safeJson(text) {
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

function normalizeFigureUrls(raw) {
  const list = Array.isArray(raw)
    ? raw
    : typeof raw === 'string'
      ? raw.split(/[\n,]/g)
      : [];

  const urls = list
    .map((item) => {
      if (typeof item === 'string') return item.trim();
      if (!item || typeof item !== 'object') return '';
      const v = item.url ?? item.src ?? item.link ?? item.href ?? '';
      return typeof v === 'string' ? v.trim() : '';
    })
    .filter(Boolean);

  return [...new Set(urls)];
}

function resolveExtraction(meta, figureUrls) {
  const pdfUrl = typeof meta?.pdfUrl === 'string' ? meta.pdfUrl.trim() : '';
  const explicitError = meta?.figureExtractionError || meta?.pdfExtractionError || meta?.error;

  if (!pdfUrl) {
    return {
      extractionStatus: 'error',
      message: 'summaryJson.pdfUrl 缺失，无法执行图表提取。',
      pdfUrl: null,
    };
  }

  if (explicitError) {
    return {
      extractionStatus: 'error',
      message: typeof explicitError === 'string' ? explicitError : '图表提取失败，请稍后重试。',
      pdfUrl,
    };
  }

  if (figureUrls.length > 0) {
    return {
      extractionStatus: 'ready',
      message: `图表提取完成，共 ${figureUrls.length} 张。`,
      pdfUrl,
    };
  }

  return {
    extractionStatus: 'pending',
    message: '已检测到 PDF，图表提取任务尚未完成。',
    pdfUrl,
  };
}

export async function GET(_req, { params }) {
  try {
    const id = params?.id;
    if (!id) {
      return Response.json({ error: 'paper id is required' }, { status: 400 });
    }

    const paper = await prisma.paper.findUnique({ where: { id } });
    if (!paper) {
      return Response.json({ error: 'paper not found' }, { status: 404 });
    }

    const summaryJson = safeJson(paper.summaryJson);
    const figureUrls = normalizeFigureUrls(summaryJson.figureUrls);
    const extraction = resolveExtraction(summaryJson, figureUrls);

    return Response.json({
      paperId: id,
      title: paper.title,
      figureUrls,
      figures: figureUrls.map((url, idx) => ({ id: `${id}-${idx + 1}`, url })),
      extractionStatus: extraction.extractionStatus,
      message: extraction.message,
      pdfUrl: extraction.pdfUrl,
    });
  } catch (error) {
    console.error('[GET /api/papers/[id]/figures] failed:', error);
    return Response.json(
      {
        error: 'failed to get figures',
        extractionStatus: 'error',
        message: '服务内部错误，请稍后重试。',
      },
      { status: 500 },
    );
  }
}
