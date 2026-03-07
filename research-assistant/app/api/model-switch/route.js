import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const MODEL_SWITCH_LOG_PATH = path.join(process.cwd(), 'data', 'model-switch-log.jsonl');

const MODEL_MAP = {
  Codex: 'openai-codex/gpt-5.3-codex',
  QwenCoder: 'qwen-portal/coder-model',
  Kimi: 'moonshot/kimi-k2.5',
};

async function readCurrentModel() {
  try {
    const { stdout } = await execFileAsync('openclaw', ['models', 'status', '--json'], { windowsHide: true });
    const parsed = JSON.parse(stdout || '{}');
    const model = parsed?.resolvedDefault || parsed?.defaultModel || '';
    const fromLabel = Object.entries(MODEL_MAP).find(([, id]) => id === model)?.[0] || model || 'unknown';
    return { model, label: fromLabel };
  } catch {
    return { model: '', label: 'unknown' };
  }
}

export async function GET() {
  const current = await readCurrentModel();
  return Response.json({ ok: true, currentModel: current.label, currentModelId: current.model });
}

export async function POST(req) {
  let payload;
  try {
    payload = await req.json();
  } catch {
    return Response.json({ error: 'invalid json body' }, { status: 400 });
  }

  const targetModel = payload?.targetModel;
  const reason = payload?.reason || 'manual_quick_switch';
  const scope = payload?.scope || 'global_default';

  if (!targetModel || !MODEL_MAP[targetModel]) {
    return Response.json({ error: 'targetModel must be one of Codex/QwenCoder/Kimi' }, { status: 400 });
  }

  const current = await readCurrentModel();
  const fromModel = payload?.fromModel || current.label || 'unknown';
  const targetModelId = MODEL_MAP[targetModel];

  await execFileAsync('openclaw', ['models', 'set', targetModelId], { windowsHide: true });

  const event = {
    ts: new Date().toISOString(),
    from: fromModel,
    to: targetModel,
    reason,
    scope,
    targetModelId,
  };

  await fs.mkdir(path.dirname(MODEL_SWITCH_LOG_PATH), { recursive: true });
  await fs.appendFile(MODEL_SWITCH_LOG_PATH, `${JSON.stringify(event)}\n`, 'utf8');

  const message = `切换提示：from=${event.from}; to=${event.to}; reason=${event.reason}; scope=${event.scope}`;
  return Response.json({ ok: true, message, event });
}
