import { classifyModelError, resolveFailoverModel } from '@/lib/model-failover';
import { appendFailoverEvent } from '@/lib/model-failover-events';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const taskType = searchParams.get('taskType');
  const failed = searchParams.getAll('failed');
  const error = searchParams.get('error') || '';
  const scope = searchParams.get('scope') || 'taskType';
  const dryRun = searchParams.get('dryRun') === '1';

  if (!taskType) {
    return Response.json({ error: 'taskType is required' }, { status: 400 });
  }

  try {
    const failType = classifyModelError(error);
    const resolution = resolveFailoverModel(taskType, failed);
    const shouldFailover = failType !== 'non_retryable';
    const from = resolution.failedModels.at(-1) || resolution.chain[0] || null;
    const to = resolution.nextModel;

    const explain = shouldFailover
      ? to
        ? `错误类型 ${failType} 可重试，建议从 ${from || 'unknown'} 切换到 ${to}。`
        : `错误类型 ${failType} 可重试，但路由链已耗尽，无可用后备模型。`
      : `错误类型 ${failType} 不建议自动切换，请人工处理。`;

    if (!dryRun && shouldFailover && to) {
      await appendFailoverEvent({
        ts: new Date().toISOString(),
        taskType,
        from,
        to,
        reason: failType,
        scope,
      });
    }

    return Response.json({
      failType,
      shouldFailover,
      dryRun,
      explain,
      ...resolution,
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}
