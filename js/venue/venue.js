/* ============================================================
 *  Venue — profile, branding and logo processing (MAX)
 * ============================================================ */

const LOGO_MAX_BYTES = 4 * 1024 * 1024;
const LOGO_MIN_SIDE = 64;
const LOGO_TARGET_SIDE = 512;

const createVenue = () => ({
  enabled: false, name: '', tagline: '', logo: null, primary: '#f472b6', secondary: '#22d3ee',
  maxPlayers: 8, table: '', bigScreen: false, qrJoin: true, defaultSound: true, defaultHaptics: true,
});
const normalizeVenue = (v) => ({ ...createVenue(), ...(v || {}) });
/* Branding shows only for MAX accounts that switched it on and gave the venue a name */
const brandingActive = (sub, venue) => Entitlements.hasFeature(sub, 'venue-branding') && venue.enabled && !!venue.name.trim();

/* Validate type / size / dimensions, downscale to ≤512px and return a data URL */
const processLogoFile = (file, errors) => new Promise((resolve, reject) => {
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return reject(new Error(errors.type));
  if (file.size > LOGO_MAX_BYTES) return reject(new Error(errors.size));
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    URL.revokeObjectURL(url);
    if (img.naturalWidth < LOGO_MIN_SIDE || img.naturalHeight < LOGO_MIN_SIDE) return reject(new Error(errors.small));
    const scale = Math.min(1, LOGO_TARGET_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    resolve(canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/webp', 0.9));
  };
  img.onerror = () => { URL.revokeObjectURL(url); reject(new Error(errors.type)); };
  img.src = url;
});

/* Brand colours are accents only — the app keeps control of background, typography and layout */
const applyBrandVars = (venue, active) => {
  const root = document.documentElement.style;
  if (active) {
    root.setProperty('--brand-primary', venue.primary);
    root.setProperty('--brand-secondary', venue.secondary);
    root.setProperty('--brand-accent', venue.primary);
  } else {
    ['--brand-primary', '--brand-secondary', '--brand-accent'].forEach((v) => root.removeProperty(v));
  }
};
