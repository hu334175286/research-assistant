import fs from 'node:fs';
import path from 'node:path';

const CFG_PATH = path.join(process.cwd(), 'config', 'delivery-checklist.json');

const STATUS_LIST = ['completed', 'in_progress', 'planned'];

function normalizeItem(item = {}) {
  return {
    id: String(item.id || ''),
    feature: String(item.feature || '未命名功能'),
    status: STATUS_LIST.includes(item.status) ? item.status : 'planned',
    description: String(item.description || ''),
    verifyLinks: Array.isArray(item.verifyLinks) ? item.verifyLinks.map((v) => String(v)) : [],
  };
}

function normalizeChecklist(raw = {}) {
  const items = Array.isArray(raw.items) ? raw.items.map(normalizeItem) : [];
  return {
    project: String(raw.project || '科研助手'),
    updatedAt: String(raw.updatedAt || ''),
    items,
  };
}

export function loadDeliveryChecklist() {
  const raw = fs.readFileSync(CFG_PATH, 'utf8');
  return normalizeChecklist(JSON.parse(raw));
}

export function getDeliverySummary(items = []) {
  return items.reduce((acc, item) => {
    acc.total += 1;
    acc[item.status] += 1;
    return acc;
  }, {
    total: 0,
    completed: 0,
    in_progress: 0,
    planned: 0,
  });
}
