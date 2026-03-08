function safeJsonParse(raw) {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function hasChinese(text = '') {
  return /[\u4e00-\u9fff]/.test(String(text));
}

function normalizeText(text) {
  if (text == null) return '';
  return String(text).trim();
}

function fallbackZh(text, fieldName) {
  const normalized = normalizeText(text);
  if (!normalized) return '';
  if (hasChinese(normalized)) return normalized;
  return `【自动翻译占位-${fieldName}】${normalized}`;
}

export function readTranslationCache(summaryJson) {
  const summary = safeJsonParse(summaryJson);
  const cached = summary?.translations || {};

  return {
    title: {
      en: normalizeText(cached?.title?.en),
      zh: normalizeText(cached?.title?.zh),
    },
    abstract: {
      en: normalizeText(cached?.abstract?.en),
      zh: normalizeText(cached?.abstract?.zh),
    },
    updatedAt: normalizeText(cached?.updatedAt),
  };
}

export function buildTranslationPayload({ title, abstract, cached, incoming }) {
  const baseTitle = normalizeText(title);
  const baseAbstract = normalizeText(abstract);

  const titleEn = normalizeText(incoming?.title?.en || cached?.title?.en || baseTitle);
  const abstractEn = normalizeText(incoming?.abstract?.en || cached?.abstract?.en || baseAbstract);

  const titleZh = normalizeText(incoming?.title?.zh || cached?.title?.zh || fallbackZh(titleEn || baseTitle, 'title'));
  const abstractZh = normalizeText(incoming?.abstract?.zh || cached?.abstract?.zh || fallbackZh(abstractEn || baseAbstract, 'abstract'));

  return {
    title: { en: titleEn, zh: titleZh },
    abstract: { en: abstractEn, zh: abstractZh },
    updatedAt: new Date().toISOString(),
  };
}

export function mergeSummaryJson(summaryJson, translationPayload) {
  const summary = safeJsonParse(summaryJson);
  const next = {
    ...summary,
    translations: translationPayload,
  };
  return JSON.stringify(next);
}

export function extractAbstract(summaryJson) {
  const summary = safeJsonParse(summaryJson);
  return normalizeText(summary?.abstract || summary?.summary || '');
}
