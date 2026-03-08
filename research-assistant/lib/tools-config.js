import fs from 'node:fs';
import path from 'node:path';

const CFG_PATH = path.join(process.cwd(), 'config', 'tools.json');

function normalizeConfig(cfg) {
  return {
    sourceNote: String(cfg?.sourceNote || ''),
    builtIn: Array.isArray(cfg?.builtIn) ? cfg.builtIn : [],
    externalGroups: Array.isArray(cfg?.externalGroups) ? cfg.externalGroups : [],
  };
}

export function loadToolsConfig() {
  const raw = fs.readFileSync(CFG_PATH, 'utf8');
  return normalizeConfig(JSON.parse(raw));
}

export function saveToolsConfig(cfg) {
  const normalized = normalizeConfig(cfg);
  fs.writeFileSync(CFG_PATH, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
  return normalized;
}

export function genId(prefix = 'tool') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
