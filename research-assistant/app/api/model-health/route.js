import { getModelHealthSummary, RECENT_WINDOW_MS } from '@/lib/model-health';

export async function GET() {
  try {
    const models = await getModelHealthSummary();

    return Response.json({
      windowHours: Math.round(RECENT_WINDOW_MS / 3600000),
      models,
      note: '部分 provider 不返回真实剩余额度，当前为事件近似预警。',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
