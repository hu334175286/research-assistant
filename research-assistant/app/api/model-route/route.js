import { getModelRoute } from '@/lib/model-router';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const taskType = searchParams.get('taskType');

  if (!taskType) {
    return Response.json({ error: 'taskType is required' }, { status: 400 });
  }

  try {
    const route = getModelRoute(taskType);
    return Response.json(route);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}
