const { useState, useEffect, useLayoutEffect, useReducer, useRef, useMemo, useCallback, memo } = React;

/* ============================================================
 *  Constants
 * ============================================================ */

const STORAGE_KEY = 'party_spinner_v1';
const APP_VERSION = '2.1';
const MAX_ITEMS = 100;
const MAX_ITEM_LEN = 60;
const MAX_HISTORY = 50;
const MAX_SAVED = 30;
const MIN_DURATION = 3;
const MAX_DURATION = 30;
const REDUCED_MOTION = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/* ============================================================
 *  Utilities
 * ============================================================ */

const mod = (a, n) => ((a % n) + n) % n;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const rand = () => {
  if (window.crypto?.getRandomValues) {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return a[0] / 4294967296;
  }
  return Math.random();
};
const randInt = (n) => Math.floor(rand() * n);
const shuffleArr = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const clip = (s) => s.trim().slice(0, MAX_ITEM_LEN);
const parseLines = (text) => text.split('\n').map(clip).filter(Boolean).slice(0, MAX_ITEMS);
const truncate = (s, n) => (s.length > n ? s.slice(0, Math.max(1, n - 1)) + '…' : s);
const sameList = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
const isSampleList = (list) =>
  Object.values(SAMPLE_ITEMS).some((byTheme) => Object.values(byTheme).some((s) => sameList(s, list)));
const uid = () => Date.now().toString(36) + Math.floor(rand() * 1e6).toString(36);

const easeOut = (p) => 1 - Math.pow(1 - p, 3);

/* 0° = top of wheel, clockwise positive */
const polar = (cx, cy, r, deg) => {
  const rad = (deg - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
};
const sectorPath = (cx, cy, r, startDeg, endDeg) => {
  const s = polar(cx, cy, r, startDeg);
  const e = polar(cx, cy, r, endDeg);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${s.x.toFixed(3)} ${s.y.toFixed(3)} A ${r} ${r} 0 ${largeArc} 1 ${e.x.toFixed(3)} ${e.y.toFixed(3)} Z`;
};
/* Index of the segment sitting under the top pointer for a given wheel rotation */
const indexAt = (rotation, n) => Math.floor(mod(-rotation, 360) / (360 / n)) % n;

const luminance = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
};
const textOn = (hex) => (luminance(hex) > 0.42 ? '#1b1b1f' : '#ffffff');

/* Pick a segment colour so the first and last segments never share a colour */
const segColor = (palette, i, n) => {
  const len = palette.length;
  if (n > 1 && i === n - 1 && i % len === 0) return palette[len > 2 ? 1 : 0];
  return palette[i % len];
};

const tdKind = (label) => {
  const s = label.toLowerCase();
  if (/dare|thách/.test(s)) return 'dare';
  if (/truth|thật/.test(s)) return 'truth';
  return null;
};

const fmtAgo = (ts, lang) => {
  if (!ts) return '';
  const s = Math.round((ts - Date.now()) / 1000);
  try {
    const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });
    if (Math.abs(s) < 45) return rtf.format(0, 'second');
    if (Math.abs(s) < 3600) return rtf.format(Math.round(s / 60), 'minute');
    if (Math.abs(s) < 86400) return rtf.format(Math.round(s / 3600), 'hour');
    return rtf.format(Math.round(s / 86400), 'day');
  } catch (e) {
    return new Date(ts).toLocaleTimeString();
  }
};

const b64url = {
  enc: (str) => {
    const bytes = new TextEncoder().encode(str);
    let bin = '';
    bytes.forEach((b) => { bin += String.fromCharCode(b); });
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  },
  dec: (s) => {
    const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
    return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
  },
};
const readSharedWheel = () => {
  const m = location.hash.match(/[#&]w=([A-Za-z0-9_-]+)/);
  if (!m) return null;
  try {
    const data = JSON.parse(b64url.dec(m[1]));
    const items = Array.isArray(data.i) ? data.i.filter((x) => typeof x === 'string').map(clip).filter(Boolean).slice(0, MAX_ITEMS) : [];
    if (items.length < 1) return null;
    return { items, theme: THEMES[data.t] ? data.t : null };
  } catch (e) {
    return null;
  }
};
const baseUrl = () => location.href.split('#')[0];

const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (err) {}
    ta.remove();
    return ok;
  }
};

const vibrate = (pattern) => {
  // Browsers block vibration (and log an error) until the user has interacted with the page
  if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
  try { navigator.vibrate?.(pattern); } catch (e) {}
};

/* ============================================================
 *  Persistence
 * ============================================================ */

const loadState = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
  catch (e) { return {}; }
};
const saveState = (state) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
};
