import { prisma } from '@/lib/prisma';

function safeJson(text) {
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

export async function GET(_req, { params }) {
  const id = params?.id;
  if (!id) return Response.json({ error: 'paper id is required' }, { status: 400 });

  const paper = await prisma.paper.findUnique({ where: { id } });
  if (!paper) return Response.json({ error: 'paper not found' }, { status: 404 });

  const meta = safeJson(paper.summaryJson);
  const figureUrls = Array.isArray(meta.figureUrls) ? meta.figureUrls : [];

  const analysis = figureUrls.length
    ? '检测到图表 URL，可在后续版本接入 Qwen Vision 对图表进行自动说明与对比分析。'
    : '当前未检测到图表 URL。请先补充 PDF 解析结果（figureUrls）后再进行图表理解。';

  return Response.json({
    paperId: id,
    title: paper.title,
    figures: figureUrls.map((url, idx) => ({ id: `${id}-${idx + 1}`, url })),
    analysis,
    nextStep: '后续将把图表抓取与 Qwen Vision 调用接入此接口。',
  });
}
