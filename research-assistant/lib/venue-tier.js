function normalizeText(text) {
  return String(text || '').toLowerCase();
}

function getVenueBuckets(cfg = {}) {
  return cfg?.venues || {};
}

export function getVenueKeywords(cfg = {}) {
  const buckets = getVenueBuckets(cfg);
  const out = [];

  for (const groupName of ['conference', 'journal']) {
    const group = buckets[groupName] || {};
    for (const tier of ['A', 'B']) {
      const list = group[tier] || [];
      for (const name of list) out.push(String(name).toLowerCase());
    }
  }

  return [...new Set(out)];
}

export function resolveVenueTier(item = {}, cfg = {}) {
  const buckets = getVenueBuckets(cfg);
  const text = normalizeText([
    item.title,
    item.summary,
    item.journalRef,
    item.comment,
  ].join(' '));

  for (const groupName of ['conference', 'journal']) {
    const group = buckets[groupName] || {};
    for (const tier of ['A', 'B']) {
      const list = group[tier] || [];
      for (const rawName of list) {
        const name = normalizeText(rawName);
        if (!name) continue;
        if (text.includes(name)) {
          return {
            venueTier: tier,
            venueMatchedBy: `${groupName}:${tier}:${rawName}`,
          };
        }
      }
    }
  }

  return { venueTier: 'unknown', venueMatchedBy: null };
}
