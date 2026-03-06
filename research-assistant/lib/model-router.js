import fs from 'node:fs';
import path from 'node:path';

const ROUTER_PATH = path.join(process.cwd(), 'config', 'model-router.json');

export function loadRouterConfig() {
  const raw = fs.readFileSync(ROUTER_PATH, 'utf8');
  return JSON.parse(raw);
}

export function getModelRoute(taskType) {
  const cfg = loadRouterConfig();
  const route = cfg.routes?.[taskType];
  if (!route) {
    throw new Error(`Unknown task type: ${taskType}`);
  }
  return {
    taskType,
    primary: route.primary,
    fallbacks: route.fallbacks || [],
    timeoutMs: cfg.defaults?.timeoutMs ?? 90000,
    maxRetries: cfg.defaults?.maxRetries ?? 1,
  };
}
