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

function extractTerms(text = '') {
  const matches = String(text).match(/\b[A-Za-z][A-Za-z0-9-]{2,}\b/g) || [];
  const stop = new Set(['the', 'and', 'for', 'with', 'from', 'that', 'this', 'are', 'was', 'were']);
  const normalized = matches
    .map((item) => item.trim())
    .filter((item) => !stop.has(item.toLowerCase()));
  return Array.from(new Set(normalized)).slice(0, 8);
}

function applyTermPreservation(zhText, enText, preserveTerms) {
  const zh = normalizeText(zhText);
  if (!preserveTerms) return zh;

  const terms = extractTerms(enText);
  if (!terms.length) return zh;

  const missing = terms.filter((term) => !zh.includes(term));
  if (!missing.length) return zh;
  return `${zh}\n\n（术语保留：${missing.join(', ')}）`;
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
    paragraphs: Array.isArray(cached?.paragraphs) ? cached.paragraphs : [],
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
    paragraphs: Array.isArray(cached?.paragraphs) ? cached.paragraphs : [],
    updatedAt: new Date().toISOString(),
  };
}

export function buildParagraphTranslation({ paragraph, incoming, preserveTerms }) {
  const en = normalizeText(incoming?.en || paragraph);
  const baseZh = normalizeText(incoming?.zh || fallbackZh(en, 'paragraph'));
  const zh = applyTermPreservation(baseZh, en, preserveTerms);

  return {
    en,
    zh,
    preserveTerms: Boolean(preserveTerms),
    updatedAt: new Date().toISOString(),
  };
}

export function findParagraphCache(paragraphs, paragraph, preserveTerms) {
  const normalized = normalizeText(paragraph);
  if (!normalized) return null;

  const list = Array.isArray(paragraphs) ? paragraphs : [];
  return list.find(
    (item) => normalizeText(item?.source) === normalized && Boolean(item?.preserveTerms) === Boolean(preserveTerms),
  ) || null;
}

export function appendParagraphCache(paragraphs, paragraphEntry) {
  const list = Array.isArray(paragraphs) ? paragraphs : [];
  const filtered = list.filter(
    (item) => !(normalizeText(item?.source) === normalizeText(paragraphEntry?.source)
      && Boolean(item?.preserveTerms) === Boolean(paragraphEntry?.preserveTerms)),
  );

  return [
    {
      source: normalizeText(paragraphEntry?.source),
      en: normalizeText(paragraphEntry?.en),
      zh: normalizeText(paragraphEntry?.zh),
      preserveTerms: Boolean(paragraphEntry?.preserveTerms),
      updatedAt: paragraphEntry?.updatedAt || new Date().toISOString(),
    },
    ...filtered,
  ].slice(0, 50);
}

export function mergeSummaryJson(summaryJson, translationPayload) {
  const summary = safeJsonParse(summaryJson);
  const next = {
    ...summary,
    translations: {
      ...(summary?.translations || {}),
      ...translationPayload,
    },
  };
  return JSON.stringify(next);
}

export function extractAbstract(summaryJson) {
  const summary = safeJsonParse(summaryJson);
  return normalizeText(summary?.abstract || summary?.summary || '');
}
