import { resolveVenueTier } from '../lib/venue-tier.js';
import { resolveCcfTierByText } from '../lib/ccf-tier.js';

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label} expected=${expected} actual=${actual}`);
  }
}

const venueByWhitelist = resolveVenueTier({
  title: 'A Study in Proceedings of the ACM on Interactive, Mobile, Wearable and Ubiquitous Technologies',
}, {});
assertEqual(venueByWhitelist.venueTier, 'A', 'venue whitelist tier');

const venueByRegex = resolveVenueTier({
  title: 'Accepted by Proc. ACM IMWUT 2026',
}, {});
assertEqual(venueByRegex.venueTier, 'A', 'venue regex tier');

const ccfByWhitelist = resolveCcfTierByText('Published in IEEE/ACM Transactions on Networking');
assertEqual(ccfByWhitelist.ccfTier, 'A', 'ccf whitelist tier');

const ccfByRegex = resolveCcfTierByText('This work appears at NeurIPS 2026.');
assertEqual(ccfByRegex.ccfTier, 'A', 'ccf regex tier');

console.log('[pass] venue whitelist:', venueByWhitelist.venueMatchedBy);
console.log('[pass] venue regex:', venueByRegex.venueMatchedBy);
console.log('[pass] ccf whitelist:', ccfByWhitelist.ccfMatchedBy);
console.log('[pass] ccf regex:', ccfByRegex.ccfMatchedBy);
