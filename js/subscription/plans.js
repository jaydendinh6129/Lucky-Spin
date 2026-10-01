/* ============================================================
 *  Subscription — plan state, feature registry and entitlements.
 *  Nothing else in the app compares `plan === 'max'`; it asks Entitlements.
 * ============================================================ */

const PLANS = ['free', 'pro', 'max'];
const PLAN_RANK = { free: 0, pro: 1, max: 2 };
const PLAN_LABEL = { free: 'FREE', pro: 'PRO', max: 'MAX' };

/* Feature registry: the minimum plan that unlocks each capability */
const FEATURES = {
  'basic-spinner': 'free', 'custom-items': 'free', 'basic-themes': 'free', 'advanced-themes': 'pro',
  battle: 'free', 'advanced-battle': 'pro', king: 'pro', quiz: 'free', 'advanced-quiz': 'pro',
  'mini-games': 'free', 'advanced-mini-games': 'pro', cards: 'pro',
  'venue-branding': 'max', 'venue-mode': 'max', 'realtime-sync': 'max', 'qr-join': 'max',
  'host-mode': 'max', 'big-screen': 'max', 'venue-stats': 'max', 'saved-venue-config': 'max',
};

const planAtLeast = (plan, min) => (PLAN_RANK[plan] ?? 0) >= (PLAN_RANK[min] ?? 0);
const createSubscription = (plan = 'free') => ({ plan, status: 'active', expiresAt: null });
const normalizeSubscription = (s) => (s && PLANS.includes(s.plan) ? { plan: s.plan, status: s.status || 'active', expiresAt: s.expiresAt || null } : createSubscription());

const Entitlements = {
  isFree: (sub) => sub.plan === 'free',
  isPro: (sub) => sub.plan === 'pro',
  isMax: (sub) => sub.plan === 'max',
  hasFeature: (sub, feature) => planAtLeast(sub.plan, FEATURES[feature] || 'free'),
  /* Games and themes carry their own `plan` from the registry */
  canPlay: (sub, item) => planAtLeast(sub.plan, item.plan || 'free'),
  requiredPlan: (item) => item.plan || 'free',
  /* The plan to offer when something is locked, or null when it isn't */
  upgradeFor: (sub, minPlan) => (planAtLeast(sub.plan, minPlan) ? null : minPlan),
  featurePlan: (feature) => FEATURES[feature] || 'free',
};

/* Development only: a plan switcher so the whole app can be tested without payments */
const IS_DEV = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || /[?&#]dev\b/.test(location.href);
