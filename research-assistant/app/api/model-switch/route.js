import fs from 'node:fs/promises';
import path from 'node:path';

const MODEL_SWITCH_LOG_PATH = path.join(process.cwd(), 'data', 'model-switch-log.jsonl');
const ALLOWED_MODELS = new Set(['Codex', 'QwenCoder', 'Kimi']);

export async function POST(req) {
  let payload;
  try {
    payload = await req.json();
  } catch {
    return Response.json({ error: 'invalid json body' }, { status: 400 });
  }

  const targetModel = payload?.targetModel;
  const fromModel = payload?.fromModel || 'unknown';
  const reason = payload?.reason || 'manual_switch';
  const scope = payload?.scope || 'session';

  if (!targetModel) {
    return Response.json({ error: 'targetModel is required' }, { status: 400 });
  }

  if (!ALLOWED_MODELS.has(targetModel)) {
    return Response.json({ error: 'targetModel must be one of Codex/QwenCoder/Kimi' }, { status: 400 });
  }

  const event = {
    ts: new Date().toISOString(),
    from: fromModel,
    to: targetModel,
    reason,
    scope,
  };

  await fs.mkdir(path.dirname(MODEL_SWITCH_LOG_PATH), { recursive: true });
  await fs.appendFile(MODEL_SWITCH_LOG_PATH, `${JSON.stringify(event)}\n`, 'utf8');

  const message = `切换提示：from=${event.from}; to=${event.to}; reason=${event.reason}; scope=${event.scope}`;

  return Response.json({ ok: true, message, event });
}
