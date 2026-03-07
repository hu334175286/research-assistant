import { classifyModelError, resolveFailoverModel } from '@/lib/model-failover';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const taskType = searchParams.get('taskType');
  const failed = searchParams.getAll('failed');
  const error = searchParams.get('error') || '';

  if (!taskType) {
    return Response.json({ error: 'taskType is required' }, { status: 400 });
  }

  try {
    const failType = classifyModelError(error);
    const resolution = resolveFailoverModel(taskType, failed);

    return Response.json({
      failType,
      shouldFailover: failType !== 'non_retryable',
      ...resolution,
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}
