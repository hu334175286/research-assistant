import fs from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { MODEL_SWITCH_LOG_PATH } from '@/lib/model-switch-log';
import { MODEL_MAP, readCurrentModel } from '@/lib/model-runtime-status';

const execFileAsync = promisify(execFile);

function toChineseReason(error) {
  const raw = `${error?.stderr || ''}\n${error?.stdout || ''}\n${error?.message || ''}`.toLowerCase();

  if (raw.includes('401') || raw.includes('unauthorized') || raw.includes('auth')) {
    return '认证失败：请检查模型供应商的 API Key 或登录状态。';
  }
  if (raw.includes('429') || raw.includes('rate limit') || raw.includes('quota')) {
    return '配额或限流：请求过于频繁或额度不足，请稍后重试。';
  }
  if (raw.includes('timeout') || raw.includes('timed out')) {
    return '请求超时：模型服务响应过慢，请稍后重试。';
  }
  if (raw.includes('network') || raw.includes('enotfound') || raw.includes('econnrefused')) {
    return '网络异常：无法连接模型服务，请检查网络或代理。';
  }
  if (raw.includes('not found') || raw.includes('unknown model')) {
    return '模型不存在：目标模型 ID 无效或当前环境未配置。';
  }

  return '未知错误：请查看错误详情。';
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

  try {
    await execFileAsync('openclaw', ['models', 'set', targetModelId], { windowsHide: true });
  } catch (error) {
    const detail = `${error?.stderr || error?.stdout || error?.message || ''}`.trim();
    return Response.json({
      ok: false,
      error: '模型切换失败',
      reasonCn: toChineseReason(error),
      detail,
      targetModel,
      targetModelId,
    }, { status: 500 });
  }

  const event = {
    ts: new Date().toISOString(),
    from: fromModel,
    to: targetModel,
    reason,
    scope,
    targetModelId,
  };

  await fs.mkdir('data', { recursive: true });
  await fs.appendFile(MODEL_SWITCH_LOG_PATH, `${JSON.stringify(event)}\n`, 'utf8');

  const message = `切换提示：from=${event.from}; to=${event.to}; reason=${event.reason}; scope=${event.scope}`;
  return Response.json({ ok: true, message, event });
}
