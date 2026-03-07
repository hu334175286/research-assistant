import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export const MODEL_MAP = {
  Codex: 'openai-codex/gpt-5.3-codex',
  QwenCoder: 'qwen-portal/coder-model',
  Kimi: 'moonshot/kimi-k2.5',
};

export async function readCurrentModel() {
  try {
    const { stdout } = await execFileAsync('openclaw', ['models', 'status', '--json'], { windowsHide: true });
    const parsed = JSON.parse(stdout || '{}');
    const model = parsed?.resolvedDefault || parsed?.defaultModel || '';
    const label = Object.entries(MODEL_MAP).find(([, id]) => id === model)?.[0] || model || 'unknown';
    return { model, label };
  } catch {
    return { model: '', label: 'unknown' };
  }
}
