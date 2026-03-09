import { resolveVenueTier } from '../lib/venue-tier.js';

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label} expected=${expected} actual=${actual}`);
  }
}

function runCase(testCase) {
  const result = resolveVenueTier(testCase.item, {});

  assertEqual(result.venueTier, testCase.expected.venueTier, `${testCase.id} venueTier`);
  assertEqual(
    result.venueMatchedBy,
    testCase.expected.venueMatchedBy,
    `${testCase.id} venueMatchedBy`,
  );

  return result;
}

const cases = [
  // whitelist 正例
  {
    id: 'whitelist-positive-journal-A',
    item: {
      title: 'A Study in Proceedings of the ACM on Interactive, Mobile, Wearable and Ubiquitous Technologies',
    },
    expected: {
      venueTier: 'A',
      venueMatchedBy:
        'rule-whitelist:journal:A:proceedings of the acm on interactive, mobile, wearable and ubiquitous technologies',
    },
  },
  {
    id: 'whitelist-positive-conference-B',
    item: {
      title: 'Accepted at IEEE International Conference on Computer Communications 2026',
    },
    expected: {
      venueTier: 'B',
      venueMatchedBy: 'rule-whitelist:conference:B:ieee international conference on computer communications',
    },
  },

  // regex 正例
  {
    id: 'regex-positive-imwut-A',
    item: {
      title: 'Accepted by Proc. ACM IMWUT 2026',
    },
    expected: {
      venueTier: 'A',
      venueMatchedBy: 'venue-regex:imwut',
    },
  },
  {
    id: 'regex-positive-infocom-B',
    item: {
      title: 'Will appear in IEEE INFOCOM 2026',
    },
    expected: {
      venueTier: 'B',
      venueMatchedBy: 'venue-regex:infocom',
    },
  },

  // 反例
  {
    id: 'negative-non-target-venue',
    item: {
      title: 'A workshop paper on edge intelligence',
    },
    expected: {
      venueTier: 'unknown',
      venueMatchedBy: null,
    },
  },
  {
    id: 'negative-regex-word-boundary',
    item: {
      title: 'A note about ACM IMWUTX systems',
    },
    expected: {
      venueTier: 'unknown',
      venueMatchedBy: null,
    },
  },

  // 边界样例
  {
    id: 'boundary-case-insensitive-whitelist',
    item: {
      title: 'Published in PROCEEDINGS OF THE ACM ON INTERACTIVE, MOBILE, WEARABLE AND UBIQUITOUS TECHNOLOGIES',
    },
    expected: {
      venueTier: 'A',
      venueMatchedBy:
        'rule-whitelist:journal:A:proceedings of the acm on interactive, mobile, wearable and ubiquitous technologies',
    },
  },
  {
    id: 'boundary-match-from-summary-field',
    item: {
      title: 'A systems paper',
      summary: 'Camera-ready for IEEE INFOCOM student workshop track',
    },
    expected: {
      venueTier: 'B',
      venueMatchedBy: 'venue-regex:infocom',
    },
  },
  {
    id: 'boundary-whitelist-priority-over-regex',
    item: {
      title: 'Proceedings of the ACM on Interactive, Mobile, Wearable and Ubiquitous Technologies (ACM IMWUT)',
    },
    expected: {
      venueTier: 'A',
      venueMatchedBy:
        'rule-whitelist:journal:A:proceedings of the acm on interactive, mobile, wearable and ubiquitous technologies',
    },
  },
  {
    id: 'boundary-empty-input',
    item: {},
    expected: {
      venueTier: 'unknown',
      venueMatchedBy: null,
    },
  },
];

const failures = [];
const passes = [];

for (const testCase of cases) {
  try {
    const result = runCase(testCase);
    passes.push({ id: testCase.id, result });
    console.log(`[pass] ${testCase.id} => ${result.venueTier} / ${result.venueMatchedBy}`);
  } catch (error) {
    failures.push({ id: testCase.id, error: error?.message || String(error) });
    console.error(`[fail] ${testCase.id} => ${error?.message || String(error)}`);
  }
}

console.log(`\n[summary] total=${cases.length} pass=${passes.length} fail=${failures.length}`);

if (failures.length > 0) {
  process.exitCode = 1;
}
