import { prisma } from '@/lib/prisma';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const experimentId = searchParams.get('experimentId')?.trim();

  if (!experimentId) {
    return Response.json({ error: 'experimentId 为必填参数' }, { status: 400 });
  }

  const experiment = await prisma.experiment.findUnique({
    where: { id: experimentId },
    include: {
      dataset: {
        select: {
          id: true,
          name: true,
          type: true,
          source: true,
          version: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!experiment) {
    return Response.json({ error: '实验不存在' }, { status: 404 });
  }

  return Response.json({
    experiment: {
      id: experiment.id,
      name: experiment.name,
      createdAt: experiment.createdAt,
      datasetId: experiment.datasetId,
      datasetVersionSnapshot: experiment.datasetVersionSnapshot,
    },
    dataset: experiment.dataset,
    trace: {
      linked: Boolean(experiment.datasetId),
      versionPinned: Boolean(experiment.datasetVersionSnapshot),
      datasetExists: Boolean(experiment.dataset),
      datasetName: experiment.dataset?.name ?? null,
    },
  });
}
