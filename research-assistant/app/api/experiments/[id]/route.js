import { prisma } from '@/lib/prisma';

function normalizeText(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export async function PATCH(req, { params }) {
  const { id } = params;
  const body = await req.json();

  const updateData = {};

  // Status update with timestamp logic
  if (body.status) {
    updateData.status = body.status;
    if (body.status === 'running') {
      updateData.startedAt = new Date();
    } else if (body.status === 'completed' || body.status === 'failed') {
      updateData.completedAt = new Date();
    }
  }

  // Other fields
  if (body.name !== undefined) updateData.name = normalizeText(body.name);
  if (body.hypothesis !== undefined) updateData.hypothesis = normalizeText(body.hypothesis);
  if (body.conclusion !== undefined) updateData.conclusion = normalizeText(body.conclusion);
  if (body.tags !== undefined) updateData.tags = normalizeText(body.tags);
  if (body.configJson !== undefined) updateData.configJson = body.configJson ? JSON.stringify(body.configJson) : null;
  if (body.metricsJson !== undefined) updateData.metricsJson = body.metricsJson ? JSON.stringify(body.metricsJson) : null;
  if (body.logsJson !== undefined) updateData.logsJson = body.logsJson ? JSON.stringify(body.logsJson) : null;
  if (body.codeSnapshot !== undefined) updateData.codeSnapshot = normalizeText(body.codeSnapshot);
  if (body.environment !== undefined) updateData.environment = normalizeText(body.environment);

  try {
    const item = await prisma.experiment.update({
      where: { id },
      data: updateData,
      include: {
        dataset: true,
        sourcePaper: { select: { id: true, title: true, year: true } }
      }
    });
    return Response.json(item);
  } catch (error) {
    return Response.json({ error: '更新失败: ' + error.message }, { status: 500 });
  }
}

export async function GET(req, { params }) {
  const { id } = params;

  try {
    const item = await prisma.experiment.findUnique({
      where: { id },
      include: {
        dataset: true,
        sourcePaper: { select: { id: true, title: true, year: true, venueTier: true } }
      }
    });

    if (!item) {
      return Response.json({ error: '实验不存在' }, { status: 404 });
    }

    return Response.json(item);
  } catch (error) {
    return Response.json({ error: '查询失败: ' + error.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  const { id } = params;

  try {
    await prisma.experiment.delete({ where: { id } });
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: '删除失败: ' + error.message }, { status: 500 });
  }
}
